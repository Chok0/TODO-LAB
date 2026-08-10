/** Scénarios obligatoires du moteur de récurrence (docs/03 §8). */

import { describe, expect, it } from 'vitest';
import { advance, DAY, doAct, give, HOUR, newGame, T0 } from './helpers';
import { counterPenalty } from '../src/game-logic/todos/habits';
import { dueToday, isScheduledDay } from '../src/game-logic/todos/recurrence';
import { midnightsBetween } from '../src/game-logic/time';
import type { HabitTodo, RecurringTodo } from '../src/data/schema';

const WED = new Date(2026, 0, 7, 9, 0, 0, 0).getTime(); // mercredi 7 janvier 2026

function firstTodo(state: ReturnType<typeof newGame>) {
  return state.todos[0];
}

describe('1 — hebdo fixe lun/jeu créée un mercredi', () => {
  it("ne rend due que l'occurrence du jeudi cette semaine-là", () => {
    let state = newGame(WED);
    state = doAct(state, {
      type: 'AddTodo',
      draft: { title: 'appeler le comptable', category: 'pro', difficulty: 2, kind: 'recurring', frequency: 'weekly', mode: 'fixed', fixedDays: [1, 4] },
    });
    const todo = firstTodo(state) as RecurringTodo;

    // le lundi de cette semaine précède la création : non planifié
    expect(isScheduledDay(todo, new Date(2026, 0, 5, 9).getTime())).toBe(false);
    expect(isScheduledDay(todo, new Date(2026, 0, 8, 9).getTime())).toBe(true); // jeudi
    expect(isScheduledDay(todo, new Date(2026, 0, 12, 9).getTime())).toBe(true); // lundi suivant
    expect(dueToday(todo, WED)).toBe(0);
  });
});

describe('2 — flexible 3x/semaine, 2 faites', () => {
  it("applique exactement une perte en fin de période", () => {
    let state = newGame(T0); // lundi
    state = give(state, { kess: 100 });
    state = doAct(state, {
      type: 'AddTodo',
      draft: {
        title: 'sport',
        category: 'perso',
        difficulty: 2,
        kind: 'recurring',
        frequency: 'weekly',
        mode: 'flexible',
        target: 3,
        loss: { resource: 'kess', amount: 5 },
      },
    });
    const id = firstTodo(state).id;
    state = doAct(state, { type: 'CompleteTodo', id });
    state = doAct(state, { type: 'CompleteTodo', id });

    const before = state.resources.kess;
    // franchit le dimanche → lundi
    state = advance(state, 7 * DAY);
    const todo = firstTodo(state) as RecurringTodo;

    expect(todo.periodProgress.done).toBe(0); // période réinitialisée
    expect(state.resources.kess).toBe(before - 5); // une seule perte
  });
});

describe('3 — multiDaily 3x', () => {
  it('ne rapporte rien pour la 4e complétion du jour', () => {
    let state = newGame(T0);
    state = doAct(state, {
      type: 'AddTodo',
      draft: { title: 'méditer', category: 'perso', difficulty: 2, kind: 'recurring', frequency: 'daily', mode: 'multiDaily', target: 3 },
    });
    const id = firstTodo(state).id;
    const start = state.resources.kess;
    for (let i = 0; i < 3; i++) state = doAct(state, { type: 'CompleteTodo', id });
    const after3 = state.resources.kess;
    expect(after3 - start).toBe(18); // 3 × 6 ₭ (difficulté 2, palier 0)

    state = doAct(state, { type: 'CompleteTodo', id });
    expect(state.resources.kess).toBe(after3);
  });
});

describe('4 — habitude binaire, absence de 3 jours', () => {
  it('valide chaque journée par défaut et crédite la rente passive', () => {
    let state = newGame(T0);
    state = doAct(state, {
      type: 'AddTodo',
      draft: { title: 'arrêter de fumer', category: 'perso', difficulty: 2, kind: 'habit', habitKind: 'abstinence' },
    });
    const habit = firstTodo(state) as HabitTodo;
    habit.streak = 12;

    const before = state.resources.kess;
    state = advance(state, 3 * DAY);

    const after = firstTodo(state) as HabitTodo;
    expect(after.streak).toBe(15);
    expect(state.resources.kess).toBeGreaterThan(before);
    // 3 minuits traversés → 3 crédits (1 + 0,1 × streak, plafonné à 3)
    expect(after.completionHistory.length).toBe(3);
  });

  it('remet le streak à zéro et applique une perte croissante au « j\'ai craqué »', () => {
    let state = newGame(T0);
    state = give(state, { kess: 100 });
    state = doAct(state, {
      type: 'AddTodo',
      draft: { title: 'arrêter de fumer', category: 'perso', difficulty: 2, kind: 'habit', habitKind: 'abstinence' },
    });
    const habit = firstTodo(state) as HabitTodo;
    habit.streak = 12;

    state = doAct(state, { type: 'BreakAbstinence', id: habit.id });
    const after = firstTodo(state) as HabitTodo;
    expect(after.streak).toBe(0);
    expect(after.failedToday).toBe(true);
    expect(state.resources.kess).toBe(88); // 100 − min(12, 30) × 1
  });
});

