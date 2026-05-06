import type { Handler } from '@netlify/functions';
import { supabaseAdmin } from './_shared/supabase';
import { ok, handleError } from './_shared/response';
import { methodGuard } from './_shared/method';

export const handler: Handler = async (event) => {
  const guard = methodGuard(event, ['GET']);
  if (guard) return guard;

  try {
    const params = event.queryStringParameters || {};
    const status = params.status;
    const q = params.q?.trim();
    const ageGroup = params.age_group;
    const bowType = params.bow_type;
    const dateFrom = params.from;
    const dateTo = params.to;
    const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
    const pageSize = Math.min(100, parseInt(params.pageSize ?? '20', 10) || 20);
    const rangeFrom = (page - 1) * pageSize;
    const rangeTo = rangeFrom + pageSize - 1;

    let query = supabaseAdmin
      .from('tournaments')
      .select('*, participants:tournament_participants(count)', { count: 'exact' })
      .order('date', { ascending: false })
      .range(rangeFrom, rangeTo);

    if (status) query = query.eq('status', status);
    if (q) query = query.ilike('name', `%${q}%`);
    if (ageGroup) query = query.eq('age_group', ageGroup);
    if (bowType) query = query.eq('bow_type', bowType);
    if (dateFrom) query = query.gte('date', dateFrom);
    if (dateTo) query = query.lte('date', dateTo);

    const { data, error: e1, count } = await query;
    if (e1) throw e1;

    const items = (data ?? []).map((row: Record<string, unknown>) => {
      const participants = row.participants as { count: number }[] | undefined;
      const participant_count = participants?.[0]?.count ?? 0;
      const { participants: _omit, ...rest } = row;
      return { ...rest, participant_count };
    });

    return ok({ items, page, pageSize, total: count ?? 0 });
  } catch (e) {
    return handleError(e);
  }
};
