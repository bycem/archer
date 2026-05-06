# Okçuluk Turnuva ve Puan Tutma Uygulaması — Ana Plan

## Proje Özeti

Okçuluk kulüpleri ve federasyonlar için turnuva düzenleme, canlı puan takibi, sporcu performans analizi sağlayan web tabanlı bir platform. Mobil uyumlu, WebView ile mobil uygulamaya dönüştürülebilir, ileride native'e taşınabilir.

---

## Teknoloji Stack

| Katman | Teknoloji | Açıklama |
|---|---|---|
| Frontend | React 18 + Vite + TypeScript | Mobile-first, WebView uyumlu |
| Styling | Tailwind CSS | Responsive utility-first |
| Routing | React Router v6 | |
| State | Zustand veya React Context | Hafif state yönetimi |
| Backend | Netlify Functions (Node.js) | Serverless, ücretsiz katman |
| Veritabanı | Supabase (PostgreSQL) | Ücretsiz katman + Realtime opsiyonu |
| Auth | Supabase Auth + Google OAuth | |
| i18n | react-i18next | TR / EN |
| Excel | SheetJS (xlsx) | Client-side export |
| Grafik | Recharts | Gelişim grafikleri |
| Isı Haritası | D3.js veya Canvas API | Hedef üzerinde isabet yoğunluğu |
| QR Kod | qrcode (üretim), html5-qrcode (okuma) | |
| Form | React Hook Form + Zod | Validation |
| Deploy | Netlify | Ücretsiz katman |
| Local Dev | Netlify CLI + Supabase CLI | |

---

## Kullanıcı Tipleri & Yetki Matrisi

| Özellik | Yönetici | Yarışmacı | İzleyici |
|---|---|---|---|
| Giriş zorunlu | ✅ | ✅ | ❌ |
| Turnuva görüntüleme | ✅ | ✅ | ✅ |
| Turnuva oluşturma | ✅ | ❌ | ❌ |
| Turnuvaya yarışmacı olarak katılma | ✅ | ✅ | ❌ |
| Puan girişi | ✅ | ✅ (kendi) | ❌ |
| Puan düzeltme (başkasının) | ✅ | ❌ | ❌ |
| Turnuvayı bitirme | ✅ (sadece admin ekranı) | ❌ | ❌ |
| Katılım onaylama | ✅ | ❌ | ❌ |
| Excel indirme (tüm sporcular) | ✅ | ❌ | ❌ |
| Excel indirme (kendi skoru) | ✅ | ✅ (turnuva sonrası) | ❌ |
| Profil & analiz | ✅ | ✅ | ❌ |

---

## Çalışma Kuralı (Otomatik)

> **Her task tamamlandığında**, ilgili `tasks/NN-*.md` dosyasındaki "Kabul Kriterleri" altındaki checkbox'lar (`- [ ]` → `- [x]`) ve aşağıdaki faz tablosundaki ✅ işareti otomatik olarak güncellenir. Geçmiş tasklarda eksik kalan işaretler de geriye dönük tamamlanır. Kullanıcının her seferinde hatırlatması gerekmez.

---

## Geliştirme Fazları & Görev Dökümü

