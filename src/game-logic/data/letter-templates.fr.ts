/**
 * Templates de lettres (docs/08 §7). Budget V1 : 8 templates × 3 PNJ,
 * 2-3 variantes chacun, + 3 lettres d'ouverture scriptées (docs/07 §5).
 * NE PAS étendre au-delà sans décision d'équilibrage de contenu.
 *
 * Voix : Voss = administratif sec, humanité en post-scriptum seulement.
 *        Coles = jovial, argot douanier, menace en sous-texte.
 *        Reyes = elliptique, commercial, jamais deux fois la même structure.
 *
 * Variables injectables : {amount} {product} {machine} {streak} {debt} {favors} {texture}
 */

import type { Band, PnjId } from '../../data/schema';

export interface LetterTemplate {
  id: string;
  pnj: PnjId;
  /** Signal émis par le moteur auquel ce template répond. */
  trigger: string;
  conditions?: {
    band?: Band[];
    minRep?: number;
    maxRep?: number;
    debtOpen?: boolean;
  };
  weight: number;
  title: string;
  bodies: string[];
}

// ---------------------------------------------------------------------------
// INSPECTRICE VOSS — Coopérative
// ---------------------------------------------------------------------------

const VOSS: LetterTemplate[] = [
  {
    id: 'voss_first_sale',
    pnj: 'voss',
    trigger: 'first_sale',
    weight: 1,
    title: 'Enregistrement d\'activité',
    bodies: [
      `Votre première sortie de production a été enregistrée au registre de la Coopérative sous le régime de l'atelier repris.\n\nRien à signaler. Les volumes sont conformes. Le dossier de votre oncle reste ouvert : il faudra le solder un jour, administrativement parlant.\n\nI. Voss, inspectrice.\n\nP.-S. — J'ai connu cet atelier du temps où il sentait la colle à chaud et le vernis. C'est étrange de le voir revenir sous une autre rubrique.`,
      `Nous accusons réception de votre première déclaration de production ({product}, {amount} ₭).\n\nLe classement de l'atelier passe de « inactif » à « activité déclarée ». Cette bascule ouvre des droits ; elle ouvre aussi des obligations.\n\nI. Voss.`,
    ],
  },
  {
    id: 'voss_still',
    pnj: 'voss',
    trigger: 'machine_built:still',
    weight: 1,
    title: 'Mise en service d\'un distillateur',
    bodies: [
      `Une colonne de distillation a été déclarée à votre adresse. Type : {machine}.\n\nRappel réglementaire : les rejets doivent être neutralisés avant évacuation. Le contrôle est aléatoire ; il n'est jamais très loin.\n\nCela dit, un distillateur en état de marche dans la Zone, c'est plus rare qu'on ne croit.\n\nI. Voss.`,
      `Votre déclaration d'équipement a été traitée. {machine} : conforme, sous réserve d'inspection.\n\nVous montez en gamme plus vite que la moyenne des ateliers repris. Ce n'est pas un compliment, c'est une observation de dossier.\n\nI. Voss.`,
    ],
  },
  {
    id: 'voss_event_kess',
    pnj: 'voss',
    trigger: 'event_resolved:kess',
    weight: 1,
    title: 'Quittance',
    bodies: [
      `Le dossier est clos. La somme a été portée au registre approprié, la procédure s'arrête là.\n\nJe préfère cette issue. Elle ne laisse rien traîner.\n\nI. Voss.`,
      `Régularisation enregistrée. Aucun élément ne subsiste au dossier.\n\nPayer coûte cher et ne se raconte pas. C'est précisément ce qui en fait la bonne solution.\n\nI. Voss.`,
    ],
  },
  {
    id: 'voss_event_service',
    pnj: 'voss',
    trigger: 'event_resolved:service',
    weight: 1,
    title: 'Observation au dossier',
    bodies: [
      `J'apprends que vous avez préféré vous acquitter en nature. Ce n'est pas illégal. Ce n'est pas non plus neutre.\n\nUn engagement de ce type ne s'éteint pas au paiement : il se reporte. Vous avez actuellement {favors} engagement(s) de cette nature.\n\nI. Voss.`,
      `Le règlement en service a été porté à ma connaissance par un canal qui n'est pas le vôtre — ce qui devrait déjà vous renseigner.\n\nJe note. Je ne commente pas.\n\nI. Voss.`,
    ],
  },
  {
    id: 'voss_band_coop',
    pnj: 'voss',
    trigger: 'band:coop',
    weight: 1,
    title: 'Dossier d\'agrément',
    bodies: [
      `Votre dossier est passé en commission ce matin. Je l'ai défendu.\n\nLa Coopérative reconnaît désormais votre atelier comme conforme. Vous accédez aux circuits réguliers, aux tarifs réguliers, aux délais réguliers — les trois vont ensemble, y compris le troisième.\n\nI. Voss.\n\nP.-S. — Votre oncle n'a jamais voulu de cet agrément. Il disait que ça abîmait la main. Il avait tort sur beaucoup de choses.`,
      `La commission a statué favorablement. C'est une position, pas un acquis : elle se vérifie à chaque contrôle.\n\nBienvenue du bon côté du registre.\n\nI. Voss.`,
    ],
  },
  {
    id: 'voss_texture_cynical',
    pnj: 'voss',
    trigger: 'texture:cynical',
    weight: 1.5,
    title: 'Remarque sur vos procédés',
    bodies: [
      `Vos produits soignent. Vos méthodes, non.\n\nJ'ai vu passer trois lots conformes au fond et douteux sur la forme : rejets non neutralisés, cycles forcés. Le résultat est bon. Le chemin ne l'est pas.\n\nJe n'ai rien à vous reprocher au titre du règlement. C'est bien ce qui me dérange.\n\nI. Voss.`,
      `Un remède fabriqué salement reste un remède. C'est l'argument que vous m'opposeriez, et il tient.\n\nIl tient jusqu'au jour où quelqu'un en bas de la vallée boit l'eau de votre évacuation.\n\nI. Voss.`,
    ],
  },
  {
    id: 'voss_streak_7',
    pnj: 'voss',
    trigger: 'streak:7',
    weight: 1,
    title: 'Sans objet administratif',
    bodies: [
      `Cette lettre n'a aucune valeur réglementaire.\n\nOn m'a rapporté que vous teniez quelque chose depuis {streak} jours. Dans ce métier, la régularité vaut plus que le talent — et elle est plus rare.\n\nContinuez.\n\nI. Voss.`,
      `Hors dossier.\n\n{streak} jours consécutifs. J'ai vu des ateliers mieux équipés que le vôtre échouer sur ce point précis.\n\nI. Voss.`,
    ],
  },
  {
    id: 'voss_subsidy',
    pnj: 'voss',
    trigger: 'subsidy_available',
    weight: 1,
    title: 'Ouverture de droits',
    bodies: [
      `Votre niveau de production et votre réputation auprès de la Coopérative ouvrent droit au dispositif de soutien : versement hebdomadaire et abattement sur les frais de recherche.\n\nLe dossier est prêt. Il attend votre acceptation.\n\nI. Voss.`,
      `Vous remplissez les conditions du soutien à l'atelier agréé. C'est mécanique, je n'ai rien accordé — j'ai seulement refusé de faire traîner.\n\nI. Voss.`,
    ],
  },
];

