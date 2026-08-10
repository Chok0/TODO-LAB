/**
 * Pont entre le moteur (pur) et l'UI (docs/09 §2).
 * L'UI ne mute jamais l'état : elle envoie des actions et lit des stores.
 */

import { get, writable, derived } from 'svelte/store';
import type { Action } from '../game-logic/actions';
import { BALANCE } from '../game-logic/balance';
import type { Effect } from '../game-logic/effects';
import { advanceTime, applyAction, createGame, makeRng } from '../game-logic/engine';
import { freshSeed } from '../game-logic/rng';
import { currentBand, unreadLetters, readyPlots } from '../game-logic/selectors';
import { dayKey } from '../game-logic/time';
import { enforceInvariants } from '../data/migrations';
import { isTauri, loadGame, saveGame, serialize, deserialize } from '../data/save';
import { broadcastState, isHost, onAction, onState, sendAction } from './sync';
import { groupTodos } from '../game-logic/todos/views';
import type { GameState } from '../data/schema';

// ------------------------------------------------------------------- stores

export const game = writable<GameState>(createGame(Date.now(), 1));
export const ready = writable(false);
export const fatalError = writable<{ message: string; raw: string | null } | null>(null);

export interface Toast {
  id: number;
  text: string;
  tone: 'good' | 'bad' | 'neutral';
}
export const toasts = writable<Toast[]>([]);

export const undoLabel = writable<string | null>(null);

/** Une seule horloge : tout le reste en dérive. */
export const nowStore = writable(Date.now());

export const band = derived(game, ($g) => currentBand($g));
export const unread = derived(game, ($g) => unreadLetters($g));
export const plotsReady = derived(game, ($g) => readyPlots($g));

// -------------------------------------------------------------------- toasts

let toastId = 0;

function pushToast(text: string, tone: Toast['tone']): void {
  const id = ++toastId;
  toasts.update((list) => [...list.slice(-4), { id, text, tone }]);
  setTimeout(() => toasts.update((list) => list.filter((t) => t.id !== id)), 3200);
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

function toastFor(effect: Effect): void {
  switch (effect.kind) {
    case 'payout':
      pushToast(`+${fmt(effect.amount)} ₭`, 'good');
      break;
    case 'penalty':
      pushToast(`−${fmt(effect.amount)} ₭`, 'bad');
      break;
    case 'sale':
      pushToast(`${effect.label} · +${fmt(effect.kess)} ₭`, 'good');
      break;
    case 'harvest':
      pushToast(`Récolte · ${effect.amount}`, 'good');
      break;
    case 'supply_bought':
      pushToast(`Fournisseur · ${effect.amount} pour ${fmt(effect.cost)} ₭`, 'neutral');
      break;
    case 'farm_unlocked':
      pushToast('La friche est à vous', 'good');
      break;
    case 'letter':
      pushToast(`Courrier : ${effect.title}`, 'neutral');
      break;
    case 'event_triggered':
      pushToast(effect.title, 'bad');
      break;
    case 'seizure':
      pushToast(`Saisie : ${effect.lost}`, 'bad');
      break;
    case 'contract_done':
      pushToast('Contrat honoré', 'good');
      break;
    case 'contract_failed':
      pushToast('Contrat non honoré', 'bad');
      break;
    case 'research':
      pushToast(`Recherche : ${effect.label}`, 'good');
      break;
    case 'machine_built':
      pushToast(`Assemblé : ${effect.name}`, 'good');
      break;
    case 'blocked':
      pushToast(effect.reason, 'bad');
      break;
    case 'subsidy':
      pushToast(`Subvention · +${fmt(effect.kess)} ₭`, 'good');
      break;
    default:
      break;
  }
}

/** Les cycles produisent beaucoup d'effets : on n'en notifie qu'un échantillon. */
function pushToasts(effects: Effect[]): void {
  const notable = effects.filter((e) => e.kind !== 'cycle' && e.kind !== 'texture' && e.kind !== 'streak');
  if (notable.length > 4) {
    const sales = notable.filter((e) => e.kind === 'sale') as Extract<Effect, { kind: 'sale' }>[];
    const total = sales.reduce((s, e) => s + e.kess, 0);
    if (sales.length > 2) {
      pushToast(`${sales.length} ventes · +${fmt(total)} ₭`, 'good');
      for (const e of notable.filter((x) => x.kind !== 'sale').slice(0, 3)) toastFor(e);
      return;
    }
  }
  for (const e of notable.slice(0, 4)) toastFor(e);
}

// ------------------------------------------------------------------- undo

const UNDOABLE: Action['type'][] = ['CompleteTodo', 'CompleteYesterday', 'IncrementHabit', 'BreakAbstinence'];
let undoSnapshot: GameState | null = null;
let undoTimer: ReturnType<typeof setTimeout> | null = null;

function armUndo(before: GameState, label: string): void {
  undoSnapshot = before;
  undoLabel.set(label);
  if (undoTimer) clearTimeout(undoTimer);
  undoTimer = setTimeout(() => {
    undoSnapshot = null;
    undoLabel.set(null);
  }, BALANCE.undoWindow);
}

/**
 * Restaure l'instantané puis rejoue le temps écoulé : l'économie est
 * réellement recalculée, pas simplement masquée (docs/03 §5).
 */
export function undo(): void {
  if (!undoSnapshot) return;
  const restored = undoSnapshot;
  undoSnapshot = null;
  undoLabel.set(null);
  if (undoTimer) clearTimeout(undoTimer);

  const now = Date.now();
  const result = advanceTime(restored, restored.meta.lastTickAt, now, makeRng(restored));
  game.set(result.state);
  scheduleSave();
}

// ---------------------------------------------------------------- dispatch

export function dispatch(action: Action): void {
  // fenêtre cliente : l'action part à l'hôte, qui seul fait autorité
  if (!isHost()) {
    void sendAction(action);
    return;
  }
  applyLocally(action);
}

function applyLocally(action: Action): void {
  const before = get(game);
  const now = Date.now();
  const result = applyAction(before, action, now, makeRng(before));

  if (UNDOABLE.includes(action.type)) armUndo(before, labelFor(action));

  game.set(result.state);
  pushToasts(result.effects);
  scheduleSave();
  publish();
}

// ------------------------------------------------------------- diffusion

let publishTimer: ReturnType<typeof setTimeout> | null = null;

/** Diffuse l'état aux autres fenêtres, groupé pour éviter les rafales. */
function publish(): void {
  if (!isHost()) return;
  if (publishTimer) return;
  publishTimer = setTimeout(() => {
    publishTimer = null;
    void broadcastState(get(game));
  }, 120);
}

function labelFor(action: Action): string {
  switch (action.type) {
    case 'BreakAbstinence':
      return 'Rechute enregistrée';
    case 'IncrementHabit':
      return '+1 enregistré';
    default:
      return 'Tâche complétée';
  }
}

// -------------------------------------------------------------------- tick

let tickTimer: ReturnType<typeof setInterval> | null = null;

export function tick(): void {
  const now = Date.now();
  nowStore.set(now);
  // la fenêtre cliente n'a qu'une horloge d'affichage : elle ne simule rien
  if (!isHost()) return;

  const state = get(game);
  if (now <= state.meta.lastTickAt) return;

  const result = advanceTime(state, state.meta.lastTickAt, now, makeRng(state));
  game.set(result.state);
  if (result.effects.length) {
    pushToasts(result.effects);
    scheduleSave();
    publish();
  }
}

// ---------------------------------------------------------------- autosave

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let lastSaveAt = 0;

export function scheduleSave(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, BALANCE.autosaveDebounce);
}

