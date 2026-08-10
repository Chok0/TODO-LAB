/** Scénarios obligatoires du labo (docs/04 §7). */

import { describe, expect, it } from 'vitest';
import { advance, advanceCollect, doAct, effectsOf, give, HOUR, MIN, newGame, SEC } from './helpers';
import { effectiveSalePrice } from '../src/game-logic/selectors';
import { getRecipe } from '../src/game-logic/data/recipes.data';
import type { GameState } from '../src/data/schema';

function labGame(): GameState {
  let s = give(newGame(), { kess: 20000 });
  s = doAct(s, { type: 'Research', tech: 'extractor_bp' });
  return s;
}

function fullLab(): GameState {
  let s = labGame();
  s = doAct(s, { type: 'Research', tech: 'still_bp' });
  s = doAct(s, { type: 'BuildMachine', machine: 'still' });
  s = doAct(s, { type: 'Research', tech: 'adv_synthesis' });
  s = doAct(s, { type: 'BuildMachine', machine: 'synthesizer' });
  s = doAct(s, { type: 'Research', tech: 'catalysis' });
  return s;
}

const machine = (s: GameState, id: string) => s.lab.machines.find((m) => m.templateId === id)!;

describe('1 — cycle d\'extraction', () => {
  it('consomme la récolte au lancement et crédite le PA à la fin, sans vente', () => {
    let s = give(labGame(), { harvest_med: 1 });
    s = doAct(s, { type: 'StartCycle', machine: 'extractor' });

    expect(s.resources.harvest_med).toBe(0); // réservé au lancement
    expect(s.resources.pa_med).toBe(0);
    expect(machine(s, 'extractor').run).not.toBeNull();

    const { state, effects } = advanceCollect(s, 60 * SEC);
    expect(state.resources.pa_med).toBe(1);
    expect(effectsOf(effects, 'sale')).toHaveLength(0);
    expect(machine(state, 'extractor').run).toBeNull();
  });
});

describe('2 — vente du tonique, modificateurs cumulés', () => {
  it('applique catalyse, pollution, taxe et bande au prix de base', () => {
    const base = getRecipe('tonic');

    // bande neutre : commission du Courtier de 15 %
    const s0 = labGame();
    expect(effectiveSalePrice(s0, base)).toBeCloseTo(16 * 0.85, 5);

    // + catalyse (+10 %)
    const s1 = structuredClone(s0);
    s1.lab.researched.push('catalysis');
    expect(effectiveSalePrice(s1, base)).toBeCloseTo(16 * 1.1 * 0.85, 5);

    // + pollution 10 % + taxe 3 %
    const s2 = structuredClone(s1);
    s2.lab.pollution = 0.1;
    s2.corruption.taxRate = 0.03;
    // le prix effectif est arrondi au centime
    expect(effectiveSalePrice(s2, base)).toBeCloseTo(16 * 1.1 * 0.9 * 0.97 * 0.85, 2);

    // bande Coopérative : +25 % sur le légal, plus de commission du Courtier
    const s3 = structuredClone(s0);
    s3.alignment.score = 40;
    expect(effectiveSalePrice(s3, base)).toBeCloseTo(16 * 1.25, 5);
  });

  it('crédite réellement la trésorerie à la fin du cycle', () => {
    let s = give(labGame(), { pa_med: 2 });
    s = doAct(s, { type: 'AssignRecipe', machine: 'extractor', recipe: 'tonic' });
    s = doAct(s, { type: 'StartCycle', machine: 'extractor' });
    const before = s.resources.kess;

    const { state, effects } = advanceCollect(s, 60 * SEC);
    const sales = effectsOf(effects, 'sale');
    expect(sales).toHaveLength(1);
    expect(state.resources.kess).toBeCloseTo(before + 16 * 0.85, 5);
  });
});

describe('3 — convoyeur', () => {
  it('enchaîne les cycles, se bloque à sec, repart à l\'arrivée d\'intrants', () => {
    let s = labGame();
    s = doAct(s, { type: 'Research', tech: 'conveyor' });
    s = give(s, { harvest_med: 5 });
    s = doAct(s, { type: 'StartCycle', machine: 'extractor' });

    s = advance(s, 5 * 60 * SEC);
    expect(s.resources.pa_med).toBe(5);
    expect(machine(s, 'extractor').run).toBeNull(); // à sec

    // arrivée de nouveaux intrants → le convoyeur repart
    s = give(s, { harvest_med: 2 });
    s = doAct(s, { type: 'StartCycle', machine: 'extractor' });
    expect(machine(s, 'extractor').run).not.toBeNull();
    s = advance(s, 2 * 60 * SEC);
    expect(s.resources.pa_med).toBe(7);
  });
});

