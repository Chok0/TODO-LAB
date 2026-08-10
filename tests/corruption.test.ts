/** Scénarios obligatoires corruption / alignement / texture (docs/06 §7). */

import { describe, expect, it } from 'vitest';
import { advance, advanceCollect, DAY, doAct, effectsOf, give, HOUR, newGame, SEC } from './helpers';
import { getRecipe } from '../src/game-logic/data/recipes.data';
import { computeTexture } from '../src/game-logic/texture';
import { currentBand, effectiveSalePrice } from '../src/game-logic/selectors';
import type { GameState } from '../src/data/schema';

/** Labo complet, branche illégale ouverte, convoyeur actif. */
function zoneGame(keys: (1 | 2 | 3)[] = [1]): GameState {
  let s = give(newGame(), { kess: 40000 });
  s = doAct(s, { type: 'Research', tech: 'extractor_bp' });
  s = doAct(s, { type: 'Research', tech: 'still_bp' });
  s = doAct(s, { type: 'BuildMachine', machine: 'still' });
  s = doAct(s, { type: 'Research', tech: 'adv_synthesis' });
  s = doAct(s, { type: 'BuildMachine', machine: 'synthesizer' });
  s = doAct(s, { type: 'Research', tech: 'conveyor' });
  for (const k of keys) s = doAct(s, { type: 'BuyKey', key: k });
  s = doAct(s, { type: 'AssignRecipe', machine: 'synthesizer', recipe: 'raw_extract' });
  return s;
}

describe('1 — clés et taxe permanente', () => {
  it('cumule les taxes et les applique aux ventes légales comme illégales', () => {
    let s = give(newGame(), { kess: 40000 });
    s = doAct(s, { type: 'Research', tech: 'extractor_bp' });
    s = doAct(s, { type: 'Research', tech: 'still_bp' });
    s = doAct(s, { type: 'Research', tech: 'adv_synthesis' });
    s = doAct(s, { type: 'BuyKey', key: 1 });
    s = doAct(s, { type: 'BuyKey', key: 2 });

    expect(s.corruption.keys).toEqual([1, 2]);
    expect(s.corruption.taxRate).toBeCloseTo(0.25, 5); // 10 % + 15 %

    const noTax = structuredClone(s);
    noTax.corruption.taxRate = 0;
    // la taxe pèse sur les deux branches
    expect(effectiveSalePrice(s, getRecipe('tonic'))).toBeLessThan(effectiveSalePrice(noTax, getRecipe('tonic')));
    expect(effectiveSalePrice(s, getRecipe('raw_extract'))).toBeLessThan(
      effectiveSalePrice(noTax, getRecipe('raw_extract')),
    );
  });

  it('impose l\'ordre d\'achat des clés', () => {
    let s = give(newGame(), { kess: 5000 });
    s = doAct(s, { type: 'BuyKey', key: 2 });
    expect(s.corruption.keys).toHaveLength(0);
    expect(s.resources.kess).toBe(5000);
  });
});

