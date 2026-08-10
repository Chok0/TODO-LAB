/** Scénarios obligatoires du farming (docs/05 §8). */

import { describe, expect, it } from 'vitest';
import { advance, doAct, give, HOUR, newGame, withFarm } from './helpers';
import { computeYield } from '../src/game-logic/farming';
import {
  isFarmUnlocked,
  isPlantUnlocked,
  isSupplyOpen,
  seedCost,
  supplyPrice,
  supplyRemaining,
} from '../src/game-logic/selectors';
import type { GameState } from '../src/data/schema';

const plot = (s: GameState, i = 0) => s.farm.plots[i];

function farmGame(): GameState {
  return withFarm(give(newGame(), { kess: 700 }));
}

describe('1 — plantation médicinale intensive', () => {
  it('mûrit en 3 h, rend 5 unités et alourdit la dette de 2 %', () => {
    let s = farmGame();
    s = doAct(s, { type: 'Plant', plotId: 'plot-1', plant: 'medicinal', method: 'intensive' });

    const growing = plot(s).state;
    expect(growing.kind).toBe('growing');
    if (growing.kind === 'growing') {
      expect(growing.endsAt - growing.startedAt).toBe(3 * HOUR);
    }

    s = advance(s, 3 * HOUR);
    const ready = plot(s).state;
    expect(ready.kind).toBe('ready');
    if (ready.kind === 'ready') expect(ready.yield).toBe(5); // round(3 × 1,5 × 1)

    s = doAct(s, { type: 'Harvest', plotId: 'plot-1' });
    expect(s.resources.harvest_med).toBe(5);
    expect(plot(s).envDebt).toBeCloseTo(0.02, 5);
    expect(plot(s).state.kind).toBe('empty');
  });
});

describe('2 — rendement sous dette', () => {
  it('dette 30 % → rendement amputé, et la dette continue de monter', () => {
    expect(computeYield('medicinal', 'intensive', 0.3)).toBe(3); // round(3 × 1,5 × 0,7) = 3

    let s = farmGame();
    s.farm.plots[0].envDebt = 0.3;
    s = doAct(s, { type: 'Plant', plotId: 'plot-1', plant: 'medicinal', method: 'intensive' });
    s = advance(s, 3 * HOUR);
    s = doAct(s, { type: 'Harvest', plotId: 'plot-1' });
    expect(s.resources.harvest_med).toBe(3);
    expect(plot(s).envDebt).toBeCloseTo(0.32, 5);
  });
});

describe('3 — agroécologie', () => {
  it('coûte 1,2× la graine, dure 20 % plus longtemps et régénère la parcelle', () => {
    let s = farmGame();
    s.farm.seedStock = {}; // stock offert épuisé
    s.farm.plots[0].envDebt = 0.1;
    expect(seedCost(s, 'medicinal', 'agro')).toBe(6); // ceil(5 × 1,2)

    const before = s.resources.kess;
    s = doAct(s, { type: 'Plant', plotId: 'plot-1', plant: 'medicinal', method: 'agro' });
    expect(s.resources.kess).toBe(before - 6);

    const growing = plot(s).state;
    if (growing.kind === 'growing') expect(growing.endsAt - growing.startedAt).toBe(3.6 * HOUR);

    s = advance(s, 3.6 * HOUR);
    s = doAct(s, { type: 'Harvest', plotId: 'plot-1' });
    expect(plot(s).envDebt).toBeCloseTo(0.09, 5);
  });
});

describe('4 — jachère', () => {
  it('régénère 2 %/heure et reste remise en culture à tout moment', () => {
    let s = farmGame();
    s.farm.plots[0].envDebt = 0.12;
    s = doAct(s, { type: 'SetFallow', plotId: 'plot-1', on: true });
    expect(plot(s).state.kind).toBe('fallow');

    s = advance(s, 5 * HOUR);
    expect(plot(s).envDebt).toBeCloseTo(0.02, 5);

    s = doAct(s, { type: 'SetFallow', plotId: 'plot-1', on: false });
    expect(plot(s).state.kind).toBe('empty');
  });
});

describe('5 — croissance hors ligne', () => {
  it("n'est jamais plafonnée par l'absence", () => {
    let s = farmGame();
    s = doAct(s, { type: 'Plant', plotId: 'plot-1', plant: 'medicinal', method: 'agro' });
    s = advance(s, 12 * HOUR); // bien au-delà des 3,6 h de croissance
    expect(plot(s).state.kind).toBe('ready');
  });
});

describe('6 — graine toxique verrouillée', () => {
  it('est refusée par le moteur sans clé de corruption, pas seulement par l\'UI', () => {
    let s = farmGame();
    expect(isPlantUnlocked(s, 'toxic')).toBe(false);

    const before = s.resources.kess;
    s = doAct(s, { type: 'Plant', plotId: 'plot-1', plant: 'toxic', method: 'intensive' });
    expect(plot(s).state.kind).toBe('empty');
    expect(s.resources.kess).toBe(before);

    // avec la clé 1, la plantation devient possible
    s.corruption.keys.push(1);
    expect(isPlantUnlocked(s, 'toxic')).toBe(true);
    s = doAct(s, { type: 'Plant', plotId: 'plot-1', plant: 'toxic', method: 'intensive' });
    expect(plot(s).state.kind).toBe('growing');
  });
});

