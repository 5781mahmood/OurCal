-- OurCal: Supabase Auth (email magic link) + per-user Row Level Security.
-- Run after schema.sql and social.sql. Safe to re-run.
-- Every rule below is explained in plain English in docs/security.md.

-- 1. Ownership columns ------------------------------------------------------
-- Each row records which signed-in account (auth.users.id) owns it.
-- default auth.uid() fills it in from the caller's session automatically.
-- Rows created before this migration keep NULL owners and become invisible
-- to every client (only the dashboard / service role can still see them).

alter table public.profiles
  add column if not exists user_id uuid unique default auth.uid()
  references auth.users (id) on delete cascade;

alter table public.shared_foods
  add column if not exists contributor_id uuid default auth.uid()
  references auth.users (id) on delete set null;

alter table public.friendships
  add column if not exists owner_id uuid default auth.uid()
  references auth.users (id) on delete cascade;

alter table public.chat_rooms
  add column if not exists created_by uuid default auth.uid()
  references auth.users (id) on delete set null;

alter table public.chat_messages
  add column if not exists author_id uuid default auth.uid()
  references auth.users (id) on delete set null;

alter table public.diary_entries
  add column if not exists user_id uuid default auth.uid()
  references auth.users (id) on delete cascade;

create index if not exists diary_entries_user_date on public.diary_entries (user_id, entry_date);
create index if not exists friendships_owner on public.friendships (owner_id);
create index if not exists chat_messages_room on public.chat_messages (room_id, created_at);

-- 2. Usernames are permanent once claimed ----------------------------------
-- Rooms and friend links reference usernames, so renaming would silently
-- hand those rows to whoever claims the old name next.

create or replace function public.lock_profile_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.username is distinct from old.username then
    raise exception 'username cannot be changed once claimed' using errcode = '42501';
  end if;
  if new.user_id is distinct from old.user_id then
    raise exception 'profile owner cannot be changed' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_lock_identity on public.profiles;
create trigger profiles_lock_identity
  before update on public.profiles
  for each row execute function public.lock_profile_identity();

-- 3. Helper functions -------------------------------------------------------
-- security definer = runs with the table owner's rights, so a policy can ask
-- "what is my username?" without the profiles policy blocking the lookup.
-- Each helper only ever answers about the caller (auth.uid()) or returns a
-- yes/no, so it cannot be used to list other people's data.

create or replace function public.current_username()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.username from public.profiles p where p.user_id = auth.uid()
$$;

create or replace function public.is_claimed_username(p_username text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.username = p_username and p.user_id is not null
  )
$$;

create or replace function public.is_room_member(p_room uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.chat_rooms r
    where r.id = p_room
      and public.current_username() = any (r.member_usernames)
  )
$$;

create or replace function public.members_are_my_friends(p_members text[])
returns boolean
language sql
stable
set search_path = ''
as $$
  select not exists (
    select 1 from unnest(p_members) as m(username)
    where m.username <> public.current_username()
      and not exists (
        select 1 from public.friendships f
        where f.owner_id = auth.uid() and f.friend_username = m.username
      )
  )
$$;

