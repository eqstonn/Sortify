// Supabase login for the app: email + password, or Google. The backend checks
// the access token on every request (app/deps.py), and Supabase makes the
// player's profile when the account is created (supabase/migrations/005_auth.sql).
//
// Links that come back to the app (Google, "reset your password", "confirm
// your email") carry a one-time code. In the browser Supabase reads it from
// the page address itself; on a phone lib/session.tsx passes it to
// exchangeCode() below.

// Gives us a localStorage that saves to the phone
import "expo-sqlite/localStorage/install";
import { createClient } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { AppState, Platform } from "react-native";

import { friendly, GOOGLE_OFF, linkErrorText } from "@/lib/authErrors";
import { authStorage, setRemember } from "@/lib/authStorage";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copy mobile/.env.example to mobile/.env and fill it in.",
  );
}

const web = Platform.OS === "web";

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: authStorage, // Remember me decides where (lib/authStorage.ts)
    storageKey: "sortify.auth",
    autoRefreshToken: true,
    persistSession: true,
    flowType: "pkce", // links come back with a one-time ?code=, safer than a token in the address
    detectSessionInUrl: web, // phones have no page address; lib/session.tsx handles their links
  },
});

// Only refresh the token while the app is open
AppState.addEventListener("change", (state) => {
  if (state === "active") {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

/** The signed-in player's access token, for the backend. */
export async function getAccessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error("You're signed out. Sign in again.");
  return data.session.access_token;
}

/**
 * Where Google and the emailed links send you back to: this web page, or this
 * app on a phone (exp://192.168.x.x:8081/--/ in Expo Go, sortify:// in a real
 * build). Each one must be in Supabase's list of Redirect URLs.
 */
export function redirectUrl(): string {
  if (web) return window.location.origin;
  return Linking.createURL("/");
}

// ---------- the sign-in screens call these ----------

function fail(error: { message: string } | null): void {
  if (error) throw new Error(friendly(error.message));
}

export async function signInWithEmail(email: string, password: string, remember: boolean): Promise<void> {
  setRemember(remember);
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  fail(error);
}

/** Returns true if you're signed in straight away, false if Supabase emailed a confirmation link first. */
export async function signUpWithEmail(name: string, email: string, password: string): Promise<boolean> {
  setRemember(true);
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    // The new profile takes its name from here (005_auth.sql)
    options: { data: { name: name.trim() }, emailRedirectTo: redirectUrl() },
  });
  fail(error);
  return !!data.session;
}

export async function sendPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: redirectUrl() });
  fail(error);
}

/** After opening a reset link: set the new password. */
export async function setNewPassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });
  fail(error);
}

/**
 * Sign in with Google. In the browser this leaves the page and comes back
 * signed in. On a phone it opens Google in an in-app browser and waits for it
 * to send us back; returns false if you closed it.
 */
export async function signInWithGoogle(remember: boolean): Promise<boolean> {
  // Otherwise the browser lands on Supabase's bare "provider is not enabled" error page
  if ((await googleEnabled()) === false) throw new Error(GOOGLE_OFF);
  setRemember(remember);
  const redirectTo = redirectUrl();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, skipBrowserRedirect: !web },
  });
  fail(error);
  if (web) return true; // the page is on its way to Google

  const result = await WebBrowser.openAuthSessionAsync(data.url!, redirectTo);
  if (result.type !== "success") return false;
  await exchangeCode(result.url);
  return true;
}

/** Is Google turned on in the Supabase dashboard? null if we couldn't ask (then just try). */
async function googleEnabled(): Promise<boolean | null> {
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/settings`, { headers: { apikey: supabaseKey! } });
    if (!res.ok) return null;
    const settings = (await res.json()) as { external?: Record<string, boolean> };
    return settings.external?.google === true;
  } catch {
    return null;
  }
}

/** A link back into the app: trade its one-time code for a login. Does nothing for other links. */
export async function exchangeCode(url: string): Promise<void> {
  const { queryParams } = Linking.parse(url);
  const text = (key: string) => (typeof queryParams?.[key] === "string" ? (queryParams[key] as string) : null);
  const failure = linkErrorText(text("error_code"), text("error_description"));
  if (failure) throw new Error(failure);
  const code = queryParams?.code;
  if (typeof code !== "string") return;
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  fail(error);
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