// ---------------------------------------------------------------------------
// SERGENT COLES — la Zone
// ---------------------------------------------------------------------------

const COLES: LetterTemplate[] = [
  {
    id: 'coles_kess_100',
    pnj: 'coles',
    trigger: 'kess:100',
    weight: 1,
    title: 'Petit mot',
    bodies: [
      `Alors comme ça, la boutique tourne.\n\nCent kess, c'est pas la fortune, mais c'est le premier signe qu'un atelier est vivant. Les miens l'ont remarqué avant moi, c'est dire.\n\nJe passe boire un café un de ces quatre. Rien d'officiel.\n\nColes`,
      `On m'a dit que la cheminée fumait de nouveau chez Kessler-nord.\n\nBonne nouvelle. Un atelier qui produit, c'est un atelier qui peut payer ses amis. Et vous en avez, des amis, même si vous ne les avez pas encore tous rencontrés.\n\nColes`,
    ],
  },
  {
    id: 'coles_key1',
    pnj: 'coles',
    trigger: 'key_bought:1',
    weight: 1,
    title: 'Bienvenue au club',
    bodies: [
      `Voilà. C'était pas si compliqué.\n\nÀ partir de maintenant, les convois qui partent de chez vous passent le poste nord sans ouvrir les caisses. En échange, il y a une petite ligne qui court sur tout ce que vous vendez. Elle ne s'arrête jamais, cette ligne. C'est le principe.\n\nÀ bientôt, forcément.\n\nColes`,
      `Signé, tamponné, oublié — dans cet ordre.\n\nVous verrez, on s'habitue vite au confort. Ce qui coûte, ce n'est pas le premier arrangement : c'est de vouloir en sortir.\n\nColes`,
    ],
  },
  {
    id: 'coles_event_service',
    pnj: 'coles',
    trigger: 'event_resolved:service',
    weight: 1.2,
    title: 'Marché conclu',
    bodies: [
      `Parfait. Tu livres, on efface.\n\nJe note qu'on est passés au tutoiement quelque part entre la deuxième et la troisième caisse. C'est bon signe. Ça veut dire qu'on se comprend.\n\nLes délais, eux, ne se tutoient pas.\n\nColes`,
      `Bien reçu. Un service, c'est plus élégant que de l'argent : ça circule mieux et ça se souvient plus longtemps.\n\nTu as {favors} engagement(s) chez nous. Je tiens les comptes, ne t'inquiète pas de ça.\n\nColes`,
    ],
  },
  {
    id: 'coles_contract_failed',
    pnj: 'coles',
    trigger: 'contract_failed',
    weight: 2,
    title: 'Déception',
    bodies: [
      `Les caisses sont vides et le camion est reparti à moitié chargé.\n\nJe ne vais pas te faire un discours. On a pris ce qui traînait dans l'atelier pour équilibrer, c'est la procédure — la nôtre, pas celle de Voss.\n\nCe serait dommage que ça devienne une habitude.\n\nColes`,
      `J'ai attendu. Ça m'arrive rarement et ça ne m'améliore pas.\n\nLe stock a été repris. Considère ça comme un rappel pédagogique, pas comme une sanction : les sanctions, chez nous, ne s'écrivent pas.\n\nColes`,
    ],
  },
  {
    id: 'coles_band_zone',
    pnj: 'coles',
    trigger: 'band:zone',
    weight: 1,
    title: 'Un des nôtres',
    bodies: [
      `Ça y est, on ne te compte plus parmi les visiteurs.\n\nLes comptoirs prennent tout ce que tu produis sans regarder l'étiquette, et le tarif est meilleur qu'ailleurs. En revanche, les subventions de la Coopérative, tu peux les oublier — Voss a rayé ton nom d'un trait très droit.\n\nOn ne peut pas tout avoir. On peut avoir beaucoup.\n\nColes`,
      `Bienvenue pour de bon.\n\nTu as basculé. Personne ne te l'a fait signer, c'est arrivé tout seul, à force de petits arrangements raisonnables.\n\nColes`,
    ],
  },
  {
    id: 'coles_texture_zone',
    pnj: 'coles',
    trigger: 'texture:zone_pure',
    weight: 1.5,
    title: 'Du travail propre',
    bodies: [
      `Je dis « propre » au sens où ça rapporte.\n\nProduit sale, méthode sale, marge excellente. Certains font des façons ; toi, tu fais des chiffres. Les comptoirs adorent.\n\nColes`,
      `Cinq lots comme ça, coup sur coup. Tu ne fais même plus semblant.\n\nC'est reposant, franchement. Les gens qui se donnent bonne conscience sont épuisants à fréquenter.\n\nColes`,
    ],
  },
  {
    id: 'coles_habit_break',
    pnj: 'coles',
    trigger: 'habit_break',
    weight: 1,
    title: 'Sans jugement',
    bodies: [
      `On m'a dit que t'avais craqué.\n\nJe suis douanier, pas curé. Dans ce métier, j'ai vu tomber des types beaucoup plus solides que toi pour beaucoup moins que ça.\n\nTu recommences demain. C'est tout ce que ça veut dire, demain.\n\nColes`,
      `Une rechute, c'est une ligne dans un carnet. Ce qui compte, c'est la page.\n\nJe ne te dirai pas ça deux fois — ma réputation en prendrait un coup.\n\nColes`,
    ],
  },
  {
    id: 'coles_debt_cleared',
    pnj: 'coles',
    trigger: 'debt_cleared',
    weight: 2,
    title: 'Solde de tout compte',
    bodies: [
      `La dette de ton oncle est éteinte. J'ai barré la ligne moi-même, ça fait toujours un petit quelque chose.\n\nIl aurait pu s'en sortir, lui aussi. Il a préféré attendre que ça passe. Ça n'est jamais passé.\n\nTu es un client sérieux. Retiens que c'est un compliment rare.\n\nColes`,
      `Payé. Rubis sur l'ongle, comme on dit chez les gens qui n'ont jamais manipulé de rubis.\n\nTu ne me dois plus rien. C'est un état provisoire, mais profites-en.\n\nColes`,
    ],
  },
];

