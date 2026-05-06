import type { Handler, HandlerResponse } from '@netlify/functions';
import { authenticate } from './_shared/auth';
import { handleError, preflight } from './_shared/response';
import { HttpError } from './_shared/errors';
import { supabaseAdmin } from './_shared/supabase';
import { buildTournamentWorkbook, loadTournament, slugify } from './_shared/xlsx-tournament';

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'GET') {
    return handleError(new HttpError(405, 'Method not allowed', 'METHOD_NOT_ALLOWED'));
  }

  try {
    const ctx = await authenticate(event);

    const tournamentId = event.queryStringParameters?.tournament_id;
    if (!tournamentId) throw new HttpError(400, 'Missing tournament_id', 'BAD_REQUEST');

    const tournament = await loadTournament(tournamentId);
    if (tournament.status !== 'completed') {
      throw new HttpError(403, 'Tournament not completed', 'FORBIDDEN');
    }

    const { data: participant, error: pErr } = await supabaseAdmin
      .from('tournament_participants')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('user_id', ctx.userId)
      .maybeSingle();
    if (pErr) throw new HttpError(500, pErr.message);
    if (!participant) throw new HttpError(404, 'Participation not found', 'NOT_FOUND');

    const buffer = await buildTournamentWorkbook({ tournament, filterUserId: ctx.userId });

    const filename = `${slugify(tournament.name)}-${tournament.date}-skorum.xlsx`;
    const response: HandlerResponse = {
      statusCode: 200,
      headers: {
        'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'content-disposition': `attachment; filename="${filename}"`,
        'access-control-allow-origin': '*',
        'access-control-allow-headers': 'authorization, content-type',
        'access-control-allow-methods': 'GET, OPTIONS',
      },
      body: buffer.toString('base64'),
      isBase64Encoded: true,
    };
    return response;
  } catch (e) {
    return handleError(e);
  }
};
