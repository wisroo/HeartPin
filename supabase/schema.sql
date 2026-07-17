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
  source_owner text not null
    constraint transfer_queue_source_owner_check check (source_owner in ('bara', 'nyong')),
  dest_owner text not null
    constraint transfer_queue_dest_owner_check check (dest_owner in ('bara', 'nyong')),
  tmp_path text,
  original_name text not null,
  original_size bigint,
  mime_type text,
  status text not null default 'uploaded'
    constraint transfer_queue_status_check check (status in ('uploaded', 'landed', 'deleted', 'failed')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transfer_queue_distinct_owners check (source_owner <> dest_owner)
);

alter table public.transfer_queue add column if not exists source_owner text;
alter table public.transfer_queue add column if not exists dest_owner text;
alter table public.transfer_queue add column if not exists original_name text;
alter table public.transfer_queue add column if not exists original_size bigint;
alter table public.transfer_queue add column if not exists mime_type text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'transfer_queue'
      and column_name = 'dest'
  ) then
    execute $migration$
      update public.transfer_queue
      set dest_owner = dest
      where dest_owner is null
        and dest in ('bara', 'nyong')
    $migration$;
  end if;
end;
$$;

update public.transfer_queue
set source_owner = case dest_owner
  when 'bara' then 'nyong'
  when 'nyong' then 'bara'
end
where source_owner is null;

update public.transfer_queue
set original_name = coalesce(
  nullif(regexp_replace(tmp_path, '^.*/', ''), ''),
  content_hash
)
where original_name is null;

update public.transfer_queue
set status = 'uploaded'
where status = 'queued';

alter table public.transfer_queue alter column source_owner set not null;
alter table public.transfer_queue alter column dest_owner set not null;
alter table public.transfer_queue alter column original_name set not null;
alter table public.transfer_queue alter column status set default 'uploaded';

alter table public.transfer_queue drop constraint if exists transfer_queue_source_owner_check;
alter table public.transfer_queue add constraint transfer_queue_source_owner_check
  check (source_owner in ('bara', 'nyong'));
alter table public.transfer_queue drop constraint if exists transfer_queue_dest_owner_check;
alter table public.transfer_queue add constraint transfer_queue_dest_owner_check
  check (dest_owner in ('bara', 'nyong'));
alter table public.transfer_queue drop constraint if exists transfer_queue_distinct_owners;
alter table public.transfer_queue add constraint transfer_queue_distinct_owners
  check (source_owner <> dest_owner);
alter table public.transfer_queue drop constraint if exists transfer_queue_status_check;
alter table public.transfer_queue add constraint transfer_queue_status_check
  check (status in ('uploaded', 'landed', 'deleted', 'failed'));
alter table public.transfer_queue drop column if exists dest;

create table if not exists public.test_uploads (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  upload_session_id text not null,
  owner text not null check (owner in ('bara', 'nyong')),
  storage_path text not null unique,
  original_name text not null,
  original_size bigint,
  mime_type text,
  taken_at timestamptz,
  lat double precision,
  lng double precision,
  source text,
  deleted_at timestamptz,
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

drop trigger if exists touch_test_uploads_updated_at on public.test_uploads;
create trigger touch_test_uploads_updated_at before update on public.test_uploads
for each row execute function public.touch_updated_at();

alter table public.trips enable row level security;
alter table public.days enable row level security;
alter table public.spots enable row level security;
alter table public.moments enable row level security;
alter table public.inbox_items enable row level security;
alter table public.photo_copies enable row level security;
alter table public.transfer_queue enable row level security;
alter table public.test_uploads enable row level security;

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
drop policy if exists "own test_uploads" on public.test_uploads;
create policy "own test_uploads" on public.test_uploads
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

drop policy if exists "authenticated read photos" on storage.objects;
create policy "authenticated read photos" on storage.objects
  for select to authenticated using (
    bucket_id = 'photos'
    and (
      (storage.foldername(name))[1] in ('display', 'thumb')
      or (
        (storage.foldername(name))[1] in ('test-originals', 'relay-originals')
        and (storage.foldername(name))[2] = (select auth.uid()::text)
      )
    )
  );
drop policy if exists "authenticated write photos" on storage.objects;
create policy "authenticated write photos" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'photos'
    and (
      (storage.foldername(name))[1] in ('display', 'thumb')
      or (
        (storage.foldername(name))[1] in ('test-originals', 'relay-originals')
        and (storage.foldername(name))[2] = (select auth.uid()::text)
      )
    )
  );
drop policy if exists "authenticated update photos" on storage.objects;
create policy "authenticated update photos" on storage.objects
  for update to authenticated using (
    bucket_id = 'photos'
    and (
      (storage.foldername(name))[1] in ('display', 'thumb')
      or (
        (storage.foldername(name))[1] in ('test-originals', 'relay-originals')
        and (storage.foldername(name))[2] = (select auth.uid()::text)
      )
    )
  ) with check (
    bucket_id = 'photos'
    and (
      (storage.foldername(name))[1] in ('display', 'thumb')
      or (
        (storage.foldername(name))[1] in ('test-originals', 'relay-originals')
        and (storage.foldername(name))[2] = (select auth.uid()::text)
      )
    )
  );
drop policy if exists "authenticated delete photos" on storage.objects;
create policy "authenticated delete photos" on storage.objects
  for delete to authenticated using (
    bucket_id = 'photos'
    and (
      (storage.foldername(name))[1] in ('test-originals', 'relay-originals')
      and (storage.foldername(name))[2] = (select auth.uid()::text)
    )
  );
