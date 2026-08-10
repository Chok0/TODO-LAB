/**
 * Migrations de schéma (docs/10 §4). Une migration ne supprime JAMAIS de
 * donnée utilisateur (todos, historiques, lettres) : elle transforme.
 */

import { RESOURCE_IDS, SCHEMA_VERSION, type GameState } from './schema';
import { BALANCE } from '../game-logic/balance';
import { STREAM_NAMES } from '../game-logic/rng';

type Migration = (state: any) => any;

/** Index N = migration de la version N vers N+1. */
const MIGRATIONS: Record<number, Migration> = {
  /**
   * v1 → v2 : monnaie unique. L'Énergie disparaît en tant que ressource ; le
   * solde d'Énergie devient des kessler à parité, et l'historique des todos
   * garde ses montants sous un nom neutre. Rien n'est jeté : la partie reprend
   * là où elle s'était arrêtée, avec un seul compteur au lieu de deux.
   */
  1: (state: any) => {
    const energy = Number(state?.resources?.energy) || 0;
    if (state.resources) {
      state.resources.kess = (Number(state.resources.kess) || 0) + energy;
      delete state.resources.energy;
    }

    for (const todo of state.todos ?? []) {
      for (const entry of todo.completionHistory ?? []) {
        if (entry.gained === undefined) entry.gained = Number(entry.energyGained) || 0;
        delete entry.energyGained;
      }
      // une perte enregistrée en Énergie n'a plus de support : elle devient des ₭
      if (todo.lastLoss?.resource === 'energy') todo.lastLoss.resource = 'kess';
      if (todo.gain?.resource === 'energy') todo.gain.resource = 'kess';
      if (todo.loss?.resource === 'energy') todo.loss.resource = 'kess';
    }

    state.stats ??= {};
    state.stats.kessFromTodos ??= Number(state.stats.energyEarnedTotal) || 0;
    state.stats.kessFromProduction ??= Number(state.stats.kessEarnedTotal) || 0;
    state.stats.kessEarnedTotal =
      (Number(state.stats.kessEarnedTotal) || 0) + (Number(state.stats.energyEarnedTotal) || 0);
    delete state.stats.energyEarnedTotal;

    // les fenêtres passent au niveau du bureau ; l'ancien booléen n'a plus cours
    state.settings ??= {};
    state.settings.layer ??= state.settings.alwaysOnTop === false ? 'normal' : 'desktop';
    delete state.settings.alwaysOnTop;

    state.supply ??= { boughtToday: 0 };

    // Une partie en cours cultivait déjà : elle conserve ses parcelles et se
    // voit créditer la recherche correspondante, sinon le farming disparaîtrait
    // sous ses pieds.
    state.lab ??= {};
    state.lab.researched ??= [];
    if ((state.farm?.plots?.length ?? 0) > 0 && !state.lab.researched.includes('farm_bp')) {
      state.lab.researched.push('farm_bp');
    }

    return state;
  },
};

export function migrate(raw: any): GameState {
  let state = raw;
  let version: number = state?.meta?.version ?? 1;

  while (version < SCHEMA_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) break;
    state = step(state);
    version += 1;
    state.meta.version = version;
  }

  return normalize(state);
}

/**
 * Complète les champs absents pour qu'un état ancien ou partiel reste
 * exploitable sans crasher l'application.
 */
