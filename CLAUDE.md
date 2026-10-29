# Sortify

Hackathon project (teams of 4, 1st/2nd year students). A phone app that scans an item with the camera, says whether it's recyclable, tells you which Ottawa bin or drop-off it goes to, and awards points on a leaderboard. Ottawa first.

## Stack

- **Frontend:** Expo (React Native) app
- **Backend:** Python FastAPI (deployed on Render; ngrok for local phone testing)
- **Recognition:** Gemini Flash via `google-genai`
- **Auth + data:** Supabase (auth token checked in the backend, service-role client for DB writes)

The backend is a plain JSON API. All logic (points, levels, stats, Wrapped) lives in the backend so any frontend (Expo or web) can use it. Never put scoring logic in the client.

## Features

1. **Scan:** photo → item, material, Ottawa disposal (blue bin, black bin, green bin, garbage, drop-off), prep tips (e.g. rinse first), nearest drop-off for e-waste/batteries/hazardous.
2. **Result screen:** "I recycled it" (awards points), "Skip", and "Not right?" (user picks the correct category).
3. **Global leaderboard:** this week / all time. Rarer items earn more points.
4. **Profile / career stats:** name, avatar, level, total points, items sorted, kg kept out of landfill, longest streak, "What you sort" material breakdown, badges.
5. **Sortify Wrapped:** monthly recap as 5 swipeable story cards: intro, total items + kg, top material, rarest find, rank in Ottawa + top recycler + busiest day + longest streak.
6. **Discover weekly:** one tricky item each week with bonus points.
7. **Home:** a plant that grows with recycled items (levels like "Sapling" → "Young Tree"), points, items this week, streak, Ottawa rank, and an "Up next" pickup banner (e.g. "Black + green bin · Tue, Oct 27").

Email/password login can come later; start with name + avatar.

## Ottawa disposal

- **Blue bin:** glass bottles/jars, metal cans, foil, plastic bottles/tubs/jugs, cartons
- **Black bin:** paper, flattened cardboard, boxboard
- **Green bin:** food scraps, soiled paper, greasy pizza boxes
- **Garbage:** chip bags, styrofoam, plastic film
- **Drop-off:** electronics, batteries, paint, propane, bulbs, chemicals

Pickup alternates blue/black weekly; green is weekly. Holiday shifts move pickup a day (e.g. Thanksgiving).

## Backend layout (planned)

```
app/main.py          FastAPI app, CORS for Expo, mounts routers, GET /health
app/config.py        settings from .env via pydantic-settings (Gemini key, Supabase URL/keys, daily point cap)
app/deps.py          reads the Supabase login token → user id, or 401
app/schemas.py       Pydantic v2: ClassifyResult, ScanOut, LeaderboardEntry, ProfileOut, WrappedOut (the frontend contract)
app/db.py            one Supabase client (service role key)

routers/classify.py     POST /classify: photo → Gemini → Ottawa bin, saves an unconfirmed scan, returns result-screen data
routers/scans.py        POST /scans/{id}/confirm (award points), POST /scans/{id}/correct, GET /scans/me
routers/leaderboard.py  GET /leaderboard?range=week|all: top 20 + caller's rank
routers/profile.py      GET /me, PATCH /me: name, avatar, level, all-time stats, breakdown, badges
routers/schedule.py     GET /schedule/next, PUT /me/schedule: pickup day + blue/black week parity
routers/wrapped.py      GET /wrapped/{year}/{month}: data for the 5 Wrapped cards

services/gemini.py    prompt, JSON response schema with a FIXED category list, call, answer validation
services/rules.py     category → Ottawa disposal, prep tips, nearest drop-off (from data/*.json)
services/points.py    scoring, first-new-category bonus, daily cap, no points for the same photo twice (imagehash)
services/images.py    resize to ~1024 px, strip EXIF/location before sending or saving (Pillow)
services/schedule.py  next pickup from day + week parity, then holiday shifts
services/wrapped.py   monthly totals: items, kg estimate, top materials, rarest item, rank, busiest day, streak

data/categories.json       each category's bin, points, tips
data/dropoff_sites.json    Ottawa e-waste/battery/hazardous drop-offs with address + coordinates
data/holiday_shifts.json   pickup date shifts from the city calendar
supabase/migrations/001_init.sql  tables, row-level security, weekly leaderboard view, award_points() function
scripts/seed.py            loads JSON into Supabase + fake players for the demo
scripts/eval_classifier.py runs tests/eval_images/ through Gemini and prints accuracy
tests/                     pytest for rules, points, schedule; API tests with Gemini mocked
```

