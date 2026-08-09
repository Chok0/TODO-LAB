/**
 * Deux fenêtres, une seule partie.
 *
 * La colonne todo et le bandeau atelier sont deux fenêtres système distinctes
 * mais partagent un unique `GameState`. Le modèle est délibérément simple :
 *
 *   • la fenêtre `todo` est l'HÔTE — elle seule fait avancer le temps et écrit
 *     la sauvegarde. Il n'y a donc jamais deux horloges ni deux écrivains ;
 *   • la fenêtre `atelier` est CLIENTE — elle n'applique rien, elle envoie ses
 *     actions à l'hôte et affiche l'état qu'il diffuse ;
 *   • chaque fenêtre garde sa propre horloge d'affichage pour les jauges, ce
 *     qui évite de diffuser l'état à chaque seconde : l'hôte ne diffuse que
 *     lorsque quelque chose a réellement changé.
 *
 * Hors Tauri (navigateur, fichier HTML), il n'y a qu'une fenêtre : elle est
 * hôte et le reste du module ne fait rien.
 */

import { isTauri } from '../data/save';
import type { Action } from '../game-logic/actions';
import type { GameState } from '../data/schema';

export type Zone = 'todo' | 'atelier' | 'single';

export const ACTION_EVENT = 'game://action';
export const STATE_EVENT = 'game://state';

let zone: Zone | null = null;

/** Quelle vue cette fenêtre doit-elle afficher ? */
export function currentZone(): Zone {
  if (zone) return zone;

  if (isTauri()) {
    // le label de fenêtre est posé par tauri.conf.json
    const label = (window as unknown as { __TAURI_INTERNALS__?: { metadata?: { currentWindow?: { label?: string } } } })
      .__TAURI_INTERNALS__?.metadata?.currentWindow?.label;
    zone = label === 'atelier' ? 'atelier' : 'todo';
    return zone;
  }

  // en navigateur : ?zone=todo ou ?zone=atelier pour prévisualiser une seule vue
  const param = new URLSearchParams(location.search).get('zone');
  zone = param === 'todo' || param === 'atelier' ? param : 'single';
  return zone;
}

/** Seul l'hôte fait avancer le temps et sauvegarde. */
export function isHost(): boolean {
  return currentZone() !== 'atelier';
}

// --------------------------------------------------------------- transport

type Unlisten = () => void;

async function tauriEvent() {
  return import('@tauri-apps/api/event');
}

/** Envoie une action à l'hôte (appelé uniquement par la fenêtre cliente). */
export async function sendAction(action: Action): Promise<void> {
  if (!isTauri()) return;
  const { emit } = await tauriEvent();
  await emit(ACTION_EVENT, action);
}

/** Diffuse l'état courant aux autres fenêtres (appelé uniquement par l'hôte). */
export async function broadcastState(state: GameState): Promise<void> {
  if (!isTauri()) return;
  const { emit } = await tauriEvent();
  await emit(STATE_EVENT, state);
}

export async function onAction(handler: (action: Action) => void): Promise<Unlisten> {
  if (!isTauri()) return () => {};
  const { listen } = await tauriEvent();
  return listen<Action>(ACTION_EVENT, (event) => handler(event.payload));
}

export async function onState(handler: (state: GameState) => void): Promise<Unlisten> {
  if (!isTauri()) return () => {};
  const { listen } = await tauriEvent();
  return listen<GameState>(STATE_EVENT, (event) => handler(event.payload));
}
