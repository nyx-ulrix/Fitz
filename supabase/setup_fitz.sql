-- Fitz — database schema (no seed data)
-- Project: Fitz (aparlrlekvlgturuoxyl)
-- Paste into Supabase SQL Editor, or run:
--   npx supabase link --project-ref aparlrlekvlgturuoxyl
--   npx supabase db query --linked -f supabase/setup_fitz.sql

-- ---------------------------------------------------------------------------
-- 1. App key-value store (auth profiles, user wardrobe, outfits, jams, cart)
--    Written by Edge Functions using the service role key.
-- ---------------------------------------------------------------------------
create table if not exists public.kv_store_09284421 (
  key text not null primary key,
  value jsonb not null
);

alter table public.kv_store_09284421 enable row level security;

grant select, insert, update, delete on table public.kv_store_09284421 to service_role;

-- ---------------------------------------------------------------------------
-- 2. AI outfit catalog (read by local API server for outfit / shop / wardrobe)
-- ---------------------------------------------------------------------------
create table if not exists public.wardrobe_items (
  id text primary key,
  user_id text not null default 'demo_user',
  name text not null,
  category text not null,
  color text,
  style text[],
  weather text[],
  formality text,
  image_url text not null,
  created_at timestamptz default now()
);

create table if not exists public.marketplace_items (
  id text primary key,
  name text not null,
  category text not null,
  color text,
  style text[],
  price numeric not null,
  image_url text not null,
  buy_url text not null,
  created_at timestamptz default now()
);

grant usage on schema public to anon, authenticated;
grant select on table public.wardrobe_items to anon, authenticated;
grant select on table public.marketplace_items to anon, authenticated;

alter table public.wardrobe_items enable row level security;
alter table public.marketplace_items enable row level security;

drop policy if exists "wardrobe items are readable" on public.wardrobe_items;
create policy "wardrobe items are readable"
  on public.wardrobe_items
  for select
  to anon, authenticated
  using (true);

drop policy if exists "marketplace items are readable" on public.marketplace_items;
create policy "marketplace items are readable"
  on public.marketplace_items
  for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- 3. Public Clothes storage bucket (upload garment images here later)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'Clothes',
  'Clothes',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read Clothes bucket" on storage.objects;
create policy "Public read Clothes bucket"
  on storage.objects
  for select
  to public
  using (bucket_id = 'Clothes');

drop policy if exists "Users upload own clothes" on storage.objects;
create policy "Users upload own clothes"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'Clothes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users update own clothes" on storage.objects;
create policy "Users update own clothes"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'Clothes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users delete own clothes" on storage.objects;
create policy "Users delete own clothes"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'Clothes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
