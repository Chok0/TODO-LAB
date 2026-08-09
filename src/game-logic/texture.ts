/**
 * Texture Fin × Moyens (docs/06 §6).
 * AUCUN effet économique : c'est un sélecteur de variantes narratives.
 */

import type { EndTag, MeansTag, Texture } from '../data/schema';

export function computeTexture(endTag: EndTag, means: MeansTag): Texture {
  const clean = means === 'clean';
  if (endTag === 'beneficial') return clean ? 'aligned' : 'cynical';
  if (endTag === 'neutral') return clean ? 'neutral' : 'careless';
  return clean ? 'vice_artisan' : 'zone_pure';
}

export const TEXTURE_LABELS: Record<Texture, string> = {
  aligned: 'aligné',
  cynical: 'cynique',
  neutral: 'neutre',
  careless: 'négligent',
  vice_artisan: 'artisan du vice',
  zone_pure: 'Zone pure',
};
