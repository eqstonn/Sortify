-- Sortify database: players, scans, leaderboards and the award_points function.
-- Run once in the Supabase SQL Editor: paste the whole file and click Run.
--
-- Who can do what:
--   * Everyone (even signed-out) can read profiles and the leaderboards.
--   * A signed-in player can read only their own scans.
--   * Nobody but the backend can write. The backend uses the service role key,
--     which skips row-level security; there are no insert/update/delete
--     policies, so the app's own Supabase key can't change anything.


-- ---------- profiles: one row per player ----------

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  name         text not null default 'Recycler' check (char_length(name) between 1 and 30),
  avatar       text not null default 'sprout',
  total_points integer not null default 0 check (total_points >= 0),
  items_sorted integer not null default 0,
  kg_diverted  numeric(10, 3) not null default 0,  -- kg kept out of landfill
  created_at   timestamptz not null default now()
);


-- ---------- scans: every photo someone scanned ----------

create table public.scans (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles (id) on delete cascade,
  category_id       text not null,             -- Gemini's pick from data/categories.json, or 'unknown'
  final_category_id text,                      -- set when the player taps "Not right?" and picks one
  item              text not null default '',  -- Gemini's short name, e.g. 'Coke can'
  confidence        real not null default 0,
  image_hash        text,                      -- perceptual hash, to spot the same photo twice
  status            text not null default 'pending' check (status in ('pending', 'confirmed')),
  points_awarded    integer not null default 0,
  kg_diverted       numeric(10, 3) not null default 0,
  created_at        timestamptz not null default now(),
  confirmed_at      timestamptz
);

create index scans_user_created_idx on public.scans (user_id, created_at desc);
create index scans_confirmed_idx on public.scans (confirmed_at desc) where status = 'confirmed';


-- ---------- row-level security ----------

alter table public.profiles enable row level security;
alter table public.scans enable row level security;

create policy "Profiles are readable by everyone"
  on public.profiles for select
  to anon, authenticated
  using (true);

create policy "Players read only their own scans"
  on public.scans for select
  to authenticated
  using ((select auth.uid()) = user_id);


-- ---------- a profile for every new player ----------

-- Runs when someone signs in for the first time (anonymous sign-in creates an auth user)
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Players who signed in before this migration ran
insert into public.profiles (id) select id from auth.users on conflict (id) do nothing;


-- ---------- award_points: confirm a scan and add points in one step ----------

-- The backend works out how many points a scan deserves (app/services/points.py).
-- This function then, in one transaction:
--   1. confirms the scan, only if it belongs to the player and is still pending
--      (so the same scan can never pay out twice),
--   2. trims the points so the player never passes the daily cap (Ottawa time),
--   3. adds the points, item and kg to the player's profile.
-- Returns {"awarded": n, "total_points": n}, or {"error": "..."}.
create function public.award_points(
  p_scan_id   uuid,
  p_user_id   uuid,
  p_points    integer,
  p_kg        numeric,
  p_daily_cap integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today_start  timestamptz :=
    date_trunc('day', now() at time zone 'America/Toronto') at time zone 'America/Toronto';
  v_earned_today integer;
  v_awarded      integer;
  v_total        integer;
begin
  -- Lock the player's row so two confirms at the same moment can't both slip past the cap
  perform 1 from public.profiles where id = p_user_id for update;
  if not found then
    return jsonb_build_object('error', 'no_profile');
  end if;

  update public.scans
     set status = 'confirmed', confirmed_at = now()
   where id = p_scan_id and user_id = p_user_id and status = 'pending';
  if not found then
    return jsonb_build_object('error', 'not_pending');
  end if;

  select coalesce(sum(points_awarded), 0) into v_earned_today
    from public.scans
   where user_id = p_user_id and status = 'confirmed' and confirmed_at >= v_today_start;

  v_awarded := greatest(0, least(p_points, p_daily_cap - v_earned_today));

  update public.scans
     set points_awarded = v_awarded, kg_diverted = greatest(p_kg, 0)
   where id = p_scan_id;

  update public.profiles
     set total_points = total_points + v_awarded,
         items_sorted = items_sorted + 1,
         kg_diverted  = kg_diverted + greatest(p_kg, 0)
   where id = p_user_id
  returning total_points into v_total;

  return jsonb_build_object('awarded', v_awarded, 'total_points', v_total);
end;
$$;

-- Functions are callable by everyone by default, which would let any player
-- give themselves points through the Supabase API. Only the backend may call it.
revoke execute on function public.award_points(uuid, uuid, integer, numeric, integer)
  from public, anon, authenticated;
grant execute on function public.award_points(uuid, uuid, integer, numeric, integer)
  to service_role;

revoke execute on function public.handle_new_user() from public, anon, authenticated;


-- ---------- leaderboards ----------

-- These views run with the owner's rights, so they can add up everyone's scans
-- even though scans are private. They only show totals, never individual scans.

create view public.leaderboard_all_time as
select id as user_id,
       name,
       avatar,
       total_points as points,
       rank() over (order by total_points desc) as rank
  from public.profiles
 where total_points > 0;

-- Week starts Monday, Ottawa time
create view public.leaderboard_week as
select p.id as user_id,
       p.name,
       p.avatar,
       sum(s.points_awarded)::integer as points,
       rank() over (order by sum(s.points_awarded) desc) as rank
  from public.scans s
  join public.profiles p on p.id = s.user_id
 where s.status = 'confirmed'
   and s.confirmed_at >= date_trunc('week', now() at time zone 'America/Toronto') at time zone 'America/Toronto'
 group by p.id, p.name, p.avatar
having sum(s.points_awarded) > 0;

revoke all on public.leaderboard_all_time, public.leaderboard_week from anon, authenticated;
grant select on public.leaderboard_all_time, public.leaderboard_week to anon, authenticated;
