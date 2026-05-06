create type qr_kind as enum ('competitor','spectator');

create table public.tournament_qr_tokens (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  kind qr_kind not null,
  token text not null unique,
  created_at timestamptz not null default now(),
  unique (tournament_id, kind)
);
