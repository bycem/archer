# Task 07 — Rol Bazlı Routing & Layout

## Amaç
Yönetici, yarışmacı ve izleyici için ayrı layout, ayrı navigation, ayrı giriş noktaları. Yönetici aynı zamanda yarışmacı olarak katılabildiği için iki ekran arasında **net rol geçişi** olmalı.

## Layout Bileşenleri

### `PublicLayout`
- İzleyici / login öncesi
- Üst bar: logo, dil seçici, "Giriş Yap" butonu

### `CompetitorLayout`
- Yarışmacı sayfaları
- Bottom navigation (mobil): Anasayfa | Turnuvalarım | Profil
- Üst bar: logo, dil seçici, profil/çıkış

### `AdminLayout`
- Yönetici sayfaları
- Üst bar: logo, "Yönetici Modu" rozeti, "Yarışmacı Moduna Geç" butonu
- Sidebar veya tab: Aktif Turnuvalar | Geçmiş | Yeni Turnuva | Onaylar

## Rol Geçişi (Yönetici → Yarışmacı modu)

Yönetici, kendi profil ekranından veya üst bar butonu ile **yarışmacı moduna** geçebilir. URL bazlı ayrım:
- `/admin/*` → AdminLayout
- `/home`, `/tournament/:id/score`, `/profile` → CompetitorLayout

Aynı kullanıcı her iki layout'u da kullanabilir, sadece **turnuvayı bitirme** ve **diğer sporcuların puanını düzeltme** gibi yetkili aksiyonlar `/admin/*` rotalarında görünür.

## Route Konfigürasyonu

`src/routes/AppRoutes.tsx`
```tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { PublicLayout, CompetitorLayout, AdminLayout } from '../layouts';
import * as P from '../pages';

const router = createBrowserRouter([
  // PUBLIC
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <P.Landing /> },
      { path: '/login', element: <P.Login /> },
      { path: '/auth/callback', element: <P.AuthCallback /> },
      { path: '/spectate/:token', element: <P.SpectatorTournament /> },
    ],
  },

  // ONBOARDING
  {
    path: '/onboarding/profile',
    element: <ProtectedRoute><P.CompleteProfile /></ProtectedRoute>,
  },

  // COMPETITOR
  {
    element: <ProtectedRoute><CompetitorLayout /></ProtectedRoute>,
    children: [
      { path: '/home', element: <P.CompetitorHome /> },
      { path: '/join/:token', element: <P.JoinTournament /> },
      { path: '/tournament/:id', element: <P.TournamentScoreboard /> },
      { path: '/tournament/:id/score', element: <P.ScoreEntry /> },
      { path: '/my-tournaments', element: <P.MyTournaments /> },
      { path: '/profile', element: <P.Profile /> },
      { path: '/settings', element: <P.Settings /> },
    ],
  },

  // ADMIN
  {
    element: <ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>,
    children: [
      { path: '/admin', element: <P.AdminDashboard /> },
      { path: '/admin/tournaments/new', element: <P.AdminCreateTournament /> },
      { path: '/admin/tournaments', element: <P.AdminTournamentList /> },
      { path: '/admin/tournaments/:id', element: <P.AdminTournamentManage /> },
      { path: '/admin/tournaments/:id/approvals', element: <P.AdminApprovals /> },
      { path: '/admin/tournaments/:id/scoreboard', element: <P.AdminScoreboard /> },
    ],
  },

  { path: '*', element: <P.NotFound /> },
]);

export function AppRoutes() { return <RouterProvider router={router} />; }
```

## Bottom Navigation (Mobil-First)

`src/layouts/CompetitorLayout.tsx`
```tsx
<div className="min-h-screen flex flex-col">
  <Outlet />
  <nav className="fixed bottom-0 inset-x-0 bg-white border-t flex justify-around py-2 md:hidden">
    <NavLink to="/home"><HomeIcon />{t('nav.home')}</NavLink>
    <NavLink to="/my-tournaments"><TrophyIcon />{t('nav.tournaments')}</NavLink>
    <NavLink to="/profile"><UserIcon />{t('nav.profile')}</NavLink>
  </nav>
</div>
```

## Yönetici Üst Bar

```tsx
<header className="sticky top-0 bg-slate-900 text-white p-3 flex items-center justify-between">
  <div className="flex items-center gap-3">
    <Logo />
    <Badge>{t('admin.dashboard')}</Badge>
  </div>
  <div className="flex items-center gap-2">
    <Link to="/home" className="btn-ghost">{t('admin.switchToCompetitor')}</Link>
    <UserMenu />
  </div>
</header>
```

## Görsel Ayrım

- **Admin layout:** Koyu üst bar, kırmızı/turuncu vurgu
- **Competitor layout:** Açık tema, mavi vurgu
- **Public/Spectator:** Nötr, salt-okunur

Bu net görsel farklılık, yöneticinin hangi modda olduğunu **anında** anlamasını sağlar.

## Kabul Kriterleri

- [x] Public, competitor, admin layout'ları farklı görsel kimlikte
- [x] Yönetici `/admin` ile `/home` arasında tek tıkla geçiş yapabiliyor
- [x] Yarışmacı `/admin/*` URL'lerine direkt giderse `/home`'a yönleniyor
- [x] Mobile bottom nav çalışıyor
- [x] Onboarding tamamlanmadan başka sayfalara geçilemiyor
- [x] İzleyici giriş gerektirmeden spectator URL'lerine erişiyor

## Bağımlılık
- Task 04, Task 06
