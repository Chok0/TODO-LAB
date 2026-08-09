/**
 * Moteur réducteur pur (DEC-07, docs/09 §3).
 *
 *   applyAction(state, action, now, rng) → { state, effects }
 *   advanceTime(state, from, to, rng)    → { state, effects }
 *
 * Aucun incrément par tick fixe : tout est fonction de (state, from, to).
 * Le même chemin de code sert au tick, au réveil et au calcul offline.
 */

import type { Action } from './actions';
import { rolloverAlignment } from './alignment';
import { BALANCE } from './balance';
import { emit, type Ctx } from './core';
import { checkContract, buyKey, debtRollover, maybeOffer, repayDebt, resolveEvent } from './corruption';
import type { Effect } from './effects';
import { advanceFarm, buyPlot, harvest, plant, preventSoftlock, setFallow } from './farming';
import {
  advanceLab,
  assignRecipe,
  buildMachine,
  catchUpMachines,
  cleanLab,
  pokeConveyor,
  research,
  setMeans,
  startCycleById,
  upgradeMachine,
} from './lab';
import { processNarrative, pushRegistry, rolloverNarrative } from './narrative';
import { makeStreams, readCounters, type RngStreams } from './rng';
import { isSubsidyAvailable } from './selectors';
import { applyDraft, breakAbstinence, buildTodo, completeTodo, rolloverTodos, trimHistories } from './todos/todos';
import { addDays, dayKey, midnightsBetween, startOfDay, type Timestamp } from './time';
import { createInitialState, type GameState, type HabitTodo } from '../data/schema';

export interface EngineResult {
  state: GameState;
  effects: Effect[];
}

/** Streams RNG reconstruits depuis l'état sauvegardé (seed + compteurs). */
export function makeRng(state: GameState): RngStreams {
  return makeStreams(state.meta.seed, state.meta.rngCounters);
}

export function createGame(now: Timestamp, seed: number): GameState {
  return createInitialState(now, seed, dayKey);
}

function clone(state: GameState): GameState {
  return structuredClone(state);
}

function finish(draft: GameState, ctx: Ctx): EngineResult {
  processNarrative(draft, ctx, ctx.effects);
  pushRegistry(draft, ctx.effects, ctx.now);
  draft.meta.rngCounters = readCounters(ctx.rng);
  return { state: draft, effects: ctx.effects };
}

// ---------------------------------------------------------------- actions

export function applyAction(state: GameState, action: Action, now: Timestamp, rng: RngStreams): EngineResult {
  const draft = clone(state);
  const ctx: Ctx = { now, rng, effects: [], catchUp: false };

  switch (action.type) {
    // ------------------------------------------------------------- todos
    case 'AddTodo': {
      draft.todos.push(buildTodo(ctx, action.draft));
      break;
    }
    case 'UpdateTodo': {
      const index = draft.todos.findIndex((t) => t.id === action.id);
      if (index >= 0) draft.todos[index] = applyDraft(draft.todos[index], action.draft, ctx);
      break;
    }
    case 'DeleteTodo': {
      draft.todos = draft.todos.filter((t) => t.id !== action.id);
      break;
    }
    case 'CompleteTodo': {
      const todo = draft.todos.find((t) => t.id === action.id);
      if (todo) completeTodo(draft, ctx, todo, now);
      break;
    }
    case 'CompleteYesterday': {
      const todo = draft.todos.find((t) => t.id === action.id);
      if (todo) completeTodo(draft, ctx, todo, startOfDay(addDays(now, -1)) + 12 * 3600 * 1000);
      break;
    }
    case 'IncrementHabit': {
      const todo = draft.todos.find((t) => t.id === action.id);
      if (todo?.kind === 'habit' && todo.habitKind === 'counter') todo.todayCount += 1;
      break;
    }
    case 'BreakAbstinence': {
      const todo = draft.todos.find((t) => t.id === action.id) as HabitTodo | undefined;
      if (todo?.kind === 'habit') breakAbstinence(draft, ctx, todo);
      break;
    }

    // -------------------------------------------------------------- labo
    case 'Research':
      research(draft, ctx, action.tech);
      break;
    case 'BuildMachine':
      buildMachine(draft, ctx, action.machine);
      break;
    case 'UpgradeMachine':
      upgradeMachine(draft, ctx, action.machine);
      break;
    case 'AssignRecipe':
      assignRecipe(draft, ctx, action.machine, action.recipe);
      break;
    case 'SetMeans':
      setMeans(draft, ctx, action.machine, action.means);
      break;
    case 'StartCycle':
      if (!startCycleById(draft, ctx, action.machine)) {
        emit(ctx, { kind: 'blocked', reason: 'Intrants insuffisants ou incident à régler' });
      }
      break;
    case 'CleanLab':
      cleanLab(draft, ctx);
      break;

    // ----------------------------------------------------------- farming
    case 'BuyPlot':
      buyPlot(draft, ctx);
      break;
    case 'Plant':
      plant(draft, ctx, action.plotId, action.plant, action.method);
      break;
    case 'Harvest':
      harvest(draft, ctx, action.plotId);
      break;
    case 'SetFallow':
      setFallow(draft, ctx, action.plotId, action.on);
      break;

    // -------------------------------------------------------- corruption
    case 'BuyKey':
      buyKey(draft, ctx, action.key);
      break;
    case 'ResolveEvent':
      resolveEvent(draft, ctx, action.mode);
      break;
    case 'RepayDebt':
      repayDebt(draft, ctx, action.amount);
      break;
    case 'AcceptSubsidy':
      if (isSubsidyAvailable(draft)) {
        draft.alignment.subsidyActive = true;
        draft.alignment.score = Math.min(BALANCE.alignment.max, draft.alignment.score + BALANCE.alignment.acceptSubsidy);
      }
      break;

    // ------------------------------------------------------ narratif & UI
    case 'MarkLetterRead': {
      const letter = draft.narrative.letters.find((l) => l.id === action.id);
      if (letter) letter.read = true;
      break;
    }
    case 'MarkAllLettersRead':
      for (const l of draft.narrative.letters) l.read = true;
      break;
    case 'TogglePanel':
      draft.settings.collapsedPanels[action.panel] = !draft.settings.collapsedPanels[action.panel];
      break;
    case 'UpdateSettings':
      Object.assign(draft.settings, action.patch);
      break;
  }

  // les intrants ont pu changer : on relance ce qui peut l'être
  pokeConveyor(draft, ctx, now);
  maybeOffer(draft, ctx);

  return finish(draft, ctx);
}

