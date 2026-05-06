# Task 28 — Netlify Deploy & CI/CD

## Amaç
Production'a Netlify üzerinden otomatik deploy. Supabase production projesi ayrı, env değişkenleri Netlify dashboard'da.

## Setup

### 1. Supabase Production Projesi

1. https://supabase.com/dashboard → Yeni proje
2. Region: en yakın (örn. EU West)
3. Migration'ları uygula:
   ```bash
   supabase link --project-ref <prod-ref>
   supabase db push
   ```
4. Auth → Providers → Google'ı production credentials ile aktif et
5. Auth → URL Configuration:
   - Site URL: `https://app.example.com`
   - Redirect URLs: `https://app.example.com/auth/callback`

### 2. Google Cloud OAuth (Production)

1. Cloud Console → OAuth Client (Web)
2. Authorized JS origins: `https://app.example.com`
3. Authorized redirect URI: `https://<prod-supabase>.supabase.co/auth/v1/callback`

### 3. Netlify Site

```bash
netlify init
# veya manuel: dashboard.netlify.com → "Import from Git"
```

`netlify.toml` zaten Task 01'de hazır.

### 4. Environment Variables (Netlify Dashboard)

Site settings → Environment variables:

| Key | Value | Notlar |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://<ref>.supabase.co` | Public |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` | Public |
| `SUPABASE_URL` | `https://<ref>.supabase.co` | Functions |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | **Secret** — sadece functions |
| `NODE_VERSION` | `20` | |

⚠️ Service role key **asla** `VITE_*` prefix'i ile yayılmamalı.

### 5. Deploy

```bash
git push origin main
```

Netlify otomatik:
1. Build (`npm run build`)
2. Functions bundle
3. CDN'e publish

## Branch Deploys

- `main` → production (`app.example.com`)
- Diğer branch'ler → preview deploy (`<branch>--<site>.netlify.app`)
- PR'lar → deploy preview otomatik

## Custom Domain

1. Netlify → Domain management → Add domain
2. DNS (Cloudflare/registrar):
   - A record → Netlify IP
   - veya CNAME → `<site>.netlify.app`
3. SSL → Netlify auto (Let's Encrypt)

## Build Optimizasyonu

`vite.config.ts`:
```ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        vendor: ['react', 'react-dom', 'react-router-dom'],
        supabase: ['@supabase/supabase-js'],
        charts: ['recharts'],
        excel: ['xlsx'],
      },
    },
  },
  chunkSizeWarningLimit: 1000,
}
```

## CI/CD Pipeline

GitHub Actions → Netlify build entegre. Ek olarak:

```yaml
# .github/workflows/ci.yml
name: ci
on: [pull_request]
jobs:
  lint-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'npm' }
      - run: npm ci
      - run: npm run lint
      - run: npm run build
      - run: npm test
```

PR merge öncesi: lint + build + unit test geçmeli.

## Migration Stratejisi

Local'de:
```bash
supabase migration new add_foo_column
# SQL yaz
supabase db reset    # local test
```

Production'a:
```bash
supabase db push --linked
```

⚠️ Destructive migration (DROP COLUMN, vb.) için manuel onay/inceleme.

## Rollback

- **Frontend rollback:** Netlify dashboard → Deploys → Önceki versiyona "Publish"
- **DB rollback:** Migration reversibility planı yapılmalı (her up için down script). Supabase CLI'da otomatik down yok, manuel SQL.

## Monitoring (İlk Versiyon — Ücretsiz)

- Netlify Analytics (basic): trafik, build durumu
- Supabase Dashboard: query performance, errors
- Browser console: error tracking için Sentry free tier eklenebilir (ileride)

## Free Tier Limitler

| Servis | Free Limit | Aşma Riski |
|---|---|---|
| Netlify | 100 GB bandwidth/ay, 300 build min, 125k function req/ay | Function req aşılabilir popülerleşince |
| Supabase | 500 MB DB, 50k MAU, 2 GB egress | DB boyutu uzun vadede risk |

İzleme için aylık check.

## Domain & SSL

- HTTPS zorunlu (Netlify default)
- HSTS header eklenebilir (`netlify.toml`'a):
  ```toml
  [[headers]]
    for = "/*"
    [headers.values]
      Strict-Transport-Security = "max-age=31536000; includeSubDomains"
      X-Content-Type-Options = "nosniff"
      X-Frame-Options = "DENY"
      Referrer-Policy = "strict-origin-when-cross-origin"
  ```

## Kabul Kriterleri

- [ ] `git push origin main` ile production deploy oluyor
- [ ] PR açınca preview deploy URL veriliyor
- [ ] Custom domain SSL ile çalışıyor
- [ ] Functions production'da çalışıyor
- [ ] Service role key client'a sızmıyor (build output kontrolü)
- [ ] HSTS ve security header'ları aktif
- [ ] Migration'lar production'a sorunsuz uygulanıyor

## Bağımlılık
- Task 01–27 (production-ready uygulama)
