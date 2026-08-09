/**
 * Simulateur d'équilibrage (docs/13). Livrable de première classe : c'est
 * l'outil qui permet de juger l'économie sans lancer l'application.
 *
 *   npm run sim -- --days 14 --seed 42 --strategy legal
 *   npm run sim -- --days 30 --seed 42 --strategy mixed --letters
 */

import { advanceTime, applyAction, createGame, makeRng } from '../src/game-logic/engine';
import type { Action } from '../src/game-logic/actions';
import { BALANCE } from '../src/game-logic/balance';
import { getPlant } from '../src/game-logic/data/plants.data';
import { RECIPES } from '../src/game-logic/data/recipes.data';
import { TECH_TREE } from '../src/game-logic/data/tech-tree.data';
import {
  currentBand,
  hasInputs,
  isPlantUnlocked,
  isRecipeAvailable,
  machineOf,
  nextKey,
  nextPlotCost,
  researchCost,
  seedCost,
} from '../src/game-logic/selectors';
import { dayKey, DAY, MINUTE } from '../src/game-logic/time';
import type { GameState, PlantId, RecipeId, TechId } from '../src/data/schema';

export type Strategy = 'legal' | 'illegal' | 'mixed';

// ------------------------------------------------------------------- options

export const STEP = 30 * MINUTE;
export const START = new Date(2026, 0, 5, 8, 0, 0, 0).getTime(); // lundi 8 h
/** Le widget est consulté par sessions courtes, pas 24 h/24 (docs/01 §5). */
const SESSION_HOURS = [8, 10, 12, 14, 16, 18, 20, 22];
/** Réserve gardée pour pouvoir toujours racheter des graines. */
const RESERVE = 60;

// --------------------------------------------------------------------- bot

const RESEARCH_ORDER: Record<Strategy, TechId[]> = {
  legal: ['extractor_bp', 'still_bp', 'conveyor', 'adv_synthesis', 'catalysis'], // adv_synthesis n'est qu'un prérequis de catalyse
  illegal: ['extractor_bp', 'still_bp', 'adv_synthesis', 'conveyor', 'catalysis'],
  mixed: ['extractor_bp', 'still_bp', 'conveyor', 'adv_synthesis', 'catalysis'],
};

const PLANT_PREFERENCE: Record<Strategy, PlantId[]> = {
  legal: ['medicinal', 'industrial'],  // arbitrées par plantToSow selon le besoin réel
  illegal: ['toxic', 'recreational', 'medicinal', 'industrial'],
  mixed: ['recreational', 'toxic', 'medicinal', 'industrial'],
};

let state: GameState;

function act(action: Action, now: number): void {
  state = applyAction(state, action, now, makeRng(state)).state;
}

/** Recette vendable visée par une machine de transformation. */
function targetRecipe(machine: 'still' | 'synthesizer') {
  const sellable = RECIPES.filter(
    (r) => r.machine === machine && r.salePrice > 0 && isRecipeAvailable(state, r.id),
  ).sort((a, b) => b.salePrice - a.salePrice);
  return sellable.find((r) => hasInputs(state, r)) ?? sellable[0] ?? null;
}

/** Meilleure recette exécutable pour une machine, selon la stratégie. */
function bestRecipe(machine: 'extractor' | 'still' | 'synthesizer', _strategy: Strategy): RecipeId | null {
  const candidates = RECIPES.filter((r) => r.machine === machine && isRecipeAvailable(state, r.id));

  if (machine === 'extractor') {
    // 1. raffiner les récoltes en attente, la plus abondante d'abord
    const pending = candidates
      .filter((r) => r.output && hasInputs(state, r))
      .sort((a, b) => (state.resources[b.inputs[0].resource] ?? 0) - (state.resources[a.inputs[0].resource] ?? 0));
    if (pending.length) return pending[0].id;

    // 2. plus rien à raffiner : écouler le surplus de pa_med en toniques quand
    //    la machine aval est à l'arrêt faute d'intrants
    const tonic = RECIPES.find((r) => r.id === 'tonic')!;
    if (hasInputs(state, tonic)) {
      const downstream = (['still', 'synthesizer'] as const)
        .filter((m) => machineOf(state, m))
        .map((m) => targetRecipe(m));
      const anyRunnable = downstream.some((r) => r && hasInputs(state, r));
      if (!anyRunnable || (state.resources.pa_med ?? 0) >= 8) return 'tonic';
    }
    return candidates.find((r) => r.output)?.id ?? null;
  }

  return targetRecipe(machine)?.id ?? null;
}

