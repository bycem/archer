import * as XLSX from 'xlsx';
import { supabaseAdmin } from './supabase';
import { HttpError } from './errors';

export interface TournamentRow {
  id: string;
  name: string;
  date: string;
  bow_type: string;
  age_group: string;
  target_type: string;
  distance_meters: number;
  set_count: number;
  arrows_per_set: number;
  status: string;
}

interface ScoreboardViewRow {
  participant_id: string;
  tournament_id: string;
  target_number: string | null;
  user_id: string;
  name: string | null;
  surname: string | null;
  club: string | null;
  gender: string | null;
  total: number;
  x_count: number;
  ten_count: number;
  nine_count: number;
}

interface SetWithArrows {
  id: string;
  participant_id: string;
  set_number: number;
  is_committed: boolean;
  arrows: { id: string; arrow_number: number; score_value: number; is_x: boolean }[] | null;
}

const GENDER_LABELS: Record<string, string> = {
  male: 'Erkek',
  female: 'Kadın',
  other: 'Diğer',
};

const BOW_LABELS: Record<string, string> = {
  recurve: 'Klasik (Recurve)',
  compound: 'Makaralı (Compound)',
  barebow: 'Çıplak Yay (Barebow)',
  traditional: 'Geleneksel',
};

const AGE_LABELS: Record<string, string> = {
  u14: 'Yıldız (U14)',
  u18: 'Genç (U18)',
  u21: 'Ümit (U21)',
  senior: 'Büyük',
  master: 'Master',
};

const TARGET_LABELS: Record<string, string> = {
  wa122: 'WA 122 cm',
  wa80: 'WA 80 cm',
  wa60: 'WA 60 cm',
  wa40: 'WA 40 cm',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Aktif',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
};

function arrowLabel(score_value: number, is_x: boolean): string {
  if (is_x) return 'X';
  if (score_value === 0) return 'M';
  return String(score_value);
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'tournament';
}

export async function loadTournament(id: string): Promise<TournamentRow> {
  const { data: tournament, error } = await supabaseAdmin
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !tournament) throw new HttpError(404, 'Tournament not found', 'NOT_FOUND');
  return tournament as TournamentRow;
}

interface BuildOptions {
  tournament: TournamentRow;
  filterUserId?: string;
}

export async function buildTournamentWorkbook({
  tournament,
  filterUserId,
}: BuildOptions): Promise<Buffer> {
  const { data: rows, error: e1 } = await supabaseAdmin
    .from('tournament_scoreboard')
    .select('*')
    .eq('tournament_id', tournament.id);
  if (e1) throw new HttpError(500, e1.message);

  let baseRows = (rows ?? []) as ScoreboardViewRow[];
  if (filterUserId) baseRows = baseRows.filter((r) => r.user_id === filterUserId);

  const participantIds = baseRows.map((r) => r.participant_id);

  const setTotals: Record<string, Record<number, number>> = {};
  let setRows: SetWithArrows[] = [];
  if (participantIds.length > 0) {
    const { data, error: e2 } = await supabaseAdmin
      .from('sets')
      .select('id, participant_id, set_number, is_committed, arrows(id, arrow_number, score_value, is_x)')
      .in('participant_id', participantIds);
    if (e2) throw new HttpError(500, e2.message);
    setRows = (data ?? []) as SetWithArrows[];
    for (const s of setRows) {
      if (!s.is_committed) continue;
      const total = (s.arrows ?? []).reduce((sum, a) => sum + a.score_value, 0);
      setTotals[s.participant_id] ??= {};
      setTotals[s.participant_id][s.set_number] = total;
    }
  }

  const ranked = baseRows
    .slice()
    .sort(
      (a, b) =>
        b.total - a.total ||
        b.x_count - a.x_count ||
        b.ten_count - a.ten_count ||
        b.nine_count - a.nine_count,
    )
    .map((r, i) => ({ ...r, rank: i + 1 }));

  const setNums = Array.from({ length: tournament.set_count }, (_, i) => i + 1);

  const summary = ranked.map((r) => {
    const row: Record<string, string | number> = {
      '#': r.rank,
      Hedef: r.target_number ?? '-',
      Ad: r.name ?? '',
      Soyad: r.surname ?? '',
      Kulüp: r.club ?? '',
      Cinsiyet: r.gender ? (GENDER_LABELS[r.gender] ?? r.gender) : '',
      Toplam: r.total,
      X: r.x_count,
      '10': r.ten_count,
      '9': r.nine_count,
    };
    for (const n of setNums) {
      row[`S${n}`] = setTotals[r.participant_id]?.[n] ?? '-';
    }
    return row;
  });

  const wb = XLSX.utils.book_new();
  const summarySheet =
    summary.length > 0
      ? XLSX.utils.json_to_sheet(summary)
      : XLSX.utils.aoa_to_sheet([['Kayıt yok']]);
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Sıralama');

  const participantById = new Map(baseRows.map((r) => [r.participant_id, r]));
  const detail: Record<string, string | number>[] = [];
  for (const s of setRows) {
    const p = participantById.get(s.participant_id);
    if (!p) continue;
    const arrows = (s.arrows ?? []).slice().sort((a, b) => a.arrow_number - b.arrow_number);
    for (const a of arrows) {
      detail.push({
        Sporcu: `${p.name ?? ''} ${p.surname ?? ''}`.trim(),
        Kulüp: p.club ?? '',
        Hedef: p.target_number ?? '-',
        Set: s.set_number,
        Atış: a.arrow_number,
        Puan: arrowLabel(a.score_value, a.is_x),
        Sayısal: a.score_value,
        Kayıtlı: s.is_committed ? 'Evet' : 'Hayır',
      });
    }
  }
  detail.sort((a, b) => {
    const sa = String(a.Sporcu);
    const sb = String(b.Sporcu);
    if (sa !== sb) return sa.localeCompare(sb, 'tr');
    if (a.Set !== b.Set) return Number(a.Set) - Number(b.Set);
    return Number(a.Atış) - Number(b.Atış);
  });
  const detailSheet =
    detail.length > 0
      ? XLSX.utils.json_to_sheet(detail)
      : XLSX.utils.aoa_to_sheet([['Atış yok']]);
  XLSX.utils.book_append_sheet(wb, detailSheet, 'Atış Detayı');

  const meta: (string | number)[][] = [
    ['Turnuva', tournament.name],
    ['Tarih', tournament.date],
    ['Yay Tipi', BOW_LABELS[tournament.bow_type] ?? tournament.bow_type],
    ['Yaş Grubu', AGE_LABELS[tournament.age_group] ?? tournament.age_group],
    ['Hedef', TARGET_LABELS[tournament.target_type] ?? tournament.target_type],
    ['Mesafe', `${tournament.distance_meters} m`],
    ['Set Sayısı', tournament.set_count],
    ['Set Başına Atış', tournament.arrows_per_set],
    ['Durum', STATUS_LABELS[tournament.status] ?? tournament.status],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(meta), 'Bilgi');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}
