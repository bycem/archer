import { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api, ApiError } from '../api/client';
import {
  BOW_LABELS,
  BOW_TYPES,
  TARGET_LABELS,
  TARGET_TYPES,
  type BowType,
  type TargetType,
} from '../lib/archery/constants';

interface ProgressRow {
  tournament_id: string;
  tournament_name: string;
  date: string;
  total: number;
  x_count: number;
  ten_count: number;
  nine_count: number;
  arrow_count: number;
  avg_per_arrow: number;
  target_type: TargetType;
  bow_type: BowType;
  distance_meters: number;
  x_ratio: number;
  yellow_ratio: number;
}

type Metric = 'total' | 'avg_per_arrow' | 'x_ratio' | 'yellow_ratio';

const METRIC_LABELS: Record<Metric, string> = {
  total: 'Toplam Puan',
  avg_per_arrow: 'Ortalama / Atış',
  x_ratio: 'X Oranı',
  yellow_ratio: 'Sarı (9-10-X) Oranı',
};

const METRIC_STROKES: Record<Metric, string> = {
  total: '#2563eb',
  avg_per_arrow: '#16a34a',
  x_ratio: '#f59e0b',
  yellow_ratio: '#dc2626',
};

interface Filters {
  from: string;
  to: string;
  bow: '' | BowType;
  target: '' | TargetType;
}

interface Props {
  from: string;
  to: string;
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
}

function formatLongDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function pickAutoFormat(rows: ProgressRow[]): {
  bow: BowType | '';
  target: TargetType | '';
} {
  if (rows.length === 0) return { bow: '', target: '' };
  const counts = new Map<string, number>();
  for (const r of rows) {
    const key = `${r.bow_type}|${r.target_type}`;
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

export default function ProgressChart({ from, to }: Props) {
  const [allRows, setAllRows] = useState<ProgressRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    from,
    to,
    bow: '',
    target: '',
  });
  const [metric, setMetric] = useState<Metric>('total');
  const [autoApplied, setAutoApplied] = useState(false);

  // Refetch unfiltered (date-only) whenever date range changes — used to
  // auto-pick the user's most frequent format the first time around.
  useEffect(() => {
    setFilters((f) => ({ ...f, from, to }));
  }, [from, to]);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    api
      .get<{ rows: ProgressRow[] }>('/api/profile-progress', {
        params: {
          from: filters.from || undefined,
          to: filters.to || undefined,
          bow_type: filters.bow || undefined,
          target_type: filters.target || undefined,
        },
        signal: ctrl.signal,
      })
      .then((res) => {
        setAllRows(res.rows);
        if (!autoApplied && filters.bow === '' && filters.target === '') {
          const auto = pickAutoFormat(res.rows);
          if (auto.bow && auto.target) {
            setFilters((f) => ({ ...f, bow: auto.bow, target: auto.target }));
            setAutoApplied(true);
          } else {
            setAutoApplied(true);
          }
        }
      })
      .catch((e) => {
        if ((e as Error).name === 'AbortError') return;
        setError(e instanceof ApiError ? e.message : 'Yüklenemedi');
      })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [filters, autoApplied]);

  const chartData = useMemo(() => {
    if (!allRows) return [];
    return allRows.map((r) => ({
      ...r,
      // Recharts needs a numeric Y for the active metric.
      yValue: metric === 'total'
        ? r.total
        : metric === 'avg_per_arrow'
          ? r.avg_per_arrow
          : metric === 'x_ratio'
            ? Number((r.x_ratio * 100).toFixed(2))
            : Number((r.yellow_ratio * 100).toFixed(2)),
    }));
  }, [allRows, metric]);

  const yUnit = metric === 'x_ratio' || metric === 'yellow_ratio' ? '%' : '';

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Gelişim Grafiği</h2>
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

      <div className="flex flex-wrap gap-1 text-sm">
        {(Object.keys(METRIC_LABELS) as Metric[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMetric(m)}
            className={
              'px-3 py-1.5 rounded border transition ' +
              (metric === m
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-slate-300 hover:bg-slate-100')
            }
          >
            {METRIC_LABELS[m]}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading && !allRows && (
        <div className="h-[300px] flex items-center justify-center text-sm text-slate-500">
          Yükleniyor…
        </div>
      )}

      {!loading && allRows && allRows.length === 0 && (
        <div className="h-[200px] flex items-center justify-center text-sm text-slate-500 text-center px-4">
          Bu filtrelerde gösterilecek bir turnuva geçmişi yok. Bir turnuvaya
          katılarak başla!
        </div>
      )}

      {allRows && allRows.length > 0 && (
        <div className="w-full" style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 16, left: 0, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tickFormatter={formatShortDate}
                fontSize={12}
                stroke="#64748b"
              />
              <YAxis
                fontSize={12}
                stroke="#64748b"
                tickFormatter={(v: number) => `${v}${yUnit}`}
                domain={
                  metric === 'x_ratio' || metric === 'yellow_ratio'
                    ? [0, 100]
                    : ['auto', 'auto']
                }
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const r = payload[0].payload as ProgressRow & { yValue: number };
                  return (
                    <div className="rounded border border-slate-200 bg-white px-3 py-2 text-xs shadow-md space-y-0.5">
                      <div className="font-semibold text-slate-800">
                        {r.tournament_name}
                      </div>
                      <div className="text-slate-500">
                        {formatLongDate(r.date)}
                      </div>
                      <div className="text-slate-700 pt-1">
                        {METRIC_LABELS[metric]}:{' '}
                        <span className="font-semibold">
                          {(payload[0].value as number).toFixed(
                            metric === 'avg_per_arrow' ? 2 : metric === 'total' ? 0 : 1,
                          )}
                          {yUnit}
                        </span>
                      </div>
                      <div className="text-slate-500">
                        Toplam: {r.total} ({r.x_count}X · {r.ten_count}×10)
                      </div>
                    </div>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="yValue"
                name={METRIC_LABELS[metric]}
                stroke={METRIC_STROKES[metric]}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
