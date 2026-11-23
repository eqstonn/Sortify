// Where Supabase keeps the login, depending on "Remember me".
//
// Remember me on: the login is saved on the phone (localStorage, which is
// expo-sqlite's on a phone), so you stay signed in after closing the app.
// Remember me off: the login is only kept in memory (sessionStorage in the
// browser), so closing the app signs you out.
//
// One exception: the short-lived "code verifier" Supabase saves when it sends
// you to Google or emails you a link is always saved, so the link still works
// if the app was closed while you were in your inbox.

import { Platform } from "react-native";

const REMEMBER_KEY = "sortify.remember";

const memory = new Map<string, string>();
const inMemory = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => void memory.set(key, value),
  removeItem: (key: string) => void memory.delete(key),
};

// The browser's sessionStorage lasts as long as the tab, which also survives the trip to Google and back
function temporary() {
  return Platform.OS === "web" && typeof sessionStorage !== "undefined" ? sessionStorage : inMemory;
}

export function remembers(): boolean {
  return localStorage.getItem(REMEMBER_KEY) !== "0"; // on unless you unticked it
}

/** Call before signing in: where the new login should be kept. */
export function setRemember(remember: boolean): void {
  localStorage.setItem(REMEMBER_KEY, remember ? "1" : "0");
}

function store(key: string) {
  return remembers() || key.endsWith("-code-verifier") ? localStorage : temporary();
}

/** The storage given to the Supabase client (lib/supabase.ts). */
export const authStorage = {
  getItem: (key: string) => store(key).getItem(key),
  setItem: (key: string, value: string) => {
    store(key).setItem(key, value);
  },
  removeItem: (key: string) => {
    // From both, so a login saved before Remember me changed is cleared too
    localStorage.removeItem(key);
    temporary().removeItem(key);
  },
};
