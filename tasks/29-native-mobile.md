# Task 29 — Native Mobil Değerlendirme

## Amaç
Web uygulamasını mobil (iOS + Android) olarak yayınlama seçeneklerini karşılaştırmak ve önerilen yola karar vermek.

## Seçenekler

### A) PWA (Default — Task 25'te kuruldu)
**Artılar:** Sıfır ek geliştirme. Kullanıcı "Ana ekrana ekle" yapabiliyor.
**Eksiler:** App Store / Play Store'da değil. iOS'ta bazı kısıtlamalar (push notifications). Kullanıcılar uygulama olarak algılamayabilir.

### B) Capacitor (Önerilen — Hibrit)
**Konsept:** Web kodu native shell içinde WebView olarak çalışır + native API'lere köprü.

**Artılar:**
- Mevcut React kodunu **olduğu gibi** kullanır
- Tek codebase — web + iOS + Android
- App Store / Play Store'a publish edilebilir
- Push, kamera, biometric vb. native API'ler mevcut
- Aktif geliştirilen, modern alternatif (Cordova'nın yerini aldı)

**Eksiler:**
- Native UI hissi web kadar kalır (animasyonlar smooth değilse hissedilir)
- App Store onay süreci

### C) React Native (Full Native)
**Konsept:** UI tamamen native bileşenlerle yeniden yazılır.

**Artılar:**
- En iyi performans ve native hissi
- Daha geniş ekosistem

**Eksiler:**
- Codebase'i **sıfırdan** yazmak gerekir (UI kısımları)
- Web ile native ayrı bakım
- Geliştirme süresi 2x

## Önerilen: Capacitor

Bu uygulamanın **doğası web-first** (skor tablosu, formlar, grafikler) — Capacitor mükemmel uyum sağlar. Native API ihtiyacı sınırlı (kamera/QR, push).

## Capacitor Entegrasyon Planı (İleride)

### 1. Kurulum

```bash
npm install @capacitor/core @capacitor/cli
npx cap init "Okçuluk Turnuva" com.example.archery --web-dir=dist
npm install @capacitor/ios @capacitor/android
```

### 2. Build

```bash
npm run build
npx cap add ios
npx cap add android
npx cap sync
```

### 3. Native Plugins

```bash
npm install @capacitor/camera           # QR okuma
npm install @capacitor/push-notifications
npm install @capacitor/preferences      # Local storage native
npm install @capacitor/share            # QR paylaşma
```

### 4. QR Tarayıcı (Capacitor)

```ts
import { Camera } from '@capacitor/camera';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';

async function scan() {
  const status = await BarcodeScanner.checkPermission({ force: true });
  if (!status.granted) return;
  await BarcodeScanner.hideBackground();
  document.body.classList.add('scanner-active');
  const result = await BarcodeScanner.startScan();
  document.body.classList.remove('scanner-active');
  if (result.hasContent) navigateToToken(result.content);
}
```

### 5. Build & Deploy

- iOS: Xcode → Archive → App Store Connect
- Android: Android Studio → Build APK / AAB → Play Console

### 6. App ID & Bundle

- iOS: `com.example.archery`
- Android: `com.example.archery`

### 7. Versiyonlama

Web ile ortak versiyon → `package.json` version + native config'lerde manuel sync.

## Code Sharing Stratejisi

```ts
// src/lib/platform.ts
import { Capacitor } from '@capacitor/core';

export const isNative = () => Capacitor.isNativePlatform();
export const platform = () => Capacitor.getPlatform(); // 'web' | 'ios' | 'android'
```

Native-only özellikler:
```ts
if (isNative()) {
  // Push notification setup, biometric, vs.
}
```

## Karar Tarihi

- **Şimdilik:** PWA ile devam (Task 25'te kuruldu)
- **3-6 ay sonra:** Kullanıcı geri bildirimine göre Capacitor'a geçiş kararı

## Maliyet

- **PWA:** $0
- **Apple Developer:** $99/yıl
- **Google Play Developer:** $25 (tek seferlik)

## Hazırlık Adımları (Şimdiden Yapılacak)

Capacitor'a geçişi kolaylaştırmak için:

- [x] Tüm `localStorage` kullanımları soyutlanmalı (`storage.ts`)
- [x] Environment URL (Supabase) `import.meta.env`'den geliyor — taşınabilir
- [ ] Deep link şeması test edilebilir (URL'ler universal link'lere uyumlu)
- [ ] Auth flow OAuth redirect URI native için ayrı tutulmalı (`com.example.archery://auth/callback`)
- [x] Camera/QR fonksiyonları interface arkasına alınmalı:
  ```ts
  interface QrScanner {
    scan(): Promise<string>;
  }
  // Web: html5-qrcode implementation
  // Native: Capacitor BarcodeScanner implementation
  ```

## Kabul Kriterleri (Native faza geçildiğinde)

- [ ] Capacitor projesi build alabiliyor
- [ ] iOS simulator'da çalışıyor
- [ ] Android emulator'da çalışıyor
- [ ] Native QR kamera çalışıyor
- [ ] Auth callback native deep link ile dönüyor
- [ ] App Store / Play Store sandbox'a yüklenebiliyor

## Bağımlılık
- Task 25 (PWA temeli atılmış olmalı)
- Production stable olmalı (Task 28)