| # | Durum | Faz | Dosya |
|---|---|---|---|---|
| 01 | ✅ | Proje Kurulumu & Tooling | [tasks/01-project-setup.md](tasks/01-project-setup.md) |
| 02 | ✅ | Supabase Kurulumu & Şema | [tasks/02-database-schema.md](tasks/02-database-schema.md) |
| 03 | ✅ | Netlify Functions Altyapısı | [tasks/03-netlify-functions.md](tasks/03-netlify-functions.md) |
| 04 | ✅ | Auth & Google OAuth | [tasks/04-authentication.md](tasks/04-authentication.md) |
| 05 | ✅ | Profil & Kayıt Tamamlama | [tasks/05-profile-onboarding.md](tasks/05-profile-onboarding.md) |
| 06 | ✅ | i18n (TR/EN) | [tasks/06-i18n.md](tasks/06-i18n.md) |
| 07 | ✅ | Rol Bazlı Routing & Layout | [tasks/07-role-based-routing.md](tasks/07-role-based-routing.md) |
| 08 | ✅ | Yönetici — Turnuva Oluşturma | [tasks/08-admin-tournament-create.md](tasks/08-admin-tournament-create.md) |
| 09 | ✅ | Yönetici — Turnuva Listeleme | [tasks/09-admin-tournament-list.md](tasks/09-admin-tournament-list.md) |
| 10 | ✅ | QR Kod Üretimi & Paylaşım | [tasks/10-qr-codes.md](tasks/10-qr-codes.md) |
| 11 | ✅ | Turnuvaya Katılım & Bekleme Odası | [tasks/11-tournament-join.md](tasks/11-tournament-join.md) |
| 12 | ✅ | Yönetici — Katılım Onay Akışı | [tasks/12-admin-approval.md](tasks/12-admin-approval.md) |
| 13 | ✅ | Puan Giriş — Sayısal Mod | [tasks/13-score-entry-numeric.md](tasks/13-score-entry-numeric.md) |
| 14 | ✅ | Puan Giriş — Görsel Hedef Modu | [tasks/14-score-entry-visual.md](tasks/14-score-entry-visual.md) |
| 15 | ✅ | Set Commit & Düzenleme Akışı | [tasks/15-set-commit-flow.md](tasks/15-set-commit-flow.md) |
| 16 | ✅ | Canlı Skor Tablosu (Polling) | [tasks/16-live-scoreboard.md](tasks/16-live-scoreboard.md) |
| 17 | ✅ | Yönetici — Puan Düzeltme | [tasks/17-admin-score-edit.md](tasks/17-admin-score-edit.md) |
| 18 | ✅ | Turnuvayı Bitirme & Kilitleme | [tasks/18-tournament-end.md](tasks/18-tournament-end.md) |
| 19 | ✅ | Excel Export | [tasks/19-excel-export.md](tasks/19-excel-export.md) |
| 20 | ✅ | Profil — Geçmiş Turnuvalar | [tasks/20-profile-history.md](tasks/20-profile-history.md) |
| 21 | ✅ | Profil — Gelişim Grafiği | [tasks/21-profile-progress-chart.md](tasks/21-profile-progress-chart.md) |
| 22 | ✅ | Profil — Isı Haritası | [tasks/22-profile-heatmap.md](tasks/22-profile-heatmap.md) |
| 23 | ✅ | Profil — İstatistikler & Tarih Filtresi | [tasks/23-profile-stats.md](tasks/23-profile-stats.md) |
| 24 | ✅ | İzleyici Ekranı (Public) | [tasks/24-spectator-view.md](tasks/24-spectator-view.md) |
| 25 | ✅ | Mobil Uyumluluk & PWA | [tasks/25-mobile-pwa.md](tasks/25-mobile-pwa.md) |
| 26 | ✅ | Local Geliştirme Ortamı | [tasks/26-local-dev.md](tasks/26-local-dev.md) |
| 27 | ✅ | Test (Unit + E2E) | [tasks/27-testing.md](tasks/27-testing.md) |
| 28 | ✅ | Netlify Deploy & CI/CD | [tasks/28-deployment.md](tasks/28-deployment.md) |
| 29 | ✅ | Native Mobil Değerlendirme (Capacitor) | [tasks/29-native-mobile.md](tasks/29-native-mobile.md) |

---

## Okçuluk Standartları Referansı

### World Archery (WA) Hedef Tipleri

| Hedef | Ring Sayısı | Mesafe (Standart) | Kullanım |
|---|---|---|---|
| WA 122cm | 10 | 70m (Recurve) / 50m (Compound) | Outdoor — Recurve uzun |
| WA 80cm | 10 | 50m / 30m | Outdoor — orta |
| WA 60cm | 10 | 18m | Indoor |
| WA 40cm | 10 | 18m (Compound) | Indoor |
| 3D | 1, 5, 8, 10, 11 | 5–45m değişken | Doğa |
| Puta | 0/1 | Geleneksel | Türk yayı |
| Meydan | Mesafe bazlı | Geleneksel | Türk yayı |

### Puan Renkleri (WA Standardı)

| Puan | Renk | Hex |
|---|---|---|
| X, 10 | Sarı (Altın) | #FFEB3B |
| 9, 8 | Kırmızı | #F44336 |
| 7, 6 | Mavi | #2196F3 |
| 5, 4 | Siyah | #212121 |
| 3, 2 | Beyaz | #FFFFFF (siyah border) |
| 1 | Beyaz | #FFFFFF |
| M (ıska) | — | 0 puan |

### Yaş Grupları (WA / Türkiye)

- **U11** — 11 yaş altı
- **U13** — 13 yaş altı
- **U15** — 15 yaş altı
- **U18** — 18 yaş altı (Junior)
- **U21** — 21 yaş altı (Genç)
- **Büyükler** — 21+

### Yay Tipleri

- **Klasik (Recurve)**
- **Makaralı (Compound)**
- **Yalın Yay (Barebow)**
- **Geleneksel Türk Yayı**

### Sıralama / Tie-Break Kuralı (WA)

1. Toplam puan (azalan)
2. X sayısı (azalan)
3. 10 sayısı (azalan)
4. 9 sayısı (azalan)

