# Task 13 — Puan Giriş: Sayısal Mod

## Amaç
Hedef tipine göre renklendirilmiş sayısal butonlarla hızlı puan girişi. Mobil dokunmatik için optimize.

## Hedef Tipine Göre Olası Puanlar

```ts
// src/lib/archery/scoring.ts
export type ScoreToken =
  | { value: number; isX: boolean; label: string; color: string };

export function getScoreOptions(targetType: TargetType): ScoreToken[] {
  switch (targetType) {
    case 'wa_122':
    case 'wa_80':
    case 'wa_60':
      return [
        { value: 10, isX: true,  label: 'X',  color: '#FFEB3B' },
        { value: 10, isX: false, label: '10', color: '#FFEB3B' },
        { value: 9,  isX: false, label: '9',  color: '#F44336' },
        { value: 8,  isX: false, label: '8',  color: '#F44336' },
        { value: 7,  isX: false, label: '7',  color: '#2196F3' },
        { value: 6,  isX: false, label: '6',  color: '#2196F3' },
        { value: 5,  isX: false, label: '5',  color: '#212121' },
        { value: 4,  isX: false, label: '4',  color: '#212121' },
        { value: 3,  isX: false, label: '3',  color: '#FFFFFF' },
        { value: 2,  isX: false, label: '2',  color: '#FFFFFF' },
        { value: 1,  isX: false, label: '1',  color: '#FFFFFF' },
        { value: 0,  isX: false, label: 'M',  color: '#9E9E9E' },
      ];

    case 'wa_40': // Compound indoor — tipik 5'ten başlar
      return [
        { value: 10, isX: true,  label: 'X',  color: '#FFEB3B' },
        { value: 10, isX: false, label: '10', color: '#FFEB3B' },
        { value: 9,  isX: false, label: '9',  color: '#F44336' },
        { value: 8,  isX: false, label: '8',  color: '#F44336' },
        { value: 7,  isX: false, label: '7',  color: '#2196F3' },
        { value: 6,  isX: false, label: '6',  color: '#2196F3' },
        { value: 5,  isX: false, label: '5',  color: '#212121' },
        { value: 0,  isX: false, label: 'M',  color: '#9E9E9E' },
      ];

    case 'three_d':
      return [
        { value: 11, isX: true,  label: 'X',  color: '#FFEB3B' },
        { value: 10, isX: false, label: '10', color: '#FFEB3B' },
        { value: 8,  isX: false, label: '8',  color: '#F44336' },
        { value: 5,  isX: false, label: '5',  color: '#2196F3' },
        { value: 0,  isX: false, label: 'M',  color: '#9E9E9E' },
      ];

    case 'puta':
      return [
        { value: 1, isX: false, label: 'Vurdu',   color: '#4CAF50' },
        { value: 0, isX: false, label: 'Vurmadı', color: '#9E9E9E' },
      ];

    case 'meydan':
      // Mesafeye dayalı: serbest sayı girişi (özel UI)
      return [];
  }
}
```

## UI

`src/features/score-entry/NumericPad.tsx`

```tsx
export function NumericPad({
  options, onPick, disabled
}: { options: ScoreToken[]; onPick: (s: ScoreToken) => void; disabled?: boolean }) {
  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
      {options.map((opt, i) => (
        <button
          key={i}
          onClick={() => onPick(opt)}
          disabled={disabled}
          className="aspect-square rounded-xl text-xl font-bold border-2 transition active:scale-95 disabled:opacity-40"
          style={{
            backgroundColor: opt.color,
            color: getContrastColor(opt.color),
            borderColor: opt.color === '#FFFFFF' ? '#212121' : 'transparent',
          }}
          aria-label={opt.label}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
```

## Set Görünümü

```tsx
function SetEntryPanel({ tournament, currentSetNumber, arrows, onPick, onUndo }) {
  const options = getScoreOptions(tournament.target_type);
  const arrowsLeft = tournament.arrows_per_set - arrows.length;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="text-sm text-slate-500">{t('score.set')} {currentSetNumber} / {tournament.set_count}</div>
        <div className="text-xs">{t('score.arrowsLeft')}: {arrowsLeft}</div>
      </div>

      <ArrowsRow arrows={arrows} onRemove={(idx) => onUndo(idx)} />

      <NumericPad options={options} onPick={onPick} disabled={arrowsLeft === 0} />
    </div>
  );
}

function ArrowsRow({ arrows, onRemove }) {
  return (
    <div className="flex justify-center gap-2">
      {arrows.map((a, i) => (
        <button key={i} onClick={() => onRemove(i)} className="w-12 h-12 rounded-full font-bold border-2"
          style={{ backgroundColor: a.color }}>
          {a.label}
          <span className="sr-only">Sil</span>
        </button>
      ))}
    </div>
  );
}
```

## Geri Alma (Undo)

- Atış kaydı tıklanırsa "Sil?" diye onay → siler
- Veya "Geri Al" butonu son atışı siler
- Tüm bunlar **commit öncesi** geçerli

## Erişilebilirlik

- Her butonun `aria-label`'ı puan açıklaması
- Klavye kontrolü: 0–9 tuşları → ilgili puan; X → X; M veya . → ıska; Backspace → undo

```tsx
useEffect(() => {
  const onKey = (e) => {
    if (e.key >= '0' && e.key <= '9') pickByValue(parseInt(e.key));
    if (e.key === 'x' || e.key === 'X') pickX();
    if (e.key === 'Backspace') undo();
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}, []);
```

## Renk Kontrast

```ts
function getContrastColor(hex: string): string {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  const luma = (0.299*r + 0.587*g + 0.114*b) / 255;
  return luma > 0.6 ? '#212121' : '#FFFFFF';
}
```

## Kabul Kriterleri

- [x] Hedef tipine göre doğru puanlar görünüyor
- [x] Renkler WA standardına uygun
- [x] Mobile dokunmatikte rahat (button min 56px)
- [x] Atış sayısı dolunca pad disable oluyor
- [x] Undo / silme çalışıyor
- [x] Klavye kontrolü çalışıyor

## Bağımlılık
- Task 02 (target_type enum)
