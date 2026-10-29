-- Phase 5: "41 items sorted" under each name on the Board.
-- Run once in the Supabase SQL Editor after 003_badges.sql: paste the whole file and click Run.
--
-- Same views as 001_init.sql with an `items` column added at the end
-- (create or replace can only add columns after the existing ones).
-- The app works without this file; rows just don't show an item count.

create or replace view public.leaderboard_all_time as
select id as user_id,
       name,
       avatar,
       total_points as points,
       rank() over (order by total_points desc) as rank,
       items_sorted as items
  from public.profiles
 where total_points > 0;

-- Week starts Monday, Ottawa time
create or replace view public.leaderboard_week as
select p.id as user_id,
       p.name,
       p.avatar,
       sum(s.points_awarded)::integer as points,
       rank() over (order by sum(s.points_awarded) desc) as rank,
       count(*)::integer as items
  from public.scans s
  join public.profiles p on p.id = s.user_id
 where s.status = 'confirmed'
   and s.confirmed_at >= date_trunc('week', now() at time zone 'America/Toronto') at time zone 'America/Toronto'
 group by p.id, p.name, p.avatar
having sum(s.points_awarded) > 0;
