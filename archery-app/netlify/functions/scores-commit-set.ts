import type { Handler } from '@netlify/functions';
import { authenticate } from './_shared/auth';
import { supabaseAdmin } from './_shared/supabase';
import { ok, handleError } from './_shared/response';
import { methodGuard, parseJson } from './_shared/method';
import { HttpError } from './_shared/errors';
import { commitSetSchema } from './_shared/validation';

export const handler: Handler = async (event) => {
  const guard = methodGuard(event, ['POST']);
  if (guard) return guard;

  try {
    const ctx = await authenticate(event);
    const body = commitSetSchema.parse(parseJson(event));

    const { data: participant, error: pErr } = await supabaseAdmin
      .from('tournament_participants')
      .select('id, user_id, tournament_id, status, tournaments(arrows_per_set, set_count, status)')
      .eq('id', body.participant_id)
      .single();
    if (pErr || !participant) throw new HttpError(404, 'Participant not found', 'NOT_FOUND');

    const tournament = (participant as unknown as {
      tournaments: { arrows_per_set: number; set_count: number; status: string };
    }).tournaments;

    if (participant.user_id !== ctx.userId && ctx.role !== 'admin') {
      throw new HttpError(403, 'Forbidden', 'FORBIDDEN');
    }
    if (participant.status !== 'approved') {
      throw new HttpError(409, 'Participant not approved', 'NOT_APPROVED');
    }
    if (tournament.status !== 'active') {
      throw new HttpError(409, 'Tournament not active', 'TOURNAMENT_INACTIVE');
    }
    if (body.arrows.length !== tournament.arrows_per_set) {
      throw new HttpError(400, 'Wrong arrow count', 'BAD_ARROW_COUNT');
    }
    if (body.set_number > tournament.set_count) {
      throw new HttpError(400, 'Set number out of range', 'BAD_SET_NUMBER');
    }

    const numbers = body.arrows.map((a) => a.arrow_number);
    const expected = Array.from({ length: tournament.arrows_per_set }, (_, i) => i + 1);
    if (numbers.length !== new Set(numbers).size ||
        !expected.every((n) => numbers.includes(n))) {
      throw new HttpError(400, 'Arrow numbers must be 1..N unique', 'BAD_ARROW_NUMBERS');
    }

    const { data: set, error: sErr } = await supabaseAdmin
      .from('sets')
      .select('id, is_committed')
      .eq('participant_id', body.participant_id)
      .eq('set_number', body.set_number)
      .single();
    if (sErr || !set) throw new HttpError(404, 'Set not found', 'NOT_FOUND');
    if (set.is_committed) throw new HttpError(409, 'Set already committed', 'ALREADY_COMMITTED');

    const arrowRows = body.arrows.map((a) => ({
      set_id: set.id,
      arrow_number: a.arrow_number,
      score_value: a.score_value,
      is_x: a.is_x,
      hit_x: a.hit_x ?? null,
      hit_y: a.hit_y ?? null,
    }));

    const { error: aErr } = await supabaseAdmin.from('arrows').insert(arrowRows);
    if (aErr) throw new HttpError(500, aErr.message, 'INSERT_FAILED');

    const { data: updatedSet, error: uErr } = await supabaseAdmin
      .from('sets')
      .update({ is_committed: true, committed_at: new Date().toISOString() })
      .eq('id', set.id)
      .select('id, set_number, is_committed, committed_at')
      .single();
    if (uErr) {
      await supabaseAdmin.from('arrows').delete().eq('set_id', set.id);
      throw new HttpError(500, uErr.message, 'COMMIT_FAILED');
    }

    const nextSet = body.set_number < tournament.set_count ? body.set_number + 1 : null;

    return ok({ set: updatedSet, next_set: nextSet, total_sets: tournament.set_count });
  } catch (e) {
    return handleError(e);
  }
};
