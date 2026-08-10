/** Habitudes : binaire (abstinence) et compteur (docs/02 §4, docs/03 §1.3). */

import { BALANCE } from '../balance';
import type { HabitTodo } from '../../data/schema';

/**
 * Pénalité d'une habitude compteur pour un total quotidien `n`, avec les
 * seuils DÉFINIS PAR L'UTILISATEUR (aucun barème imposé).
 *
 *   n ≤ s1        → 0
 *   s1 < n ≤ s2   → (n − s1) × 1
 *   n > s2        → (s2 − s1) × 1 + ceil(2 × (n − s2)^1.5)
 */
export function counterPenalty(n: number, s1: number, s2: number): number {
  const { lightPerUnit, heavyFactor, heavyExponent, dailyCap } = BALANCE.counter;
  if (n <= s1) return 0;
  if (n <= s2) return Math.min((n - s1) * lightPerUnit, dailyCap);
  const light = (s2 - s1) * lightPerUnit;
  const heavy = Math.ceil(heavyFactor * Math.pow(n - s2, heavyExponent));
  return Math.min(light + heavy, dailyCap);
}

/**
 * Rente passive d'une habitude binaire pour une journée réussie, en *unités de
 * barème* — la conversion en ₭ se fait au palier courant (docs/02 §4).
 */
export function abstinenceDailyUnits(streak: number): number {
  const { base, perStreak, dailyCap } = BALANCE.abstinence;
  return Math.min(base + perStreak * streak, dailyCap);
}

/** Perte immédiate lors d'un « j'ai craqué » : plus le streak était long, plus ça coûte. */
export function abstinenceBreakPenalty(streak: number): number {
  const { breakPenaltyPerStreak, breakPenaltyCap } = BALANCE.abstinence;
  return Math.min(streak, breakPenaltyCap) * breakPenaltyPerStreak;
}

export function habitThresholds(todo: HabitTodo): { s1: number; s2: number } {
  return todo.thresholds ?? { s1: 0, s2: 0 };
}
