# Task 09 — Yönetici: Turnuva Listeleme & Geçmiş

## Amaç
Yönetici, aktif turnuvaları ve tamamlanmışları **ayrı ekranlardan** görür. Geçmiş turnuvalar pagination + arama + filtre ile listelenir.

## Ekranlar

### 1. `/admin` — Dashboard (Aktif Turnuvalar)
- Sadece `status = 'active'` turnuvalar
- Kart görünümü: Ad, tarih, hedef, katılımcı sayısı, "Yönet" butonu
- Sağ üstte "Yeni Turnuva" butonu

### 2. `/admin/tournaments` — Tüm Turnuvalar (Geçmiş + Aktif)
- Pagination (20 kayıt/sayfa)
- Arama: turnuva adı (debounce 300ms)
- Filtreler:
  - Durum: Hepsi / Aktif / Tamamlandı / İptal
  - Yay tipi
  - Yaş grubu
  - Tarih aralığı (başlangıç–bitiş)
- Sıralama: Tarih (yeniden eskiye, varsayılan)

## Backend

GET `/api/tournaments?status=&q=&age_group=&bow_type=&from=&to=&page=&limit=`

```ts
// netlify/functions/tournaments/list.ts
const querySchema = z.object({
  status: z.enum(['active','completed','cancelled']).optional(),
  q: z.string().optional(),
  age_group: z.string().optional(),
  bow_type: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

let query = supabaseAdmin
  .from('tournaments')
  .select('*, participants:tournament_participants(count)', { count: 'exact' })
  .order('date', { ascending: false });

if (params.status) query = query.eq('status', params.status);
if (params.q) query = query.ilike('name', `%${params.q}%`);
if (params.age_group) query = query.eq('age_group', params.age_group);
if (params.bow_type) query = query.eq('bow_type', params.bow_type);
if (params.from) query = query.gte('date', params.from);
if (params.to) query = query.lte('date', params.to);

const offset = (params.page - 1) * params.limit;
query = query.range(offset, offset + params.limit - 1);

const { data, count } = await query;
return ok({ data, total: count, page: params.page, limit: params.limit });
```

## UI

`src/pages/admin/TournamentList.tsx`

```tsx
const [filters, setFilters] = useState({
  q: '', status: '', age_group: '', bow_type: '', from: '', to: '', page: 1,
});
const debouncedQ = useDebounce(filters.q, 300);
const { data, isLoading } = useQuery(
  ['tournaments', { ...filters, q: debouncedQ }],
  () => api.get('/api/tournaments', { params: { ...filters, q: debouncedQ } })
);

return (
  <div className="p-6 space-y-4">
    <div className="flex flex-wrap gap-2">
      <input placeholder={t('common.search')} value={filters.q} onChange={...} />
      <select>{/* status */}</select>
      <select>{/* age_group */}</select>
      <select>{/* bow_type */}</select>
      <input type="date" value={filters.from} onChange={...} />
      <input type="date" value={filters.to} onChange={...} />
    </div>

    <table className="w-full">
      <thead>
        <tr><th>Ad</th><th>Tarih</th><th>Yay</th><th>Yaş Grubu</th><th>Hedef</th><th>Katılımcı</th><th>Durum</th><th></th></tr>
      </thead>
      <tbody>
        {data?.data.map(t => (
          <tr key={t.id} className="hover:bg-slate-50">
            <td>{t.name}</td>
            <td>{format(t.date)}</td>
            <td>{t('bow.' + t.bow_type)}</td>
            ...
            <td><Link to={`/admin/tournaments/${t.id}`}>Yönet</Link></td>
          </tr>
        ))}
      </tbody>
    </table>

    <Pagination page={filters.page} total={data?.total} limit={filters.limit} onChange={(p) => setFilters({...filters, page: p})} />
  </div>
);
```

## Mobil Görünüm
Tablo yerine kart listesi (her turnuva ayrı kart, ana bilgiler özet halinde).

## Kabul Kriterleri

- [x] Pagination çalışıyor (sayfa numarası URL'e yansır)
- [x] Arama debounce ile çalışıyor
- [x] Tüm filtreler aynı anda kombine edilebiliyor
- [x] Aktif turnuvalar dashboard'da öne çıkıyor
- [x] URL paylaşılınca aynı filtre durumu yükleniyor (query string)
- [x] Mobile kart görünümü çalışıyor

## Bağımlılık
- Task 03, Task 07, Task 08
