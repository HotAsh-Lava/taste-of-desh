-- =====================================================================
--  RAA TRADE INTERNATIONAL — Supabase schema
--  Run this once in Supabase Studio → SQL Editor → New query → Run.
-- =====================================================================
create extension if not exists pgcrypto;

-- ------------------------------------------------------------------
-- 1. Who is allowed to edit the site
-- ------------------------------------------------------------------
create table if not exists admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text,
  created_at timestamptz default now()
);

-- security definer avoids RLS recursion when policies read `admins`
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins a where a.user_id = auth.uid());
$$;

-- ------------------------------------------------------------------
-- 2. Content tables
-- ------------------------------------------------------------------

-- Free-form content blocks, keyed like 'home.hero', 'footer', 'who_we_are.intro'
create table if not exists content_blocks (
  key        text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- Top navigation (order + visibility editable from Dashboard)
create table if not exists nav_items (
  id         uuid primary key default gen_random_uuid(),
  label      text not null,
  path       text not null,
  sort_order int  default 0,
  is_visible boolean default true,
  variant    text default 'link'      -- 'link' | 'button'
);

-- The "Elementor-lite" layer: which sections appear on which page, in what order
create table if not exists page_sections (
  id           uuid primary key default gen_random_uuid(),
  page_slug    text not null,
  section_key  text not null,
  sort_order   int default 0,
  is_visible   boolean default true,
  settings     jsonb default '{}'::jsonb,
  unique (page_slug, section_key)
);

create table if not exists services (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  summary     text,
  description text,
  image_url   text,
  sort_order  int default 0,
  is_active   boolean default true
);

create table if not exists stats (
  id         uuid primary key default gen_random_uuid(),
  value      text not null,
  label      text not null,
  note       text,
  sort_order int default 0
);

create table if not exists process_steps (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  image_url   text,
  sort_order  int default 0
);

-- Supply-chain comparison: one row per lane, steps stored as JSON
-- steps: [{"label":"Factory pickup","days":1,"owner":"RTI"}, ...]
create table if not exists supply_chain_lanes (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  country      text,
  mode         text,
  variant      text default 'rti',        -- 'rti' | 'traditional'
  transport    text default 'sea',        -- 'sea' | 'air'
  transit_days int,
  steps        jsonb default '[]'::jsonb,
  note         text,
  sort_order   int default 0,
  is_active    boolean default true
);

create table if not exists team_members (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  position   text,
  message    text,
  photo_url  text,
  sort_order int default 0,
  is_active  boolean default true
);

-- Imports / Exports catalogue. parent_id gives you sub-categories.
create table if not exists categories (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text not null unique,
  trade_type      text not null default 'import',   -- 'import' | 'export'
  parent_id       uuid references categories(id) on delete cascade,
  cover_image_url text,
  cover_video_url text,
  description     text,
  sort_order      int default 0,
  is_active       boolean default true,
  show_on_home    boolean default true
);

create table if not exists products (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete cascade,
  name        text not null,
  image_url   text,
  description text,
  sort_order  int default 0,
  is_active   boolean default true
);

-- For "Computer Electronics / Home Appliances" — brands you deal with
create table if not exists brands (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete cascade,
  name        text not null,
  logo_url    text,
  sort_order  int default 0
);

create table if not exists posts (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  slug            text not null unique,
  excerpt         text,
  body            text,
  cover_image_url text,
  author          text,
  published_at    timestamptz default now(),
  is_published    boolean default false
);

create table if not exists videos (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  youtube_url text not null,
  description text,
  sort_order  int default 0
);

create table if not exists reviews (
  id          uuid primary key default gen_random_uuid(),
  author_name text not null,
  avatar_url  text,
  photo_url   text,
  product     text,
  rating      int default 5,
  body        text,
  source      text default 'facebook',
  reviewed_at date,
  is_visible  boolean default true,
  sort_order  int default 0
);

-- ------------------------------------------------------------------
-- 3. Inbound data (written by visitors)
-- ------------------------------------------------------------------
create table if not exists subscribers (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  created_at timestamptz default now()
);

create table if not exists contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text,
  phone      text,
  company    text,
  subject    text,
  message    text,
  is_read    boolean default false,
  created_at timestamptz default now()
);

