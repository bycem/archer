import { Link } from 'react-router-dom';
import { useAuth } from '../store/authStore';

export default function Home() {
  const { profile, signOut } = useAuth();
  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">Hoş geldin{profile?.name ? `, ${profile.name}` : ''}</h1>
        <button
          onClick={() => void signOut()}
          className="text-sm text-slate-600 underline"
        >
          Çıkış
        </button>
      </header>
      <p className="text-slate-500 mb-6">Yarışmacı ana ekranı — turnuvalara buradan katılacaksın.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          to="/profile/tournaments"
          className="block rounded-lg border border-slate-200 bg-white p-4 hover:shadow-sm transition"
        >
          <div className="font-semibold">Geçmiş Turnuvalarım</div>
          <div className="text-sm text-slate-500 mt-1">
            Katıldığın turnuvalar, sıralaman ve toplam puanlar.
          </div>
        </Link>
      </div>
    </div>
  );
}
