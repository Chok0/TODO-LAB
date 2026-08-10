/** Actions et bascule quotidienne du module Todos (docs/03). */

import { BALANCE, payoutUnit } from '../balance';
import { addRes, drainRes, emit, makeId, type Ctx } from '../core';
import { RECIPES } from '../data/recipes.data';
import { effectiveSalePrice, isRecipeAvailable } from '../selectors';
import { dayKey, startOfDay, type Timestamp } from '../time';
import type { DayKey, GameState, HabitTodo, RecurringTodo, Todo } from '../../data/schema';
import type { TodoDraft } from '../actions';
import { abstinenceBreakPenalty, abstinenceDailyUnits, counterPenalty, habitThresholds } from './habits';
import { doneOnDay, dueToday, isScheduledDay, periodChanged, periodKeyFor, requiredForPeriod } from './recurrence';

// ------------------------------------------------------------------ création

export function buildTodo(ctx: Ctx, draft: TodoDraft): Todo {
  const base = {
    id: makeId(ctx, 'todo'),
    title: draft.title.trim() || 'Sans titre',
    category: draft.category,
    difficulty: draft.difficulty,
    gain: draft.gain ?? null,
    loss: draft.loss ?? null,
    createdAt: ctx.now,
    archived: false,
    completionHistory: [],
    lastLoss: null,
  };

  if (draft.kind === 'habit') {
    const habit: HabitTodo = {
      ...base,
      kind: 'habit',
      habitKind: draft.habitKind ?? 'abstinence',
      thresholds: draft.habitKind === 'counter' ? (draft.thresholds ?? { s1: 0, s2: 2 }) : null,
      streak: 0,
      todayCount: 0,
      failedToday: false,
      dailyHistory: [],
    };
    return habit;
  }

  if (draft.kind === 'recurring') {
    const todo: RecurringTodo = {
      ...base,
      kind: 'recurring',
      frequency: draft.frequency ?? 'daily',
      mode: draft.mode ?? 'fixed',
      target: Math.max(1, draft.target ?? 1),
      fixedDays: draft.fixedDays ?? [],
      periodProgress: { periodKey: '', done: 0, misses: 0 },
    };
    todo.periodProgress.periodKey = periodKeyFor(todo, ctx.now);
    return todo;
  }

  return { ...base, kind: 'oneshot', dueAt: draft.dueAt ?? null, completedAt: null };
}

/** Applique un draft sur une todo existante en préservant historique et progression. */
export function applyDraft(todo: Todo, draft: TodoDraft, ctx: Ctx): Todo {
  const rebuilt = buildTodo(ctx, draft);
  rebuilt.id = todo.id;
  rebuilt.createdAt = todo.createdAt;
  rebuilt.completionHistory = todo.completionHistory;
  rebuilt.lastLoss = todo.lastLoss;
  if (rebuilt.kind === 'habit' && todo.kind === 'habit') {
    rebuilt.streak = todo.streak;
    rebuilt.todayCount = todo.todayCount;
    rebuilt.failedToday = todo.failedToday;
    rebuilt.dailyHistory = todo.dailyHistory;
  }
  if (rebuilt.kind === 'recurring' && todo.kind === 'recurring') {
    if (rebuilt.periodProgress.periodKey === todo.periodProgress.periodKey) {
      rebuilt.periodProgress = todo.periodProgress;
    }
  }
  return rebuilt;
}

// --------------------------------------------------------------- complétion

/**
 * Valeur d'une unité de barème pour cette partie : elle suit le meilleur
 * produit que l'atelier sait sortir. Une tâche difficile doit rester une somme
 * qui compte à tous les paliers, sinon cocher une case cesse d'être le moteur
 * du jeu (docs/02 §4).
 */
export function unitValue(state: GameState): number {
  let best = 0;
  for (const recipe of RECIPES) {
    if (recipe.salePrice <= 0 || !isRecipeAvailable(state, recipe.id)) continue;
    // le prix EFFECTIF, taxe de corruption et pollution comprises : votre heure
    // ne vaut que ce que l'atelier encaisse réellement, pas ce qu'il affiche
    const net = effectiveSalePrice(state, recipe);
    if (net > best) best = net;
  }
  return payoutUnit(best);
}

