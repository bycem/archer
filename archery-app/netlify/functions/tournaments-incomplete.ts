import type { Handler } from '@netlify/functions';
import { authenticate, requireAdmin } from './_shared/auth';
import { supabaseAdmin } from './_shared/supabase';
import { ok, handleError } from './_shared/response';
import { methodGuard } from './_shared/method';
import { HttpError } from './_shared/errors';

interface ParticipantRow {
  id: string;
  status: string;
  user: { id: string; name: string | null; surname: string | null } | null;
  sets: { set_number: number; is_committed: boolean }[];
}

export const handler: Handler = async (event) => {
  const guard = methodGuard(event, ['GET']);
  if (guard) return guard;

  try {
    const ctx = await authenticate(event);
    requireAdmin(ctx);

    const tournamentId = event.queryStringParameters?.tournament_id;
    if (!tournamentId) throw new HttpError(400, 'tournament_id required', 'VALIDATION_ERROR');

    const { data: tournament, error: tErr } = await supabaseAdmin
      .from('tournaments')
      .select('id, set_count')
      .eq('id', tournamentId)
      .single();
    if (tErr || !tournament) throw new HttpError(404, 'Tournament not found', 'NOT_FOUND');

    const { data, error } = await supabaseAdmin
      .from('tournament_participants')
      .select(
        'id, status, user:users(id,name,surname), sets(set_number,is_committed)',
      )
      .eq('tournament_id', tournamentId)
      .eq('status', 'approved');
    if (error) throw new HttpError(500, error.message);

    const rows = (data ?? []) as unknown as ParticipantRow[];
    const items = rows
      .map((p) => {
        const committed = new Set(
          p.sets.filter((s) => s.is_committed).map((s) => s.set_number),
        );
        const missing: number[] = [];
        for (let i = 1; i <= tournament.set_count; i++) {
          if (!committed.has(i)) missing.push(i);
        }
        return {
          participant_id: p.id,
          name: p.user?.name ?? '',
          surname: p.user?.surname ?? '',
          missing_sets: missing,
        };
      })
      .filter((p) => p.missing_sets.length > 0);

    return ok({ items, total_sets: tournament.set_count });
  } catch (e) {
    return handleError(e);
  }
};
