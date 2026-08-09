/**
 * TOUTES les constantes d'équilibrage du jeu (docs/02).
 * Règle dure : aucun nombre d'équilibrage ailleurs dans le code.
 */

import { HOUR, MINUTE, SECOND } from './time';

export const BALANCE = {
  // ---------- Todos & habitudes (docs/02 §4) ----------
  energyByDifficulty: { 1: 1, 2: 2, 3: 4, 4: 8 } as Record<number, number>,
  /** Bonus quand toutes les occurrences d'une période flexible sont validées. */
  flexiblePeriodBonus: 0.25,
  /** EN passif d'une habitude binaire : base + perStreak × streak, plafonné. */
  abstinence: { base: 1, perStreak: 0.1, dailyCap: 3, breakPenaltyPerStreak: 1, breakPenaltyCap: 30 },
  /** Pénalité d'habitude compteur (docs/02 §4). */
  counter: { lightPerUnit: 1, heavyFactor: 2, heavyExponent: 1.5, dailyCap: 40 },

  // ---------- Courbes de coût (docs/02 §5) ----------
  costGrowth: 1.12,

  // ---------- Machines (docs/02 §6) ----------
  machines: {
    extractor: { baseCycle: 60 * SECOND, research: 10, build: 0, upgrade: 200 },
    still: { baseCycle: 90 * SECOND, research: 40, build: 60, upgrade: 300 },
    synthesizer: { baseCycle: 120 * SECOND, research: 80, build: 150, upgrade: 400 },
  },
  /** durée(Mk) = base × mkSpeedFactor^(Mk-1) */
  mkSpeedFactor: 0.85,

  // ---------- Recherches (docs/04 §1) ----------
  research: { conveyor: 60, catalysis: 120 },
  catalysisSaleBonus: 0.1,
  /** Réduction des coûts de R&D restants quand la subvention est active. */
  subsidyResearchDiscount: 0.2,

  // ---------- Moyens (docs/02 §8) ----------
  means: {
    lab: { dirtySpeedGain: 0.25, dirtyPollutionPerCycle: 0.005 },
    farm: { agroSeedFactor: 1.2, agroDurationFactor: 1.2, agroDebtPerHarvest: -0.01, intensiveYieldFactor: 1.5, intensiveDebtPerHarvest: 0.02 },
  },
  pollution: { max: 0.5, cleanCostEnergy: 5, cleanAmount: 0.05 },
  envDebt: { max: 0.8, fallowPerHour: -0.02 },

  // ---------- Farming (docs/05 §1) ----------
  farm: { startingPlots: 2, maxPlots: 5, plotCosts: [100, 250, 600] },

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
    { key: 1 as const, price: 100, tax: 0.08 },
    { key: 2 as const, price: 400, tax: 0.12 },
    { key: 3 as const, price: 1600, tax: 0.15 },
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
  start: { openingDebt: 500, seeds: { medicinal: 3 } },

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
