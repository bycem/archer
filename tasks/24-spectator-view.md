# Task 24 — İzleyici Ekranı (Public)

## Amaç
Giriş yapmadan QR ile turnuvayı takip edebilen, salt-okunur ekran. Tabletlerde / TV'lerde yayın için optimize edilmiş bir görünüm.

## URL'ler

- `/spectate/:token` — token doğrulanır → turnuva skor tablosuna gider
- `/spectate/tournament/:id` — direkt token gerektirmez (public read)

## Sayfa

`src/pages/SpectatorTournament.tsx`

```tsx
export default function SpectatorTournament() {
  const { token } = useParams();

  const { data: verify, error } = useQuery(['qr', token],
    () => api.get('/api/qr/verify', { params: { token, kind: 'spectator' } }),
    { enabled: !!token }
  );

  if (error) return <ErrorPage code={404} msg={t('spectate.invalidToken')} />;
  if (!verify) return <Spinner />;

  return <PublicScoreboard tournamentId={verify.tournament.id} />;
}
```

## PublicScoreboard

Skor tablosunu (Task 16) kullanır ama:
- Header daha büyük (turnuva adı, tarih, mesafe, hedef)
- Bottom nav yok
- Sayfa fullscreen mode'a girebilir (TV/projeksiyon için)
- Polling 5 sn (canlı izleme)
- "Son güncelleme: X sn önce" göstergesi

```tsx
function PublicScoreboard({ tournamentId }) {
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const { data } = useQuery(['scoreboard', tournamentId],
    () => api.get(`/api/tournaments/${tournamentId}/scoreboard`),
    { refetchInterval: 5000, onSuccess: () => setLastUpdate(Date.now()) }
  );

  const fullscreen = () => document.documentElement.requestFullscreen();

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-slate-900 text-white p-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{data?.tournament.name}</h1>
          <div className="text-slate-300">
            {format(data?.tournament.date)} · {data?.tournament.distance_meters}m · {t(`target.${data?.tournament.target_type}`)}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <button onClick={fullscreen} className="btn-secondary">{t('spectate.fullscreen')}</button>
        </div>
      </header>

      <ScoreboardTable rows={data?.rows} tournament={data?.tournament} />

      <footer className="fixed bottom-0 inset-x-0 bg-slate-100 p-2 text-xs text-center">
        {t('spectate.lastUpdate')}: {Math.floor((Date.now() - lastUpdate)/1000)}s
      </footer>
    </div>
  );
}
```

## TV Modu

- 1920x1080 için optimize: büyük font, ilk 10 sıra ekrana sığar
- Scroll yerine sayfa rotasyonu (10 sırada bir 5 sn dur, sonraki 10'a kay)
- Otomatik tema (kontrastlı, izleme dostu)

```tsx
const [tvOffset, setTvOffset] = useState(0);
useEffect(() => {
  if (!isTvMode) return;
  const interval = setInterval(() => {
    setTvOffset(o => (o + 10) % data.rows.length);
  }, 5000);
  return () => clearInterval(interval);
}, [isTvMode, data]);
```

## Privacy

İzleyici ekranı kişisel verileri minimal gösterir:
- Ad Soyad ✅
- Kulüp ✅
- Cinsiyet ✅ (kategori olduğu için gerekli)
- Yaş ❌
- Email ❌

## Backend Public Read

`/api/tournaments/:id/scoreboard` endpoint'i auth gerektirmez (RLS public select policy var).

QR verify endpoint'i opsiyonel — direkt URL paylaşılabilir.

## Token Yenileme

Token sızdırıldıysa yönetici yeniden token üretebilir (POST `/api/qr/regenerate`). Eski token çalışmaz.

## Kabul Kriterleri

- [x] Giriş yapmadan erişiliyor
- [x] Skor tablosu canlı güncelleniyor (5 sn)
- [x] Tam ekran modu çalışıyor
- [x] Token geçersizse hata sayfası gösteriliyor
- [x] Mobile + tablet + TV ekranları responsive
- [x] Dil değiştirici çalışıyor
- [x] Hassas veriler (email, yaş) gözükmüyor

## Bağımlılık
- Task 10, Task 16
