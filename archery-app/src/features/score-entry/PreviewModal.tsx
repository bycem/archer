import { useEffect } from 'react';
import { getContrastColor, type ScoreToken } from '../../lib/archery/scoring';

interface Props {
  arrows: ScoreToken[];
  setNumber: number;
  totalSets: number;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function PreviewModal({
  arrows,
  setNumber,
  totalSets,
  busy,
  onConfirm,
  onCancel,
}: Props) {
  const sortedSum = [...arrows]
    .sort((a, b) => b.value - a.value)
    .reduce((s, a) => s + a.value, 0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel, busy]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <h2 id="preview-title" className="text-lg font-semibold text-slate-900">
          Set {setNumber} / {totalSets} — Önizleme
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Kaydettikten sonra bu set düzenlenemez (yönetici hariç).
        </p>

        <div className="my-4 flex flex-wrap justify-center gap-2">
          {arrows.map((a, i) => (
            <div
              key={i}
              className="flex h-12 w-12 items-center justify-center rounded-full border-2 font-bold"
              style={{
                backgroundColor: a.color,
                color: getContrastColor(a.color),
                borderColor: a.color === '#FFFFFF' ? '#212121' : 'transparent',
              }}
            >
              {a.label}
            </div>
          ))}
        </div>

        <div className="text-center text-2xl font-bold text-slate-900">
          Toplam: {sortedSum}
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 rounded-md border border-slate-300 bg-white py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Geri
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 rounded-md bg-slate-900 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {busy ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}
