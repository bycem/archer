-- updated_at auto-update
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger users_updated_at before update on public.users
  for each row execute function set_updated_at();
create trigger tournaments_updated_at before update on public.tournaments
  for each row execute function set_updated_at();
create trigger arrows_updated_at before update on public.arrows
  for each row execute function set_updated_at();

-- Lock arrows on committed sets
create or replace function prevent_committed_set_edit()
returns trigger as $$
declare
  committed boolean;
begin
  select is_committed into committed from public.sets where id = coalesce(new.set_id, old.set_id);
  if committed then
    raise exception 'Set committed; use admin override path';
  end if;
  return coalesce(new, old);
end;
$$ language plpgsql;

create trigger arrows_lock_check before insert or update or delete on public.arrows
  for each row execute function prevent_committed_set_edit();

-- Auto-create public.users row when auth.users is created
create or replace function public.handle_new_auth_user()
returns trigger as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
