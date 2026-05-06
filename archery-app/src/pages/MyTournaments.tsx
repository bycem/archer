import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import FullScreenSpinner from '../components/FullScreenSpinner';
import ProgressChart from '../components/ProgressChart';
import HeatmapPanel from '../components/HeatmapPanel';
import StatsPanel from '../components/StatsPanel';
import { useAuth } from '../store/authStore';
import {
  AGE_GROUP_LABELS,
  BOW_LABELS,
  TARGET_LABELS,
} from '../lib/archery/constants';
import type { Tournament } from '../types/tournament';

interface Row {
  participant_id: string;
  tournament_id: string;
  tournament: Tournament;
  rank: number | null;
  participant_count: number;
  total: number;
  x_count: number;
  ten_count: number;
  nine_count: number;
}

interface Response {
  rows: Row[];
  page: number;
  pageSize: number;
  total: number;
}

interface Filters {
  from: string;
  to: string;
  page: number;
}

const PAGE_SIZE = 10;
const INITIAL: Filters = { from: '', to: '', page: 1 };
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function readFilters(sp: URLSearchParams): Filters {
  const from = sp.get('from') || '';
  const to = sp.get('to') || '';
  const pageRaw = Number.parseInt(sp.get('page') || '1', 10);
  return {
    from: ISO_DATE.test(from) ? from : '',
    to: ISO_DATE.test(to) ? to : '',
    page: Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1,
  };
}

export default function MyTournaments() {
  const { signOut } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFiltersState] = useState<Filters>(() =>
    readFilters(searchParams),
  );

  const setFilters: React.Dispatch<React.SetStateAction<Filters>> = (next) => {
    setFiltersState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      const params = new URLSearchParams();
      if (value.from) params.set('from', value.from);
      if (value.to) params.set('to', value.to);
      if (value.page > 1) params.set('page', String(value.page));
      setSearchParams(params, { replace: true });
      return value;
    });
  };
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    api
      .get<Response>('/api/profile-tournaments', {
        params: {
          from: filters.from || undefined,
          to: filters.to || undefined,
          page: filters.page,
          pageSize: PAGE_SIZE,
        },
        signal: ctrl.signal,
      })
      .then((res) => setData(res))
      .catch((e) => {
        if ((e as Error).name === 'AbortError') return;
        setError(e instanceof ApiError ? e.message : 'Yüklenemedi');
      })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [filters]);

  const totalPages = useMemo(
    () => (data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1),
    [data],
  );

  const setRange = (from: string, to: string) =>
    setFilters({ from, to, page: 1 });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4">
        <header className="flex items-center justify-between">
          <Link to="/home" className="text-sm text-slate-600 underline">
            ← Geri
          </Link>
          <button
            onClick={() => void signOut()}
            className="text-sm text-slate-600 underline"
          >
            Çıkış
          </button>
        </header>

        <h1 className="text-2xl font-semibold">Geçmiş Turnuvalarım</h1>

        <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-3">
          <div className="flex flex-wrap gap-2 text-sm">
            <button
              type="button"
              onClick={() => setRange(daysAgoISO(30), todayISO())}
              className="px-3 py-1.5 rounded border border-slate-300 hover:bg-slate-100"
            >
              Son 30 gün
            </button>
            <button
              type="button"
              onClick={() => setRange(daysAgoISO(90), todayISO())}
              className="px-3 py-1.5 rounded border border-slate-300 hover:bg-slate-100"
            >
              Son 90 gün
            </button>
            <button
              type="button"
              onClick={() =>
                setRange(`${new Date().getFullYear()}-01-01`, todayISO())
              }
              className="px-3 py-1.5 rounded border border-slate-300 hover:bg-slate-100"
            >
              Bu yıl
            </button>
            <button
              type="button"
              onClick={() => setFilters(INITIAL)}
              className="px-3 py-1.5 rounded border border-slate-300 hover:bg-slate-100"
            >
              Tümü
            </button>
          </div>
          <div className="flex flex-wrap gap-2 items-center text-sm">
            <label className="flex items-center gap-2">
              <span className="text-slate-600">Başlangıç:</span>
              <input
                type="date"
                value={filters.from}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, from: e.target.value, page: 1 }))
                }
                className="border border-slate-300 rounded px-2 py-1"
              />
            </label>
            <label className="flex items-center gap-2">
              <span className="text-slate-600">Bitiş:</span>
              <input
                type="date"
                value={filters.to}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, to: e.target.value, page: 1 }))
                }
                className="border border-slate-300 rounded px-2 py-1"
              />
            </label>
          </div>
        </div>

        <StatsPanel from={filters.from} to={filters.to} />

        <ProgressChart from={filters.from} to={filters.to} />

        <HeatmapPanel from={filters.from} to={filters.to} />

        {loading && !data && <FullScreenSpinner />}

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        {data && data.rows.length === 0 && !loading && (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
            Bu aralıkta katıldığın bir turnuva yok.
          </div>
        )}

        {data && data.rows.length > 0 && (
          <ul className="space-y-2">
            {data.rows.map((row) => {
              const t = row.tournament;
              return (
                <li key={row.participant_id}>
                  <Link
                    to={`/tournament/${row.tournament_id}/scoreboard`}
                    className="block rounded-lg border border-slate-200 bg-white p-4 hover:shadow-sm transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{t.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {t.date} · {BOW_LABELS[t.bow_type]} ·{' '}
                          {AGE_GROUP_LABELS[t.age_group]} ·{' '}
                          {TARGET_LABELS[t.target_type]} · {t.distance_meters}m
                        </div>
                        <div className="text-xs mt-1">
                          <span
                            className={
                              t.status === 'completed'
                                ? 'text-emerald-700'
                                : t.status === 'cancelled'
                                  ? 'text-slate-500'
                                  : 'text-blue-700'
                            }
                          >
                            {t.status === 'completed'
                              ? 'Tamamlandı'
                              : t.status === 'cancelled'
                                ? 'İptal'
                                : 'Devam ediyor'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-2xl font-bold">
                          {row.rank ? `#${row.rank}` : '—'}
                          {row.participant_count > 0 && row.rank && (
                            <span className="text-xs font-normal text-slate-500">
                              {' '}
                              / {row.participant_count}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-slate-700">
                          {row.total}{' '}
                          <span className="text-xs text-slate-500">
                            ({row.x_count}X · {row.ten_count}×10)
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {data && data.total > data.pageSize && (
          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              disabled={filters.page <= 1}
              onClick={() =>
                setFilters((f) => ({ ...f, page: f.page - 1 }))
              }
              className="px-3 py-1.5 rounded border border-slate-300 disabled:opacity-50 hover:bg-slate-100"
            >
              ← Önceki
            </button>
            <span className="text-slate-500">
              Sayfa {data.page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={filters.page >= totalPages}
              onClick={() =>
                setFilters((f) => ({ ...f, page: f.page + 1 }))
              }
              className="px-3 py-1.5 rounded border border-slate-300 disabled:opacity-50 hover:bg-slate-100"
            >
              Sonraki →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
