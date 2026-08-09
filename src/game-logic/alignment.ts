/** Score d'alignement caché et réputations par faction (docs/06 §4-5). */

import { BALANCE } from './balance';
import { addRes, clamp, emit, round2, type Ctx } from './core';
import { getBand } from './selectors';
import { weekKey } from './time';
import type { GameState, PnjId, Timestamp } from '../data/schema';

export type Faction = 'coop' | 'zone' | 'broker';

export const PNJ_FACTION: Record<PnjId, Faction> = {
  voss: 'coop',
  coles: 'zone',
  reyes: 'broker',
};

/** Modifie le score d'alignement et signale un éventuel changement de bande. */
export function addAlignment(state: GameState, ctx: Ctx, delta: number): void {
  if (delta === 0) return;
  const before = getBand(state.alignment.score);
  state.alignment.score = round2(clamp(state.alignment.score + delta, BALANCE.alignment.min, BALANCE.alignment.max));
  const after = getBand(state.alignment.score);
  if (before !== after) emit(ctx, { kind: 'band_changed', from: before, to: after });
}

export function addReputation(state: GameState, faction: Faction, delta: number): void {
  const rep = state.alignment.reputation;
  rep[faction] = clamp(rep[faction] + delta, BALANCE.reputation.min, BALANCE.reputation.max);
}

/** Enregistre une vente : alignement, plafond quotidien, drapeaux de réputation. */
export function registerSale(state: GameState, ctx: Ctx, branch: 'legal' | 'illegal', harmful: boolean): void {
  const a = BALANCE.alignment;
  if (branch === 'legal') {
    state.alignment.soldLegalToday = true;
    if (state.alignment.legalSalesToday < a.legalSaleDailyCap) {
      state.alignment.legalSalesToday += a.legalSale;
      addAlignment(state, ctx, a.legalSale);
    }
    state.stats.salesLegal += 1;
  } else {
    state.alignment.soldIllegalToday = true;
    addAlignment(state, ctx, harmful ? a.illegalSaleHarmful : a.illegalSale);
    state.stats.salesIllegal += 1;
  }
}

/** Bascule quotidienne : decay vers 0, réputations du jour, remise à zéro des drapeaux. */
export function rolloverAlignment(state: GameState, ctx: Ctx, midnight: Timestamp): void {
  const al = state.alignment;
  const r = BALANCE.reputation;

  if (al.soldLegalToday && !al.soldIllegalToday) addReputation(state, 'coop', r.legalDay);
  if (al.soldIllegalToday) addReputation(state, 'zone', r.illegalDay);
  if ((al.soldLegalToday || al.soldIllegalToday) && getBand(al.score) === 'neutral') {
    addReputation(state, 'broker', r.brokerDay);
  }

  // decay naturel vers 0 : rester aligné demande des actes
  const decay = BALANCE.alignment.dailyDecay;
  if (al.score > 0) addAlignment(state, ctx, -Math.min(decay, al.score));
  else if (al.score < 0) addAlignment(state, ctx, Math.min(decay, -al.score));

  al.soldLegalToday = false;
  al.soldIllegalToday = false;
  al.legalSalesToday = 0;

  // subvention hebdomadaire (le lundi)
  if (al.subsidyActive) {
    const wk = weekKey(midnight);
    if (al.lastSubsidyWeek !== wk) {
      al.lastSubsidyWeek = wk;
      addRes(state, 'kess', BALANCE.subsidy.weeklyKess);
      state.stats.kessEarnedTotal += BALANCE.subsidy.weeklyKess;
      emit(ctx, { kind: 'subsidy', kess: BALANCE.subsidy.weeklyKess });
    }
  }
}
