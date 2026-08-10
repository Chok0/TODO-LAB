/** Scénarios obligatoires du module Log (docs/07 §6). */

import { describe, expect, it } from 'vitest';
import { advance, advanceCollect, DAY, doAct, give, HOUR, newGame, SEC } from './helpers';
import type { Ctx } from '../src/game-logic/core';
import { makeStreams } from '../src/game-logic/rng';
import { deliverQueue, queueFromSignals } from '../src/game-logic/narrative';
import type { GameState } from '../src/data/schema';

function ctxFor(state: GameState): Ctx {
  return { now: state.meta.lastTickAt, rng: makeStreams(state.meta.seed), effects: [], catchUp: false };
}

const templateIds = (s: GameState) => s.narrative.letters.map((l) => l.templateId);

describe('1 — premier lancement', () => {
  it('délivre le notaire immédiatement puis Coles et Voss les jours suivants', () => {
    let s = advance(newGame(), 1 * SEC);
    expect(templateIds(s)).toContain('scripted_notary');
    expect(templateIds(s)).not.toContain('scripted_coles');

    s = advance(s, DAY);
    expect(templateIds(s)).toContain('scripted_coles');

    s = advance(s, DAY);
    expect(templateIds(s)).toContain('scripted_voss');
    expect(s.narrative.letters.filter((l) => l.templateId.startsWith('scripted_'))).toHaveLength(3);
  });

  it('n\'envoie jamais deux fois la même lettre d\'ouverture', () => {
    let s = advance(newGame(), 10 * DAY);
    const scripted = templateIds(s).filter((id) => id.startsWith('scripted_'));
    expect(new Set(scripted).size).toBe(scripted.length);
  });
});

describe('2 — seuil de texture', () => {
  it('déclenche la lettre de Voss au 3e lot cynique et pas au 4e', () => {
    let s = give(newGame(), { kess: 40000, pa_med: 40, pa_ind: 20 });
    s = doAct(s, { type: 'Research', tech: 'extractor_bp' });
    s = doAct(s, { type: 'Research', tech: 'still_bp' });
    s = doAct(s, { type: 'BuildMachine', machine: 'still' });
    s = doAct(s, { type: 'Research', tech: 'conveyor' });
    s = doAct(s, { type: 'SetMeans', machine: 'still', means: 'dirty' });
    s = doAct(s, { type: 'AssignRecipe', machine: 'still', recipe: 'remedy_std' });
    s = doAct(s, { type: 'StartCycle', machine: 'still' });

    // au moins 3 lots de remède standard produits en moyens dégradants
    s = advance(s, 300 * SEC, { catchUp: false });
    expect(s.stats.textureCounts.cynical).toBeGreaterThanOrEqual(3);
    expect(s.stats.textureCounts.aligned).toBe(0);
    expect(templateIds(s)).toContain('voss_texture_cynical');

    // le seuil ne se redéclenche pas aux lots suivants
    const before = templateIds(s).filter((id) => id === 'voss_texture_cynical').length;
    expect(before).toBe(1);
    s = advance(s, 300 * SEC, { catchUp: false });
    expect(s.stats.textureCounts.cynical).toBeGreaterThanOrEqual(6);
    expect(templateIds(s).filter((id) => id === 'voss_texture_cynical').length).toBe(before);
  });
});

describe('3 — plafond anti-spam', () => {
  it('délivre 2 lettres par jour et met le reste en file', () => {
    const s = newGame();
    const ctx = ctxFor(s);
    const draft = structuredClone(s);

    queueFromSignals(draft, ctx, [
      { name: 'first_sale' },
      { name: 'kess:100' },
      { name: 'machine_built:still' },
      { name: 'band:coop' },
      { name: 'streak:7' },
    ]);
    expect(draft.narrative.letterQueue).toHaveLength(5);

    deliverQueue(draft, ctx);
    expect(draft.narrative.letters).toHaveLength(2);
    expect(draft.narrative.letterQueue).toHaveLength(3);

    // le lendemain, deux de plus
    draft.narrative.lettersToday = 0;
    deliverQueue(draft, ctx);
    expect(draft.narrative.letters).toHaveLength(4);
    expect(draft.narrative.letterQueue).toHaveLength(1);
  });

  it('laisse passer les lettres prioritaires malgré le plafond', () => {
    const s = newGame();
    const ctx = ctxFor(s);
    const draft = structuredClone(s);
    draft.narrative.lettersToday = 2;

    queueFromSignals(draft, ctx, [{ name: 'event_resolved:kess' }]);
    deliverQueue(draft, ctx);
    expect(draft.narrative.letters).toHaveLength(1);
  });
});

describe('4 — dette soldée', () => {
  it('envoie la quittance de Coles, crédite la réputation et arrête les rappels', () => {
    let s = give(newGame(), { kess: 800 });
    s = advance(s, 20 * DAY); // les rappels ont largement eu le temps de partir
    expect(s.corruption.debtRemindersSent).toBeGreaterThanOrEqual(2);

    s = doAct(s, { type: 'RepayDebt', amount: 500 });
    expect(s.corruption.openingDebt).toBe(0);
    expect(s.alignment.reputation.zone).toBe(5);
    expect(templateIds(s)).toContain('coles_debt_cleared');

    // plus aucun événement de dette ensuite
    const after = advance(s, 30 * DAY);
    const debtEvents = after.narrative.registry.filter((l) => l.text.includes('dette de votre oncle'));
    const before = s.narrative.registry.filter((l) => l.text.includes('dette de votre oncle'));
    expect(debtEvents.length).toBe(before.length);
  });
});

describe('5 — Registre', () => {
  it('reflète exactement les effets émis par le moteur', () => {
    let s = give(newGame(), { kess: 100 });
    const { state, effects } = advanceCollect(
      doAct(s, {
        type: 'AddTodo',
        draft: { title: 'ranger l\'atelier', category: 'pro', difficulty: 3, kind: 'oneshot' },
      }),
      1 * SEC,
    );
    const registryBefore = state.narrative.registry.length;

    const done = doAct(state, { type: 'CompleteTodo', id: state.todos[0].id });
    const added = done.narrative.registry.length - registryBefore;
    expect(added).toBeGreaterThanOrEqual(1);
    expect(done.narrative.registry[0].text).toContain("ranger l'atelier");
    expect(done.narrative.registry[0].tone).toBe('good');
    expect(effects.every((e) => typeof e.kind === 'string')).toBe(true);
  });

  it('borne le registre à 500 lignes', () => {
    let s = give(newGame(), { kess: 60000, harvest_med: 3000 });
    s = doAct(s, { type: 'Research', tech: 'extractor_bp' });
    s = doAct(s, { type: 'Research', tech: 'conveyor' });
    s = doAct(s, { type: 'AssignRecipe', machine: 'extractor', recipe: 'tonic' });
    s = give(s, { pa_med: 2000 });
    s = doAct(s, { type: 'StartCycle', machine: 'extractor' });
    s = advance(s, 11 * HOUR);
    expect(s.narrative.registry.length).toBeLessThanOrEqual(500);
  });
});
