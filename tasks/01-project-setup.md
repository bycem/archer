# Task 01 — Proje Kurulumu & Tooling

## Amaç
Vite + React + TypeScript tabanlı, Tailwind ile styling yapılan, Netlify Functions yapısına hazır bir monorepo benzeri klasör yapısı kurmak.

## Klasör Yapısı

```
archery-app/
├── netlify/
│   └── functions/              # Serverless functions
├── public/                     # Static assets
├── src/
│   ├── api/                    # Frontend API çağrıları
│   ├── components/             # Ortak UI bileşenleri
│   ├── features/
│   │   ├── auth/
│   │   ├── tournament/
│   │   ├── score-entry/
│   │   ├── profile/
│   │   └── admin/
│   ├── hooks/
│   ├── i18n/
│   │   ├── locales/
│   │   │   ├── tr.json
│   │   │   └── en.json
│   │   └── config.ts
│   ├── layouts/
│   │   ├── PublicLayout.tsx
│   │   ├── CompetitorLayout.tsx
│   │   └── AdminLayout.tsx
│   ├── lib/
│   │   ├── supabase.ts
│   │   └── archery/             # Okçuluk standartları (sabitler, hesaplama)
│   ├── pages/
│   ├── routes/
│   ├── store/                   # Zustand stores
│   ├── types/
│   ├── utils/
│   ├── App.tsx
│   └── main.tsx
├── supabase/
│   ├── migrations/
│   └── seed.sql
├── tests/
├── .env.example
├── .gitignore
├── netlify.toml
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vite.config.ts
```

## Adımlar

### 1. Vite + React + TS scaffold

```bash
npm create vite@latest . -- --template react-ts
npm install
```

### 2. Tailwind CSS

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

`tailwind.config.ts` ve `index.css` ayarları yapılır.

### 3. Bağımlılıklar

```bash
# Routing
npm install react-router-dom

# State
npm install zustand

# Form & validation
npm install react-hook-form zod @hookform/resolvers

# Supabase
npm install @supabase/supabase-js

# i18n
npm install react-i18next i18next i18next-browser-languagedetector

# QR
npm install qrcode html5-qrcode

# Excel
npm install xlsx

# Grafik
npm install recharts

# Utility
npm install date-fns clsx
```

### 4. Dev bağımlılıklar

```bash
npm install -D @types/qrcode @types/node
npm install -D eslint prettier eslint-config-prettier eslint-plugin-react-hooks
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
npm install -D @playwright/test
npm install -D netlify-cli
```

### 5. ESLint + Prettier

`.eslintrc.cjs` ve `.prettierrc` oluştur. `npm run lint` ve `npm run format` script'leri eklensin.

### 6. `netlify.toml`

```toml
[build]
  command = "npm run build"
  publish = "dist"
  functions = "netlify/functions"

[dev]
  command = "npm run dev"
  port = 8888
  targetPort = 5173

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 7. `.env.example`

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
```

### 8. `package.json` script'leri

```json
{
  "scripts": {
    "dev": "vite",
    "dev:netlify": "netlify dev",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx",
    "format": "prettier --write \"src/**/*.{ts,tsx}\"",
    "test": "vitest",
    "test:e2e": "playwright test",
    "supabase:start": "supabase start",
    "supabase:stop": "supabase stop"
  }
}
```

## Kabul Kriterleri

- [x] `npm run dev` ile Vite dev server çalışıyor
- [x] `netlify dev` ile Netlify Functions + Vite birlikte çalışıyor
- [x] Tailwind class'ları render oluyor
- [x] ESLint hatasız geçiyor
- [x] `.env.local` örnek dosyadan kopyalanabiliyor
- [x] Klasör yapısı yukarıdaki gibi oluşturulmuş

## Bağımlılık
Yok (ilk task).
