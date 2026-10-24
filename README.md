# Sortify

Scan an item, find out which Ottawa bin it goes in, and earn points. Backend: FastAPI + Gemini + Supabase. App: Expo.

## Run the backend

```bash
python -m venv venv
venv\Scripts\activate            # Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
copy .env.example .env           # Mac/Linux: cp .env.example .env
```

Put your Gemini key in `.env`, then:

```bash
uvicorn app.main:app --reload
```

Open http://localhost:8000/docs to try every endpoint.

## Run the tests

```bash
pytest
```

Tests fake Gemini and Supabase (`tests/fakes.py`), so they're free and work offline.

## Layout

```
app/
  main.py            app, CORS, /health
  config.py          settings from .env
  schemas.py         request/response shapes (the app's contract)
  routers/           endpoints
  services/rules.py  category -> Ottawa bin, points, tips, nearest drop-off
  services/images.py shrink photos to 1024 px and strip EXIF (location)
  services/gemini.py prompt + JSON schema; Gemini must pick a category id
  services/points.py scoring, first-time bonus, same-photo check
  db.py              the only code that talks to Supabase
  deps.py            login token -> user id, or 401
data/
  categories.json    every item category Gemini can pick from
  dropoff_sites.json e-waste, battery and hazardous drop-offs
scripts/
  eval_classifier.py accuracy check on real photos (see tests/eval_images/)
  dev_token.py       login token for trying endpoints at /docs
supabase/migrations/
  001_init.sql       tables, row-level security, leaderboard views, award_points()
tests/               pytest tests
```

## How a scan works

1. The app uploads a photo to `POST /classify` (plus optional `lat`/`lon`).
2. `images.py` shrinks it and strips EXIF, so no GPS location leaves the server.
3. `gemini.py` asks Gemini to pick one category id from `data/categories.json` (enforced by a JSON schema). Made-up ids and confidence under 0.5 become `unknown`.
4. `rules.py` looks up the bin, points and tips for that id. Gemini never decides the bin.
5. For drop-off items (batteries, electronics, hazardous) the nearest site is added if a location was sent.

## Checking accuracy

Put real photos in `tests/eval_images/<category_id>/`, then:

```bash
python -m scripts.eval_classifier
```

It prints each result plus category accuracy and bin accuracy. This uses your real Gemini key.

## Endpoints so far

| Endpoint | What it does |
| --- | --- |
| `GET /health` | Returns `{"status": "ok"}` |
| `GET /categories` | Every category with its bin, points and tips |
| `GET /categories/{id}` | Where one category goes, e.g. `/categories/aluminum_can` |
| `GET /dropoffs/nearest?lat=&lon=&accepts=` | Closest drop-off that takes `electronics`, `batteries` or `hazardous` |
| `POST /classify` 🔒 | Form upload: `image` (photo), optional `lat`, `lon`. Saves a pending scan and returns item, bin, points, tips, `scan_id`, nearest drop-off |
| `POST /scans/{id}/confirm` 🔒 | "I recycled it": awards points |
| `POST /scans/{id}/correct` 🔒 | "Not right?": body `{"category_id": "...", "lat": .., "lon": ..}` |
| `GET /scans/me` 🔒 | Your last 50 scans |

🔒 needs `Authorization: Bearer <Supabase access token>`.

## Set up Supabase (once)

1. In the Supabase dashboard, open **SQL Editor**, paste all of `supabase/migrations/001_init.sql` and click **Run**.
2. Put `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` (Project Settings → API keys → secret / service_role) in `.env`.
3. Anonymous sign-ins must be on (Authentication → Sign In / Providers).

To try the 🔒 endpoints at `/docs`, run `python -m scripts.dev_token`, click **Authorize** and paste the token.

## Points and anti-cheat

- Points come from `data/categories.json` (rarer items are worth more), plus a +15 bonus the first time you sort a new kind of item.
- Points are only given on confirm, and each scan can be confirmed once.
- A corrected scan is worth at most 10 points, so relabelling junk as a battery doesn't pay.
- The same photo (even resized) never earns points twice, for anyone. We compare perceptual hashes.
- There's a daily cap (`DAILY_POINT_CAP`, default 200), counted in Ottawa time.
- The confirm-once rule and the cap run inside the `award_points` database function in one transaction, so two taps at once can't cheat it. Only the backend can call that function.

## Checking the Ottawa data

Entries in `data/categories.json` and `data/dropoff_sites.json` with `"verify": true` still need someone to check them against ottawa.ca.
