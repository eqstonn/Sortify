# Sortify

Scan an item, find out which Ottawa bin it goes in, and earn points. Backend: FastAPI + Gemini + Supabase. App: Expo (React Native) in `mobile/`.

Demo day? See [DEMO.md](DEMO.md).

## 1. Set up Supabase (once)

1. In the Supabase dashboard, open **SQL Editor**. Paste each file in `supabase/migrations/` and click **Run**, in order: `001_init.sql`, `002_schedule.sql`, `003_badges.sql`, `004_leaderboard_items.sql`. A missing migration shows up as a "Server error: Could not find the table…" message in the app.
2. Turn on anonymous sign-ins: **Authentication → Sign In / Providers → Allow anonymous sign-ins**.
3. Note your keys (**Project Settings → API Keys**): the project URL, the **secret** (service_role) key for the backend, and the **publishable** key for the app.

## 2. Run the backend on your laptop

```bash
python -m venv venv
venv\Scripts\activate            # Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
copy .env.example .env           # Mac/Linux: cp .env.example .env
```

Fill in `.env` (`GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`), then:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Open http://localhost:8000/docs to try every endpoint. For the 🔒 ones, run `python -m scripts.dev_token`, click **Authorize** and paste the token.

## 3. Run the app

```bash
cd mobile
npm install
copy .env.example .env           # Mac/Linux: cp .env.example .env
npx expo start --clear
```

In `mobile/.env`, set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (the publishable key, never the secret one), and set `EXPO_PUBLIC_API_URL` to one of these:

| Where the app runs | `EXPO_PUBLIC_API_URL` |
| --- | --- |
| Browser on your laptop (press `w`) | `http://localhost:8000` |
| Your phone, backend on your laptop | the ngrok or cloudflared URL (below) |
| Your phone, backend on Render | `https://sortify-api.onrender.com` (your Render URL) |

Expo reads `.env` only when it starts, so restart with `npx expo start --clear` after changing it. Then scan the QR code with the Camera app (iPhone) or Expo Go (Android).

### Phone + laptop backend (ngrok or cloudflared)

Your phone can't reach `localhost` on your laptop, so open a tunnel in a second terminal:

```bash
ngrok http 8000                                   # or:
cloudflared tunnel --url http://localhost:8000
```

Copy the `https://…` URL it prints into `EXPO_PUBLIC_API_URL` and restart Expo. The URL changes every time you restart the tunnel.

## 4. Deploy the backend to Render (free)

`render.yaml` describes the whole service, so Render sets itself up from it.

1. Push to GitHub (`main`).
2. On https://dashboard.render.com: **New → Blueprint**, connect GitHub, pick the **Sortify** repo, branch `main`.
3. Render shows the `sortify-api` web service and asks for `GEMINI_API_KEY`, `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`. Paste them from your `.env` and click **Apply** (or **Deploy Blueprint**).
4. Wait for the deploy to show **Live** (about 3 to 5 minutes the first time). Your URL is at the top of the service page, e.g. `https://sortify-api.onrender.com`.
5. Check it: `python -m scripts.smoke_test https://sortify-api.onrender.com`.

Every push to `main` redeploys. The free plan sleeps after 15 idle minutes and takes about a minute to wake, so open `/health` before you need it. To change a key later: service → **Environment** → edit → **Save Changes** (it redeploys).

## 5. Demo data and checks

```bash
python -m scripts.seed                        # 20 fake Ottawa players with a month of scans (safe to rerun)
python -m scripts.seed --remove               # delete them again
python -m scripts.dev_seed_month <user id>    # a month of scans for YOUR account, so Wrapped has a story
python -m scripts.smoke_test <url>            # PASS/FAIL for /health and /classify (one real Gemini call)
python -m scripts.smoke_test <url> --photo can.jpg
```

Rerunning `seed` refreshes the fake players' month up to today, so "This week" always has data. It only touches its own `seed-NN@example.com` logins, never real players.