requirements: fastapi, uvicorn, pydantic-settings, python-multipart, google-genai, supabase, pillow, imagehash, pytest, httpx, tzdata

## Rules

- **Anti-cheat:** points are only awarded on confirm, capped per day, and never twice for the same photo (perceptual hash). Points update through the `award_points` DB function in one step.
- **Gemini must pick from the fixed category list.** The bin comes from `data/categories.json`, not from Gemini's free text.
- **Secrets:** never commit `.env`. `.env.example` lists the names with no values.

## UI style (from the mockups)

Mockups for every screen are in docs/mockups/ (01-home, 02-leaderboard, 03-profile, 04-camera, 05-scan-result, 06-10 wrapped cards). Look at the matching image before building a screen and match it closely.

Soft mint/sage background, rounded white cards, deep green primary (#2E7D32-ish), bold rounded sans headings. Bottom tab bar: Home, Board, centre Scan button, Wrapped, Me. Result card uses the bin's colour (blue bin = blue). Scan camera has a framing guide and a Photo/Barcode toggle.

## How we build

In small steps, each one runnable and testable (at `/docs` for the backend) before moving on. The team needs to be able to explain the code to judges.

## Build phases

Full plan with files and tests per phase: docs/BUILD_PLAN.md (read it before starting a phase).

- [x] Phase 0: backend skeleton (`app/main.py`, `config.py`, `schemas.py`, CORS, `/health`)
- [x] Phase 1: Ottawa rules (`data/categories.json`, `data/dropoff_sites.json`, `app/services/rules.py`, `/categories`, `/dropoffs/nearest`)
- [x] Phase 2: scanning with Gemini (`app/services/images.py`, `app/services/gemini.py`, `app/routers/classify.py`, `scripts/eval_classifier.py`). Gemini must pick a category id from `rules.category_ids()`; the bin comes from `rules.get_disposal()`. Replaces the old demo `main.py` and `static/`.
- [x] Phase 3: Supabase auth, scans, points with anti-cheat (`app/db.py`, `app/deps.py`, `app/services/points.py`, `app/routers/scans.py`, `supabase/migrations/001_init.sql`, `scripts/dev_token.py`). Tests use `tests/fakes.py:FakeDB`.
- [x] Phase 4: leaderboard, profile, levels, pickup schedule (`app/routers/leaderboard.py`, `profile.py`, `schedule.py`, `app/services/levels.py`, `stats.py`, `schedule.py`, `clock.py`, `data/holiday_shifts.json`, `supabase/migrations/002_schedule.sql`). Leaderboard views live in `001_init.sql`. All days/weeks/streaks use Ottawa time via `clock.py` (needs `tzdata` on Windows); tests pin `clock.today`.
- [x] Phase 5: Expo app in `mobile/` (sign-in, camera, result, Home, Board, Me). Screens load through `lib/useLoad.ts` (loading, error + Try again, pull-to-refresh, reload on focus). Board's "N items sorted" needs `supabase/migrations/004_leaderboard_items.sql`; without it the rows just leave it out. Jest tests mock `@/lib/api`; `fireEvent` must be awaited (Testing Library v14).
- [x] Phase 6: Wrapped, Discover weekly, badges (`app/services/wrapped.py`, `discover.py`, `badges.py`, `app/routers/wrapped.py`, `discover.py`, `data/discover_weekly.json`, `supabase/migrations/003_badges.sql`, `scripts/dev_seed_month.py`; app: `mobile/app/(tabs)/wrapped.tsx` + `components/WrappedStory.tsx`, `components/DiscoverCard.tsx` on Home, badges on `me.tsx`). Months and weeks use Ottawa time; a streak that crosses a month counts in full in both months' Wrapped.
- [x] Phase 7: seed data, Render deploy, demo prep (`scripts/seed.py`, `scripts/smoke_test.py`, `render.yaml`, README, `DEMO.md`). Seed players are logins `seed-NN@example.com`; rerunning replaces their month, `--remove` deletes them. `requirements.txt` is pinned to the tested versions. The app doesn't send location yet, so the result screen never shows the nearest drop-off.

Code lives in `app/` (routers in `app/routers/`, services in `app/services/`), data in `data/`, tests in `tests/`. Every phase ships with pytest tests; Gemini and Supabase are faked in tests. Run `pytest` before committing.