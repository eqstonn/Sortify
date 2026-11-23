-- Real logins (email + password, Google) and profile photos.
-- Run after 001-004 (Supabase dashboard > SQL editor > paste > Run).

-- ---------- a new player's name ----------

-- The profile made at sign-up now takes the player's name:
--   * email sign-up: the app sends it as user metadata { name }
--   * Google: Google's profile gives full_name (and name)
-- Cut to 30 characters (the profiles.name limit); 'Recycler' if there's none.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  wanted text := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    'Recycler'
  );
begin
  insert into public.profiles (id, name)
  values (new.id, btrim(left(wanted, 30)))
  on conflict (id) do nothing;
  return new;
end;
$$;


-- ---------- profile photos ----------

-- Public bucket: anyone can view a photo by its URL (they show on the
-- leaderboard). Only the backend uploads, with the service-role key
-- (POST /me/avatar), after shrinking the photo and removing its location data,
-- so no upload policies are needed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg'])
on conflict (id) do nothing;