// ------------------------------------------------------------------ temps

function dailyRollover(draft: GameState, ctx: Ctx, midnight: Timestamp): void {
  rolloverTodos(draft, ctx, midnight);
  rolloverAlignment(draft, ctx, midnight);
  debtRollover(draft, ctx, midnight);
  preventSoftlock(draft, ctx);
  rolloverNarrative(draft, ctx, midnight);
  draft.stats.daysPlayed += 1;
  draft.meta.lastDayProcessed = dayKey(midnight);
  trimHistories(draft, midnight);
}

export interface AdvanceOptions {
  /**
   * Force le mode rattrapage. Par défaut il est déduit de la taille de
   * l'intervalle : au-delà du seuil, on considère que l'app était fermée et
   * aucun événement de corruption n'est tiré (docs/02 §11).
   * La simulation passe `false` pour modéliser une app restée ouverte.
   */
  catchUp?: boolean;
}

export function advanceTime(
  state: GameState,
  from: Timestamp,
  to: Timestamp,
  rng: RngStreams,
  opts: AdvanceOptions = {},
): EngineResult {
  const draft = clone(state);
  const ctx: Ctx = { now: to, rng, effects: [], catchUp: false };

  // recul d'horloge : jamais de temps négatif, aucune production rétroactive
  if (to <= from) {
    draft.meta.lastTickAt = to;
    return { state: draft, effects: [] };
  }

  const total = to - from;
  ctx.catchUp = opts.catchUp ?? total > BALANCE.catchUpThreshold;

  // plafond de rattrapage de production (DEC-11) : la croissance des plantes
  // n'est pas concernée, seules les machines le sont.
  const cap = BALANCE.offlineProductionCap;
  const machineFloor = total > cap ? to - cap : from;
  if (total > cap) {
    ctx.now = machineFloor;
    catchUpMachines(draft, ctx, machineFloor);
  }

  // Découpage en segments bornés par les minuits locaux. Quand `to` tombe
  // exactement sur un minuit, le point est unique et porte quand même la
  // bascule quotidienne — sans quoi la journée serait perdue définitivement.
  const midnights = midnightsBetween(from, to);
  const checkpoints: { at: Timestamp; isMidnight: boolean }[] = midnights.map((at) => ({ at, isMidnight: true }));
  if (checkpoints.length === 0 || checkpoints[checkpoints.length - 1].at < to) {
    checkpoints.push({ at: to, isMidnight: false });
  }

  let segStart = from;
  for (const cp of checkpoints) {
    ctx.now = cp.at;
    const labFrom = Math.max(segStart, machineFloor);
    if (cp.at > labFrom) advanceLab(draft, ctx, labFrom, cp.at);
    advanceFarm(draft, ctx, segStart, cp.at);
    checkContract(draft, ctx, cp.at);
    pokeConveyor(draft, ctx, Math.max(cp.at, machineFloor));
    if (cp.isMidnight) dailyRollover(draft, ctx, cp.at);
    segStart = cp.at;
  }

  ctx.now = to;
  draft.meta.lastTickAt = to;
  return finish(draft, ctx);
}

/** Enchaîne plusieurs actions — utilitaire de test et de simulation. */
export function applyAll(state: GameState, actions: Action[], now: Timestamp, rng: RngStreams): EngineResult {
  let current = state;
  const effects: Effect[] = [];
  for (const action of actions) {
    const result = applyAction(current, action, now, rng);
    current = result.state;
    effects.push(...result.effects);
  }
  return { state: current, effects };
}
