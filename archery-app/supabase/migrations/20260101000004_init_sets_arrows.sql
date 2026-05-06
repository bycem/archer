create table public.sets (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.tournament_participants(id) on delete cascade,
  set_number int not null check (set_number > 0),
  is_committed boolean not null default false,
  committed_at timestamptz,
  unique (participant_id, set_number)
);

create table public.arrows (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.sets(id) on delete cascade,
  arrow_number int not null check (arrow_number > 0),
  score_value int not null check (score_value between 0 and 11),
  is_x boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (set_id, arrow_number)
);

create index arrows_set_idx on public.arrows(set_id);
