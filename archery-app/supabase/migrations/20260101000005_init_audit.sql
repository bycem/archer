create table public.audit_log (
  id bigserial primary key,
  actor_id uuid not null references public.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index audit_actor_idx on public.audit_log(actor_id);
create index audit_entity_idx on public.audit_log(entity_type, entity_id);
