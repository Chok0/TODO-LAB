/** Farming : parcelles, plantation, croissance, récolte, dette environnementale (docs/05). */

import { BALANCE } from './balance';
import { addRes, clamp, emit, round2, spendRes, type Ctx } from './core';
import { getPlant } from './data/plants.data';
import {
  isFarmUnlocked,
  isPlantUnlocked,
  isSupplyOpen,
  nextPlotCost,
  seedCost,
  supplyPrice,
  supplyRemaining,
} from './selectors';
import { HOUR, type Timestamp } from './time';
import type { GameState, PlantId, Plot } from '../data/schema';

function findPlot(state: GameState, id: string): Plot | null {
  return state.farm.plots.find((p) => p.id === id) ?? null;
}

/** récoltes = round(base × modificateur_méthode × (1 − dette)), minimum 1. */
export function computeYield(plant: PlantId, method: 'agro' | 'intensive', envDebt: number): number {
  const base = getPlant(plant).baseYield;
  const methodFactor = method === 'intensive' ? BALANCE.means.farm.intensiveYieldFactor : 1;
  return Math.max(1, Math.round(base * methodFactor * (1 - envDebt)));
}

export function growthDuration(plant: PlantId, method: 'agro' | 'intensive'): number {
  const base = getPlant(plant).growth;
  return Math.round(method === 'agro' ? base * BALANCE.means.farm.agroDurationFactor : base);
}

// -------------------------------------------------------------- fournisseur

/**
 * Achat d'intrants au comptant (docs/05 §0). C'est la seule source de matière
 * première tant que la friche n'est pas remise en culture — et elle le reste
 * après, pour combler un trou de stock quand les parcelles n'ont pas suivi.
 */
export function buySupply(state: GameState, ctx: Ctx, plantId: PlantId, amount: number): boolean {
  const wanted = Math.floor(amount);
  if (wanted <= 0) return false;
  if (!isSupplyOpen(state)) return false;
  if (!isPlantUnlocked(state, plantId)) return false;

  const affordableByQuota = Math.min(wanted, supplyRemaining(state));
  if (affordableByQuota <= 0) return false;

  const unit = supplyPrice(plantId);
  const affordable = Math.min(affordableByQuota, Math.floor(state.resources.kess / unit));
  if (affordable <= 0) return false;

  if (!spendRes(state, 'kess', affordable * unit)) return false;
  addRes(state, getPlant(plantId).harvest, affordable);
  state.supply.boughtToday += affordable;
  emit(ctx, { kind: 'supply_bought', plant: plantId, amount: affordable, cost: affordable * unit });
  return true;
}

/** Le quota se recharge à minuit — c'est la seule chose que le Fournisseur oublie. */
export function rolloverSupply(state: GameState): void {
  state.supply.boughtToday = 0;
}

// ------------------------------------------------------------------ actions

/** La remise en culture livre la friche remise en état et de quoi semer une fois. */
export function unlockFarm(state: GameState, ctx: Ctx): void {
  if (state.farm.plots.length > 0) return;
  for (let i = 0; i < BALANCE.farm.startingPlots; i++) {
    state.farm.plots.push({ id: `plot-${i + 1}`, envDebt: 0, state: { kind: 'empty' } });
  }
  for (const [id, n] of Object.entries(BALANCE.start.seedsOnFarmUnlock)) {
    state.farm.seedStock[id as PlantId] = (state.farm.seedStock[id as PlantId] ?? 0) + n;
  }
  emit(ctx, { kind: 'farm_unlocked', plots: state.farm.plots.length });
}

export function buyPlot(state: GameState, ctx: Ctx): boolean {
  if (!isFarmUnlocked(state)) return false;
  const cost = nextPlotCost(state);
  if (cost === null) return false;
  if (!spendRes(state, 'kess', cost)) return false;
  state.farm.plots.push({ id: `plot-${state.farm.plots.length + 1}`, envDebt: 0, state: { kind: 'empty' } });
  emit(ctx, { kind: 'plot_bought', total: state.farm.plots.length });
  return true;
}

export function plant(
  state: GameState,
  ctx: Ctx,
  plotId: string,
  plantId: PlantId,
  method: 'agro' | 'intensive',
): boolean {
  if (!isFarmUnlocked(state)) return false;
  const plot = findPlot(state, plotId);
  if (!plot || plot.state.kind !== 'empty') return false;
  // le moteur refuse l'action, pas seulement l'UI (docs/05 §8)
  if (!isPlantUnlocked(state, plantId)) return false;

  const stock = state.farm.seedStock[plantId] ?? 0;
  if (stock > 0) {
    state.farm.seedStock[plantId] = stock - 1;
  } else {
    const cost = seedCost(state, plantId, method);
    if (!spendRes(state, 'kess', cost)) return false;
  }

  plot.state = {
    kind: 'growing',
    plant: plantId,
    method,
    startedAt: ctx.now,
    endsAt: ctx.now + growthDuration(plantId, method),
  };
  emit(ctx, { kind: 'planted', plot: plotId, plant: plantId, method });
  return true;
}

export function harvest(state: GameState, ctx: Ctx, plotId: string): boolean {
  const plot = findPlot(state, plotId);
  if (!plot || plot.state.kind !== 'ready') return false;

  const { plant: plantId, method, yield: amount } = plot.state;
  addRes(state, getPlant(plantId).harvest, amount);
  state.stats.harvests += 1;

  const delta =
    method === 'intensive' ? BALANCE.means.farm.intensiveDebtPerHarvest : BALANCE.means.farm.agroDebtPerHarvest;
  plot.envDebt = round2(clamp(plot.envDebt + delta, 0, BALANCE.envDebt.max));

  plot.state = { kind: 'empty' };
  emit(ctx, { kind: 'harvest', plot: plotId, plant: plantId, amount });
  return true;
}

export function setFallow(state: GameState, _ctx: Ctx, plotId: string, on: boolean): boolean {
  const plot = findPlot(state, plotId);
  if (!plot) return false;
  if (on) {
    if (plot.state.kind !== 'empty') return false;
    plot.state = { kind: 'fallow', since: _ctx.now };
    return true;
  }
  if (plot.state.kind !== 'fallow') return false;
  plot.state = { kind: 'empty' };
  return true;
}

// ------------------------------------------------------------------- temps

/**
 * Croissance et régénération de jachère sur un segment contigu.
 * La croissance n'est jamais plafonnée par l'absence (DEC-11).
 */
export function advanceFarm(state: GameState, _ctx: Ctx, from: Timestamp, to: Timestamp): void {
  for (const plot of state.farm.plots) {
    if (plot.state.kind === 'growing' && plot.state.endsAt <= to) {
      const { plant: plantId, method } = plot.state;
      plot.state = { kind: 'ready', plant: plantId, method, yield: computeYield(plantId, method, plot.envDebt) };
      continue;
    }
    if (plot.state.kind === 'fallow') {
      const start = Math.max(from, plot.state.since);
      const hours = Math.max(0, to - start) / HOUR;
      if (hours > 0) {
        plot.envDebt = round2(clamp(plot.envDebt + BALANCE.envDebt.fallowPerHour * hours, 0, BALANCE.envDebt.max));
      }
    }
  }
}
