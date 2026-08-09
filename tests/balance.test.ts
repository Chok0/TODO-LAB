/**
 * Non-régression d'équilibrage (docs/13, critère du Goal 3).
 * Ces tests font tourner le simulateur : ils protègent les propriétés
 * structurelles de l'économie, pas des valeurs exactes.
 */

import { describe, expect, it } from 'vitest';
import { runSimulation } from '../scripts/sim-core';

const DAYS = 21;
const SEED = 42;

describe('courbe de progression', () => {
  it('la voie légale progresse sans jamais se bloquer', () => {
    const { rows, state, firstMk2 } = runSimulation(DAYS, SEED, 'legal');
    expect(rows).toHaveLength(DAYS);

    // les trois jalons de la courbe cible (docs/02 §13)
    expect(rows.findIndex((r) => r.machines >= 2)).toBeGreaterThanOrEqual(0);
    expect(firstMk2).not.toBeNull();
    expect(firstMk2!).toBeLessThanOrEqual(DAYS);
    expect(state.corruption.openingDebt).toBe(0); // la dette finit soldée

    // la trésorerie cumulée croît sur chaque tiers de la partie
    const third = Math.floor(DAYS / 3);
    expect(rows[third].kessTotal).toBeGreaterThan(rows[0].kessTotal);
    expect(rows[2 * third].kessTotal).toBeGreaterThan(rows[third].kessTotal);
    expect(rows[DAYS - 1].kessTotal).toBeGreaterThan(rows[2 * third].kessTotal);
  });

  it('ne laisse jamais une partie sans moyen de produire (anti-blocage)', () => {
    for (const strategy of ['legal', 'illegal', 'mixed'] as const) {
      const { rows } = runSimulation(14, SEED, strategy);
      // aucune fenêtre de 5 jours consécutifs sans le moindre revenu
      let stalled = 0;
      let worst = 0;
      for (let i = 1; i < rows.length; i++) {
        stalled = rows[i].kessTotal === rows[i - 1].kessTotal ? stalled + 1 : 0;
        worst = Math.max(worst, stalled);
      }
      expect(worst, `stratégie ${strategy}`).toBeLessThan(5);
    }
  });
});

describe('asymétrie légal / illégal (docs/06 §1)', () => {
  it("l'accordéon se paie : la voie rapide finit avec un revenu/jour inférieur", () => {
    const legal = runSimulation(DAYS, SEED, 'legal');
    const mixed = runSimulation(DAYS, SEED, 'mixed');

    // avance de court terme de la voie corrompue…
    const day8 = 7;
    expect(mixed.rows[day8].kessTotal).toBeGreaterThan(legal.rows[day8].kessTotal);

    // …payée en vitesse long terme
    expect(mixed.revenuePerDay).toBeLessThan(legal.revenuePerDay);
    expect(mixed.state.corruption.taxRate).toBeGreaterThan(0);
    expect(legal.state.corruption.taxRate).toBe(0);
  });

  it('la corruption totale est un piège assumé', () => {
    const legal = runSimulation(DAYS, SEED, 'legal');
    const illegal = runSimulation(DAYS, SEED, 'illegal');

    expect(illegal.state.corruption.taxRate).toBeCloseTo(0.35, 5);
    expect(illegal.revenuePerDay).toBeLessThan(legal.revenuePerDay);
    // et elle produit une vraie pression d'événements
    expect(illegal.state.stats.eventsResolved).toBeGreaterThan(legal.state.stats.eventsResolved);
  });

  it('chaque trajectoire s\'installe dans une bande différente', () => {
    const legal = runSimulation(DAYS, SEED, 'legal');
    const illegal = runSimulation(DAYS, SEED, 'illegal');
    expect(legal.state.alignment.score).toBeGreaterThan(0);
    expect(illegal.state.alignment.score).toBeLessThan(-30);
  });
});

describe('richesse narrative', () => {
  it('la correspondance suit la partie sans jamais saturer', () => {
    const { state, rows } = runSimulation(DAYS, SEED, 'mixed');
    expect(state.narrative.letters.length).toBeGreaterThan(8);

    // le plafond de 2 lettres/jour (hors prioritaires) est respecté en moyenne
    expect(state.narrative.letters.length).toBeLessThanOrEqual(DAYS * 3);
    expect(rows[rows.length - 1].letters).toBeGreaterThan(rows[3].letters);

    // aucune lettre ne conserve de variable non résolue
    for (const letter of state.narrative.letters) {
      expect(letter.body).not.toMatch(/\{\w+\}/);
    }
  });
});
