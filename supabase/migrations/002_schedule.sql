-- Phase 4: each player's curbside pickup schedule.
-- Run once in the Supabase SQL Editor after 001_init.sql: paste the whole file and click Run.
--
-- The leaderboard views (leaderboard_week, leaderboard_all_time) are already in 001_init.sql.

alter table public.profiles
  -- 0 = Monday ... 4 = Friday (Ottawa collects on weekdays)
  add column pickup_day   smallint check (pickup_day between 0 and 4),
  -- The Monday of any week when the blue bin went out. Blue and black alternate
  -- weekly, so every even number of weeks from here is a blue week.
  add column blue_week_of date check (extract(isodow from blue_week_of) = 1);