describe('4 — absence de 20 h avec convoyeur', () => {
  it('plafonne le rattrapage de production à 12 h', () => {
    let s = labGame();
    s = doAct(s, { type: 'Research', tech: 'conveyor' });
    s = give(s, { harvest_med: 5000 });
    s = doAct(s, { type: 'StartCycle', machine: 'extractor' });

    s = advance(s, 20 * HOUR);

    // 12 h de rattrapage à 60 s/cycle = 720 cycles, plus le cycle en vol
    expect(s.resources.pa_med).toBeGreaterThanOrEqual(720);
    expect(s.resources.pa_med).toBeLessThanOrEqual(722);
    // sans plafond on aurait dépassé 1 190 cycles
    expect(s.resources.pa_med).toBeLessThan(1000);
  });
});

describe('5 — moyens dégradants', () => {
  it('accumule 5 % de pollution sur 10 cycles et le nettoyage la fait retomber', () => {
    let s = labGame();
    s = doAct(s, { type: 'Research', tech: 'conveyor' });
    s = doAct(s, { type: 'SetMeans', machine: 'extractor', means: 'dirty' });
    s = give(s, { harvest_med: 10 });
    s = doAct(s, { type: 'StartCycle', machine: 'extractor' });

    s = advance(s, 10 * 45 * SEC); // cycles raccourcis de 25 %
    expect(s.resources.pa_med).toBe(10);
    expect(s.lab.pollution).toBeCloseTo(0.05, 5);

    s = doAct(s, { type: 'CleanLab' });
    expect(s.lab.pollution).toBeCloseTo(0, 5);
  });
});

describe('6 — amélioration Mk2', () => {
  it('réduit la durée de cycle de 15 % sans affecter le cycle en cours', () => {
    let s = fullLab();
    s = give(s, { harvest_med: 10, kess: 20000 });
    s = doAct(s, { type: 'StartCycle', machine: 'extractor' });
    const runBefore = machine(s, 'extractor').run!;
    const durationBefore = runBefore.endsAt - runBefore.startedAt;
    expect(durationBefore).toBe(60 * SEC);

    s = doAct(s, { type: 'UpgradeMachine', machine: 'extractor' });
    expect(machine(s, 'extractor').mk).toBe(2);
    // le cycle en cours conserve sa durée
    expect(machine(s, 'extractor').run!.endsAt).toBe(runBefore.endsAt);

    s = advance(s, 60 * SEC);
    s = doAct(s, { type: 'StartCycle', machine: 'extractor' });
    const runAfter = machine(s, 'extractor').run!;
    expect(runAfter.endsAt - runAfter.startedAt).toBe(51 * SEC); // 60 × 0,85
  });
});

describe('7 — changement de recette en cours de cycle', () => {
  it('rend les intrants et ne crédite aucun produit', () => {
    let s = give(labGame(), { harvest_med: 1, pa_med: 0 });
    s = doAct(s, { type: 'StartCycle', machine: 'extractor' });
    expect(s.resources.harvest_med).toBe(0);

    s = doAct(s, { type: 'AssignRecipe', machine: 'extractor', recipe: 'extract_ind' });
    expect(s.resources.harvest_med).toBe(1); // intrants rendus
    expect(s.resources.pa_med).toBe(0); // aucun produit

    s = advance(s, 5 * MIN);
    expect(s.resources.pa_med).toBe(0);
  });
});

describe('R&D', () => {
  it('offre la construction de l\'extracteur (matériel de l\'oncle)', () => {
    const s = labGame();
    expect(machine(s, 'extractor')).toBeDefined();
    expect(s.resources.kess).toBe(20000 - 20); // seule la recherche est payée
  });

  it('respecte les prérequis de l\'arbre', () => {
    let s = give(newGame(), { kess: 20000 });
    s = doAct(s, { type: 'Research', tech: 'catalysis' });
    expect(s.lab.researched).not.toContain('catalysis');
    expect(s.resources.kess).toBe(20000);
  });
});
