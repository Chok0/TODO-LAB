/**
 * Pools d'événements de corruption (docs/08 §6).
 * 6 déclencheurs × 3 PNJ × 3 gravités × 3 modes de résolution ≈ 50 événements
 * distincts pour 6 gabarits écrits. Ne pas allonger sans décision d'équilibrage.
 */

import type { PnjId } from '../../data/schema';

export const PNJ_NAMES: Record<PnjId | 'notary', string> = {
  voss: 'Inspectrice Voss',
  coles: 'Sergent Coles',
  reyes: 'Reyes',
  notary: 'Cabinet Marbaix',
};

/** Forme employée dans une phrase : « ... prévient que ... ». */
export const PNJ_INLINE: Record<PnjId, string> = {
  voss: "l'inspectrice Voss",
  coles: 'le sergent Coles',
  reyes: 'Reyes',
};

export interface EventTriggerTemplate {
  id: string;
  title: string;
  bodies: string[];
  gravityMin: 1 | 2 | 3;
  gravityMax: 1 | 2 | 3;
  pnjs: PnjId[];
  requiresFavor: boolean;
  weight: number;
}

export const EVENT_TRIGGERS: EventTriggerTemplate[] = [
  {
    id: 'customs_seizure',
    title: 'La douane a saisi un convoi',
    bodies: [
      "Un camion parti de la friche est resté trois heures au poste nord. {pnj} vous fait savoir que le chargement n'ira pas plus loin sans qu'on s'en occupe — et que la paperasse a déjà commencé à circuler.",
      "Le convoi de mardi n'est jamais arrivé. {pnj} en parle comme d'un malentendu administratif, ce qui, dans la Zone, veut dire que ça se règle avant vendredi.",
    ],
    gravityMin: 2,
    gravityMax: 3,
    pnjs: ['coles', 'reyes'],
    requiresFavor: false,
    weight: 1,
  },
  {
    id: 'favor_recall',
    title: 'On vous rappelle un service dû',
    bodies: [
      "{pnj} n'a pas oublié. La formulation est aimable, l'échéance ne l'est pas : ce qui a été rendu autrefois se rend aujourd'hui.",
      "Il y a eu un arrangement, il y a quelques semaines. {pnj} estime que le moment est venu d'en parler concrètement.",
    ],
    gravityMin: 1,
    gravityMax: 3,
    pnjs: ['coles', 'reyes', 'voss'],
    requiresFavor: true,
    weight: 1.2,
  },
  {
    id: 'surprise_inspection',
    title: 'Inspection surprise',
    bodies: [
      "{pnj} se présente à l'atelier sans prévenir, carnet ouvert. Les registres de production sont demandés pour le trimestre entier.",
      "Contrôle inopiné : {pnj} veut voir les cuves, les filtres et ce qui part à l'égout. Le calendrier n'était pas négociable.",
    ],
    gravityMin: 1,
    gravityMax: 2,
    pnjs: ['voss'],
    requiresFavor: false,
    weight: 1,
  },
  {
    id: 'middleman_blackmail',
    title: 'Un intermédiaire en sait trop',
    bodies: [
      "Un porteur de caisses a compris ce qu'il transportait et l'a fait comprendre à son tour. {pnj} propose de s'en occuper, pour peu qu'on l'y aide.",
      "Quelqu'un a parlé d'une livraison au mauvais comptoir. {pnj} dit pouvoir éteindre ça vite — le mot « vite » a un prix.",
    ],
    gravityMin: 2,
    gravityMax: 2,
    pnjs: ['coles', 'reyes'],
    requiresFavor: false,
    weight: 1,
  },
  {
    id: 'workshop_theft',
    title: "Vol dans l'atelier",
    bodies: [
      "La porte de l'arrière-cour a été forcée cette nuit. Rien de spectaculaire n'a disparu, mais {pnj} vous conseille de régulariser avant que ça se sache.",
      "Deux bidons manquent à l'appel et un gabarit de votre oncle a été retourné. {pnj} propose de retrouver les responsables — à sa manière.",
    ],
    gravityMin: 1,
    gravityMax: 2,
    pnjs: ['coles', 'reyes'],
    requiresFavor: false,
    weight: 1,
  },
  {
    id: 'market_rumor',
    title: 'Une rumeur court sur votre production',
    bodies: [
      "On raconte au marché couvert que ce qui sort de chez vous n'est pas toujours ce qui est écrit dessus. {pnj} vous en informe sans commenter.",
      "Une rumeur circule entre les comptoirs. Elle est fausse pour l'essentiel, ce qui la rend d'autant plus difficile à démentir. {pnj} sait à qui parler.",
    ],
    gravityMin: 1,
    gravityMax: 1,
    pnjs: ['reyes', 'voss'],
    requiresFavor: false,
    weight: 0.8,
  },
];

/** Rappel de dette d'ouverture — hors pool aléatoire (docs/07 §1). */
export const DEBT_EVENT: EventTriggerTemplate = {
  id: 'debt_recall',
  title: "La dette de votre oncle",
  bodies: [
    "Le sergent Coles rappelle, avec une patience qui s'effrite, que l'atelier est venu avec un passif. Il ne dit pas ce qui se passe si personne ne paie ; c'est bien ce qui inquiète.",
    "Coles est passé. Il n'a rien pris, rien menacé — il a seulement laissé entendre que sa hiérarchie, elle, ne connaît pas votre oncle.",
  ],
  gravityMin: 2,
  gravityMax: 2,
  pnjs: ['coles'],
  requiresFavor: false,
  weight: 0,
};

/** Offre spontanée de la Zone (docs/08 §6). */
export const OFFER_TEMPLATE = {
  id: 'zone_offer',
  title: 'Une proposition de la Zone',
  bodies: [
    "{pnj} propose un coup de main : un lot de matériel, sans facture, sans question. Il ne demande rien tout de suite — c'est précisément la partie coûteuse.",
    "{pnj} a « un ami qui a du stock en trop ». L'offre est gratuite, au sens où on ne paie pas maintenant.",
  ],
};
