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

export const handler: Handler = async (event) => {
  const guard = methodGuard(event, ['GET']);
  if (guard) return guard;

  try {
    const ctx = await authenticate(event);
    const params = event.queryStringParameters || {};

    const from = params.from?.trim() || null;
    const to = params.to?.trim() || null;
    const bow = params.bow_type?.trim() || null;
    const target = params.target_type?.trim() || null;
    const distRaw = params.distance?.trim() || '';

    if (from && !ISO_DATE.test(from)) {
      return ok({ rows: [] });
    }
    if (to && !ISO_DATE.test(to)) {
      return ok({ rows: [] });
    }

    const { data, error: rpcError } = await supabaseAdmin.rpc('get_user_progress', {
      p_user_id: ctx.userId,
      p_from: from,
      p_to: to,
      p_bow_type: bow && BOW_TYPES.has(bow) ? bow : null,
      p_target_type: target && TARGET_TYPES.has(target) ? target : null,
      p_distance: distRaw ? Number.parseInt(distRaw, 10) || null : null,
    });
    if (rpcError) throw rpcError;

    type Row = {
      tournament_id: string;
      tournament_name: string;
      date: string;
      total: number;
      x_count: number;
      ten_count: number;
      nine_count: number;
      arrow_count: number;
      avg_per_arrow: number;
      target_type: string;
      bow_type: string;
      distance_meters: number;
    };

    const rows = ((data ?? []) as Row[]).map((r) => {
      const arrows = Number(r.arrow_count) || 0;
      const x = Number(r.x_count) || 0;
      const ten = Number(r.ten_count) || 0;
      const nine = Number(r.nine_count) || 0;
      return {
        ...r,
        total: Number(r.total) || 0,
        x_count: x,
        ten_count: ten,
        nine_count: nine,
        arrow_count: arrows,
        avg_per_arrow: Number(r.avg_per_arrow) || 0,
        x_ratio: arrows > 0 ? x / arrows : 0,
        yellow_ratio: arrows > 0 ? (x + ten + nine) / arrows : 0,
      };
    });

    return ok({ rows });
  } catch (e) {
    return handleError(e);
  }
};
