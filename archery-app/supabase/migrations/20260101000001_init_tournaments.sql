create type tournament_status as enum ('draft','active','completed','cancelled');
create type age_group as enum ('U11','U13','U15','U18','U21','seniors');
create type bow_type as enum ('recurve','compound','barebow','traditional_turkish');
create type target_type as enum (
  'wa_122','wa_80','wa_60','wa_40','three_d','puta','meydan'
);

create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  date date not null,
  bow_type bow_type not null,
  age_group age_group not null,
  set_count int not null check (set_count between 3 and 30),
  arrows_per_set int not null check (arrows_per_set in (3,4,5,6)),
  target_type target_type not null,
  distance_meters numeric(5,1) not null check (distance_meters > 0),
  status tournament_status not null default 'active',
  created_by uuid not null references public.users(id),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tournaments_status_idx on public.tournaments(status);
create index tournaments_created_by_idx on public.tournaments(created_by);
create index tournaments_date_idx on public.tournaments(date desc);
