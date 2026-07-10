-- Phase 2 (social): profiles, public vaults, follows, blocks, likes, reports.
-- Additive only — no changes to existing behavior until the app uses it.
-- APPLY AFTER v1.0 IS APPROVED (run in Supabase SQL Editor).

create extension if not exists citext;

-- ---------------------------------------------------------------------------
-- profiles: one optional row per auth user. A user without a row (or without
-- a username) simply has no public presence; the core app never requires one.
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  username     citext unique,
  display_name text check (char_length(display_name) <= 40),
  avatar_url   text,
  bio          text check (char_length(bio) <= 160),
  vault_public boolean not null default false,
  hide_values  boolean not null default true,
  created_at   timestamptz not null default now(),
  constraint username_format check (
    username is null or username ~ '^[a-z0-9_]{3,20}$'
  )
);

-- Reserved handles nobody can claim.
create table if not exists reserved_usernames (username citext primary key);
insert into reserved_usernames (username) values
  ('trovault'),('admin'),('administrator'),('support'),('help'),('official'),
  ('apple'),('appstore'),('mod'),('moderator'),('staff'),('team'),('api'),
  ('root'),('system'),('security'),('billing'),('legal'),('privacy')
on conflict do nothing;

-- Enforce the reserved list at write time.
create or replace function check_username_allowed()
returns trigger language plpgsql as $$
begin
  if new.username is not null and exists (
    select 1 from reserved_usernames r where r.username = new.username
  ) then
    raise exception 'username_reserved';
  end if;
  return new;
end $$;

drop trigger if exists trg_username_reserved on profiles;
create trigger trg_username_reserved
  before insert or update of username on profiles
  for each row execute function check_username_allowed();

-- ---------------------------------------------------------------------------
-- assets: per-item visibility flag (public vaults exclude hidden items).
-- ---------------------------------------------------------------------------
alter table assets add column if not exists is_hidden boolean not null default false;

-- ---------------------------------------------------------------------------
-- social edges
-- ---------------------------------------------------------------------------
create table if not exists follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  followee_id uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followee_id),
  constraint no_self_follow check (follower_id <> followee_id)
);

create table if not exists blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint no_self_block check (blocker_id <> blocked_id)
);

create table if not exists likes (
  user_id    uuid not null references auth.users(id) on delete cascade,
  asset_id   uuid not null references assets(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, asset_id)
);

create table if not exists reports (
  id          bigint generated always as identity primary key,
  reporter_id uuid references auth.users(id) on delete set null,
  target_type text not null check (target_type in ('profile','item')),
  target_id   text not null,
  reason      text not null check (char_length(reason) <= 500),
  status      text not null default 'open' check (status in ('open','actioned','dismissed')),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- helper: is a profile visible to the current viewer (public + no block
-- in either direction). security definer so it can read blocks regardless
-- of the caller's own RLS view of that table.
-- ---------------------------------------------------------------------------
create or replace function vault_visible_to_viewer(owner uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles p
    where p.user_id = owner
      and p.vault_public = true
      and p.username is not null
  )
  and not exists (
    select 1 from blocks b
    where (b.blocker_id = owner and b.blocked_id = auth.uid())
       or (b.blocker_id = auth.uid() and b.blocked_id = owner)
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table profiles enable row level security;
alter table follows  enable row level security;
alter table blocks   enable row level security;
alter table likes    enable row level security;
alter table reports  enable row level security;

-- profiles: own row full access; public rows readable by any authed user.
create policy profiles_select on profiles for select using (
  user_id = auth.uid() or (vault_public = true and username is not null)
);
create policy profiles_insert on profiles for insert with check (user_id = auth.uid());
create policy profiles_update on profiles for update using (user_id = auth.uid());

-- assets: existing owner-only policies remain untouched. Additional read
-- access for OTHER people's public vaults goes through the view below, NOT
-- through a new policy on the raw table — the raw table stays owner-only,
-- which guarantees values/purchase data can never leak by accident.

-- Public-vault view: only non-hidden items of visible vaults, with value
-- columns nulled out when the owner hides values. The app reads THIS view
-- when showing someone else's collection.
create or replace view assets_public
with (security_invoker = false) as
select
  a.id, a.user_id, a.name, a.category, a.country, a.year, a.rarity,
  a.grade, a.coin_color, a.symbol_char, a.metal, a.image_url, a.photo_urls,
  a.created_at,
  case when p.hide_values then null else a.estimated_value_low  end as estimated_value_low,
  case when p.hide_values then null else a.estimated_value_high end as estimated_value_high,
  case when p.hide_values then null else a.manual_value         end as manual_value
from assets a
join profiles p on p.user_id = a.user_id
where a.is_hidden = false
  and vault_visible_to_viewer(a.user_id);

grant select on assets_public to authenticated;

-- follows: manage own edges; anyone can read counts of visible profiles.
create policy follows_select on follows for select using (
  follower_id = auth.uid() or followee_id = auth.uid()
  or vault_visible_to_viewer(followee_id)
);
create policy follows_insert on follows for insert with check (
  follower_id = auth.uid() and vault_visible_to_viewer(followee_id)
);
create policy follows_delete on follows for delete using (follower_id = auth.uid());

-- blocks: strictly own edges, both directions readable only by the blocker.
create policy blocks_select on blocks for select using (blocker_id = auth.uid());
create policy blocks_insert on blocks for insert with check (blocker_id = auth.uid());
create policy blocks_delete on blocks for delete using (blocker_id = auth.uid());

-- likes: like anything you can see; unlike your own; owners see likes on
-- their items, likers see their own likes, and likes on visible public
-- items are readable for counts.
create policy likes_select on likes for select using (
  user_id = auth.uid()
  or exists (select 1 from assets a where a.id = asset_id and a.user_id = auth.uid())
  or exists (select 1 from assets_public ap where ap.id = asset_id)
);
create policy likes_insert on likes for insert with check (
  user_id = auth.uid()
  and exists (select 1 from assets_public ap where ap.id = asset_id)
);
create policy likes_delete on likes for delete using (user_id = auth.uid());

-- reports: any authed user files; only service role reads/updates.
create policy reports_insert on reports for insert with check (reporter_id = auth.uid());

-- ---------------------------------------------------------------------------
-- avatars bucket (public read, per-user write path) — run once.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('avatars','avatars', true)
on conflict do nothing;

create policy avatars_insert on storage.objects for insert with check (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy avatars_update on storage.objects for update using (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy avatars_delete on storage.objects for delete using (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
);