describe('parcelles', () => {
  it('démarre à 2 parcelles et suit la table de prix, plafonnée à 5', () => {
    let s = withFarm(give(newGame(), { kess: 5000 }));
    expect(s.farm.plots).toHaveLength(2);

    s = doAct(s, { type: 'BuyPlot' });
    expect(s.farm.plots).toHaveLength(3);
    expect(s.resources.kess).toBe(4600);

    s = doAct(s, { type: 'BuyPlot' });
    s = doAct(s, { type: 'BuyPlot' });
    expect(s.farm.plots).toHaveLength(5);
    expect(s.resources.kess).toBe(1900); // 5000 − 400 − 900 − 1800

    s = doAct(s, { type: 'BuyPlot' });
    expect(s.farm.plots).toHaveLength(5); // plafond V1
  });

  it('consomme d\'abord les 3 graines médicinales offertes', () => {
    let s = farmGame();
    const before = s.resources.kess;
    s = doAct(s, { type: 'Plant', plotId: 'plot-1', plant: 'medicinal', method: 'intensive' });
    expect(s.resources.kess).toBe(before);
    expect(s.farm.seedStock.medicinal).toBe(2);
  });
});

describe('7 — la friche est verrouillée au départ', () => {
  it("n'a aucune parcelle et refuse toute plantation avant la remise en culture", () => {
    let s = give(newGame(), { kess: 5000 });
    expect(isFarmUnlocked(s)).toBe(false);
    expect(s.farm.plots).toHaveLength(0);

    // même en fabriquant une parcelle de toutes pièces, le moteur refuse
    s.farm.plots.push({ id: 'plot-1', envDebt: 0, state: { kind: 'empty' } });
    const before = s.resources.kess;
    s = doAct(s, { type: 'Plant', plotId: 'plot-1', plant: 'medicinal', method: 'intensive' });
    expect(plot(s).state.kind).toBe('empty');
    expect(s.resources.kess).toBe(before);
  });

  it('la recherche livre les parcelles et les premières graines', () => {
    let s = give(newGame(), { kess: 5000 });
    s = doAct(s, { type: 'Research', tech: 'extractor_bp' });
    s = doAct(s, { type: 'Research', tech: 'farm_bp' });

    expect(isFarmUnlocked(s)).toBe(true);
    expect(s.farm.plots).toHaveLength(2);
    expect(s.farm.seedStock.medicinal).toBe(3);

    s = doAct(s, { type: 'Plant', plotId: 'plot-1', plant: 'medicinal', method: 'agro' });
    expect(plot(s).state.kind).toBe('growing');
  });
});

/** L'étal n'ouvre qu'aux ateliers équipés : on monte donc l'extracteur d'abord. */
function supplyGame(kess = 1000): GameState {
  return doAct(give(newGame(), { kess }), { type: 'Research', tech: 'extractor_bp' });
}

describe('8 — le Fournisseur', () => {
  it("reste fermé tant qu'aucune machine ne peut traiter la matière", () => {
    let s = give(newGame(), { kess: 1000 });
    expect(isSupplyOpen(s)).toBe(false);

    s = doAct(s, { type: 'BuySupply', plant: 'medicinal', amount: 4 });
    expect(s.resources.harvest_med).toBe(0);
    expect(s.resources.kess).toBe(1000);

    s = doAct(s, { type: 'Research', tech: 'extractor_bp' });
    expect(isSupplyOpen(s)).toBe(true);
  });

  it('vend des intrants contre des ₭, dans la limite du quota du jour', () => {
    let s = supplyGame();
    const unit = supplyPrice('medicinal');
    const quota = supplyRemaining(s);
    const purse = s.resources.kess;

    s = doAct(s, { type: 'BuySupply', plant: 'medicinal', amount: 4 });
    expect(s.resources.harvest_med).toBe(4);
    expect(s.resources.kess).toBe(purse - 4 * unit);
    expect(supplyRemaining(s)).toBe(quota - 4);

    // au-delà du quota, l'achat est tronqué, jamais silencieusement dépassé
    s = doAct(s, { type: 'BuySupply', plant: 'medicinal', amount: 999 });
    expect(s.resources.harvest_med).toBe(quota);
    expect(supplyRemaining(s)).toBe(0);

    s = doAct(s, { type: 'BuySupply', plant: 'medicinal', amount: 1 });
    expect(s.resources.harvest_med).toBe(quota); // rien de plus aujourd'hui
  });

  it('rend le quota à minuit', () => {
    let s = supplyGame();
    s = doAct(s, { type: 'BuySupply', plant: 'medicinal', amount: 5 });
    expect(s.supply.boughtToday).toBe(5);

    s = advance(s, 20 * HOUR); // franchit minuit
    expect(s.supply.boughtToday).toBe(0);
  });

  it("ne vend que ce qu'on saurait cultiver — la toxique reste sous clé", () => {
    let s = supplyGame(5000);
    const purse = s.resources.kess;
    s = doAct(s, { type: 'BuySupply', plant: 'toxic', amount: 2 });
    expect(s.resources.harvest_tox).toBe(0);
    expect(s.resources.kess).toBe(purse);
  });

  it('coûte toujours plus cher que de cultiver la même unité', () => {
    for (const id of ['medicinal', 'industrial', 'recreational', 'toxic'] as const) {
      const grown = seedCost(give(newGame(), {}), id, 'intensive') / 3;
      expect(supplyPrice(id)).toBeGreaterThan(grown);
    }
  });
});
