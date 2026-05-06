import { supabase } from '../lib/supabase';

export class ApiError extends Error {
  status: number;
  code?: string;
  issues?: unknown;
  constructor(status: number, message: string, code?: string, issues?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.issues = issues;
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token
    ? { authorization: `Bearer ${session.access_token}` }
    : {};
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    ...(await authHeaders()),
    ...((init.headers as Record<string, string>) ?? {}),
  };

  const res = await fetch(path, { ...init, headers, signal: init.signal });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new ApiError(
      res.status,
      body?.error ?? `Request failed (${res.status})`,
      body?.code,
      body?.issues,
    );
  }

  return body?.data as T;
}

export interface GetOptions {
  params?: Record<string, string | number | undefined | null>;
  signal?: AbortSignal;
}

function buildPath(path: string, params?: GetOptions['params']) {
  if (!params) return path;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v == null || v === '') continue;
    qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `${path}?${s}` : path;
}

export const api = {
  get: <T>(path: string, opts: GetOptions = {}) =>
    request<T>(buildPath(path, opts.params), { method: 'GET', signal: opts.signal }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
};
