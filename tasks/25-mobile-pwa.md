# Task 25 — Mobil Uyumluluk & PWA

## Amaç
Uygulamanın mobil tarayıcılarda (iOS Safari, Android Chrome) sorunsuz çalışması ve PWA olarak ana ekrana eklenebilir hale gelmesi. WebView ile mobil app'e dönüştürülmeye hazır temel atılır.

## Mobile-First Tasarım Prensipleri

- Min dokunmatik buton: **44×44px** (Apple HIG önerisi)
- Form input'larda iOS zoom engelleme: `font-size: 16px+`
- Bottom navigation safe-area insets:
  ```css
  padding-bottom: env(safe-area-inset-bottom);
  ```
- Ana içeriğin sticky bottom-nav ile çakışmasın diye:
  ```css
  body { padding-bottom: calc(56px + env(safe-area-inset-bottom)); }
  ```

## PWA Setup

### 1. `public/manifest.json`

```json
{
  "name": "Okçuluk Turnuva",
  "short_name": "Okçuluk",
  "description": "Okçuluk turnuva ve puan tutma",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1e293b",
  "orientation": "portrait",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### 2. `index.html` meta

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1" />
<meta name="theme-color" content="#1e293b" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<link rel="manifest" href="/manifest.json" />
<link rel="apple-touch-icon" href="/icons/icon-192.png" />
```

### 3. Service Worker (Vite PWA Plugin)

```bash
npm install -D vite-plugin-pwa
```

`vite.config.ts`:
```ts
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        navigateFallback: '/index.html',
        runtimeCaching: [
          // Static asset cache
          { urlPattern: /\.(js|css|html|png|svg|ico)$/, handler: 'StaleWhileRevalidate' },
          // API: network first, no cache (data güncel kalmalı)
          { urlPattern: /\/api\//, handler: 'NetworkOnly' },
          // Supabase storage / images
          { urlPattern: /supabase\.co/, handler: 'NetworkFirst' },
        ],
      },
      manifest: {/* yukarıdaki gibi */},
    }),
  ],
});
```

## Offline Stratejisi (İlk Versiyon)

İlk versiyon için **online-only**. Çünkü puan girişi anlık senkronize olmalı.

İleride: Local IndexedDB ile offline draft, sonradan senkronize.

## Touch Optimizasyonları

```css
/* Tap highlight kapat */
* { -webkit-tap-highlight-color: transparent; }

/* Pull-to-refresh kapat (puan girişinde gereksiz) */
body { overscroll-behavior-y: contain; }

/* Long-press menü engelle */
.no-select { user-select: none; -webkit-user-select: none; }
```

## Viewport ve Safe Area

`src/styles/global.css`:
```css
@supports (padding: max(0px)) {
  .safe-top { padding-top: max(env(safe-area-inset-top), 1rem); }
  .safe-bottom { padding-bottom: max(env(safe-area-inset-bottom), 1rem); }
}
```

## Klavye Davranışı

Form input'larda virtual keyboard açıldığında ekran kayar. `useScrollIntoView` ile aktif input'a kaydır:

```tsx
const ref = useRef<HTMLInputElement>(null);
const onFocus = () => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
```

## WebView Hazırlığı

WebView içinde çalışmak için ek hazırlık:
- `localStorage` çalışır (auth token saklanır)
- Camera permission (QR okuma için): `<input capture="environment">` ya da `getUserMedia`
- Deep linking: `https://app.example.com/join/<token>` URL'i Android intent / iOS Universal Link ile handle edilebilir

## Test Cihazları

- iOS Safari (en az 2 versiyon geriye uyumluluk)
- Android Chrome
- Samsung Internet (TR'de yaygın)
- iPad (skor tablosu görüntüleme için)

## Lighthouse Hedefleri

- Performance: 85+
- Accessibility: 90+
- Best Practices: 90+
- SEO: 80+
- PWA: ✅ installable

## Kabul Kriterleri

- [x] iOS Safari'de "Ana ekrana ekle" çalışıyor
- [x] Android Chrome'da PWA yükleniyor
- [x] Standalone mode'da tam ekran (browser UI yok)
- [x] Bottom safe-area çakışmıyor
- [x] Tüm dokunmatik butonlar min 44px
- [x] Form input'larda zoom olmuyor
- [x] Service worker güncellemeleri otomatik geliyor
- [x] Lighthouse PWA check geçiyor

## Bağımlılık
- Task 01
