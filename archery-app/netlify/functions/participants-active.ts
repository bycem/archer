import type { Handler } from '@netlify/functions';
import { authenticate } from './_shared/auth';
import { supabaseAdmin } from './_shared/supabase';
import { ok, handleError } from './_shared/response';
import { methodGuard } from './_shared/method';

interface TournamentRow {
  id: string;
  name: string;
  date: string;
  bow_type: string;
  age_group: string;
  target_type: string;
  distance_meters: number;
  set_count: number;
  arrows_per_set: number;
  status: string;
}

interface ParticipationRow {
  id: string;
  tournament_id: string;
  status: string;
  target_number: string | null;
  club_override: string | null;
  tournaments: TournamentRow;
}

// Returns the current user's participations (approved or pending) in active tournaments.
export const handler: Handler = async (event) => {
  const guard = methodGuard(event, ['GET']);
  if (guard) return guard;

  try {
    const ctx = await authenticate(event);

    const { data, error: e } = await supabaseAdmin
      .from('tournament_participants')
      .select(
        'id, tournament_id, status, target_number, club_override, tournaments!inner(id,name,date,bow_type,age_group,target_type,distance_meters,set_count,arrows_per_set,status)',
      )
      .eq('user_id', ctx.userId)
      .in('status', ['approved', 'pending'])
      .eq('tournaments.status', 'active')
      .order('date', { ascending: false, foreignTable: 'tournaments' });

    if (e) throw e;

    const rows = (data ?? []) as unknown as ParticipationRow[];

    const items = rows.map((r) => ({
      participation_id: r.id,
      tournament_id: r.tournament_id,
      participation_status: r.status,
      target_number: r.target_number,
      club_override: r.club_override,
      tournament: r.tournaments,
    }));

    return ok({ items });
  } catch (e) {
    return handleError(e);
  }
};
