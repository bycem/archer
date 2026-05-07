import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './store/authStore';
import { ProtectedRoute } from './routes/ProtectedRoute';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import Home from './pages/Home';
import AdminHome from './pages/AdminHome';
import OnboardingProfile from './pages/OnboardingProfile';
import Spectate from './pages/Spectate';
import SpectatorTournament from './pages/SpectatorTournament';
import JoinTournament from './pages/JoinTournament';
import ScoreEntry from './pages/ScoreEntry';
import TournamentScoreboard from './pages/TournamentScoreboard';
import MyTournaments from './pages/MyTournaments';
import Settings from './pages/Settings';

function App() {
  useEffect(() => {
    void useAuth.getState().init();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/spectate" element={<Spectate />} />
        <Route path="/spectate/:token" element={<SpectatorTournament />} />
        <Route
          path="/spectate/tournament/:id"
          element={<SpectatorTournament />}
        />
        <Route path="/join/:token" element={<JoinTournament />} />

        <Route
          path="/tournament/:id/score"
          element={
            <ProtectedRoute role="competitor">
              <ScoreEntry />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tournament/:id/scoreboard"
          element={
            <ProtectedRoute>
              <TournamentScoreboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/onboarding/profile"
          element={
            <RequireSession>
              <OnboardingProfile />
            </RequireSession>
          }
        />

        <Route
          path="/home"
          element={
            <ProtectedRoute role="competitor">
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/tournaments"
          element={
            <ProtectedRoute>
              <MyTournaments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute role="admin">
              <AdminHome />
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

// Onboarding sayfası için özel kontrol — profile_completed=false durumunda da gösterilmeli
function RequireSession({ children }: { children: React.ReactNode }) {
  const { initialized, loading, session } = useAuth();
  if (!initialized || loading) return null;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RootRedirect() {
  const { initialized, loading, session, profile } = useAuth();
  if (!initialized || loading) return null;
  if (!session) return <Navigate to="/login" replace />;
  if (!profile) return null;
  if (!profile.profile_completed) return <Navigate to="/onboarding/profile" replace />;
  const stored = sessionStorage.getItem('redirectAfterAuth');
  if (stored) {
    sessionStorage.removeItem('redirectAfterAuth');
    return <Navigate to={stored} replace />;
  }
  return <Navigate to={profile.role === 'admin' ? '/admin' : '/home'} replace />;
}

export default App;
