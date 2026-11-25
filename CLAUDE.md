# Sortify

Hackathon project (teams of 4, 1st/2nd year students). A phone app that scans an item with the camera, says whether it's recyclable, tells you which Ottawa bin or drop-off it goes to, and awards points on a leaderboard. Ottawa first.

## Stack

- **Frontend:** Expo (React Native) app
- **Backend:** Python FastAPI (deployed on Render; cloudflared tunnel for local phone testing)
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

Login: Supabase Auth with email + password or Google, and an optional profile photo (setup: docs/AUTH_SETUP.md).

## Ottawa disposal

Rules as of January 1, 2026, when Circular Materials took over the blue and black bins (still two bins: containers blue, fibre black).

- **Blue bin:** glass bottles/jars, metal cans, foil, aerosol cans (no hazard symbols), plastic bottles/tubs/jugs, cartons; new in 2026: flexible plastic (chip bags, wrappers, plastic bags, bubble wrap, film), foam packaging (takeout containers, cups, meat trays), paper coffee cups, tubes. The 2026 additions are home blue bin only (`home_only` in categories.json; the result screen says so): away from home (school, work, public bins) they're garbage.
- **Black bin:** paper, flattened cardboard, boxboard, paper bags
- **Green bin:** food scraps, soiled paper, greasy pizza boxes
- **Garbage:** plastic cutlery and straws, drinking glasses and ceramics, toys, diapers, books
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
- **Gemini must pick from the fixed category list.** The bin comes from `data/categories.json`, not from Gemini's free text. One exception: when nothing in the list fits but Gemini can name the item (a Pokémon card), `gemini.look_up()` asks Gemini with Google Search for the Ottawa rule, and it must answer with one of our 5 bins (anything else is dropped). The scan is filed under `other_<bin>` (in categories.json, never offered for photos), worth that bin's usual points, and the result shows "Checked online" with sources and a Waste Explorer link. "Not right?" → "Something else" files it as `other_garbage`. Tests fake the lookup (`conftest.py` makes it fail unless a test fakes an answer).
- **Secrets:** never commit `.env`. `.env.example` lists the names with no values.

## UI style ("cozy garden", light only)

The mockups in `mobile/assets/redesign/` are the source of truth for the look (2x images: halve pixel sizes). The redesign is being rolled out screen by screen; scan and result still use the older glass pieces until their step.
- Wrapped is its own poster style (`components/WrappedStory.tsx` + `components/wrapped/`): full-bleed colour cards from `colors.wrapped` (forest, terracotta, cream, sage, marigold), Outfit Black type (`fonts.poster`), animated with moti/reanimated (`<Rise>`, `<Loop>`, `<Move>`, `<CountUp>` in `wrapped/motion.tsx`, all still under Reduce Motion). Cards auto-advance every 5 s; tap left/right; hold to pause. Jest needs `transformIgnorePatterns` for moti and reanimated's `jest/resolver` (package.json).

- Beige page with soft corner blobs (`Backdrop`, SVG), cream "chunky" cards: `#FFFDF7` fill, 1.5 pt dark-green edge, 24 pt corners, a solid band straight below (`boxShadow` with no blur). Deep green `#1F3D2A` and terracotta `#A9573B` accents; green/terracotta surfaces are vertical gradients with a 1 pt lighter top line (`Card tone=...`).
- Fonts: Outfit (headings, numbers, buttons) and DM Sans (body), loaded in `app/_layout.tsx`. Icons: `lucide-react-native` (on a gradient, wrap an icon in a `<View>` or the browser paints it under the gradient).
- One theme, no dark mode: `mobile/theme.ts` holds the palette; components never use raw colours, they use `useTheme()` / `makeStyles()` from `mobile/lib/theme.tsx`.
- Shared pieces: `Screen` (backdrop + safe area + 500 px column cap, wider than any phone so sheets reach the screen edges), `Card`, `SheetPanel`, `ActionButton`, `TextField`, `Pill`, `ProgressBar`, `Avatar` (photo or grey default person), `Logo` (renders the SVG file), `IconTile`, `HeroSheet` (art behind a sheet that scrolls over it; pulling down drags the art along so the cut-off pot never shows), `NavBar` (floating green pill: Home, Board, raised terracotta Scan, Wrapped, Me), `PressableScale`.
- The result's bin card stays a solid block in the bin's colour.

## Plant art

One static transparent PNG per plant stage, no animation (`mobile/lib/plant.ts`). Originals: `mobile/assets/redesign/Stage-N-transparent.png`; `python -m scripts.build_plant_assets` writes the 1200 px app copies to `mobile/assets/plant/stage-N.png`. 4 levels, one stage each (`app/services/levels.py`): 1 Sprout (0 pts), 2 Seedling (50), 3 Sapling (100), 4 Young Tree (200), low on purpose for the demo. At level 4 the app shows "Max level".

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
- [x] Phase 6: Wrapped, Discover weekly, badges (`app/services/wrapped.py`, `discover.py`, `badges.py`, `app/routers/wrapped.py`, `discover.py`, `data/discover_weekly.json`, `supabase/migrations/003_badges.sql`, `scripts/dev_seed_month.py`; app: `mobile/app/(tabs)/wrapped.tsx` + `components/WrappedStory.tsx`, Discover on Home (now `components/DiscoverRows.tsx`), badges on `me.tsx`). Months and weeks use Ottawa time; a streak that crosses a month counts in full in both months' Wrapped.
- [x] Phase 7: seed data, Render deploy, demo prep (`scripts/seed.py`, `scripts/smoke_test.py`, `render.yaml`, README, `DEMO.md`). Seed players are logins `seed-NN@example.com`; rerunning replaces their month, `--remove` deletes them. `requirements.txt` is pinned to the tested versions. Drop-off items (electronics, batteries, hazardous) get a nearest-site card on the result screen: `mobile/lib/dropoff.ts` asks for the phone's location, calls `GET /dropoffs/nearest`, and the Directions button opens Google Maps (a Maps search if location is refused). `data/dropoff_sites.json` has 9 researched Ottawa sites (Nov 2026; `verify: true` ones need a call to confirm).

- [ ] Phase 9: "cozy garden" redesign from `mobile/assets/redesign/` (done: theme + shared pieces, nav, Home, Board, Me, 4 levels, splash + sign-in/sign-up/reset, real Supabase auth, photo avatars; to do: scan/result). Auth: `mobile/lib/supabase.ts` (sign-in functions, PKCE links), `lib/session.tsx` (loading / signedOut / signedIn / recovering picks the screens in `app/_layout.tsx`), `lib/authStorage.ts` (Remember me off = login kept in memory only). `005_auth.sql`: new profiles take the sign-up/Google name; public `avatars` bucket. `POST /me/avatar` crops to 512 px and strips EXIF before upload. Me's "Recycling since" comes from the oldest scan in GET /scans/me (newest 50 only). Screens fall back to the mockup's numbers (`lib/demo.ts`) only when the backend can't be reached.
- [x] Phase 8: glass UI revamp (since replaced by Phase 9: no dark mode, static plant art, 4 levels). Jest mocks `expo-blur`, `lucide-react-native` and `expo-sqlite/kv-store` in `jest.setup.tsx`; `lib/kv.web.ts` keeps expo-sqlite out of the web build.

Code lives in `app/` (routers in `app/routers/`, services in `app/services/`), data in `data/`, tests in `tests/`. Every phase ships with pytest tests; Gemini and Supabase are faked in tests. Run `pytest` before committing.