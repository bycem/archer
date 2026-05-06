import type { Handler } from '@netlify/functions';
import { supabaseAdmin } from './_shared/supabase';
import { ok, handleError } from './_shared/response';
import { methodGuard } from './_shared/method';
import { HttpError } from './_shared/errors';

export const handler: Handler = async (event) => {
  const guard = methodGuard(event, ['GET']);
  if (guard) return guard;

  try {
    const id = event.queryStringParameters?.id;
    if (!id) throw new HttpError(400, 'Missing id', 'BAD_REQUEST');

    const { data, error: e1 } = await supabaseAdmin
      .from('tournaments')
      .select('*')
      .eq('id', id)
      .single();
    if (e1 || !data) throw new HttpError(404, 'Not found', 'NOT_FOUND');

    return ok({ tournament: data });
  } catch (e) {
    return handleError(e);
  }
};
