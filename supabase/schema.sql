-- Run in Supabase SQL editor for global usernames, shared foods, and avatars.

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

create policy "profiles read" on public.profiles for select using (true);
create policy "profiles insert" on public.profiles for insert with check (true);
create policy "profiles update" on public.profiles for update using (true);

create policy "foods read" on public.shared_foods for select using (true);
create policy "foods insert" on public.shared_foods for insert with check (true);
