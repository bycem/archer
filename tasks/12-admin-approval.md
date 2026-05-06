# Task 12 — Yönetici: Katılım Onay Akışı

## Amaç
Yönetici, turnuvaya katılım taleplerini gerçek zamanlı görür, onaylar veya reddeder.

## Sayfa

`/admin/tournaments/:id/approvals`

```tsx
export default function AdminApprovals() {
  const { id } = useParams();
  const { data, refetch } = useQuery(
    ['pending', id],
    () => api.get(`/api/tournaments/${id}/pending`),
    { refetchInterval: 5000 }
  );

  const approve = async (pid) => {
    await api.post(`/api/participants/${pid}/approve`);
    refetch();
  };
  const reject = async (pid) => {
    await api.post(`/api/participants/${pid}/reject`);
    refetch();
  };

  return (
    <div className="p-6 space-y-3">
      <h1 className="text-2xl font-bold">{t('admin.approvals')}</h1>
      <div className="text-sm text-slate-500">{data?.length} {t('admin.pendingCount')}</div>

      {data?.map(p => (
        <div key={p.id} className="border rounded-lg p-4 flex items-center justify-between">
          <div>
            <div className="font-semibold">{p.user.name} {p.user.surname}</div>
            <div className="text-sm text-slate-600">
              {t('join.targetNumber')}: <strong>{p.target_number}</strong> ·
              {t('profile.club')}: {p.club_override ?? p.user.club ?? '-'} ·
              {p.user.gender}
            </div>
            <div className="text-xs text-slate-400">{formatRelative(p.joined_at)}</div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => reject(p.id)} className="btn-danger">{t('admin.reject')}</button>
            <button onClick={() => approve(p.id)} className="btn-primary">{t('admin.approve')}</button>
          </div>
        </div>
      ))}

      {data?.length === 0 && (
        <EmptyState text={t('admin.noPendingApprovals')} />
      )}
    </div>
  );
}
```

## Backend

GET `/api/tournaments/:id/pending`:
```ts
requireAdmin(ctx);
const { data } = await supabaseAdmin
  .from('tournament_participants')
  .select('*, user:users(id,name,surname,gender,club,age,bow_type)')
  .eq('tournament_id', id).eq('status', 'pending')
  .order('joined_at');
return ok(data);
```

POST `/api/participants/:id/approve`:
```ts
requireAdmin(ctx);
const { data: before } = await supabaseAdmin.from('tournament_participants')
  .select('*').eq('id', id).single();

await supabaseAdmin.from('tournament_participants')
  .update({ status: 'approved', approved_by: ctx.userId, approved_at: new Date().toISOString() })
  .eq('id', id);

// Onaylanan participant için boş set'leri otomatik oluştur
const { data: tournament } = await supabaseAdmin
  .from('tournaments').select('set_count').eq('id', before.tournament_id).single();
const sets = Array.from({ length: tournament.set_count }, (_, i) => ({
  participant_id: id, set_number: i + 1,
}));
await supabaseAdmin.from('sets').insert(sets);

// audit log
await supabaseAdmin.from('audit_log').insert({
  actor_id: ctx.userId, action: 'approval', entity_type: 'tournament_participants',
  entity_id: id, before_data: before, after_data: { status: 'approved' },
});
```

POST `/api/participants/:id/reject`:
```ts
requireAdmin(ctx);
await supabaseAdmin.from('tournament_participants').update({ status: 'rejected' }).eq('id', id);
// audit log
```

## Bildirimler (Opsiyonel İyileştirme)

İleride: Yarışmacının ekranı zaten polling ile yenileniyor; ek olarak push notification eklenebilir (Web Push API). İlk versiyon için polling yeterli.

## Toplu Onay

Çok sayıda talep gelirse "Hepsini Onayla" butonu eklenebilir. İlk versiyon için tekil yeterli.

## Kabul Kriterleri

- [x] Bekleyen talepler 5 sn'de bir yenileniyor
- [x] Onayda otomatik set kayıtları oluşuyor
- [x] Audit log'a yazılıyor
- [x] Yarışmacının bekleme odası onay anında otomatik geçiyor
- [x] Reddedilen talep yarışmacıya bilgilendirici ekran gösteriyor

## Bağımlılık
- Task 03, Task 11
