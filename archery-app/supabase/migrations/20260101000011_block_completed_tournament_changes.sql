-- Task 18 — Block sets/arrows changes when tournament is completed.
-- Service role bypass kept so admin endpoints (Task 17) can still operate
-- where the API enforces its own rules.

create or replace function block_changes_on_completed_tournament()
returns trigger as $$
declare
  t_status public.tournament_status;
  jwt_role text;
  pid uuid;
begin
  jwt_role := current_setting('request.jwt.claims', true)::jsonb->>'role';
  if jwt_role = 'service_role' then
    return coalesce(new, old);
  end if;

  if tg_table_name = 'arrows' then
    select tp.tournament_id into pid
    from public.sets s
    join public.tournament_participants tp on tp.id = s.participant_id
    where s.id = coalesce(new.set_id, old.set_id);

    select status into t_status from public.tournaments where id = pid;
  elsif tg_table_name = 'sets' then
    select tp.tournament_id into pid
    from public.tournament_participants tp
    where tp.id = coalesce(new.participant_id, old.participant_id);

    select status into t_status from public.tournaments where id = pid;
  end if;

  if t_status = 'completed' then
    raise exception 'Tournament completed; modifications not allowed';
  end if;

  return coalesce(new, old);
end;
$$ language plpgsql;

drop trigger if exists block_completed_tournament_arrows on public.arrows;
create trigger block_completed_tournament_arrows
  before insert or update or delete on public.arrows
  for each row execute function block_changes_on_completed_tournament();

drop trigger if exists block_completed_tournament_sets on public.sets;
create trigger block_completed_tournament_sets
  before insert or update or delete on public.sets
  for each row execute function block_changes_on_completed_tournament();
