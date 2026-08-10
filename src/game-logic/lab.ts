/** Labo : R&D, machines, cycles de production, ventes (docs/04). */

import { registerSale } from './alignment';
import { BALANCE, cycleDuration } from './balance';
import { addRes, emit, spendRes, type Ctx } from './core';
import { onIllegalCycle, registerDelivery } from './corruption';
import { unlockFarm } from './farming';
import { getRecipe, type Recipe } from './data/recipes.data';
import { getTech } from './data/tech-tree.data';
import { machineName } from './procgen/naming';
import {
  effectiveSalePrice,
  hasInputs,
  isMachineUnlocked,
  isRecipeAvailable,
  isTechAvailable,
  machineBuildCost,
  machineOf,
  machineUpgradeCost,
  researchCost,
} from './selectors';
import { computeTexture } from './texture';
import type { GameState, MachineInstance, MachineTemplateId, MeansTag, RecipeId, Timestamp } from '../data/schema';

// --------------------------------------------------------------------- R&D

export function research(state: GameState, ctx: Ctx, tech: Parameters<typeof getTech>[0]): boolean {
  if (!isTechAvailable(state, tech)) return false;
  const cost = researchCost(state, tech);
  if (!spendRes(state, 'kess', cost)) return false;

  state.lab.researched.push(tech);
  const node = getTech(tech);
  emit(ctx, { kind: 'research', tech, label: node.label });

  // matériel de l'oncle : la construction offerte est immédiate (DEC-10)
  if (node.unlocksMachine && machineBuildCost(node.unlocksMachine) === 0) {
    buildMachine(state, ctx, node.unlocksMachine);
  }
  // la remise en culture ne débloque pas un écran : elle livre les parcelles
  if (tech === 'farm_bp') unlockFarm(state, ctx);
  return true;
}

// ---------------------------------------------------------------- machines

/** Recette assignée par défaut à la construction. */
function defaultRecipe(state: GameState, id: MachineTemplateId): RecipeId | null {
  const candidates: Record<MachineTemplateId, RecipeId[]> = {
    extractor: ['extract_med', 'extract_ind', 'tonic'],
    still: ['remedy_std'],
    synthesizer: ['raw_extract'],
  };
  for (const r of candidates[id]) if (isRecipeAvailable(state, r)) return r;
  return null;
}

export function buildMachine(state: GameState, ctx: Ctx, id: MachineTemplateId): boolean {
  if (!isMachineUnlocked(state, id)) return false;
  if (machineOf(state, id)) return false;
  const cost = machineBuildCost(id);
  if (cost > 0 && !spendRes(state, 'kess', cost)) return false;

  const machine: MachineInstance = {
    templateId: id,
    displayName: machineName(ctx, id),
    mk: 1,
    assignedRecipe: null,
    means: 'clean',
    run: null,
  };
  state.lab.machines.push(machine);
  machine.assignedRecipe = defaultRecipe(state, id);
  state.stats.machinesBuilt += 1;
  emit(ctx, { kind: 'machine_built', machine: id, name: machine.displayName });
  return true;
}

export function upgradeMachine(state: GameState, ctx: Ctx, id: MachineTemplateId): boolean {
  const machine = machineOf(state, id);
  if (!machine || machine.mk >= 2) return false;
  if (!state.lab.researched.includes('catalysis')) return false;
  if (!spendRes(state, 'kess', machineUpgradeCost(id))) return false;

  machine.mk = 2;
  emit(ctx, { kind: 'machine_upgraded', machine: id, name: machine.displayName, mk: 2 });
  return true;
}

/** Changer de recette est gratuit mais annule le cycle en cours (intrants rendus). */
export function assignRecipe(state: GameState, ctx: Ctx, id: MachineTemplateId, recipe: RecipeId | null): boolean {
  const machine = machineOf(state, id);
  if (!machine) return false;
  if (machine.assignedRecipe === recipe) return true;

  if (machine.run) {
    const current = getRecipe(machine.run.recipe);
    for (const i of current.inputs) addRes(state, i.resource, i.amount);
    machine.run = null;
  }
  if (recipe && !isRecipeAvailable(state, recipe)) return false;
  machine.assignedRecipe = recipe;
  tryStartCycle(state, ctx, machine, ctx.now);
  return true;
}

export function setMeans(state: GameState, _ctx: Ctx, id: MachineTemplateId, means: MeansTag): boolean {
  const machine = machineOf(state, id);
  if (!machine) return false;
  machine.means = means;
  return true;
}

export function cleanLab(state: GameState, ctx: Ctx): boolean {
  if (state.lab.pollution <= 0) return false;
  if (!spendRes(state, 'kess', BALANCE.pollution.cleanCost)) return false;
  const before = state.lab.pollution;
  state.lab.pollution = Math.max(0, state.lab.pollution - BALANCE.pollution.cleanAmount);
  emit(ctx, { kind: 'pollution_cleaned', amount: before - state.lab.pollution });
  return true;
}

