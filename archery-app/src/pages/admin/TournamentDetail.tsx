import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../../api/client';
import { QrCodeCard } from '../../components/QrCodeCard';
import DownloadXlsxButton from '../../components/DownloadXlsxButton';
import { AGE_GROUP_LABELS, BOW_LABELS, TARGET_LABELS } from '../../lib/archery/constants';
import type { Tournament, TournamentQrTokens } from '../../types/tournament';

interface IncompleteParticipant {
  participant_id: string;
  name: string;
  surname: string;
  missing_sets: number[];
}

const STATUS_LABELS: Record<Tournament['status'], string> = {
  active: 'Aktif',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
};

const STATUS_BADGE: Record<Tournament['status'], string> = {
  active: 'bg-emerald-100 text-emerald-800',
  completed: 'bg-slate-200 text-slate-700',
  cancelled: 'bg-red-100 text-red-800',
};

export default function TournamentDetail() {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [tokens, setTokens] = useState<TournamentQrTokens | null>(null);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    Promise.all([
      api.get<{ tournament: Tournament }>('/api/tournaments-get', {
        params: { id },
        signal: ctrl.signal,
      }),
      api.get<{ tokens: TournamentQrTokens }>('/api/tournaments-qr-tokens', {
        params: { tournament_id: id },
        signal: ctrl.signal,
      }),
    ])
      .then(([a, b]) => {
        setTournament(a.tournament);
        setTokens(b.tokens);
      })
      .catch((e) => {
        if ((e as Error).name === 'AbortError') return;
        setError(e instanceof ApiError ? e.message : 'Yüklenemedi');
      })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const ctrl = new AbortController();
    const load = () => {
      api
        .get<{ items: unknown[] }>('/api/tournaments-pending', {
          params: { tournament_id: id },
          signal: ctrl.signal,
        })
        .then((d) => {
          if (!cancelled) setPendingCount(d.items.length);
        })
        .catch(() => {
          /* ignore — non-critical */
        });
    };
    load();
    const timer = setInterval(load, 5000);
    return () => {
      cancelled = true;
      ctrl.abort();
      clearInterval(timer);
    };
  }, [id]);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const competitorUrl = tokens?.competitor ? `${origin}/join/${tokens.competitor}` : null;
  const spectatorUrl = tokens?.spectator ? `${origin}/spectate/${tokens.spectator}` : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
        <Link to="/admin/tournaments" className="text-sm text-slate-600 underline">
          ← Turnuvalar
        </Link>

        {loading && <p className="text-slate-500">Yükleniyor…</p>}
        {error && (
          <div className="rounded-md bg-red-50 text-red-700 text-sm p-3">{error}</div>
        )}

        {tournament && (
          <>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-semibold">{tournament.name}</h1>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[tournament.status]}`}
                >
                  {STATUS_LABELS[tournament.status]}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {tournament.date} · {BOW_LABELS[tournament.bow_type]} ·{' '}
                {AGE_GROUP_LABELS[tournament.age_group]} ·{' '}
                {TARGET_LABELS[tournament.target_type]} · {tournament.distance_meters}m
              </p>
            </div>

            <EndTournamentSection
              tournament={tournament}
              onEnded={(t) => setTournament(t)}
            />

            <section className="space-y-3">
              <h2 className="text-lg font-semibold">QR Kodlar</h2>
              <p className="text-sm text-slate-600">
                Yarışmacılar ve izleyiciler için ayrı bağlantılar. İzleyici bağlantısı giriş
                gerektirmez.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {competitorUrl ? (
                  <QrCodeCard
                    url={competitorUrl}
                    title="Yarışmacı QR"
                    subtitle="Turnuvaya katılım için"
                    fileName={`${tournament.name}-yarismaci`}
                  />
                ) : (
                  <div className="border border-dashed border-slate-300 rounded-lg p-4 text-sm text-slate-500">
                    Yarışmacı tokenı bulunamadı.
                  </div>
                )}
                {spectatorUrl ? (
                  <QrCodeCard
                    url={spectatorUrl}
                    title="İzleyici QR"
                    subtitle="Canlı skoru izlemek için"
                    fileName={`${tournament.name}-izleyici`}
                  />
                ) : (
                  <div className="border border-dashed border-slate-300 rounded-lg p-4 text-sm text-slate-500">
                    İzleyici tokenı bulunamadı.
                  </div>
                )}
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold">Katılım Onayları</h2>
              <Link
                to={`/admin/tournaments/${tournament.id}/approvals`}
                className="inline-flex items-center gap-2 rounded-md bg-slate-900 text-white text-sm px-3 py-1.5 hover:bg-slate-800"
              >
                Bekleyen talepleri yönet
                {pendingCount != null && pendingCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 rounded-full bg-amber-400 text-slate-900 text-xs font-semibold">
                    {pendingCount}
                  </span>
                )}
              </Link>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold">Skor Tablosu</h2>
              <div className="flex flex-wrap gap-2">
                <Link
                  to={`/admin/tournaments/${tournament.id}/scoreboard`}
                  className="inline-flex items-center gap-2 rounded-md bg-slate-900 text-white text-sm px-3 py-1.5 hover:bg-slate-800"
                >
                  Yönetici skor & düzeltme
                </Link>
                <Link
                  to={`/tournament/${tournament.id}/scoreboard`}
                  className="inline-flex items-center gap-2 rounded-md border border-slate-300 text-slate-800 text-sm px-3 py-1.5 hover:bg-slate-50"
                >
                  Genel skor tablosu
                </Link>
                <DownloadXlsxButton
                  url={`/api/exports-tournament?id=${tournament.id}`}
                  filename={`${tournament.name}-${tournament.date}.xlsx`}
                  label="Excel İndir (tüm sporcular)"
                />
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function EndTournamentSection({
  tournament,
  onEnded,
}: {
  tournament: Tournament;
  onEnded: (t: Tournament) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [incomplete, setIncomplete] = useState<IncompleteParticipant[] | null>(null);
  const [loadingIncomplete, setLoadingIncomplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (tournament.status !== 'active') {
    return (
      <section className="rounded-md bg-slate-100 text-slate-700 text-sm p-3">
        Bu turnuva {STATUS_LABELS[tournament.status].toLowerCase()}. Puan girişi kilitli.
      </section>
    );
  }

  const openConfirm = async () => {
    setError(null);
    setConfirming(true);
    setLoadingIncomplete(true);
    try {
      const data = await api.get<{ items: IncompleteParticipant[] }>(
        '/api/tournaments-incomplete',
        { params: { tournament_id: tournament.id } },
      );
      setIncomplete(data.items);
    } catch (e) {
      setIncomplete([]);
      setError(e instanceof ApiError ? e.message : 'Eksik set bilgisi alınamadı');
    } finally {
      setLoadingIncomplete(false);
    }
  };

  const endNow = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const data = await api.post<{ tournament: Tournament }>('/api/tournaments-end', {
        tournament_id: tournament.id,
      });
      onEnded(data.tournament);
      setConfirming(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Turnuva bitirilemedi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">Turnuvayı Bitir</h2>
      <p className="text-sm text-slate-600">
        Turnuvayı bitirdikten sonra yarışmacılar puan girişi yapamaz. Bu işlem geri alınamaz.
      </p>
      <button
        type="button"
        onClick={openConfirm}
        className="inline-flex items-center gap-2 rounded-md bg-red-600 text-white text-sm px-3 py-1.5 hover:bg-red-700"
      >
        Turnuvayı Bitir
      </button>

      {confirming && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-5 space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">
              Turnuvayı bitirmek istediğine emin misin?
            </h3>
            <p className="text-sm text-slate-700">
              Bu işlem geri alınamaz. Yarışmacılar artık puan girişi yapamayacak.
            </p>

            {loadingIncomplete && (
              <p className="text-sm text-slate-500">Eksik setler kontrol ediliyor…</p>
            )}

            {!loadingIncomplete && incomplete && incomplete.length > 0 && (
              <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
                <p className="font-medium">
                  {incomplete.length} sporcunun eksik seti var. Bu setler "DNF" sayılır.
                </p>
                <ul className="mt-2 list-disc list-inside space-y-0.5 max-h-40 overflow-auto">
                  {incomplete.map((p) => (
                    <li key={p.participant_id}>
                      {p.name} {p.surname} — Eksik set: {p.missing_sets.join(', ')}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!loadingIncomplete && incomplete && incomplete.length === 0 && (
              <p className="text-sm text-emerald-700">
                Tüm yarışmacılar setlerini tamamlamış.
              </p>
            )}

            {error && (
              <div className="rounded-md bg-red-50 text-red-700 text-sm p-2">{error}</div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={submitting}
                className="rounded-md border border-slate-300 text-slate-700 text-sm px-3 py-1.5 hover:bg-slate-50 disabled:opacity-60"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={endNow}
                disabled={submitting || loadingIncomplete}
                className="rounded-md bg-red-600 text-white text-sm px-3 py-1.5 hover:bg-red-700 disabled:opacity-60"
              >
                {submitting ? 'Bitiriliyor…' : 'Yine de Bitir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
