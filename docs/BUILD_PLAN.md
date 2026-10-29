# Sortify build plan

8 phases. Each one ends with something you can run and a `pytest` suite that passes. Gemini and Supabase are faked in tests, so tests are free, fast and offline. Every phase also has a manual check. Commit and push after each phase, and tick it off in `CLAUDE.md`.

Paths: backend code lives in `app/` (`app/routers/`, `app/services/`), data in `data/`, tests in `tests/`, the Expo app in `mobile/`.

## Phase 0: Backend skeleton (done)

| File | What it does |
| --- | --- |
| `app/main.py` | Creates the app, CORS, mounts routers, `GET /health` |
| `app/config.py` | Settings from `.env` (pydantic-settings) |
| `app/schemas.py` | Pydantic shapes, the contract for the app |
| `.env.example`, `requirements.txt`, `pytest.ini`, `tests/conftest.py` | Setup |

Tests: `tests/test_health.py`, `tests/test_config.py`.

## Phase 1: Ottawa rules (done)

| File | What it does |
| --- | --- |
| `data/categories.json` | Each category's bin, points, rarity, kg estimate and tips |
| `data/dropoff_sites.json` | E-waste, battery and hazardous drop-offs |
| `app/services/rules.py` | `get_disposal()`, `category_ids()`, `nearest_dropoff()` |
| `app/routers/categories.py` | `GET /categories`, `GET /categories/{id}`, `GET /dropoffs/nearest` |

Tests: `tests/test_rules.py`, `tests/test_categories_api.py`.
Manual: a teammate checks every `"verify": true` entry against ottawa.ca.

## Phase 2: Scanning with Gemini

`POST /classify` shrinks the photo, asks Gemini to pick ONE category id from `rules.category_ids()`, then gets the bin from `rules.get_disposal()`. Gemini never decides the bin. Nothing is saved yet. Replaces the old demo `main.py` and `static/`.

| File | What it does |
| --- | --- |
| `app/services/images.py` | Shrinks to about 1024 px, strips EXIF/GPS (Pillow) |
| `app/services/gemini.py` | Prompt, response schema with an enum of category ids, the call, answer validation |
| `app/routers/classify.py` | `POST /classify`, returns `ClassifyResult` |
| `scripts/eval_classifier.py` | Runs `tests/eval_images/` through Gemini and prints accuracy |

Tests (`tests/test_images.py`, `tests/test_gemini.py`, `tests/test_classify_api.py`):
- A 4000 px photo comes out at 1024 px or less on its longest side.
- GPS data is removed.
- A non-image or empty upload gets a 400.
- A valid Gemini answer is parsed; a category outside the list becomes "unknown".
- Broken JSON or a Gemini error returns a clean 502.
- `/classify` returns the bin from the rules, using a fake Gemini that says "aluminum_can".

Manual: about 20 real photos in `tests/eval_images/`, aim for 80% or better.

## Phase 3: Accounts, scans and points (Supabase)

| File | What it does |
| --- | --- |
| `supabase/migrations/001_init.sql` | Tables (profiles, scans, point events), RLS policies, `award_points` function |
| `app/db.py` | One Supabase client with the secret key |
| `app/deps.py` | Reads the user's login token, returns their user id or a 401 |
| `app/services/points.py` | Base points, first-new-category bonus, daily cap, duplicate photo check (imagehash) |
| `app/routers/scans.py` | `POST /scans/{id}/confirm`, `POST /scans/{id}/correct`, `GET /scans/me` |
| `app/routers/classify.py` (updated) | Saves each scan as unconfirmed with its photo hash |

Supabase setup: anonymous sign-ins on, automatic RLS on. RLS: users read only their own scans; profiles and leaderboard are readable by everyone; only the backend writes points.

Tests (`tests/test_points.py`, `tests/test_scans_api.py`, fake database):
- Base points, first-category bonus, and the daily cap.
- The same or a near-identical photo earns 0 the second time.
- Confirm awards once; confirming again returns 409.
- Confirming someone else's scan is refused.
- "Not right?" saves the correction and awards nothing.
- 401 without a login token.
- `GET /scans/me` returns only your scans, newest first.

Manual: run the migration in the SQL Editor, sign in a test user, scan, confirm, and check points in the table view.

## Phase 4: Leaderboard, profile and pickup schedule

