import { z } from 'zod';

export const bowTypeEnum = z.enum(['recurve', 'compound', 'barebow', 'traditional_turkish']);
export const ageGroupEnum = z.enum(['U11', 'U13', 'U15', 'U18', 'U21', 'seniors']);
export const targetTypeEnum = z.enum([
  'wa_122',
  'wa_80',
  'wa_60',
  'wa_40',
  'three_d',
  'puta',
  'meydan',
]);
export const tournamentStatusEnum = z.enum(['draft', 'active', 'completed', 'cancelled']);
export const qrKindEnum = z.enum(['competitor', 'spectator']);

export const tournamentCreateSchema = z.object({
  name: z.string().min(1).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  bow_type: bowTypeEnum,
  age_group: ageGroupEnum,
  set_count: z.number().int().min(3).max(30),
  arrows_per_set: z
    .number()
    .int()
    .refine((v) => [3, 4, 5, 6].includes(v), 'arrows_per_set must be 3, 4, 5 or 6'),
  target_type: targetTypeEnum,
  distance_meters: z.number().positive(),
});

export const participantJoinSchema = z.object({
  token: z.string().min(8),
  target_number: z.string().min(1).max(10),
  club_override: z.string().max(200).optional(),
});

export const arrowInputSchema = z.object({
  arrow_number: z.number().int().positive(),
  score_value: z.number().int().min(0).max(11),
  is_x: z.boolean().default(false),
  hit_x: z.number().min(-1.5).max(1.5).nullable().optional(),
  hit_y: z.number().min(-1.5).max(1.5).nullable().optional(),
});

export const commitSetSchema = z.object({
  participant_id: z.string().uuid(),
  set_number: z.number().int().positive(),
  arrows: z.array(arrowInputSchema).min(1).max(6),
});

export const adminScoreEditSchema = z.object({
  arrow_id: z.string().uuid(),
  score_value: z.number().int().min(0).max(11),
  is_x: z.boolean().default(false),
  reason: z.string().max(500).optional(),
});

export const profileUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  surname: z.string().min(1).max(100).optional(),
  age: z.number().int().min(1).max(119).optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  club: z.string().max(200).optional(),
  bow_type: bowTypeEnum.optional(),
  language: z.enum(['tr', 'en']).optional(),
  profile_completed: z.boolean().optional(),
});
