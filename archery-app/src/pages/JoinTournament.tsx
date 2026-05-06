import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { useAuth } from '../store/authStore';
import FullScreenSpinner from '../components/FullScreenSpinner';
import { AGE_GROUP_LABELS, BOW_LABELS, TARGET_LABELS } from '../lib/archery/constants';
import type { Tournament } from '../types/tournament';

const TARGET_RE = /^\d+[A-Z]$/;

type ParticipantStatus = 'pending' | 'approved' | 'rejected';

interface Participant {
  id: string;
  tournament_id: string;
  status: ParticipantStatus;
  target_number: string;
  club_override: string | null;
}

interface QrVerifyResponse {
  kind: 'competitor' | 'spectator';
  tournament: Tournament;
}

interface MyParticipationResponse {
  participant: Participant | null;
}

export default function JoinTournament() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { initialized, loading: authLoading, session, profile } = useAuth();

  const [tokenData, setTokenData] = useState<QrVerifyResponse | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [participantLoaded, setParticipantLoaded] = useState(false);

  // Token doğrulama (giriş gerekmeden çalışabilir; bilgi göstermek için)
  useEffect(() => {
    if (!token) return;
    const ctrl = new AbortController();
    let cancelled = false;
    api
      .get<QrVerifyResponse>('/api/qr-verify', {
        params: { token, kind: 'competitor' },
        signal: ctrl.signal,
      })
      .then((d) => {
        if (!cancelled) setTokenData(d);
      })
      .catch((e) => {
        if (cancelled || (e as Error).name === 'AbortError') return;
        setTokenError(e instanceof ApiError ? e.message : 'Geçersiz bağlantı');
      });
    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [token]);

  // Giriş yoksa login'e yönlendir, dönüş URL'sini sakla
  useEffect(() => {
    if (!initialized || authLoading) return;
    if (!session) {
      sessionStorage.setItem('redirectAfterAuth', `/join/${token ?? ''}`);
      navigate('/login', { replace: true });
      return;
    }
    if (profile && !profile.profile_completed) {
      sessionStorage.setItem('redirectAfterAuth', `/join/${token ?? ''}`);
      navigate('/onboarding/profile', { replace: true });
    }
  }, [initialized, authLoading, session, profile, token, navigate]);

  const tournamentId = tokenData?.tournament.id;
  const canFetchParticipation =
    !!tournamentId && !!session && !!profile?.profile_completed;

  // İlk yüklemede + pending iken 5 sn polling ile katılım durumunu çek
  useEffect(() => {
    if (!canFetchParticipation || !tournamentId) return;
    let cancelled = false;
    const ctrl = new AbortController();

    const load = async () => {
      try {
        const d = await api.get<MyParticipationResponse>('/api/participants-my', {
          params: { tournament_id: tournamentId },
          signal: ctrl.signal,
        });
        if (cancelled) return;
        setParticipant(d.participant);
        setParticipantLoaded(true);
      } catch (e) {
        if (cancelled || (e as Error).name === 'AbortError') return;
        setParticipantLoaded(true);
      }
    };

    void load();
    const id = setInterval(() => {
      if (participant?.status === 'pending' || !participantLoaded) void load();
    }, 5000);

    return () => {
      cancelled = true;
      ctrl.abort();
      clearInterval(id);
    };
  }, [canFetchParticipation, tournamentId, participant?.status, participantLoaded]);

  // Onaylandıysa skor ekranına geç
  useEffect(() => {
    if (participant?.status === 'approved' && tokenData) {
      navigate(`/tournament/${tokenData.tournament.id}/score`, { replace: true });
    }
  }, [participant?.status, tokenData, navigate]);

  if (!initialized || authLoading) return <FullScreenSpinner />;
  if (!session || (profile && !profile.profile_completed)) return <FullScreenSpinner />;

  if (tokenError) {
    return (
      <CenteredCard>
        <h1 className="text-xl font-semibold">Geçersiz bağlantı</h1>
        <p className="text-slate-500">{tokenError}</p>
        <button onClick={() => navigate('/')} className="text-sm text-slate-700 underline">
          Ana sayfa
        </button>
      </CenteredCard>
    );
  }

  if (!tokenData || !participantLoaded) return <FullScreenSpinner />;

  if (participant?.status === 'rejected') {
    return (
      <CenteredCard>
        <h1 className="text-xl font-semibold">Katılım talebin reddedildi</h1>
        <p className="text-slate-500">
          Yönetici katılım talebini reddetti. Detay için organizatör ile iletişime geçebilirsin.
        </p>
        <button onClick={() => navigate('/')} className="text-sm text-slate-700 underline">
          Ana sayfa
        </button>
      </CenteredCard>
    );
  }

  if (participant?.status === 'pending') {
    return <WaitingRoom tournament={tokenData.tournament} participant={participant} />;
  }

  return (
    <JoinForm
      tournament={tokenData.tournament}
      defaultClub={profile?.club ?? ''}
      token={token!}
      onJoined={(p) => setParticipant(p)}
    />
  );
}

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="max-w-md w-full text-center space-y-3 bg-white border border-slate-200 rounded-lg p-6">
        {children}
      </div>
    </div>
  );
}

