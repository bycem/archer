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
    if (before.status === 'rejected') {
      return ok({ participant: before });
    }

    const { data: updated, error: e1 } = await supabaseAdmin
      .from('tournament_participants')
      .update({ status: 'rejected' })
      .eq('id', participant_id)
      .select()
      .single();
    if (e1) throw new HttpError(500, e1.message);

    await supabaseAdmin.from('audit_log').insert({
      actor_id: ctx.userId,
      action: 'participant_reject',
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
