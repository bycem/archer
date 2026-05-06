export default function FullScreenSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div
        className="h-10 w-10 rounded-full border-4 border-slate-200 border-t-slate-700 animate-spin"
        role="status"
        aria-label="Yükleniyor"
      />
    </div>
  );
}
