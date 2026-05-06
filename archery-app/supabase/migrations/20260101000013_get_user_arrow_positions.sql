create or replace function public.get_user_arrow_positions(
  p_user_id uuid,
  p_from date default null,
  p_to date default null,
  p_bow_type bow_type default null,
  p_target_type target_type default null
) returns table(
  hit_x numeric,
  hit_y numeric,
  score_value int,
  is_x boolean,
  tournament_id uuid,
  target_type target_type,
  bow_type bow_type,
  date date
) language sql stable security definer set search_path = public as $$
  select
    a.hit_x,
    a.hit_y,
    a.score_value,
    a.is_x,
    t.id as tournament_id,
    t.target_type,
    t.bow_type,
    t.date
  from public.arrows a
  join public.sets s on s.id = a.set_id and s.is_committed
  join public.tournament_participants tp on tp.id = s.participant_id
  join public.tournaments t on t.id = tp.tournament_id
  where tp.user_id = p_user_id
    and tp.status = 'approved'
    and a.hit_x is not null
    and a.hit_y is not null
    and (p_from is null or t.date >= p_from)
    and (p_to is null or t.date <= p_to)
    and (p_bow_type is null or t.bow_type = p_bow_type)
    and (p_target_type is null or t.target_type = p_target_type)
  order by t.date desc, a.id desc
  limit 5000;
$$;

grant execute on function public.get_user_arrow_positions(uuid, date, date, bow_type, target_type) to authenticated, service_role;
