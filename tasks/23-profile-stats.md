# Task 23 — Profil: İstatistikler & Tarih Filtresi

## Amaç
Yarışmacının agregat performans istatistikleri. Tarih, yay, hedef bazında filtrelenebilir.

## Endpoint

GET `/api/profile/stats?from=&to=&bow_type=&target_type=`

```sql
create or replace function get_user_stats(
  p_user_id uuid, p_from date default null, p_to date default null,
  p_bow_type bow_type default null, p_target_type target_type default null
) returns jsonb language sql stable as $$
  with arr as (
    select a.score_value, a.is_x, t.target_type, t.bow_type, s.set_number
    from public.arrows a
    join public.sets s on s.id = a.set_id and s.is_committed
    join public.tournament_participants tp on tp.id = s.participant_id
    join public.tournaments t on t.id = tp.tournament_id
    where tp.user_id = p_user_id and tp.status = 'approved'
      and (p_from is null or t.date >= p_from)
      and (p_to is null or t.date <= p_to)
      and (p_bow_type is null or t.bow_type = p_bow_type)
      and (p_target_type is null or t.target_type = p_target_type)
  )
  select jsonb_build_object(
    'total_arrows', count(*),
    'total_score', coalesce(sum(score_value), 0),
    'avg_per_arrow', coalesce(round(avg(score_value)::numeric, 2), 0),
    'x_count', count(*) filter (where is_x),
    'ten_count', count(*) filter (where score_value = 10 and not is_x),
    'nine_count', count(*) filter (where score_value = 9),
    'gold_ratio', coalesce(round(
      (count(*) filter (where score_value >= 9))::numeric / nullif(count(*),0) * 100, 1
    ), 0),
    'red_ratio', coalesce(round(
      (count(*) filter (where score_value between 7 and 8))::numeric / nullif(count(*),0) * 100, 1
    ), 0),
    'miss_count', count(*) filter (where score_value = 0),
    'by_bow', (
      select jsonb_object_agg(bow_type, c)
      from (select bow_type, count(*) c from arr group by bow_type) s
    ),
    'by_target', (
      select jsonb_object_agg(target_type, c)
      from (select target_type, count(*) c from arr group by target_type) s
    )
  )
  from arr;
$$;
```

## UI

```tsx
function StatsCard({ stats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatBox label={t('stats.totalArrows')} value={stats.total_arrows} />
      <StatBox label={t('stats.totalScore')} value={stats.total_score} />
      <StatBox label={t('stats.avgPerArrow')} value={stats.avg_per_arrow} />
      <StatBox label={t('stats.xCount')} value={stats.x_count} hint={`${stats.x_ratio}%`} />

      <StatBox label="10" value={stats.ten_count} />
      <StatBox label="9" value={stats.nine_count} />
      <StatBox label={t('stats.goldRatio')} value={`${stats.gold_ratio}%`} hint="9–X" />
      <StatBox label={t('stats.misses')} value={stats.miss_count} />
    </div>
  );
}

function StatBox({ label, value, hint }) {
  return (
    <div className="border rounded-lg p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
      {hint && <div className="text-xs text-slate-400">{hint}</div>}
    </div>
  );
}
```

## Yay Tipine Göre Ayrıştırma

```tsx
<div>
  <h3>{t('stats.byBow')}</h3>
  {Object.entries(stats.by_bow ?? {}).map(([bow, count]) => (
    <div key={bow} className="flex justify-between">
      <span>{t(`bow.${bow}`)}</span>
      <span>{count} atış</span>
    </div>
  ))}
</div>
```

## Set Bazında Performans

Ek istatistik: set numarasına göre ortalama puan (yarışmacı erken setlerde mi yorgun, geç setlerde mi düşüyor anlamak için).

```sql
-- ek query
select set_number, avg(score_value) avg_score, sum(score_value) total
from arr group by set_number order by set_number;
```

```tsx
<BarChart data={setStats}>
  <XAxis dataKey="set_number" />
  <YAxis />
  <Bar dataKey="avg_score" fill="#2196F3" />
</BarChart>
```

## Profil Sayfası Genel Yapı

```tsx
export default function Profile() {
  const [filters, setFilters] = useState({ from: '', to: '', bow_type: '', target_type: '' });

  const { data: stats } = useQuery(['stats', filters], () => api.get('/api/profile/stats', { params: filters }));
  const { data: progress } = useQuery(['progress', filters], () => api.get('/api/profile/progress', { params: filters }));
  const { data: heatmap } = useQuery(['heatmap', filters], () => api.get('/api/profile/heatmap', { params: filters }));

  return (
    <div className="p-4 space-y-6">
      <ProfileHeader />

      <FilterBar value={filters} onChange={setFilters} />

      <StatsCard stats={stats} />

      <Tabs>
        <Tab label={t('profile.progress')}><ProgressChart data={progress} /></Tab>
        <Tab label={t('profile.heatmap')}><Heatmap targetType={filters.target_type || 'wa_122'} points={heatmap} /></Tab>
        <Tab label={t('profile.history')}><MyTournaments filters={filters} /></Tab>
      </Tabs>
    </div>
  );
}
```

## Ortak Filtre Bileşeni

`FilterBar`:
- Tarih aralığı (preset + manuel)
- Yay tipi (tümü dahil)
- Hedef tipi (tümü dahil)
- "Filtreleri sıfırla" butonu

State URL query string'e yansır → paylaşılabilir, refresh'te kalıcı.

## Kabul Kriterleri

- [x] Tarih filtresi tüm sekmeleri günceller
- [x] Yay/hedef filtresi RPC'ye geçirilir
- [x] Boş filtre = tüm zaman
- [x] İstatistik kartları net ve okunaklı
- [x] Set bazında bar chart çalışıyor
- [x] Mobile responsive
- [x] URL paylaşılınca aynı filtre geliyor

## Bağımlılık
- Task 20, Task 21, Task 22
