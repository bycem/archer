import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import FullScreenSpinner from '../components/FullScreenSpinner';
import { useAuth } from '../store/authStore';
import { AGE_GROUP_LABELS, BOW_LABELS, TARGET_LABELS } from '../lib/archery/constants';
import type { Tournament } from '../types/tournament';

interface ActiveParticipation {
  participation_id: string;
  tournament_id: string;
  participation_status: 'approved' | 'pending';
  target_number: string | null;
  club_override: string | null;
  tournament: Tournament;
}

interface ActiveResponse {
  items: ActiveParticipation[];
}

export default function Home() {
  const { profile, signOut } = useAuth();
  const [items, setItems] = useState<ActiveParticipation[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    api
      .get<ActiveResponse>('/api/participants-active', { signal: ctrl.signal })
      .then((r) => setItems(r.items))
      .catch((e) => {
        if ((e as Error).name === 'AbortError') return;
        setError(e instanceof ApiError ? e.message : 'Yüklenemedi');
      });
    return () => ctrl.abort();
  }, []);

  if (items === null && !error) return <FullScreenSpinner />;

  const approved = items?.filter((i) => i.participation_status === 'approved') ?? [];
  const pending = items?.filter((i) => i.participation_status === 'pending') ?? [];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto p-4 sm:p-6">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">
              Hoş geldin{profile?.name ? `, ${profile.name}` : ''}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">Aktif turnuvaların aşağıda</p>
          </div>
          <button onClick={() => void signOut()} className="text-sm text-slate-500 underline">
            Çıkış
          </button>
        </header>

        {error && (
          <div className="rounded-md bg-red-50 text-red-700 text-sm p-3 mb-4">{error}</div>
        )}

        {approved.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
              Devam Eden Turnuvalar
            </h2>
            <ul className="space-y-3">
              {approved.map((item) => (
                <TournamentCard key={item.participation_id} item={item} />
              ))}
            </ul>
          </section>
        )}

        {pending.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
              Onay Bekleyenler
            </h2>
            <ul className="space-y-3">
              {pending.map((item) => (
                <PendingCard key={item.participation_id} item={item} />
              ))}
            </ul>
          </section>
        )}

        {items?.length === 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500 mb-6">
            <p className="font-medium">Aktif turnuvan yok</p>
            <p className="text-sm mt-1">Katılmak için yöneticiden QR kod tara.</p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 mt-2">
          <Link
            to="/profile/tournaments"
            className="block rounded-lg border border-slate-200 bg-white p-4 hover:shadow-sm transition"
          >
            <div className="font-semibold">Geçmiş Turnuvalarım</div>
            <div className="text-sm text-slate-500 mt-1">Sıralaman, puanların ve analizler.</div>
          </Link>
          <Link
            to="/settings"
            className="block rounded-lg border border-slate-200 bg-white p-4 hover:shadow-sm transition"
          >
            <div className="font-semibold">Ayarlar</div>
            <div className="text-sm text-slate-500 mt-1">Dil, yay tipi ve profil bilgileri.</div>
          </Link>
        </div>
      </div>
    </div>
  );
}

function TournamentCard({ item }: { item: ActiveParticipation }) {
  const t = item.tournament;
  return (
    <li>
      <Link
        to={`/tournament/${item.tournament_id}/score`}
        className="block rounded-lg border border-slate-200 bg-white p-4 hover:shadow-sm transition"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="font-semibold">{t.name}</div>
          <span className="shrink-0 text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5 font-medium">
            Aktif
          </span>
        </div>
        <div className="text-sm text-slate-500 mt-1">
          {t.date} · {BOW_LABELS[t.bow_type]} · {AGE_GROUP_LABELS[t.age_group]}
        </div>
        <div className="text-sm text-slate-500">
          {TARGET_LABELS[t.target_type]} · {t.distance_meters}m · {t.set_count} set ×{' '}
          {t.arrows_per_set} atış
        </div>
        {item.target_number && (
          <div className="mt-2 text-xs text-slate-600">
            Hedef: <span className="font-mono font-semibold">{item.target_number}</span>
          </div>
        )}
      </Link>
    </li>
  );
}

function PendingCard({ item }: { item: ActiveParticipation }) {
  const t = item.tournament;
  return (
    <li className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="font-semibold">{t.name}</div>
        <span className="shrink-0 text-xs bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 font-medium">
          Onay Bekliyor
        </span>
      </div>
      <div className="text-sm text-slate-500 mt-1">
        {t.date} · {BOW_LABELS[t.bow_type]} · {AGE_GROUP_LABELS[t.age_group]}
      </div>
      {item.target_number && (
        <div className="mt-2 text-xs text-slate-600">
          Hedef: <span className="font-mono font-semibold">{item.target_number}</span>
        </div>
      )}
      <p className="text-xs text-amber-700 mt-2">Yönetici onayı bekleniyor…</p>
    </li>
  );
}
