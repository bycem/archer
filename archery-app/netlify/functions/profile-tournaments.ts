import type { Handler } from '@netlify/functions';
import { authenticate } from './_shared/auth';
import { supabaseAdmin } from './_shared/supabase';
import { ok, handleError } from './_shared/response';
import { methodGuard } from './_shared/method';

interface ScoreboardRow {
  participant_id: string;
  user_id: string;
  total: number;
  x_count: number;
  ten_count: number;
  nine_count: number;
}

export const handler: Handler = async (event) => {
  const guard = methodGuard(event, ['GET']);
  if (guard) return guard;

  try {
    const ctx = await authenticate(event);
    const params = event.queryStringParameters || {};
    const dateFrom = params.from?.trim() || null;
    const dateTo = params.to?.trim() || null;
    const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
    const pageSize = Math.min(50, parseInt(params.pageSize ?? '10', 10) || 10);
    const rangeFrom = (page - 1) * pageSize;
    const rangeTo = rangeFrom + pageSize - 1;

    // 1. Find approved participations for this user (paginated by tournament date desc).
    let q = supabaseAdmin
      .from('tournament_participants')
      .select('id, tournament_id, joined_at, tournaments!inner(*)', { count: 'exact' })
      .eq('user_id', ctx.userId)
      .eq('status', 'approved');

    if (dateFrom) q = q.gte('tournaments.date', dateFrom);
    if (dateTo) q = q.lte('tournaments.date', dateTo);

    q = q
      .order('date', { ascending: false, foreignTable: 'tournaments' })
      .range(rangeFrom, rangeTo);

    const { data: parts, error: e1, count } = await q;
    if (e1) throw e1;

    const participations = (parts ?? []) as Array<{
      id: string;
      tournament_id: string;
      joined_at: string;
      tournaments: Record<string, unknown>;
    }>;

    if (participations.length === 0) {
      return ok({ rows: [], page, pageSize, total: count ?? 0 });
    }

    // 2. Pull scoreboard rows for those tournaments to compute rank.
    const tournamentIds = Array.from(new Set(participations.map((p) => p.tournament_id)));
    const { data: sbRows, error: e2 } = await supabaseAdmin
      .from('tournament_scoreboard')
      .select('participant_id, user_id, total, x_count, ten_count, nine_count, tournament_id')
      .in('tournament_id', tournamentIds);
    if (e2) throw e2;

    const byTournament = new Map<string, (ScoreboardRow & { tournament_id: string })[]>();
    for (const r of (sbRows ?? []) as (ScoreboardRow & { tournament_id: string })[]) {
      const arr = byTournament.get(r.tournament_id) ?? [];
      arr.push(r);
      byTournament.set(r.tournament_id, arr);
    }

    for (const arr of byTournament.values()) {
      arr.sort(
        (a, b) =>
          b.total - a.total ||
          b.x_count - a.x_count ||
          b.ten_count - a.ten_count ||
          b.nine_count - a.nine_count,
      );
    }

    const rows = participations.map((p) => {
      const arr = byTournament.get(p.tournament_id) ?? [];
      const idx = arr.findIndex((r) => r.participant_id === p.id);
      const me = idx >= 0 ? arr[idx] : null;
      return {
        participant_id: p.id,
        tournament_id: p.tournament_id,
        tournament: p.tournaments,
        rank: idx >= 0 ? idx + 1 : null,
        participant_count: arr.length,
        total: me?.total ?? 0,
        x_count: me?.x_count ?? 0,
        ten_count: me?.ten_count ?? 0,
        nine_count: me?.nine_count ?? 0,
      };
    });

    return ok({ rows, page, pageSize, total: count ?? 0 });
  } catch (e) {
    return handleError(e);
  }
};
