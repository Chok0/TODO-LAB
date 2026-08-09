/** Regroupements et libellés de la colonne todo — sélecteurs purs (docs/11 §4). */

import { addDays, dayOfWeek, startOfDay, type Timestamp } from '../time';
import type { GameState, HabitTodo, RecurringTodo, Todo } from '../../data/schema';
import { dueToday, isScheduledDay } from './recurrence';

export interface TodoGroups {
  today: Todo[];
  week: Todo[];
  later: Todo[];
  habits: HabitTodo[];
}

function endOfToday(now: Timestamp): Timestamp {
  return startOfDay(addDays(now, 1)) - 1;
}

function endOfWeek(now: Timestamp): Timestamp {
  return startOfDay(addDays(now, 8 - dayOfWeek(now))) - 1;
}

/** Une occurrence tombe-t-elle dans les sept prochains jours ? */
function scheduledSoon(todo: RecurringTodo, now: Timestamp): boolean {
  for (let i = 1; i <= 7; i++) {
    if (isScheduledDay(todo, addDays(now, i))) return true;
  }
  return false;
}

export function groupTodos(state: GameState, now: Timestamp): TodoGroups {
  const groups: TodoGroups = { today: [], week: [], later: [], habits: [] };
  const todayEnd = endOfToday(now);
  const weekEnd = endOfWeek(now);

  for (const todo of state.todos) {
    if (todo.archived) continue;

    if (todo.kind === 'habit') {
      groups.habits.push(todo);
      continue;
    }

    if (todo.kind === 'oneshot') {
      if (todo.completedAt) continue;
      // sans échéance : c'est l'« inbox » du jour, pas un report (docs/11 §4)
      if (todo.dueAt === null) groups.today.push(todo);
      else if (todo.dueAt <= todayEnd) groups.today.push(todo);
      else if (todo.dueAt <= weekEnd) groups.week.push(todo);
      else groups.later.push(todo);
      continue;
    }

    if (dueToday(todo, now) > 0) groups.today.push(todo);
    else if (todo.mode !== 'fixed' || scheduledSoon(todo, now)) groups.week.push(todo);
    else groups.later.push(todo);
  }

  const byPriority = (a: Todo, b: Todo) => {
    const dueA = a.kind === 'oneshot' ? (a.dueAt ?? Infinity) : 0;
    const dueB = b.kind === 'oneshot' ? (b.dueAt ?? Infinity) : 0;
    if (dueA !== dueB) return dueA - dueB;
    return b.difficulty - a.difficulty;
  };
  groups.today.sort(byPriority);
  groups.week.sort(byPriority);
  groups.later.sort(byPriority);

  return groups;
}

/** Occurrences encore réalisables aujourd'hui, tous types confondus. */
export function remainingToday(todo: Todo, now: Timestamp): number {
  if (todo.kind === 'recurring') return dueToday(todo, now);
  if (todo.kind === 'oneshot') return todo.completedAt ? 0 : 1;
  return 0;
}

/** Icône de type de récurrence (docs/11 §4). */
export function recurrenceIcon(todo: Todo): 'oneshot' | 'fixed' | 'flexible' | 'abstinence' | 'counter' {
  if (todo.kind === 'oneshot') return 'oneshot';
  if (todo.kind === 'habit') return todo.habitKind === 'abstinence' ? 'abstinence' : 'counter';
  if (todo.mode === 'fixed') return 'fixed';
  return 'flexible';
}

/** Résumé lisible de la récurrence, pour les chips des cartes. */
export function recurrenceLabel(todo: Todo): string {
  if (todo.kind === 'oneshot') return 'ponctuelle';
  if (todo.kind === 'habit') return todo.habitKind === 'abstinence' ? 'abstinence' : 'compteur';

  const days = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'];
  const freq = todo.frequency;
  if (freq === 'daily') return todo.mode === 'multiDaily' ? `${todo.target}×/jour` : 'chaque jour';
  if (freq === 'weekly') {
    if (todo.mode === 'fixed' && todo.fixedDays.length) {
      return todo.fixedDays.map((d) => days[d - 1]).join('/');
    }
    return `${todo.target}×/semaine`;
  }
  if (freq === 'monthly') {
    if (todo.mode === 'fixed' && todo.fixedDays.length) return `le ${todo.fixedDays[0]}`;
    return `${todo.target}×/mois`;
  }
  return `tous les ${freq.everyNDays} j`;
}

/** Séries des N derniers jours d'une habitude compteur, pour le Carnet. */
export function habitSeries(todo: HabitTodo, days: number, now: Timestamp): { day: string; count: number }[] {
  const out: { day: string; count: number }[] = [];
  const byDay = new Map(todo.dailyHistory.map((e) => [e.day, e.count]));
  for (let i = days - 1; i >= 0; i--) {
    const ts = addDays(now, -i);
    const key = new Date(ts).toISOString().slice(0, 10);
    const local = `${new Date(ts).getFullYear()}-${String(new Date(ts).getMonth() + 1).padStart(2, '0')}-${String(
      new Date(ts).getDate(),
    ).padStart(2, '0')}`;
    out.push({ day: local, count: byDay.get(local) ?? byDay.get(key) ?? 0 });
  }
  return out;
}

/** Série de réussite d'une habitude binaire (1 = journée tenue). */
export function abstinenceSeries(todo: HabitTodo, days: number, now: Timestamp): { day: string; count: number }[] {
  const done = new Set(todo.completionHistory.map((e) => e.day));
  const out: { day: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(addDays(now, -i));
    const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    out.push({ day: local, count: done.has(local) ? 1 : 0 });
  }
  return out;
}
