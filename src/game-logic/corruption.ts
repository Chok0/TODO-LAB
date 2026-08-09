/** Clés, taxe permanente, événements, faveurs, contrats et dette (docs/06). */

import { addAlignment, addReputation, PNJ_FACTION } from './alignment';
import { BALANCE } from './balance';
import { addRes, emit, makeId, round2, spendRes, type Ctx } from './core';
import { PNJ_NAMES } from './data/event-pools.fr';
import { generateDebtEvent, generateEvent, generateOffer } from './procgen/events';
import { currentBand, nextKey } from './selectors';
import { dayKey, DAY, HOUR, type Timestamp } from './time';
import type { CorruptionKey, GameState, PaymentMode, RecipeId } from '../data/schema';

// ------------------------------------------------------------------- clés

/** Achat d'une clé de corruption — séquentiel : 1 puis 2 puis 3. */
export function buyKey(state: GameState, ctx: Ctx, key: CorruptionKey): boolean {
  const next = nextKey(state);
  if (!next || next.key !== key) return false;
  if (!spendRes(state, 'kess', next.price)) return false;

  state.corruption.keys.push(key);
  state.corruption.taxRate = round2(
    BALANCE.corruptionKeys.filter((k) => state.corruption.keys.includes(k.key)).reduce((s, k) => s + k.tax, 0),
  );
  addAlignment(state, ctx, BALANCE.alignment.buyKey);
  emit(ctx, { kind: 'key_bought', key, tax: state.corruption.taxRate });
  return true;
}

// ------------------------------------------------------------- déclenchement

/**
 * Appelé à chaque cycle illégal terminé, app ouverte uniquement.
 * Aucun tirage pendant un rattrapage (docs/02 §11).
 */
export function onIllegalCycle(state: GameState, ctx: Ctx): void {
  const c = state.corruption;
  if (c.keys.length === 0) return;
  c.illegalCyclesSinceEvent += 1;
  if (ctx.catchUp) return;
  if (c.pendingEvent) return;
  if (c.illegalCyclesSinceEvent <= BALANCE.events.cooldownCycles) return;

  const band = currentBand(state);
  const factor = band === 'coop' ? BALANCE.bands.coop.eventChanceFactor : 1;
  if (!ctx.rng.events.chance(BALANCE.events.baseChance * factor)) return;

  const evt = generateEvent(state, ctx);
  if (!evt) return;
  c.pendingEvent = evt;
  c.lastEventTriggerId = evt.triggerId;
  c.illegalCyclesSinceEvent = 0;
  emit(ctx, { kind: 'event_triggered', id: evt.id, title: evt.title });
}

/** Offre spontanée sur palier économique (200 / 1000 / 5000 ₭ cumulés). */
export function maybeOffer(state: GameState, ctx: Ctx): void {
  if (state.corruption.pendingEvent) return;
  if (!state.lab.researched.includes('adv_synthesis')) return;
  for (const milestone of [200, 1000, 5000]) {
    const key = `offer:${milestone}`;
    if (state.stats.kessEarnedTotal < milestone) continue;
    if (state.narrative.firedTriggers.includes(key)) continue;
    state.narrative.firedTriggers.push(key);
    const evt = generateOffer(state, ctx);
    state.corruption.pendingEvent = evt;
    emit(ctx, { kind: 'event_triggered', id: evt.id, title: evt.title });
    return;
  }
}

// ---------------------------------------------------------------- résolution

export function resolveEvent(state: GameState, ctx: Ctx, mode: PaymentMode): boolean {
  const c = state.corruption;
  const evt = c.pendingEvent;
  if (!evt) return false;
  const option = evt.options.find((o) => o.pay === mode);
  if (!option) return false;

  const faction = PNJ_FACTION[evt.pnj];
  const band = currentBand(state);

  switch (mode) {
    case 'kess': {
      if (!spendRes(state, 'kess', option.cost)) return false;
      break;
    }
    case 'reputation': {
      const factor = band === 'neutral' ? BALANCE.bands.neutral.reputationLossFactor : 1;
      addReputation(state, faction, -Math.round(option.cost * factor));
      addAlignment(state, ctx, BALANCE.alignment.payReputation);
      break;
    }
    case 'service': {
      const favorId = makeId(ctx, 'fav');
      c.favors.push({
        id: favorId,
        pnj: evt.pnj,
        origin: evt.title,
        day: dayKey(ctx.now),
        repaid: false,
      });
      c.activeContract = {
        recipe: evt.contractRecipe,
        remaining: option.cost,
        total: option.cost,
        deadline: ctx.now + evt.contractHours * HOUR,
        pnj: evt.pnj,
        favorId,
      };
      addAlignment(state, ctx, BALANCE.alignment.payService);
      break;
    }
    case 'accept': {
      c.favors.push({
        id: makeId(ctx, 'fav'),
        pnj: evt.pnj,
        origin: evt.title,
        day: dayKey(ctx.now),
        repaid: false,
      });
      addAlignment(state, ctx, BALANCE.alignment.acceptFavor);
      break;
    }
    case 'refuse': {
      addAlignment(state, ctx, BALANCE.alignment.refuseFavor);
      break;
    }
  }

  // un rappel de faveur honoré en argent ou en réputation solde la faveur
  if (evt.recallsFavorId && (mode === 'kess' || mode === 'reputation')) {
    const favor = c.favors.find((f) => f.id === evt.recallsFavorId);
    if (favor) favor.repaid = true;
  }

  c.pendingEvent = null;
  state.stats.eventsResolved += 1;
  emit(ctx, { kind: 'event_resolved', mode, title: evt.title });
  return true;
}

