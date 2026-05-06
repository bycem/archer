import { createClient } from '@supabase/supabase-js';
import { WebSocket } from 'ws';

// Node 20 doesn't have native WebSocket; polyfill for Supabase Realtime init
if (!globalThis.WebSocket) {
  (globalThis as unknown as Record<string, unknown>).WebSocket = WebSocket;
}

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

export const supabaseFromToken = (jwt: string) =>
  createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false },
  });
