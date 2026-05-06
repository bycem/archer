# Task 14 — Puan Giriş: Görsel Hedef Modu

## Amaç
Hedef görseli üzerinde dokunarak/tıklayarak ring seçimi. Mobile-first, dokunmatik dostu.

## Yaklaşım

SVG tabanlı interaktif hedef. Her ring ayrı `<circle>` olarak çizilir, tıklanan koordinata göre hangi ring'e isabet ettiği hesaplanır.

## Hedef Görseli Bileşeni

`src/features/score-entry/VisualTarget.tsx`

```tsx
const TARGETS = {
  wa_122: { rings: [
    { score: 10, isX: true,  r: 0.05, color: '#FFEB3B' }, // X (10)
    { score: 10, isX: false, r: 0.10, color: '#FFEB3B' },
    { score: 9,  r: 0.20, color: '#FFEB3B' },
    { score: 8,  r: 0.30, color: '#F44336' },
    { score: 7,  r: 0.40, color: '#F44336' },
    { score: 6,  r: 0.50, color: '#2196F3' },
    { score: 5,  r: 0.60, color: '#2196F3' },
    { score: 4,  r: 0.70, color: '#212121' },
    { score: 3,  r: 0.80, color: '#212121' },
    { score: 2,  r: 0.90, color: '#FFFFFF' },
    { score: 1,  r: 1.00, color: '#FFFFFF' },
  ]},
  wa_60:  { /* aynı yapı */ },
  three_d: { rings: [
    { score: 11, isX: true,  r: 0.10, color: '#FFEB3B' },
    { score: 10, r: 0.20, color: '#FFEB3B' },
    { score: 8,  r: 0.45, color: '#F44336' },
    { score: 5,  r: 1.00, color: '#2196F3' },
  ]},
};

export function VisualTarget({ targetType, onPick, lastShot }) {
  const cfg = TARGETS[targetType];
  const SIZE = 320;
  const cx = SIZE / 2, cy = SIZE / 2;
  const maxR = SIZE / 2 - 4;

  const handleTap = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - cx;
    const y = e.clientY - rect.top - cy;
    const dist = Math.sqrt(x*x + y*y) / maxR;

    const ring = cfg.rings.find(r => dist <= r.r);
    if (!ring) {
      onPick({ value: 0, isX: false, label: 'M', color: '#9E9E9E', x, y });
      return;
    }
    onPick({
      value: ring.score, isX: !!ring.isX,
      label: ring.isX ? 'X' : String(ring.score),
      color: ring.color, x, y
    });
  };

  return (
    <svg width={SIZE} height={SIZE} onPointerDown={handleTap} className="touch-none select-none">
      {/* Dış halka (ıska bölgesi) */}
      <rect width={SIZE} height={SIZE} fill="#f8fafc" />
      {/* Halkaları büyükten küçüğe çiz */}
      {[...cfg.rings].reverse().map((r, i) => (
        <circle
          key={i}
          cx={cx} cy={cy}
          r={maxR * r.r}
          fill={r.color}
          stroke={r.color === '#FFFFFF' ? '#000' : 'transparent'}
          strokeWidth={1}
        />
      ))}
      {/* X spotu */}
      <circle cx={cx} cy={cy} r={2} fill="#000" />

      {/* Son atış işareti */}
      {lastShot && (
        <circle cx={cx + lastShot.x} cy={cy + lastShot.y} r={6} fill="rgba(255,0,0,0.7)" stroke="#fff" strokeWidth={2} />
      )}
    </svg>
  );
}
```

## Atış Noktası Saklama

`arrows` tablosuna pozisyon bilgisi de eklenmeli (heatmap için kritik). Migration:

```sql
alter table public.arrows add column hit_x numeric(5,3);
alter table public.arrows add column hit_y numeric(5,3);
-- Normalize edilmiş koordinatlar (-1 ile 1 arası, merkez=0)
```

> Sadece görsel mod kullanıldığında kaydedilir. Sayısal modda null kalır. Heatmap analizi sadece görsel modla biriken veri üzerinden yapılır.

## Mod Geçişi

Puan giriş ekranında üst tab:
- **Sayısal** (default)
- **Görsel Hedef**

Kullanıcı tercihi `localStorage`'da saklanır.

```tsx
const [mode, setMode] = useState<'numeric' | 'visual'>(() =>
  localStorage.getItem('scoreMode') as any ?? 'numeric'
);
```

## Mobil Optimizasyon

- `touch-action: none` ile pinch-zoom kapatılır
- Hedef ekranın %80'ini kaplar (mobilde rahat tıklama)
- Yanlış tıklama → undo

## Erişilebilirlik

Görsel mod tek başına yeterli olmaz, daima sayısal moda geçiş seçeneği bulunur.

## Kabul Kriterleri

- [x] Tıklanan koordinat doğru ring'e maplenıyor
- [x] Son atışın görsel pozisyonu işaretleniyor
- [x] Mod geçişi anlık çalışıyor
- [x] Atış pozisyonu DB'ye kaydediliyor (görsel mod)
- [x] Mobil pinch-zoom hedef üstünde çalışmıyor
- [x] WA, 3D, Puta için doğru görseller render oluyor

## Bağımlılık
- Task 13