## Run the tests

```bash
pytest                    # backend: Gemini and Supabase are faked (tests/fakes.py), so free and offline
cd mobile && npm test     # app screens with the API mocked
cd mobile && npm run typecheck
```

## Layout

```
app/
  main.py            app, CORS, /health; crashes come back as readable 500s
  config.py          settings from .env (or Render's environment)
  schemas.py         request/response shapes (the app's contract)
  routers/           endpoints
  services/          rules (bins), gemini, images, points, levels, stats, schedule, wrapped, discover, badges
  db.py              the only code that talks to Supabase
  deps.py            login token -> user id, or 401
data/                categories, drop-off sites, holiday shifts, Discover weekly (JSON)
mobile/              the Expo app (app/ = screens, components/, lib/api.ts = typed API client)
scripts/
  seed.py            fake players for the demo
  smoke_test.py      checks a live backend
  dev_token.py       login token for /docs
  dev_seed_month.py  a month of scans for one account
  eval_classifier.py Gemini accuracy on real photos (tests/eval_images/)
supabase/migrations/ 001 to 004, run in order
render.yaml          Render deploy
tests/               pytest
```

## How a scan works

1. The app uploads a photo to `POST /classify` (plus optional `lat`/`lon`).
2. `images.py` shrinks it and strips EXIF, so no GPS location leaves the server.
3. `gemini.py` asks Gemini to pick one category id from `data/categories.json` (enforced by a JSON schema). Made-up ids and confidence under 0.5 become `unknown`.
4. `rules.py` looks up the bin, points and tips for that id. Gemini never decides the bin.
5. For drop-off items (batteries, electronics, hazardous) the nearest site is added if a location was sent.

## Endpoints

| Endpoint | What it does |
| --- | --- |
| `GET /health` | `{"status": "ok"}` |
| `GET /categories`, `GET /categories/{id}` | Every category with its bin, points and tips |
| `GET /dropoffs/nearest?lat=&lon=&accepts=` | Closest drop-off for `electronics`, `batteries` or `hazardous` |
| `POST /classify` 🔒 | Photo → item, bin, points, tips, `scan_id`, nearest drop-off |
| `POST /scans/{id}/confirm` 🔒 | "I recycled it": awards points |
| `POST /scans/{id}/correct` 🔒 | "Not right?": body `{"category_id": "..."}` |
| `GET /scans/me` 🔒 | Your last 50 scans |
| `GET /leaderboard?range=week\|all` 🔒 | Top 20 plus your own row |
| `GET /me`, `PATCH /me` 🔒 | Profile, level, stats, breakdown, badges; change name and avatar |
| `GET /schedule/next`, `PUT /me/schedule` 🔒 | "Up next" pickup; set your pickup day |
| `GET /wrapped/{year}/{month}` 🔒 | The 5 Wrapped cards |
| `GET /discover/current` 🔒 | This week's tricky item and bonus |

🔒 needs `Authorization: Bearer <Supabase access token>`.

## Points and anti-cheat

- Points come from `data/categories.json` (rarer items are worth more), plus a +15 bonus the first time you sort a new kind of item.
- Points are only given on confirm, and each scan can be confirmed once.
- A corrected scan is worth at most 10 points, so relabelling junk as a battery doesn't pay.
- The same photo (even resized) never earns points twice, for anyone. We compare perceptual hashes.
- There's a daily cap (`DAILY_POINT_CAP`, default 200), counted in Ottawa time.
- The confirm-once rule and the cap run inside the `award_points` database function in one transaction, so two taps at once can't cheat it. Only the backend can call that function.

## Checking accuracy and the Ottawa data

Put real photos in `tests/eval_images/<category_id>/` and run `python -m scripts.eval_classifier` (uses your real Gemini key). Entries in `data/*.json` with `"verify": true` still need checking against ottawa.ca.
