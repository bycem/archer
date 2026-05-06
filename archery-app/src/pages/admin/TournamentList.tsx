import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../../api/client';
import { useDebounce } from '../../hooks/useDebounce';
import {
  AGE_GROUPS,
  AGE_GROUP_LABELS,
  BOW_LABELS,
  BOW_TYPES,
  TARGET_LABELS,
} from '../../lib/archery/constants';
import type { Tournament, TournamentListResponse, TournamentStatus } from '../../types/tournament';

const STATUS_LABELS: Record<TournamentStatus, string> = {
  active: 'Aktif',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
};

const STATUS_BADGE: Record<TournamentStatus, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-slate-200 text-slate-700',
  cancelled: 'bg-red-100 text-red-700',
};

const PAGE_SIZE = 20;

interface Filters {
  q: string;
  status: string;
  age_group: string;
  bow_type: string;
  from: string;
  to: string;
  page: number;
}

function readFilters(sp: URLSearchParams): Filters {
  return {
    q: sp.get('q') ?? '',
    status: sp.get('status') ?? '',
    age_group: sp.get('age_group') ?? '',
    bow_type: sp.get('bow_type') ?? '',
    from: sp.get('from') ?? '',
    to: sp.get('to') ?? '',
    page: Math.max(1, parseInt(sp.get('page') ?? '1', 10) || 1),
  };
}

function writeFilters(filters: Filters): URLSearchParams {
  const sp = new URLSearchParams();
  if (filters.q) sp.set('q', filters.q);
  if (filters.status) sp.set('status', filters.status);
  if (filters.age_group) sp.set('age_group', filters.age_group);
  if (filters.bow_type) sp.set('bow_type', filters.bow_type);
  if (filters.from) sp.set('from', filters.from);
  if (filters.to) sp.set('to', filters.to);
  if (filters.page > 1) sp.set('page', String(filters.page));
  return sp;
}

export default function TournamentList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initial = useMemo(() => readFilters(searchParams), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [filters, setFilters] = useState<Filters>(initial);
  const debouncedQ = useDebounce(filters.q, 300);

  const [data, setData] = useState<TournamentListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // URL'i state ile senkronla (q için debounce kullanmadan; her tuş vuruşunda da URL güncellenmesi sorun değil)
  useEffect(() => {
    setSearchParams(writeFilters(filters), { replace: true });
  }, [filters, setSearchParams]);

  // Veri çek
  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    api
      .get<TournamentListResponse>('/api/tournaments-list', {
        params: {
          q: debouncedQ || undefined,
          status: filters.status || undefined,
          age_group: filters.age_group || undefined,
          bow_type: filters.bow_type || undefined,
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
        setError(e instanceof ApiError ? e.message : 'Liste yüklenemedi');
      })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [
    debouncedQ,
    filters.status,
    filters.age_group,
    filters.bow_type,
    filters.from,
    filters.to,
    filters.page,
  ]);

  const update = (patch: Partial<Filters>) =>
    setFilters((f) => ({ ...f, ...patch, page: patch.page ?? 1 }));

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Link to="/admin" className="text-sm text-slate-600 underline">
            ← Yönetici Paneli
          </Link>
          <Link
            to="/admin/tournaments/new"
            className="text-sm bg-slate-900 text-white px-3 py-1.5 rounded-md hover:bg-slate-800"
          >
            + Yeni Turnuva
          </Link>
        </div>

        <h1 className="text-2xl font-semibold">Tüm Turnuvalar</h1>

        <div className="bg-white rounded-lg shadow-sm p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <input
            className="input lg:col-span-2"
            placeholder="Turnuva adı ara…"
            value={filters.q}
            onChange={(e) => update({ q: e.target.value })}
          />
          <select
            className="input"
            value={filters.status}
            onChange={(e) => update({ status: e.target.value })}
          >
            <option value="">Tüm durumlar</option>
            <option value="active">Aktif</option>
            <option value="completed">Tamamlandı</option>
            <option value="cancelled">İptal</option>
          </select>
          <select
            className="input"
            value={filters.bow_type}
            onChange={(e) => update({ bow_type: e.target.value })}
          >
            <option value="">Tüm yay tipleri</option>
            {BOW_TYPES.map((b) => (
              <option key={b} value={b}>
                {BOW_LABELS[b]}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={filters.age_group}
            onChange={(e) => update({ age_group: e.target.value })}
          >
            <option value="">Tüm yaş grupları</option>
            {AGE_GROUPS.map((g) => (
              <option key={g} value={g}>
                {AGE_GROUP_LABELS[g]}
              </option>
            ))}
          </select>
          <div className="flex gap-2 lg:col-span-1">
            <input
              type="date"
              className="input"
              value={filters.from}
              onChange={(e) => update({ from: e.target.value })}
              aria-label="Başlangıç tarihi"
            />
            <input
              type="date"
              className="input"
              value={filters.to}
              onChange={(e) => update({ to: e.target.value })}
              aria-label="Bitiş tarihi"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 text-red-700 text-sm p-3">{error}</div>
        )}

        <div className="hidden md:block bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600 text-left">
              <tr>
                <th className="px-3 py-2">Ad</th>
                <th className="px-3 py-2">Tarih</th>
                <th className="px-3 py-2">Yay</th>
                <th className="px-3 py-2">Yaş</th>
                <th className="px-3 py-2">Hedef</th>
                <th className="px-3 py-2">Katılımcı</th>
                <th className="px-3 py-2">Durum</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-slate-500">
                    Yükleniyor…
                  </td>
                </tr>
              )}
              {!loading && data?.items.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-slate-500">
                    Sonuç bulunamadı.
                  </td>
                </tr>
              )}
              {!loading &&
                data?.items.map((t) => <Row key={t.id} t={t} />)}
            </tbody>
          </table>
        </div>

        <div className="md:hidden space-y-3">
          {loading && (
            <div className="bg-white rounded-lg shadow-sm p-4 text-center text-slate-500">
              Yükleniyor…
            </div>
          )}
          {!loading && data?.items.length === 0 && (
            <div className="bg-white rounded-lg shadow-sm p-4 text-center text-slate-500">
              Sonuç bulunamadı.
            </div>
          )}
          {!loading && data?.items.map((t) => <Card key={t.id} t={t} />)}
        </div>

        <Pagination
          page={filters.page}
          totalPages={totalPages}
          total={data?.total ?? 0}
          onChange={(p) => update({ page: p })}
        />
      </div>
    </div>
  );
}

