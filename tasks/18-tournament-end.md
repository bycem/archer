# Task 18 — Turnuvayı Bitirme & Kilitleme

## Amaç
Yönetici, tüm atışlar tamamlandıktan sonra turnuvayı **sadece yönetici ekranından** bitirir. Bittikten sonra hiçbir sporcu puan girişi/güncellemesi yapamaz.

## Kritik Kural
**"Turnuvayı Bitir" butonu yarışmacı modunda görünmemelidir** — yönetici aynı zamanda yarışmacı olarak katılmış olabilir; karışıklığı önlemek için bu aksiyon sadece `/admin/*` rotalarında bulunur.

## UI

`/admin/tournaments/:id` sayfasında, sayfanın altında veya yönet panelinde:

```tsx
function EndTournamentButton({ tournament, onEnded }) {
  const [confirming, setConfirming] = useState(false);

  if (tournament.status !== 'active') return null;

  return (
    <>
      <button onClick={() => setConfirming(true)} className="btn-danger">
        {t('tournament.end')}
      </button>

      {confirming && (
        <ConfirmModal
          title={t('tournament.endConfirmTitle')}
          message={t('tournament.endConfirm')}
          danger
          onConfirm={async () => {
            await api.post(`/api/tournaments/${tournament.id}/end`);
            onEnded();
            toast.success(t('tournament.ended'));
          }}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  );
}
```

Önemli: Confirm modal mutlaka **kullanıcıyı uyarmalı**:
> "Turnuvayı bitirmek istediğine emin misin? Bu işlem geri alınamaz. Yarışmacılar artık puan girişi yapamayacak."

## Ön Kontroller

Bitirmeden önce uyarı:
- Henüz commit edilmemiş set'i olan sporcular varsa liste göster
- Yönetici yine de zorla bitirebilir (bu durumda eksik set'ler "DNF — Did Not Finish" sayılır)

```ts
// Frontend kontrol
const { data: incomplete } = useQuery(['incomplete', id],
  () => api.get(`/api/tournaments/${id}/incomplete`)
);

if (incomplete?.length > 0) {
  return (
    <div>
      <p>{incomplete.length} sporcunun eksik set'i var:</p>
      <ul>{incomplete.map(p => <li>{p.name} {p.surname} - Set {p.missing_set}</li>)}</ul>
      <button onClick={endAnyway}>Yine de Bitir</button>
    </div>
  );
}
```

## Backend

POST `/api/tournaments/:id/end`:

```ts
requireAdmin(ctx);

const { data: tournament } = await supabaseAdmin
  .from('tournaments').select('*').eq('id', id).single();

if (!tournament) throw new HttpError(404, 'Not found');
if (tournament.status !== 'active') throw new HttpError(409, 'Already ended');

await supabaseAdmin.from('tournaments')
  .update({ status: 'completed', ended_at: new Date().toISOString() })
  .eq('id', id);

// Audit log
await supabaseAdmin.from('audit_log').insert({
  actor_id: ctx.userId,
  action: 'tournament_end',
  entity_type: 'tournaments',
  entity_id: id,
  before_data: tournament,
  after_data: { status: 'completed' },
});

return ok({ ended: true });
```

GET `/api/tournaments/:id/incomplete`:
```ts
const { data } = await supabaseAdmin.rpc('find_incomplete_participants', { p_tournament_id: id });
// veya: tüm participant'ların commit'i olmayan set'lerini bul
```

## Kilit Mekanizması

Turnuva `status = 'completed'` olduğunda:

1. **Frontend**: Puan giriş ekranı readonly mode'a geçer
2. **Backend**: `commit-set` endpoint'i 409 döner ("Tournament not active")
3. **DB**: Bonus güvenlik için trigger ile insert/update engellenebilir

```sql
create or replace function block_changes_on_completed_tournament()
returns trigger as $$
declare
  t_status tournament_status;
begin
  -- service_role bypass
  if current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role' then
    return coalesce(new, old);
  end if;

  select t.status into t_status
  from public.sets s
  join public.tournament_participants tp on tp.id = s.participant_id
  join public.tournaments t on t.id = tp.tournament_id
  where s.id = coalesce(new.set_id, old.set_id);

  if t_status = 'completed' then
    raise exception 'Tournament completed; modifications not allowed';
  end if;
  return coalesce(new, old);
end;
$$ language plpgsql;
```

## Frontend Tepkisi

`useQuery` ile turnuva status'ü polling sırasında değişirse:
- Puan giriş ekranındaki kullanıcı **toast bildirim** alır
- Ekran readonly mode'a geçer
- "Excel İndir" butonu görünür

## İptal vs. Bitirme

`tournament_status` enum'da `cancelled` da var. İptal etme yeteneği ileride eklenebilir; şimdilik sadece "bitirme".

## Kabul Kriterleri

- [x] "Turnuvayı Bitir" butonu sadece admin ekranlarında
- [x] Çift onay modal'ı kullanıcıya açıklayıcı mesaj veriyor
- [x] Eksik set olan sporcular uyarı olarak listeleniyor
- [x] Bitirme sonrası tüm puan girişleri 409 dönüyor
- [x] DB trigger güvenlik kilidi devreye giriyor
- [x] audit_log'a `tournament_end` action kaydediliyor
- [x] Sporcu ekranı bitirme anında kilitleniyor

## Bağımlılık
- Task 03, Task 15, Task 17
