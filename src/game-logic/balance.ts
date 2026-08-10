/**
 * TOUTES les constantes d'équilibrage du jeu (docs/02).
 * Règle dure : aucun nombre d'équilibrage ailleurs dans le code.
 */

import { HOUR, MINUTE, SECOND } from './time';

export const BALANCE = {
  // ---------- Todos & habitudes (docs/02 §4) ----------
  /** Cachet de base d'une tâche, en ₭, selon sa difficulté. */
  payoutByDifficulty: { 1: 3, 2: 6, 3: 12, 4: 24 } as Record<number, number>,
  /**
   * Ce que vaut une heure de votre temps, indexé sur ce que l'atelier sait
   * produire de mieux : cachet = barème × (meilleur prix de vente accessible ÷
   * cette référence). Sans indexation, une tâche cochée deviendrait dérisoire
   * dès la deuxième machine et le pilier du jeu — le travail réel finance le
   * labo — s'effondrerait. On indexe sur le catalogue plutôt que sur la
   * trésorerie : le cachet monte par paliers francs, jamais par à-coups.
   */
  payoutReference: 11,
  /** Bonus quand toutes les occurrences d'une période flexible sont validées. */
  flexiblePeriodBonus: 0.25,
  /** Rente passive d'une habitude tenue : base + perStreak × streak, plafonnée, en unités de cachet. */
  abstinence: { base: 1, perStreak: 0.1, dailyCap: 3, breakPenaltyPerStreak: 1, breakPenaltyCap: 30 },
  /** Pénalité d'habitude compteur (docs/02 §4), en unités de cachet. */
  counter: { lightPerUnit: 1, heavyFactor: 2, heavyExponent: 1.5, dailyCap: 40 },

  // ---------- Courbes de coût (docs/02 §5) ----------
  costGrowth: 1.12,

  // ---------- Machines (docs/02 §6) ----------
  machines: {
    extractor: { baseCycle: 60 * SECOND, research: 20, build: 0, upgrade: 1800 },
    still: { baseCycle: 90 * SECOND, research: 700, build: 400, upgrade: 2600 },
    synthesizer: { baseCycle: 120 * SECOND, research: 1400, build: 900, upgrade: 3600 },
  },
  /** durée(Mk) = base × mkSpeedFactor^(Mk-1) */
  mkSpeedFactor: 0.85,

  // ---------- Recherches (docs/04 §1) ----------
  research: { farm: 150, conveyor: 300, catalysis: 2600 },
  catalysisSaleBonus: 0.1,
  /** Réduction des coûts de R&D restants quand la subvention est active. */
  subsidyResearchDiscount: 0.2,

  // ---------- Moyens (docs/02 §8) ----------
  means: {
    lab: { dirtySpeedGain: 0.25, dirtyPollutionPerCycle: 0.005 },
    farm: { agroSeedFactor: 1.2, agroDurationFactor: 1.2, agroDebtPerHarvest: -0.01, intensiveYieldFactor: 1.5, intensiveDebtPerHarvest: 0.02 },
  },
  pollution: { max: 0.5, cleanCost: 120, cleanAmount: 0.05 },
  envDebt: { max: 0.8, fallowPerHour: -0.02 },

  // ---------- Farming (docs/05 §1) ----------
  farm: { startingPlots: 2, maxPlots: 5, plotCosts: [400, 900, 1800] },

  /**
   * Le Fournisseur (docs/05 §0) : avant la remise en culture, les récoltes
   * s'achètent. Le prix est un multiple du coût d'une graine ramené à l'unité,
   * de sorte que cultiver reste toujours nettement moins cher — c'est la
   * récompense du déblocage, et non un simple changement d'écran.
   */
  supply: {
    markup: 2.6,
    minPrice: 2,
    /**
     * Ce que la Zone laisse passer en un jour. Sans ce plafond, acheter serait
     * illimité et cultiver n'aurait aucun intérêt : le quota est ce qui fait de
     * la remise en culture un vrai palier et non un simple changement d'écran.
     */
    dailyQuota: 12,
    /** Chaque parcelle exploitée assouplit un peu le quota (docs/05 §0). */
    quotaPerPlot: 3,
  },

  // ---------- Ventes & bandes (docs/02 §9) ----------
  brokerCommission: 0.15,
  bands: {
    coop: { threshold: 30, legalSale: 0.25, illegalSale: 0, eventChanceFactor: 1.4 },
    zone: { threshold: -30, legalSale: -0.1, illegalSale: 0.1, eventChanceFactor: 1 },
    neutral: { legalSale: 0, illegalSale: 0, eventChanceFactor: 1, reputationLossFactor: 1.5 },
  },
  subsidy: { minReputation: 20, weeklyKess: 100 },

  // ---------- Corruption (docs/02 §10, docs/06) ----------
  corruptionKeys: [
    { key: 1 as const, price: 300, tax: 0.1 },
    { key: 2 as const, price: 1200, tax: 0.15 },
    { key: 3 as const, price: 3600, tax: 0.2 },
  ],
  events: {
    baseChance: 1 / 17,
    cooldownCycles: 3,
    /** coût_base(gravité) = 30 × 2^(gravité-1) */
    costBase: 30,
    costGrowth: 2,
    /** Part de la richesse cumulée réclamée par gravité (plancher : le forfait). */
    wealthFactor: 0.02,
    reputationCostPerGravity: 10,
    contract: { quantityPerGravity: 2, hoursPerGravity: 6 },
  },

  // ---------- Alignement (docs/06 §4) ----------
  alignment: {
    min: -100,
    max: 100,
    dailyDecay: 0.5,
    legalSale: 1,
    legalSaleDailyCap: 5,
    illegalSale: -1,
    illegalSaleHarmful: -2,
    buyKey: -5,
    payReputation: -1,
    payService: -2,
    refuseFavor: 3,
    acceptFavor: -3,
    acceptSubsidy: 2,
  },
  reputation: {
    min: -100,
    max: 100,
    legalDay: 2,
    illegalDay: 1,
    brokerDay: 1,
    contractHonored: 5,
    contractFailed: -15,
  },

  // ---------- Temps & offline (docs/02 §11, DEC-11) ----------
  offlineProductionCap: 12 * HOUR,
  /** Au-delà de ce delta, on considère qu'on rattrape du temps (pas de tirage d'événement). */
  catchUpThreshold: 90 * SECOND,

  // ---------- Démarrage (DEC-10) ----------
  /** `kess` : de quoi acheter les premiers intrants avant la première tâche cochée. */
  start: { openingDebt: 500, kess: 35, seedsOnFarmUnlock: { medicinal: 3 } },

  // ---------- Narratif (docs/07 §4) ----------
  letters: { maxPerDay: 2, freshnessPenalty: 4, freshnessDays: 10 },
  debtReminders: { firstDays: 7, secondDays: 14, eventEveryDays: 10 },

  // ---------- Divers ----------
  undoWindow: 10 * SECOND,
  registryMaxLines: 500,
  completionHistoryDays: 365,
  tickInterval: 1 * SECOND,
  autosaveDebounce: 2 * SECOND,
  autosaveInterval: 30 * SECOND,
} as const;

