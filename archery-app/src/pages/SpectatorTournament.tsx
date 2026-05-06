import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import FullScreenSpinner from '../components/FullScreenSpinner';
import {
  AGE_GROUP_LABELS,
  BOW_LABELS,
  TARGET_LABELS,
} from '../lib/archery/constants';
import type { Tournament } from '../types/tournament';

interface ScoreboardRow {
  rank: number;
  participant_id: string;
  user_id: string;
  target_number: string | null;
  name: string | null;
  surname: string | null;
  club: string | null;
  gender: string | null;
  total: number;
  x_count: number;
  ten_count: number;
  nine_count: number;
  set_totals: Record<string, number>;
}

interface ScoreboardResponse {
  tournament: Tournament;
  rows: ScoreboardRow[];
}

interface VerifyResponse {
  kind: 'competitor' | 'spectator';
  tournament: { id: string };
}

const POLL_MS = 5000;
const TV_PAGE_MS = 5000;
const TV_PAGE_SIZE = 10;

const GENDER_LABELS: Record<string, string> = {
  male: 'Erkek',
  female: 'Kadın',
  other: 'Diğer',
};

export default function SpectatorTournament() {
  const params = useParams<{ token?: string; id?: string }>();
  const [tournamentId, setTournamentId] = useState<string | null>(
    params.id ?? null,
  );
  const [verifyError, setVerifyError] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) {
      setTournamentId(params.id);
      return;
    }
    if (!params.token) return;
    let cancelled = false;
    const ctrl = new AbortController();
    api
      .get<VerifyResponse>('/api/qr-verify', {
        params: { token: params.token, kind: 'spectator' },
        signal: ctrl.signal,
      })
      .then((d) => {
        if (cancelled) return;
        setTournamentId(d.tournament.id);
      })
      .catch((e) => {
        if (cancelled) return;
        setVerifyError(
          e instanceof ApiError ? e.message : 'Geçersiz QR token',
        );
      });
    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [params.id, params.token]);

  if (verifyError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-2xl font-semibold text-slate-900">
            Geçersiz veya süresi dolmuş QR
          </h1>
          <p className="text-sm text-slate-500">{verifyError}</p>
        </div>
      </div>
    );
  }

  if (!tournamentId) return <FullScreenSpinner />;

  return <PublicScoreboard tournamentId={tournamentId} />;
}