| File | What it does |
| --- | --- |
| `supabase/migrations/002_leaderboard.sql` | Weekly and all-time leaderboard views |
| `app/routers/leaderboard.py` | `GET /leaderboard?range=week|all`: top 20 plus your rank |
| `app/services/levels.py` | Points to plant level (Seed, Sprout, Sapling, Young Tree...) and progress to next |
| `app/routers/profile.py` | `GET /me`, `PATCH /me`: name, avatar, level, stats, "What you sort" breakdown |
| `app/services/schedule.py` | Next pickup from pickup day + blue/black week, then holiday shifts |
| `data/holiday_shifts.json` | Pickup dates that move, from the city calendar |
| `app/routers/schedule.py` | `GET /schedule/next`, `PUT /me/schedule` |

Tests: leaderboard sorted, capped at 20, still shows your rank at 35th; `range=week` ignores older points; level thresholds and progress math; `/me` totals match fake scans; `PATCH /me` rejects empty or too-long names; schedule on pickup day returns today, the day after returns next week, blue/black alternates; a holiday shift moves pickup a day.

Manual: two test users scan and confirm at `/docs`; watch the leaderboard and `/me` update.

## Phase 5: Expo app (`mobile/`)

| File | What it does |
| --- | --- |
| `mobile/app/(tabs)/index.tsx` | Home: plant, points, level bar, items this week, streak, rank, "Up next" banner |
| `mobile/app/(tabs)/board.tsx` | Leaderboard with podium, This week / All time |
| `mobile/app/(tabs)/me.tsx` | Profile: stats, "What you sort" bars, badges |
| `mobile/app/(tabs)/_layout.tsx` | Bottom tabs with the centre Scan button |
| `mobile/app/scan.tsx` | Camera (expo-camera) with framing guide and gallery picker |
| `mobile/app/result.tsx` | Result card in the bin's colour, prep steps, I recycled it / Skip / Not right? |
| `mobile/app/sign-in.tsx` | Name and avatar (anonymous Supabase sign-in) |
| `mobile/lib/api.ts` | Typed API client matching `app/schemas.py` |
| `mobile/lib/supabase.ts` | Supabase login with the publishable key, token storage |
| `mobile/components/` | `PlantHero`, `BinCard`, `PointsToast`, `StatTile`, `LeaderRow` |
| `mobile/theme.ts` | Colours, fonts, spacing from the mockups |

Tests (Jest + jest-expo + React Native Testing Library, API mocked): `api.ts` sends photo and token and handles errors; `BinCard` colours per bin; "I recycled it" calls confirm and shows the toast; "Not right?" sends a correction; Home renders from a fake profile; camera shows the upload fallback when permission is denied.

Manual: `npx expo start`, Expo Go on a phone, backend over a cloudflared tunnel; full scan, confirm, leaderboard loop.

## Phase 6: Wrapped, Discover weekly and badges

| File | What it does |
| --- | --- |
| `app/services/wrapped.py` | Monthly items, kg, top materials, rarest find, rank, top recycler, busiest day, longest streak |
| `app/routers/wrapped.py` | `GET /wrapped/{year}/{month}` |
| `data/discover_weekly.json` | One tricky item per week, bonus points, explainer |
| `app/routers/discover.py` | `GET /discover/current` |
| `app/services/badges.py` | Badge rules (First sort, E-waste hero, 7-day streak, Glass master...) |
| `mobile/app/wrapped.tsx` | Five swipeable story cards with a share button |

Tests: Wrapped totals, top-5 order and rarest find from fixed fake scans; busiest day and a streak across a month boundary; empty month returns zeros; Discover bonus only for this week's item, once; each badge awarded once; Wrapped screen pages forward and back.

## Phase 7: Seed data, deploy and demo prep

| File | What it does |
| --- | --- |
| `scripts/seed.py` | Categories and sites into Supabase, plus about 20 fake Ottawa players with a month of scans |
| `render.yaml` | Render deploy config |
| `scripts/smoke_test.py` | Hits the live `/health` and `/classify` and prints pass or fail |
| `README.md` | Local run, cloudflared, Render deploy |
| `DEMO.md` | Demo script: which items to scan, in what order, backup plan |

Tests: seeding twice makes no duplicates; fake players' points match their scans; smoke test passes against Render; full `pytest` passes.

Manual: full dress rehearsal on a hotspot with the app pointed at Render; time the pitch.
