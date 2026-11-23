// Supabase's login errors, said simply. Kept apart from lib/supabase.ts so
// they can be tested without a Supabase client.

/** An error from a Supabase call (sign in, sign up, reset...). */
export function friendly(message: string): string {
  if (/invalid login credentials/i.test(message)) return "Wrong email or password.";
  if (/email not confirmed/i.test(message)) return "Confirm your email first: open the link we sent you.";
  if (/already registered|already been registered/i.test(message)) return "There's already an account with that email. Sign in instead.";
  if (/password should be at least/i.test(message)) return "Your password needs at least 6 characters.";
  if (/unable to validate email|invalid email/i.test(message)) return "That doesn't look like an email address.";
  if (/rate limit|too many/i.test(message)) return "Too many tries. Wait a minute and try again.";
  if (/provider is not enabled|unsupported provider/i.test(message)) return GOOGLE_OFF;
  if (/fetch|network/i.test(message)) return "Can't reach Sortify. Check your connection and try again.";
  return message;
}

export const GOOGLE_OFF =
  "Google sign-in isn't switched on yet (Supabase → Authentication → Sign In / Providers → Google). Use email for now.";

/**
 * A link that came back with an error instead of a login, e.g.
 * ?error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired
 */
export function linkErrorText(code: string | null | undefined, description: string | null | undefined): string | null {
  if (!code && !description) return null;
  // Also what you get when you open a confirmation link a second time: the first open already confirmed you
  if (code === "otp_expired") return "That email link has expired or was already used. If you've confirmed your email, just sign in.";
  if (code === "flow_state_not_found" || code === "bad_code_verifier")
    return "Open the email link on the same device and browser you signed up on. If you've confirmed your email, just sign in.";
  return friendly(description ?? code ?? "");
}
