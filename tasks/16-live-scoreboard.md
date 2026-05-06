# Task 16 — Canlı Skor Tablosu (Polling)

## Amaç
Yarışmacı, yönetici ve izleyici turnuvanın canlı skorlarını polling ile takip eder. Sıralama tie-break kurallarına göre yapılır.

## Tablo Sütunları

```
# | Hedef | Sporcu | Kulüp | Cinsiyet | Toplam | X | 10 | 9 | S1 | S2 | ... | Sn
```

- Set sütunları (`S1, S2, ...`) turnuvanın `set_count` değerine göre dinamik
- Her set hücresinde o setin toplam puanı görünür (atışların toplamı)
- Toplam = tüm setlerin toplamı

## Sıralama (Tie-break)

```sql
order by total desc, x_count desc, ten_count desc, nine_count desc
```

DB view `tournament_scoreboard` (Task 02) bu hesaplamayı yapıyor; backend buna `set_totals` ekleyerek döner.

## Backend

GET `/api/tournaments/:id/scoreboard`:

```ts
// Önce ana satırları al
const { data: rows } = await supabaseAdmin
  .from('tournament_scoreboard')
  .select('*')
  .eq('tournament_id', id);

// Set bazlı toplamlar (bir join + group by)
const { data: setTotals } = await supabaseAdmin.rpc('get_set_totals', { p_tournament_id: id });
// veya manuel:
const { data: setRows } = await supabaseAdmin
  .from('sets')
  .select('id, participant_id, set_number, is_committed, arrows(score_value)')
  .in('participant_id', rows.map(r => r.participant_id));

// Aggregate set totals
const setTotalsMap: Record<string, Record<number, number>> = {};
for (const s of setRows) {
  const total = (s.arrows ?? []).reduce((sum, a) => sum + a.score_value, 0);
  setTotalsMap[s.participant_id] ??= {};
  setTotalsMap[s.participant_id][s.set_number] = s.is_committed ? total : null;
}

// Tek payload
const enriched = rows
  .map(r => ({ ...r, set_totals: setTotalsMap[r.participant_id] ?? {} }))
  .sort((a, b) =>
    b.total - a.total ||
    b.x_count - a.x_count ||
    b.ten_count - a.ten_count ||
    b.nine_count - a.nine_count
  )
  .map((r, i) => ({ ...r, rank: i + 1 }));

return ok({ tournament: { ...tournament }, rows: enriched });
```

## RPC Alternatif (Performans)

PostgreSQL function olarak:

```sql
create or replace function get_scoreboard(p_tournament_id uuid)
returns table (
  rank int, participant_id uuid, target_number text, name text, surname text,
  club text, gender text, total bigint, x_count bigint, ten_count bigint,
  nine_count bigint, set_totals jsonb
) language sql stable as $$
  with sb as (
    select
      tp.id as participant_id, tp.target_number,
      u.name, u.surname, coalesce(tp.club_override, u.club) as club, u.gender,
      coalesce(sum(a.score_value), 0) as total,
      count(*) filter (where a.is_x) as x_count,
      count(*) filter (where a.score_value = 10 and not a.is_x) as ten_count,
      count(*) filter (where a.score_value = 9) as nine_count,
      coalesce(jsonb_object_agg(s.set_number, set_totals.t)
        filter (where s.set_number is not null), '{}'::jsonb) as set_totals
    from public.tournament_participants tp
    join public.users u on u.id = tp.user_id
    left join public.sets s on s.participant_id = tp.id
    left join lateral (
      select sum(score_value) t from public.arrows where set_id = s.id
    ) set_totals on true
    left join public.arrows a on a.set_id = s.id
    where tp.tournament_id = p_tournament_id and tp.status = 'approved'
    group by tp.id, u.id
  )
  select
    row_number() over (
      order by total desc, x_count desc, ten_count desc, nine_count desc
    )::int as rank,
    sb.*
  from sb;
$$;
```

## Frontend

`src/pages/TournamentScoreboard.tsx`

```tsx
export default function TournamentScoreboard() {
  const { id } = useParams();
  const { data, isLoading } = useQuery(
    ['scoreboard', id],
    () => api.get(`/api/tournaments/${id}/scoreboard`),
    { refetchInterval: 7000, refetchIntervalInBackground: false }
  );

  if (isLoading) return <Spinner />;

  const { tournament, rows } = data;

  return (
    <div className="p-4">
      <TournamentHeader t={tournament} />

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 sticky top-0">
            <tr>
              <th>#</th><th>{t('scoreboard.target')}</th><th>{t('scoreboard.athlete')}</th>
              <th>{t('scoreboard.club')}</th><th>{t('scoreboard.gender')}</th>
              <th>{t('score.total')}</th><th>X</th><th>10</th><th>9</th>
              {Array.from({length: tournament.set_count}, (_, i) => (
                <th key={i}>S{i+1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.participant_id} className="border-b">
                <td className="font-bold">{r.rank}</td>
                <td>{r.target_number}</td>
                <td>{r.name} {r.surname}</td>
                <td>{r.club}</td>
                <td>{t(`profile.gender.${r.gender}`)}</td>
                <td className="font-semibold">{r.total}</td>
                <td>{r.x_count}</td>
                <td>{r.ten_count}</td>
                <td>{r.nine_count}</td>
                {Array.from({length: tournament.set_count}, (_, i) => (
                  <td key={i}>{r.set_totals?.[i+1] ?? '-'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

## Polling Optimizasyonu

- Aktif turnuva: 5–7 saniye
- Tamamlanmış turnuva: polling kapalı (statik veri)
- Sayfa arka plana alındığında durdur (`refetchIntervalInBackground: false`)

## Mobil Görünüm

Yatay kaydırma kabul edilebilir ama önemli sütunlar (rank, athlete, total) sticky kalmalı:

```css
.scoreboard td.sticky { position: sticky; left: 0; background: white; }
```

## Görsel İyileştirmeler

- İlk 3 sıra için altın/gümüş/bronz renk
- Mevcut kullanıcının satırı vurgulu
- Henüz commit edilmemiş set'lerde "—" gösterilir

## Kabul Kriterleri

- [x] Polling 7 saniyede bir yeniliyor
- [x] Sıralama tie-break kurallarına uygun
- [x] Set sütunları dinamik genişliyor
- [x] Henüz girilmemiş set "-" gösteriyor
- [x] Commit edilmemiş set "-" (parsiyel veriler gösterilmez)
- [x] Mobile yatay scroll çalışıyor
- [x] Kullanıcının kendi satırı highlight oluyor

## Bağımlılık
- Task 02, Task 15
