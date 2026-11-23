// Is someone signed in? The whole app reads this to pick its screens
// (app/_layout.tsx):
//   loading     checking for a saved login (the splash shows)
//   signedOut   sign-in / create an account
//   signedIn    the app
//   recovering  opened a "reset your password" link: only the new-password screen
//
// Supabase tells us about every change (signed in, signed out, token
// refreshed) through onAuthStateChange, so the screens never set this directly.

import * as Linking from "expo-linking";
import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

import { linkErrorText } from "@/lib/authErrors";
import { exchangeCode, signOut as supabaseSignOut, supabase } from "@/lib/supabase";

export type AuthState = "loading" | "signedOut" | "signedIn" | "recovering";

type Session = {
  state: AuthState;
  notice: string | null; // a problem with a link (expired, already used), shown on the sign-in screen
  clearNotice: () => void;
  finishRecovery: () => void; // the new password is saved: into the app
  signOut: () => Promise<void>;
};

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>("loading");
  const [notice, setNotice] = useState<string | null>(() => linkErrorOnWeb());
  const recovering = useRef(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        recovering.current = true;
        setState("recovering");
        return;
      }
      if (recovering.current && event !== "SIGNED_OUT") return; // stay on the new-password screen
      recovering.current = false;

      if (session?.user.is_anonymous) {
        // A guest login from before real accounts: sign it out. (setTimeout: Supabase
        // mustn't be called from inside its own callback.)
        setTimeout(() => supabase.auth.signOut(), 0);
        setState("signedOut");
        return;
      }
      // In the browser, a link with a ?code= that didn't log you in was opened somewhere other than where you signed up
      if (event === "INITIAL_SESSION" && !session && codeInWebAddress()) setNotice(linkErrorText("bad_code_verifier", null));
      setState(session ? "signedIn" : "signedOut");
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // On a phone, links back into the app (Google, password reset, email confirmation) arrive here
  const url = Linking.useURL();
  useEffect(() => {
    if (Platform.OS === "web" || !url) return;
    exchangeCode(url).catch(async (e: Error) => {
      // On Android the Google link can arrive twice; the second one fails but we're already in
      const { data } = await supabase.auth.getSession();
      if (!data.session) setNotice(e.message);
    });
  }, [url]);

  const value: Session = {
    state,
    notice,
    clearNotice: () => setNotice(null),
    finishRecovery: () => {
      recovering.current = false;
      setState("signedIn");
    },
    signOut: supabaseSignOut, // onAuthStateChange then switches to the sign-in screen
  };
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession must be used inside <SessionProvider>");
  return session;
}

// In the browser a failed link (e.g. an expired reset link) comes back as ?error_description=...
function linkErrorOnWeb(): string | null {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search + window.location.hash.replace(/^#/, "&"));
  return linkErrorText(params.get("error_code"), params.get("error_description"));
}

function codeInWebAddress(): boolean {
  return Platform.OS === "web" && typeof window !== "undefined" && new URLSearchParams(window.location.search).has("code");
}
