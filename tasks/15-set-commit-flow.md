# Task 15 — Set Commit & Düzenleme Akışı

## Amaç
Atışlar girildikten sonra önizleme → Kaydet butonu → set commit → otomatik sonraki sete geçiş. Commit edilmiş set düzenlenemez (sadece yönetici override).

## Akış

```
Set #1 başlar
  ↓ atış sayısı kadar puan gir
  ↓ yanlışı düzenle (commit öncesi)
  ↓ tüm atışlar girilince ÖNİZLEME aktif
  ↓ "Kaydet" butonu
  ↓ POST /api/scores/commit-set
  ↓ atışlar kaydedilir, sets.is_committed=true
  ↓ Set #2 otomatik açılır
...
Tüm setler bitince "Tamamlandı" mesajı, yönetici turnuvayı bitirene dek bekle
```

## State Yönetimi

`src/features/score-entry/useSetEntry.ts`

```ts
interface DraftArrow {
  value: number;
  isX: boolean;
  label: string;
  color: string;
  x?: number;
  y?: number;
}

export function useSetEntry(participantId: string, setNumber: number, arrowsPerSet: number) {
  const [draft, setDraft] = useState<DraftArrow[]>([]);
  const isFull = draft.length >= arrowsPerSet;
  const sortedSum = useMemo(
    () => [...draft].sort((a,b) => b.value - a.value).reduce((s,a) => s + a.value, 0),
    [draft]
  );

  const add = (arrow: DraftArrow) => {
    if (isFull) return;
    setDraft(d => [...d, arrow]);
  };

  const remove = (idx: number) => setDraft(d => d.filter((_, i) => i !== idx));
  const clear = () => setDraft([]);

  const commit = async () => {
    if (!isFull) throw new Error('Set tamamlanmadı');
    await api.post('/api/scores/commit-set', {
      participant_id: participantId,
      set_number: setNumber,
      arrows: draft.map((a, i) => ({
        arrow_number: i + 1,
        score_value: a.value,
        is_x: a.isX,
        hit_x: a.x ?? null,
        hit_y: a.y ?? null,
      })),
    });
    clear();
  };

  return { draft, add, remove, clear, commit, isFull, sortedSum };
}
```

## Önizleme Modal'ı

```tsx
function PreviewModal({ arrows, total, onConfirm, onCancel }) {
  return (
    <Modal>
      <h2 className="text-xl font-bold">{t('score.preview')}</h2>
      <div className="my-4 flex justify-center gap-2">
        {arrows.map((a, i) => (
          <div key={i} className="w-12 h-12 rounded-full flex items-center justify-center font-bold border-2"
            style={{ backgroundColor: a.color }}>{a.label}</div>
        ))}
      </div>
      <div className="text-center text-2xl font-bold">{t('score.total')}: {total}</div>
      <div className="text-sm text-slate-500 text-center mt-2">{t('score.commitWarning')}</div>
      <div className="flex gap-2 mt-4">
        <button onClick={onCancel} className="btn-secondary flex-1">{t('common.back')}</button>
        <button onClick={onConfirm} className="btn-primary flex-1">{t('score.save')}</button>
      </div>
    </Modal>
  );
}
```

## Backend — `commit-set`

POST `/api/scores/commit-set`:

```ts
const schema = z.object({
  participant_id: z.string().uuid(),
  set_number: z.number().int().min(1),
  arrows: z.array(z.object({
    arrow_number: z.number().int().min(1),
    score_value: z.number().int().min(0).max(11),
    is_x: z.boolean(),
    hit_x: z.number().nullable().optional(),
    hit_y: z.number().nullable().optional(),
  })),
});

const ctx = await authenticate(event);
const body = schema.parse(JSON.parse(event.body));

// Yetki kontrolü: bu participant gerçekten bu user'a ait mi?
const { data: participant } = await supabaseAdmin
  .from('tournament_participants')
  .select('user_id, tournament_id, status, tournaments(set_count, arrows_per_set, status)')
  .eq('id', body.participant_id).single();

if (!participant) throw new HttpError(404, 'Participant not found');
if (participant.user_id !== ctx.userId) throw new HttpError(403, 'Forbidden');
if (participant.status !== 'approved') throw new HttpError(409, 'Not approved');
if (participant.tournaments.status !== 'active') throw new HttpError(409, 'Tournament not active');
if (body.arrows.length !== participant.tournaments.arrows_per_set) {
  throw new HttpError(400, 'Wrong arrow count');
}

// Set kaydını al
const { data: set } = await supabaseAdmin.from('sets')
  .select('id, is_committed').eq('participant_id', body.participant_id)
  .eq('set_number', body.set_number).single();

if (!set) throw new HttpError(404, 'Set not found');
if (set.is_committed) throw new HttpError(409, 'Set already committed');

// Atışları kaydet (transaction yerine RPC öner)
const { error: e1 } = await supabaseAdmin.from('arrows').insert(
  body.arrows.map(a => ({ ...a, set_id: set.id }))
);
if (e1) throw new HttpError(500, e1.message);

// Set'i kilitle
await supabaseAdmin.from('sets')
  .update({ is_committed: true, committed_at: new Date().toISOString() })
  .eq('id', set.id);

return ok({ committed: true });
```

> İdeal: bunu PostgreSQL `function` olarak yazıp atomic transaction yapmak. İlk versiyonda iki ardışık çağrı kabul edilebilir (data integrity için trigger zaten koruyor).

## Set Geçişi

Commit başarılı olunca:
1. Local state temizlenir
2. `setNumber + 1` yüklenir (eğer < total)
3. Tüm setler bitti ise "Tamamlandı, yönetici onayı bekleniyor" ekranı

## Düzenleme Modu (Commit Öncesi)

- Atış üzerine tıklayınca **küçük popup**: "Düzenle" / "Sil"
- "Düzenle" → o atış silinir, kullanıcı yenisini girer
- Set commit edildikten sonra düzenleme yetkisi sadece yöneticidedir (Task 17)

## Hata Senaryoları

- Aynı set'i ikinci kez commit etme → 409
- Eksik atış → 400 (frontend zaten engellemeli)
- Yetkisi olmayan kullanıcı → 403
- Turnuva bitmiş → 409

## Kabul Kriterleri

- [x] Set tamamlanmadan kaydet butonu disable
- [x] Önizleme modal'ı kullanıcıya doğrulama yaptırıyor
- [x] Commit sonrası set 2 otomatik açılıyor
- [x] Yanlışlıkla aynı set tekrar commit edilemiyor
- [x] Tüm setler bitince doğru ekran gösteriliyor
- [x] Atış pozisyonu kaydediliyor (görsel mod)

## Bağımlılık
- Task 13, Task 14