/** Plante à semer : celle dont le principe actif manque le plus à la recette visée. */
function plantToSow(strategy: Strategy): PlantId | null {
  const unlocked = PLANT_PREFERENCE[strategy].filter((p) => isPlantUnlocked(state, p));
  if (unlocked.length === 0) return null;

  const targets = (['still', 'synthesizer'] as const)
    .filter((m) => machineOf(state, m))
    .map((m) => targetRecipe(m))
    .filter((r): r is NonNullable<typeof r> => r !== null);

  let worst: PlantId | null = null;
  let worstRatio = Infinity;
  for (const target of targets) {
    for (const input of target.inputs) {
      const plant = unlocked.find((p) => getPlant(p).pa === input.resource);
      if (!plant) continue;
      const ratio = (state.resources[input.resource] ?? 0) / input.amount;
      if (ratio < worstRatio) {
        worstRatio = ratio;
        worst = plant;
      }
    }
  }
  return worst ?? unlocked[0];
}

function playTurn(now: number, strategy: Strategy): void {
  // 1. régler un incident en cours
  const evt = state.corruption.pendingEvent;
  if (evt) {
    if (evt.kind === 'offer') {
      act({ type: 'ResolveEvent', mode: strategy === 'legal' ? 'refuse' : 'accept' }, now);
    } else {
      const cash = evt.options.find((o) => o.pay === 'kess')!;
      const mode = state.resources.kess >= cash.cost ? 'kess' : 'reputation';
      act({ type: 'ResolveEvent', mode }, now);
    }
  }

  // 2. récolter
  for (const plot of state.farm.plots) {
    if (plot.state.kind === 'ready') act({ type: 'Harvest', plotId: plot.id }, now);
  }

  // 3. replanter (jachère si la dette devient lourde)
  for (const plot of state.farm.plots) {
    if (plot.state.kind !== 'empty') continue;
    if (plot.envDebt >= 0.35) {
      act({ type: 'SetFallow', plotId: plot.id, on: true }, now);
      continue;
    }
    const choice = plantToSow(strategy);
    if (!choice) continue;
    const preferred = strategy === 'legal' ? 'agro' : 'intensive';
    // repli sur l'intensif quand l'agroécologie n'est plus finançable
    const method =
      state.resources.kess >= seedCost(state, choice, preferred) ? preferred : ('intensive' as const);
    const stock = state.farm.seedStock[choice] ?? 0;
    if (stock > 0 || state.resources.kess >= seedCost(state, choice, method)) {
      act({ type: 'Plant', plotId: plot.id, plant: choice, method }, now);
    }
  }
  // sortir de jachère une fois la parcelle assainie
  for (const plot of state.farm.plots) {
    if (plot.state.kind === 'fallow' && plot.envDebt <= 0.05) {
      act({ type: 'SetFallow', plotId: plot.id, on: false }, now);
    }
  }

  // 4. recherche
  for (const tech of RESEARCH_ORDER[strategy]) {
    if (state.lab.researched.includes(tech)) continue;
    const node = TECH_TREE.find((t) => t.id === tech)!;
    if (!node.requires.every((r) => state.lab.researched.includes(r))) break;
    if (state.resources.energy >= researchCost(state, tech)) act({ type: 'Research', tech }, now);
    break;
  }

  // 5. construction (la voie légale n'a pas d'usage d'un synthétiseur)
  const buildable = strategy === 'legal' ? (['still'] as const) : (['still', 'synthesizer'] as const);
  for (const machine of buildable) {
    if (machineOf(state, machine)) continue;
    if (state.resources.kess >= BALANCE.machines[machine].build + RESERVE) {
      act({ type: 'BuildMachine', machine }, now);
    }
  }

  // 6. clés de corruption
  if (strategy !== 'legal' && state.lab.researched.includes('adv_synthesis')) {
    const key = nextKey(state);
    const limit = strategy === 'mixed' ? 1 : 3;
    if (key && key.key <= limit && state.resources.kess >= key.price * 2 + RESERVE) {
      act({ type: 'BuyKey', key: key.key }, now);
    }
  }

  // 7. affectation des recettes + lancement
  for (const machine of state.lab.machines) {
    const wanted = bestRecipe(machine.templateId, strategy);
    if (wanted && machine.assignedRecipe !== wanted && !machine.run) {
      act({ type: 'AssignRecipe', machine: machine.templateId, recipe: wanted }, now);
    }
    if (!machine.run) act({ type: 'StartCycle', machine: machine.templateId }, now);
  }

  // 8. nettoyage de l'atelier
  if (state.lab.pollution >= 0.15 && state.resources.energy >= 40) act({ type: 'CleanLab' }, now);

  // 9. améliorations, parcelles, dette
  if (state.lab.researched.includes('catalysis')) {
    for (const machine of state.lab.machines) {
      if (machine.mk === 1 && state.resources.kess >= BALANCE.machines[machine.templateId].upgrade + RESERVE) {
        act({ type: 'UpgradeMachine', machine: machine.templateId }, now);
      }
    }
  }
  const plotCost = nextPlotCost(state);
  if (plotCost !== null && state.resources.kess >= plotCost + 400 + RESERVE) act({ type: 'BuyPlot' }, now);

  if (state.corruption.openingDebt > 0 && state.resources.kess >= state.corruption.openingDebt + 300 + RESERVE) {
    act({ type: 'RepayDebt', amount: state.corruption.openingDebt }, now);
  }

  if (state.alignment.subsidyActive === false) act({ type: 'AcceptSubsidy' }, now);
}


