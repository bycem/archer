-- Task 17 — Service role bypass for committed-set edit lock
-- Allows admin API (uses service_role key) to override committed arrow edits.
create or replace function prevent_committed_set_edit()
returns trigger as $$
declare
  committed boolean;
  jwt_role text;
begin
  jwt_role := current_setting('request.jwt.claims', true)::jsonb->>'role';
  if jwt_role = 'service_role' then
    return coalesce(new, old);
  end if;

  select is_committed into committed
  from public.sets
  where id = coalesce(new.set_id, old.set_id);

  if committed then
    raise exception 'Set committed; use admin override path';
  end if;
  return coalesce(new, old);
end;
$$ language plpgsql;
