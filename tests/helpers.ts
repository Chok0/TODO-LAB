import type { Action } from '../src/game-logic/actions';
import { advanceTime, applyAction, createGame, makeRng, type AdvanceOptions } from '../src/game-logic/engine';
import type { Effect } from '../src/game-logic/effects';
import type { GameState, ResourceId } from '../src/data/schema';

/** Lundi 5 janvier 2026, 09:00 (heure locale des tests : Europe/Paris). */
export const T0 = new Date(2026, 0, 5, 9, 0, 0, 0).getTime();

export function newGame(now: number = T0, seed = 42): GameState {
  return createGame(now, seed);
}

export function act(state: GameState, action: Action, now: number = state.meta.lastTickAt) {
  return applyAction(state, action, now, makeRng(state));
}

/** Applique une action et ne retourne que l'état (cas courant). */
export function doAct(state: GameState, action: Action, now: number = state.meta.lastTickAt): GameState {
  return act(state, action, now).state;
}

export function tickTo(state: GameState, to: number, opts: AdvanceOptions = {}) {
  return advanceTime(state, state.meta.lastTickAt, to, makeRng(state), opts);
}

export function advance(state: GameState, ms: number, opts: AdvanceOptions = {}): GameState {
  return tickTo(state, state.meta.lastTickAt + ms, opts).state;
}

/** Avance en collectant les effets produits. */
export function advanceCollect(
  state: GameState,
  ms: number,
  opts: AdvanceOptions = {},
): { state: GameState; effects: Effect[] } {
  return tickTo(state, state.meta.lastTickAt + ms, opts);
}

export function give(state: GameState, resources: Partial<Record<ResourceId, number>>): GameState {
  const next = structuredClone(state);
  for (const [key, value] of Object.entries(resources)) {
    next.resources[key as ResourceId] = value as number;
  }
  return next;
}

export function kindsOf(effects: Effect[]): string[] {
  return effects.map((e) => e.kind);
}

export function effectsOf<K extends Effect['kind']>(effects: Effect[], kind: K): Extract<Effect, { kind: K }>[] {
  return effects.filter((e) => e.kind === kind) as Extract<Effect, { kind: K }>[];
}

export const SEC = 1000;
export const MIN = 60 * SEC;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;
