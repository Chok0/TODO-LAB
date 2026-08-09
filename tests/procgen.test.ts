/** Tests du procédural (docs/08 §8). */

import { describe, expect, it } from 'vitest';
import { advance, doAct, give, newGame, SEC, T0 } from './helpers';
import type { Ctx } from '../src/game-logic/core';
import { makeStreams } from '../src/game-logic/rng';
import { eligibleTriggers, generateEvent } from '../src/game-logic/procgen/events';
import { EVENT_TRIGGERS } from '../src/game-logic/data/event-pools.fr';
import { LETTER_TEMPLATES, OPENING_LETTERS } from '../src/game-logic/data/letter-templates.fr';
import { defaultVars, renderBody, selectTemplate } from '../src/game-logic/procgen/letters';
import { dayKey } from '../src/game-logic/time';
import type { GameState } from '../src/data/schema';

function ctxFor(state: GameState, seed = state.meta.seed): Ctx {
  return { now: state.meta.lastTickAt, rng: makeStreams(seed), effects: [], catchUp: false };
}

/** Partie avancée : branche illégale ouverte, une faveur due. */
function richState(): GameState {
  let s = give(newGame(), { energy: 900, kess: 5000 });
  s = doAct(s, { type: 'Research', tech: 'extractor_bp' });
  s = doAct(s, { type: 'Research', tech: 'still_bp' });
  s = doAct(s, { type: 'Research', tech: 'adv_synthesis' });
  s = doAct(s, { type: 'BuildMachine', machine: 'synthesizer' });
  s = doAct(s, { type: 'BuyKey', key: 1 });
  s.corruption.favors.push({ id: 'fav-1', pnj: 'coles', origin: 'test', day: dayKey(T0), repaid: false });
  return s;
}

describe('1 — déterminisme', () => {
  it('produit la même partie à seed égale', () => {
    const play = () => {
      let s = give(newGame(T0, 1234), { energy: 900, kess: 3000, harvest_med: 200 });
      s = doAct(s, { type: 'Research', tech: 'extractor_bp' });
      s = doAct(s, { type: 'Research', tech: 'conveyor' });
      s = doAct(s, { type: 'StartCycle', machine: 'extractor' });
      return advance(s, 3 * 24 * 3600 * SEC);
    };
    const a = play();
    const b = play();
    expect(a.lab.machines[0].displayName).toBe(b.lab.machines[0].displayName);
    expect(a.narrative.letters.map((l) => l.templateId)).toEqual(b.narrative.letters.map((l) => l.templateId));
    expect(a.narrative.letters.map((l) => l.body)).toEqual(b.narrative.letters.map((l) => l.body));
    expect(a.resources).toEqual(b.resources);
  });

  it('diverge à seed différente', () => {
    const names = new Set<string>();
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      let s = give(newGame(T0, seed), { energy: 100 });
      s = doAct(s, { type: 'Research', tech: 'extractor_bp' });
      names.add(s.lab.machines[0].displayName);
    }
    expect(names.size).toBeGreaterThan(1);
  });
});

describe('2 — indépendance des streams', () => {
  it('consommer des tirages de lettres ne décale pas les événements', () => {
    const state = richState();

    const ctxA = ctxFor(state);
    const eventA = generateEvent(state, ctxA)!;

    const ctxB = ctxFor(state);
    for (let i = 0; i < 100; i++) ctxB.rng.letters.next();
    const eventB = generateEvent(state, ctxB)!;

    expect(eventB.triggerId).toBe(eventA.triggerId);
    expect(eventB.body).toBe(eventA.body);
  });
});

