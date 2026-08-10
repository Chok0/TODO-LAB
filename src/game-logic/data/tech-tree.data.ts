/** Arbre de R&D V1 (docs/04 §1). Tous les coûts sont en kessler (₭). */

import { BALANCE } from '../balance';
import type { MachineTemplateId, TechId } from '../../data/schema';

export interface TechNode {
  id: TechId;
  label: string;
  cost: number;
  requires: TechId[];
  effect: string;
  /** Machine dont ce nœud débloque la construction. */
  unlocksMachine: MachineTemplateId | null;
}

export const TECH_TREE: TechNode[] = [
  {
    id: 'extractor_bp',
    label: 'Blueprint extracteur',
    cost: BALANCE.machines.extractor.research,
    requires: [],
    effect: "Débloque l'Extracteur Mk1 — la construction est offerte : le matériel de l'oncle est encore là.",
    unlocksMachine: 'extractor',
  },
  {
    id: 'farm_bp',
    label: 'Remise en culture',
    cost: BALANCE.research.farm,
    requires: ['extractor_bp'],
    effect:
      "Remet la friche de l'oncle en état : deux parcelles, et de quoi produire vos intrants au lieu de les acheter au Fournisseur.",
    unlocksMachine: null,
  },
  {
    id: 'conveyor',
    label: 'Recherche automatisation',
    cost: BALANCE.research.conveyor,
    requires: ['extractor_bp'],
    effect: 'Convoyeur simple : les machines enchaînent leurs cycles tant que les intrants suivent.',
    unlocksMachine: null,
  },
  {
    id: 'still_bp',
    label: 'Blueprint distillateur',
    cost: BALANCE.machines.still.research,
    requires: ['extractor_bp'],
    effect: 'Débloque le Distillateur Mk1 et la culture industrielle.',
    unlocksMachine: 'still',
  },
  {
    id: 'adv_synthesis',
    label: 'Recherche synthèse avancée',
    cost: BALANCE.machines.synthesizer.research,
    requires: ['still_bp'],
    effect: 'Débloque le Synthétiseur — et rend visibles les arrangements de la Zone.',
    unlocksMachine: 'synthesizer',
  },
  {
    id: 'catalysis',
    label: 'Recherche catalyse',
    cost: BALANCE.research.catalysis,
    requires: ['still_bp', 'adv_synthesis'],
    effect: '+10 % sur toutes les ventes du labo et débloque les améliorations Mk2.',
    unlocksMachine: null,
  },
];

const BY_ID = new Map(TECH_TREE.map((t) => [t.id, t]));

export function getTech(id: TechId): TechNode {
  const t = BY_ID.get(id);
  if (!t) throw new Error(`Recherche inconnue : ${id}`);
  return t;
}