/** Cachet en ₭ d'une todo, selon sa difficulté et le palier du labo. */
export function basePayout(state: GameState, todo: Todo): number {
  const units = BALANCE.payoutByDifficulty[todo.difficulty] ?? 1;
  return Math.max(1, Math.round(units * unitValue(state)));
}

function creditCompletion(state: GameState, ctx: Ctx, todo: Todo, day: DayKey, amount: number): void {
  addRes(state, 'kess', amount);
  state.stats.kessEarnedTotal += amount;
  state.stats.kessFromTodos += amount;
  state.stats.todosCompleted += 1;
  todo.completionHistory.push({ day, gained: amount });
  if (todo.gain) addRes(state, todo.gain.resource, todo.gain.amount);
  emit(ctx, { kind: 'payout', amount, todoId: todo.id, title: todo.title });
}

/** Rembourse la perte du jour `day` si elle avait été appliquée (docs/03 §8). */
function refundLossIfAny(state: GameState, todo: Todo, day: DayKey): void {
  if (todo.lastLoss && todo.lastLoss.day === day) {
    addRes(state, todo.lastLoss.resource, todo.lastLoss.amount);
    todo.lastLoss = null;
  }
}

export function completeTodo(state: GameState, ctx: Ctx, todo: Todo, at: Timestamp = ctx.now): boolean {
  const day = dayKey(at);

  if (todo.kind === 'oneshot') {
    if (todo.completedAt) return false;
    todo.completedAt = at;
    todo.archived = true;
    refundLossIfAny(state, todo, day);
    creditCompletion(state, ctx, todo, day, basePayout(state, todo));
    return true;
  }

  if (todo.kind === 'recurring') {
    const remaining = at === ctx.now ? dueToday(todo, at) : 1;
    if (remaining <= 0) return false;

    let amount = basePayout(state, todo);
    todo.periodProgress.done += 1;

    // bonus de période complète (flexible uniquement)
    if (todo.mode === 'flexible') {
      const required = requiredForPeriod(todo, at);
      if (todo.periodProgress.done === required) {
        amount = Math.ceil(amount * (1 + BALANCE.flexiblePeriodBonus));
      }
    }
    refundLossIfAny(state, todo, day);
    creditCompletion(state, ctx, todo, day, amount);
    return true;
  }

  // habitude : la complétion directe n'a de sens que pour le compteur (+1)
  if (todo.habitKind === 'counter') {
    return incrementHabit(state, ctx, todo);
  }
  return false;
}

export function incrementHabit(_state: GameState, _ctx: Ctx, todo: HabitTodo): boolean {
  if (todo.habitKind !== 'counter') return false;
  todo.todayCount += 1;
  return true;
}

export function breakAbstinence(state: GameState, ctx: Ctx, todo: HabitTodo): boolean {
  if (todo.habitKind !== 'abstinence' || todo.failedToday) return false;
  const penalty = Math.round(abstinenceBreakPenalty(todo.streak) * unitValue(state));
  todo.failedToday = true;
  todo.streak = 0;
  if (penalty > 0) {
    const taken = drainRes(state, 'kess', penalty);
    emit(ctx, { kind: 'penalty', amount: taken, todoId: todo.id, title: todo.title, reason: 'break' });
  }
  return true;
}

// ------------------------------------------------------------------- pertes

function applyLoss(state: GameState, ctx: Ctx, todo: Todo, day: DayKey, reason: 'miss' | 'counter'): void {
  if (!todo.loss) return;
  const taken = drainRes(state, todo.loss.resource, todo.loss.amount);
  todo.lastLoss = { day, resource: todo.loss.resource, amount: taken };
  if (taken > 0) {
    emit(ctx, { kind: 'penalty', amount: taken, todoId: todo.id, title: todo.title, reason });
  }
}

// -------------------------------------------------------- bascule quotidienne