function TournamentSummaryCard({ t }: { t: Tournament }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-1">
      <div className="text-lg font-semibold">{t.name}</div>
      <div className="text-sm text-slate-500">
        {t.date} · {BOW_LABELS[t.bow_type]} · {AGE_GROUP_LABELS[t.age_group]}
      </div>
      <div className="text-sm text-slate-500">
        {TARGET_LABELS[t.target_type]} · {t.distance_meters}m · {t.set_count} set ×{' '}
        {t.arrows_per_set} atış
      </div>
    </div>
  );
}

interface JoinFormProps {
  tournament: Tournament;
  defaultClub: string;
  token: string;
  onJoined: (p: Participant) => void;
}

function JoinForm({ tournament, defaultClub, token, onJoined }: JoinFormProps) {
  const [targetNumber, setTargetNumber] = useState('');
  const [clubOverride, setClubOverride] = useState(defaultClub);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const value = targetNumber.trim().toUpperCase();
    if (!TARGET_RE.test(value)) {
      setError('Hedef numarası "1A", "12B" gibi olmalıdır.');
      return;
    }
    setSubmitting(true);
    try {
      const data = await api.post<{ participant: Participant }>('/api/participants-join', {
        token,
        target_number: value,
        club_override: clubOverride.trim() || undefined,
      });
      onJoined(data.participant);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'CONFLICT') {
          setError('Bu hedef başka bir sporcu tarafından alındı veya zaten katılım talebin var.');
        } else if (err.code === 'TOURNAMENT_INACTIVE') {
          setError('Turnuva artık aktif değil.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Beklenmeyen bir hata oluştu.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <form onSubmit={onSubmit} className="max-w-md mx-auto space-y-4">
        <h1 className="text-2xl font-semibold">Turnuvaya Katıl</h1>
        <TournamentSummaryCard t={tournament} />

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Hedef Numarası</label>
          <input
            value={targetNumber}
            onChange={(e) => setTargetNumber(e.target.value)}
            placeholder="1A"
            autoCapitalize="characters"
            className="w-full uppercase rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-700"
          />
          <p className="text-xs text-slate-500 mt-1">Örn: 1A, 12B</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Kulüp (gerekirse değiştir)</label>
          <input
            value={clubOverride}
            onChange={(e) => setClubOverride(e.target.value)}
            placeholder="Kulüp adı"
            className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-700"
          />
          <p className="text-xs text-slate-500 mt-1">
            Profilindeki kulüp varsayılan; bu turnuva için farklıysa düzenleyebilirsin.
          </p>
        </div>

        {error && <div className="rounded-md bg-red-50 text-red-700 text-sm p-3">{error}</div>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-slate-900 text-white rounded-md py-2.5 font-medium disabled:opacity-50"
        >
          {submitting ? 'Gönderiliyor…' : 'Katılım Talebi Gönder'}
        </button>
      </form>
    </div>
  );
}

function WaitingRoom({
  tournament,
  participant,
}: {
  tournament: Tournament;
  participant: Participant;
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-lg p-6 space-y-4 text-center">
        <div
          className="mx-auto h-12 w-12 rounded-full border-4 border-slate-200 border-t-slate-700 animate-spin"
          role="status"
          aria-label="Bekleniyor"
        />
        <h1 className="text-xl font-semibold">Onay bekleniyor</h1>
        <p className="text-slate-500 text-sm">
          Yönetici katılım talebini onayladığında otomatik olarak puan giriş ekranına yönlendirileceksin.
        </p>
        <div className="text-sm text-slate-700 border-t border-slate-100 pt-3">
          <div className="font-medium">{tournament.name}</div>
          <div className="text-slate-500">
            Hedef: <span className="font-mono">{participant.target_number}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
