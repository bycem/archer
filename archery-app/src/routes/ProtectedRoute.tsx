import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../store/authStore';
import FullScreenSpinner from '../components/FullScreenSpinner';
import type { Role } from '../types/profile';

interface Props {
  children: ReactNode;
  role?: Role;
}

export function ProtectedRoute({ children, role }: Props) {
  const { initialized, session, profile, loading } = useAuth();
  const loc = useLocation();

  if (!initialized || loading) return <FullScreenSpinner />;
  if (!session) return <Navigate to="/login" state={{ from: loc }} replace />;
  if (!profile) return <FullScreenSpinner />;
  if (!profile.profile_completed) return <Navigate to="/onboarding/profile" replace />;
  if (role && profile.role !== role) return <Navigate to="/home" replace />;

  return <>{children}</>;
}