// ----------------------------------------------------------------- contrats

/**
 * Une production terminée alimente le contrat en cours au lieu d'être vendue.
 * Retourne true si l'unité a été retenue par le contrat.
 */
export function registerDelivery(state: GameState, ctx: Ctx, recipe: RecipeId): boolean {
  const contract = state.corruption.activeContract;
  if (!contract || contract.recipe !== recipe || contract.remaining <= 0) return false;

  contract.remaining -= 1;
  emit(ctx, { kind: 'contract_delivery', recipe, remaining: contract.remaining });

  if (contract.remaining === 0) {
    addReputation(state, PNJ_FACTION[contract.pnj], BALANCE.reputation.contractHonored);
    if (contract.favorId) {
      const favor = state.corruption.favors.find((f) => f.id === contract.favorId);
      if (favor) favor.repaid = true;
    }
    state.stats.contractsHonored += 1;
    emit(ctx, { kind: 'contract_done', pnj: PNJ_NAMES[contract.pnj] });
    state.corruption.activeContract = null;
  }
  return true;
}

/** Échéance dépassée → saisie (docs/06 §3). */
export function checkContract(state: GameState, ctx: Ctx, at: Timestamp): void {
  const contract = state.corruption.activeContract;
  if (!contract || at < contract.deadline) return;

  addReputation(state, PNJ_FACTION[contract.pnj], BALANCE.reputation.contractFailed);
  state.stats.contractsFailed += 1;
  emit(ctx, { kind: 'contract_failed', pnj: PNJ_NAMES[contract.pnj] });

  // saisie : stock de principes actifs + productions en cours
  let lost = 0;
  for (const res of ['pa_med', 'pa_ind', 'pa_rec', 'pa_tox'] as const) {
    lost += state.resources[res] ?? 0;
    state.resources[res] = 0;
  }
  for (const machine of state.lab.machines) {
    if (machine.run) {
      lost += 1;
      machine.run = null;
    }
  }
  emit(ctx, { kind: 'seizure', lost: `${lost} unité(s) de production` });
  state.corruption.activeContract = null;
}

// -------------------------------------------------------------------- dette

export function repayDebt(state: GameState, ctx: Ctx, amount: number): boolean {
  const c = state.corruption;
  if (c.openingDebt <= 0) return false;
  const pay = Math.min(Math.max(1, Math.floor(amount)), c.openingDebt);
  if (!spendRes(state, 'kess', pay)) return false;
  c.openingDebt -= pay;
  emit(ctx, { kind: 'debt_repaid', amount: pay, remaining: c.openingDebt });
  if (c.openingDebt === 0) {
    addReputation(state, 'zone', BALANCE.reputation.contractHonored);
  }
  return true;
}

/** Rappels de dette : J+7, J+14, puis un événement tous les ~10 jours. */
export function debtRollover(state: GameState, ctx: Ctx, midnight: Timestamp): void {
  const c = state.corruption;
  if (c.openingDebt <= 0) return;

  const daysElapsed = Math.floor((midnight - state.meta.createdAt) / DAY);
  const { firstDays, secondDays, eventEveryDays } = BALANCE.debtReminders;

  if (c.debtRemindersSent === 0 && daysElapsed >= firstDays) {
    c.debtRemindersSent = 1;
    state.narrative.firedTriggers.push('debt:reminder1');
    return;
  }
  if (c.debtRemindersSent === 1 && daysElapsed >= secondDays) {
    c.debtRemindersSent = 2;
    state.narrative.firedTriggers.push('debt:reminder2');
    return;
  }
  if (c.debtRemindersSent >= 2 && !c.pendingEvent) {
    const since = c.lastDebtEventAt ? (midnight - c.lastDebtEventAt) / DAY : eventEveryDays;
    if (since >= eventEveryDays) {
      const evt = generateDebtEvent(state, ctx);
      c.pendingEvent = evt;
      c.lastDebtEventAt = midnight;
      emit(ctx, { kind: 'event_triggered', id: evt.id, title: evt.title });
    }
  }
}

/** Ressources perdues lors d'une saisie, pour l'affichage. */
export function describeKeys(state: GameState): string {
  if (state.corruption.keys.length === 0) return 'aucun arrangement';
  return state.corruption.keys.map((k) => `clé ${k}`).join(', ');
}

export { addRes };
