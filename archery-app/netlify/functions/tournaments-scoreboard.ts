import type { Handler } from '@netlify/functions';
import { supabaseAdmin } from './_shared/supabase';
import { ok, handleError } from './_shared/response';
import { methodGuard } from './_shared/method';
import { HttpError } from './_shared/errors';

interface ScoreboardRow {
  participant_id: string;
  tournament_id: string;
  target_number: string | null;
  user_id: string;
  name: string | null;
  surname: string | null;
  club: string | null;
  gender: string | null;
  total: number;
  x_count: number;
  ten_count: number;
  nine_count: number;
}

interface SetRow {
  id: string;
  participant_id: string;
  set_number: number;
  is_committed: boolean;
  arrows: { score_value: number }[] | null;
}

export const handler: Handler = async (event) => {
  const guard = methodGuard(event, ['GET']);
  if (guard) return guard;

  try {
    const id = event.queryStringParameters?.id;
    if (!id) throw new HttpError(400, 'Missing id', 'BAD_REQUEST');

    const { data: tournament, error: e0 } = await supabaseAdmin
      .from('tournaments')
      .select('*')
      .eq('id', id)
      .single();
    if (e0 || !tournament) throw new HttpError(404, 'Not found', 'NOT_FOUND');

    const { data: rows, error: e1 } = await supabaseAdmin
      .from('tournament_scoreboard')
      .select('*')
      .eq('tournament_id', id);
    if (e1) throw e1;

    const baseRows = (rows ?? []) as ScoreboardRow[];

    const setTotals: Record<string, Record<number, number>> = {};
    if (baseRows.length > 0) {
      const participantIds = baseRows.map((r) => r.participant_id);
      const { data: setRows, error: e2 } = await supabaseAdmin
        .from('sets')
        .select('id, participant_id, set_number, is_committed, arrows(score_value)')
        .in('participant_id', participantIds);
      if (e2) throw e2;

      for (const s of (setRows ?? []) as SetRow[]) {
        if (!s.is_committed) continue;
        const total = (s.arrows ?? []).reduce((sum, a) => sum + a.score_value, 0);
        setTotals[s.participant_id] ??= {};
        setTotals[s.participant_id][s.set_number] = total;
      }
    }

    const enriched = baseRows
      .map((r) => ({ ...r, set_totals: setTotals[r.participant_id] ?? {} }))
      .sort(
        (a, b) =>
          b.total - a.total ||
          b.x_count - a.x_count ||
          b.ten_count - a.ten_count ||
          b.nine_count - a.nine_count,
      )
      .map((r, i) => ({ ...r, rank: i + 1 }));

    return ok({ tournament, rows: enriched });
  } catch (e) {
    return handleError(e);
  }
};
