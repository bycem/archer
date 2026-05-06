import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import FullScreenSpinner from '../components/FullScreenSpinner';
import DownloadXlsxButton from '../components/DownloadXlsxButton';
import { useAuth } from '../store/authStore';
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

const POLL_MS = 7000;
const GENDER_LABELS: Record<string, string> = {
  male: 'Erkek',
  female: 'Kadın',
  other: 'Diğer',
};

export default function TournamentScoreboard() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const [data, setData] = useState<ScoreboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const visibleRef = useRef(true);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const scheduleNext = () => {
      if (cancelled || !visibleRef.current || completedRef.current) return;
      timer = setTimeout(fetchOnce, POLL_MS);
    };

    const fetchOnce = async () => {
      const ctrl = new AbortController();
      try {
        const res = await api.get<ScoreboardResponse>(
          '/api/tournaments-scoreboard',
          { params: { id }, signal: ctrl.signal },
        );
        if (cancelled) return;
        completedRef.current = res.tournament.status === 'completed';
        setData(res);
        setUpdatedAt(new Date());
        setError(null);
      } catch (e) {
        if ((e as Error).name === 'AbortError' || cancelled) return;
        setError(e instanceof ApiError ? e.message : 'Skor tablosu yüklenemedi');
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
  }, [id]);

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
  const userIsParticipant = !!profile && rows.some((r) => r.user_id === profile.id);
  const canDownloadOwn = tournament.status === 'completed' && userIsParticipant;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="text-sm text-slate-600 underline">
            ← Geri
          </Link>
          <p className="text-xs text-slate-400">
            {tournament.status === 'completed'
              ? 'Tamamlandı'
              : updatedAt
                ? `Güncellendi: ${updatedAt.toLocaleTimeString()}`
                : ''}
          </p>
        </div>

        <header>
          <h1 className="text-2xl font-semibold">{tournament.name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {tournament.date} · {BOW_LABELS[tournament.bow_type]} ·{' '}
            {AGE_GROUP_LABELS[tournament.age_group]} ·{' '}
            {TARGET_LABELS[tournament.target_type]} ·{' '}
            {tournament.distance_meters}m · {tournament.set_count} set ×{' '}
            {tournament.arrows_per_set} atış
          </p>
          {canDownloadOwn && (
            <div className="mt-3">
              <DownloadXlsxButton
                url={`/api/exports-my-scores?tournament_id=${tournament.id}`}
                filename={`${tournament.name}-${tournament.date}-skorum.xlsx`}
                label="Skorumu Excel olarak indir"
                variant="secondary"
              />
            </div>
          )}
        </header>

        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">Henüz onaylı katılımcı yok.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full text-sm scoreboard">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-2 py-2 text-left sticky-col">#</th>
                  <th className="px-2 py-2 text-left">Hedef</th>
                  <th className="px-2 py-2 text-left">Sporcu</th>
                  <th className="px-2 py-2 text-left">Kulüp</th>
                  <th className="px-2 py-2 text-left">Cinsiyet</th>
                  <th className="px-2 py-2 text-right">Toplam</th>
                  <th className="px-2 py-2 text-right">X</th>
                  <th className="px-2 py-2 text-right">10</th>
                  <th className="px-2 py-2 text-right">9</th>
                  {setNumbers.map((n) => (
                    <th key={n} className="px-2 py-2 text-right">
                      S{n}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const isMe = profile?.id === r.user_id;
                  const rankClass =
                    r.rank === 1
                      ? 'bg-amber-50'
                      : r.rank === 2
                        ? 'bg-slate-100'
                        : r.rank === 3
                          ? 'bg-orange-50'
                          : '';
                  return (
                    <tr
                      key={r.participant_id}
                      className={`border-b last:border-b-0 ${
                        isMe ? 'bg-blue-50 font-medium' : rankClass
                      }`}
                    >
                      <td className="px-2 py-2 font-bold sticky-col">
                        <span
                          className={
                            r.rank === 1
                              ? 'text-amber-600'
                              : r.rank === 2
                                ? 'text-slate-500'
                                : r.rank === 3
                                  ? 'text-orange-600'
                                  : ''
                          }
                        >
                          {r.rank}
                        </span>
                      </td>
                      <td className="px-2 py-2">{r.target_number ?? '-'}</td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        {r.name} {r.surname}
                      </td>
                      <td className="px-2 py-2">{r.club ?? '-'}</td>
                      <td className="px-2 py-2">
                        {r.gender ? (GENDER_LABELS[r.gender] ?? r.gender) : '-'}
                      </td>
                      <td className="px-2 py-2 text-right font-semibold">
                        {r.total}
                      </td>
                      <td className="px-2 py-2 text-right">{r.x_count}</td>
                      <td className="px-2 py-2 text-right">{r.ten_count}</td>
                      <td className="px-2 py-2 text-right">{r.nine_count}</td>
                      {setNumbers.map((n) => (
                        <td key={n} className="px-2 py-2 text-right">
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

        {error && data && (
          <p className="text-xs text-red-600">{error}</p>
        )}
      </div>
    </div>
  );
}
