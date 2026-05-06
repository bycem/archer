# Okçuluk Turnuva ve Puan Tutma Uygulaması

Okçuluk kulüpleri ve federasyonlar için turnuva yönetimi, canlı puan takibi ve sporcu performans analizi sağlayan web tabanlı platform. Mobil uyumlu (PWA) — ileride Capacitor ile native'e taşınabilir.

## Stack

React 19 + Vite + TypeScript • Tailwind CSS • React Router • Zustand • Supabase (Postgres + Auth) • Netlify Functions • react-i18next (TR/EN) • Recharts • SheetJS • PWA

## Ön Gereksinimler

```bash
brew install --cask docker            # Supabase için
brew install supabase/tap/supabase    # Supabase CLI
npm install -g netlify-cli            # Netlify CLI
```

Node 20+ önerilir.

## Local Geliştirme

### 1. Bağımlılıkları yükle

```bash
npm install
```

### 2. Supabase'i başlat

Docker Desktop açık olmalı.

```bash
npm run supabase:start
```

İlk açılışta Docker imajları indirilir (birkaç dakika). Çıktıdaki `API URL`, `anon key` ve `service_role key` değerlerini bir kenara not al.

### 3. `.env.local` oluştur

`.env.example` üzerinden:

```
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=<supabase start çıktısındaki anon key>
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=<supabase start çıktısındaki service_role key>
```

Production-only Google OAuth değişkenleri local için gerekli değildir.

### 4. Veritabanını sıfırla & seed çalıştır

```bash
supabase db reset
```

Tüm migration'ları (`supabase/migrations/*`) ve `supabase/seed.sql` içindeki test verisini yükler.

### 5. Uygulamayı çalıştır

İki seçenek:

```bash
# (a) Yalnızca Vite (UI testleri için)
npm run dev                           # http://localhost:5173

# (b) Vite + Netlify Functions birleşik (önerilen)
npm run dev:netlify                   # http://localhost:8888
```

Functions `/api/*` altında erişilebilir (`netlify.toml` redirect'i).

## Test Hesapları (Seed)

Tüm hesaplarda şifre: **`password123`**

| Email | Rol |
|---|---|
| admin@archery.test | Admin |
| a1@archery.test … a5@archery.test | Yarışmacı |

Login ekranında **dev mode** açıkken email/password formu görünür — Google OAuth kurmadan login olabilirsin.

## Yararlı Komutlar

| İhtiyaç | Komut |
|---|---|
| Frontend dev | `npm run dev` |
| Frontend + Functions | `npm run dev:netlify` |
| Build | `npm run build` |
| Lint | `npm run lint` |
| Format | `npm run format` |
| Unit test | `npm test` |
| E2E test | `npm run test:e2e` |
| Supabase başlat/durdur | `npm run supabase:start` / `supabase:stop` |
| DB sıfırla + seed | `supabase db reset` |
| Yeni migration | `supabase migration new <isim>` |
| Studio (DB UI) | http://localhost:54323 |

## Proje Yapısı

```
archery-app/
├── netlify/functions/    # Serverless API (admin işlemleri, RPC wrapper'lar)
├── public/               # Statik dosyalar, PWA ikonları
├── src/
│   ├── api/              # Frontend API client (Supabase + Functions)
│   ├── components/       # Yeniden kullanılabilir UI
│   ├── features/         # Domain-spesifik bileşenler (target, scoreboard, …)
│   ├── hooks/            # Custom hook'lar (polling, realtime, …)
│   ├── i18n/             # TR/EN çeviriler
│   ├── layouts/          # AdminLayout, UserLayout, …
│   ├── pages/            # Route component'leri
│   ├── routes/           # Route guard'ları
│   ├── store/            # Zustand store'lar
│   ├── types/            # Ortak tipler
│   └── utils/            # Yardımcı fonksiyonlar (skor, hedef, format)
├── supabase/
│   ├── migrations/       # SQL şema migration'ları
│   ├── seed.sql          # Local test verisi
│   └── config.toml       # Supabase local konfig
└── tests/                # Vitest + Playwright
```

## Deploy

Netlify üzerinde otomatik (bkz. Task 28). Production env değişkenleri Netlify dashboard'dan girilir; `.env.local` repoya commit edilmez.

## Sorun Giderme

| Sorun | Çözüm |
|---|---|
| `supabase start` Docker hatası | Docker Desktop açık mı kontrol et |
| Port 54321/54322/54323 dolu | `supabase stop --no-backup` ardından restart |
| `netlify dev` "Functions not found" | `netlify.toml` `functions = "netlify/functions"` doğru |
| CORS hataları | `npm run dev:netlify` kullan, yalın `vite dev` değil |
| Dev login çalışmıyor | `supabase db reset` ile seed yeniden yükle |
| Google OAuth local'de çalışmıyor | Beklenen — dev login formunu kullan |

## Lisans

Özel — tüm hakları saklıdır.