describe('5 — habitude compteur, seuils utilisateur', () => {
  it('calcule la pénalité documentée : s1=1, s2=3, n=6 → 13 ₭', () => {
    expect(counterPenalty(6, 1, 3)).toBe(13);
    expect(counterPenalty(1, 1, 3)).toBe(0);
    expect(counterPenalty(3, 1, 3)).toBe(2);
  });

  it('applique la pénalité à minuit et conserve l\'historique quotidien', () => {
    let state = newGame(T0);
    state = give(state, { kess: 50 });
    state = doAct(state, {
      type: 'AddTodo',
      draft: {
        title: 'limiter café',
        category: 'perso',
        difficulty: 2,
        kind: 'habit',
        habitKind: 'counter',
        thresholds: { s1: 1, s2: 3 },
      },
    });
    const id = firstTodo(state).id;
    for (let i = 0; i < 6; i++) state = doAct(state, { type: 'IncrementHabit', id });

    state = advance(state, 20 * HOUR); // franchit minuit
    const habit = firstTodo(state) as HabitTodo;
    expect(habit.todayCount).toBe(0);
    expect(habit.dailyHistory).toHaveLength(1);
    expect(habit.dailyHistory[0]).toMatchObject({ count: 6, penalty: 13 });
    expect(state.resources.kess).toBe(37);
  });
});

describe('6 — mensuel fixe le 31', () => {
  it('reporte au dernier jour du mois quand le 31 n\'existe pas', () => {
    let state = newGame(new Date(2026, 3, 1, 9).getTime()); // 1er avril
    state = doAct(state, {
      type: 'AddTodo',
      draft: { title: 'déclarer la TVA', category: 'pro', difficulty: 3, kind: 'recurring', frequency: 'monthly', mode: 'fixed', fixedDays: [31] },
    });
    const todo = firstTodo(state) as RecurringTodo;
    expect(isScheduledDay(todo, new Date(2026, 3, 30, 9).getTime())).toBe(true); // 30 avril
    expect(isScheduledDay(todo, new Date(2026, 3, 29, 9).getTime())).toBe(false);
    expect(isScheduledDay(todo, new Date(2026, 4, 31, 9).getTime())).toBe(true); // 31 mai
  });
});

describe('7 — changement d\'heure (DST)', () => {
  it('ne duplique ni ne saute de journée', () => {
    // Europe/Paris : passage à l'heure d'été le dimanche 29 mars 2026
    const before = new Date(2026, 2, 27, 12, 0, 0, 0).getTime(); // vendredi 27 mars
    const after = new Date(2026, 3, 1, 12, 0, 0, 0).getTime(); // mercredi 1er avril
    const midnights = midnightsBetween(before, after);
    expect(midnights).toHaveLength(5); // 28, 29, 30, 31 mars, 1er avril

    let state = newGame(before);
    state = doAct(state, {
      type: 'AddTodo',
      draft: { title: 'arrêter de fumer', category: 'perso', difficulty: 2, kind: 'habit', habitKind: 'abstinence' },
    });
    state = advance(state, after - before);
    const habit = firstTodo(state) as HabitTodo;
    expect(habit.streak).toBe(5);
  });
});

describe('8 — « fait hier »', () => {
  it('valide l\'occurrence manquée et rembourse la perte déjà appliquée', () => {
    let state = newGame(T0);
    state = give(state, { kess: 100 });
    state = doAct(state, {
      type: 'AddTodo',
      draft: {
        title: 'appeler le comptable',
        category: 'pro',
        difficulty: 3,
        kind: 'recurring',
        frequency: 'daily',
        mode: 'fixed',
        loss: { resource: 'kess', amount: 5 },
      },
    });
    const id = firstTodo(state).id;

    state = advance(state, 20 * HOUR); // minuit franchi sans avoir fait la todo
    expect(state.resources.kess).toBe(95);
    expect(firstTodo(state).lastLoss).not.toBeNull();

    state = doAct(state, { type: 'CompleteYesterday', id });
    // 95 remboursé (+5) puis crédité de la difficulté 3 (+12 ₭)
    expect(state.resources.kess).toBe(112);
    expect(firstTodo(state).lastLoss).toBeNull();
  });
});