// ------------------------------------------------------- boucle de simulation

export interface DayRow {
  day: number;
  energy: number;
  kess: number;
  kessTotal: number;
  machines: number;
  mk2: number;
  research: number;
  plots: number;
  debt: number;
  tax: number;
  alignment: number;
  band: string;
  letters: number;
}

export interface SimResult {
  state: GameState;
  rows: DayRow[];
  firstMk2: number | null;
  /** Revenu quotidien moyen sur les 3 derniers jours. */
  revenuePerDay: number;
}

export function runSimulation(days: number, seed: number, strategy: Strategy): SimResult {
  state = createGame(START, seed);

  // six todos quotidiennes de difficulté « normale » → 24 EN/jour visés
  for (let i = 0; i < 6; i++) {
    state = applyAction(
      state,
      {
        type: 'AddTodo',
        draft: {
          title: `tâche quotidienne ${i + 1}`,
          category: i % 2 ? 'pro' : 'perso',
          difficulty: 3,
          kind: 'recurring',
          frequency: 'daily',
          mode: 'fixed',
        },
      },
      START,
      makeRng(state),
    ).state;
  }

  const rows: DayRow[] = [];
  const kessByDay: number[] = [];
  let firstMk2: number | null = null;
  let lastDay = dayKey(START);

  const totalSteps = Math.round((days * DAY) / STEP);
  for (let i = 1; i <= totalSteps; i++) {
    const now = START + i * STEP;
    state = advanceTime(state, state.meta.lastTickAt, now, makeRng(state), { catchUp: false }).state;

    const d = new Date(now);
    const hour = d.getHours();

    if (hour === 9 && d.getMinutes() === 0) {
      for (const todo of state.todos) {
        if (todo.kind === 'recurring') act({ type: 'CompleteTodo', id: todo.id }, now);
      }
    }
    if (SESSION_HOURS.includes(hour) && d.getMinutes() === 0) playTurn(now, strategy);

    if (firstMk2 === null && state.lab.machines.some((m) => m.mk === 2)) {
      firstMk2 = Math.floor((now - START) / DAY) + 1;
    }

    const today = dayKey(now);
    if (today !== lastDay) {
      lastDay = today;
      kessByDay.push(state.stats.kessEarnedTotal);
      rows.push({
        day: rows.length + 1,
        energy: state.resources.energy,
        kess: state.resources.kess,
        kessTotal: state.stats.kessEarnedTotal,
        machines: state.lab.machines.length,
        mk2: state.lab.machines.filter((m) => m.mk === 2).length,
        research: state.lab.researched.length,
        plots: state.farm.plots.length,
        debt: state.corruption.openingDebt,
        tax: state.corruption.taxRate,
        alignment: state.alignment.score,
        band: currentBand(state),
        letters: state.narrative.letters.length,
      });
    }
  }

  const tail = kessByDay.slice(-4);
  const revenuePerDay = tail.length >= 2 ? (tail[tail.length - 1] - tail[0]) / (tail.length - 1) : 0;
  return { state, rows, firstMk2, revenuePerDay };
}
