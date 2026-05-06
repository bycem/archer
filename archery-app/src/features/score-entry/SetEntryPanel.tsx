import { useEffect, useState } from 'react';
import { NumericPad } from './NumericPad';
import { VisualTarget } from './VisualTarget';
import {
  getContrastColor,
  getScoreOptions,
  pickByDigit,
  pickMiss,
  pickX,
  type ScoreToken,
} from '../../lib/archery/scoring';
import { getTargetDef } from '../../lib/archery/targets';
import type { TargetType } from '../../lib/archery/constants';
import { storage } from '../../lib/storage';

type EntryMode = 'numeric' | 'visual';

const MODE_KEY = 'scoreMode';

function readInitialMode(): EntryMode {
  const v = storage.get(MODE_KEY);
  return v === 'visual' ? 'visual' : 'numeric';
}

interface Props {
  targetType: TargetType;
  setNumber: number;
  totalSets: number;
  arrowsPerSet: number;
  arrows: ScoreToken[];
  onPick: (token: ScoreToken) => void;
  onUndo: (index: number) => void;
}

export function SetEntryPanel({
  targetType,
  setNumber,
  totalSets,
  arrowsPerSet,
  arrows,
  onPick,
  onUndo,
}: Props) {
  const options = getScoreOptions(targetType);
  const arrowsLeft = arrowsPerSet - arrows.length;
  const padDisabled = arrowsLeft <= 0;
  const total = arrows.reduce((sum, a) => sum + a.value, 0);

  const visualSupported = getTargetDef(targetType) !== null;
  const [mode, setMode] = useState<EntryMode>(() => {
    const initial = readInitialMode();
    return initial === 'visual' && visualSupported ? 'visual' : 'numeric';
  });

  useEffect(() => {
    if (mode === 'visual' && !visualSupported) setMode('numeric');
  }, [mode, visualSupported]);

  useEffect(() => {
    storage.set(MODE_KEY, mode);
  }, [mode]);

  useEffect(() => {
    if (mode !== 'numeric') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (padDisabled && e.key !== 'Backspace') return;

      if (e.key >= '0' && e.key <= '9') {
        const t = pickByDigit(options, parseInt(e.key, 10));
        if (t) onPick(t);
        return;
      }
      if (e.key === 'x' || e.key === 'X') {
        const t = pickX(options);
        if (t) onPick(t);
        return;
      }
      if (e.key === 'm' || e.key === 'M' || e.key === '.') {
        const t = pickMiss(options);
        if (t) onPick(t);
        return;
      }
      if (e.key === 'Backspace' && arrows.length > 0) {
        e.preventDefault();
        onUndo(arrows.length - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, options, arrows.length, padDisabled, onPick, onUndo]);

  const guardedPick = (t: ScoreToken) => {
    if (padDisabled) return;
    onPick(t);
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="text-sm text-slate-500">
          Set {setNumber} / {totalSets}
        </div>
        <div className="text-xs text-slate-500">Kalan atış: {arrowsLeft}</div>
      </div>

      <ModeTabs mode={mode} onChange={setMode} visualEnabled={visualSupported} />

      <ArrowsRow arrows={arrows} arrowsPerSet={arrowsPerSet} onRemove={onUndo} />

      <div className="text-center text-sm text-slate-700">
        Set toplamı: <span className="font-semibold">{total}</span>
      </div>

      {mode === 'numeric' || !visualSupported ? (
        <NumericPad options={options} onPick={onPick} disabled={padDisabled} />
      ) : (
        <VisualTarget
          targetType={targetType}
          arrows={arrows}
          onPick={guardedPick}
          disabled={padDisabled}
        />
      )}
    </div>
  );
}

function ModeTabs({
  mode,
  onChange,
  visualEnabled,
}: {
  mode: EntryMode;
  onChange: (m: EntryMode) => void;
  visualEnabled: boolean;
}) {
  const base = 'flex-1 py-2 text-sm font-medium rounded-md transition';
  return (
    <div
      role="tablist"
      aria-label="Puan giriş modu"
      className="flex gap-1 p-1 bg-slate-100 rounded-lg"
    >
      <button
        role="tab"
        aria-selected={mode === 'numeric'}
        type="button"
        onClick={() => onChange('numeric')}
        className={`${base} ${mode === 'numeric' ? 'bg-white shadow text-slate-900' : 'text-slate-600'}`}
      >
        Sayısal
      </button>
      <button
        role="tab"
        aria-selected={mode === 'visual'}
        type="button"
        disabled={!visualEnabled}
        onClick={() => visualEnabled && onChange('visual')}
        className={`${base} ${
          mode === 'visual' && visualEnabled
            ? 'bg-white shadow text-slate-900'
            : 'text-slate-600'
        } ${!visualEnabled ? 'opacity-40 cursor-not-allowed' : ''}`}
        title={visualEnabled ? undefined : 'Bu hedef tipinde görsel mod yok'}
      >
        Görsel Hedef
      </button>
    </div>
  );
}

function ArrowsRow({
  arrows,
  arrowsPerSet,
  onRemove,
}: {
  arrows: ScoreToken[];
  arrowsPerSet: number;
  onRemove: (index: number) => void;
}) {
  const slots = Array.from({ length: arrowsPerSet }, (_, i) => arrows[i]);
  return (
    <div className="flex justify-center gap-2 flex-wrap">
      {slots.map((a, i) =>
        a ? (
          <button
            key={i}
            type="button"
            onClick={() => onRemove(i)}
            aria-label={`Atış ${i + 1}: ${a.label} (sil)`}
            className="w-12 h-12 rounded-full font-bold border-2 active:scale-95 transition"
            style={{
              backgroundColor: a.color,
              color: getContrastColor(a.color),
              borderColor: a.color === '#FFFFFF' ? '#212121' : 'transparent',
            }}
            title="Sil"
          >
            {a.label}
          </button>
        ) : (
          <div
            key={i}
            aria-hidden
            className="w-12 h-12 rounded-full border-2 border-dashed border-slate-300"
          />
        ),
      )}
    </div>
  );
}
