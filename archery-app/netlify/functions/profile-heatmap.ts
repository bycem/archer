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

    if (from && !ISO_DATE.test(from)) return ok({ points: [] });
    if (to && !ISO_DATE.test(to)) return ok({ points: [] });

    const { data, error: rpcError } = await supabaseAdmin.rpc(
      'get_user_arrow_positions',
      {
        p_user_id: ctx.userId,
        p_from: from,
        p_to: to,
        p_bow_type: bow && BOW_TYPES.has(bow) ? bow : null,
        p_target_type: target && TARGET_TYPES.has(target) ? target : null,
      },
    );
    if (rpcError) throw rpcError;

    type Row = {
      hit_x: number | string;
      hit_y: number | string;
      score_value: number;
      is_x: boolean;
      tournament_id: string;
      target_type: string;
      bow_type: string;
      date: string;
    };

    const points = ((data ?? []) as Row[]).map((r) => ({
      x: Number(r.hit_x) || 0,
      y: Number(r.hit_y) || 0,
      score_value: Number(r.score_value) || 0,
      is_x: !!r.is_x,
      tournament_id: r.tournament_id,
      target_type: r.target_type,
      bow_type: r.bow_type,
      date: r.date,
    }));

    return ok({ points });
  } catch (e) {
    return handleError(e);
  }
};