/**
 * Valeur d'une « unité de cachet » pour un catalogue donné. Toute rémunération
 * et toute pénalité du module Todos est exprimée en unités, puis multipliée
 * ici — un seul endroit à régler.
 *
 * `bestSalePrice` : le meilleur prix de vente d'une recette réellement
 * accessible au joueur (cf. `unitValue` dans todos.ts).
 */
export function payoutUnit(bestSalePrice: number): number {
  return Math.max(1, bestSalePrice / BALANCE.payoutReference);
}

/** cost(n) = ceil(base × 1.12^n) — docs/02 §5. */
export function scaledCost(base: number, owned: number): number {
  return Math.ceil(base * Math.pow(BALANCE.costGrowth, owned));
}

/** durée(Mk) = base × 0.85^(Mk-1) — docs/02 §6. */
export function cycleDuration(baseCycle: number, mk: number): number {
  return Math.round(baseCycle * Math.pow(BALANCE.mkSpeedFactor, mk - 1));
}

/**
 * Coût en argent d'un incident : forfait 30 × 2^(gravité−1), relevé à une part
 * de la richesse cumulée pour rester mordant en fin de partie (docs/08 §6).
 */
export function eventBaseCost(gravity: number, wealthEarned = 0): number {
  const flat = BALANCE.events.costBase * Math.pow(BALANCE.events.costGrowth, gravity - 1);
  const scaled = gravity * BALANCE.events.wealthFactor * wealthEarned;
  return Math.ceil(Math.max(flat, scaled));
}

export { MINUTE, HOUR, SECOND };
