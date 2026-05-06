import type { HandlerResponse } from '@netlify/functions';
import { ZodError } from 'zod';
import { HttpError } from './errors';

const baseHeaders = {
  'content-type': 'application/json',
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
};

export const json = (status: number, body: unknown): HandlerResponse => ({
  statusCode: status,
  headers: baseHeaders,
  body: JSON.stringify(body),
});

export const ok = (data: unknown) => json(200, { data });
export const created = (data: unknown) => json(201, { data });
export const noContent = (): HandlerResponse => ({ statusCode: 204, headers: baseHeaders, body: '' });

export const error = (status: number, message: string, code?: string) =>
  json(status, { error: message, code });

export const preflight = (): HandlerResponse => ({ statusCode: 204, headers: baseHeaders, body: '' });

export function handleError(e: unknown): HandlerResponse {
  if (e instanceof HttpError) return error(e.status, e.message, e.code);
  if (e instanceof ZodError) {
    return json(400, {
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      issues: e.issues,
    });
  }
  const msg = e instanceof Error ? e.message : 'Internal error';
  return error(500, msg, 'INTERNAL');
}
