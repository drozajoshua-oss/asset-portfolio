-- Ticker price history — powers the % change on the landing-page ticker.
-- MISSING IN PROD (discovered 2026-08-07): the server has always upserted
-- snapshots here, but the table was never created, so the write failed
-- silently and `change` was permanently null. Run this in the Supabase
-- SQL Editor.

create table if not exists price_history (
  day        date           not null,
  label      text           not null,
  price      numeric        not null,
  created_at timestamptz    not null default now(),
  -- the server upserts with on_conflict=day,label — this constraint is
  -- what makes that work; without it the upsert errors out.
  primary key (day, label)
);

create index if not exists price_history_day_idx on price_history (day desc);

-- Server writes with the service role (bypasses RLS). Nothing else should
-- read or write, so enable RLS with no policies.
alter table price_history enable row level security;
