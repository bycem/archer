import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../../api/client';
import FullScreenSpinner from '../../components/FullScreenSpinner';
import {
  AGE_GROUP_LABELS,
  BOW_LABELS,
  TARGET_LABELS,
} from '../../lib/archery/constants';
import {
  getContrastColor,
  getScoreOptions,
  type ScoreToken,
} from '../../lib/archery/scoring';
import type { Tournament } from '../../types/tournament';

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

interface ParticipantArrow {
  id: string;
  arrow_number: number;
  score_value: number;
  is_x: boolean;
  hit_x: number | null;
  hit_y: number | null;
}

interface ParticipantSet {
  id: string;
  set_number: number;
  is_committed: boolean;
  committed_at: string | null;
  total: number;
  arrows: ParticipantArrow[];
}

interface ParticipantUser {
  name: string | null;
  surname: string | null;
  club: string | null;
  gender: string | null;
}

interface ParticipantTournament {
  id: string;
  name: string;
  target_type: Tournament['target_type'];
  set_count: number;
  arrows_per_set: number;
  status: Tournament['status'];
}

interface ParticipantDetail {
  id: string;
  target_number: string | null;
  user_id: string;
  tournament_id: string;
  status: string;
  users: ParticipantUser | null;
  tournaments: ParticipantTournament;
}

interface ParticipantSetsResponse {
  participant: ParticipantDetail;
  sets: ParticipantSet[];
}

const POLL_MS = 7000;

