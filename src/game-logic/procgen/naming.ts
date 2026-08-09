/** Grammaire de nommage des machines (docs/08 §3) : [préfixe] [base] [Mk N]. */

import type { Ctx } from '../core';
import type { MachineTemplateId } from '../../data/schema';

const PREFIXES = [
  'Vieux',
  'Réformé',
  'Série K',
  'Récupéré',
  'Bricolé',
  'Modèle Kessler',
  'Rescapé',
  'Second souffle',
];

const BASES: Record<MachineTemplateId, string> = {
  extractor: 'Extracteur',
  still: 'Distillateur',
  synthesizer: 'Synthétiseur',
};

/** Nom figé à la construction (stocké sur l'instance, jamais recalculé). */
export function machineName(ctx: Ctx, id: MachineTemplateId): string {
  const prefix = ctx.rng.naming.pick(PREFIXES);
  return `${prefix} ${BASES[id]}`;
}

export function machineBaseName(id: MachineTemplateId): string {
  return BASES[id];
}
