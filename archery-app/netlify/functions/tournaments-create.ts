import type { Handler } from '@netlify/functions';
import { nanoid } from 'nanoid';
import { authenticate, requireAdmin } from './_shared/auth';
import { supabaseAdmin } from './_shared/supabase';
import { created, handleError } from './_shared/response';
import { methodGuard, parseJson } from './_shared/method';
import { tournamentCreateSchema } from './_shared/validation';
import { HttpError } from './_shared/errors';

export const handler: Handler = async (event) => {
  const guard = methodGuard(event, ['POST']);
  if (guard) return guard;

  try {
    const ctx = await authenticate(event);
    requireAdmin(ctx);
    const body = tournamentCreateSchema.parse(parseJson(event));

    const { data: tournament, error: e1 } = await supabaseAdmin
      .from('tournaments')
      .insert({ ...body, created_by: ctx.userId })
      .select()
      .single();
    if (e1 || !tournament) throw new HttpError(500, e1?.message ?? 'Insert failed');

    const { error: e2 } = await supabaseAdmin.from('tournament_qr_tokens').insert([
      { tournament_id: tournament.id, kind: 'competitor', token: nanoid(32) },
      { tournament_id: tournament.id, kind: 'spectator', token: nanoid(32) },
    ]);
    if (e2) throw new HttpError(500, e2.message);

    return created({ tournament });
  } catch (e) {
    return handleError(e);
  }
};