export function normalize(state: any): GameState {
  state.meta ??= {};
  state.meta.version = SCHEMA_VERSION;
  state.meta.rngCounters ??= {};
  for (const name of STREAM_NAMES) state.meta.rngCounters[name] ??= 0;

  state.resources ??= {};
  for (const id of RESOURCE_IDS) state.resources[id] = Number(state.resources[id]) || 0;

  state.todos ??= [];
  for (const todo of state.todos) {
    todo.completionHistory ??= [];
    todo.lastLoss ??= null;
    todo.gain ??= null;
    todo.loss ??= null;
    if (todo.kind === 'habit') {
      todo.dailyHistory ??= [];
      todo.streak ??= 0;
      todo.todayCount ??= 0;
      todo.failedToday ??= false;
    }
    if (todo.kind === 'recurring') {
      todo.fixedDays ??= [];
      todo.periodProgress ??= { periodKey: '', done: 0, misses: 0 };
    }
  }

  state.lab ??= {};
  state.lab.researched ??= [];
  state.lab.machines ??= [];
  state.lab.pollution ??= 0;

  state.farm ??= {};
  state.farm.plots ??= [];
  state.farm.seedStock ??= {};

  state.supply ??= {};
  state.supply.boughtToday = Number(state.supply.boughtToday) || 0;

  state.corruption ??= {};
  state.corruption.keys ??= [];
  state.corruption.favors ??= [];
  state.corruption.taxRate ??= 0;
  state.corruption.illegalCyclesSinceEvent ??= 0;
  state.corruption.pendingEvent ??= null;
  state.corruption.lastEventTriggerId ??= null;
  state.corruption.activeContract ??= null;
  state.corruption.openingDebt ??= 0;
  state.corruption.debtRemindersSent ??= 0;
  state.corruption.lastDebtEventAt ??= null;

  state.alignment ??= {};
  state.alignment.score ??= 0;
  state.alignment.legalSalesToday ??= 0;
  state.alignment.soldLegalToday ??= false;
  state.alignment.soldIllegalToday ??= false;
  state.alignment.reputation ??= { coop: 0, zone: 0, broker: 0 };
  state.alignment.subsidyActive ??= false;
  state.alignment.lastSubsidyWeek ??= null;

  state.narrative ??= {};
  state.narrative.letters ??= [];
  state.narrative.letterQueue ??= [];
  state.narrative.lettersToday ??= 0;
  state.narrative.servedTemplates ??= [];
  state.narrative.registry ??= [];
  state.narrative.firedTriggers ??= [];

  state.stats ??= {};
  state.stats.textureCounts ??= {};
  for (const t of ['aligned', 'cynical', 'neutral', 'careless', 'vice_artisan', 'zone_pure']) {
    state.stats.textureCounts[t] ??= 0;
  }
  for (const k of [
    'kessEarnedTotal',
    'kessFromTodos',
    'kessFromProduction',
    'salesLegal',
    'salesIllegal',
    'cyclesCompleted',
    'harvests',
    'machinesBuilt',
    'longestStreak',
    'todosCompleted',
    'daysPlayed',
    'eventsResolved',
    'contractsHonored',
    'contractsFailed',
  ]) {
    state.stats[k] ??= 0;
  }

  state.settings ??= {};
  state.settings.layer ??= 'desktop';
  state.settings.opacity ??= 0.94;
  state.settings.windowPos ??= null;
  state.settings.collapsedPanels ??= {};
  state.settings.quietMode ??= false;
  state.settings.reducedMotion ??= false;

  return state as GameState;
}

/**
 * Invariants du modèle (docs/10 §5). En développement une violation lève ;
 * en production elle est corrigée par clamp — jamais de crash utilisateur.
 */
export function enforceInvariants(state: GameState, strict = false): string[] {
  const problems: string[] = [];
  const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

  for (const id of RESOURCE_IDS) {
    if (!Number.isFinite(state.resources[id]) || state.resources[id] < 0) {
      problems.push(`ressource ${id} invalide`);
      state.resources[id] = Math.max(0, Number(state.resources[id]) || 0);
    }
  }

  const expectedTax = BALANCE.corruptionKeys
    .filter((k) => state.corruption.keys.includes(k.key))
    .reduce((s, k) => s + k.tax, 0);
  if (Math.abs(state.corruption.taxRate - expectedTax) > 1e-6) {
    problems.push('taxe de corruption incohérente avec les clés possédées');
    state.corruption.taxRate = Math.round(expectedTax * 100) / 100;
  }

  if (state.lab.pollution < 0 || state.lab.pollution > BALANCE.pollution.max) {
    problems.push('pollution hors bornes');
    state.lab.pollution = clamp(state.lab.pollution, 0, BALANCE.pollution.max);
  }

  for (const plot of state.farm.plots) {
    if (plot.envDebt < 0 || plot.envDebt > BALANCE.envDebt.max) {
      problems.push(`dette environnementale hors bornes (${plot.id})`);
      plot.envDebt = clamp(plot.envDebt, 0, BALANCE.envDebt.max);
    }
  }

  const a = state.alignment;
  if (a.score < BALANCE.alignment.min || a.score > BALANCE.alignment.max) {
    problems.push('alignement hors bornes');
    a.score = clamp(a.score, BALANCE.alignment.min, BALANCE.alignment.max);
  }
  for (const faction of ['coop', 'zone', 'broker'] as const) {
    const v = a.reputation[faction];
    if (v < BALANCE.reputation.min || v > BALANCE.reputation.max) {
      problems.push(`réputation ${faction} hors bornes`);
      a.reputation[faction] = clamp(v, BALANCE.reputation.min, BALANCE.reputation.max);
    }
  }

  for (const machine of state.lab.machines) {
    if (machine.run && machine.run.endsAt <= machine.run.startedAt) {
      problems.push(`cycle incohérent (${machine.templateId})`);
      machine.run = null;
    }
  }

  for (const todo of state.todos) {
    if (todo.kind === 'habit') {
      if (todo.streak < 0) {
        problems.push('streak négatif');
        todo.streak = 0;
      }
      if (todo.todayCount < 0) {
        problems.push('compteur négatif');
        todo.todayCount = 0;
      }
      const seen = new Set<string>();
      todo.dailyHistory = todo.dailyHistory.filter((e) => {
        if (seen.has(e.day)) return false;
        seen.add(e.day);
        return true;
      });
    }
  }

  if (strict && problems.length) {
    throw new Error(`Invariants violés : ${problems.join(', ')}`);
  }
  return problems;
}
