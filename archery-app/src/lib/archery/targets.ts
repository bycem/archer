import type { TargetType } from './constants';

export interface RingDef {
  score: number;
  isX?: boolean;
  // Halkanın dış yarıçapı, hedef yarıçapına oranla (0..1)
  r: number;
  color: string;
}

export interface TargetDef {
  rings: RingDef[];
}

const WA_FULL: TargetDef = {
  rings: [
    { score: 10, isX: true, r: 0.05, color: '#FFEB3B' },
    { score: 10, r: 0.1, color: '#FFEB3B' },
    { score: 9, r: 0.2, color: '#FFEB3B' },
    { score: 8, r: 0.3, color: '#F44336' },
    { score: 7, r: 0.4, color: '#F44336' },
    { score: 6, r: 0.5, color: '#2196F3' },
    { score: 5, r: 0.6, color: '#2196F3' },
    { score: 4, r: 0.7, color: '#212121' },
    { score: 3, r: 0.8, color: '#212121' },
    { score: 2, r: 0.9, color: '#FFFFFF' },
    { score: 1, r: 1.0, color: '#FFFFFF' },
  ],
};

const WA_COMPOUND_INDOOR: TargetDef = {
  rings: [
    { score: 10, isX: true, r: 0.05, color: '#FFEB3B' },
    { score: 10, r: 0.2, color: '#FFEB3B' },
    { score: 9, r: 0.35, color: '#FFEB3B' },
    { score: 8, r: 0.5, color: '#F44336' },
    { score: 7, r: 0.65, color: '#F44336' },
    { score: 6, r: 0.8, color: '#2196F3' },
    { score: 5, r: 1.0, color: '#2196F3' },
  ],
};

const THREE_D: TargetDef = {
  rings: [
    { score: 11, isX: true, r: 0.1, color: '#FFEB3B' },
    { score: 10, r: 0.2, color: '#FFEB3B' },
    { score: 8, r: 0.45, color: '#F44336' },
    { score: 5, r: 1.0, color: '#2196F3' },
  ],
};

const PUTA: TargetDef = {
  rings: [{ score: 1, r: 1.0, color: '#4CAF50' }],
};

export interface DetectedRing {
  score: number;
  isX: boolean;
  label: string;
}

export function detectRing(
  x: number,
  y: number,
  targetType: TargetType,
): DetectedRing {
  const def = getTargetDef(targetType);
  if (!def) return { score: 0, isX: false, label: 'M' };

  const dist = Math.sqrt(x * x + y * y);
  for (const ring of def.rings) {
    if (dist <= ring.r) {
      return {
        score: ring.score,
        isX: !!ring.isX,
        label: ring.isX ? 'X' : String(ring.score),
      };
    }
  }
  return { score: 0, isX: false, label: 'M' };
}

export function getTargetDef(targetType: TargetType): TargetDef | null {
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
      return null;
  }
}
