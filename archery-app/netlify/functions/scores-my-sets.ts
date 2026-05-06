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

    const { data: participant, error: pErr } = await supabaseAdmin
      .from('tournament_participants')
      .select('id, status')
      .eq('tournament_id', tournament_id)
      .eq('user_id', ctx.userId)
      .maybeSingle();
    if (pErr) throw new HttpError(500, pErr.message);
    if (!participant) return ok({ participant: null, sets: [] });

    const { data: sets, error: sErr } = await supabaseAdmin
      .from('sets')
      .select('id, set_number, is_committed, committed_at, arrows(arrow_number, score_value, is_x, hit_x, hit_y)')
      .eq('participant_id', participant.id)
      .order('set_number', { ascending: true });
    if (sErr) throw new HttpError(500, sErr.message);

    return ok({ participant, sets: sets ?? [] });
  } catch (e) {
    return handleError(e);
  }
};
