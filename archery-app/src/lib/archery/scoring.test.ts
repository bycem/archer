import { describe, it, expect } from 'vitest';
import {
  calculateTotal,
  sortParticipants,
  getScoreOptions,
  pickByDigit,
  pickX,
  pickMiss,
  getContrastColor,
} from './scoring';

describe('calculateTotal', () => {
  it('toplam puanı doğru hesaplar', () => {
    expect(calculateTotal([{ value: 10 }, { value: 9 }, { value: 8 }])).toBe(27);
  });

  it('iska 0 sayılır', () => {
    expect(calculateTotal([{ value: 0 }, { value: 10 }])).toBe(10);
  });

  it('boş diziye 0 döner', () => {
    expect(calculateTotal([])).toBe(0);
  });
});

describe('sortParticipants — tie-break', () => {
  it('toplam puana göre sıralar', () => {
    const a = { total: 100, x_count: 0, ten_count: 0, nine_count: 0 };
    const b = { total: 90, x_count: 5, ten_count: 5, nine_count: 5 };
    expect(sortParticipants([b, a])).toEqual([a, b]);
  });

  it('eşitlikte X sayısına bakar', () => {
    const a = { total: 100, x_count: 3, ten_count: 5, nine_count: 0 };
    const b = { total: 100, x_count: 5, ten_count: 3, nine_count: 0 };
    expect(sortParticipants([a, b])).toEqual([b, a]);
  });

  it('X eşitse 10 sayısına bakar', () => {
    const a = { total: 100, x_count: 5, ten_count: 3, nine_count: 0 };
    const b = { total: 100, x_count: 5, ten_count: 5, nine_count: 0 };
    expect(sortParticipants([a, b])).toEqual([b, a]);
  });

  it('10 eşitse 9 sayısına bakar', () => {
    const a = { total: 100, x_count: 5, ten_count: 5, nine_count: 2 };
    const b = { total: 100, x_count: 5, ten_count: 5, nine_count: 4 };
    expect(sortParticipants([a, b])).toEqual([b, a]);
  });

  it('orijinal diziyi mutate etmez', () => {
    const a = { total: 90, x_count: 0, ten_count: 0, nine_count: 0 };
    const b = { total: 100, x_count: 0, ten_count: 0, nine_count: 0 };
    const input = [a, b];
    sortParticipants(input);
    expect(input).toEqual([a, b]);
  });
});

describe('getScoreOptions', () => {
  it('WA hedefler için 0–10 + X döndürür', () => {
    const opts = getScoreOptions('wa_122');
    expect(opts.find((o) => o.label === 'X')?.isX).toBe(true);
    expect(opts.find((o) => o.label === '10' && !o.isX)).toBeDefined();
    expect(opts.find((o) => o.label === 'M')?.value).toBe(0);
  });

  it('WA 40 (compound indoor) için 5+ ve X döndürür', () => {
    const opts = getScoreOptions('wa_40');
    expect(opts.find((o) => o.label === 'X')?.isX).toBe(true);
    expect(opts.find((o) => o.label === '4')).toBeUndefined();
    expect(opts.find((o) => o.label === '5')).toBeDefined();
  });

  it('3D hedef için X=11', () => {
    const opts = getScoreOptions('three_d');
    expect(opts.find((o) => o.label === 'X')?.value).toBe(11);
  });

  it('Puta için sadece vurdu/vurmadı', () => {
    const opts = getScoreOptions('puta');
    expect(opts).toHaveLength(2);
  });

  it('Meydan için boş döner (serbest giriş)', () => {
    expect(getScoreOptions('meydan')).toEqual([]);
  });
});

describe('pickByDigit / pickX / pickMiss', () => {
  const opts = getScoreOptions('wa_122');
  it('rakam ile (X olmayan) seçer', () => {
    expect(pickByDigit(opts, 9)?.label).toBe('9');
  });
  it('X token döndürür', () => {
    expect(pickX(opts)?.isX).toBe(true);
  });
  it('M token döndürür', () => {
    expect(pickMiss(opts)?.value).toBe(0);
  });
});

describe('getContrastColor', () => {
  it('açık zeminlerde koyu yazı tonu döner', () => {
    expect(getContrastColor('#FFEB3B')).toBe('#212121');
  });
  it('koyu zeminlerde açık yazı tonu döner', () => {
    expect(getContrastColor('#212121')).toBe('#FFFFFF');
  });
});
