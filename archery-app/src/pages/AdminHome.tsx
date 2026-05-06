import { useEffect, useState } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { useAuth } from '../store/authStore';
import AdminScoreboard from './admin/AdminScoreboard';
import CreateTournament from './admin/CreateTournament';
import TournamentApprovals from './admin/TournamentApprovals';
import TournamentDetail from './admin/TournamentDetail';
import TournamentList from './admin/TournamentList';
import { api, ApiError } from '../api/client';
import {
  AGE_GROUP_LABELS,
  BOW_LABELS,
  TARGET_LABELS,
} from '../lib/archery/constants';
import type { Tournament, TournamentListResponse } from '../types/tournament';

export default function AdminHome() {
  return (
    <Routes>
      <Route index element={<AdminDashboard />} />
      <Route path="tournaments" element={<TournamentList />} />
      <Route path="tournaments/new" element={<CreateTournament />} />
      <Route path="tournaments/:id" element={<TournamentDetail />} />
      <Route path="tournaments/:id/approvals" element={<TournamentApprovals />} />
      <Route path="tournaments/:id/scoreboard" element={<AdminScoreboard />} />
    </Routes>
  );
}

function AdminDashboard() {
  const { profile, signOut } = useAuth();
  const [active, setActive] = useState<Tournament[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    api
      .get<TournamentListResponse>('/api/tournaments-list', {
        params: { status: 'active', pageSize: 12 },
        signal: ctrl.signal,
      })
      .then((res) => setActive(res.items))
      .catch((e) => {
        if ((e as Error).name === 'AbortError') return;
        setError(e instanceof ApiError ? e.message : 'Liste yüklenemedi');
      });
    return () => ctrl.abort();
  }, []);

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">Yönetici Paneli</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500">{profile?.email}</span>
          <button
            onClick={() => void signOut()}
            className="text-sm text-slate-600 underline"
          >
            Çıkış
          </button>
        </div>
      </header>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-medium">Aktif Turnuvalar</h2>
        <div className="flex gap-2">
          <Link
            to="/admin/tournaments"
            className="text-sm text-slate-600 underline"
          >
            Tümünü gör
          </Link>
          <Link
            to="/admin/tournaments/new"
            className="text-sm bg-slate-900 text-white px-3 py-1.5 rounded-md hover:bg-slate-800"
          >
            + Yeni Turnuva
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 text-red-700 text-sm p-3 mb-4">{error}</div>
      )}

      {active === null && !error && (
        <div className="text-sm text-slate-500">Yükleniyor…</div>
      )}

      {active && active.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-500">
          Aktif turnuva yok. Yeni bir turnuva oluşturarak başlayın.
        </div>
      )}

      {active && active.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {active.map((t) => (
            <Link
              key={t.id}
              to={`/admin/tournaments/${t.id}`}
              className="block rounded-lg border border-slate-200 bg-white p-4 hover:shadow-md transition"
            >
              <div className="font-medium">{t.name}</div>
              <div className="mt-1 text-sm text-slate-500">{t.date}</div>
              <div className="mt-3 text-sm text-slate-600 space-y-0.5">
                <div>
                  <span className="text-slate-400">Yay:</span> {BOW_LABELS[t.bow_type]}
                </div>
                <div>
                  <span className="text-slate-400">Yaş:</span>{' '}
                  {AGE_GROUP_LABELS[t.age_group]}
                </div>
                <div>
                  <span className="text-slate-400">Hedef:</span>{' '}
                  {TARGET_LABELS[t.target_type]} · {t.distance_meters}m
                </div>
                <div>
                  <span className="text-slate-400">Katılımcı:</span>{' '}
                  {t.participant_count ?? 0}
                </div>
              </div>
              <div className="mt-3 text-sm text-slate-700 underline">Yönet →</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
