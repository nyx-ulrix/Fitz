-- See supabase/setup_fitz.sql for the full idempotent schema.
-- This migration mirrors the core catalog tables.

create table if not exists public.kv_store_09284421 (
  key text not null primary key,
  value jsonb not null
);

alter table public.kv_store_09284421 enable row level security;
grant select, insert, update, delete on table public.kv_store_09284421 to service_role;

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
on public.wardrobe_items for select to anon, authenticated using (true);

drop policy if exists "marketplace items are readable" on public.marketplace_items;
create policy "marketplace items are readable"
on public.marketplace_items for select to anon, authenticated using (true);
