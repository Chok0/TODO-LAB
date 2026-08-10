/**
 * Les recettes V1 (DEC-08, docs/02 §7) — DATA, pas du code.
 * Les 4 recettes d'extraction sont implicites au sens du doc (elles ne vendent
 * rien, elles raffinent une récolte en principe actif) mais sont modélisées
 * comme des recettes assignables pour rester dans un seul mécanisme.
 */

import type { EndTag, MachineTemplateId, RecipeId, ResourceId, TechId, CorruptionKey } from '../../data/schema';

export interface Recipe {
  id: RecipeId;
  label: string;
  machine: MachineTemplateId;
  inputs: { resource: ResourceId; amount: number }[];
  /** Sortie en ressource (extraction) — null si la recette produit un bien vendu. */
  output: { resource: ResourceId; amount: number } | null;
  /** Prix de vente de base ; 0 pour une recette d'extraction. */
  salePrice: number;
  branch: 'legal' | 'illegal';
  endTag: EndTag;
  requiresTech: TechId[];
  requiresKey: CorruptionKey | null;
  requiresMk: 1 | 2;
}

export const RECIPES: Recipe[] = [
  // ---- Extraction (Extracteur) ----
  {
    id: 'extract_med',
    label: 'Extraction — médicinale',
    machine: 'extractor',
    inputs: [{ resource: 'harvest_med', amount: 1 }],
    output: { resource: 'pa_med', amount: 1 },
    salePrice: 0,
    branch: 'legal',
    endTag: 'neutral',
    requiresTech: [],
    requiresKey: null,
    requiresMk: 1,
  },
  {
    id: 'extract_ind',
    label: 'Extraction — industrielle',
    machine: 'extractor',
    inputs: [{ resource: 'harvest_ind', amount: 1 }],
    output: { resource: 'pa_ind', amount: 1 },
    salePrice: 0,
    branch: 'legal',
    endTag: 'neutral',
    requiresTech: [],
    requiresKey: null,
    requiresMk: 1,
  },
  {
    id: 'extract_rec',
    label: 'Extraction — récréative',
    machine: 'extractor',
    inputs: [{ resource: 'harvest_rec', amount: 1 }],
    output: { resource: 'pa_rec', amount: 1 },
    salePrice: 0,
    branch: 'legal',
    endTag: 'neutral',
    requiresTech: [],
    requiresKey: null,
    requiresMk: 1,
  },
  {
    id: 'extract_tox',
    label: 'Extraction — toxique',
    machine: 'extractor',
    inputs: [{ resource: 'harvest_tox', amount: 1 }],
    output: { resource: 'pa_tox', amount: 1 },
    salePrice: 0,
    branch: 'legal',
    endTag: 'neutral',
    requiresTech: [],
    requiresKey: null,
    requiresMk: 1,
  },

  // ---- Branche légale ----
  {
    id: 'tonic',
    label: 'Tonique de base',
    machine: 'extractor',
    inputs: [{ resource: 'pa_med', amount: 2 }],
    output: null,
    salePrice: 16,
    branch: 'legal',
    endTag: 'beneficial',
    requiresTech: [],
    requiresKey: null,
    requiresMk: 1,
  },
  {
    id: 'remedy_std',
    label: 'Remède standard',
    machine: 'still',
    inputs: [
      { resource: 'pa_med', amount: 3 },
      { resource: 'pa_ind', amount: 1 },
    ],
    output: null,
    salePrice: 60,
    branch: 'legal',
    endTag: 'beneficial',
    requiresTech: [],
    requiresKey: null,
    requiresMk: 1,
  },
  {
    id: 'remedy_premium',
    label: 'Remède premium',
    machine: 'still',
    inputs: [
      { resource: 'pa_med', amount: 5 },
      { resource: 'pa_ind', amount: 2 },
    ],
    output: null,
    salePrice: 180,
    branch: 'legal',
    endTag: 'beneficial',
    requiresTech: ['catalysis'],
    requiresKey: null,
    requiresMk: 2,
  },

  // ---- Branche illégale ----
  {
    id: 'raw_extract',
    label: 'Extrait brut',
    machine: 'synthesizer',
    inputs: [{ resource: 'pa_rec', amount: 2 }],
    output: null,
    salePrice: 45,
    branch: 'illegal',
    endTag: 'neutral',
    requiresTech: ['adv_synthesis'],
    requiresKey: 1,
    requiresMk: 1,
  },
  {
    id: 'active_compound',
    label: 'Composé actif',
    machine: 'synthesizer',
    inputs: [
      { resource: 'pa_rec', amount: 3 },
      { resource: 'pa_tox', amount: 2 },
    ],
    output: null,
    salePrice: 140,
    branch: 'illegal',
    endTag: 'harmful',
    requiresTech: ['adv_synthesis'],
    requiresKey: 2,
    requiresMk: 1,
  },
  {
    id: 'refined_product',
    label: 'Produit raffiné',
    machine: 'synthesizer',
    inputs: [
      { resource: 'pa_tox', amount: 6 },
      { resource: 'pa_rec', amount: 2 },
    ],
    output: null,
    salePrice: 400,
    branch: 'illegal',
    endTag: 'harmful',
    requiresTech: ['adv_synthesis', 'catalysis'],
    requiresKey: 3,
    requiresMk: 2,
  },
];

const BY_ID = new Map(RECIPES.map((r) => [r.id, r]));

export function getRecipe(id: RecipeId): Recipe {
  const r = BY_ID.get(id);
  if (!r) throw new Error(`Recette inconnue : ${id}`);
  return r;
}
