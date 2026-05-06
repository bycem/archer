import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface Props {
  url: string;
  filename: string;
  label?: string;
  variant?: 'primary' | 'secondary';
  className?: string;
  disabled?: boolean;
}

export default function DownloadXlsxButton({
  url,
  filename,
  label = 'Excel İndir',
  variant = 'primary',
  className,
  disabled,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseBtn =
    variant === 'primary'
      ? 'inline-flex items-center gap-2 rounded-md bg-emerald-600 text-white text-sm px-3 py-1.5 hover:bg-emerald-700 disabled:opacity-60'
      : 'inline-flex items-center gap-2 rounded-md border border-emerald-600 text-emerald-700 text-sm px-3 py-1.5 hover:bg-emerald-50 disabled:opacity-60';

  const handle = async () => {
    setError(null);
    setBusy(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers.authorization = `Bearer ${session.access_token}`;
      }
      const res = await fetch(url, { headers });
      if (!res.ok) {
        let msg = `İndirme başarısız (${res.status})`;
        try {
          const body = await res.json();
          if (body?.error) msg = body.error;
        } catch {
          /* not JSON */
        }
        throw new Error(msg);
      }
      const blob = await res.blob();
      const link = document.createElement('a');
      const objectUrl = URL.createObjectURL(blob);
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'İndirilemedi');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handle}
        disabled={busy || disabled}
        className={baseBtn}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        {busy ? 'İndiriliyor…' : label}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
