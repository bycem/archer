# Task 21 — Profil: Gelişim Grafiği

## Amaç
Yarışmacının zaman içindeki performansını gösteren çizgi grafiği. X ekseni: tarih, Y ekseni: toplam puan (veya ortalama set puanı).

## Veriler

`/api/profile/progress?from=&to=&bow_type=&target_type=`

```ts
const ctx = await authenticate(event);
const { data } = await supabaseAdmin.rpc('get_user_progress', {
  p_user_id: ctx.userId,
  p_from: params.from ?? null,
  p_to: params.to ?? null,
  p_bow_type: params.bow_type ?? null,
  p_target_type: params.target_type ?? null,
});
return ok(data);
```

PostgreSQL function:

```sql
create or replace function get_user_progress(
  p_user_id uuid, p_from date default null, p_to date default null,
  p_bow_type bow_type default null, p_target_type target_type default null
) returns table(
  tournament_id uuid, tournament_name text, date date,
  total bigint, x_count bigint, ten_count bigint, nine_count bigint,
  avg_per_arrow numeric, target_type target_type, bow_type bow_type
) language sql stable as $$
  select
    t.id, t.name, t.date,
    coalesce(sum(a.score_value), 0)::bigint as total,
    count(*) filter (where a.is_x)::bigint as x_count,
    count(*) filter (where a.score_value = 10 and not a.is_x)::bigint as ten_count,
    count(*) filter (where a.score_value = 9)::bigint as nine_count,
    coalesce(avg(a.score_value), 0)::numeric(5,2) as avg_per_arrow,
    t.target_type, t.bow_type
  from public.tournaments t
  join public.tournament_participants tp on tp.tournament_id = t.id
  left join public.sets s on s.participant_id = tp.id and s.is_committed
  left join public.arrows a on a.set_id = s.id
  where tp.user_id = p_user_id and tp.status = 'approved'
    and (p_from is null or t.date >= p_from)
    and (p_to is null or t.date <= p_to)
    and (p_bow_type is null or t.bow_type = p_bow_type)
    and (p_target_type is null or t.target_type = p_target_type)
  group by t.id
  order by t.date asc;
$$;
```

## UI — Recharts

```tsx
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

export function ProgressChart({ data }) {
  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-semibold mb-4">{t('profile.progressChart')}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tickFormatter={d => format(d, 'dd MMM')} />
          <YAxis />
          <Tooltip
            labelFormatter={d => format(d, 'dd MMM yyyy')}
            content={<CustomTooltip />}
          />
          <Legend />
          <Line type="monotone" dataKey="total" name={t('score.total')} stroke="#2196F3" strokeWidth={2} />
          <Line type="monotone" dataKey="avg_per_arrow" name={t('score.avgPerArrow')} stroke="#F44336" yAxisId="right" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

## Karşılaştırma — Aynı Format Filtresi

Recurve 70m WA122 vs Compound 50m WA80 karşılaştırılması yanıltıcı olur. Bu yüzden filtreler:

- Yay tipi
- Hedef tipi
- Mesafe (yaklaşık)
- Tarih aralığı

Default: Kullanıcının en sık katıldığı format auto-seçilir.

## Ek Metrikler

İsteğe bağlı ek grafikler:
- **X oranı** (X / toplam atış)
- **10+9 oranı** (sarı isabet yüzdesi)
- **Ortalama set puanı** trendi

```tsx
<Tabs>
  <Tab label="Toplam Puan"><LineChart data={data} dataKey="total" /></Tab>
  <Tab label="X Oranı"><LineChart data={data} dataKey="x_ratio" /></Tab>
  <Tab label="Ortalama"><LineChart data={data} dataKey="avg_per_arrow" /></Tab>
</Tabs>
```

## Boş Durum
Kullanıcı henüz turnuvaya katılmamışsa: "Henüz turnuva geçmişin yok. Bir turnuvaya katılarak başla!"

## Kabul Kriterleri

- [x] Tarih aralığı filtresi grafiği günceller
- [x] Yay/hedef tipi filtresi çalışır
- [x] Tooltip turnuva adı + tarih + toplam gösterir
- [x] 1 turnuva varsa nokta tek başına gösterilir
- [x] Mobile responsive
- [x] Empty state çalışıyor

## Bağımlılık
- Task 20
