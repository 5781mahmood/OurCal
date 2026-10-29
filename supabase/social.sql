-- Run this AFTER the first schema. It adds friends, chat, and diary rows
-- so two browsers can see the same people and messages.
-- Language: SQL (Structured Query Language), the language databases understand.

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  owner_username text not null,
  friend_username text not null,
  display_name text not null,
  avatar_url text,
  created_at timestamptz default now(),
  unique (owner_username, friend_username)
);

create table if not exists public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  member_usernames text[] not null,
  created_at timestamptz default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  author_username text not null,
  author_name text not null,
  body text not null,
  created_at timestamptz default now()
);

create table if not exists public.diary_entries (
  id uuid primary key,
  username text not null,
  entry_date text not null,
  meal text not null,
  name text not null,
  servings numeric not null,
  calories numeric not null,
  protein numeric not null,
  carbs numeric not null,
  fat numeric not null,
  created_at timestamptz default now()
);

alter table public.friendships enable row level security;
alter table public.chat_rooms enable row level security;
alter table public.chat_messages enable row level security;
alter table public.diary_entries enable row level security;

drop policy if exists "friends read" on public.friendships;
drop policy if exists "friends write" on public.friendships;
drop policy if exists "friends delete" on public.friendships;
create policy "friends read" on public.friendships for select using (true);
create policy "friends write" on public.friendships for insert with check (true);
create policy "friends delete" on public.friendships for delete using (true);

drop policy if exists "rooms read" on public.chat_rooms;
drop policy if exists "rooms write" on public.chat_rooms;
create policy "rooms read" on public.chat_rooms for select using (true);
create policy "rooms write" on public.chat_rooms for insert with check (true);

drop policy if exists "messages read" on public.chat_messages;
drop policy if exists "messages write" on public.chat_messages;
create policy "messages read" on public.chat_messages for select using (true);
create policy "messages write" on public.chat_messages for insert with check (true);

drop policy if exists "diary read" on public.diary_entries;
drop policy if exists "diary write" on public.diary_entries;
drop policy if exists "diary delete" on public.diary_entries;
create policy "diary read" on public.diary_entries for select using (true);
create policy "diary write" on public.diary_entries for insert with check (true);
create policy "diary delete" on public.diary_entries for delete using (true);

do $$
begin
  alter publication supabase_realtime add table public.chat_messages;
exception
  when duplicate_object then null;
end $$;
