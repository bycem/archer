import type { HandlerEvent } from '@netlify/functions';
import { supabaseAdmin } from './supabase';
import { HttpError } from './errors';

export type UserRole = 'admin' | 'competitor';

export interface AuthContext {
  userId: string;
  role: UserRole;
  email: string;
  token: string;
}

export async function authenticate(event: HandlerEvent): Promise<AuthContext> {
  const auth = event.headers.authorization || event.headers.Authorization || '';
  const token = String(auth).replace(/^Bearer\s+/i, '');
  if (!token) throw new HttpError(401, 'Missing token', 'UNAUTHORIZED');

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) throw new HttpError(401, 'Invalid token', 'UNAUTHORIZED');

  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  return {
    userId: user.id,
    role: (profile?.role as UserRole) ?? 'competitor',
    email: user.email!,
    token,
  };
}

export function requireAdmin(ctx: AuthContext) {
  if (ctx.role !== 'admin') throw new HttpError(403, 'Admin only', 'FORBIDDEN');
}
