export type AgeGroup = 'U11' | 'U13' | 'U15' | 'U18' | 'U21' | 'seniors';

export function ageToGroup(age: number): AgeGroup {
  if (age <= 11) return 'U11';
  if (age <= 13) return 'U13';
  if (age <= 15) return 'U15';
  if (age <= 18) return 'U18';
  if (age <= 21) return 'U21';
  return 'seniors';
}
