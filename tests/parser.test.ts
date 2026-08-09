/** Cas de test canoniques du parseur (docs/03 §4.4). */

import { describe, expect, it } from 'vitest';
import { parseInput } from '../src/game-logic/todos/parser';
import { dayOfWeek } from '../src/game-logic/time';
import { T0 } from './helpers';

describe('parseur de saisie par règles', () => {
  it('« appeler le comptable tous les lundis »', () => {
    const r = parseInput('appeler le comptable tous les lundis', T0);
    expect(r.title).toBe('appeler le comptable');
    expect(r.kind).toBe('recurring');
    expect(r.frequency).toBe('weekly');
    expect(r.mode).toBe('fixed');
    expect(r.fixedDays).toEqual([1]);
    expect(r.category).toBe('pro');
  });

  it('« méditer 2x par jour »', () => {
    const r = parseInput('méditer 2x par jour', T0);
    expect(r.kind).toBe('recurring');
    expect(r.frequency).toBe('daily');
    expect(r.mode).toBe('multiDaily');
    expect(r.target).toBe(2);
    expect(r.category).toBe('perso');
    expect(r.title).toBe('méditer');
  });

  it('« facture client avant vendredi »', () => {
    const r = parseInput('facture client avant vendredi', T0);
    expect(r.kind).toBe('oneshot');
    expect(r.category).toBe('pro');
    expect(r.dueAt).toBeTruthy();
    expect(dayOfWeek(r.dueAt!)).toBe(5); // vendredi de la semaine courante
    expect(r.title).toBe('facture client');
  });

  it('« sport 3 fois par semaine »', () => {
    const r = parseInput('sport 3 fois par semaine', T0);
    expect(r.kind).toBe('recurring');
    expect(r.frequency).toBe('weekly');
    expect(r.mode).toBe('flexible');
    expect(r.target).toBe(3);
    expect(r.category).toBe('perso');
    expect(r.title).toBe('sport');
  });

  it('« arrêter de fumer »', () => {
    const r = parseInput('arrêter de fumer', T0);
    expect(r.kind).toBe('habit');
    expect(r.habitKind).toBe('abstinence');
    expect(r.category).toBe('perso');
  });

  it('« limiter café max 3 par jour »', () => {
    const r = parseInput('limiter café max 3 par jour', T0);
    expect(r.kind).toBe('habit');
    expect(r.habitKind).toBe('counter');
    expect(r.thresholds?.s2).toBe(3);
  });

  it('« déclarer la TVA le 5 du mois »', () => {
    const r = parseInput('déclarer la TVA le 5 du mois', T0);
    expect(r.kind).toBe('recurring');
    expect(r.frequency).toBe('monthly');
    expect(r.mode).toBe('fixed');
    expect(r.fixedDays).toEqual([5]);
    expect(r.category).toBe('pro');
    expect(r.difficulty).toBe(3);
  });

  it("« ranger l'atelier »", () => {
    const r = parseInput("ranger l'atelier", T0);
    expect(r.kind).toBe('oneshot');
    expect(r.dueAt).toBeNull();
    expect(r.difficulty).toBe(3);
  });

  it('couvre les autres formes documentées', () => {
    expect(parseInput('tous les jours boire de l\'eau', T0).mode).toBe('fixed');
    expect(parseInput('arroser tous les 3 jours', T0).frequency).toEqual({ everyNDays: 3 });
    expect(parseInput('ménage une fois par semaine', T0).mode).toBe('flexible');
    expect(parseInput('facture mensuelle', T0).frequency).toBe('monthly');
    expect(parseInput('courses demain', T0).kind).toBe('oneshot');
    expect(parseInput('appeler le client ce soir', T0).dueAt).toBeGreaterThan(T0);
  });

  it('produit toujours un titre non vide et des chips exploitables', () => {
    for (const raw of [
      'appeler le comptable tous les lundis',
      'sport 3 fois par semaine',
      'tous les jours',
      'x',
    ]) {
      const r = parseInput(raw, T0);
      expect(r.title.length).toBeGreaterThan(0);
      expect(r.chips.length).toBeGreaterThanOrEqual(2);
      for (const chip of r.chips) {
        expect(chip.confidence).toBeGreaterThan(0);
        expect(chip.label.length).toBeGreaterThan(0);
      }
    }
  });

  it('ne crée jamais une habitude sans marqueur explicite', () => {
    expect(parseInput('café 3 par jour', T0).kind).not.toBe('habit');
    expect(parseInput('limiter les écrans', T0).kind).toBe('habit');
  });
});
