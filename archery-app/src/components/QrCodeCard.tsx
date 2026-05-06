import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

interface Props {
  url: string;
  title: string;
  subtitle?: string;
  fileName?: string;
}

export function QrCodeCard({ url, title, subtitle, fileName }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, url, { width: 280, margin: 2 }).catch(() => {
      setError('QR oluşturulamadı');
    });
  }, [url]);

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `${fileName ?? title}.png`;
    link.click();
  };

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
    } catch {
      // user cancelled — fall through to clipboard
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError('Kopyalanamadı');
    }
  };

  return (
    <div className="border border-slate-200 rounded-lg p-4 flex flex-col items-center gap-3 bg-white">
      <h3 className="font-semibold text-slate-900">{title}</h3>
      {subtitle && <p className="text-xs text-slate-500 -mt-2">{subtitle}</p>}
      <canvas ref={canvasRef} aria-label={`${title} QR kod`} className="rounded" />
      <div className="text-xs text-slate-500 break-all text-center max-w-full">{url}</div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={download}
          className="text-sm px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50"
        >
          PNG indir
        </button>
        <button
          type="button"
          onClick={share}
          className="text-sm px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50"
        >
          {copied ? 'Kopyalandı ✓' : 'Paylaş'}
        </button>
      </div>
      {error && <div className="text-xs text-red-600">{error}</div>}
    </div>
  );
}
