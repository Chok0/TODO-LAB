/** Dictionnaires du parseur de saisie français (docs/03 §4.2). Extensible par langue. */

export const WEEKDAYS: Record<string, number> = {
  lundi: 1,
  mardi: 2,
  mercredi: 3,
  jeudi: 4,
  vendredi: 5,
  samedi: 6,
  dimanche: 7,
};

/** Alternation regex des jours, avec pluriel optionnel. */
export const WEEKDAY_ALT = Object.keys(WEEKDAYS)
  .map((d) => `${d}s?`)
  .join('|');

export const PRO_KEYWORDS = [
  'comptable',
  'client',
  'clients',
  'facture',
  'factures',
  'devis',
  'réunion',
  'reunion',
  'mail',
  'mails',
  'boulot',
  'atelier',
  'commande',
  'commandes',
  'livraison',
  'tva',
  'urssaf',
  'impôts',
  'impots',
  'fournisseur',
  'chantier',
  'contrat',
  'facturation',
  'rendez-vous pro',
];

export const PERSO_KEYWORDS = [
  'courses',
  'sport',
  'médecin',
  'medecin',
  'dentiste',
  'famille',
  'maison',
  'ménage',
  'menage',
  'vaisselle',
  'lessive',
  'poubelle',
  'poubelles',
  'lire',
  'méditer',
  'mediter',
  'appeler maman',
  'vélo',
  'velo',
  'course à pied',
];

/** Mots-clés de difficulté (docs/03 §4.2). */
export const DIFFICULTY_KEYWORDS: { words: string[]; difficulty: 1 | 2 | 3 | 4 }[] = [
  { words: ['corvée', 'corvee', 'pénible', 'penible', 'galère', 'galere', 'chiant'], difficulty: 4 },
  { words: ['vite fait', 'rapide', '2 min', 'deux minutes', 'rapidement'], difficulty: 1 },
  {
    words: ['ranger', 'trier', 'déclarer', 'declarer', 'nettoyer', 'archiver', 'inventaire', 'déménager', 'demenager'],
    difficulty: 3,
  },
];

/** Marqueurs explicites d'habitude — sans eux, jamais d'habitude créée. */
export const ABSTINENCE_MARKERS = [/\barr[êe]ter?\s+de\s+/i, /\bne\s+plus\s+/i, /\barr[êe]te\s+de\s+/i];
export const COUNTER_MARKERS = [/\blimiter\b/i, /\bmax(?:imum)?\b/i, /\bmoins\s+de\b/i];

/** Mots de liaison à rogner aux extrémités du titre après extraction. */
export const EDGE_FILLERS = [
  'avant',
  'pour',
  'le',
  'la',
  'les',
  'l',
  'à',
  'a',
  'au',
  'aux',
  'de',
  'des',
  'du',
  "d'ici",
  'dici',
  'et',
  'en',
  'ce',
  'cette',
];
