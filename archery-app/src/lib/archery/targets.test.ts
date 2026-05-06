import { describe, it, expect } from 'vitest';
import { detectRing, getTargetDef } from './targets';

describe('detectRing', () => {
  it('merkez tıklamada X verir', () => {
    expect(detectRing(0, 0, 'wa_122').label).toBe('X');
  });

  it('uzak tıklamada M verir', () => {
    expect(detectRing(1.5, 0, 'wa_122').label).toBe('M');
  });

  it('1 puan halkasını tespit eder', () => {
    const r = detectRing(0.95, 0, 'wa_122');
    expect(r.score).toBe(1);
    expect(r.isX).toBe(false);
  });

  it('Compound indoor: 6 ringini tespit eder', () => {
    const r = detectRing(0.75, 0, 'wa_40');
    expect(r.score).toBe(6);
  });

  it('3D: merkez X=11 değer döndürür', () => {
    const r = detectRing(0, 0, 'three_d');
    expect(r.score).toBe(11);
    expect(r.isX).toBe(true);
  });

  it('Puta: vuran tıklamada 1, çıkan tıklamada 0', () => {
    expect(detectRing(0.5, 0, 'puta').score).toBe(1);
    expect(detectRing(2, 0, 'puta').score).toBe(0);
  });

  it('Meydan: tüm tıklamalar M (serbest giriş, görsel yok)', () => {
    expect(detectRing(0, 0, 'meydan').label).toBe('M');
  });

  it('mesafe pisagor ile hesaplanır (x ve y)', () => {
    // 0.7,0.7 -> sqrt(0.98) ≈ 0.99 → 1 ring
    expect(detectRing(0.7, 0.7, 'wa_122').score).toBe(1);
  });
});

describe('getTargetDef', () => {
  it('meydan için null döner', () => {
    expect(getTargetDef('meydan')).toBeNull();
  });
  it('WA 122 için ring listesi döner', () => {
    expect(getTargetDef('wa_122')?.rings.length).toBeGreaterThan(0);
  });
});
