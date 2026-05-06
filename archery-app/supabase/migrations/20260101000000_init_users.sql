-- Users profile table linked 1:1 with auth.users
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text,
  surname text,
  age int check (age > 0 and age < 120),
  gender text check (gender in ('male','female','other')),
  club text,
  bow_type text check (bow_type in ('recurve','compound','barebow','traditional_turkish')),
  language text not null default 'tr' check (language in ('tr','en')),
  role text not null default 'competitor' check (role in ('admin','competitor')),
  profile_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index users_role_idx on public.users(role);
