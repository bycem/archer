import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Vite ortam değişkenleri eksikse erkenden hata ver — sessiz auth bozulmasını önler
  throw new Error('VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY gerekli (.env)');
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