describe('2 — tirage d\'événements sur cycles illégaux', () => {
  /** Fait tourner des cycles illégaux jusqu'au déclenchement d'un événement. */
  function runUntilEvent(start: GameState, maxCycles = 400) {
    let s = start;
    for (let i = 1; i <= maxCycles; i++) {
      s = advance(s, 120 * SEC, { catchUp: false });
      if (s.corruption.pendingEvent) return { state: s, cycles: i };
    }
    return { state: s, cycles: -1 };
  }

  it('déclenche un événement, respecte le cooldown et ne répète pas le déclencheur', () => {
    let s = give(zoneGame(), { pa_rec: 4000 });
    s = doAct(s, { type: 'StartCycle', machine: 'synthesizer' });

    const first = runUntilEvent(s);
    expect(first.cycles).toBeGreaterThan(3); // cooldown de 3 cycles respecté
    const firstTrigger = first.state.corruption.pendingEvent!.triggerId;

    // résolution en argent, puis on repart
    let s2 = doAct(first.state, { type: 'ResolveEvent', mode: 'kess' });
    expect(s2.corruption.pendingEvent).toBeNull();
    s2 = doAct(s2, { type: 'StartCycle', machine: 'synthesizer' });

    const second = runUntilEvent(s2);
    expect(second.cycles).toBeGreaterThan(3);
    expect(second.state.corruption.pendingEvent!.triggerId).not.toBe(firstTrigger);
  });

  it('est déterministe à seed égale', () => {
    const build = () => {
      let s = give(zoneGame(), { pa_rec: 4000 });
      return doAct(s, { type: 'StartCycle', machine: 'synthesizer' });
    };
    const a = runUntilEvent(build());
    const b = runUntilEvent(build());
    expect(a.cycles).toBe(b.cycles);
    expect(a.state.corruption.pendingEvent!.triggerId).toBe(b.state.corruption.pendingEvent!.triggerId);
    expect(a.state.corruption.pendingEvent!.body).toBe(b.state.corruption.pendingEvent!.body);
  });

  it('ne tire jamais d\'événement hors ligne', () => {
    let s = give(zoneGame(), { pa_rec: 4000 });
    s = doAct(s, { type: 'StartCycle', machine: 'synthesizer' });
    s = advance(s, 11 * HOUR); // rattrapage : catchUp déduit du delta
    expect(s.corruption.pendingEvent).toBeNull();
    expect(s.corruption.illegalCyclesSinceEvent).toBeGreaterThan(50);
  });

  it('bloque les nouveaux cycles illégaux tant que l\'incident n\'est pas réglé', () => {
    let s = give(zoneGame(), { pa_rec: 100 });
    const evtState = structuredClone(s);
    evtState.corruption.pendingEvent = {
      id: 'evt-test',
      kind: 'sanction',
      triggerId: 'customs_seizure',
      pnj: 'coles',
      gravity: 2,
      title: 'Test',
      body: 'Test',
      createdAt: evtState.meta.lastTickAt,
      options: [{ pay: 'kess', cost: 60, label: 'Payer' }],
      contractRecipe: 'raw_extract',
      contractHours: 12,
      recallsFavorId: null,
    };
    const blocked = doAct(evtState, { type: 'StartCycle', machine: 'synthesizer' });
    expect(blocked.lab.machines.find((m) => m.templateId === 'synthesizer')!.run).toBeNull();
  });
});

describe('3 — résolution « service » et contrat honoré', () => {
  it('retient les produits, solde la faveur et crédite la réputation', () => {
    let s = give(zoneGame(), { pa_rec: 4000 });
    s.corruption.pendingEvent = {
      id: 'evt-service',
      kind: 'sanction',
      triggerId: 'customs_seizure',
      pnj: 'coles',
      gravity: 2,
      title: 'La douane a saisi un convoi',
      body: '…',
      createdAt: s.meta.lastTickAt,
      options: [
        { pay: 'kess', cost: 60, label: 'Payer' },
        { pay: 'reputation', cost: 20, label: 'Réputation' },
        { pay: 'service', cost: 4, label: 'Service' },
      ],
      contractRecipe: 'raw_extract',
      contractHours: 12,
      recallsFavorId: null,
    };

    s = doAct(s, { type: 'ResolveEvent', mode: 'service' });
    expect(s.corruption.activeContract).toMatchObject({ recipe: 'raw_extract', remaining: 4, total: 4 });
    expect(s.corruption.favors.filter((f) => !f.repaid)).toHaveLength(1);

    const repBefore = s.alignment.reputation.zone;
    const kessBefore = s.resources.kess;

    s = doAct(s, { type: 'StartCycle', machine: 'synthesizer' });
    const { state, effects } = advanceCollect(s, 4 * 120 * SEC, { catchUp: false });

    // les 4 unités partent au contrat, aucune n'est vendue
    expect(effectsOf(effects, 'contract_delivery').length).toBe(4);
    expect(effectsOf(effects, 'sale')).toHaveLength(0);
    expect(state.resources.kess).toBe(kessBefore);
    expect(effectsOf(effects, 'contract_done')).toHaveLength(1);
    expect(state.corruption.activeContract).toBeNull();
    expect(state.alignment.reputation.zone).toBe(repBefore + 5);
    expect(state.corruption.favors.every((f) => f.repaid)).toBe(true);
  });
});

describe('4 — contrat échoué', () => {
  it('saisit le stock et les productions en cours, et coûte 15 de réputation', () => {
    // aucun pa_rec : le contrat en Extrait brut ne peut pas être honoré.
    // Le distillateur tourne en parallèle pour qu'une production soit en cours
    // au moment de l'échéance, et du pa_tox dort en stock.
    let s = give(zoneGame(), { pa_rec: 0, pa_med: 30, pa_ind: 10, pa_tox: 3 });
    s.corruption.activeContract = {
      recipe: 'raw_extract',
      remaining: 3,
      total: 3,
      deadline: s.meta.lastTickAt + 2 * HOUR,
      pnj: 'coles',
      favorId: null,
    };
    const repBefore = s.alignment.reputation.zone;
    s = doAct(s, { type: 'StartCycle', machine: 'still' });

    const { state, effects } = advanceCollect(s, 3 * HOUR);

    expect(effectsOf(effects, 'contract_failed')).toHaveLength(1);
    expect(effectsOf(effects, 'seizure')).toHaveLength(1);
    expect(state.alignment.reputation.zone).toBe(repBefore - 15);
    expect(state.resources.pa_tox).toBe(0); // stock saisi
    expect(state.resources.pa_med).toBe(0);
    expect(state.lab.machines.every((m) => m.run === null)).toBe(true); // productions en cours saisies
    expect(state.corruption.activeContract).toBeNull();
  });
});

