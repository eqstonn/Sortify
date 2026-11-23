// "Remember me": where the Supabase login is kept (lib/authStorage.ts).

import { authStorage, remembers, setRemember } from "@/lib/authStorage";

// expo-sqlite's localStorage (saved on the phone) is native; tests get a Map
const saved = new Map<string, string>();
globalThis.localStorage = {
  getItem: (k: string) => saved.get(k) ?? null,
  setItem: (k: string, v: string) => void saved.set(k, v),
  removeItem: (k: string) => void saved.delete(k),
} as Storage;

beforeEach(() => saved.clear());

test("Remember me is on unless you untick it", () => {
  expect(remembers()).toBe(true);
  setRemember(false);
  expect(remembers()).toBe(false);
});

test("remembered: the login is saved on the phone", () => {
  setRemember(true);
  authStorage.setItem("sortify.auth", "session");

  expect(saved.get("sortify.auth")).toBe("session");
  expect(authStorage.getItem("sortify.auth")).toBe("session");
});

test("not remembered: the login is only in memory, so a restart signs you out", () => {
  setRemember(false);
  authStorage.setItem("sortify.auth", "session");

  expect(saved.has("sortify.auth")).toBe(false);
  expect(authStorage.getItem("sortify.auth")).toBe("session"); // while the app is open
});

test("the one-time code verifier for links is always saved, so the email link still works", () => {
  setRemember(false);
  authStorage.setItem("sortify.auth-code-verifier", "v");

  expect(saved.get("sortify.auth-code-verifier")).toBe("v");
});

test("signing out clears the login wherever it was", () => {
  setRemember(true);
  authStorage.setItem("sortify.auth", "a");
  setRemember(false);
  authStorage.setItem("sortify.auth", "b");

  authStorage.removeItem("sortify.auth");

  expect(saved.has("sortify.auth")).toBe(false);
  expect(authStorage.getItem("sortify.auth")).toBeNull();
});