// ---------------------------------------------------------------------------
// REYES — le Courtier
// ---------------------------------------------------------------------------

const REYES: LetterTemplate[] = [
  {
    id: 'reyes_kess_500',
    pnj: 'reyes',
    trigger: 'kess:500',
    weight: 1,
    title: 'Note de marché',
    bodies: [
      `NOTE — secteur nord, atelier Kessler.\n\nVolume cumulé : {amount} ₭. Tendance : ascendante.\nDeux acheteurs se sont renseignés cette semaine. Un troisième s'est abstenu, ce qui est plus intéressant.\n\nJe ne vends pas d'information. Je vends l'accès. Vous savez où me trouver.\n\nR.`,
      `Position au 1er du mois : vous existez.\n\nCe n'était pas acquis il y a deux mois. Un atelier qui franchit cette barre entre dans mes tableaux ; ce qui entre dans mes tableaux finit par être coté.\n\nR.`,
    ],
  },
  {
    id: 'reyes_synth',
    pnj: 'reyes',
    trigger: 'machine_built:synthesizer',
    weight: 1,
    title: 'Proposition chiffrée',
    bodies: [
      `Vous avez monté un synthétiseur. Je vous propose ceci, sans détour :\n\n— Marché Coopérative : lent, sûr, tarif plafonné.\n— Marché Zone : rapide, volatil, tarif libre.\n— Les deux : possible. Commission de 15 % sur l'ensemble.\n\nLa troisième option est la mienne. Je ne prétendrai pas qu'elle est la meilleure pour vous ; elle est la seule qui ne vous ferme aucune porte.\n\nR.`,
      `{machine} en service. Bien.\n\nÀ partir de cette machine, ce que vous fabriquez cesse d'être une question technique pour devenir une question de client. Je connais les deux catégories de clients. C'est tout mon métier.\n\nR.`,
    ],
  },
  {
    id: 'reyes_event_kess',
    pnj: 'reyes',
    trigger: 'event_resolved:kess',
    weight: 0.8,
    title: 'Anecdote',
    bodies: [
      `Un homme que je connaissais réglait toujours ses ennuis en liquide. Il disait que c'était le seul moyen de dormir.\n\nIl dormait très bien, effectivement. Jusqu'au jour où il n'a plus eu de liquide, et là il s'est aperçu qu'il n'avait plus d'amis non plus — il les avait tous payés.\n\nVous avez bien fait. Je dis seulement que ça se compte.\n\nR.`,
      `Réglé en espèces, donc réglé sans trace.\n\nC'est la solution la plus chère et la plus propre. Dans mon métier, on appelle ça acheter du silence au détail : ça revient toujours plus cher qu'en gros.\n\nR.`,
    ],
  },
  {
    id: 'reyes_event_reputation',
    pnj: 'reyes',
    trigger: 'event_resolved:reputation',
    weight: 1,
    title: 'Sur le crédit',
    bodies: [
      `Vous avez payé avec votre nom. C'est une monnaie curieuse : elle ne s'épuise pas quand on la dépense, elle se déprécie.\n\nÀ ma connaissance, personne n'a jamais réussi à en racheter d'un coup. Ça se reconstitue lentement, ou pas.\n\nR.`,
      `NOTE — ajustement de cotation.\n\nVotre crédit auprès d'une des trois maisons a été revu à la baisse. Les deux autres n'ont rien vu, pour l'instant : l'information circule mal entre juridictions, c'est le seul avantage de cette vallée.\n\nR.`,
    ],
  },
  {
    id: 'reyes_band_neutral',
    pnj: 'reyes',
    trigger: 'band:neutral',
    weight: 1,
    title: 'Entre les deux',
    bodies: [
      `Vous ne penchez d'aucun côté. Je sais ce que ça coûte, je prends la commission dessus.\n\nCe n'est pas une position confortable : la Coopérative vous surveille, la Zone vous jauge, et aucune des deux ne vous défendra. En échange, vous vendez partout.\n\nNi un empire, ni une légende. Un survivant. On sous-estime beaucoup cette catégorie.\n\nR.`,
      `Votre dossier revient au centre du tableau.\n\nLes deux camps vous croient à eux. Tant qu'ils le croient tous les deux, vous êtes tranquille — et je suis payé.\n\nR.`,
    ],
  },
  {
    id: 'reyes_texture_vice',
    pnj: 'reyes',
    trigger: 'texture:vice_artisan',
    weight: 1.5,
    title: 'Observation professionnelle',
    bodies: [
      `Vous fabriquez des choses nuisibles avec un soin irréprochable. Filtres changés, rejets traités, dosages exacts.\n\nJe n'ai pas d'avis moral — je n'en vends pas. J'observe seulement que c'est rare, et que ce qui est rare se cote.\n\nR.`,
      `Un artisan du vice. C'est le terme qu'un vieux courtier employait pour ce genre de dossier.\n\nIl ajoutait que ces gens-là finissent toujours par se poser la question au mauvais moment : pas au début, quand ça n'aurait rien coûté. À la fin.\n\nR.`,
    ],
  },
  {
    id: 'reyes_streak_30',
    pnj: 'reyes',
    trigger: 'streak:30',
    weight: 1,
    title: 'Hors sujet',
    bodies: [
      `{streak} jours. Ce n'est pas une donnée de marché, et pourtant j'en tiens compte.\n\nDans cette vallée, tout le monde promet de la régularité et personne n'en produit. Un fournisseur régulier vaut deux fournisseurs doués.\n\nR.`,
      `On m'a rapporté votre série de {streak} jours.\n\nJe note dans mes tableaux une colonne que je n'ouvre presque jamais : fiabilité observée. Vous y êtes.\n\nR.`,
    ],
  },
  {
    id: 'reyes_contract_done',
    pnj: 'reyes',
    trigger: 'contract_done',
    weight: 1,
    title: 'Livraison honorée',
    bodies: [
      `Le contrat est soldé. Les caisses sont parties, la contrepartie est éteinte.\n\nUn conseil que je ne facture pas : ceux qui honorent leurs engagements se voient proposer des engagements plus lourds. C'est le seul défaut de la fiabilité.\n\nR.`,
      `Livré dans les délais. C'est noté, et c'est déjà revendu comme information à qui de droit — pas contre vous, rassurez-vous. En votre faveur.\n\nR.`,
    ],
  },
];

