import type { TargetType } from './constants';

export interface ScoreToken {
  value: number;
  isX: boolean;
  label: string;
  color: string;
  // Görsel hedef modunda doldurulur. Normalize edilmiş -1..1 koordinat (merkez = 0,0).
  hitX?: number;
  hitY?: number;
}

const WA_FULL: ScoreToken[] = [
  { value: 10, isX: true, label: 'X', color: '#FFEB3B' },
  { value: 10, isX: false, label: '10', color: '#FFEB3B' },
  { value: 9, isX: false, label: '9', color: '#F44336' },
  { value: 8, isX: false, label: '8', color: '#F44336' },
  { value: 7, isX: false, label: '7', color: '#2196F3' },
  { value: 6, isX: false, label: '6', color: '#2196F3' },
  { value: 5, isX: false, label: '5', color: '#212121' },
  { value: 4, isX: false, label: '4', color: '#212121' },
  { value: 3, isX: false, label: '3', color: '#FFFFFF' },
  { value: 2, isX: false, label: '2', color: '#FFFFFF' },
  { value: 1, isX: false, label: '1', color: '#FFFFFF' },
  { value: 0, isX: false, label: 'M', color: '#9E9E9E' },
];

const WA_COMPOUND_INDOOR: ScoreToken[] = [
  { value: 10, isX: true, label: 'X', color: '#FFEB3B' },
  { value: 10, isX: false, label: '10', color: '#FFEB3B' },
  { value: 9, isX: false, label: '9', color: '#F44336' },
  { value: 8, isX: false, label: '8', color: '#F44336' },
  { value: 7, isX: false, label: '7', color: '#2196F3' },
  { value: 6, isX: false, label: '6', color: '#2196F3' },
  { value: 5, isX: false, label: '5', color: '#212121' },
  { value: 0, isX: false, label: 'M', color: '#9E9E9E' },
];

const THREE_D: ScoreToken[] = [
  { value: 11, isX: true, label: 'X', color: '#FFEB3B' },
  { value: 10, isX: false, label: '10', color: '#FFEB3B' },
  { value: 8, isX: false, label: '8', color: '#F44336' },
  { value: 5, isX: false, label: '5', color: '#2196F3' },
  { value: 0, isX: false, label: 'M', color: '#9E9E9E' },
];

const PUTA: ScoreToken[] = [
  { value: 1, isX: false, label: 'Vurdu', color: '#4CAF50' },
  { value: 0, isX: false, label: 'Vurmadı', color: '#9E9E9E' },
];

export function getScoreOptions(targetType: TargetType): ScoreToken[] {
  switch (targetType) {
    case 'wa_122':
    case 'wa_80':
    case 'wa_60':
      return WA_FULL;
    case 'wa_40':
      return WA_COMPOUND_INDOOR;
    case 'three_d':
      return THREE_D;
    case 'puta':
      return PUTA;
    case 'meydan':
      return [];
  }
}

export function getContrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luma > 0.6 ? '#212121' : '#FFFFFF';
}

export function pickByDigit(options: ScoreToken[], digit: number): ScoreToken | undefined {
  return options.find((o) => !o.isX && o.value === digit);
}

export function pickX(options: ScoreToken[]): ScoreToken | undefined {
  return options.find((o) => o.isX);
}

export function pickMiss(options: ScoreToken[]): ScoreToken | undefined {
  return options.find((o) => o.label === 'M');
}

export function calculateTotal(arrows: { value: number }[]): number {
  return arrows.reduce((sum, a) => sum + (a.value || 0), 0);
}

export interface ParticipantRanking {
  total: number;
  x_count: number;
  ten_count: number;
  nine_count: number;
}

export function sortParticipants<T extends ParticipantRanking>(participants: T[]): T[] {
  return [...participants].sort(
    (a, b) =>
      b.total - a.total ||
      b.x_count - a.x_count ||
      b.ten_count - a.ten_count ||
      b.nine_count - a.nine_count,
  );
}
