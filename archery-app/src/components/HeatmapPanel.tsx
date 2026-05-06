import { useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '../api/client';
import {
  BOW_LABELS,
  BOW_TYPES,
  TARGET_LABELS,
  TARGET_TYPES,
  type BowType,
  type TargetType,
} from '../lib/archery/constants';
import Heatmap, { type HeatmapPoint } from './Heatmap';

interface ApiPoint extends HeatmapPoint {
  score_value: number;
  is_x: boolean;
  tournament_id: string;
  target_type: TargetType;
  bow_type: BowType;
  date: string;
}

interface Filters {
  bow: '' | BowType;
  target: '' | TargetType;
}

interface Props {
  from: string;
  to: string;
}

const DEAD_ZONE = 0.05;

function pickAutoFormat(points: ApiPoint[]): {
  bow: BowType | '';
  target: TargetType | '';
} {
  if (points.length === 0) return { bow: '', target: '' };
  const counts = new Map<string, number>();
  for (const p of points) {
    const key = `${p.bow_type}|${p.target_type}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let bestKey = '';
  let bestN = 0;
  for (const [k, n] of counts) {
    if (n > bestN) {
      bestN = n;
      bestKey = k;
    }
  }
  if (!bestKey) return { bow: '', target: '' };
  const [bow, target] = bestKey.split('|');
  return { bow: bow as BowType, target: target as TargetType };
}

export default function HeatmapPanel({ from, to }: Props) {
  const [allPoints, setAllPoints] = useState<ApiPoint[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({ bow: '', target: '' });
  const [autoApplied, setAutoApplied] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    api
      .get<{ points: ApiPoint[] }>('/api/profile-heatmap', {
        params: {
          from: from || undefined,
          to: to || undefined,
        },
        signal: ctrl.signal,
      })
      .then((res) => {
        setAllPoints(res.points);
        if (!autoApplied) {
          const auto = pickAutoFormat(res.points);
          if (auto.bow && auto.target) {
            setFilters({ bow: auto.bow, target: auto.target });
          }
          setAutoApplied(true);
        }
      })
      .catch((e) => {
        if ((e as Error).name === 'AbortError') return;
        setError(e instanceof ApiError ? e.message : 'Yüklenemedi');
      })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [from, to, autoApplied]);

  const filtered = useMemo(() => {
    if (!allPoints) return [];
    return allPoints.filter(
      (p) =>
        (!filters.bow || p.bow_type === filters.bow) &&
        (!filters.target || p.target_type === filters.target),
    );
  }, [allPoints, filters]);

  const activeTarget: TargetType =
    filters.target || filtered[0]?.target_type || 'wa_122';

  const stats = useMemo(() => {
    const total = filtered.length;
    if (total === 0)
      return { total: 0, left: 0, right: 0, top: 0, bottom: 0, avgR: 0 };
    let left = 0,
      right = 0,
      top = 0,
      bottom = 0;
    let sumR = 0;
    for (const p of filtered) {
      if (p.x < -DEAD_ZONE) left += 1;
      if (p.x > DEAD_ZONE) right += 1;
      if (p.y < -DEAD_ZONE) top += 1;
      if (p.y > DEAD_ZONE) bottom += 1;
      sumR += Math.sqrt(p.x * p.x + p.y * p.y);
    }
    return {
      total,
      left,
      right,
      top,
      bottom,
      avgR: sumR / total,
    };
  }, [filtered]);

  const pct = (n: number) =>
    stats.total > 0 ? ((n / stats.total) * 100).toFixed(1) : '0.0';

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Isı Haritası</h2>
      </div>

      <div className="flex flex-wrap gap-2 items-center text-sm">
        <label className="flex items-center gap-2">
          <span className="text-slate-600">Yay:</span>
          <select
            value={filters.bow}
            onChange={(e) =>
              setFilters((f) => ({ ...f, bow: e.target.value as Filters['bow'] }))
            }
            className="border border-slate-300 rounded px-2 py-1 bg-white"
          >
            <option value="">Tümü</option>
            {BOW_TYPES.map((b) => (
              <option key={b} value={b}>
                {BOW_LABELS[b]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span className="text-slate-600">Hedef:</span>
          <select
            value={filters.target}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                target: e.target.value as Filters['target'],
              }))
            }
            className="border border-slate-300 rounded px-2 py-1 bg-white"
          >
            <option value="">Tümü</option>
            {TARGET_TYPES.map((t) => (
              <option key={t} value={t}>
                {TARGET_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading && !allPoints && (
        <div className="h-[200px] flex items-center justify-center text-sm text-slate-500">
          Yükleniyor…
        </div>
      )}

      {allPoints && allPoints.length === 0 && !loading && (
        <div className="rounded border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          Isı haritası için Görsel Hedef modunda atış kaydetmen gerekir. Henüz
          görsel modla girilmiş atışın yok.
        </div>
      )}

      {allPoints && allPoints.length > 0 && filtered.length === 0 && (
        <div className="rounded border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          Bu filtrelerde gösterilecek atış yok.
        </div>
      )}

      {filtered.length > 0 && (
        <div className="grid md:grid-cols-2 gap-6 items-start">
          <div className="flex justify-center">
            <Heatmap targetType={activeTarget} points={filtered} />
          </div>
          <div className="text-sm space-y-2">
            <h3 className="font-semibold text-slate-800">Dağılım</h3>
            <ul className="space-y-1 text-slate-700">
              <li>
                Toplam atış: <span className="font-semibold">{stats.total}</span>
              </li>
              <li>Sol sapma: {pct(stats.left)}%</li>
              <li>Sağ sapma: {pct(stats.right)}%</li>
              <li>Üst sapma: {pct(stats.top)}%</li>
              <li>Alt sapma: {pct(stats.bottom)}%</li>
              <li>
                Ortalama dağılım yarıçapı:{' '}
                <span className="font-semibold">{stats.avgR.toFixed(2)}</span>
                <span className="text-xs text-slate-500"> (0=merkez, 1=kenar)</span>
              </li>
            </ul>
            <p className="text-xs text-slate-500 pt-2">
              Sapma yüzdeleri merkeze ±{DEAD_ZONE} dışındaki atışları sayar.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
