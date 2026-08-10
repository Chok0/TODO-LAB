/** Toutes les intentions utilisateur. L'UI ne mute jamais l'état directement (docs/09 §3). */

import type {
  Category,
  CorruptionKey,
  Difficulty,
  Frequency,
  MachineTemplateId,
  MeansTag,
  PaymentMode,
  PlantId,
  RecipeId,
  RecurrenceMode,
  ResourceId,
  Settings,
  TechId,
} from '../data/schema';

export interface TodoDraft {
  title: string;
  category: Category;
  difficulty: Difficulty;
  kind: 'oneshot' | 'recurring' | 'habit';
  dueAt?: number | null;
  frequency?: Frequency;
  mode?: RecurrenceMode;
  target?: number;
  fixedDays?: number[];
  habitKind?: 'abstinence' | 'counter';
  thresholds?: { s1: number; s2: number } | null;
  gain?: { resource: ResourceId; amount: number } | null;
  loss?: { resource: ResourceId; amount: number } | null;
}

export type Action =
  // --- todos ---
  | { type: 'AddTodo'; draft: TodoDraft }
  | { type: 'UpdateTodo'; id: string; draft: TodoDraft }
  | { type: 'DeleteTodo'; id: string }
  | { type: 'CompleteTodo'; id: string }
  | { type: 'CompleteYesterday'; id: string }
  | { type: 'IncrementHabit'; id: string }
  | { type: 'BreakAbstinence'; id: string }
  // --- labo ---
  | { type: 'Research'; tech: TechId }
  | { type: 'BuildMachine'; machine: MachineTemplateId }
  | { type: 'UpgradeMachine'; machine: MachineTemplateId }
  | { type: 'AssignRecipe'; machine: MachineTemplateId; recipe: RecipeId | null }
  | { type: 'SetMeans'; machine: MachineTemplateId; means: MeansTag }
  | { type: 'StartCycle'; machine: MachineTemplateId }
  | { type: 'CleanLab' }
  // --- fournisseur ---
  | { type: 'BuySupply'; plant: PlantId; amount: number }
  // --- farming ---
  | { type: 'BuyPlot' }
  | { type: 'Plant'; plotId: string; plant: PlantId; method: 'agro' | 'intensive' }
  | { type: 'Harvest'; plotId: string }
  | { type: 'SetFallow'; plotId: string; on: boolean }
  // --- corruption ---
  | { type: 'BuyKey'; key: CorruptionKey }
  | { type: 'ResolveEvent'; mode: PaymentMode }
  | { type: 'RepayDebt'; amount: number }
  | { type: 'AcceptSubsidy' }
  // --- narratif & UI ---
  | { type: 'MarkLetterRead'; id: string }
  | { type: 'MarkAllLettersRead' }
  | { type: 'TogglePanel'; panel: string }
  | { type: 'UpdateSettings'; patch: Partial<Settings> };
