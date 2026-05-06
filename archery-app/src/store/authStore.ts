import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types/profile';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
  init: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  loading: true,
  initialized: false,

  init: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    set({ session, user: session?.user ?? null });
    if (session) await get().refreshProfile();
    set({ loading: false, initialized: true });

    supabase.auth.onAuthStateChange(async (_evt, sess) => {
      set({ session: sess, user: sess?.user ?? null });
      if (sess) await get().refreshProfile();
      else set({ profile: null });
    });
  },

  signInWithGoogle: async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  },

  signInWithEmail: async (email, password) => {
    if (!import.meta.env.DEV) {
      return { error: 'Email login only available in development.' };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ profile: null, session: null, user: null });
  },

  refreshProfile: async () => {
    const user = get().user;
    if (!user) return;
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!data) {
      const language = navigator.language.startsWith('tr') ? 'tr' : 'en';
      await supabase.from('users').insert({
        id: user.id,
        email: user.email!,
        language,
      });
      const { data: created } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      set({ profile: (created as Profile) ?? null });
    } else {
      set({ profile: data as Profile });
    }
  },
}));
