import type { Handler } from '@netlify/functions';
import { authenticate, requireAdmin } from './_shared/auth';
import { supabaseAdmin } from './_shared/supabase';
import { ok, handleError } from './_shared/response';
import { methodGuard } from './_shared/method';
import { HttpError } from './_shared/errors';

export const handler: Handler = async (event) => {
  const guard = methodGuard(event, ['GET']);
  if (guard) return guard;

  try {
    const ctx = await authenticate(event);
    requireAdmin(ctx);

    const tournamentId = event.queryStringParameters?.tournament_id;
    if (!tournamentId) throw new HttpError(400, 'tournament_id required', 'VALIDATION_ERROR');

    const { data, error: e1 } = await supabaseAdmin
      .from('tournament_participants')
      .select(
        'id, tournament_id, target_number, club_override, status, joined_at, user:users(id,name,surname,gender,club,age,bow_type)',
      )
      .eq('tournament_id', tournamentId)
      .eq('status', 'pending')
      .order('joined_at', { ascending: true });
    if (e1) throw new HttpError(500, e1.message);

    return ok({ items: data ?? [] });
  } catch (e) {
    return handleError(e);
  }
};
