import type { Handler, HandlerResponse } from '@netlify/functions';
import { authenticate, requireAdmin } from './_shared/auth';
import { handleError, preflight } from './_shared/response';
import { HttpError } from './_shared/errors';
import { buildTournamentWorkbook, loadTournament, slugify } from './_shared/xlsx-tournament';

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'GET') {
    return handleError(new HttpError(405, 'Method not allowed', 'METHOD_NOT_ALLOWED'));
  }

  try {
    const ctx = await authenticate(event);
    requireAdmin(ctx);

    const id = event.queryStringParameters?.id;
    if (!id) throw new HttpError(400, 'Missing id', 'BAD_REQUEST');

    const tournament = await loadTournament(id);
    const buffer = await buildTournamentWorkbook({ tournament });

    const filename = `${slugify(tournament.name)}-${tournament.date}.xlsx`;
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
