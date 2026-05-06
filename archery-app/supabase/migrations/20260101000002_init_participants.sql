create type participant_status as enum ('pending','approved','rejected');

create table public.tournament_participants (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id uuid not null references public.users(id),
  target_number text not null,
  club_override text,
  status participant_status not null default 'pending',
  approved_by uuid references public.users(id),
  approved_at timestamptz,
  joined_at timestamptz not null default now(),
  unique (tournament_id, user_id),
  unique (tournament_id, target_number)
);

create index participants_tournament_idx on public.tournament_participants(tournament_id);
create index participants_user_idx on public.tournament_participants(user_id);
create index participants_status_idx on public.tournament_participants(status);
