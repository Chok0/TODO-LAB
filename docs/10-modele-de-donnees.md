# 10 — Modèle de données

Source de vérité unique : un objet **`GameState`** sérialisable en JSON (DEC-02). Ce document est normatif ; le fichier `/src/data/schema.ts` doit lui correspondre.

## 1. Correspondance domaine FR → code EN (DEC-04)

| Terme métier (docs/UI) | Identifiant code |
|---|---|
| Todo ponctuelle / récurrente / habitude | `kind: 'oneshot' \| 'recurring' \| 'habit'` |
| Fréquence / mode / N / jours fixes | `frequency` / `mode` / `target` / `fixedDays` |
| Habitude binaire (abstinence) / compteur | `habitKind: 'abstinence' \| 'counter'` |
| Difficulté trivial/facile/normal/corvée | `difficulty: 1 \| 2 \| 3 \| 4` |
| Perso / pro | `category: 'perso' \| 'pro'` (valeurs FR conservées : ce sont des données, pas des identifiants) |
| Énergie / Kess | `energy` / `kess` |
| Principe actif | `pa_med`, `pa_ind`, `pa_rec`, `pa_tox` (ResourceId) |
| Clé de corruption | `corruptionKey` |
| Faveur due | `favor` |
| Dette environnementale / pollution | `envDebt` / `pollution` |
| Fin / Moyens / texture | `endTag` / `meansTag` / `texture` |
| Bande (Coopérative/neutre/Zone) | `band: 'coop' \| 'neutral' \| 'zone'` |

## 2. Schéma TypeScript (V1 — normatif)

```ts
type Timestamp = number;            // ms epoch UTC
type DayKey = string;               // 'YYYY-MM-DD' calendrier local

type ResourceId =
  | 'energy' | 'kess'
  | 'harvest_med' | 'harvest_ind' | 'harvest_rec' | 'harvest_tox'
  | 'pa_med' | 'pa_ind' | 'pa_rec' | 'pa_tox';   // extensible V2 (minerais)

interface GameState {
  meta: {
    version: number;                // version de schéma, incrémentée à chaque migration
    seed: number;                   // seed racine RNG (DEC-05)
    createdAt: Timestamp;
    lastTickAt: Timestamp;          // borne 'from' du prochain advanceTime
    lastSavedAt: Timestamp;
  };
  settings: Settings;
  todos: Todo[];
  resources: Record<ResourceId, number>;
  lab: LabState;
  farm: FarmState;
  corruption: CorruptionState;
  alignment: AlignmentState;
  narrative: NarrativeState;
  stats: Stats;                     // compteurs cumulés (paliers, textures, ventes)
}

interface Settings {
  alwaysOnTop: boolean;
  opacity: number;                  // 0.6–1
  windowPos: { x: number; y: number; w: number; h: number } | null;
  collapsedPanels: Record<string, boolean>;  // sauf panneau habitudes (replié à chaque démarrage, 03 §1.3)
  quietMode: boolean;               // tout replié en barre fine
}

// ---------- Todos ----------

interface TodoBase {
  id: string;
  title: string;
  category: 'perso' | 'pro';
  difficulty: 1 | 2 | 3 | 4;
  gain: { resource: ResourceId; amount: number } | null;
  loss: { resource: ResourceId; amount: number } | null;
  createdAt: Timestamp;
  archived: boolean;
  completionHistory: { day: DayKey; energyGained: number }[]; // borné 365 j puis agrégé
}

interface OneshotTodo extends TodoBase {
  kind: 'oneshot';
  dueAt: Timestamp | null;
  completedAt: Timestamp | null;
}

interface RecurringTodo extends TodoBase {
  kind: 'recurring';
  frequency: 'daily' | 'weekly' | 'monthly' | { everyNDays: number };
  mode: 'fixed' | 'flexible' | 'multiDaily';
  target: number;                   // N (flexible / multiDaily)
  fixedDays: number[];              // 1-7 (hebdo, lundi=1) ou 1-31 (mensuel)
  periodProgress: { periodKey: string; done: number; misses: number };
}

interface HabitTodo extends TodoBase {
  kind: 'habit';
  habitKind: 'abstinence' | 'counter';
  thresholds: { s1: number; s2: number } | null;  // counter uniquement (03 §1.3)
  streak: number;                                  // abstinence
  todayCount: number;                              // counter, reset à minuit
  failedToday: boolean;                            // abstinence («j'ai craqué»)
  dailyHistory: { day: DayKey; count: number; penalty: number }[]; // counter, illimité V1
}

type Todo = OneshotTodo | RecurringTodo | HabitTodo;

// ---------- Labo ----------

interface LabState {
  researched: TechId[];             // 'extractor_bp' | 'still_bp' | 'conveyor' | 'adv_synthesis' | 'catalysis'
  machines: MachineInstance[];
  pollution: number;                // 0–0.5
}

interface MachineInstance {
  templateId: 'extractor' | 'still' | 'synthesizer';   // + press/catalyst V1.5
  displayName: string;              // grammaire de nommage (08 §3), figé à la construction
  mk: 1 | 2;
  assignedRecipe: RecipeId | null;  // pour l'extracteur : type de récolte assigné
  means: 'clean' | 'dirty';         // mémorisé par machine (04 §3)
  run: { startedAt: Timestamp; endsAt: Timestamp; recipe: RecipeId } | null;
}

// ---------- Farming ----------

interface FarmState {
  plots: Plot[];
  unlockedPlants: PlantId[];
}

interface Plot {
  id: string;
  envDebt: number;                  // 0–0.8
  state:
    | { kind: 'empty' }
    | { kind: 'growing'; plant: PlantId; method: 'agro' | 'intensive'; endsAt: Timestamp }
    | { kind: 'ready';   plant: PlantId; method: 'agro' | 'intensive'; yield: number }
    | { kind: 'fallow';  since: Timestamp };
}

// ---------- Corruption / alignement ----------

interface CorruptionState {
  keys: (1 | 2 | 3)[];              // clés possédées
  taxRate: number;                  // dérivable mais stocké pour lisibilité save (invariant §5)
  illegalCyclesSinceEvent: number;
  pendingEvent: CorruptionEvent | null;      // un seul à la fois
  lastEventTriggerId: string | null;         // anti-répétition
  favors: { id: string; pnj: PnjId; origin: string; date: DayKey; repaid: boolean }[];
  activeContract: { product: RecipeId; remaining: number; deadline: Timestamp; favorId: string | null } | null;
  openingDebt: number;              // 500 → 0 (DEC-10)
}

interface CorruptionEvent {
  id: string; triggerId: string; pnj: PnjId; gravity: 1 | 2 | 3;
  title: string; body: string;      // texte déjà généré (08 §6)
  createdAt: Timestamp;
  options: { pay: 'kess' | 'reputation' | 'service'; cost: number }[];
}

interface AlignmentState {
  score: number;                    // −100..+100, caché (06 §4)
  legalSalesToday: number;          // plafond quotidien de gain d'alignement
  reputation: { coop: number; zone: number; broker: number };
}

// ---------- Narratif ----------

type PnjId = 'voss' | 'coles' | 'reyes';

interface NarrativeState {
  letters: Letter[];                // archivées définitivement
  letterQueue: QueuedLetter[];      // anti-spam (07 §4)
  lettersToday: number;
  servedTemplates: { templateId: string; lastServedDay: DayKey }[];  // fraîcheur (08 §7)
  registry: RegistryLine[];         // fil d'activité factuel, borné aux 500 dernières lignes
}

interface Letter {
  id: string; templateId: string | 'scripted'; pnj: PnjId | 'notary';
  day: DayKey; title: string; body: string; read: boolean;
}
```

