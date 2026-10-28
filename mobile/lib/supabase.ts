// Supabase login for the app. Players sign in anonymously; the backend
// checks the access token on every request (app/deps.py).

// Gives us a localStorage that saves to the phone, so the login survives restarts
import "expo-sqlite/localStorage/install";
import { createClient } from "@supabase/supabase-js";
import { AppState } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copy mobile/.env.example to mobile/.env and fill it in.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // phones have no URL to read a login from
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

/** The saved login if there is one, otherwise a new anonymous player. Returns the access token. */
export async function getAccessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session.access_token;

  const { data: signedIn, error } = await supabase.auth.signInAnonymously();
  if (error || !signedIn.session) {
    throw new Error(error?.message ?? "Couldn't sign in. Check your connection and try again.");
  }
  return signedIn.session.access_token;
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
