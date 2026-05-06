alter table public.users enable row level security;
alter table public.tournaments enable row level security;
alter table public.tournament_participants enable row level security;
alter table public.tournament_qr_tokens enable row level security;
alter table public.sets enable row level security;
alter table public.arrows enable row level security;

-- users
create policy users_self_select on public.users for select using (auth.uid() = id);
create policy users_self_update on public.users for update using (auth.uid() = id);
create policy users_self_insert on public.users for insert with check (auth.uid() = id);
create policy users_admin_select on public.users for select using (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
);

-- tournaments
create policy tournaments_public_select on public.tournaments for select using (true);
create policy tournaments_admin_all on public.tournaments for all using (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
);

-- tournament_participants
create policy participants_self_insert on public.tournament_participants for insert
  with check (auth.uid() = user_id and status = 'pending');
create policy participants_self_select on public.tournament_participants for select
  using (auth.uid() = user_id);
create policy participants_admin_all on public.tournament_participants for all using (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
);
create policy participants_public_approved on public.tournament_participants for select
  using (status = 'approved');

-- tournament_qr_tokens (admin only read/write; service_role bypasses RLS)
create policy qr_tokens_admin_all on public.tournament_qr_tokens for all using (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
);

-- sets
create policy sets_self_all on public.sets for all using (
  exists (
    select 1 from public.tournament_participants tp
    where tp.id = sets.participant_id and tp.user_id = auth.uid()
  )
);
create policy sets_public_select on public.sets for select using (true);
create policy sets_admin_all on public.sets for all using (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
);

-- arrows
create policy arrows_self_all on public.arrows for all using (
  exists (
    select 1
    from public.sets s
    join public.tournament_participants tp on tp.id = s.participant_id
    where s.id = arrows.set_id and tp.user_id = auth.uid()
  )
);
create policy arrows_public_select on public.arrows for select using (true);
create policy arrows_admin_all on public.arrows for all using (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
);
