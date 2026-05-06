import type { HandlerEvent, HandlerResponse } from '@netlify/functions';
import { error, preflight } from './response';

export function methodGuard(
  event: HandlerEvent,
  allowed: Array<'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'>,
): HandlerResponse | null {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (!allowed.includes(event.httpMethod as 'GET')) return error(405, 'Method not allowed', 'METHOD_NOT_ALLOWED');
  return null;
}

export function parseJson<T = unknown>(event: HandlerEvent): T {
  if (!event.body) return {} as T;
  try {
    return JSON.parse(event.body) as T;
  } catch {
    throw new Error('Invalid JSON body');
  }
}

export function pathParam(event: HandlerEvent, name: string): string | undefined {
  const params = (event as unknown as { pathParameters?: Record<string, string> }).pathParameters;
  if (params && params[name]) return params[name];
  // Fallback: parse from path. Pattern: /api/<segment>/:id/<action> — pull segment after a known marker.
  const parts = (event.path || '').split('/').filter(Boolean);
  return parts[parts.length - 1];
}