export const LETTER_TEMPLATES: LetterTemplate[] = [...VOSS, ...COLES, ...REYES];

// ---------------------------------------------------------------------------
// Lettres d'ouverture — SEUL contenu narratif écrit en dur (docs/07 §5)
// ---------------------------------------------------------------------------

export interface ScriptedLetter {
  id: string;
  pnj: PnjId | 'notary';
  title: string;
  body: string;
  /** Jour de délivrance après le début de partie. */
  dayOffset: number;
}

export const OPENING_LETTERS: ScriptedLetter[] = [
  {
    id: 'scripted_notary',
    pnj: 'notary',
    title: "Succession Marbaix — remise des clés",
    body: `Monsieur, Madame,

Nous vous confirmons la remise en votre possession du local sis 4, passage des Vernis, Zone Franche de Kessler, ainsi que de son matériel en l'état, par suite du décès de votre oncle.

Le local est un ancien atelier de facture d'instruments, converti par le défunt en laboratoire de chimie appliquée. Nous attirons votre attention sur le fait que la succession comprend le passif : les créances non soldées suivent le bien.

L'établi, les gabarits et l'outillage de lutherie sont restés au mur. Le défunt avait demandé qu'on n'y touche pas.

Il vous reste à décider ce que cet atelier produira. Commencez par noter ce que vous avez à faire — le reste suivra, c'est du moins ce que votre oncle prétendait.

Cabinet Marbaix, notaires associés.`,
    dayOffset: 0,
  },
  {
    id: 'scripted_coles',
    pnj: 'coles',
    title: 'Un détail à régler',
    body: `Bonjour et bienvenue dans la vallée.

Je me présente : sergent Coles, poste nord. J'ai bien connu votre oncle. Un homme charmant, très mauvais payeur.

Il restait cinq cents kess sur son ardoise quand il est parti. Je n'ai pas eu le cœur de réclamer à l'époque — les circonstances, tout ça. Mais une ardoise, ça ne s'efface pas tout seul, ça change juste de nom en haut de la colonne.

Rien d'urgent. Je dis toujours ça au début.

Bonne installation.

Coles`,
    dayOffset: 1,
  },
  {
    id: 'scripted_voss',
    pnj: 'voss',
    title: "Régime applicable à votre atelier",
    body: `Madame, Monsieur,

Le service de la Coopérative des chimistes agréés a été informé de la reprise de l'atelier du passage des Vernis.

Deux régimes s'offrent à vous. Le régime agréé : déclarations, quotas, contrôles, et en contrepartie l'accès aux circuits réguliers et aux dispositifs de soutien. Le régime non déclaré : je n'en détaillerai pas les avantages, d'autres s'en chargeront avant la fin de la semaine.

Votre oncle avait choisi. Je ne vous demande pas de choisir comme lui, seulement de choisir sciemment.

Le dossier d'agrément s'ouvre par la production. Produisez, déclarez, et nous verrons.

I. Voss, inspectrice.`,
    dayOffset: 2,
  },
];
