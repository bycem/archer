import type { Handler } from '@netlify/functions';
import { authenticate } from './_shared/auth';
import { supabaseAdmin } from './_shared/supabase';
import { ok, handleError } from './_shared/response';
import { methodGuard } from './_shared/method';

const BOW_TYPES = new Set(['recurve', 'compound', 'barebow', 'traditional_turkish']);
const TARGET_TYPES = new Set([
  'wa_122',
  'wa_80',
  'wa_60',
  'wa_40',
  'three_d',
  'puta',
  'meydan',
]);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

interface Stats {
  total_arrows: number;
  total_score: number;
  avg_per_arrow: number;
  x_count: number;
  ten_count: number;
  nine_count: number;
  x_ratio: number;
  gold_ratio: number;
  red_ratio: number;
  miss_count: number;
  by_bow: Record<string, number>;
  by_target: Record<string, number>;
}

interface SetStatRow {
  set_number: number;
  avg_score: number | string;
  total: number | string;
  arrow_count: number | string;
}

const EMPTY_STATS: Stats = {
  total_arrows: 0,
  total_score: 0,
  avg_per_arrow: 0,
  x_count: 0,
  ten_count: 0,
  nine_count: 0,
  x_ratio: 0,
  gold_ratio: 0,
  red_ratio: 0,
  miss_count: 0,
  by_bow: {},
  by_target: {},
};

export const handler: Handler = async (event) => {
  const guard = methodGuard(event, ['GET']);
  if (guard) return guard;

  try {
    const ctx = await authenticate(event);
    const params = event.queryStringParameters || {};

    const from = params.from?.trim() || null;
    const to = params.to?.trim() || null;
    const bowRaw = params.bow_type?.trim() || null;
    const targetRaw = params.target_type?.trim() || null;

    if (from && !ISO_DATE.test(from)) {
      return ok({ stats: EMPTY_STATS, set_stats: [] });
    }
    if (to && !ISO_DATE.test(to)) {
      return ok({ stats: EMPTY_STATS, set_stats: [] });
    }

    const bow = bowRaw && BOW_TYPES.has(bowRaw) ? bowRaw : null;
    const target = targetRaw && TARGET_TYPES.has(targetRaw) ? targetRaw : null;

    const rpcArgs = {
      p_user_id: ctx.userId,
      p_from: from,
      p_to: to,
      p_bow_type: bow,
      p_target_type: target,
    };

    const [statsRes, setRes] = await Promise.all([
      supabaseAdmin.rpc('get_user_stats', rpcArgs),
      supabaseAdmin.rpc('get_user_set_stats', rpcArgs),
    ]);

    if (statsRes.error) throw statsRes.error;
    if (setRes.error) throw setRes.error;

    const raw = (statsRes.data as Partial<Stats> | null) ?? {};
    const stats: Stats = {
      total_arrows: Number(raw.total_arrows) || 0,
      total_score: Number(raw.total_score) || 0,
      avg_per_arrow: Number(raw.avg_per_arrow) || 0,
      x_count: Number(raw.x_count) || 0,
      ten_count: Number(raw.ten_count) || 0,
      nine_count: Number(raw.nine_count) || 0,
      x_ratio: Number(raw.x_ratio) || 0,
      gold_ratio: Number(raw.gold_ratio) || 0,
      red_ratio: Number(raw.red_ratio) || 0,
      miss_count: Number(raw.miss_count) || 0,
      by_bow: (raw.by_bow as Record<string, number> | null) ?? {},
      by_target: (raw.by_target as Record<string, number> | null) ?? {},
    };

    const set_stats = ((setRes.data ?? []) as SetStatRow[]).map((r) => ({
      set_number: Number(r.set_number) || 0,
      avg_score: Number(r.avg_score) || 0,
      total: Number(r.total) || 0,
      arrow_count: Number(r.arrow_count) || 0,
    }));

    return ok({ stats, set_stats });
  } catch (e) {
    return handleError(e);
  }
};
