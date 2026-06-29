-- Run this in the Supabase dashboard → SQL Editor

create table public.assets (
  id                  uuid        default gen_random_uuid() primary key,
  user_id             uuid        references auth.users(id) on delete cascade not null,
  name                text        not null,
  category            text,
  country             text,
  year                integer,
  estimated_value_low numeric,
  estimated_value_high numeric,
  manual_value        numeric,
  rarity              text        check (rarity in ('common', 'uncommon', 'rare', 'legendary')),
  grade               text,
  image_url           text,
  -- display fields needed by the app UI
  coin_color          text,
  symbol_char         text,
  metal               text        check (metal in ('Gold', 'Silver', 'Copper', 'Bronze')),
  created_at          timestamptz default now() not null
);

alter table public.assets enable row level security;

create policy "select own assets"
  on public.assets for select
  using (auth.uid() = user_id);

create policy "insert own assets"
  on public.assets for insert
  with check (auth.uid() = user_id);

create policy "update own assets"
  on public.assets for update
  using (auth.uid() = user_id);

create policy "delete own assets"
  on public.assets for delete
  using (auth.uid() = user_id);
