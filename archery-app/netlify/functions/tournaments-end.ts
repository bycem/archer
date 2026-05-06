import type { Handler } from '@netlify/functions';
import { authenticate, requireAdmin } from './_shared/auth';
import { supabaseAdmin } from './_shared/supabase';
import { ok, handleError } from './_shared/response';
import { methodGuard, parseJson } from './_shared/method';
import { HttpError } from './_shared/errors';
import { z } from 'zod';

const schema = z.object({ tournament_id: z.string().uuid() });

export const handler: Handler = async (event) => {
  const guard = methodGuard(event, ['POST']);
  if (guard) return guard;

  try {
    const ctx = await authenticate(event);
    requireAdmin(ctx);
    const { tournament_id } = schema.parse(parseJson(event));

    const { data: before } = await supabaseAdmin
      .from('tournaments')
      .select('*')
      .eq('id', tournament_id)
      .single();
    if (!before) throw new HttpError(404, 'Tournament not found', 'NOT_FOUND');

    const { data, error: e1 } = await supabaseAdmin
      .from('tournaments')
      .update({ status: 'completed', ended_at: new Date().toISOString() })
      .eq('id', tournament_id)
      .select()
      .single();
    if (e1) throw new HttpError(500, e1.message);

    await supabaseAdmin.from('audit_log').insert({
      actor_id: ctx.userId,
      action: 'tournament_end',
      entity_type: 'tournament',
      entity_id: tournament_id,
      before_data: before,
      after_data: data,
    });

    return ok({ tournament: data });
  } catch (e) {
    return handleError(e);
  }
};