export default function AdminScoreboard() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ScoreboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [openParticipant, setOpenParticipant] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const visibleRef = useRef(true);

  const fetchScoreboard = useCallback(async () => {
    if (!id) return;
    try {
      const res = await api.get<ScoreboardResponse>('/api/tournaments-scoreboard', {
        params: { id },
      });
      setData(res);
      setUpdatedAt(new Date());
      setError(null);
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      setError(e instanceof ApiError ? e.message : 'Skor tablosu yüklenemedi');
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      if (cancelled) return;
      await fetchScoreboard();
      if (!cancelled && visibleRef.current) {
        timer = setTimeout(tick, POLL_MS);
      }
    };

    const onVisibility = () => {
      visibleRef.current = !document.hidden;
      if (visibleRef.current && !timer) void tick();
    };
    document.addEventListener('visibilitychange', onVisibility);

    void tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [id, fetchScoreboard]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

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
  const setNumbers = Array.from({ length: tournament.set_count }, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Link
            to={`/admin/tournaments/${tournament.id}`}
            className="text-sm text-slate-600 underline"
          >
            ← Turnuva detayı
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
          <h1 className="text-2xl font-semibold">{tournament.name} — Yönetici Skor</h1>
          <p className="mt-1 text-sm text-slate-500">
            {tournament.date} · {BOW_LABELS[tournament.bow_type]} ·{' '}
            {AGE_GROUP_LABELS[tournament.age_group]} ·{' '}
            {TARGET_LABELS[tournament.target_type]} · {tournament.distance_meters}m ·{' '}
            {tournament.set_count} set × {tournament.arrows_per_set} atış
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Sporcu satırına tıklayarak puan düzeltebilirsiniz.
          </p>
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
                {rows.map((r) => (
                  <tr
                    key={r.participant_id}
                    onClick={() => setOpenParticipant(r.participant_id)}
                    className="border-b last:border-b-0 cursor-pointer hover:bg-slate-50"
                  >
                    <td className="px-2 py-2 font-bold sticky-col">{r.rank}</td>
                    <td className="px-2 py-2">{r.target_number ?? '-'}</td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      {r.name} {r.surname}
                    </td>
                    <td className="px-2 py-2">{r.club ?? '-'}</td>
                    <td className="px-2 py-2 text-right font-semibold">{r.total}</td>
                    <td className="px-2 py-2 text-right">{r.x_count}</td>
                    <td className="px-2 py-2 text-right">{r.ten_count}</td>
                    <td className="px-2 py-2 text-right">{r.nine_count}</td>
                    {setNumbers.map((n) => (
                      <td key={n} className="px-2 py-2 text-right">
                        {r.set_totals?.[String(n)] ?? '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {error && data && <p className="text-xs text-red-600">{error}</p>}
      </div>

      {openParticipant && (
        <ParticipantEditDrawer
          participantId={openParticipant}
          onClose={() => {
            setOpenParticipant(null);
            void fetchScoreboard();
          }}
          onEdited={(msg) => {
            setToast(msg);
            void fetchScoreboard();
          }}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-md bg-slate-900 text-white text-sm px-4 py-2 shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function ParticipantEditDrawer({
  participantId,
  onClose,
  onEdited,
}: {
  participantId: string;
  onClose: () => void;
  onEdited: (msg: string) => void;
}) {
  const [detail, setDetail] = useState<ParticipantSetsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const res = await api.get<ParticipantSetsResponse>('/api/participants-sets', {
        params: { participant_id: participantId },
      });
      setDetail(res);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Detay yüklenemedi');
    }
  }, [participantId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleSave = async (arrow: ParticipantArrow, picked: ScoreToken) => {
    const reason = window.prompt(
      'Düzeltme nedeni (zorunlu, en az 3 karakter):',
      '',
    );
    if (reason === null) return;
    const trimmed = reason.trim();
    if (trimmed.length < 3) {
      window.alert('Düzeltme nedeni en az 3 karakter olmalı.');
      return;
    }
    try {
      await api.post('/api/scores-admin-edit', {
        arrow_id: arrow.id,
        score_value: picked.value,
        is_x: picked.isX,
        reason: trimmed,
      });
      await reload();
      onEdited(`Atış ${arrow.arrow_number} güncellendi`);
    } catch (e) {
      window.alert(e instanceof ApiError ? e.message : 'Güncellenemedi');
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex">
      <div
        className="flex-1 bg-slate-900/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-modal="true"
        className="w-full max-w-xl bg-white h-full overflow-y-auto shadow-xl"
      >
        <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <div>
            {detail ? (
              <>
                <h2 className="text-lg font-semibold">
                  {detail.participant.users?.name} {detail.participant.users?.surname}
                </h2>
                <p className="text-xs text-slate-500">
                  Hedef: {detail.participant.target_number ?? '-'} ·{' '}
                  {detail.participant.users?.club ?? 'Kulüpsüz'}
                </p>
              </>
            ) : (
              <h2 className="text-lg font-semibold">Yükleniyor…</h2>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-900 text-xl leading-none px-2"
            aria-label="Kapat"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="m-4 rounded-md bg-red-50 text-red-700 text-sm p-3">{error}</div>
        )}

        {detail && (
          <div className="p-4 space-y-3">
            {detail.sets.map((s) => (
              <SetEditCard
                key={s.id}
                set={s}
                targetType={detail.participant.tournaments.target_type}
                onPick={handleSave}
              />
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}

function SetEditCard({
  set,
  targetType,
  onPick,
}: {
  set: ParticipantSet;
  targetType: Tournament['target_type'];
  onPick: (arrow: ParticipantArrow, token: ScoreToken) => void | Promise<void>;
}) {
  return (
    <div className="border border-slate-200 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-sm">
          Set {set.set_number}{' '}
          {set.is_committed ? (
            <span className="ml-1 text-[11px] uppercase tracking-wide text-emerald-700">
              kayıtlı
            </span>
          ) : (
            <span className="ml-1 text-[11px] uppercase tracking-wide text-slate-400">
              bekliyor
            </span>
          )}
        </span>
        <span className="text-sm">
          Toplam: <span className="font-semibold">{set.total}</span>
        </span>
      </div>
      {set.arrows.length === 0 ? (
        <p className="text-xs text-slate-400">Atış yok.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {set.arrows.map((a) => (
            <ArrowEditor key={a.id} arrow={a} targetType={targetType} onPick={onPick} />
          ))}
        </div>
      )}
    </div>
  );
}

function ArrowEditor({
  arrow,
  targetType,
  onPick,
}: {
  arrow: ParticipantArrow;
  targetType: Tournament['target_type'];
  onPick: (arrow: ParticipantArrow, token: ScoreToken) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const options = getScoreOptions(targetType);

  const currentLabel = arrow.is_x
    ? 'X'
    : arrow.score_value === 0
      ? 'M'
      : String(arrow.score_value);
  const currentColor =
    options.find((o) => o.value === arrow.score_value && o.isX === arrow.is_x)?.color ??
    options.find((o) => o.value === arrow.score_value && !o.isX)?.color ??
    '#9E9E9E';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-12 h-12 rounded-full font-bold border-2 border-slate-300 text-base"
        style={{ backgroundColor: currentColor, color: getContrastColor(currentColor) }}
        title={`Atış ${arrow.arrow_number}`}
      >
        {currentLabel}
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute z-20 left-1/2 -translate-x-1/2 mt-2 bg-white border border-slate-200 rounded-lg shadow-lg p-2 grid grid-cols-4 gap-1.5 w-[14rem]">
            {options.map((o) => (
              <button
                key={`${o.value}-${o.isX}-${o.label}`}
                type="button"
                onClick={async () => {
                  setOpen(false);
                  await onPick(arrow, o);
                }}
                className="w-10 h-10 rounded-full text-sm font-semibold border border-slate-300"
                style={{ backgroundColor: o.color, color: getContrastColor(o.color) }}
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