describe('5 — texture Fin × Moyens', () => {
  it('classe la matrice documentée', () => {
    expect(computeTexture('beneficial', 'clean')).toBe('aligned');
    expect(computeTexture('beneficial', 'dirty')).toBe('cynical');
    expect(computeTexture('neutral', 'clean')).toBe('neutral');
    expect(computeTexture('neutral', 'dirty')).toBe('careless');
    expect(computeTexture('harmful', 'clean')).toBe('vice_artisan');
    expect(computeTexture('harmful', 'dirty')).toBe('zone_pure');
  });

  it('cas « cynique » chiffré : remède bénéfique produit salement, prix inchangé', () => {
    let s = give(zoneGame(), { pa_med: 3, pa_ind: 1 });
    s = doAct(s, { type: 'AssignRecipe', machine: 'still', recipe: 'remedy_std' });
    s = doAct(s, { type: 'SetMeans', machine: 'still', means: 'dirty' });

    const expectedPrice = effectiveSalePrice(s, getRecipe('remedy_std'));
    const kessBefore = s.resources.kess;

    s = doAct(s, { type: 'StartCycle', machine: 'still' });
    const { state, effects } = advanceCollect(s, 90 * SEC, { catchUp: false });

    const textures = effectsOf(effects, 'texture');
    expect(textures).toHaveLength(1);
    expect(textures[0].texture).toBe('cynical');
    expect(state.stats.textureCounts.cynical).toBe(1);
    // la texture n'a aucun effet économique
    expect(state.resources.kess).toBeCloseTo(kessBefore + expectedPrice, 5);
  });
});

describe('6 — bandes d\'alignement', () => {
  it('+32 → Coopérative ; decay 2 jours → +31 ; deux ventes nocives → neutre', () => {
    // aucun intrant au départ : rien ne produit pendant la phase de decay
    let s = zoneGame([1, 2]);
    s.alignment.score = 32;
    expect(currentBand(s)).toBe('coop');

    s = advance(s, 2 * DAY);
    expect(s.alignment.score).toBeCloseTo(31, 5);
    expect(currentBand(s)).toBe('coop');

    // exactement deux ventes illégales nocives : −2 chacune
    s = give(s, { pa_rec: 6, pa_tox: 4 });
    s = doAct(s, { type: 'AssignRecipe', machine: 'synthesizer', recipe: 'active_compound' });
    s = doAct(s, { type: 'StartCycle', machine: 'synthesizer' });
    s = advance(s, 2 * 120 * SEC, { catchUp: false });
    expect(s.stats.salesIllegal).toBe(2);

    expect(s.alignment.score).toBeCloseTo(27, 5);
    expect(currentBand(s)).toBe('neutral');
    // la commission du Courtier réapparaît
    expect(effectiveSalePrice(s, getRecipe('tonic'))).toBeCloseTo(16 * 0.75 * 0.85, 2);
  });
});

describe('7 — plafond quotidien de gain d\'alignement', () => {
  it('8 ventes légales le même jour ne rapportent que +5', () => {
    let s = give(zoneGame(), { pa_med: 40 });
    s.alignment.score = 0;
    s = doAct(s, { type: 'AssignRecipe', machine: 'extractor', recipe: 'tonic' });
    s = doAct(s, { type: 'StartCycle', machine: 'extractor' });

    s = advance(s, 8 * 60 * SEC, { catchUp: false });
    expect(s.stats.salesLegal).toBe(8);
    expect(s.alignment.score).toBeCloseTo(5, 5);
  });
});

describe('dette d\'ouverture', () => {
  it('se rembourse partiellement puis se solde', () => {
    let s = give(newGame(), { kess: 600 });
    expect(s.corruption.openingDebt).toBe(500);

    s = doAct(s, { type: 'RepayDebt', amount: 200 });
    expect(s.corruption.openingDebt).toBe(300);
    expect(s.resources.kess).toBe(400);

    s = doAct(s, { type: 'RepayDebt', amount: 1000 });
    expect(s.corruption.openingDebt).toBe(0);
    expect(s.resources.kess).toBe(100); // ne débite que le solde dû
    expect(s.alignment.reputation.zone).toBe(5);
  });
});
