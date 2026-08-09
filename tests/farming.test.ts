/** Scénarios obligatoires du farming (docs/05 §8). */

import { describe, expect, it } from 'vitest';
import { advance, doAct, give, HOUR, MIN, newGame } from './helpers';
import { computeYield } from '../src/game-logic/farming';
import { isPlantUnlocked, seedCost } from '../src/game-logic/selectors';
import type { GameState } from '../src/data/schema';

const plot = (s: GameState, i = 0) => s.farm.plots[i];

function farmGame(): GameState {
  return give(newGame(), { energy: 200, kess: 500 });
}

describe('1 — plantation médicinale intensive', () => {
  it('mûrit en 20 min, rend 3 unités et alourdit la dette de 2 %', () => {
    let s = farmGame();
    s = doAct(s, { type: 'Plant', plotId: 'plot-1', plant: 'medicinal', method: 'intensive' });

    const growing = plot(s).state;
    expect(growing.kind).toBe('growing');
    if (growing.kind === 'growing') {
      expect(growing.endsAt - growing.startedAt).toBe(20 * MIN);
    }

    s = advance(s, 20 * MIN);
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
    s = advance(s, 20 * MIN);
    s = doAct(s, { type: 'Harvest', plotId: 'plot-1' });
    expect(s.resources.harvest_med).toBe(3);
    expect(plot(s).envDebt).toBeCloseTo(0.32, 5);
  });
});

describe('3 — agroécologie', () => {
  it('coûte 1,5× la graine, dure 20 % plus longtemps et régénère la parcelle', () => {
    let s = farmGame();
    s.farm.seedStock = {}; // stock offert épuisé
    s.farm.plots[0].envDebt = 0.1;
    expect(seedCost(s, 'medicinal', 'agro')).toBe(6); // ceil(5 × 1,2)

    const before = s.resources.kess;
    s = doAct(s, { type: 'Plant', plotId: 'plot-1', plant: 'medicinal', method: 'agro' });
    expect(s.resources.kess).toBe(before - 6);

    const growing = plot(s).state;
    if (growing.kind === 'growing') expect(growing.endsAt - growing.startedAt).toBe(24 * MIN);

    s = advance(s, 24 * MIN);
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
    s = advance(s, 8 * HOUR); // bien au-delà des 24 min de croissance
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
    let s = give(newGame(), { kess: 5000 });
    expect(s.farm.plots).toHaveLength(2);

    s = doAct(s, { type: 'BuyPlot' });
    expect(s.farm.plots).toHaveLength(3);
    expect(s.resources.kess).toBe(4900);

    s = doAct(s, { type: 'BuyPlot' });
    s = doAct(s, { type: 'BuyPlot' });
    expect(s.farm.plots).toHaveLength(5);
    expect(s.resources.kess).toBe(4050); // 5000 − 100 − 250 − 600

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
