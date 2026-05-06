import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/authStore';
import FullScreenSpinner from '../components/FullScreenSpinner';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { initialized, loading, session, profile } = useAuth();

  useEffect(() => {
    if (!initialized || loading) return;
    if (!session) {
      navigate('/login', { replace: true });
      return;
    }
    if (!profile) return;
    if (!profile.profile_completed) {
      navigate('/onboarding/profile', { replace: true });
      return;
    }
    const stored = sessionStorage.getItem('redirectAfterAuth');
    if (stored) {
      sessionStorage.removeItem('redirectAfterAuth');
      navigate(stored, { replace: true });
    } else if (profile.role === 'admin') {
      navigate('/admin', { replace: true });
    } else {
      navigate('/home', { replace: true });
    }
  }, [initialized, loading, session, profile, navigate]);

  return <FullScreenSpinner />;
}
