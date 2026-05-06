import type { Handler } from '@netlify/functions';
import { authenticate } from './_shared/auth';
import { supabaseAdmin } from './_shared/supabase';
import { created, handleError } from './_shared/response';
import { methodGuard, parseJson } from './_shared/method';
import { participantJoinSchema } from './_shared/validation';
import { HttpError } from './_shared/errors';

export const handler: Handler = async (event) => {
  const guard = methodGuard(event, ['POST']);
  if (guard) return guard;

  try {
    const ctx = await authenticate(event);
    const body = participantJoinSchema.parse(parseJson(event));

    const { data: tokenRow } = await supabaseAdmin
      .from('tournament_qr_tokens')
      .select('tournament_id, kind')
      .eq('token', body.token)
      .single();
    if (!tokenRow) throw new HttpError(404, 'Invalid token', 'INVALID_TOKEN');
    if (tokenRow.kind !== 'competitor')
      throw new HttpError(403, 'Spectator token cannot join', 'FORBIDDEN');

    const { data: tournament } = await supabaseAdmin
      .from('tournaments')
      .select('status')
      .eq('id', tokenRow.tournament_id)
      .single();
    if (!tournament || tournament.status !== 'active')
      throw new HttpError(400, 'Tournament not active', 'TOURNAMENT_INACTIVE');

    const { data, error: e1 } = await supabaseAdmin
      .from('tournament_participants')
      .insert({
        tournament_id: tokenRow.tournament_id,
        user_id: ctx.userId,
        target_number: body.target_number,
        club_override: body.club_override,
        status: 'pending',
      })
      .select()
      .single();
    if (e1) {
      if (e1.code === '23505') throw new HttpError(409, 'Already joined or target taken', 'CONFLICT');
      throw new HttpError(500, e1.message);
    }

    return created({ participant: data });
  } catch (e) {
    return handleError(e);
  }
};
