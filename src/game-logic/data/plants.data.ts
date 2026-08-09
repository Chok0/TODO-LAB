/** Templates de plantes (docs/05 §2, docs/08 §5). */

import { MINUTE } from '../time';
import type { EndTag, PlantId, ResourceId } from '../../data/schema';

export interface PlantTemplate {
  id: PlantId;
  label: string;
  seedCost: number;
  growth: number;
  baseYield: number;
  harvest: ResourceId;
  pa: ResourceId;
  endTag: EndTag;
  /** Condition de déblocage, évaluée dans farming.ts. */
  unlock: { kind: 'always' } | { kind: 'machine'; machine: 'still' | 'synthesizer' } | { kind: 'key'; key: 1 };
}

export const PLANTS: PlantTemplate[] = [
  {
    id: 'medicinal',
    label: 'Médicinale',
    seedCost: 5,
    growth: 20 * MINUTE,
    baseYield: 3,
    harvest: 'harvest_med',
    pa: 'pa_med',
    endTag: 'beneficial',
    unlock: { kind: 'always' },
  },
  {
    id: 'industrial',
    label: 'Industrielle',
    seedCost: 8,
    growth: 35 * MINUTE,
    baseYield: 2,
    harvest: 'harvest_ind',
    pa: 'pa_ind',
    endTag: 'neutral',
    unlock: { kind: 'machine', machine: 'still' },
  },
  {
    id: 'recreational',
    label: 'Récréative',
    seedCost: 12,
    growth: 45 * MINUTE,
    baseYield: 3,
    harvest: 'harvest_rec',
    pa: 'pa_rec',
    endTag: 'neutral',
    unlock: { kind: 'machine', machine: 'synthesizer' },
  },
  {
    id: 'toxic',
    label: 'Toxique',
    seedCost: 25,
    growth: 60 * MINUTE,
    baseYield: 2,
    harvest: 'harvest_tox',
    pa: 'pa_tox',
    endTag: 'harmful',
    unlock: { kind: 'key', key: 1 },
  },
];

const BY_ID = new Map(PLANTS.map((p) => [p.id, p]));

export function getPlant(id: PlantId): PlantTemplate {
  const p = BY_ID.get(id);
  if (!p) throw new Error(`Plante inconnue : ${id}`);
  return p;
}
