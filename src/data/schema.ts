/**
 * Modèle de données normatif (docs/10). Un seul objet sérialisable JSON.
 * Aucune classe, aucune référence circulaire : tout est clonable/sérialisable.
 */

import type { DayKey, Timestamp } from '../game-logic/time';
import { BALANCE } from '../game-logic/balance';
import { STREAM_NAMES, type StreamName } from '../game-logic/rng';

export type { DayKey, Timestamp };

export const SCHEMA_VERSION = 2;

// ---------------------------------------------------------------- ressources

/**
 * Une seule monnaie : le kessler (₭). Tout ce qui rapporte — une tâche cochée
 * comme un produit vendu — rapporte des ₭ ; tout ce qui coûte se paie en ₭.
 * Les autres ressources sont des matières, jamais des monnaies.
 */
export type ResourceId =
  | 'kess'
  | 'harvest_med'
  | 'harvest_ind'
  | 'harvest_rec'
  | 'harvest_tox'
  | 'pa_med'
  | 'pa_ind'
  | 'pa_rec'
  | 'pa_tox';

export const RESOURCE_IDS: ResourceId[] = [
  'kess',
  'harvest_med',
  'harvest_ind',
  'harvest_rec',
  'harvest_tox',
  'pa_med',
  'pa_ind',
  'pa_rec',
  'pa_tox',
];

// ------------------------------------------------------------------ domaines

export type TechId = 'extractor_bp' | 'farm_bp' | 'still_bp' | 'conveyor' | 'adv_synthesis' | 'catalysis';
export type MachineTemplateId = 'extractor' | 'still' | 'synthesizer';
export type PlantId = 'medicinal' | 'industrial' | 'recreational' | 'toxic';
export type PnjId = 'voss' | 'coles' | 'reyes';
export type CorruptionKey = 1 | 2 | 3;

export type RecipeId =
  | 'extract_med'
  | 'extract_ind'
  | 'extract_rec'
  | 'extract_tox'
  | 'tonic'
  | 'remedy_std'
  | 'remedy_premium'
  | 'raw_extract'
  | 'active_compound'
  | 'refined_product';

export type EndTag = 'beneficial' | 'neutral' | 'harmful';
export type MeansTag = 'clean' | 'dirty';
export type Texture = 'aligned' | 'cynical' | 'neutral' | 'careless' | 'vice_artisan' | 'zone_pure';
export type Band = 'coop' | 'neutral' | 'zone';
export type Category = 'perso' | 'pro';
export type Difficulty = 1 | 2 | 3 | 4;

// --------------------------------------------------------------------- todos

export interface TodoBase {
  id: string;
  title: string;
  category: Category;
  difficulty: Difficulty;
  gain: { resource: ResourceId; amount: number } | null;
  loss: { resource: ResourceId; amount: number } | null;
  createdAt: Timestamp;
  archived: boolean;
  /** `gained` : les ₭ effectivement crédités ce jour-là par cette todo. */
  completionHistory: { day: DayKey; gained: number }[];
  /** Dernière perte appliquée — permet de l'annuler via « fait hier » (docs/03 §8). */
  lastLoss: { day: DayKey; resource: ResourceId; amount: number } | null;
}

export interface OneshotTodo extends TodoBase {
  kind: 'oneshot';
  dueAt: Timestamp | null;
  completedAt: Timestamp | null;
}

export type Frequency = 'daily' | 'weekly' | 'monthly' | { everyNDays: number };
export type RecurrenceMode = 'fixed' | 'flexible' | 'multiDaily';

export interface RecurringTodo extends TodoBase {
  kind: 'recurring';
  frequency: Frequency;
  mode: RecurrenceMode;
  /** N : occurrences requises (flexible / multiDaily). */
  target: number;
  /** 1-7 (hebdo, lundi = 1) ou 1-31 (mensuel). */
  fixedDays: number[];
  periodProgress: { periodKey: string; done: number; misses: number };
}

export interface HabitTodo extends TodoBase {
  kind: 'habit';
  habitKind: 'abstinence' | 'counter';
  thresholds: { s1: number; s2: number } | null;
  streak: number;
  todayCount: number;
  failedToday: boolean;
  dailyHistory: { day: DayKey; count: number; penalty: number }[];
}

export type Todo = OneshotTodo | RecurringTodo | HabitTodo;

// ---------------------------------------------------------------------- labo

export interface MachineInstance {
  templateId: MachineTemplateId;
  displayName: string;
  mk: 1 | 2;
  assignedRecipe: RecipeId | null;
  means: MeansTag;
  run: { startedAt: Timestamp; endsAt: Timestamp; recipe: RecipeId } | null;
}

