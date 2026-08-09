/**
 * Moteur de récurrence (docs/03 §3). Fonctions PURES : aucune écriture d'état
 * pendant le calcul, testables sur des plages de dates arbitraires.
 */

import type { DayKey, RecurringTodo, Timestamp, Todo } from '../../data/schema';
import {
  dayKey,
  dayOfMonth,
  dayOfWeek,
  daysBetween,
  daysInMonth,
  monthKey,
  startOfDay,
  weekKey,
} from '../time';

/** Clé de période courante d'une todo récurrente. */
export function periodKeyFor(todo: RecurringTodo, ts: Timestamp): string {
  const freq = todo.frequency;
  if (freq === 'daily') return `D:${dayKey(ts)}`;
  if (freq === 'weekly') return weekKey(ts);
  if (freq === 'monthly') return monthKey(ts);
  // everyNDays : index de fenêtre depuis la création
  const n = Math.max(1, freq.everyNDays);
  const idx = Math.floor(daysBetween(startOfDay(todo.createdAt), startOfDay(ts)) / n);
  return `N${n}:${idx}`;
}

/** Nombre de jours que compte la période contenant `ts`. */
function periodLength(todo: RecurringTodo, ts: Timestamp): number {
  const freq = todo.frequency;
  if (freq === 'daily') return 1;
  if (freq === 'weekly') return 7;
  if (freq === 'monthly') return daysInMonth(ts);
  return Math.max(1, freq.everyNDays);
}

/** Jours restants dans la période, en comptant le jour de `ts`. */
function daysRemainingInPeriod(todo: RecurringTodo, ts: Timestamp): number {
  const freq = todo.frequency;
  if (freq === 'daily') return 1;
  if (freq === 'weekly') return 7 - (dayOfWeek(ts) - 1);
  if (freq === 'monthly') return daysInMonth(ts) - dayOfMonth(ts) + 1;
  const n = Math.max(1, freq.everyNDays);
  const since = daysBetween(startOfDay(todo.createdAt), startOfDay(ts));
  return n - (since % n);
}

/**
 * Objectif d'occurrences pour la période contenant `ts`.
 * La période de création est due au prorata plancher, minimum 1 (docs/03 §3).
 */
export function requiredForPeriod(todo: RecurringTodo, ts: Timestamp): number {
  if (todo.mode === 'fixed') {
    return scheduledDaysInPeriod(todo, ts);
  }
  const target = Math.max(1, todo.target);
  if (todo.mode === 'multiDaily') return target;
  // flexible : prorata uniquement sur la période de création
  const isCreationPeriod = periodKeyFor(todo, todo.createdAt) === periodKeyFor(todo, ts);
  if (!isCreationPeriod) return target;
  const remaining = daysRemainingInPeriod(todo, todo.createdAt);
  const len = periodLength(todo, todo.createdAt);
  return Math.max(1, Math.floor((target * remaining) / len));
}

/** Nombre de jours planifiés dans la période (mode fixe). */
function scheduledDaysInPeriod(todo: RecurringTodo, _ts: Timestamp): number {
  const freq = todo.frequency;
  if (freq === 'daily') return 1;
  if (freq === 'weekly') return Math.max(1, todo.fixedDays.length);
  if (freq === 'monthly') return Math.max(1, todo.fixedDays.length);
  return 1;
}

/** Le jour de `ts` est-il un jour planifié ? (mode fixe uniquement) */
export function isScheduledDay(todo: RecurringTodo, ts: Timestamp): boolean {
  if (todo.mode !== 'fixed') return true;
  const freq = todo.frequency;
  if (startOfDay(ts) < startOfDay(todo.createdAt)) return false;
  if (freq === 'daily') return true;
  if (freq === 'weekly') {
    if (todo.fixedDays.length === 0) return true;
    return todo.fixedDays.includes(dayOfWeek(ts));
  }
  if (freq === 'monthly') {
    if (todo.fixedDays.length === 0) return dayOfMonth(ts) === 1;
    const dim = daysInMonth(ts);
    // un jour absent du mois (le 31 en avril) est reporté au dernier jour
    return todo.fixedDays.some((d) => Math.min(d, dim) === dayOfMonth(ts));
  }
  const n = Math.max(1, freq.everyNDays);
  return daysBetween(startOfDay(todo.createdAt), startOfDay(ts)) % n === 0;
}

/** Nombre de complétions enregistrées pour un jour donné. */
export function doneOnDay(todo: Todo, day: DayKey): number {
  let n = 0;
  for (const entry of todo.completionHistory) if (entry.day === day) n++;
  return n;
}

/**
 * Occurrences encore réalisables aujourd'hui.
 * - fixe : 1 si le jour est planifié et pas encore fait
 * - multiDaily : N − complétions du jour
 * - flexible : reste de la période (réalisable n'importe quel jour)
 */
export function dueToday(todo: RecurringTodo, now: Timestamp): number {
  const today = dayKey(now);
  const done = doneOnDay(todo, today);
  if (todo.mode === 'fixed') {
    return isScheduledDay(todo, now) && done === 0 ? 1 : 0;
  }
  if (todo.mode === 'multiDaily') {
    return Math.max(0, Math.max(1, todo.target) - done);
  }
  const required = requiredForPeriod(todo, now);
  return Math.max(0, required - todo.periodProgress.done);
}

/** Occurrences dues sur une plage de jours — utilitaire de test (docs/03 §3). */
export function dueOccurrences(todo: RecurringTodo, from: Timestamp, to: Timestamp): number {
  if (todo.mode !== 'fixed') {
    // approximation utile : nombre de périodes complètes × objectif
    const seen = new Set<string>();
    let cursor = startOfDay(from);
    let total = 0;
    while (cursor <= to) {
      const key = periodKeyFor(todo, cursor);
      if (!seen.has(key)) {
        seen.add(key);
        total += requiredForPeriod(todo, cursor);
      }
      cursor = startOfDay(cursor) + 24 * 3600 * 1000 + 3600 * 1000;
      cursor = startOfDay(cursor);
    }
    return total;
  }
  let total = 0;
  let cursor = startOfDay(from);
  while (cursor <= to) {
    if (isScheduledDay(todo, cursor)) total++;
    const next = new Date(cursor);
    next.setDate(next.getDate() + 1);
    next.setHours(0, 0, 0, 0);
    cursor = next.getTime();
  }
  return total;
}

/** La période a-t-elle changé entre deux instants ? */
export function periodChanged(todo: RecurringTodo, a: Timestamp, b: Timestamp): boolean {
  return periodKeyFor(todo, a) !== periodKeyFor(todo, b);
}
