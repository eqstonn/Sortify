-- Phase 6: badges each player has earned.
-- Run once in the Supabase SQL Editor after 002_schedule.sql: paste the whole file and click Run.
--
-- The badge rules live in app/services/badges.py. One row per (player, badge),
-- so a badge can only ever be awarded once, even if two confirms race.
-- Wrapped and Discover weekly are worked out from the scans table and need no new tables.

create table public.badges (
  user_id   uuid not null references public.profiles (id) on delete cascade,
  badge_id  text not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

-- Only the backend writes (service role key); players can read their own
alter table public.badges enable row level security;

create policy "Players read their own badges"
  on public.badges for select
  to authenticated
  using ((select auth.uid()) = user_id);
