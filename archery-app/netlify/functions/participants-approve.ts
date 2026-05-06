import type { Handler } from '@netlify/functions';
import { z } from 'zod';
import { authenticate, requireAdmin } from './_shared/auth';
import { supabaseAdmin } from './_shared/supabase';
import { ok, handleError } from './_shared/response';
import { methodGuard, parseJson } from './_shared/method';
import { HttpError } from './_shared/errors';

const schema = z.object({ participant_id: z.string().uuid() });

export const handler: Handler = async (event) => {
  const guard = methodGuard(event, ['POST']);
  if (guard) return guard;

  try {
    const ctx = await authenticate(event);
    requireAdmin(ctx);
    const { participant_id } = schema.parse(parseJson(event));

    const { data: before } = await supabaseAdmin
      .from('tournament_participants')
      .select('*')
      .eq('id', participant_id)
      .single();
    if (!before) throw new HttpError(404, 'Participant not found', 'NOT_FOUND');
    if (before.status === 'approved') {
      return ok({ participant: before });
    }

    const { data: tournament } = await supabaseAdmin
      .from('tournaments')
      .select('id, status, set_count')
      .eq('id', before.tournament_id)
      .single();
    if (!tournament) throw new HttpError(404, 'Tournament not found', 'NOT_FOUND');
    if (tournament.status !== 'active')
      throw new HttpError(400, 'Tournament not active', 'TOURNAMENT_INACTIVE');

    const { data: updated, error: e1 } = await supabaseAdmin
      .from('tournament_participants')
      .update({
        status: 'approved',
        approved_by: ctx.userId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', participant_id)
      .select()
      .single();
    if (e1) throw new HttpError(500, e1.message);

    const sets = Array.from({ length: tournament.set_count }, (_, i) => ({
      participant_id,
      set_number: i + 1,
    }));
    const { error: e2 } = await supabaseAdmin.from('sets').insert(sets);
    if (e2 && e2.code !== '23505') throw new HttpError(500, e2.message);

    await supabaseAdmin.from('audit_log').insert({
      actor_id: ctx.userId,
      action: 'participant_approve',
      entity_type: 'tournament_participants',
      entity_id: participant_id,
      before_data: before,
      after_data: updated,
    });

    return ok({ participant: updated });
  } catch (e) {
    return handleError(e);
  }
};
