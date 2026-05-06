import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/authStore';
import GoogleIcon from '../components/GoogleIcon';

export default function Login() {
  const { signInWithGoogle, signInWithEmail, session, initialized } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (initialized && session) {
      navigate('/', { replace: true });
    }
  }, [initialized, session, navigate]);
  const [email, setEmail] = useState('admin@archery.test');
  const [password, setPassword] = useState('password123');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const { error } = await signInWithEmail(email, password);
    setBusy(false);
    if (error) setErr(error);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
      <h1 className="text-3xl font-bold mb-2 text-slate-900">Okçuluk Turnuva</h1>
      <p className="text-slate-500 mb-8 text-sm">Devam etmek için giriş yapın</p>

      <button
        onClick={() => {
          void signInWithGoogle();
        }}
        className="px-6 py-3 bg-white border border-slate-200 rounded-lg shadow-sm flex items-center gap-3 hover:bg-slate-50 transition"
      >
        <GoogleIcon />
        <span className="font-medium">Google ile devam et</span>
      </button>

      {import.meta.env.DEV && (
        <form
          onSubmit={(e) => {
            void handleEmailLogin(e);
          }}
          className="mt-8 w-full max-w-xs bg-white border border-slate-200 rounded-lg p-4 shadow-sm"
        >
          <p className="text-xs text-slate-500 mb-3 uppercase tracking-wide">
            Dev — Email Girişi
          </p>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email"
            className="w-full mb-2 px-3 py-2 border border-slate-200 rounded text-sm"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
            className="w-full mb-3 px-3 py-2 border border-slate-200 rounded text-sm"
          />
          {err && <p className="text-xs text-red-600 mb-2">{err}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full py-2 bg-slate-900 text-white rounded text-sm font-medium disabled:opacity-50"
          >
            {busy ? '...' : 'Dev Login'}
          </button>
        </form>
      )}

      <a href="/spectate" className="mt-6 text-sm text-slate-500 underline">
        İzleyici olarak devam et
      </a>
    </div>
  );
}
