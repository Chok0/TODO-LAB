/** Sélection et rendu des lettres (docs/08 §7). */

import type { Ctx } from '../core';
import { LETTER_TEMPLATES, type LetterTemplate } from '../data/letter-templates.fr';
import { BALANCE } from '../balance';
import { currentBand } from '../selectors';
import { TEXTURE_LABELS } from '../texture';
import { dayKey, DAY } from '../time';
import type { GameState } from '../../data/schema';
import { PNJ_FACTION } from '../alignment';

export type LetterVars = Record<string, string | number>;

/** Variables toujours disponibles : aucun {placeholder} ne doit subsister. */
export function defaultVars(state: GameState): LetterVars {
  return {
    amount: Math.round(state.stats.kessEarnedTotal),
    product: 'votre production',
    machine: state.lab.machines[state.lab.machines.length - 1]?.displayName ?? "l'atelier",
    streak: state.stats.longestStreak,
    favors: state.corruption.favors.filter((f) => !f.repaid).length,
    debt: state.corruption.openingDebt,
    texture: TEXTURE_LABELS.aligned,
  };
}

export function renderBody(body: string, vars: LetterVars): string {
  return body.replace(/\{(\w+)\}/g, (_m, key: string) => {
    const value = vars[key];
    return value === undefined ? '' : String(value);
  });
}

function matchesConditions(state: GameState, template: LetterTemplate): boolean {
  const c = template.conditions;
  if (!c) return true;
  if (c.band && !c.band.includes(currentBand(state))) return false;
  if (c.debtOpen !== undefined && c.debtOpen !== state.corruption.openingDebt > 0) return false;
  const rep = state.alignment.reputation[PNJ_FACTION[template.pnj]];
  if (c.minRep !== undefined && rep < c.minRep) return false;
  if (c.maxRep !== undefined && rep > c.maxRep) return false;
  return true;
}

/** Poids effectif : un template servi récemment est fortement déprioritisé. */
function effectiveWeight(state: GameState, template: LetterTemplate): number {
  const served = state.narrative.servedTemplates.find((s) => s.templateId === template.id);
  if (!served) return template.weight;
  const lastTs = Date.parse(served.lastServedDay);
  const nowTs = Date.parse(dayKey(state.meta.lastTickAt));
  const days = Number.isNaN(lastTs) || Number.isNaN(nowTs) ? 99 : (nowTs - lastTs) / DAY;
  return days < BALANCE.letters.freshnessDays ? template.weight / BALANCE.letters.freshnessPenalty : template.weight;
}

/** Choisit le template le plus pertinent pour un signal donné. */
export function selectTemplate(state: GameState, ctx: Ctx, signal: string): LetterTemplate | null {
  const pool = LETTER_TEMPLATES.filter((t) => t.trigger === signal && matchesConditions(state, t));
  if (pool.length === 0) return null;
  return ctx.rng.letters.weighted(pool, (t) => effectiveWeight(state, t));
}

export function pickBody(ctx: Ctx, template: LetterTemplate): string {
  return ctx.rng.letters.pick(template.bodies);
}
