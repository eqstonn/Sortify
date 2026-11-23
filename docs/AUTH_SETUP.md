# Login setup: email, Google, profile photos

The app signs people in with Supabase Auth: email + password, or Google.
Do these steps once per Supabase project. You need the Supabase dashboard and
a Google account for the Google Cloud console.

## 1. Run the migration

Supabase dashboard → **SQL Editor** → paste `supabase/migrations/005_auth.sql` → **Run**.

It does two things:

- A new account's profile takes its name from sign-up (or from Google).
- It makes the public `avatars` Storage bucket for profile photos.

Check: **Storage** now lists a bucket called `avatars`, marked Public.

## 2. Email + password

**Authentication → Sign In / Providers → Email**: make sure it's enabled.

**Confirm email** (same page) decides what happens after "Create account":

- **On** (Supabase's default): Supabase emails a link and the app says
  "Open the link we sent you, then sign in". Supabase's built-in email
  allows only a few emails an hour, so you may hit that limit while testing.
- **Off**: you're signed in straight away. Easiest for a hackathon demo.

Leave **Allow anonymous sign-ins** on. The app doesn't use it any more, but
`python -m scripts.dev_token` (the token for `/docs`) and the smoke test do.

## 3. Redirect URLs

The "reset your password" and "confirm your email" links, and Google, send
people back to the app. Supabase only allows addresses on its list.

**Authentication → URL Configuration**:

- **Site URL**: `http://localhost:8081` (the web app while developing).
- **Redirect URLs**: add each of these:

  | Address | For |
  | --- | --- |
  | `http://localhost:8081` | the app in the browser (`npx expo start --web`) |
  | `exp://**` | the app in Expo Go on a phone (the address has your laptop's IP in it, so a wildcard) |
  | `sortify://**` | a real build of the app, later |

## 4. Google

Google needs an "OAuth client" from Google Cloud that tells Google it's OK to
send people back to Supabase.

1. Open https://console.cloud.google.com and make a project (top bar → project
   picker → **New project**, name it "Sortify").
2. **APIs & Services → OAuth consent screen**:
   - Click **Get started**. App name "Sortify", your email as the support
     email, **Audience: External**, then your email as the contact. Create.
   - Under **Audience**, while it says "Testing", add each teammate's Google
     address as a **test user**. Only test users can sign in until you publish.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**, name "Sortify Supabase".
   - **Authorized JavaScript origins**: `http://localhost:8081`
   - **Authorized redirect URIs**: your Supabase callback, which is
     `https://<your-project-ref>.supabase.co/auth/v1/callback`. You can copy
     it from the next step's Google page in Supabase.
   - Create, and copy the **Client ID** and **Client secret**.
4. Supabase → **Authentication → Sign In / Providers → Google**: turn it on,
   paste the Client ID and Client secret, Save.

Only a "Web application" client is needed. Supabase talks to Google, and both
the browser and Expo Go go through Supabase.

## 5. Try it

- **Browser**: `cd mobile && npx expo start --web`, open http://localhost:8081.
  Create an account, sign out (Me → Sign out), sign in again, then try Google.
- **Phone (Expo Go)**: same steps. Google opens in an in-app browser and comes
  back to Expo Go. If it lands on an error page instead, check that `exp://**`
  is in the Redirect URLs (step 3). Email + password works on the phone either way.
- **Forgot password**: type your email on sign-in, tap **Forgot password?**,
  and open the emailed link **on the same device** (the link only works where
  it was asked for). You'll get a "New password" screen.
- **Profile photo**: Me → pencil → **Add a photo**. It appears on Home, Board and Me.

## How it fits together

- The app keeps the Supabase login and sends its access token to the backend
  (`Authorization: Bearer ...`). `app/deps.py` asks Supabase who it belongs to.
  Any kind of Supabase login works the same way there.
- **Remember me** off: the login is only kept in memory (`mobile/lib/authStorage.ts`),
  so closing the app signs you out.
- Photos go to the backend (`POST /me/avatar`), which crops them square,
  shrinks them to 512 px, removes location data, and saves them in the
  `avatars` bucket. The profile's `avatar` column holds the photo's URL.

## Troubleshooting

| What you see | Why | Fix |
| --- | --- | --- |
| Google opens a page saying `Unsupported provider: provider is not enabled` (or the app says Google isn't switched on) | Google is off in Supabase | Step 4: make the Google Cloud client, then turn Google on in Supabase with its ID and secret |
| The email link opens `localhost:3000` ("This site can't be reached") | `localhost:3000` is Supabase's default **Site URL**, used when the app's address isn't in the Redirect URLs list | Step 3: Site URL `http://localhost:8081`, plus the Redirect URLs |
| `otp_expired` / "Email link is invalid or has expired" | The link was already used: opening it the first time confirmed the email, even if the page after it didn't load. Signing up again also cancels older links | Just sign in. **Authentication → Users** shows whether the email is confirmed |
| Sign-up says to check your email, but no email comes | Supabase's built-in email is limited to a few an hour | Wait, or turn **Confirm email** off (step 2) |
