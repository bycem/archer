# Task 19 — Excel Export

## Amaç
İki tip Excel export:
1. **Yönetici** — istediği anda tüm sporcuların skorları (aktif veya tamamlanmış)
2. **Yarışmacı** — turnuva bittikten sonra kendi skorları

## Kütüphane
SheetJS (`xlsx`) — client-side veya server-side.

**Karar:** Server-side oluştur (Netlify Function), authorization daha temiz, dosya boyutu büyürse client'a yük binmesin.

## Endpoint'ler

### 1. Yönetici — Turnuva Tümü

GET `/api/exports/tournament/:id.xlsx`

```ts
import * as XLSX from 'xlsx';

requireAdmin(ctx);

const { data: tournament } = await supabaseAdmin
  .from('tournaments').select('*').eq('id', id).single();

const { data: rows } = await supabaseAdmin.rpc('get_scoreboard', { p_tournament_id: id });

// Sheet 1: Genel sıralama
const summary = rows.map(r => ({
  '#': r.rank,
  'Hedef': r.target_number,
  'Ad': r.name,
  'Soyad': r.surname,
  'Kulüp': r.club,
  'Cinsiyet': r.gender,
  'Toplam': r.total,
  'X': r.x_count,
  '10': r.ten_count,
  '9': r.nine_count,
  ...Object.fromEntries(
    Array.from({length: tournament.set_count}, (_, i) => [`S${i+1}`, r.set_totals?.[i+1] ?? '-'])
  ),
}));

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), 'Sıralama');

// Sheet 2: Atış detayı (her atış ayrı satır)
const { data: detailRows } = await supabaseAdmin
  .from('arrows')
  .select('*, sets!inner(set_number, participant_id, tournament_participants!inner(target_number, user_id, users(name,surname)))')
  .eq('sets.tournament_participants.tournament_id', id);

const detail = detailRows.map(a => ({
  Sporcu: `${a.sets.tournament_participants.users.name} ${a.sets.tournament_participants.users.surname}`,
  Hedef: a.sets.tournament_participants.target_number,
  Set: a.sets.set_number,
  Atış: a.arrow_number,
  Puan: a.is_x ? 'X' : (a.score_value === 0 ? 'M' : a.score_value),
  Sayısal: a.score_value,
}));
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detail), 'Atış Detayı');

// Meta sayfa
const meta = [
  ['Turnuva', tournament.name],
  ['Tarih', tournament.date],
  ['Yay Tipi', tournament.bow_type],
  ['Yaş Grubu', tournament.age_group],
  ['Hedef', tournament.target_type],
  ['Mesafe', `${tournament.distance_meters} m`],
  ['Set Sayısı', tournament.set_count],
  ['Set Başına Atış', tournament.arrows_per_set],
  ['Durum', tournament.status],
];
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(meta), 'Bilgi');

const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

return {
  statusCode: 200,
  headers: {
    'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'content-disposition': `attachment; filename="${slugify(tournament.name)}-${tournament.date}.xlsx"`,
  },
  body: buffer.toString('base64'),
  isBase64Encoded: true,
};
```

### 2. Yarışmacı — Kendi Skoru

GET `/api/exports/my-scores/:tournamentId.xlsx`

- Auth zorunlu
- Sadece tournament `status = completed` olduğunda izin verilir
- Sadece kendi `participant_id`'sine ait verileri döner

```ts
const { data: tournament } = await supabaseAdmin
  .from('tournaments').select('*').eq('id', tournamentId).single();
if (tournament.status !== 'completed') throw new HttpError(403, 'Tournament not completed');

const { data: participant } = await supabaseAdmin
  .from('tournament_participants').select('*')
  .eq('tournament_id', tournamentId).eq('user_id', ctx.userId).single();
if (!participant) throw new HttpError(404, 'Participation not found');

// Atış detayı
// ... benzer şekilde sadece kendi participant_id'sine filtre
```

## Frontend İndirme Butonu

```tsx
function DownloadXlsxButton({ url, filename }) {
  const download = async () => {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <button onClick={download} className="btn-secondary flex items-center gap-2">
      <ExcelIcon /> {t('admin.exportXlsx')}
    </button>
  );
}
```

## Yerleşim

- **Yönetici:** `/admin/tournaments/:id` sayfasında "Excel İndir" butonu (her zaman görünür)
- **Yarışmacı:** Turnuva bittikten sonra `/tournament/:id` sayfasında kendi indirme butonu
- **Yarışmacı:** `/my-tournaments` listesinde tamamlanmış turnuvaların yanında

## Format Detayları

- Sayfa 1: **Sıralama** (skor tablosu)
- Sayfa 2: **Atış Detayı** (her atış ayrı satır — analiz için)
- Sayfa 3: **Turnuva Bilgisi** (meta)
- Yarışmacı versiyonu sadece kendi atışlarını içerir

## Kabul Kriterleri

- [x] Yönetici aktif/tamamlanmış her durumda indirebiliyor
- [x] Yarışmacı sadece tamamlanmış turnuvada kendi skorunu indirebiliyor
- [x] Türkçe karakterler dosya adında ve içerikte doğru
- [x] X / M doğru gösteriliyor
- [x] Set sütunları dinamik
- [x] 100+ sporculu turnuvada timeout olmuyor

## Bağımlılık
- Task 16, Task 18
