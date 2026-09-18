-- TopDown RACE: Craftrace
-- RACE Control Online
-- Phase 1: base schema. Client access is intentionally not granted yet.

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nick text not null,
  continent_code text not null,
  country_code text not null,
  region_code text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profiles_nick_length
    check (char_length(trim(nick)) between 3 and 16),
  constraint profiles_continent_code
    check (continent_code ~ '^[A-Z]{2}$'),
  constraint profiles_country_code
    check (country_code ~ '^[A-Z]{2}$'),
  constraint profiles_region_code
    check (char_length(region_code) between 2 and 12)
);

create table public.track_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  track_id text not null,
  best_time_ms integer not null,
  car_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  primary key (user_id, track_id),

  constraint track_records_track_id
    check (char_length(trim(track_id)) between 1 and 80),
  constraint track_records_best_time
    check (best_time_ms > 0),
  constraint track_records_car_id
    check (car_id is null or char_length(trim(car_id)) between 1 and 80)
);

create index track_records_track_time_idx
  on public.track_records (track_id, best_time_ms);

create index profiles_continent_idx
  on public.profiles (continent_code);

create index profiles_country_idx
  on public.profiles (country_code);

create index profiles_region_idx
  on public.profiles (country_code, region_code);

alter table public.profiles enable row level security;
alter table public.track_records enable row level security;