create table if not exists analytics_events (
  id         bigserial primary key,
  event_type text not null,        -- 'page_view' | 'social_click' | 'cta_click'
  label      text,                 -- 'instagram' | 'facebook' | 'youtube' | path
  path       text,
  created_at timestamptz default now()
);
create index if not exists analytics_events_created_idx on analytics_events (created_at desc);
create index if not exists analytics_events_type_idx on analytics_events (event_type, label);

-- ------------------------------------------------------------------
-- 4. Row Level Security
-- ------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'content_blocks','nav_items','page_sections','services','stats','process_steps',
    'supply_chain_lanes','team_members','categories','products','brands','posts',
    'videos','reviews','subscribers','contact_messages','analytics_events','admins']
  loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- Public read for everything that renders on the site
do $$
declare t text;
begin
  foreach t in array array[
    'content_blocks','nav_items','page_sections','services','stats','process_steps',
    'supply_chain_lanes','team_members','categories','products','brands','videos']
  loop
    execute format('drop policy if exists "public read" on %I', t);
    execute format('create policy "public read" on %I for select using (true)', t);
    execute format('drop policy if exists "admin write" on %I', t);
    execute format('create policy "admin write" on %I for all using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

drop policy if exists "public read published" on posts;
create policy "public read published" on posts for select using (is_published = true or public.is_admin());
drop policy if exists "admin write" on posts;
create policy "admin write" on posts for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public read visible" on reviews;
create policy "public read visible" on reviews for select using (is_visible = true or public.is_admin());
drop policy if exists "admin write" on reviews;
create policy "admin write" on reviews for all using (public.is_admin()) with check (public.is_admin());

-- Visitors may submit, only admins may read
drop policy if exists "anyone subscribes" on subscribers;
create policy "anyone subscribes" on subscribers for insert with check (true);
drop policy if exists "admin reads subscribers" on subscribers;
create policy "admin reads subscribers" on subscribers for select using (public.is_admin());
drop policy if exists "admin deletes subscribers" on subscribers;
create policy "admin deletes subscribers" on subscribers for delete using (public.is_admin());

drop policy if exists "anyone contacts" on contact_messages;
create policy "anyone contacts" on contact_messages for insert with check (true);
drop policy if exists "admin manages messages" on contact_messages;
create policy "admin manages messages" on contact_messages for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "anyone logs event" on analytics_events;
create policy "anyone logs event" on analytics_events for insert with check (true);
drop policy if exists "admin reads events" on analytics_events;
create policy "admin reads events" on analytics_events for select using (public.is_admin());

drop policy if exists "admin reads admins" on admins;
create policy "admin reads admins" on admins for select using (public.is_admin());

-- ------------------------------------------------------------------
-- 5. Dashboard counters
-- ------------------------------------------------------------------
create or replace function public.analytics_summary(days int default 30)
returns table (event_type text, label text, total bigint)
language sql stable security definer set search_path = public as $$
  select e.event_type, coalesce(e.label,'-') as label, count(*)::bigint
  from analytics_events e
  where public.is_admin()
    and e.created_at > now() - (days || ' days')::interval
  group by 1,2
  order by 3 desc;
$$;

-- ------------------------------------------------------------------
-- 6. Storage bucket for images & the hero video
-- ------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('media','media', true)
on conflict (id) do nothing;

drop policy if exists "media public read" on storage.objects;
create policy "media public read" on storage.objects
  for select using (bucket_id = 'media');

drop policy if exists "media admin write" on storage.objects;
create policy "media admin write" on storage.objects
  for all using (bucket_id = 'media' and public.is_admin())
  with check (bucket_id = 'media' and public.is_admin());

-- ------------------------------------------------------------------
-- 7. Operations console: orders, payments, lots, customers, team …
--    (same as migrations/[Q-11]Operations console data.sql)
-- ------------------------------------------------------------------
create table if not exists ops_records (
  kind        text not null,
  id          text not null,
  data        jsonb not null,
  pos         double precision not null default 0,
  updated_at  timestamptz not null default now(),
  updated_by  text,
  primary key (kind, id)
);
create index if not exists ops_records_kind_pos on ops_records (kind, pos);
alter table ops_records enable row level security;
drop policy if exists "admins manage operations" on ops_records;
create policy "admins manage operations" on ops_records
  for all using (public.is_admin()) with check (public.is_admin());
do $$
begin
  alter publication supabase_realtime add table ops_records;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