describe('3 — couverture du générateur d\'événements', () => {
  it('sort les 6 déclencheurs et les 3 PNJ, sans répétition consécutive', () => {
    let state = richState();
    const ctx = ctxFor(state);
    const triggers: string[] = [];
    const pnjs = new Set<string>();

    for (let i = 0; i < 200; i++) {
      const evt = generateEvent(state, ctx);
      expect(evt).not.toBeNull();
      triggers.push(evt!.triggerId);
      pnjs.add(evt!.pnj);
      state.corruption.lastEventTriggerId = evt!.triggerId;
    }

    expect(new Set(triggers).size).toBe(EVENT_TRIGGERS.length);
    expect(pnjs.size).toBe(3);
    for (let i = 1; i < triggers.length; i++) {
      expect(triggers[i]).not.toBe(triggers[i - 1]);
    }
  });

  it('ne tire jamais « rappel de service » sans faveur due', () => {
    const state = richState();
    state.corruption.favors = [];
    expect(eligibleTriggers(state).some((t) => t.id === 'favor_recall')).toBe(false);

    const ctx = ctxFor(state);
    for (let i = 0; i < 100; i++) {
      const evt = generateEvent(state, ctx)!;
      expect(evt.triggerId).not.toBe('favor_recall');
      state.corruption.lastEventTriggerId = evt.triggerId;
    }
  });

  it('alourdit la gravité quand une faveur est rappelée', () => {
    const state = richState();
    const ctx = ctxFor(state);
    let seen = false;
    for (let i = 0; i < 200; i++) {
      const evt = generateEvent(state, ctx)!;
      if (evt.triggerId === 'favor_recall') {
        seen = true;
        expect(evt.recallsFavorId).toBe('fav-1');
        expect(evt.pnj).toBe('coles'); // le PNJ porteur est celui de la faveur
      }
      state.corruption.lastEventTriggerId = evt.triggerId;
    }
    expect(seen).toBe(true);
  });

  it('propose toujours les trois modes de résolution', () => {
    const state = richState();
    const ctx = ctxFor(state);
    for (let i = 0; i < 50; i++) {
      const evt = generateEvent(state, ctx)!;
      expect(evt.options.map((o) => o.pay).sort()).toEqual(['kess', 'reputation', 'service']);
      state.corruption.lastEventTriggerId = evt.triggerId;
    }
  });
});

describe('4 — rendu des lettres', () => {
  it('ne laisse aucun {placeholder} non résolu, quel que soit l\'état', () => {
    const states = [newGame(), richState()];
    for (const state of states) {
      const vars = defaultVars(state);
      for (const template of LETTER_TEMPLATES) {
        for (const body of template.bodies) {
          const rendered = renderBody(body, vars);
          expect(rendered).not.toMatch(/\{\w+\}/);
          expect(rendered.length).toBeGreaterThan(40);
        }
      }
    }
  });

  it('respecte le budget d\'écriture documenté', () => {
    expect(LETTER_TEMPLATES).toHaveLength(24);
    expect(OPENING_LETTERS).toHaveLength(3);
    for (const pnj of ['voss', 'coles', 'reyes'] as const) {
      expect(LETTER_TEMPLATES.filter((t) => t.pnj === pnj)).toHaveLength(8);
    }
    for (const t of LETTER_TEMPLATES) {
      expect(t.bodies.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('donne une signature identifiable à chaque PNJ', () => {
    const signature: Record<string, RegExp> = {
      voss: /Voss/,
      coles: /Coles/,
      reyes: /R\.|Reyes/,
    };
    for (const t of LETTER_TEMPLATES) {
      for (const body of t.bodies) {
        expect(body).toMatch(signature[t.pnj]);
      }
    }
  });
});

describe('5 — anti-répétition', () => {
  it('déprioritise fortement un template déjà servi récemment', () => {
    const base = richState();
    const count = (state: GameState) => {
      const ctx = ctxFor(state, 999);
      const tally: Record<string, number> = {};
      for (let i = 0; i < 400; i++) {
        const t = selectTemplate(state, ctx, 'event_resolved:kess');
        if (t) tally[t.id] = (tally[t.id] ?? 0) + 1;
      }
      return tally;
    };

    const fresh = count(base);
    expect(fresh.voss_event_kess).toBeGreaterThan(50);
    expect(fresh.reyes_event_kess).toBeGreaterThan(50);

    const served = structuredClone(base);
    served.narrative.servedTemplates.push({
      templateId: 'voss_event_kess',
      lastServedDay: dayKey(served.meta.lastTickAt),
    });
    const after = count(served);
    expect(after.voss_event_kess).toBeLessThan(fresh.voss_event_kess / 2);
    expect(after.reyes_event_kess).toBeGreaterThan(after.voss_event_kess);
  });
});
