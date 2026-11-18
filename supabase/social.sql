-- Run this AFTER the first schema, then run auth_rls.sql. It adds friends,
-- chat, and diary tables so two browsers can see the same people and messages.
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

-- RLS is on with no policies here, so these tables deny everything until
-- auth_rls.sql adds the per-user rules.

do $$
begin
  alter publication supabase_realtime add table public.chat_messages;
exception
  when duplicate_object then null;
end $$;
