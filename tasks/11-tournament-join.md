# Task 11 — Turnuvaya Katılım & Bekleme Odası

## Amaç
Yarışmacı QR ile turnuvaya katılım talebi gönderir, hedef numarası ve (gerekirse) farklı kulüp bilgisi girer, yönetici onayını bekler.

## Akış

```
QR tara → /join/:token
   ↓ giriş kontrolü
Giriş yoksa → /login (return URL: /join/:token)
   ↓ profil tamamlanmamışsa
/onboarding/profile (return URL korunur)
   ↓
Token doğrulanır → turnuva bilgileri gösterilir
   ↓
Hedef numarası + kulüp override formu
   ↓
Submit → status=pending kayıt oluşur
   ↓
Bekleme odası ekranı (polling ile status takibi)
   ↓
approved → /tournament/:id/score
rejected → bilgilendirme + ana sayfa
```

## Sayfa Yapısı

`src/pages/JoinTournament.tsx`

```tsx
export default function JoinTournament() {
  const { token } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const { data: tokenData, error } = useQuery(['qr', token],
    () => api.get('/api/qr/verify', { params: { token, kind: 'competitor' } })
  );

  // Mevcut katılım durumu kontrolü
  const { data: existing } = useQuery(['my-participation', tokenData?.tournament.id],
    () => api.get(`/api/participants/my?tournament_id=${tokenData!.tournament.id}`),
    { enabled: !!tokenData }
  );

  if (error) return <ErrorView msg={t('join.invalidToken')} />;
  if (!tokenData) return <Spinner />;

  if (existing?.status === 'approved') {
    return <Navigate to={`/tournament/${tokenData.tournament.id}/score`} replace />;
  }
  if (existing?.status === 'pending') {
    return <WaitingRoom tournamentId={tokenData.tournament.id} />;
  }
  if (existing?.status === 'rejected') {
    return <RejectedView />;
  }

  return <JoinForm tournament={tokenData.tournament} profile={profile} />;
}
```

## Katılım Formu

```tsx
function JoinForm({ tournament, profile }) {
  const schema = z.object({
    target_number: z.string().regex(/^\d+[A-Za-z]$/, t('errors.targetFormat')),
    club_override: z.string().max(100).optional().or(z.literal('')),
  });

  const { register, handleSubmit } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (values) => {
    await api.post('/api/participants/join', {
      tournament_id: tournament.id,
      target_number: values.target_number.toUpperCase(),
      club_override: values.club_override || null,
    });
    queryClient.invalidateQueries(['my-participation', tournament.id]);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-md mx-auto p-6 space-y-4">
      <TournamentSummaryCard t={tournament} />

      <Field label={t('join.targetNumber')} hint="ör: 1A, 2B">
        <input {...register('target_number')} placeholder="1A" className="input uppercase" />
      </Field>

      <Field label={t('join.clubOverride')} hint={t('join.clubOverrideHint')}>
        <input {...register('club_override')} defaultValue={profile?.club ?? ''} className="input" />
      </Field>

      <button type="submit" className="btn-primary w-full">
        {t('join.submit')}
      </button>
    </form>
  );
}
```

## Bekleme Odası

```tsx
function WaitingRoom({ tournamentId }) {
  const { data: status } = useQuery(
    ['my-participation', tournamentId],
    () => api.get(`/api/participants/my?tournament_id=${tournamentId}`),
    { refetchInterval: 5000 }   // 5 sn polling
  );

  useEffect(() => {
    if (status?.status === 'approved') navigate(`/tournament/${tournamentId}/score`);
  }, [status]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <Spinner size="lg" />
      <h2 className="text-xl font-semibold mt-4">{t('join.waitingApproval')}</h2>
      <p className="text-slate-500 mt-2 text-center">{t('join.waitingDesc')}</p>
    </div>
  );
}
```

## Backend

POST `/api/participants/join`:
```ts
const schema = z.object({
  tournament_id: z.string().uuid(),
  target_number: z.string().regex(/^\d+[A-Z]$/),
  club_override: z.string().max(100).nullable().optional(),
});

// Turnuva aktif mi kontrol
// target_number çakışma kontrol (unique constraint zaten var ama daha açıklayıcı hata)
// Aynı user zaten katılım talep etti mi kontrol

await supabaseAdmin.from('tournament_participants').insert({
  tournament_id, user_id: ctx.userId, target_number, club_override, status: 'pending'
});
```

GET `/api/participants/my?tournament_id=...`:
```ts
const { data } = await supabaseAdmin
  .from('tournament_participants')
  .select('*')
  .eq('tournament_id', tournament_id).eq('user_id', ctx.userId).maybeSingle();
return ok(data);
```

## Hata Senaryoları

- Token geçersiz → 404
- Turnuva tamamlanmış / iptal → 409 "Turnuva artık aktif değil"
- Hedef numarası dolu → 409 "Bu hedef başka sporcu tarafından alındı"
- Aynı kullanıcı tekrar katılım denemesi → 409 / mevcut talep gösterilir

## Kabul Kriterleri

- [x] QR tarayıp giriş yapmadan login'e yönleniyor, sonra geri dönüyor
- [x] Hedef numarası formatı doğrulanıyor (1A, 12B vs.)
- [x] Kulüp profile'dan default geliyor, override edilebiliyor
- [x] Bekleme odası polling ile durumu takip ediyor
- [x] Onaylanınca otomatik puan giriş ekranına geçiyor
- [x] Reddedilince kullanıcıya açıklayıcı ekran gösteriliyor

## Bağımlılık
- Task 04, Task 10
