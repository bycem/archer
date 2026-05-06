# Task 08 — Yönetici: Turnuva Oluşturma

## Amaç
Yönetici, tüm okçuluk standartlarına uygun bir form ile turnuva oluşturur. Oluşturma anında 2 QR token (yarışmacı + izleyici) otomatik üretilir.

## Form Alanları

| Alan | Tip | Validation | Default |
|---|---|---|---|
| Turnuva Adı | text | min 3, max 200 | — |
| Tarih | date | gelecek/bugün | bugün |
| Yay Tipi | select | enum | — |
| Yaş Grubu | select | enum | — |
| Set Sayısı | number | 3–30 | 10 |
| Set Başına Atış | select | 3/4/5/6 | 6 |
| Hedef Tipi | select | enum | wa_122 |
| Mesafe (m) | number | 0.1–200 | 70 |

### Hedef Tipi → Önerilen Mesafe (Auto-fill)

| Hedef | Önerilen Mesafe | Yay |
|---|---|---|
| WA 122cm | 70m | Recurve |
| WA 122cm | 50m | Compound |
| WA 80cm | 50m / 30m | Recurve / Compound |
| WA 60cm | 18m | Indoor |
| WA 40cm | 18m | Compound Indoor |
| 3D | 5–45m | Tüm yaylar |
| Puta | 30–50m | Geleneksel |
| Meydan | 70m+ | Geleneksel |

Hedef tipi seçilince mesafe otomatik doldurulur ama düzenlenebilir.

## UI

`src/pages/admin/CreateTournament.tsx`

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { TARGET_DEFAULT_DISTANCE } from '../../lib/archery/constants';

const schema = z.object({
  name: z.string().min(3).max(200),
  date: z.string(),
  bow_type: z.enum(['recurve','compound','barebow','traditional_turkish']),
  age_group: z.enum(['U11','U13','U15','U18','U21','seniors']),
  set_count: z.coerce.number().int().min(3).max(30),
  arrows_per_set: z.coerce.number().int().refine(v => [3,4,5,6].includes(v)),
  target_type: z.enum(['wa_122','wa_80','wa_60','wa_40','three_d','puta','meydan']),
  distance_meters: z.coerce.number().positive().max(200),
});

export default function CreateTournament() {
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { date: new Date().toISOString().slice(0,10), set_count: 10, arrows_per_set: 6, target_type: 'wa_122', distance_meters: 70 },
  });
  const navigate = useNavigate();

  const targetType = watch('target_type');
  useEffect(() => {
    const def = TARGET_DEFAULT_DISTANCE[targetType];
    if (def) setValue('distance_meters', def);
  }, [targetType]);

  const onSubmit = async (values) => {
    const { tournament } = await api.post('/api/tournaments/create', values);
    navigate(`/admin/tournaments/${tournament.id}`);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">{t('tournament.create')}</h1>

      {/* form alanları */}

      <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
        {t('common.save')}
      </button>
    </form>
  );
}
```

## Sabitler

`src/lib/archery/constants.ts`
```ts
export const TARGET_DEFAULT_DISTANCE: Record<string, number> = {
  wa_122: 70,
  wa_80: 50,
  wa_60: 18,
  wa_40: 18,
  three_d: 20,
  puta: 30,
  meydan: 70,
};

export const SET_PRESETS = [
  { label: 'Indoor 18m (10 set × 3)', set_count: 10, arrows_per_set: 3 },
  { label: 'Outdoor 70m (12 set × 6)', set_count: 12, arrows_per_set: 6 },
  { label: 'Match Play (5 set × 3)', set_count: 5, arrows_per_set: 3 },
];
```

Preset'ler form üstünde "Hızlı Şablon" olarak butonlarla sunulabilir.

## Backend

POST `/api/tournaments/create` — bkz. Task 03

## Sonraki Adım
Oluşturulduktan sonra `/admin/tournaments/:id` sayfasına yönlenir. Burada QR kodlar ve katılım talepleri görünür (Task 10, 12).

## Kabul Kriterleri

- [x] Tüm validasyonlar çalışıyor
- [x] Hedef tipi seçilince mesafe otomatik doluyor
- [x] Preset'ler form'u dolduruyor
- [x] Başarılı oluşturmada turnuva detayına yönleniyor
- [x] 2 QR token otomatik oluşuyor (DB'den teyit)
- [x] Yarışmacı bu sayfaya direkt erişemiyor (403/redirect)

## Bağımlılık
- Task 03, Task 07
