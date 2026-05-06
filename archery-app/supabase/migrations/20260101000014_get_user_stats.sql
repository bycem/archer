-- Aggregate stats for the profile dashboard.
create or replace function public.get_user_stats(
  p_user_id uuid,
  p_from date default null,
  p_to date default null,
  p_bow_type bow_type default null,
  p_target_type target_type default null
) returns jsonb language sql stable security definer set search_path = public as $$
  with arr as (
    select a.score_value, a.is_x, t.target_type, t.bow_type
    from public.arrows a
    join public.sets s on s.id = a.set_id and s.is_committed
    join public.tournament_participants tp on tp.id = s.participant_id
    join public.tournaments t on t.id = tp.tournament_id
    where tp.user_id = p_user_id
      and tp.status = 'approved'
      and (p_from is null or t.date >= p_from)
      and (p_to is null or t.date <= p_to)
      and (p_bow_type is null or t.bow_type = p_bow_type)
      and (p_target_type is null or t.target_type = p_target_type)
  )
  select jsonb_build_object(
    'total_arrows', count(*),
    'total_score', coalesce(sum(score_value), 0),
    'avg_per_arrow', coalesce(round(avg(score_value)::numeric, 2), 0),
    'x_count', count(*) filter (where is_x),
    'ten_count', count(*) filter (where score_value = 10 and not is_x),
    'nine_count', count(*) filter (where score_value = 9),
    'x_ratio', coalesce(round(
      (count(*) filter (where is_x))::numeric / nullif(count(*), 0) * 100, 1
    ), 0),
    'gold_ratio', coalesce(round(
      (count(*) filter (where score_value >= 9))::numeric / nullif(count(*), 0) * 100, 1
    ), 0),
    'red_ratio', coalesce(round(
      (count(*) filter (where score_value between 7 and 8))::numeric / nullif(count(*), 0) * 100, 1
    ), 0),
    'miss_count', count(*) filter (where score_value = 0),
    'by_bow', coalesce((
      select jsonb_object_agg(bow_type, c)
      from (select bow_type, count(*) c from arr group by bow_type) s
    ), '{}'::jsonb),
    'by_target', coalesce((
      select jsonb_object_agg(target_type, c)
      from (select target_type, count(*) c from arr group by target_type) s
    ), '{}'::jsonb)
  )
  from arr;
$$;

grant execute on function public.get_user_stats(uuid, date, date, bow_type, target_type) to authenticated, service_role;

-- Average score per set number, used for the "set performance" bar chart.
create or replace function public.get_user_set_stats(
  p_user_id uuid,
  p_from date default null,
  p_to date default null,
  p_bow_type bow_type default null,
  p_target_type target_type default null
) returns table(
  set_number int,
  avg_score numeric,
  total bigint,
  arrow_count bigint
) language sql stable security definer set search_path = public as $$
  select
    s.set_number,
    coalesce(round(avg(a.score_value)::numeric, 2), 0) as avg_score,
    coalesce(sum(a.score_value), 0)::bigint as total,
    count(a.id)::bigint as arrow_count
  from public.arrows a
  join public.sets s on s.id = a.set_id and s.is_committed
  join public.tournament_participants tp on tp.id = s.participant_id
  join public.tournaments t on t.id = tp.tournament_id
  where tp.user_id = p_user_id
    and tp.status = 'approved'
    and (p_from is null or t.date >= p_from)
    and (p_to is null or t.date <= p_to)
    and (p_bow_type is null or t.bow_type = p_bow_type)
    and (p_target_type is null or t.target_type = p_target_type)
  group by s.set_number
  order by s.set_number asc;
$$;

grant execute on function public.get_user_set_stats(uuid, date, date, bow_type, target_type) to authenticated, service_role;