`Stats` : compteurs cumulés servant les paliers et textures — `kessEarnedTotal`, `salesLegal`, `salesIllegal`, `textureCounts: Record<Texture, number>`, `machinesBuilt`, `longestStreak`, `daysPlayed`… (liste close à établir au Goal 2 et documentée en commentaire de `schema.ts`).

## 3. État dérivé (jamais sauvegardé)

Calculé à la volée par des sélecteurs purs : prix effectifs (`02` §9), bande d'alignement, occurrences dues du jour (`dueOccurrences`), badges de dock, tendances du Carnet. **Règle : tout ce qui peut être dérivé n'est pas stocké** — les deux exceptions justifiées sont `taxRate` (lisibilité de la save) et `displayName` (figé par tirage RNG).

## 4. Format de sauvegarde et migrations

- `state.json` = `GameState` sérialisé tel quel (pretty-print 2 espaces pour la lisibilité/debug).
- `meta.version` démarre à 1. Toute évolution de schéma = fonction `migrateVN(state) → state` ajoutée au tableau de `/src/data/migrations.ts`, appliquées séquentiellement au chargement. Une migration ne supprime jamais de données utilisateur (todos, historiques, lettres) — elle transforme.
- Compatibilité V2 anticipée : `ResourceId` extensible, `stats` extensible, champ prestige absent mais ajoutable par migration sans casse.

## 5. Invariants (validés au chargement et en fin de chaque `advanceTime` en mode dev)

1. Toutes les ressources ≥ 0 (les réputations et l'alignement sont bornés à [−100, +100]).
2. `taxRate` = somme exacte des taxes des clés possédées ; `pollution ∈ [0, 0.5]` ; `envDebt ∈ [0, 0.8]`.
3. Au plus un `pendingEvent` ; `pendingEvent.options` contient exactement 3 modes distincts.
4. `run.endsAt > run.startedAt` ; aucun `endsAt` antérieur à `lastTickAt` après un `advanceTime` (tout cycle échu a été résolu).
5. `streak ≥ 0` ; `todayCount ≥ 0` ; une seule entrée `dailyHistory` par `day`.
6. `favor_recall` impossible sans faveur `repaid: false` (cohérence pools/état).
7. `meta.lastTickAt ≤ now` (après clamp de recul d'horloge, `09` §4).

En mode dev, une violation jette ; en production, elle est loguée et l'état est corrigé par clamp (jamais de crash utilisateur pour un invariant).
