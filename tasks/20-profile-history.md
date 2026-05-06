# Task 20 — Profil: Geçmiş Turnuvalar

## Amaç
Yarışmacı profil ekranında katıldığı tüm turnuvaları liste olarak görür. Her satırda sıralama, toplam puan, X/10/9 sayıları.

## Sayfa
`/profile` veya `/my-tournaments`.

## UI

```tsx
export default function MyTournaments() {
  const [filters, setFilters] = useState({ from: '', to: '', page: 1 });

  const { data } = useQuery(['my-tournaments', filters],
    () => api.get('/api/profile/tournaments', { params: filters })
  );

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">{t('profile.myTournaments')}</h1>

      <DateRangeFilter value={filters} onChange={setFilters} />

      {data?.rows.map(row => (
        <Link key={row.tournament_id}
              to={`/tournament/${row.tournament_id}`}
              className="block border rounded-lg p-4 hover:shadow">
          <div className="flex justify-between">
            <div>
              <div className="font-semibold">{row.tournament.name}</div>
              <div className="text-sm text-slate-500">
                {format(row.tournament.date)} · {t(`bow.${row.tournament.bow_type}`)} · {t(`target.${row.tournament.target_type}`)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">#{row.rank}</div>
              <div className="text-sm">{row.total} ({row.x_count}X)</div>
            </div>
          </div>
        </Link>
      ))}

      <Pagination {...} />
    </div>
  );
}
```

## Backend

GET `/api/profile/tournaments?from=&to=&page=&limit=`

```ts
const ctx = await authenticate(event);

let q = supabaseAdmin
  .from('tournament_participants')
  .select('*, tournament:tournaments(*)')
  .eq('user_id', ctx.userId)
  .eq('status', 'approved')
  .order('joined_at', { ascending: false });

if (params.from) q = q.gte('tournament.date', params.from);
if (params.to) q = q.lte('tournament.date', params.to);

const { data: parts } = await q;

// Her katılım için skoru ve rank'ı hesapla (RPC ile toplu)
const enriched = await Promise.all(parts.map(async p => {
  const { data: rows } = await supabaseAdmin.rpc('get_scoreboard', { p_tournament_id: p.tournament.id });
  const me = rows.find(r => r.participant_id === p.id);
  return { ...p, rank: me?.rank, total: me?.total, x_count: me?.x_count };
}));

return ok({ rows: enriched });
```

> Performance not: Her satır için RPC çağırmak büyük datasette yavaşlatır. İleride view veya materialized view ile optimize edilebilir.

## Tarih Filtresi Bileşeni

```tsx
function DateRangeFilter({ value, onChange }) {
  const presets = [
    { label: t('filter.last30days'), days: 30 },
    { label: t('filter.last90days'), days: 90 },
    { label: t('filter.thisYear'), value: () => ({ from: `${new Date().getFullYear()}-01-01` }) },
    { label: t('filter.allTime'), value: () => ({ from: '', to: '' }) },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      <input type="date" value={value.from} onChange={e => onChange({ ...value, from: e.target.value, page: 1 })} />
      <input type="date" value={value.to} onChange={e => onChange({ ...value, to: e.target.value, page: 1 })} />
      {presets.map(p => (
        <button key={p.label} onClick={() => onChange({ ...value, ...p.value() })}>{p.label}</button>
      ))}
    </div>
  );
}
```

## Detay Linki
Satıra tıklayınca `/tournament/:id` skor tablosuna gider, kullanıcı kendisini highlighted satırda görür.

## Kabul Kriterleri

- [x] Kullanıcının onaylanmış katılımları listeleniyor
- [x] Her satırda sıralama, toplam, X bilgisi var
- [x] Tarih filtresi DB seviyesinde uygulanıyor
- [x] Pagination çalışıyor
- [x] Tıklayınca turnuva detayına gidiyor
- [x] Boş listede empty state gösteriliyor

## Bağımlılık
- Task 16
