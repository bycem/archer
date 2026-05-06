import { getContrastColor, type ScoreToken } from '../../lib/archery/scoring';

interface Props {
  options: ScoreToken[];
  onPick: (token: ScoreToken) => void;
  disabled?: boolean;
}

export function NumericPad({ options, onPick, disabled }: Props) {
  if (options.length === 0) {
    return (
      <div className="text-sm text-slate-500 text-center">
        Bu hedef tipi için sayısal pad mevcut değil.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
      {options.map((opt, i) => {
        const fg = getContrastColor(opt.color);
        return (
          <button
            key={`${opt.label}-${i}`}
            type="button"
            onClick={() => onPick(opt)}
            disabled={disabled}
            aria-label={opt.label}
            className="aspect-square min-h-14 rounded-xl text-xl font-bold border-2 transition active:scale-95 disabled:opacity-40"
            style={{
              backgroundColor: opt.color,
              color: fg,
              borderColor: opt.color === '#FFFFFF' ? '#212121' : 'transparent',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
