/** Module Log : signaux, file anti-spam, délivrance des lettres (docs/07). */

import { BALANCE } from './balance';
import { emit, makeId, type Ctx } from './core';
import { OPENING_LETTERS } from './data/letter-templates.fr';
import { renderEffect, type Effect } from './effects';
import { defaultVars, pickBody, renderBody, selectTemplate, type LetterVars } from './procgen/letters';
import { isSubsidyAvailable } from './selectors';
import { dayKey, DAY, type Timestamp } from './time';
import type { GameState, Letter } from '../data/schema';

export interface Signal {
  name: string;
  vars?: LetterVars;
}

/** Signaux à ne déclencher qu'une seule fois dans la partie. */
function isOneShot(name: string): boolean {
  return /^(first_sale|kess:|machine_built:|key_bought:|band:|texture:|streak:|subsidy_available|debt_cleared|research:)/.test(
    name,
  );
}

/** Une lettre prioritaire échappe au plafond quotidien (docs/07 §4). */
function isPriority(name: string): boolean {
  return name.startsWith('event_resolved') || name.startsWith('contract_');
}

const TEXTURE_THRESHOLDS: Record<string, number> = {
  cynical: 3,
  zone_pure: 5,
  vice_artisan: 3,
  aligned: 8,
};

// --------------------------------------------------------------- dérivation

/** Traduit les effets d'un tour de moteur en signaux narratifs. */
export function deriveSignals(state: GameState, effects: Effect[]): Signal[] {
  const signals: Signal[] = [];

  for (const e of effects) {
    switch (e.kind) {
      case 'sale':
        if (state.stats.salesLegal + state.stats.salesIllegal === 1) {
          signals.push({ name: 'first_sale', vars: { product: e.label, amount: Math.round(e.kess) } });
        }
        break;
      case 'machine_built':
        signals.push({ name: `machine_built:${e.machine}`, vars: { machine: e.name } });
        break;
      case 'key_bought':
        signals.push({ name: `key_bought:${e.key}` });
        break;
      case 'event_resolved':
        signals.push({ name: `event_resolved:${e.mode}` });
        break;
      case 'contract_done':
        signals.push({ name: 'contract_done' });
        break;
      case 'contract_failed':
        signals.push({ name: 'contract_failed' });
        break;
      case 'band_changed':
        signals.push({ name: `band:${e.to}` });
        break;
      case 'texture': {
        const threshold = TEXTURE_THRESHOLDS[e.texture];
        if (threshold && state.stats.textureCounts[e.texture] >= threshold) {
          signals.push({ name: `texture:${e.texture}` });
        }
        break;
      }
      case 'streak':
        if (e.streak === 7) signals.push({ name: 'streak:7', vars: { streak: e.streak } });
        if (e.streak === 30) signals.push({ name: 'streak:30', vars: { streak: e.streak } });
        break;
      case 'penalty':
        if (e.reason === 'break') signals.push({ name: 'habit_break' });
        break;
      case 'debt_repaid':
        if (e.remaining === 0) signals.push({ name: 'debt_cleared' });
        break;
      case 'research':
        signals.push({ name: `research:${e.tech}` });
        break;
      default:
        break;
    }
  }

  // paliers de trésorerie cumulée
  for (const milestone of [100, 500]) {
    if (state.stats.kessEarnedTotal >= milestone) {
      signals.push({ name: `kess:${milestone}`, vars: { amount: Math.round(state.stats.kessEarnedTotal) } });
    }
  }

  if (isSubsidyAvailable(state)) signals.push({ name: 'subsidy_available' });

  return signals;
}

// ------------------------------------------------------------------- file

export function queueFromSignals(state: GameState, ctx: Ctx, signals: Signal[]): void {
  for (const signal of signals) {
    if (isOneShot(signal.name)) {
      const key = `sig:${signal.name}`;
      if (state.narrative.firedTriggers.includes(key)) continue;
      state.narrative.firedTriggers.push(key);
    }

    const template = selectTemplate(state, ctx, signal.name);
    if (!template) continue;

    const vars = { ...defaultVars(state), ...(signal.vars ?? {}) };
    state.narrative.letterQueue.push({
      templateId: template.id,
      pnj: template.pnj,
      title: template.title,
      body: renderBody(pickBody(ctx, template), vars),
      queuedAt: ctx.now,
      priority: isPriority(signal.name),
    });

    const served = state.narrative.servedTemplates.find((s) => s.templateId === template.id);
    if (served) served.lastServedDay = dayKey(ctx.now);
    else state.narrative.servedTemplates.push({ templateId: template.id, lastServedDay: dayKey(ctx.now) });
  }
}

/** Lettres d'ouverture scriptées, séquencées sur les premiers jours. */
export function queueOpeningLetters(state: GameState, ctx: Ctx): void {
  const daysElapsed = Math.floor((ctx.now - state.meta.createdAt) / DAY);
  for (const scripted of OPENING_LETTERS) {
    if (scripted.dayOffset > daysElapsed) continue;
    const key = `scripted:${scripted.id}`;
    if (state.narrative.firedTriggers.includes(key)) continue;
    state.narrative.firedTriggers.push(key);
    state.narrative.letterQueue.push({
      templateId: scripted.id,
      pnj: scripted.pnj,
      title: scripted.title,
      body: scripted.body,
      queuedAt: ctx.now,
      priority: true,
    });
  }
}

/** Délivre la file dans la limite de 2 lettres/jour (les prioritaires passent outre). */
export function deliverQueue(state: GameState, ctx: Ctx): void {
  const queue = state.narrative.letterQueue;
  let i = 0;
  while (i < queue.length) {
    const item = queue[i];
    if (!item.priority && state.narrative.lettersToday >= BALANCE.letters.maxPerDay) {
      i++;
      continue;
    }
    queue.splice(i, 1);
    const letter: Letter = {
      id: makeId(ctx, 'ltr'),
      templateId: item.templateId,
      pnj: item.pnj,
      day: dayKey(ctx.now),
      at: ctx.now,
      title: item.title,
      body: item.body,
      read: false,
    };
    state.narrative.letters.unshift(letter);
    if (!item.priority) state.narrative.lettersToday += 1;
    emit(ctx, { kind: 'letter', letterId: letter.id, title: letter.title });
  }
}

/** Point d'entrée unique appelé par le moteur après chaque lot d'effets. */
export function processNarrative(state: GameState, ctx: Ctx, effects: Effect[]): void {
  queueOpeningLetters(state, ctx);
  queueFromSignals(state, ctx, deriveSignals(state, effects));
  deliverQueue(state, ctx);
}

export function rolloverNarrative(state: GameState, ctx: Ctx, _midnight: Timestamp): void {
  state.narrative.lettersToday = 0;
  deliverQueue(state, ctx);
}

// --------------------------------------------------------------- registre

/** Alimente le fil d'activité factuel à partir des effets (jamais depuis l'UI). */
export function pushRegistry(state: GameState, effects: Effect[], at: Timestamp): void {
  for (const e of effects) {
    const line = renderEffect(e);
    if (!line) continue;
    state.narrative.registry.unshift({ at, text: line.text, tone: line.tone });
  }
  if (state.narrative.registry.length > BALANCE.registryMaxLines) {
    state.narrative.registry.length = BALANCE.registryMaxLines;
  }
}
