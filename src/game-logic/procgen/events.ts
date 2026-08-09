/** Générateur d'événements de corruption (docs/08 §6). */

import { BALANCE, eventBaseCost } from '../balance';
import { makeId, type Ctx } from '../core';
import { DEBT_EVENT, EVENT_TRIGGERS, OFFER_TEMPLATE, PNJ_INLINE, type EventTriggerTemplate } from '../data/event-pools.fr';
import { getRecipe } from '../data/recipes.data';
import { isRecipeAvailable } from '../selectors';
import { HOUR } from '../time';
import type { CorruptionEvent, CorruptionEventOption, GameState, PnjId, RecipeId } from '../../data/schema';

/** Recette exigée par un contrat de service : la plus haute recette illégale disponible. */
function contractRecipeFor(state: GameState): RecipeId {
  const ladder: RecipeId[] = ['refined_product', 'active_compound', 'raw_extract'];
  for (const id of ladder) if (isRecipeAvailable(state, id)) return id;
  return 'tonic';
}

function buildOptions(state: GameState, gravity: number, contractRecipe: RecipeId): CorruptionEventOption[] {
  const kess = eventBaseCost(gravity, state.stats.kessEarnedTotal);
  const rep = BALANCE.events.reputationCostPerGravity * gravity;
  const qty = BALANCE.events.contract.quantityPerGravity * gravity;
  const label = getRecipe(contractRecipe).label;
  return [
    { pay: 'kess', cost: kess, label: `Payer ${kess} ₭` },
    { pay: 'reputation', cost: rep, label: `Régler en réputation (−${rep})` },
    { pay: 'service', cost: qty, label: `Rendre un service : ${qty} × ${label}` },
  ];
}

function fill(text: string, pnj: PnjId): string {
  return text.replace(/\{pnj\}/g, PNJ_INLINE[pnj]);
}

/** Déclencheurs éligibles au tirage à cet instant. */
export function eligibleTriggers(state: GameState): EventTriggerTemplate[] {
  const hasFavor = state.corruption.favors.some((f) => !f.repaid);
  return EVENT_TRIGGERS.filter((t) => {
    if (t.requiresFavor && !hasFavor) return false;
    if (t.id === state.corruption.lastEventTriggerId) return false;
    return true;
  });
}

export function generateEvent(state: GameState, ctx: Ctx): CorruptionEvent | null {
  const pool = eligibleTriggers(state);
  if (pool.length === 0) return null;
  const trigger = ctx.rng.events.weighted(pool, (t) => t.weight);
  if (!trigger) return null;
  return instantiate(state, ctx, trigger);
}

export function instantiate(state: GameState, ctx: Ctx, trigger: EventTriggerTemplate): CorruptionEvent {
  const openFavor = state.corruption.favors.find((f) => !f.repaid) ?? null;

  let pnj: PnjId;
  let recallsFavorId: string | null = null;
  if (trigger.requiresFavor && openFavor) {
    pnj = openFavor.pnj;
    recallsFavorId = openFavor.id;
  } else {
    pnj = ctx.rng.events.pick(trigger.pnjs);
  }

  let gravity = ctx.rng.events.range(trigger.gravityMin, trigger.gravityMax) as 1 | 2 | 3;
  // un service dû rappelé pèse plus lourd
  if (recallsFavorId) gravity = Math.min(3, gravity + 1) as 1 | 2 | 3;

  const contractRecipe = contractRecipeFor(state);
  const body = fill(ctx.rng.events.pick(trigger.bodies), pnj);

  return {
    id: makeId(ctx, 'evt'),
    kind: 'sanction',
    triggerId: trigger.id,
    pnj,
    gravity,
    title: trigger.title,
    body,
    createdAt: ctx.now,
    options: buildOptions(state, gravity, contractRecipe),
    contractRecipe,
    contractHours: BALANCE.events.contract.hoursPerGravity * gravity,
    recallsFavorId,
  };
}

/** Rappel de dette d'ouverture — seul événement possible sans clé (docs/06 §3). */
export function generateDebtEvent(state: GameState, ctx: Ctx): CorruptionEvent {
  const evt = instantiate(state, ctx, DEBT_EVENT);
  evt.triggerId = DEBT_EVENT.id;
  evt.title = DEBT_EVENT.title;
  return evt;
}

/** Offre spontanée de la Zone : acceptable (faveur due) ou refusable (docs/08 §6). */
export function generateOffer(_state: GameState, ctx: Ctx): CorruptionEvent {
  const pnj: PnjId = 'coles';
  return {
    id: makeId(ctx, 'off'),
    kind: 'offer',
    triggerId: OFFER_TEMPLATE.id,
    pnj,
    gravity: 1,
    title: OFFER_TEMPLATE.title,
    body: fill(ctx.rng.events.pick(OFFER_TEMPLATE.bodies), pnj),
    createdAt: ctx.now,
    options: [
      { pay: 'accept', cost: 0, label: 'Accepter le coup de main' },
      { pay: 'refuse', cost: 0, label: 'Décliner poliment' },
    ],
    contractRecipe: 'tonic',
    contractHours: 6 * HOUR,
    recallsFavorId: null,
  };
}