-- Exact-match directory lookup for "add friend by @username". Returns only
-- public card fields, never lists, and never exposes user_id.
create or replace function public.lookup_profile(p_username text)
returns table (username text, display_name text, avatar_url text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.username, p.display_name, p.avatar_url
  from public.profiles p
  where p.username = lower(trim(p_username)) and p.user_id is not null
  limit 1
$$;

revoke all on function public.current_username() from public, anon;
revoke all on function public.is_claimed_username(text) from public, anon;
revoke all on function public.is_room_member(uuid) from public, anon;
revoke all on function public.members_are_my_friends(text[]) from public, anon;
revoke all on function public.lookup_profile(text) from public, anon;
grant execute on function public.current_username() to authenticated;
grant execute on function public.is_claimed_username(text) to authenticated;
grant execute on function public.is_room_member(uuid) to authenticated;
grant execute on function public.members_are_my_friends(text[]) to authenticated;
grant execute on function public.lookup_profile(text) to authenticated;

-- 4. Remove the old open demo policies -------------------------------------

drop policy if exists "profiles read" on public.profiles;
drop policy if exists "profiles insert" on public.profiles;
drop policy if exists "profiles update" on public.profiles;
drop policy if exists "foods read" on public.shared_foods;
drop policy if exists "foods insert" on public.shared_foods;
drop policy if exists "friends read" on public.friendships;
drop policy if exists "friends write" on public.friendships;
drop policy if exists "friends delete" on public.friendships;
drop policy if exists "rooms read" on public.chat_rooms;
drop policy if exists "rooms write" on public.chat_rooms;
drop policy if exists "messages read" on public.chat_messages;
drop policy if exists "messages write" on public.chat_messages;
drop policy if exists "diary read" on public.diary_entries;
drop policy if exists "diary write" on public.diary_entries;
drop policy if exists "diary delete" on public.diary_entries;

-- 5. Per-user policies ------------------------------------------------------
-- (select auth.uid()) instead of auth.uid() lets Postgres evaluate it once
-- per query instead of once per row.
-- No policy = denied. Anything not listed here (e.g. editing a message,
-- deleting a room) is refused for every client.

-- profiles: you can only see and edit your own row.
drop policy if exists "profiles: read own" on public.profiles;
drop policy if exists "profiles: create own" on public.profiles;
drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: read own" on public.profiles
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy "profiles: create own" on public.profiles
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- diary_entries: fully private to the owner.
drop policy if exists "diary: read own" on public.diary_entries;
drop policy if exists "diary: create own" on public.diary_entries;
drop policy if exists "diary: update own" on public.diary_entries;
drop policy if exists "diary: delete own" on public.diary_entries;
create policy "diary: read own" on public.diary_entries
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy "diary: create own" on public.diary_entries
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "diary: update own" on public.diary_entries
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "diary: delete own" on public.diary_entries
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- friendships: your friend list is yours; you can only add real, claimed
-- usernames, never yourself, and only under your own username.
drop policy if exists "friends: read own list" on public.friendships;
drop policy if exists "friends: add to own list" on public.friendships;
drop policy if exists "friends: update own list" on public.friendships;
drop policy if exists "friends: remove from own list" on public.friendships;
create policy "friends: read own list" on public.friendships
  for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "friends: add to own list" on public.friendships
  for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and owner_username = (select public.current_username())
    and friend_username <> owner_username
    and public.is_claimed_username(friend_username)
  );
create policy "friends: update own list" on public.friendships
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and owner_username = (select public.current_username())
    and friend_username <> owner_username
    and public.is_claimed_username(friend_username)
  );
create policy "friends: remove from own list" on public.friendships
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- chat_rooms (DMs and small groups): only members can see a room; you can
-- only create a room you are in, and everyone else in it must be your friend.
drop policy if exists "rooms: members read" on public.chat_rooms;
drop policy if exists "rooms: create with friends" on public.chat_rooms;
create policy "rooms: members read" on public.chat_rooms
  for select to authenticated
  using ((select public.current_username()) = any (member_usernames));
create policy "rooms: create with friends" on public.chat_rooms
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (select public.current_username()) = any (member_usernames)
    and public.members_are_my_friends(member_usernames)
  );

-- chat_messages: only room members can read; you can only post as yourself
-- into a room you belong to. Messages cannot be edited or deleted.
drop policy if exists "messages: members read" on public.chat_messages;
drop policy if exists "messages: members post as self" on public.chat_messages;
create policy "messages: members read" on public.chat_messages
  for select to authenticated
  using (public.is_room_member(room_id));
create policy "messages: members post as self" on public.chat_messages
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and author_username = (select public.current_username())
    and public.is_room_member(room_id)
  );

-- shared_foods: a public catalog. Anyone can read it; only signed-in users
-- can add to it, credited to their own username; only the contributor can
-- delete their entry.
drop policy if exists "foods: anyone reads" on public.shared_foods;
drop policy if exists "foods: share as self" on public.shared_foods;
drop policy if exists "foods: contributor deletes" on public.shared_foods;
create policy "foods: anyone reads" on public.shared_foods
  for select to anon, authenticated
  using (true);
create policy "foods: share as self" on public.shared_foods
  for insert to authenticated
  with check (
    contributor_id = (select auth.uid())
    and contributed_by = (select public.current_username())
  );
create policy "foods: contributor deletes" on public.shared_foods
  for delete to authenticated
  using (contributor_id = (select auth.uid()));
