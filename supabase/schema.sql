-- HeartPin Phase 1 Supabase schema
-- Run this in the Supabase SQL editor for the couple-owned project.

create extension if not exists pgcrypto;

create table if not exists public.trips (
  id text primary key,
  region text not null check (region in ('domestic', 'intl')),
  title text not null,
  start_date date,
  date_label text,
  cover jsonb,
  tags text[] not null default '{}',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.days (
  id text primary key,
  trip_id text not null references public.trips(id) on delete cascade,
  label text not null,
  date_label text not null,
  date_value date,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.spots (
  id text primary key,
  day_id text not null references public.days(id) on delete cascade,
  name text not null,
  time text,
  lat double precision,
  lng double precision,
  mood text,
  guide text,
  reaction text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.moments (
  id text primary key default gen_random_uuid()::text,
  spot_id text not null references public.spots(id) on delete cascade,
  display_path text not null,
  thumb_path text not null,
  label text,
  ratio text,
  tint text,
  content_hash text not null,
  original_name text,
  original_size bigint,
  taken_at timestamptz,
  lat double precision,
  lng double precision,
  owner text not null check (owner in ('bara', 'nyong')),
  original_status text not null default 'kept'
    check (original_status in ('kept', 'discard_pending', 'discarded', 'lost')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (spot_id, content_hash)
);

create table if not exists public.inbox_items (
  id text primary key,
  kind text not null check (kind in ('unsorted', 'noloc', 'review')),
  date text,
  time text,
  taken_at timestamptz,
  lat double precision,
  lng double precision,
  display_path text not null,
  thumb_path text not null,
  label text,
  auto_label text,
  ratio text,
  tint text,
  blur boolean not null default false,
  content_hash text not null unique,
  original_name text,
  original_size bigint,
  owner text not null check (owner in ('bara', 'nyong')),
  original_status text not null default 'kept'
    check (original_status in ('kept', 'discard_pending', 'discarded', 'lost')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.photo_copies (
  id text primary key default gen_random_uuid()::text,
  content_hash text not null,
  owner text check (owner in ('bara', 'nyong')),
  location text not null,
  status text not null check (status in ('present', 'missing', 'queued', 'discard_pending', 'discarded')),
  path text,
  checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists photo_copies_unique_location
on public.photo_copies (content_hash, location, coalesce(owner, 'shared'));

create table if not exists public.transfer_queue (
  id text primary key default gen_random_uuid()::text,
  content_hash text not null,
  dest text not null,
  tmp_path text,
  status text not null default 'queued'
    check (status in ('queued', 'uploaded', 'landed', 'deleted', 'failed')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_trips_updated_at on public.trips;
create trigger touch_trips_updated_at before update on public.trips
for each row execute function public.touch_updated_at();

drop trigger if exists touch_days_updated_at on public.days;
create trigger touch_days_updated_at before update on public.days
for each row execute function public.touch_updated_at();

drop trigger if exists touch_spots_updated_at on public.spots;
create trigger touch_spots_updated_at before update on public.spots
for each row execute function public.touch_updated_at();

drop trigger if exists touch_moments_updated_at on public.moments;
create trigger touch_moments_updated_at before update on public.moments
for each row execute function public.touch_updated_at();

drop trigger if exists touch_inbox_items_updated_at on public.inbox_items;
create trigger touch_inbox_items_updated_at before update on public.inbox_items
for each row execute function public.touch_updated_at();

drop trigger if exists touch_photo_copies_updated_at on public.photo_copies;
create trigger touch_photo_copies_updated_at before update on public.photo_copies
for each row execute function public.touch_updated_at();

drop trigger if exists touch_transfer_queue_updated_at on public.transfer_queue;
create trigger touch_transfer_queue_updated_at before update on public.transfer_queue
for each row execute function public.touch_updated_at();

alter table public.trips enable row level security;
alter table public.days enable row level security;
alter table public.spots enable row level security;
alter table public.moments enable row level security;
alter table public.inbox_items enable row level security;
alter table public.photo_copies enable row level security;
alter table public.transfer_queue enable row level security;

drop policy if exists "authenticated trips" on public.trips;
create policy "authenticated trips" on public.trips
  for all to authenticated using (true) with check (true);
drop policy if exists "authenticated days" on public.days;
create policy "authenticated days" on public.days
  for all to authenticated using (true) with check (true);
drop policy if exists "authenticated spots" on public.spots;
create policy "authenticated spots" on public.spots
  for all to authenticated using (true) with check (true);
drop policy if exists "authenticated moments" on public.moments;
create policy "authenticated moments" on public.moments
  for all to authenticated using (true) with check (true);
drop policy if exists "authenticated inbox_items" on public.inbox_items;
create policy "authenticated inbox_items" on public.inbox_items
  for all to authenticated using (true) with check (true);
drop policy if exists "authenticated photo_copies" on public.photo_copies;
create policy "authenticated photo_copies" on public.photo_copies
  for all to authenticated using (true) with check (true);
drop policy if exists "authenticated transfer_queue" on public.transfer_queue;
create policy "authenticated transfer_queue" on public.transfer_queue
  for all to authenticated using (true) with check (true);

insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

drop policy if exists "authenticated read photos" on storage.objects;
create policy "authenticated read photos" on storage.objects
  for select to authenticated using (bucket_id = 'photos');
drop policy if exists "authenticated write photos" on storage.objects;
create policy "authenticated write photos" on storage.objects
  for insert to authenticated with check (bucket_id = 'photos');
drop policy if exists "authenticated update photos" on storage.objects;
create policy "authenticated update photos" on storage.objects
  for update to authenticated using (bucket_id = 'photos') with check (bucket_id = 'photos');
drop policy if exists "authenticated delete photos" on storage.objects;
create policy "authenticated delete photos" on storage.objects
  for delete to authenticated using (bucket_id = 'photos');
