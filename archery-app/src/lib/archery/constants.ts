export type BowType = 'recurve' | 'compound' | 'barebow' | 'traditional_turkish';
export type AgeGroup = 'U11' | 'U13' | 'U15' | 'U18' | 'U21' | 'seniors';
export type TargetType =
  | 'wa_122'
  | 'wa_80'
  | 'wa_60'
  | 'wa_40'
  | 'three_d'
  | 'puta'
  | 'meydan';

export const BOW_TYPES: BowType[] = ['recurve', 'compound', 'barebow', 'traditional_turkish'];
export const AGE_GROUPS: AgeGroup[] = ['U11', 'U13', 'U15', 'U18', 'U21', 'seniors'];
export const TARGET_TYPES: TargetType[] = [
  'wa_122',
  'wa_80',
  'wa_60',
  'wa_40',
  'three_d',
  'puta',
  'meydan',
];
export const ARROWS_PER_SET_OPTIONS = [3, 4, 5, 6] as const;

export const TARGET_DEFAULT_DISTANCE: Record<TargetType, number> = {
  wa_122: 70,
  wa_80: 50,
  wa_60: 18,
  wa_40: 18,
  three_d: 20,
  puta: 30,
  meydan: 70,
};

export const TARGET_LABELS: Record<TargetType, string> = {
  wa_122: 'WA 122cm',
  wa_80: 'WA 80cm',
  wa_60: 'WA 60cm',
  wa_40: 'WA 40cm',
  three_d: '3D',
  puta: 'Puta',
  meydan: 'Meydan',
};

export const BOW_LABELS: Record<BowType, string> = {
  recurve: 'Klasik (Recurve)',
  compound: 'Makaralı (Compound)',
  barebow: 'Yalın Yay (Barebow)',
  traditional_turkish: 'Geleneksel Türk Yayı',
};

export const AGE_GROUP_LABELS: Record<AgeGroup, string> = {
  U11: 'U11',
  U13: 'U13',
  U15: 'U15',
  U18: 'U18 (Junior)',
  U21: 'U21 (Genç)',
  seniors: 'Büyükler',
};

export interface TournamentPreset {
  label: string;
  set_count: number;
  arrows_per_set: number;
  target_type?: TargetType;
  distance_meters?: number;
}

export function ageToGroup(age: number): AgeGroup {
  if (age <= 10) return 'U11';
  if (age <= 13) return 'U13';
  if (age <= 15) return 'U15';
  if (age <= 18) return 'U18';
  if (age <= 21) return 'U21';
  return 'seniors';
}

export const SET_PRESETS: TournamentPreset[] = [
  {
    label: 'Indoor 18m (10 set × 3)',
    set_count: 10,
    arrows_per_set: 3,
    target_type: 'wa_60',
    distance_meters: 18,
  },
  {
    label: 'Outdoor 70m (12 set × 6)',
    set_count: 12,
    arrows_per_set: 6,
    target_type: 'wa_122',
    distance_meters: 70,
  },
  {
    label: 'Match Play (5 set × 3)',
    set_count: 5,
    arrows_per_set: 3,
  },
];