export interface LabState {
  researched: TechId[];
  machines: MachineInstance[];
  pollution: number;
}

// ------------------------------------------------------------------- farming

export type PlotState =
  | { kind: 'empty' }
  | { kind: 'growing'; plant: PlantId; method: 'agro' | 'intensive'; startedAt: Timestamp; endsAt: Timestamp }
  | { kind: 'ready'; plant: PlantId; method: 'agro' | 'intensive'; yield: number }
  | { kind: 'fallow'; since: Timestamp };

export interface Plot {
  id: string;
  envDebt: number;
  state: PlotState;
}

export interface FarmState {
  /** Vide tant que la « Remise en culture » n'est pas recherchée (docs/05 §0). */
  plots: Plot[];
  /** Graines déjà en stock (offertes au déblocage ou gagnées) — consommées avant tout achat. */
  seedStock: Partial<Record<PlantId, number>>;
}

// ---------------------------------------------------------------- fournisseur

/** Le Fournisseur : achat d'intrants au comptant, dans la limite du quota du jour. */
export interface SupplyState {
  boughtToday: number;
}

// ---------------------------------------------------- corruption & alignement

export type PaymentMode = 'kess' | 'reputation' | 'service' | 'accept' | 'refuse';

export interface CorruptionEventOption {
  pay: PaymentMode;
  /** ₭ (kess), points de réputation (reputation), quantité à livrer (service). */
  cost: number;
  label: string;
}

export interface CorruptionEvent {
  id: string;
  /** `sanction` : incident à régler. `offer` : proposition spontanée, refusable. */
  kind: 'sanction' | 'offer';
  triggerId: string;
  pnj: PnjId;
  gravity: 1 | 2 | 3;
  title: string;
  body: string;
  createdAt: Timestamp;
  options: CorruptionEventOption[];
  /** Produit demandé si résolution « service ». */
  contractRecipe: RecipeId;
  contractHours: number;
  /** Faveur rappelée par cet événement, le cas échéant. */
  recallsFavorId: string | null;
}

export interface Favor {
  id: string;
  pnj: PnjId;
  origin: string;
  day: DayKey;
  repaid: boolean;
}

export interface Contract {
  recipe: RecipeId;
  remaining: number;
  total: number;
  deadline: Timestamp;
  pnj: PnjId;
  favorId: string | null;
}

export interface CorruptionState {
  keys: CorruptionKey[];
  taxRate: number;
  illegalCyclesSinceEvent: number;
  pendingEvent: CorruptionEvent | null;
  lastEventTriggerId: string | null;
  favors: Favor[];
  activeContract: Contract | null;
  openingDebt: number;
  /** Suivi des rappels de dette déjà envoyés (jours écoulés depuis le début). */
  debtRemindersSent: number;
  lastDebtEventAt: Timestamp | null;
}

export interface AlignmentState {
  score: number;
  legalSalesToday: number;
  soldLegalToday: boolean;
  soldIllegalToday: boolean;
  reputation: { coop: number; zone: number; broker: number };
  subsidyActive: boolean;
  lastSubsidyWeek: string | null;
}

// ------------------------------------------------------------------ narratif

export interface Letter {
  id: string;
  templateId: string;
  pnj: PnjId | 'notary';
  day: DayKey;
  at: Timestamp;
  title: string;
  body: string;
  read: boolean;
}

export interface QueuedLetter {
  templateId: string;
  pnj: PnjId | 'notary';
  title: string;
  body: string;
  queuedAt: Timestamp;
  priority: boolean;
}

export interface RegistryLine {
  at: Timestamp;
  text: string;
  tone: 'neutral' | 'good' | 'bad';
}

export interface NarrativeState {
  letters: Letter[];
  letterQueue: QueuedLetter[];
  lettersToday: number;
  servedTemplates: { templateId: string; lastServedDay: DayKey }[];
  registry: RegistryLine[];
  /** Déclencheurs uniques déjà consommés (paliers, seuils…). */
  firedTriggers: string[];
}

// ---------------------------------------------------------------- statistiques

export interface Stats {
  kessEarnedTotal: number;
  /** Part des gains venant des todos — sert au bilan du Carnet et à l'équilibrage. */
  kessFromTodos: number;
  /** Part venant de la production du labo. La somme des deux ≈ kessEarnedTotal. */
  kessFromProduction: number;
  salesLegal: number;
  salesIllegal: number;
  cyclesCompleted: number;
  harvests: number;
  machinesBuilt: number;
  longestStreak: number;
  todosCompleted: number;
  daysPlayed: number;
  textureCounts: Record<Texture, number>;
  eventsResolved: number;
  contractsHonored: number;
  contractsFailed: number;
}