function PublicScoreboard({ tournamentId }: { tournamentId: string }) {
  const [data, setData] = useState<ScoreboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [tickSeconds, setTickSeconds] = useState(0);
  const [tvMode, setTvMode] = useState(false);
  const [tvOffset, setTvOffset] = useState(0);
  const visibleRef = useRef(true);
  const completedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const scheduleNext = () => {
      if (cancelled || !visibleRef.current) return;
      timer = setTimeout(fetchOnce, POLL_MS);
    };

    const fetchOnce = async () => {
      const ctrl = new AbortController();
      try {
        const res = await api.get<ScoreboardResponse>(
          '/api/tournaments-scoreboard',
          { params: { id: tournamentId }, signal: ctrl.signal },
        );
        if (cancelled) return;
        completedRef.current = res.tournament.status === 'completed';
        setData(res);
        setUpdatedAt(new Date());
        setError(null);
      } catch (e) {
        if ((e as Error).name === 'AbortError' || cancelled) return;
        setError(
          e instanceof ApiError ? e.message : 'Skor tablosu yüklenemedi',
        );
      }
      scheduleNext();
    };

    const onVisibility = () => {
      visibleRef.current = !document.hidden;
      if (visibleRef.current && !timer) void fetchOnce();
    };
    document.addEventListener('visibilitychange', onVisibility);

    void fetchOnce();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [tournamentId]);

  useEffect(() => {
    const t = setInterval(() => {
      if (updatedAt) {
        setTickSeconds(Math.floor((Date.now() - updatedAt.getTime()) / 1000));
      }
    }, 1000);
    return () => clearInterval(t);
  }, [updatedAt]);

  useEffect(() => {
    if (!tvMode || !data || data.rows.length <= TV_PAGE_SIZE) {
      setTvOffset(0);
      return;
    }
    const t = setInterval(() => {
      setTvOffset((o) => {
        const next = o + TV_PAGE_SIZE;
        return next >= data.rows.length ? 0 : next;
      });
    }, TV_PAGE_MS);
    return () => clearInterval(t);
  }, [tvMode, data]);

  const fullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      /* noop */
    }
  };

  if (error && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-xl font-semibold">Skor tablosu yüklenemedi</h1>
          <p className="text-sm text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return <FullScreenSpinner />;

  const { tournament, rows } = data;
  const setNumbers = Array.from(
    { length: tournament.set_count },
    (_, i) => i + 1,
  );

  const visibleRows = tvMode
    ? rows.slice(tvOffset, tvOffset + TV_PAGE_SIZE)
    : rows;

  const fontBase = tvMode ? 'text-2xl' : 'text-sm';
  const cellPad = tvMode ? 'px-3 py-3' : 'px-2 py-2';

  return (
    <div className={`min-h-screen ${tvMode ? 'bg-slate-950 text-white' : 'bg-white text-slate-900'}`}>
      <header
        className={`${tvMode ? 'bg-slate-900 text-white' : 'bg-slate-900 text-white'} px-6 py-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}
      >
        <div>
          <h1 className={`${tvMode ? 'text-5xl' : 'text-2xl sm:text-3xl'} font-bold`}>
            {tournament.name}
          </h1>
          <p className={`${tvMode ? 'text-xl' : 'text-sm'} text-slate-300 mt-1`}>
            {tournament.date} · {BOW_LABELS[tournament.bow_type]} ·{' '}
            {AGE_GROUP_LABELS[tournament.age_group]} ·{' '}
            {TARGET_LABELS[tournament.target_type]} ·{' '}
            {tournament.distance_meters}m
            {tournament.status === 'completed' && (
              <span className="ml-2 inline-block rounded bg-emerald-600 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-white">
                Tamamlandı
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTvMode((v) => !v)}
            className="rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
          >
            {tvMode ? 'Normal Mod' : 'TV Modu'}
          </button>
          <button
            type="button"
            onClick={() => void fullscreen()}
            className="rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
          >
            Tam Ekran
          </button>
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="p-10 text-center text-slate-500">
          Henüz onaylı katılımcı yok.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className={`min-w-full ${fontBase}`}>
            <thead className={tvMode ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'}>
              <tr>
                <th className={`${cellPad} text-left`}>#</th>
                <th className={`${cellPad} text-left`}>Hedef</th>
                <th className={`${cellPad} text-left`}>Sporcu</th>
                <th className={`${cellPad} text-left`}>Kulüp</th>
                <th className={`${cellPad} text-left`}>Cinsiyet</th>
                <th className={`${cellPad} text-right`}>Toplam</th>
                <th className={`${cellPad} text-right`}>X</th>
                <th className={`${cellPad} text-right`}>10</th>
                <th className={`${cellPad} text-right`}>9</th>
                {!tvMode &&
                  setNumbers.map((n) => (
                    <th key={n} className={`${cellPad} text-right`}>
                      S{n}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((r) => {
                const rankClass = tvMode
                  ? r.rank === 1
                    ? 'bg-amber-900/40'
                    : r.rank === 2
                      ? 'bg-slate-700/40'
                      : r.rank === 3
                        ? 'bg-orange-900/40'
                        : ''
                  : r.rank === 1
                    ? 'bg-amber-50'
                    : r.rank === 2
                      ? 'bg-slate-100'
                      : r.rank === 3
                        ? 'bg-orange-50'
                        : '';
                return (
                  <tr
                    key={r.participant_id}
                    className={`border-b ${tvMode ? 'border-slate-800' : 'border-slate-200'} ${rankClass}`}
                  >
                    <td className={`${cellPad} font-bold`}>{r.rank}</td>
                    <td className={cellPad}>{r.target_number ?? '-'}</td>
                    <td className={`${cellPad} whitespace-nowrap`}>
                      {r.name} {r.surname}
                    </td>
                    <td className={cellPad}>{r.club ?? '-'}</td>
                    <td className={cellPad}>
                      {r.gender ? (GENDER_LABELS[r.gender] ?? r.gender) : '-'}
                    </td>
                    <td className={`${cellPad} text-right font-semibold`}>
                      {r.total}
                    </td>
                    <td className={`${cellPad} text-right`}>{r.x_count}</td>
                    <td className={`${cellPad} text-right`}>{r.ten_count}</td>
                    <td className={`${cellPad} text-right`}>{r.nine_count}</td>
                    {!tvMode &&
                      setNumbers.map((n) => (
                        <td key={n} className={`${cellPad} text-right`}>
                          {r.set_totals?.[String(n)] ?? '-'}
                        </td>
                      ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div
        className={`fixed inset-x-0 bottom-0 px-4 py-2 text-center text-xs ${
          tvMode
            ? 'bg-slate-900/90 text-slate-300'
            : 'bg-slate-100 text-slate-600'
        }`}
      >
        {error ? (
          <span className="text-red-500">{error} · </span>
        ) : null}
        {updatedAt
          ? `Son güncelleme: ${tickSeconds}s önce`
          : 'Yükleniyor…'}
        {tvMode && rows.length > TV_PAGE_SIZE && (
          <span className="ml-2 opacity-70">
            · Sayfa {Math.floor(tvOffset / TV_PAGE_SIZE) + 1}/
            {Math.ceil(rows.length / TV_PAGE_SIZE)}
          </span>
        )}
      </div>
    </div>
  );
}
