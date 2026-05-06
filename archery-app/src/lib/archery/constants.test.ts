import { describe, it, expect } from 'vitest';
import { ageToGroup } from './constants';

describe('ageToGroup', () => {
  it.each([
    [10, 'U11'],
    [13, 'U13'],
    [14, 'U15'],
    [17, 'U18'],
    [20, 'U21'],
    [25, 'seniors'],
  ] as const)('%i → %s', (age, group) => {
    expect(ageToGroup(age)).toBe(group);
  });

  it('sınır değerler — 11→U13, 16→U18, 19→U21, 22→seniors', () => {
    expect(ageToGroup(11)).toBe('U13');
    expect(ageToGroup(16)).toBe('U18');
    expect(ageToGroup(19)).toBe('U21');
    expect(ageToGroup(22)).toBe('seniors');
  });
});
