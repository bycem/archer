import type { AgeGroup, BowType, TargetType } from '../lib/archery/constants';

export type TournamentStatus = 'active' | 'completed' | 'cancelled';

export interface Tournament {
  id: string;
  name: string;
  date: string;
  bow_type: BowType;
  age_group: AgeGroup;
  target_type: TargetType;
  distance_meters: number;
  set_count: number;
  arrows_per_set: number;
  status: TournamentStatus;
  created_by: string;
  created_at: string;
  participant_count?: number;
}

export interface TournamentListResponse {
  items: Tournament[];
  page: number;
  pageSize: number;
  total: number;
}

export type QrKind = 'competitor' | 'spectator';

export interface TournamentQrTokens {
  competitor: string | null;
  spectator: string | null;
}
