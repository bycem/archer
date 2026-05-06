create or replace function public.get_user_progress(
  p_user_id uuid,
  p_from date default null,
  p_to date default null,
  p_bow_type bow_type default null,
  p_target_type target_type default null,
  p_distance int default null
) returns table(
  tournament_id uuid,
  tournament_name text,
  date date,
  total bigint,
  x_count bigint,
  ten_count bigint,
  nine_count bigint,
  arrow_count bigint,
  avg_per_arrow numeric,
  target_type target_type,
  bow_type bow_type,
  distance_meters int
) language sql stable security definer set search_path = public as $$
  select
    t.id as tournament_id,
    t.name as tournament_name,
    t.date,
    coalesce(sum(a.score_value), 0)::bigint as total,
    coalesce(count(*) filter (where a.is_x), 0)::bigint as x_count,
    coalesce(count(*) filter (where a.score_value = 10 and not a.is_x), 0)::bigint as ten_count,
    coalesce(count(*) filter (where a.score_value = 9), 0)::bigint as nine_count,
    coalesce(count(a.id), 0)::bigint as arrow_count,
    coalesce(avg(a.score_value), 0)::numeric(5,2) as avg_per_arrow,
    t.target_type,
    t.bow_type,
    t.distance_meters
  from public.tournaments t
  join public.tournament_participants tp on tp.tournament_id = t.id
  left join public.sets s on s.participant_id = tp.id and s.is_committed
  left join public.arrows a on a.set_id = s.id
  where tp.user_id = p_user_id
    and tp.status = 'approved'
    and (p_from is null or t.date >= p_from)
    and (p_to is null or t.date <= p_to)
    and (p_bow_type is null or t.bow_type = p_bow_type)
    and (p_target_type is null or t.target_type = p_target_type)
    and (p_distance is null or t.distance_meters = p_distance)
  group by t.id
  order by t.date asc, t.created_at asc;
$$;

grant execute on function public.get_user_progress(uuid, date, date, bow_type, target_type, int) to authenticated, service_role;