### Set ve Atış Sayıları

- **Set sayısı:** 3–30 (turnuva tipine göre)
- **Set başına atış:** 3, 4, 5 veya 6
- **Standart endurance:** 6 atışlık 10 set veya 3 atışlık 12 set

---

## Veritabanı Şeması Özeti

Detaylı şema için: [tasks/02-database-schema.md](tasks/02-database-schema.md)

```
users                      → Kullanıcılar (profil bilgileri + rol)
tournaments                → Turnuvalar
tournament_participants    → Katılım kayıtları (bekleme, onay, hedef no, kulüp override)
tournament_qr_tokens       → Yarışmacı/izleyici QR token'ları
sets                       → Set bazlı kilitleme
arrows                     → Atış bazlı puan kayıtları
audit_log                  → Yönetici düzeltmeleri için denetim kaydı
```

---

## Ekran Haritası

```
PUBLIC (giriş gerekmez)
├── /                                  Landing
├── /login                             Google OAuth giriş
├── /spectate/:tournamentToken         İzleyici turnuva ekranı

ONBOARDING (giriş sonrası ilk kez)
├── /onboarding/profile                Zorunlu profil tamamlama

YARIŞMACI
├── /home                              Aktif turnuvalarım
├── /join/:tournamentToken             QR ile katılım (bekleme odası)
├── /tournament/:id                    Skor tablosu (yarışmacı görünüm)
├── /tournament/:id/score              Puan giriş ekranı
├── /my-tournaments                    Geçmiş turnuvalar
├── /profile                           Profil + analiz
└── /settings                          Dil, yay tipi, ayarlar

YÖNETİCİ (rol ek ekranları)
├── /admin                             Dashboard (aktif turnuvalar)
├── /admin/tournaments/new             Turnuva oluştur
├── /admin/tournaments                 Tüm turnuvalar (pagination + arama)
├── /admin/tournaments/:id             Turnuva yönet
├── /admin/tournaments/:id/approvals   Bekleyen katılım talepleri
└── /admin/tournaments/:id/scoreboard  Yönetici skor tablosu (düzenleme yetkili)
```

---

## Veri Akışları

### 1. Kayıt & Onboarding Akışı

```
Google OAuth → Supabase Auth → ilk giriş kontrolü
   ↓
Profil tamamlama (ad, soyad, yaş, cinsiyet, kulüp, yay tipi, dil)
   ↓
Rol kontrolü → /home (yarışmacı) | /admin (yönetici)
```

### 2. Turnuva Katılım Akışı

```
QR kod tara → /join/:token
   ↓
Hedef numarası + kulüp override gir
   ↓
Bekleme odası (status=pending)
   ↓
Yönetici onay/red
   ↓
Onaylandı → /tournament/:id/score
```

### 3. Puan Giriş Akışı

```
Set başlar
   ↓
Atış sayısı kadar puan gir (sayısal veya görsel)
   ↓
Yanlışı düzenle (commit öncesi serbes)
   ↓
"Kaydet" → set commit → atış kayıtları locked
   ↓
Sonraki set otomatik açılır
   ↓
Tüm setler bitince yönetici "Turnuvayı Bitir" beklenir
```

### 4. Canlı Görüntüleme

```
Polling (5–10 sn) → /api/tournament/:id/scoreboard
   ↓
Skor tablosu yenilenir (yarışmacı + izleyici + yönetici)
```

---

## Local Geliştirme

Detay: [tasks/26-local-dev.md](tasks/26-local-dev.md)

```bash
# Bağımlılık
npm install
netlify login
supabase login

# Local DB
supabase start

# Local server (Netlify Functions + Vite proxy)
netlify dev
```

---

## Deploy

Detay: [tasks/28-deployment.md](tasks/28-deployment.md)

```bash
git push origin main          # Netlify otomatik deploy
```

---

## Açık Konular / Sonra Karar Verilecekler

1. Yönetici, turnuva tamamlandıktan sonra puan düzeltme yetkisi devam edecek mi? (Şimdilik: edebilir, audit_log'a yazılır)
2. Native mobil yaklaşımı: Capacitor (web kodunu native'e sarmalama) vs React Native (full rewrite). [tasks/29-native-mobile.md](tasks/29-native-mobile.md)
3. İzleyici QR'ının süresi sınırlı mı olsun?
4. Kulüp listesi ön tanımlı mı (dropdown) yoksa serbest metin mi? Şimdilik serbest metin.
5. Aynı turnuvaya farklı yaş grubu / yay tipi karışık katılabilir mi yoksa turnuva hep tek kategori mi? Şimdilik: turnuva tek kategori.
