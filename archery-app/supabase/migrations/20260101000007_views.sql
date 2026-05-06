create view public.tournament_scoreboard as
select
  tp.id as participant_id,
  tp.tournament_id,
  tp.target_number,
  u.id as user_id,
  u.name,
  u.surname,
  coalesce(tp.club_override, u.club) as club,
  u.gender,
  coalesce(sum(a.score_value), 0) as total,
  count(*) filter (where a.is_x) as x_count,
  count(*) filter (where a.score_value = 10 and not a.is_x) as ten_count,
  count(*) filter (where a.score_value = 9) as nine_count
from public.tournament_participants tp
join public.users u on u.id = tp.user_id
left join public.sets s on s.participant_id = tp.id
left join public.arrows a on a.set_id = s.id
where tp.status = 'approved'
group by tp.id, u.id;
