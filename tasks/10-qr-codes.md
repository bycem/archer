# Task 10 — QR Kod Üretimi & Paylaşım

## Amaç
Her turnuva için 2 ayrı QR kod (yarışmacı / izleyici) görüntüleme, paylaşma, indirme.

## Token Üretimi

Turnuva oluşturulduğunda backend tarafından `nanoid(32)` ile 2 token üretilir (Task 03'te yapıldı).

URL Yapısı:
- Yarışmacı: `https://app.example.com/join/<token>`
- İzleyici: `https://app.example.com/spectate/<token>`

## QR Kod Görüntüleme

`src/components/QrCodeCard.tsx`

```tsx
import QRCode from 'qrcode';
import { useEffect, useRef } from 'react';

export function QrCodeCard({ url, title }: { url: string; title: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, { width: 320, margin: 2 });
    }
  }, [url]);

  const download = () => {
    const link = document.createElement('a');
    link.href = canvasRef.current!.toDataURL('image/png');
    link.download = `${title}.png`;
    link.click();
  };

  const share = async () => {
    if (navigator.share) {
      await navigator.share({ title, url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success(t('common.linkCopied'));
    }
  };

  return (
    <div className="border rounded-lg p-4 flex flex-col items-center gap-3">
      <h3 className="font-semibold">{title}</h3>
      <canvas ref={canvasRef} />
      <div className="text-xs text-slate-500 break-all">{url}</div>
      <div className="flex gap-2">
        <button onClick={download} className="btn-secondary">{t('qr.download')}</button>
        <button onClick={share} className="btn-secondary">{t('qr.share')}</button>
      </div>
    </div>
  );
}
```

## Yönetici Turnuva Yönetim Sayfasında

`src/pages/admin/TournamentManage.tsx` içinde 2 kart yan yana:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <QrCodeCard
    url={`${origin}/join/${competitorToken}`}
    title={t('tournament.qr.competitor')}
  />
  <QrCodeCard
    url={`${origin}/spectate/${spectatorToken}`}
    title={t('tournament.qr.spectator')}
  />
</div>
```

## QR Token Doğrulama

Backend GET `/api/qr/verify?token=...&kind=competitor|spectator`:
```ts
const { data } = await supabaseAdmin
  .from('tournament_qr_tokens')
  .select('tournament_id, kind, tournaments(*)')
  .eq('token', token).single();

if (!data) return error(404, 'Invalid');
return ok({ tournament: data.tournaments, kind: data.kind });
```

## Yarışmacı Tarafında QR Okuma (Opsiyonel)

Yarışmacı uygulamayı zaten URL ile açıyor (QR taranmasıyla cihaz tarayıcısı açar). Ama uygulama içinden kamera ile tarama opsiyonu da eklenebilir:

```tsx
import { Html5QrcodeScanner } from 'html5-qrcode';

useEffect(() => {
  const scanner = new Html5QrcodeScanner('qr-reader', { fps: 10, qrbox: 250 }, false);
  scanner.render(
    (decoded) => {
      // /join/:token veya /spectate/:token formatı kontrol
      const url = new URL(decoded);
      navigate(url.pathname);
    },
    (err) => {}
  );
  return () => scanner.clear();
}, []);
```

İzleyici için ana sayfada "QR Tara" butonu olabilir.

## Token Yenileme (Opsiyonel)

İleride: Yönetici eski token'ı iptal edip yenisini üretebilsin (örn. yanlışlıkla paylaşıldıysa).

## Kabul Kriterleri

- [x] Yönetici turnuva detayında 2 QR görüyor
- [x] PNG indirme çalışıyor
- [x] Web Share API mobilde paylaşım açıyor, masaüstünde clipboard'a kopyalıyor
- [x] QR taranınca doğru sayfa açılıyor
- [x] Geçersiz token 404 dönüyor
- [x] İzleyici QR'ı giriş gerektirmeden çalışıyor

## Bağımlılık
- Task 03, Task 08