export async function saveNow(): Promise<void> {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  const state = get(game);
  state.meta.lastSavedAt = Date.now();
  lastSaveAt = state.meta.lastSavedAt;
  try {
    await saveGame(state);
  } catch (err) {
    console.error('Sauvegarde impossible', err);
  }
}

/** Notification système des échéances du jour, à l'ouverture (docs/01 §6). */
async function notifyDueToday(state: GameState): Promise<void> {
  if (!isTauri()) return;
  const due = groupTodos(state, Date.now()).today.length;
  if (due === 0) return;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('notify', {
      title: 'Labo Kessler',
      body: due === 1 ? 'Une tâche vous attend aujourd\'hui.' : `${due} tâches vous attendent aujourd'hui.`,
    });
  } catch {
    /* notifications refusées ou indisponibles : sans conséquence */
  }
}

/**
 * Réapplique le niveau de fenêtre enregistré. La configuration Tauri pose le
 * défaut (posé sur le bureau) au démarrage ; ceci restitue le choix du joueur.
 */
async function applyWindowLayer(state: GameState): Promise<void> {
  if (!isTauri()) return;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('set_window_layer', { layer: state.settings.layer });
  } catch {
    /* coque absente ou commande refusée : la fenêtre garde son niveau par défaut */
  }
}

// ------------------------------------------------------------ cycle de vie

export async function initialize(): Promise<void> {
  // fenêtre cliente : rien à charger, l'hôte envoie tout
  if (!isHost()) {
    await onState((state) => game.set(state));
    ready.set(true);
    tickTimer = setInterval(tick, BALANCE.tickInterval);
    return;
  }

  // hôte : applique les actions venues des autres fenêtres
  await onAction((action) => applyLocally(action));

  const outcome = await loadGame();

  if (outcome.state) {
    game.set(outcome.state);
    if (outcome.recoveredFromBackup) {
      pushToast('Sauvegarde restaurée depuis une copie de secours', 'bad');
    }
  } else if (outcome.error) {
    fatalError.set({ message: outcome.error, raw: outcome.raw });
    ready.set(true);
    return;
  } else {
    game.set(createGame(Date.now(), freshSeed(Date.now())));
  }

  // rattrapage du temps écoulé hors ligne, par le même chemin que le tick
  tick();
  enforceInvariants(get(game), false);
  ready.set(true);
  publish();
  void applyWindowLayer(get(game));
  void notifyDueToday(get(game));

  if (tickTimer) clearInterval(tickTimer);
  tickTimer = setInterval(tick, BALANCE.tickInterval);

  // le throttling des timers en arrière-plan est sans effet : le rattrapage est exact
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) tick();
  });
  window.addEventListener('blur', () => void saveNow());
  window.addEventListener('beforeunload', () => {
    const state = get(game);
    try {
      void saveGame(state);
    } catch {
      /* rien à faire à la fermeture */
    }
  });

  setInterval(() => {
    if (Date.now() - lastSaveAt > BALANCE.autosaveInterval) void saveNow();
  }, BALANCE.autosaveInterval);
}

/** Repart de zéro (utilisé par l'écran de récupération). */
export function startFresh(): void {
  game.set(createGame(Date.now(), freshSeed(Date.now())));
  fatalError.set(null);
  void saveNow();
}

export function exportSave(): string {
  return serialize(get(game));
}

export function importSave(json: string): void {
  const state = deserialize(json);
  game.set(state);
  tick();
  void saveNow();
}

/** Jour courant, recalculé à chaque tick — utilisé par les vues calendaires. */
export const today = derived(nowStore, ($now) => dayKey($now));
