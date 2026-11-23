// Supabase's login errors, said simply (lib/authErrors.ts).

import { friendly, GOOGLE_OFF, linkErrorText } from "@/lib/authErrors";

test("common Supabase errors are reworded", () => {
  expect(friendly("Invalid login credentials")).toBe("Wrong email or password.");
  expect(friendly("Email not confirmed")).toMatch(/^Confirm your email first/);
  expect(friendly("User already registered")).toMatch(/already an account/);
  expect(friendly("Unsupported provider: provider is not enabled")).toBe(GOOGLE_OFF);
  expect(friendly("Something new")).toBe("Something new");
});

test("an expired or already-used email link says you can just sign in", () => {
  // What Supabase sends back for a confirmation link opened a second time
  expect(linkErrorText("otp_expired", "Email link is invalid or has expired")).toMatch(/expired or was already used.*just sign in/);
});

test("a link opened in another browser says to use the same one", () => {
  expect(linkErrorText("bad_code_verifier", null)).toMatch(/same device and browser/);
});

test("no error in the link: nothing to show", () => {
  expect(linkErrorText(null, null)).toBeNull();
  expect(linkErrorText(undefined, "Some other problem")).toBe("Some other problem");
});
