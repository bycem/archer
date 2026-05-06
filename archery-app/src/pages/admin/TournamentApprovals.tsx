import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../../api/client';
import { BOW_LABELS, type BowType } from '../../lib/archery/constants';

interface PendingUser {
  id: string;
  name: string | null;
  surname: string | null;
  gender: 'male' | 'female' | 'other' | null;
  club: string | null;
  age: number | null;
  bow_type: BowType | null;
}

interface PendingParticipant {
  id: string;
  tournament_id: string;
  target_number: string;
  club_override: string | null;
  status: 'pending';
  joined_at: string;
  user: PendingUser | null;
}

const POLL_MS = 5000;
const GENDER_LABELS: Record<NonNullable<PendingUser['gender']>, string> = {
  male: 'Erkek',
  female: 'Kadın',
  other: 'Diğer',
};

export default function TournamentApprovals() {
  const { id } = useParams<{ id: string }>();
  const [items, setItems] = useState<PendingParticipant[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!id) return;
      try {
        const data = await api.get<{ items: PendingParticipant[] }>(
          '/api/tournaments-pending',
          { params: { tournament_id: id }, signal },
        );
        if (!mounted.current) return;
        setItems(data.items);
        setError(null);
      } catch (e) {
        if ((e as Error).name === 'AbortError' || !mounted.current) return;
        setError(e instanceof ApiError ? e.message : 'Yüklenemedi');
      }
    },
    [id],
  );

  useEffect(() => {
    if (!id) return;
    const ctrl = new AbortController();
    void load(ctrl.signal);
    const timer = setInterval(() => void load(), POLL_MS);
    return () => {
      ctrl.abort();
      clearInterval(timer);
    };
  }, [id, load]);

  const act = async (pid: string, kind: 'approve' | 'reject') => {
    setBusy((b) => ({ ...b, [pid]: true }));
    setItems((prev) => prev?.filter((p) => p.id !== pid) ?? prev);
    try {
      await api.post(
        kind === 'approve' ? '/api/participants-approve' : '/api/participants-reject',
        { participant_id: pid },
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'İşlem başarısız');
      void load();
    } finally {
      setBusy((b) => {
        const { [pid]: _omit, ...rest } = b;
        return rest;
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-4">
        <Link
          to={id ? `/admin/tournaments/${id}` : '/admin/tournaments'}
          className="text-sm text-slate-600 underline"
        >
          ← Turnuva
        </Link>

        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl font-semibold">Katılım Onayları</h1>
          {items && (
            <span className="text-sm text-slate-500">
              {items.length} bekleyen
            </span>
          )}
        </div>

        {error && (
          <div className="rounded-md bg-red-50 text-red-700 text-sm p-3">{error}</div>
        )}

        {items === null && !error && (
          <p className="text-sm text-slate-500">Yükleniyor…</p>
        )}

        {items && items.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-500">
            Bekleyen katılım talebi yok.
          </div>
        )}

        {items && items.length > 0 && (
          <ul className="space-y-3">
            {items.map((p) => {
              const u = p.user;
              const fullName = [u?.name, u?.surname].filter(Boolean).join(' ') || '—';
              const club = p.club_override ?? u?.club ?? '-';
              const meta: string[] = [];
              if (u?.gender) meta.push(GENDER_LABELS[u.gender]);
              if (u?.age) meta.push(`${u.age} yaş`);
              if (u?.bow_type) meta.push(BOW_LABELS[u.bow_type]);
              return (
                <li
                  key={p.id}
                  className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="font-semibold">{fullName}</div>
                    <div className="text-sm text-slate-600">
                      Hedef: <span className="font-mono">{p.target_number}</span>
                      {' · '}Kulüp: {club}
                    </div>
                    {meta.length > 0 && (
                      <div className="text-xs text-slate-500">{meta.join(' · ')}</div>
                    )}
                    <div className="text-xs text-slate-400">
                      {new Date(p.joined_at).toLocaleString('tr-TR')}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={!!busy[p.id]}
                      onClick={() => void act(p.id, 'reject')}
                      className="px-3 py-1.5 text-sm rounded-md border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      Reddet
                    </button>
                    <button
                      type="button"
                      disabled={!!busy[p.id]}
                      onClick={() => void act(p.id, 'approve')}
                      className="px-3 py-1.5 text-sm rounded-md bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      Onayla
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
