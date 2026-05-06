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
    if (!tournamentId) throw new HttpError(400, 'Missing tournament_id', 'BAD_REQUEST');

    const { data, error: e1 } = await supabaseAdmin
      .from('tournament_qr_tokens')
      .select('kind, token')
      .eq('tournament_id', tournamentId);
    if (e1) throw new HttpError(500, e1.message);

    const tokens: Record<'competitor' | 'spectator', string | null> = {
      competitor: null,
      spectator: null,
    };
    for (const row of data ?? []) {
      tokens[row.kind as 'competitor' | 'spectator'] = row.token;
    }

    return ok({ tokens });
  } catch (e) {
    return handleError(e);
  }
};
