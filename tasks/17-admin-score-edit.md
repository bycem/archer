# Task 17 — Yönetici: Puan Düzeltme

## Amaç
Yönetici, herhangi bir sporcunun atış puanını düzeltebilir (hatalı giriş, itiraz, ekipman sorunu vb.). Tüm değişiklikler `audit_log`'a kaydedilir.

## Akış

1. Yönetici `/admin/tournaments/:id/scoreboard`'a girer
2. Sporcu satırına tıklayınca **set bazlı detay paneli** açılır
3. Atışlara tıklayarak inline editör çalışır
4. Değişiklik kaydedilince audit log + toast bildirim

## UI

`src/pages/admin/AdminScoreboard.tsx`

```tsx
export default function AdminScoreboard() {
  const { id } = useParams();
  const { data, refetch } = useQuery(
    ['admin-scoreboard', id],
    () => api.get(`/api/tournaments/${id}/scoreboard`),
    { refetchInterval: 7000 }
  );
  const [openParticipant, setOpenParticipant] = useState<string | null>(null);

  return (
    <div className="p-4">
      {/* Standart skor tablosu (Task 16) ama satıra tıklama açar */}
      <table>
        {data?.rows.map(r => (
          <tr key={r.participant_id}
              onClick={() => setOpenParticipant(r.participant_id)}
              className="cursor-pointer hover:bg-slate-50">
            {/* ... */}
          </tr>
        ))}
      </table>

      {openParticipant && (
        <ParticipantEditPanel
          tournamentId={id}
          participantId={openParticipant}
          onClose={() => { setOpenParticipant(null); refetch(); }}
        />
      )}
    </div>
  );
}
```

## Sporcu Düzenleme Paneli

```tsx
function ParticipantEditPanel({ tournamentId, participantId, onClose }) {
  const { data: detail } = useQuery(
    ['participant-detail', participantId],
    () => api.get(`/api/admin/participants/${participantId}/sets`)
  );

  return (
    <Drawer onClose={onClose}>
      <h2>{detail?.user.name} {detail?.user.surname} ({detail?.target_number})</h2>

      {detail?.sets.map(s => (
        <div key={s.id} className="border rounded p-3 my-2">
          <div className="flex justify-between mb-2">
            <span className="font-semibold">Set {s.set_number}</span>
            <span>Toplam: {s.total}</span>
          </div>
          <div className="flex gap-2">
            {s.arrows.map(a => (
              <ArrowEditor
                key={a.id}
                arrow={a}
                targetType={detail.tournament.target_type}
                onSave={async (newScore) => {
                  await api.post('/api/scores/admin-edit', {
                    arrow_id: a.id,
                    score_value: newScore.value,
                    is_x: newScore.isX,
                    reason: newScore.reason,
                  });
                  refetch();
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </Drawer>
  );
}
```

## Tek Atış Düzenleme

```tsx
function ArrowEditor({ arrow, targetType, onSave }) {
  const [editing, setEditing] = useState(false);
  const options = getScoreOptions(targetType);

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)}
        className="w-12 h-12 rounded-full font-bold border-2"
        style={{ backgroundColor: getColorForArrow(arrow) }}>
        {arrow.is_x ? 'X' : arrow.score_value === 0 ? 'M' : arrow.score_value}
      </button>
    );
  }

  return (
    <Popover onClose={() => setEditing(false)}>
      <NumericPad options={options} onPick={async (s) => {
        const reason = prompt(t('admin.scoreEditReason')) ?? '';
        if (!reason) return;
        await onSave({ ...s, reason });
        setEditing(false);
      }} />
    </Popover>
  );
}
```

## Backend

POST `/api/scores/admin-edit`:

```ts
const schema = z.object({
  arrow_id: z.string().uuid(),
  score_value: z.number().int().min(0).max(11),
  is_x: z.boolean(),
  reason: z.string().min(3).max(500),
});

requireAdmin(ctx);
const body = schema.parse(JSON.parse(event.body));

const { data: before } = await supabaseAdmin
  .from('arrows').select('*').eq('id', body.arrow_id).single();

if (!before) throw new HttpError(404, 'Arrow not found');

// Trigger commit kontrolü engeli vardı - service_role bypass eder
// ama biz yine de manuel update edelim
const { data: after } = await supabaseAdmin
  .from('arrows')
  .update({
    score_value: body.score_value,
    is_x: body.is_x,
  })
  .eq('id', body.arrow_id)
  .select().single();

// Audit log
await supabaseAdmin.from('audit_log').insert({
  actor_id: ctx.userId,
  action: 'score_correction',
  entity_type: 'arrows',
  entity_id: body.arrow_id,
  before_data: before,
  after_data: { ...after, reason: body.reason },
});

return ok({ updated: after });
```

## Trigger Bypass

Task 02'deki `prevent_committed_set_edit` trigger normal kullanıcılar için kilit yapıyor. Service role key bunu bypass eder çünkü Supabase RLS-only mantıkla çalışır ve trigger her durumda çalışsa da, içerideki kontrol RLS değil sadece exception. Çözüm: trigger'ı şöyle güncelle:

```sql
create or replace function prevent_committed_set_edit()
returns trigger as $$
declare
  committed boolean;
  jwt_role text;
begin
  -- Service role bypass
  jwt_role := current_setting('request.jwt.claims', true)::jsonb->>'role';
  if jwt_role = 'service_role' then return coalesce(new, old); end if;

  select is_committed into committed from public.sets where id = coalesce(new.set_id, old.set_id);
  if committed then
    raise exception 'Set committed; only admin via API can edit';
  end if;
  return coalesce(new, old);
end;
$$ language plpgsql;
```

## Audit Log Görüntüleme (İleride)

`/admin/tournaments/:id/audit` sayfası — turnuva için yapılan tüm düzeltmelerin listesi.

## Kabul Kriterleri

- [x] Yönetici skor tablosundaki herhangi bir atışı düzenleyebiliyor
- [x] Düzenleme nedenı (reason) zorunlu
- [x] audit_log'a before/after kaydı yazılıyor
- [x] Yarışmacı kendi commit etmiş atışını düzenleyemiyor
- [x] Skor tablosu düzenleme sonrası canlı güncelleniyor
- [x] Service role doğru bypass ediyor

## Bağımlılık
- Task 16
