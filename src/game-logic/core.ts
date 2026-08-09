/** Contexte d'exécution du moteur et helpers de ressources partagés. */

import type { GameState, ResourceId, Timestamp } from '../data/schema';
import type { Effect } from './effects';
import type { RngStreams } from './rng';

export interface Ctx {
  now: Timestamp;
  rng: RngStreams;
  effects: Effect[];
  /**
   * true quand on rattrape un gros intervalle (offline / réveil) :
   * aucun tirage d'événement de corruption dans ce cas (docs/02 §11).
   */
  catchUp: boolean;
}

export function emit(ctx: Ctx, e: Effect): void {
  ctx.effects.push(e);
}

export function addRes(state: GameState, res: ResourceId, amount: number): void {
  state.resources[res] = Math.max(0, (state.resources[res] ?? 0) + amount);
}

export function hasRes(state: GameState, res: ResourceId, amount: number): boolean {
  return (state.resources[res] ?? 0) >= amount;
}

/** Débite si le solde suffit. Retourne false et ne touche à rien sinon. */
export function spendRes(state: GameState, res: ResourceId, amount: number): boolean {
  if (!hasRes(state, res, amount)) return false;
  state.resources[res] -= amount;
  return true;
}

/** Débite au maximum du solde disponible (pénalités : plancher 0, docs/02 §4). */
export function drainRes(state: GameState, res: ResourceId, amount: number): number {
  const available = state.resources[res] ?? 0;
  const taken = Math.min(available, amount);
  state.resources[res] = available - taken;
  return taken;
}

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/** Identifiant court déterministe (utilise le stream `misc`). */
export function makeId(ctx: Ctx, prefix: string): string {
  return `${prefix}-${ctx.rng.misc.int(0xffffffff).toString(36)}`;
}
