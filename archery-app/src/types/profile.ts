export type Gender = 'male' | 'female' | 'other';
export type BowType = 'recurve' | 'compound' | 'barebow' | 'traditional_turkish';
export type Language = 'tr' | 'en';
export type Role = 'admin' | 'competitor';

export interface Profile {
  id: string;
  email: string;
  name: string | null;
  surname: string | null;
  age: number | null;
  gender: Gender | null;
  club: string | null;
  bow_type: BowType | null;
  language: Language;
  role: Role;
  profile_completed: boolean;
  created_at: string;
  updated_at: string;
}
