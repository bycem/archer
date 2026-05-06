import type { Handler } from '@netlify/functions';
import { authenticate } from './_shared/auth';
import { supabaseAdmin } from './_shared/supabase';
import { ok, handleError } from './_shared/response';
import { methodGuard } from './_shared/method';
import { HttpError } from './_shared/errors';

export const handler: Handler = async (event) => {
  const guard = methodGuard(event, ['GET']);
  if (guard) return guard;

  try {
    const ctx = await authenticate(event);
    const tournament_id = event.queryStringParameters?.tournament_id;
    if (!tournament_id) throw new HttpError(400, 'Missing tournament_id', 'BAD_REQUEST');

    const { data, error: e1 } = await supabaseAdmin
      .from('tournament_participants')
      .select('id, tournament_id, user_id, target_number, club_override, status, joined_at, approved_at')
      .eq('tournament_id', tournament_id)
      .eq('user_id', ctx.userId)
      .maybeSingle();
    if (e1) throw new HttpError(500, e1.message);

    return ok({ participant: data ?? null });
  } catch (e) {
    return handleError(e);
  }
};
