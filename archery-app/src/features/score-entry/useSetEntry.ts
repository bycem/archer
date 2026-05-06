import { useState } from 'react';
import { api } from '../../api/client';
import type { ScoreToken } from '../../lib/archery/scoring';

interface CommitResponse {
  set: { id: string; set_number: number; is_committed: boolean };
  next_set: number | null;
  total_sets: number;
}

export function useSetEntry(participantId: string | null, arrowsPerSet: number) {
  const [arrows, setArrows] = useState<ScoreToken[]>([]);
  const [committing, setCommitting] = useState(false);

  const isFull = arrows.length >= arrowsPerSet;
  const total = arrows.reduce((s, a) => s + a.value, 0);

  const add = (t: ScoreToken) => {
    if (isFull) return;
    setArrows((prev) => [...prev, t]);
  };

  const removeAt = (idx: number) => {
    setArrows((prev) => prev.filter((_, i) => i !== idx));
  };

  const reset = () => setArrows([]);

  const commit = async (setNumber: number): Promise<CommitResponse> => {
    if (!participantId) throw new Error('Participant not loaded');
    if (!isFull) throw new Error('Set is incomplete');
    setCommitting(true);
    try {
      const res = await api.post<CommitResponse>('/api/scores-commit-set', {
        participant_id: participantId,
        set_number: setNumber,
        arrows: arrows.map((a, i) => ({
          arrow_number: i + 1,
          score_value: a.value,
          is_x: a.isX,
          hit_x: a.hitX ?? null,
          hit_y: a.hitY ?? null,
        })),
      });
      setArrows([]);
      return res;
    } finally {
      setCommitting(false);
    }
  };

  return { arrows, add, removeAt, reset, commit, isFull, total, committing };
}
