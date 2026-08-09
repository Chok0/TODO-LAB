/**
 * Sélecteurs purs : tout ce qui peut être dérivé n'est pas stocké (docs/10 §3).
 * Aucune mutation ici.
 */

import { BALANCE, scaledCost } from './balance';
import { getPlant, PLANTS } from './data/plants.data';
import { getRecipe, RECIPES, type Recipe } from './data/recipes.data';
import { getTech, TECH_TREE } from './data/tech-tree.data';
import type {
  Band,
  GameState,
  MachineInstance,
  MachineTemplateId,
  PlantId,
  RecipeId,
  TechId,
} from '../data/schema';

// ------------------------------------------------------------------- bandes

export function getBand(score: number): Band {
  if (score >= BALANCE.bands.coop.threshold) return 'coop';
  if (score <= BALANCE.bands.zone.threshold) return 'zone';
  return 'neutral';
}

export function currentBand(state: GameState): Band {
  return getBand(state.alignment.score);
}

// -------------------------------------------------------------------- ventes

/** Prix de vente effectif d'une recette (docs/02 §9). */
export function effectiveSalePrice(state: GameState, recipe: Recipe): number {
  if (recipe.salePrice <= 0) return 0;
  let price = recipe.salePrice;

  // bonus de catalyse (labo uniquement — toutes les recettes vendables le sont)
  if (state.lab.researched.includes('catalysis')) price *= 1 + BALANCE.catalysisSaleBonus;

  // pollution de l'atelier
  price *= 1 - state.lab.pollution;

  // taxe de corruption permanente, sur TOUTES les ventes
  price *= 1 - state.corruption.taxRate;

  // modificateur de bande
  const band = currentBand(state);
  const isLegal = recipe.branch === 'legal';
  if (band === 'coop') price *= 1 + (isLegal ? BALANCE.bands.coop.legalSale : BALANCE.bands.coop.illegalSale);
  else if (band === 'zone') price *= 1 + (isLegal ? BALANCE.bands.zone.legalSale : BALANCE.bands.zone.illegalSale);
  else price *= 1 - BALANCE.brokerCommission; // commission du Courtier

  return Math.max(0, Math.round(price * 100) / 100);
}

// ----------------------------------------------------------------------- R&D

/** Coût d'une recherche, subvention déduite le cas échéant. */
export function researchCost(state: GameState, tech: TechId): number {
  const node = getTech(tech);
  const discount = state.alignment.subsidyActive ? BALANCE.subsidyResearchDiscount : 0;
  return Math.ceil(node.cost * (1 - discount));
}

export function isTechResearched(state: GameState, tech: TechId): boolean {
  return state.lab.researched.includes(tech);
}

export function isTechAvailable(state: GameState, tech: TechId): boolean {
  if (isTechResearched(state, tech)) return false;
  return getTech(tech).requires.every((r) => isTechResearched(state, r));
}

export function visibleTechs(state: GameState): TechId[] {
  return TECH_TREE.filter((n) => isTechResearched(state, n.id) || isTechAvailable(state, n.id)).map((n) => n.id);
}

// ------------------------------------------------------------------ machines

export function machineOf(state: GameState, id: MachineTemplateId): MachineInstance | null {
  return state.lab.machines.find((m) => m.templateId === id) ?? null;
}

export function isMachineUnlocked(state: GameState, id: MachineTemplateId): boolean {
  return TECH_TREE.some((n) => n.unlocksMachine === id && isTechResearched(state, n.id));
}

export function machineBuildCost(id: MachineTemplateId): number {
  return BALANCE.machines[id].build;
}

export function machineUpgradeCost(id: MachineTemplateId): number {
  return BALANCE.machines[id].upgrade;
}

// ------------------------------------------------------------------ recettes

/** La recette est-elle utilisable (technos, clé, niveau de machine) ? */
export function isRecipeAvailable(state: GameState, recipeId: RecipeId): boolean {
  const recipe = getRecipe(recipeId);
  if (!recipe.requiresTech.every((t) => isTechResearched(state, t))) return false;
  if (recipe.requiresKey && !state.corruption.keys.includes(recipe.requiresKey)) return false;
  const machine = machineOf(state, recipe.machine);
  if (!machine) return false;
  if (machine.mk < recipe.requiresMk) return false;
  return true;
}

export function recipesForMachine(state: GameState, id: MachineTemplateId): Recipe[] {
  return RECIPES.filter((r) => r.machine === id && isRecipeAvailable(state, r.id));
}

/** Intrants suffisants pour lancer un cycle ? */
export function hasInputs(state: GameState, recipe: Recipe): boolean {
  return recipe.inputs.every((i) => (state.resources[i.resource] ?? 0) >= i.amount);
}

// ------------------------------------------------------------------- farming

export function isPlantUnlocked(state: GameState, id: PlantId): boolean {
  const plant = getPlant(id);
  const u = plant.unlock;
  if (u.kind === 'always') return true;
  if (u.kind === 'machine') return machineOf(state, u.machine) !== null;
  return state.corruption.keys.includes(u.key);
}

export function unlockedPlants(state: GameState): PlantId[] {
  return PLANTS.filter((p) => isPlantUnlocked(state, p.id)).map((p) => p.id);
}

/** Prix de la prochaine parcelle, `null` si le maximum est atteint. */
export function nextPlotCost(state: GameState): number | null {
  const owned = state.farm.plots.length;
  if (owned >= BALANCE.farm.maxPlots) return null;
  const index = owned - BALANCE.farm.startingPlots;
  const table = BALANCE.farm.plotCosts;
  if (index < 0) return null;
  return index < table.length ? table[index] : scaledCost(table[table.length - 1], index - table.length + 1);
}

/** Coût réel d'une graine, en tenant compte du stock offert et de la méthode. */
export function seedCost(state: GameState, id: PlantId, method: 'agro' | 'intensive'): number {
  if ((state.farm.seedStock[id] ?? 0) > 0) return 0;
  const base = getPlant(id).seedCost;
  return Math.ceil(method === 'agro' ? base * BALANCE.means.farm.agroSeedFactor : base);
}

// ---------------------------------------------------------------- subvention

export function isSubsidyAvailable(state: GameState): boolean {
  if (state.alignment.subsidyActive) return false;
  return (
    state.alignment.reputation.coop >= BALANCE.subsidy.minReputation &&
    isRecipeAvailable(state, 'remedy_premium')
  );
}

// ------------------------------------------------------------------ corruption

export function nextKey(state: GameState): (typeof BALANCE.corruptionKeys)[number] | null {
  for (const k of BALANCE.corruptionKeys) {
    if (!state.corruption.keys.includes(k.key)) return k;
  }
  return null;
}

export function isIllegalBranchVisible(state: GameState): boolean {
  return isTechResearched(state, 'adv_synthesis');
}

export function unreadLetters(state: GameState): number {
  return state.narrative.letters.filter((l) => !l.read).length;
}

export function readyPlots(state: GameState): number {
  return state.farm.plots.filter((p) => p.state.kind === 'ready').length;
}
