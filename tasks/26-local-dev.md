# Task 26 — Local Geliştirme Ortamı

## Amaç
Geliştirici, Netlify'a deploy etmeden tüm uygulamayı local olarak çalıştırabilmeli.

## Bileşenler

| Servis | Local Çözüm |
|---|---|
| Frontend (Vite) | `npm run dev` (port 5173) |
| Netlify Functions | `netlify dev` (port 8888, Vite'a proxy) |
| PostgreSQL | Supabase CLI (`supabase start` — Docker) |
| Auth | Supabase local Auth + Google OAuth (test credentials) |

## Kurulum Adımları

### 1. Bağımlılıklar

```bash
# Docker Desktop (Supabase için gerekli)
brew install --cask docker

# Supabase CLI
brew install supabase/tap/supabase

# Netlify CLI
npm install -g netlify-cli
```

### 2. Supabase Local

```bash
cd archery-app
supabase init           # ilk kez
supabase start          # Docker container'ları başlatır
```

Çıktı:
```
API URL:    http://localhost:54321
DB URL:     postgresql://postgres:postgres@localhost:54322/postgres
Studio URL: http://localhost:54323
anon key:   eyJ...
service_role key: eyJ...
```

### 3. `.env.local`

```
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=<local anon key>
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=<local service role key>
GOOGLE_OAUTH_CLIENT_ID=...
```

### 4. Migration & Seed

```bash
supabase db reset                  # tüm migration'ları + seed çalıştır
# veya
supabase migration up
psql -h localhost -p 54322 -U postgres -d postgres -f supabase/seed.sql
```

### 5. Google OAuth (Local)

Local'de Google OAuth çalışması için:

**Seçenek A: Mock Auth (en hızlı)**
- Supabase Auth'un email/password modunu kullan local'de
- Production'da Google OAuth aktif

**Seçenek B: Gerçek Google OAuth**
- Google Cloud Console'da test client oluştur
- Redirect URI: `http://localhost:54321/auth/v1/callback`
- `supabase/config.toml`'da Google provider client_id/secret eklenir

İlk versiyon için **Seçenek A** önerilir — geliştirici hızla test edebilir.

`supabase/config.toml`:
```toml
[auth.email]
enable_signup = true
double_confirm_changes = false
enable_confirmations = false
```

`useAuth` store'da local için ek metod:
```ts
async signInWithEmail(email, password) {
  // Sadece dev mode'da
  if (import.meta.env.DEV) {
    return supabase.auth.signInWithPassword({ email, password });
  }
}
```

### 6. Çalıştırma

```bash
# Terminal 1
supabase start

# Terminal 2
netlify dev
# → http://localhost:8888 (Vite + Functions birleşik)
```

Vite'a direkt erişim: `http://localhost:5173` (functions proxy'siz, sadece UI testleri için).

## Workflow

| İhtiyaç | Komut |
|---|---|
| Frontend değişikliği | Hot reload otomatik |
| Function değişikliği | netlify dev otomatik reload |
| DB şema değişikliği | Yeni migration ekle: `supabase migration new <name>` |
| DB sıfırla | `supabase db reset` |
| Studio (DB UI) | http://localhost:54323 |

## Test Verisi

`supabase/seed.sql`:
```sql
-- 1 admin
insert into auth.users (id, email, encrypted_password, email_confirmed_at)
values ('aaaa1111-...', 'admin@test.com', crypt('admin123', gen_salt('bf')), now());

insert into public.users (id, email, name, surname, age, gender, club, bow_type, language, role, profile_completed)
values ('aaaa1111-...', 'admin@test.com', 'Test', 'Admin', 35, 'male', 'TestKulup', 'recurve', 'tr', 'admin', true);

-- 5 yarışmacı
-- 1 örnek aktif turnuva
-- ...
```

## CI Üzerinde Çalıştırma (Opsiyonel)

GitHub Actions için Supabase CLI mevcut, ama ücretsiz katman build minute kullanır. İlk versiyon için CI sadece lint + unit test.

## Sorun Giderme

| Hata | Çözüm |
|---|---|
| Docker başlamıyor | Docker Desktop açık mı? |
| Port 54321 dolu | `supabase stop` sonra restart |
| netlify dev "Functions not found" | `netlify.toml` `functions = "netlify/functions"` doğru mu? |
| CORS hatası | netlify dev kullan, vite dev tek başına değil |

## Kabul Kriterleri

- [x] `supabase start` ile local DB çalışıyor
- [x] `netlify dev` ile frontend + functions birleşik çalışıyor
- [x] Migration'lar sıfırdan kuruluma uygun
- [x] Seed verisiyle hemen test başlatılabiliyor
- [x] Google OAuth gerekmeden email login ile dev test yapılabiliyor
- [x] README'de adımlar net yazılı

## Bağımlılık
- Task 01, Task 02, Task 03
