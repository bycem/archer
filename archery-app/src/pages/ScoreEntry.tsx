import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import FullScreenSpinner from '../components/FullScreenSpinner';
import { SetEntryPanel } from '../features/score-entry/SetEntryPanel';
import { PreviewModal } from '../features/score-entry/PreviewModal';
import { useSetEntry } from '../features/score-entry/useSetEntry';
import type { Tournament } from '../types/tournament';

interface MySetRow {
  id: string;
  set_number: number;
  is_committed: boolean;
}

interface MyProgress {
  participant: { id: string; status: string } | null;
  sets: MySetRow[];
}

export default function ScoreEntry() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [progress, setProgress] = useState<MyProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);

  const participantId = progress?.participant?.id ?? null;
  const arrowsPerSet = tournament?.arrows_per_set ?? 0;

  const { arrows, add, removeAt, reset, commit, isFull, committing } =
    useSetEntry(participantId, arrowsPerSet);

  const nextSetNumber = useMemo(() => {
    if (!progress) return null;
    const next = progress.sets.find((s) => !s.is_committed);
    return next ? next.set_number : null;
  }, [progress]);

  useEffect(() => {
    if (!id) return;
    const ctrl = new AbortController();
    Promise.all([
      api.get<{ tournament: Tournament }>('/api/tournaments-get', {
        params: { id },
        signal: ctrl.signal,
      }),
      api.get<MyProgress>('/api/scores-my-sets', {
        params: { tournament_id: id },
        signal: ctrl.signal,
      }),
    ])
      .then(([t, p]) => {
        setTournament(t.tournament);
        setProgress(p);
      })
      .catch((e) => {
        if ((e as Error).name === 'AbortError') return;
        setError(e instanceof ApiError ? e.message : 'Veriler yüklenemedi');
      });
    return () => ctrl.abort();
  }, [id]);

  useEffect(() => {
    if (!id || !tournament || tournament.status !== 'active') return;
    const ctrl = new AbortController();
    const poll = () => {
      api
        .get<{ tournament: Tournament }>('/api/tournaments-get', {
          params: { id },
          signal: ctrl.signal,
        })
        .then((d) => setTournament(d.tournament))
        .catch(() => {
          /* ignore — non-critical */
        });
    };
    const timer = setInterval(poll, 8000);
    return () => {
      ctrl.abort();
      clearInterval(timer);
    };
  }, [id, tournament]);

  const handleConfirm = async () => {
    if (!nextSetNumber) return;
    setCommitError(null);
    try {
      const res = await commit(nextSetNumber);
      setShowPreview(false);
      setProgress((prev) =>
        prev
          ? {
              ...prev,
              sets: prev.sets.map((s) =>
                s.set_number === res.set.set_number
                  ? { ...s, is_committed: true }
                  : s,
              ),
            }
          : prev,
      );
    } catch (e) {
      setCommitError(e instanceof ApiError ? e.message : (e as Error).message);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-xl font-semibold">Sayfa yüklenemedi</h1>
          <p className="text-sm text-slate-500">{error}</p>
          <button onClick={() => navigate('/')} className="text-sm underline">
            Ana sayfa
          </button>
        </div>
      </div>
    );
  }

  if (!tournament || !progress) return <FullScreenSpinner />;

  if (!progress.participant) {
    return (
      <CenteredMessage
        title="Katılımcı kaydı bulunamadı"
        body="Bu turnuvaya henüz katılmamışsınız."
        onBack={() => navigate('/')}
      />
    );
  }
  if (tournament.status !== 'active') {
    return (
      <CenteredMessage
        title="Turnuva sona erdi"
        body="Yönetici turnuvayı bitirdi. Puan girişi kapalı."
        onBack={() => navigate(`/tournament/${tournament.id}/scoreboard`)}
      />
    );
  }
  if (progress.participant.status !== 'approved') {
    return (
      <CenteredMessage
        title="Onay bekleniyor"
        body="Yöneticinin katılımınızı onaylamasını bekleyin."
        onBack={() => navigate('/')}
      />
    );
  }
  if (nextSetNumber === null) {
    return (
      <CenteredMessage
        title="Tamamlandı"
        body="Tüm setleriniz kaydedildi. Yöneticinin turnuvayı bitirmesi bekleniyor."
        onBack={() => navigate('/')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="max-w-md mx-auto space-y-4">
        <header>
          <h1 className="text-xl font-semibold">{tournament.name}</h1>
          <p className="text-xs text-slate-500">
            {tournament.set_count} set × {tournament.arrows_per_set} atış
          </p>
        </header>

        <SetEntryPanel
          targetType={tournament.target_type}
          setNumber={nextSetNumber}
          totalSets={tournament.set_count}
          arrowsPerSet={tournament.arrows_per_set}
          arrows={arrows}
          onPick={add}
          onUndo={removeAt}
        />

        {commitError && (
          <p className="text-sm text-red-600 text-center" role="alert">
            {commitError}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={reset}
            disabled={arrows.length === 0 || committing}
            className="flex-1 rounded-md border border-slate-300 bg-white py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Temizle
          </button>
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            disabled={!isFull || committing}
            className="flex-1 rounded-md bg-slate-900 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            Kaydet
          </button>
        </div>

        <p className="text-center text-xs text-slate-400">
          Tamamlanan setler: {progress.sets.filter((s) => s.is_committed).length} /{' '}
          {tournament.set_count}
        </p>

        <div className="text-center">
          <Link
            to={`/tournament/${tournament.id}/scoreboard`}
            className="text-sm text-slate-700 underline"
          >
            Canlı skor tablosu →
          </Link>
        </div>
      </div>

      {showPreview && (
        <PreviewModal
          arrows={arrows}
          setNumber={nextSetNumber}
          totalSets={tournament.set_count}
          busy={committing}
          onConfirm={handleConfirm}
          onCancel={() => {
            if (!committing) {
              setShowPreview(false);
              setCommitError(null);
            }
          }}
        />
      )}
    </div>
  );
}

function CenteredMessage({
  title,
  body,
  onBack,
}: {
  title: string;
  body: string;
  onBack: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="max-w-md text-center space-y-3">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-sm text-slate-500">{body}</p>
        <button onClick={onBack} className="text-sm underline">
          Ana sayfa
        </button>
      </div>
    </div>
  );
}
