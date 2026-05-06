import type { Handler } from '@netlify/functions';
import { authenticate, requireAdmin } from './_shared/auth';
import { supabaseAdmin } from './_shared/supabase';
import { ok, handleError } from './_shared/response';
import { methodGuard } from './_shared/method';
import { HttpError } from './_shared/errors';

interface ArrowRow {
  id: string;
  arrow_number: number;
  score_value: number;
  is_x: boolean;
  hit_x: number | null;
  hit_y: number | null;
}

interface SetRow {
  id: string;
  set_number: number;
  is_committed: boolean;
  committed_at: string | null;
  arrows: ArrowRow[] | null;
}

export const handler: Handler = async (event) => {
  const guard = methodGuard(event, ['GET']);
  if (guard) return guard;

  try {
    const ctx = await authenticate(event);
    requireAdmin(ctx);

    const participantId = event.queryStringParameters?.participant_id;
    if (!participantId) throw new HttpError(400, 'Missing participant_id', 'BAD_REQUEST');

    const { data: participant, error: pErr } = await supabaseAdmin
      .from('tournament_participants')
      .select(
        'id, target_number, user_id, tournament_id, status, ' +
          'users(name, surname, club, gender), ' +
          'tournaments(id, name, target_type, set_count, arrows_per_set, status)',
      )
      .eq('id', participantId)
      .single();
    if (pErr || !participant) throw new HttpError(404, 'Participant not found', 'NOT_FOUND');

    const { data: sets, error: sErr } = await supabaseAdmin
      .from('sets')
      .select('id, set_number, is_committed, committed_at, arrows(id, arrow_number, score_value, is_x, hit_x, hit_y)')
      .eq('participant_id', participantId)
      .order('set_number', { ascending: true });
    if (sErr) throw new HttpError(500, sErr.message);

    const enriched = ((sets ?? []) as SetRow[]).map((s) => {
      const arrows = (s.arrows ?? []).slice().sort((a, b) => a.arrow_number - b.arrow_number);
      const total = arrows.reduce((sum, a) => sum + a.score_value, 0);
      return { ...s, arrows, total };
    });

    return ok({ participant, sets: enriched });
  } catch (e) {
    return handleError(e);
  }
};
