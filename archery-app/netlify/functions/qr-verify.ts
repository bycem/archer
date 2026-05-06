import type { Handler } from '@netlify/functions';
import { supabaseAdmin } from './_shared/supabase';
import { ok, handleError } from './_shared/response';
import { methodGuard } from './_shared/method';
import { HttpError } from './_shared/errors';

export const handler: Handler = async (event) => {
  const guard = methodGuard(event, ['GET']);
  if (guard) return guard;

  try {
    const token = event.queryStringParameters?.token;
    const kind = event.queryStringParameters?.kind;
    if (!token) throw new HttpError(400, 'Missing token', 'BAD_REQUEST');
    if (kind && kind !== 'competitor' && kind !== 'spectator') {
      throw new HttpError(400, 'Invalid kind', 'BAD_REQUEST');
    }

    const { data, error: e1 } = await supabaseAdmin
      .from('tournament_qr_tokens')
      .select('tournament_id, kind, tournaments(id, name, date, status, bow_type, age_group, target_type, distance_meters)')
      .eq('token', token)
      .maybeSingle();

    if (e1) throw new HttpError(500, e1.message);
    if (!data) throw new HttpError(404, 'Invalid token', 'NOT_FOUND');
    if (kind && data.kind !== kind) throw new HttpError(404, 'Invalid token', 'NOT_FOUND');

    return ok({ kind: data.kind, tournament: data.tournaments });
  } catch (e) {
    return handleError(e);
  }
};
