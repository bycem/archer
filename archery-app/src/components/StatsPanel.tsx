import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
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

interface Stats {
  total_arrows: number;
  total_score: number;
  avg_per_arrow: number;
  x_count: number;
  ten_count: number;
  nine_count: number;
  x_ratio: number;
  gold_ratio: number;
  red_ratio: number;
  miss_count: number;
  by_bow: Record<string, number>;
  by_target: Record<string, number>;
}

interface SetStat {
  set_number: number;
  avg_score: number;
  total: number;
  arrow_count: number;
}

interface Filters {
  bow: '' | BowType;
  target: '' | TargetType;
}

interface Props {
  from: string;
  to: string;
}

function StatBox({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="border border-slate-200 rounded-lg p-3 bg-white">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      {hint && <div className="text-xs text-slate-400 mt-0.5">{hint}</div>}
    </div>
  );
}

export default function StatsPanel({ from, to }: Props) {
  const [stats, updateStats] = useState<Stats | null>(null);
  const [setStats, updateSetStats] = useState<SetStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({ bow: '', target: '' });

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    api
      .get<{ stats: Stats; set_stats: SetStat[] }>('/api/profile-stats', {
        params: {
          from: from || undefined,
          to: to || undefined,
          bow_type: filters.bow || undefined,
          target_type: filters.target || undefined,
        },
        signal: ctrl.signal,
      })
      .then((res) => {
        updateStats(res.stats);
        updateSetStats(res.set_stats);
      })
      .catch((e) => {
        if ((e as Error).name === 'AbortError') return;
        setError(e instanceof ApiError ? e.message : 'Yüklenemedi');
      })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [from, to, filters]);

  const bowEntries = useMemo(
    () => (stats ? Object.entries(stats.by_bow).sort((a, b) => b[1] - a[1]) : []),
    [stats],
  );
  const targetEntries = useMemo(
    () =>
      stats ? Object.entries(stats.by_target).sort((a, b) => b[1] - a[1]) : [],
    [stats],
  );

  const isEmpty = stats !== null && stats.total_arrows === 0;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">İstatistikler</h2>
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
        {(filters.bow || filters.target) && (
          <button
            type="button"
            onClick={() => setFilters({ bow: '', target: '' })}
            className="px-3 py-1 rounded border border-slate-300 hover:bg-slate-100 text-slate-600"
          >
            Filtreleri sıfırla
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading && !stats && (
        <div className="h-[120px] flex items-center justify-center text-sm text-slate-500">
          Yükleniyor…
        </div>
      )}

      {isEmpty && !loading && (
        <div className="rounded border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          Bu filtrelerde istatistik için yeterli atış yok.
        </div>
      )}

      {stats && stats.total_arrows > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatBox label="Toplam Atış" value={stats.total_arrows} />
            <StatBox label="Toplam Puan" value={stats.total_score} />
            <StatBox label="Ortalama / Atış" value={stats.avg_per_arrow} />
            <StatBox
              label="X Sayısı"
              value={stats.x_count}
              hint={`${stats.x_ratio}%`}
            />

            <StatBox label="10 Sayısı" value={stats.ten_count} />
            <StatBox label="9 Sayısı" value={stats.nine_count} />
            <StatBox
              label="Sarı Oranı"
              value={`${stats.gold_ratio}%`}
              hint="9–X"
            />
            <StatBox label="Iska" value={stats.miss_count} />
          </div>

          {bowEntries.length > 0 && (
            <div className="grid md:grid-cols-2 gap-4 pt-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-1">
                  Yay Tipine Göre
                </h3>
                <ul className="text-sm divide-y divide-slate-100">
                  {bowEntries.map(([bow, count]) => (
                    <li
                      key={bow}
                      className="flex justify-between py-1.5 text-slate-700"
                    >
                      <span>{BOW_LABELS[bow as BowType] ?? bow}</span>
                      <span className="font-semibold">{count} atış</span>
                    </li>
                  ))}
                </ul>
              </div>
              {targetEntries.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-1">
                    Hedef Tipine Göre
                  </h3>
                  <ul className="text-sm divide-y divide-slate-100">
                    {targetEntries.map(([target, count]) => (
                      <li
                        key={target}
                        className="flex justify-between py-1.5 text-slate-700"
                      >
                        <span>{TARGET_LABELS[target as TargetType] ?? target}</span>
                        <span className="font-semibold">{count} atış</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {setStats.length > 0 && (
            <div className="pt-2">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">
                Set Bazında Ortalama
              </h3>
              <div className="w-full" style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={setStats}
                    margin={{ top: 10, right: 16, left: 0, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="set_number"
                      fontSize={12}
                      stroke="#64748b"
                      tickFormatter={(v: number) => `Set ${v}`}
                    />
                    <YAxis
                      fontSize={12}
                      stroke="#64748b"
                      domain={[0, 10]}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || payload.length === 0)
                          return null;
                        const r = payload[0].payload as SetStat;
                        return (
                          <div className="rounded border border-slate-200 bg-white px-3 py-2 text-xs shadow-md space-y-0.5">
                            <div className="font-semibold text-slate-800">
                              Set {r.set_number}
                            </div>
                            <div className="text-slate-700">
                              Ortalama:{' '}
                              <span className="font-semibold">
                                {r.avg_score.toFixed(2)}
                              </span>
                            </div>
                            <div className="text-slate-500">
                              Toplam: {r.total} ({r.arrow_count} atış)
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar
                      dataKey="avg_score"
                      fill="#2196F3"
                      isAnimationActive={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
