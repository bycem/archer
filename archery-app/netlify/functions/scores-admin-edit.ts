import type { Handler } from '@netlify/functions';
import { z } from 'zod';
import { authenticate, requireAdmin } from './_shared/auth';
import { supabaseAdmin } from './_shared/supabase';
import { ok, handleError } from './_shared/response';
import { methodGuard, parseJson } from './_shared/method';
import { HttpError } from './_shared/errors';

const schema = z.object({
  arrow_id: z.string().uuid(),
  score_value: z.number().int().min(0).max(11),
  is_x: z.boolean(),
  hit_x: z.number().min(-1.5).max(1.5).nullable().optional(),
  hit_y: z.number().min(-1.5).max(1.5).nullable().optional(),
  reason: z.string().min(3).max(500),
});

export const handler: Handler = async (event) => {
  const guard = methodGuard(event, ['POST']);
  if (guard) return guard;

  try {
    const ctx = await authenticate(event);
    requireAdmin(ctx);
    const body = schema.parse(parseJson(event));

    if (body.is_x && body.score_value < 10) {
      throw new HttpError(400, 'is_x requires score_value >= 10', 'BAD_REQUEST');
    }

    const { data: before, error: e0 } = await supabaseAdmin
      .from('arrows')
      .select('*, sets!inner(participant_id, tournament_participants!inner(tournament_id, tournaments!inner(status)))')
      .eq('id', body.arrow_id)
      .single();
    if (e0 || !before) throw new HttpError(404, 'Arrow not found', 'NOT_FOUND');

    const tournamentStatus = (before as unknown as {
      sets: { tournament_participants: { tournaments: { status: string } } };
    }).sets.tournament_participants.tournaments.status;
    if (tournamentStatus === 'cancelled') {
      throw new HttpError(409, 'Tournament cancelled', 'TOURNAMENT_CANCELLED');
    }

    const update: Record<string, unknown> = {
      score_value: body.score_value,
      is_x: body.is_x,
    };
    if (body.hit_x !== undefined) update.hit_x = body.hit_x;
    if (body.hit_y !== undefined) update.hit_y = body.hit_y;

    const { data: after, error: e1 } = await supabaseAdmin
      .from('arrows')
      .update(update)
      .eq('id', body.arrow_id)
      .select()
      .single();
    if (e1) throw new HttpError(500, e1.message);

    await supabaseAdmin.from('audit_log').insert({
      actor_id: ctx.userId,
      action: 'score_correction',
      entity_type: 'arrows',
      entity_id: body.arrow_id,
      before_data: before,
      after_data: { ...after, reason: body.reason },
    });

    return ok({ arrow: after });
  } catch (e) {
    return handleError(e);
  }
};