/**
 * Traite la fin d'une journée pour toutes les todos.
 * `midnight` est l'instant du minuit qui vient d'être franchi ; la journée qui
 * se termine est celle de `midnight − 1 ms`.
 */
export function rolloverTodos(state: GameState, ctx: Ctx, midnight: Timestamp): void {
  const endedTs = midnight - 1;
  const endedDay = dayKey(endedTs);

  for (const todo of state.todos) {
    if (todo.archived) continue;

    if (todo.kind === 'oneshot') {
      if (!todo.completedAt && todo.dueAt && todo.dueAt <= endedTs && !todo.lastLoss) {
        applyLoss(state, ctx, todo, endedDay, 'miss');
      }
      continue;
    }

    if (todo.kind === 'recurring') {
      rolloverRecurring(state, ctx, todo, endedTs, midnight, endedDay);
      continue;
    }

    rolloverHabit(state, ctx, todo, endedDay);
  }
}

function rolloverRecurring(
  state: GameState,
  ctx: Ctx,
  todo: RecurringTodo,
  endedTs: Timestamp,
  midnight: Timestamp,
  endedDay: DayKey,
): void {
  if (startOfDay(todo.createdAt) > endedTs) return;

  if (todo.mode === 'fixed' && isScheduledDay(todo, endedTs) && doneOnDay(todo, endedDay) === 0) {
    todo.periodProgress.misses += 1;
    applyLoss(state, ctx, todo, endedDay, 'miss');
  }

  if (todo.mode === 'multiDaily' && doneOnDay(todo, endedDay) < Math.max(1, todo.target)) {
    todo.periodProgress.misses += 1;
    applyLoss(state, ctx, todo, endedDay, 'miss');
  }

  if (periodChanged(todo, endedTs, midnight)) {
    if (todo.mode === 'flexible' && todo.periodProgress.done < requiredForPeriod(todo, endedTs)) {
      todo.periodProgress.misses += 1;
      applyLoss(state, ctx, todo, endedDay, 'miss');
    }
    todo.periodProgress = { periodKey: periodKeyFor(todo, midnight), done: 0, misses: 0 };
  }
}

function rolloverHabit(state: GameState, ctx: Ctx, todo: HabitTodo, endedDay: DayKey): void {
  if (todo.habitKind === 'abstinence') {
    if (todo.failedToday) {
      todo.failedToday = false;
      return;
    }
    // journée validée par défaut, sans action de l'utilisateur
    todo.streak += 1;
    state.stats.longestStreak = Math.max(state.stats.longestStreak, todo.streak);
    const amount = Math.max(1, Math.round(abstinenceDailyUnits(todo.streak) * unitValue(state)));
    addRes(state, 'kess', amount);
    state.stats.kessEarnedTotal += amount;
    state.stats.kessFromTodos += amount;
    todo.completionHistory.push({ day: endedDay, gained: amount });
    emit(ctx, { kind: 'streak', todoId: todo.id, title: todo.title, streak: todo.streak });
    return;
  }

  // compteur : score de la journée selon les seuils de l'utilisateur
  const { s1, s2 } = habitThresholds(todo);
  const n = todo.todayCount;
  const penalty = Math.round(counterPenalty(n, s1, s2) * unitValue(state));
  todo.dailyHistory.push({ day: endedDay, count: n, penalty });
  todo.todayCount = 0;
  if (penalty > 0) {
    const taken = drainRes(state, 'kess', penalty);
    todo.lastLoss = { day: endedDay, resource: 'kess', amount: taken };
    emit(ctx, { kind: 'penalty', amount: taken, todoId: todo.id, title: todo.title, reason: 'counter' });
  }
}

// -------------------------------------------------------------------- purge

/** Borne l'historique de complétion (docs/03 §7). */
export function trimHistories(state: GameState, now: Timestamp): void {
  const cutoff = startOfDay(now) - BALANCE.completionHistoryDays * 24 * 3600 * 1000;
  const cutoffKey = dayKey(cutoff);
  for (const todo of state.todos) {
    if (todo.completionHistory.length > 400) {
      todo.completionHistory = todo.completionHistory.filter((e) => e.day >= cutoffKey);
    }
  }
}