function Row({ t }: { t: Tournament }) {
  return (
    <tr className="border-t border-slate-100 hover:bg-slate-50">
      <td className="px-3 py-2 font-medium">{t.name}</td>
      <td className="px-3 py-2 text-slate-600">{t.date}</td>
      <td className="px-3 py-2 text-slate-600">{BOW_LABELS[t.bow_type]}</td>
      <td className="px-3 py-2 text-slate-600">{AGE_GROUP_LABELS[t.age_group]}</td>
      <td className="px-3 py-2 text-slate-600">
        {TARGET_LABELS[t.target_type]} · {t.distance_meters}m
      </td>
      <td className="px-3 py-2 text-slate-600">{t.participant_count ?? 0}</td>
      <td className="px-3 py-2">
        <span className={`inline-flex px-2 py-0.5 rounded text-xs ${STATUS_BADGE[t.status]}`}>
          {STATUS_LABELS[t.status]}
        </span>
      </td>
      <td className="px-3 py-2 text-right">
        <Link
          to={`/admin/tournaments/${t.id}`}
          className="text-sm text-slate-700 underline"
        >
          Yönet
        </Link>
      </td>
    </tr>
  );
}

function Card({ t }: { t: Tournament }) {
  return (
    <Link
      to={`/admin/tournaments/${t.id}`}
      className="block bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium">{t.name}</div>
        <span
          className={`inline-flex px-2 py-0.5 rounded text-xs ${STATUS_BADGE[t.status]} shrink-0`}
        >
          {STATUS_LABELS[t.status]}
        </span>
      </div>
      <div className="mt-1 text-sm text-slate-500">{t.date}</div>
      <div className="mt-2 text-sm text-slate-600 grid grid-cols-2 gap-x-3 gap-y-1">
        <div>
          <span className="text-slate-400">Yay:</span> {BOW_LABELS[t.bow_type]}
        </div>
        <div>
          <span className="text-slate-400">Yaş:</span> {AGE_GROUP_LABELS[t.age_group]}
        </div>
        <div>
          <span className="text-slate-400">Hedef:</span> {TARGET_LABELS[t.target_type]}
        </div>
        <div>
          <span className="text-slate-400">Katılımcı:</span> {t.participant_count ?? 0}
        </div>
      </div>
    </Link>
  );
}

function Pagination({
  page,
  totalPages,
  total,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onChange: (p: number) => void;
}) {
  return (
    <div className="flex items-center justify-between text-sm text-slate-600">
      <div>
        Toplam: <span className="font-medium">{total}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="px-3 py-1.5 rounded border border-slate-300 bg-white disabled:opacity-40"
        >
          ← Önceki
        </button>
        <span>
          Sayfa <span className="font-medium">{page}</span> / {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          className="px-3 py-1.5 rounded border border-slate-300 bg-white disabled:opacity-40"
        >
          Sonraki →
        </button>
      </div>
    </div>
  );
}