// ------------------------------------------------------------------ cycles

export function cycleDurationFor(machine: MachineInstance, recipe: Recipe): number {
  const base = BALANCE.machines[recipe.machine].baseCycle;
  const nominal = cycleDuration(base, machine.mk);
  return machine.means === 'dirty' ? Math.round(nominal * (1 - BALANCE.means.lab.dirtySpeedGain)) : nominal;
}

/** Une production illégale ne démarre pas tant qu'un incident n'est pas réglé (DEC-09). */
export function isBlockedByEvent(state: GameState, recipe: Recipe): boolean {
  return recipe.branch === 'illegal' && state.corruption.pendingEvent?.kind === 'sanction';
}

export function canStartCycle(state: GameState, machine: MachineInstance): boolean {
  if (machine.run || !machine.assignedRecipe) return false;
  if (!isRecipeAvailable(state, machine.assignedRecipe)) return false;
  const recipe = getRecipe(machine.assignedRecipe);
  if (isBlockedByEvent(state, recipe)) return false;
  return hasInputs(state, recipe);
}

export function tryStartCycle(state: GameState, _ctx: Ctx, machine: MachineInstance, at: Timestamp): boolean {
  if (!canStartCycle(state, machine)) return false;
  const recipe = getRecipe(machine.assignedRecipe!);
  for (const i of recipe.inputs) state.resources[i.resource] -= i.amount;
  machine.run = { startedAt: at, endsAt: at + cycleDurationFor(machine, recipe), recipe: recipe.id };
  return true;
}

export function startCycleById(state: GameState, ctx: Ctx, id: MachineTemplateId): boolean {
  const machine = machineOf(state, id);
  if (!machine) return false;
  return tryStartCycle(state, ctx, machine, ctx.now);
}

export function completeCycle(state: GameState, ctx: Ctx, machine: MachineInstance, at: Timestamp): void {
  const run = machine.run;
  if (!run) return;
  const recipe = getRecipe(run.recipe);
  machine.run = null;
  state.stats.cyclesCompleted += 1;

  if (recipe.output) {
    // raffinage : la sortie est une ressource, pas un bien vendu
    addRes(state, recipe.output.resource, recipe.output.amount);
  } else {
    const retained = registerDelivery(state, ctx, recipe.id);
    if (!retained) {
      const price = effectiveSalePrice(state, recipe);
      addRes(state, 'kess', price);
      state.stats.kessEarnedTotal += price;
      state.stats.kessFromProduction += price;
      emit(ctx, { kind: 'sale', recipe: recipe.id, label: recipe.label, kess: price, branch: recipe.branch });
      registerSale(state, ctx, recipe.branch, recipe.endTag === 'harmful');
    }
    // la texture ne concerne que les productions finies (docs/06 §6)
    const texture = computeTexture(recipe.endTag, machine.means);
    state.stats.textureCounts[texture] += 1;
    emit(ctx, { kind: 'texture', texture, recipe: recipe.id });
  }

  emit(ctx, { kind: 'cycle', machine: machine.templateId, recipe: recipe.id, label: recipe.label });

  if (machine.means === 'dirty') {
    state.lab.pollution = Math.min(
      BALANCE.pollution.max,
      state.lab.pollution + BALANCE.means.lab.dirtyPollutionPerCycle,
    );
  }

  if (recipe.branch === 'illegal') onIllegalCycle(state, ctx);

  // convoyeur : enchaînement automatique tant que les intrants suivent
  if (state.lab.researched.includes('conveyor')) tryStartCycle(state, ctx, machine, at);
}

/**
 * Fait avancer toutes les machines sur un segment de temps contigu.
 * Les cycles se résolvent dans l'ordre chronologique.
 */
export function advanceLab(state: GameState, ctx: Ctx, from: Timestamp, to: Timestamp): void {
  let guard = 0;
  while (guard++ < 10000) {
    let target: MachineInstance | null = null;
    let at = Infinity;
    for (const m of state.lab.machines) {
      if (m.run && m.run.endsAt <= to && m.run.endsAt < at) {
        target = m;
        at = m.run.endsAt;
      }
    }
    if (!target) break;
    completeCycle(state, ctx, target, Math.max(at, from));
  }
}

/**
 * Rattrapage plafonné : les cycles antérieurs à `at` sont résolus une seule fois
 * puis la simulation reprend normalement (DEC-11, plafond de 12 h).
 */
export function catchUpMachines(state: GameState, ctx: Ctx, at: Timestamp): void {
  for (const machine of state.lab.machines) {
    if (machine.run && machine.run.endsAt < at) {
      completeCycle(state, ctx, machine, at);
    }
  }
}

/** Relance les machines à l'arrêt dont les intrants sont redevenus disponibles. */
export function pokeConveyor(state: GameState, ctx: Ctx, at: Timestamp): void {
  if (!state.lab.researched.includes('conveyor')) return;
  for (const machine of state.lab.machines) tryStartCycle(state, ctx, machine, at);
}
