# Task 22 — Profil: Isı Haritası (Hedef Üzerinde Sıcaklık Analizi)

## Amaç
Yarışmacının görsel mod ile kaydettiği atış pozisyonlarını hedef üzerinde ısı haritası olarak göstermek. Hangi bölgelere yoğun atış yapmış, hangi tarafa sapma var.

## Veri Kaynağı

`arrows` tablosunda `hit_x`, `hit_y` (normalize -1..1 arası, merkez=0) sütunları (Task 14'te eklendi).

```sql
-- API: GET /api/profile/heatmap?from=&to=&bow_type=&target_type=
create or replace function get_user_arrow_positions(
  p_user_id uuid, p_from date default null, p_to date default null,
  p_bow_type bow_type default null, p_target_type target_type default null
) returns table (hit_x numeric, hit_y numeric, score_value int, is_x boolean)
language sql stable as $$
  select a.hit_x, a.hit_y, a.score_value, a.is_x
  from public.arrows a
  join public.sets s on s.id = a.set_id
  join public.tournament_participants tp on tp.id = s.participant_id
  join public.tournaments t on t.id = tp.tournament_id
  where tp.user_id = p_user_id
    and tp.status = 'approved'
    and a.hit_x is not null
    and a.hit_y is not null
    and (p_from is null or t.date >= p_from)
    and (p_to is null or t.date <= p_to)
    and (p_bow_type is null or t.bow_type = p_bow_type)
    and (p_target_type is null or t.target_type = p_target_type);
$$;
```

## Görselleştirme — Canvas

`src/features/profile/Heatmap.tsx`

```tsx
import { useEffect, useRef } from 'react';
import { TARGETS } from '../score-entry/visualTargetConfig';

export function Heatmap({ targetType, points }: { targetType: TargetType; points: {x: number; y: number}[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const SIZE = 400;

  useEffect(() => {
    const ctx = canvasRef.current!.getContext('2d')!;
    ctx.clearRect(0, 0, SIZE, SIZE);

    // 1. Hedefi arka plana çiz (Task 14'teki gibi)
    drawTarget(ctx, targetType, SIZE);

    // 2. Atışları density ile çiz
    drawDensity(ctx, points, SIZE);

  }, [points, targetType]);

  return <canvas ref={canvasRef} width={SIZE} height={SIZE} className="rounded-lg" />;
}

function drawDensity(ctx: CanvasRenderingContext2D, points, size) {
  const cx = size / 2, cy = size / 2;
  const maxR = size / 2;

  // Off-screen canvas ile alpha-additive blend
  const off = document.createElement('canvas');
  off.width = size; off.height = size;
  const octx = off.getContext('2d')!;

  for (const p of points) {
    const px = cx + p.x * maxR;
    const py = cy + p.y * maxR;
    const grad = octx.createRadialGradient(px, py, 0, px, py, 16);
    grad.addColorStop(0, 'rgba(255,0,0,0.45)');
    grad.addColorStop(1, 'rgba(255,0,0,0)');
    octx.fillStyle = grad;
    octx.beginPath();
    octx.arc(px, py, 16, 0, Math.PI * 2);
    octx.fill();
  }

  ctx.globalAlpha = 0.7;
  ctx.drawImage(off, 0, 0);
  ctx.globalAlpha = 1;

  // Atış noktalarını da göster
  for (const p of points) {
    const px = cx + p.x * maxR;
    const py = cy + p.y * maxR;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.arc(px, py, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}
```

## İstatistik Yan Paneli

```tsx
function HeatmapStats({ points }) {
  const total = points.length;
  const left = points.filter(p => p.x < -0.05).length;
  const right = points.filter(p => p.x > 0.05).length;
  const top = points.filter(p => p.y < -0.05).length;
  const bottom = points.filter(p => p.y > 0.05).length;

  return (
    <ul className="text-sm space-y-1">
      <li>Toplam atış: {total}</li>
      <li>Sol sapma: {((left/total)*100).toFixed(1)}%</li>
      <li>Sağ sapma: {((right/total)*100).toFixed(1)}%</li>
      <li>Üst sapma: {((top/total)*100).toFixed(1)}%</li>
      <li>Alt sapma: {((bottom/total)*100).toFixed(1)}%</li>
      <li>Ortalama dağılım yarıçapı: {avgRadius(points).toFixed(2)}</li>
    </ul>
  );
}
```

## Filtreler

- Tarih aralığı (Task 20 ile aynı bileşen)
- Hedef tipi (sadece bu hedefi seçili tutmak için)
- Yay tipi
- Belirli bir turnuva (opsiyonel dropdown)

## Profil Sayfasında Yerleşim

```tsx
<Tabs>
  <Tab label={t('profile.history')}><MyTournaments /></Tab>
  <Tab label={t('profile.progress')}><ProgressChart /></Tab>
  <Tab label={t('profile.heatmap')}>
    <div className="grid md:grid-cols-2 gap-6">
      <Heatmap points={points} targetType={selectedTargetType} />
      <HeatmapStats points={points} />
    </div>
  </Tab>
</Tabs>
```

## Veri Yetersizliği

Sayısal modla giriş yapan kullanıcılar için pozisyon verisi yok. UI uyarısı:
> "Isı haritası için Görsel Hedef modunda atış kaydetmen gerekir. Şimdiye kadar X atışın görsel modla girilmiş."

## Performans

- Tek turnuvada 100+ atış normal
- 10 turnuva → 1000 atış → Canvas render hızlı
- Çok büyük dataset için sayfada limit (örn. son 5000 atış)

## Kabul Kriterleri

- [x] Sadece görsel modla girilmiş atışlar listeleniyor
- [x] Hedef tipi seçilince doğru görsel arka plan render oluyor
- [x] Yoğunluk renkleri doğru çıkıyor
- [x] Sol/sağ/üst/alt sapma istatistikleri doğru
- [x] Tarih filtresi heatmap'i günceller
- [x] Veri yoksa uyarı gösterilir

## Bağımlılık
- Task 14, Task 21
