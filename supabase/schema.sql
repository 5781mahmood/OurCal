-- Run in Supabase SQL editor for global usernames, shared foods, and avatars.
-- Tables only. Access rules live in auth_rls.sql (run social.sql, then auth_rls.sql).

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  display_name text not null,
  avatar_url text,
  created_at timestamptz default now()
);

create table if not exists public.shared_foods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text,
  serving_label text not null,
  calories numeric not null,
  protein numeric not null,
  carbs numeric not null,
  fat numeric not null,
  contributed_by text not null,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.shared_foods enable row level security;
