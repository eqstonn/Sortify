// Whether this phone has finished sign-in (picked a name and avatar).
//
// The Supabase login itself is anonymous and happens on the first API call
// (lib/supabase.ts). Sign-in just names that player with PATCH /me, then we
// remember it on the phone so the sign-in screen only shows once.

import { createContext, useContext, useState, type ReactNode } from "react";

import { api, type Avatar } from "@/lib/api";
import { signOut as supabaseSignOut } from "@/lib/supabase";

const DONE_KEY = "sortify.signedIn";

type Session = {
  signedIn: boolean;
  signIn: (name: string, avatar: Avatar) => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  // localStorage here is expo-sqlite's, saved on the phone (see lib/supabase.ts)
  const [signedIn, setSignedIn] = useState(() => localStorage.getItem(DONE_KEY) === "1");

  const signIn = async (name: string, avatar: Avatar) => {
    await api.updateMe({ name: name.trim(), avatar });
    localStorage.setItem(DONE_KEY, "1");
    setSignedIn(true);
  };

  const signOut = async () => {
    await supabaseSignOut();
    localStorage.removeItem(DONE_KEY);
    setSignedIn(false);
  };

  return <SessionContext.Provider value={{ signedIn, signIn, signOut }}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession must be used inside <SessionProvider>");
  return session;
}
