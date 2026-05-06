# Task 04 — Authentication & Google OAuth

## Amaç
Supabase Auth üzerinden Google OAuth ile kayıt/giriş; ilk kayıt sonrası onboarding zorunlu; izleyici hariç tüm sayfalar korumalı.

## Adımlar

### 1. Google OAuth Konfigürasyonu

1. Google Cloud Console → OAuth 2.0 Client ID oluştur
2. Authorized redirect URIs:
   - `https://<supabase-project>.supabase.co/auth/v1/callback`
   - Local: `http://localhost:54321/auth/v1/callback`
3. Supabase Dashboard → Authentication → Providers → Google → Client ID + Secret gir

### 2. Supabase Client

`src/lib/supabase.ts`
```ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
```

### 3. Auth Store (Zustand)

`src/store/authStore.ts`
```ts
import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface Profile {
  id: string;
  name: string | null;
  surname: string | null;
  age: number | null;
  gender: string | null;
  club: string | null;
  bow_type: string | null;
  language: 'tr' | 'en';
  role: 'admin' | 'competitor';
  profile_completed: boolean;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
  init: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
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
    const { data: { session } } = await supabase.auth.getSession();
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

  signOut: async () => {
    await supabase.auth.signOut();
    set({ profile: null, session: null, user: null });
  },

  refreshProfile: async () => {
    const user = get().user;
    if (!user) return;
    const { data } = await supabase.from('users').select('*').eq('id', user.id).single();
    if (!data) {
      // İlk girişte users tablosuna kayıt
      await supabase.from('users').insert({
        id: user.id,
        email: user.email!,
        language: navigator.language.startsWith('tr') ? 'tr' : 'en',
      });
      const { data: created } = await supabase.from('users').select('*').eq('id', user.id).single();
      set({ profile: created });
    } else {
      set({ profile: data });
    }
  },
}));
```

### 4. Auth Callback Sayfası

`src/pages/AuthCallback.tsx` — Supabase otomatik handle eder, sadece yönlendirme:
```tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/authStore';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { initialized, profile } = useAuth();

  useEffect(() => {
    if (!initialized) return;
    if (!profile) return;
    if (!profile.profile_completed) navigate('/onboarding/profile');
    else if (profile.role === 'admin') navigate('/admin');
    else navigate('/home');
  }, [initialized, profile, navigate]);

  return <div>Yönlendiriliyor…</div>;
}
```

### 5. Login Sayfası

`src/pages/Login.tsx`
```tsx
import { useAuth } from '../store/authStore';
import { useTranslation } from 'react-i18next';

export default function Login() {
  const { signInWithGoogle } = useAuth();
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-bold mb-8">{t('app.title')}</h1>
      <button
        onClick={signInWithGoogle}
        className="px-6 py-3 bg-white border rounded-lg shadow flex items-center gap-3"
      >
        <GoogleIcon /> {t('auth.signInWithGoogle')}
      </button>
      <a href="/spectate" className="mt-6 text-sm underline">
        {t('auth.continueAsSpectator')}
      </a>
    </div>
  );
}
```

### 6. Korumalı Route

`src/routes/ProtectedRoute.tsx`
```tsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../store/authStore';

export function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: 'admin' | 'competitor' }) {
  const { initialized, session, profile, loading } = useAuth();
  const loc = useLocation();

  if (!initialized || loading) return <FullScreenSpinner />;
  if (!session) return <Navigate to="/login" state={{ from: loc }} replace />;
  if (!profile?.profile_completed) return <Navigate to="/onboarding/profile" replace />;
  if (role && profile.role !== role) return <Navigate to="/home" replace />;
  return <>{children}</>;
}
```

### 7. App Bootstrap

`src/App.tsx`
```tsx
useEffect(() => { useAuth.getState().init(); }, []);
```

## Güvenlik Notları

- **JWT Storage:** Supabase default `localStorage`. Güvenli ama XSS riski; mümkünse `cookieStorage` denenebilir, ama Netlify Functions'la cookie ayrı domain sorunu çıkarmaz çünkü aynı origin.
- **Service role key** ASLA client'a gitmez. Sadece Netlify Function ortam değişkenlerinde.
- **Role değiştirme:** Sadece DB'den manuel veya admin paneli ile (ileride). İlk admin manuel SQL ile set edilir:
  ```sql
  update public.users set role = 'admin' where email = 'admin@example.com';
  ```

## Kabul Kriterleri

- [x] Google ile giriş çalışıyor
- [x] Yeni kullanıcı `users` tablosuna otomatik insert ediliyor
- [x] `profile_completed = false` ise `/onboarding/profile`'a yönlendiriliyor
- [x] Çıkış yaparken session temizleniyor
- [x] Korumalı sayfalar oturum yoksa `/login`'e yönlendiriyor
- [x] Admin rolü için `/admin` sayfaları yarışmacılara kapalı

## Bağımlılık
- Task 01, Task 02, Task 03