// -------------------------------------------------------------------- réglages

/**
 * Où les fenêtres se placent dans la pile du bureau.
 *  • `desktop` — sous toutes les applications, posées sur le fond d'écran ;
 *    c'est le comportement d'un widget et le défaut ;
 *  • `normal`  — fenêtres ordinaires, elles passent devant si on les clique ;
 *  • `top`     — toujours au-dessus de tout.
 */
export type WindowLayer = 'desktop' | 'normal' | 'top';

export interface Settings {
  layer: WindowLayer;
  opacity: number;
  windowPos: { x: number; y: number; w: number; h: number } | null;
  collapsedPanels: Record<string, boolean>;
  quietMode: boolean;
  reducedMotion: boolean;
}

// ------------------------------------------------------------------ GameState

export interface GameState {
  meta: {
    version: number;
    seed: number;
    rngCounters: Record<StreamName, number>;
    createdAt: Timestamp;
    lastTickAt: Timestamp;
    lastSavedAt: Timestamp;
    lastDayProcessed: DayKey;
  };
  settings: Settings;
  todos: Todo[];
  resources: Record<ResourceId, number>;
  lab: LabState;
  farm: FarmState;
  supply: SupplyState;
  corruption: CorruptionState;
  alignment: AlignmentState;
  narrative: NarrativeState;
  stats: Stats;
}

// ------------------------------------------------------------- état initial

function emptyResources(): Record<ResourceId, number> {
  const r = {} as Record<ResourceId, number>;
  for (const id of RESOURCE_IDS) r[id] = 0;
  return r;
}

function emptyTextures(): Record<Texture, number> {
  return { aligned: 0, cynical: 0, neutral: 0, careless: 0, vice_artisan: 0, zone_pure: 0 };
}

function zeroCounters(): Record<StreamName, number> {
  const c = {} as Record<StreamName, number>;
  for (const n of STREAM_NAMES) c[n] = 0;
  return c;
}

export function createInitialState(now: Timestamp, seed: number, dayKeyFn: (ts: Timestamp) => DayKey): GameState {
  return {
    meta: {
      version: SCHEMA_VERSION,
      seed,
      rngCounters: zeroCounters(),
      createdAt: now,
      lastTickAt: now,
      lastSavedAt: now,
      lastDayProcessed: dayKeyFn(now),
    },
    settings: {
      layer: 'desktop',
      opacity: 0.94,
      windowPos: null,
      collapsedPanels: { later: true, rd: true, production: true, farm: true, log: false },
      quietMode: false,
      reducedMotion: false,
    },
    todos: [],
    resources: { ...emptyResources(), kess: BALANCE.start.kess },
    lab: { researched: [], machines: [], pollution: 0 },
    // pas de parcelle au départ : la friche est en jachère jusqu'à la remise
    // en culture, et les intrants s'achètent au Fournisseur (docs/05 §0)
    farm: { plots: [], seedStock: {} },
    supply: { boughtToday: 0 },
    corruption: {
      keys: [],
      taxRate: 0,
      illegalCyclesSinceEvent: 0,
      pendingEvent: null,
      lastEventTriggerId: null,
      favors: [],
      activeContract: null,
      openingDebt: BALANCE.start.openingDebt,
      debtRemindersSent: 0,
      lastDebtEventAt: null,
    },
    alignment: {
      score: 0,
      legalSalesToday: 0,
      soldLegalToday: false,
      soldIllegalToday: false,
      reputation: { coop: 0, zone: 0, broker: 0 },
      subsidyActive: false,
      lastSubsidyWeek: null,
    },
    narrative: {
      letters: [],
      letterQueue: [],
      lettersToday: 0,
      servedTemplates: [],
      registry: [],
      firedTriggers: [],
    },
    stats: {
      kessEarnedTotal: 0,
      kessFromTodos: 0,
      kessFromProduction: 0,
      salesLegal: 0,
      salesIllegal: 0,
      cyclesCompleted: 0,
      harvests: 0,
      machinesBuilt: 0,
      longestStreak: 0,
      todosCompleted: 0,
      daysPlayed: 1,
      textureCounts: emptyTextures(),
      eventsResolved: 0,
      contractsHonored: 0,
      contractsFailed: 0,
    },
  };
}
