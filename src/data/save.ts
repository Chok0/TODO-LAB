/**
 * Persistance (docs/09 §5). Deux implémentations derrière la même interface :
 *  - dans Tauri : écriture atomique côté Rust + copies de secours rotatives ;
 *  - hors Tauri (navigateur, `npm run dev`) : localStorage, même format.
 *
 * L'application est jouable dans les deux cas, sans branche dans le reste du code.
 */

import { enforceInvariants, migrate } from './migrations';
import type { GameState } from './schema';

const STORAGE_KEY = 'labo-kessler:save';
const BACKUP_KEY = (n: number) => `labo-kessler:backup:${n}`;
export const BACKUP_COUNT = 3;

export const isTauri = (): boolean =>
  typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke: call } = await import('@tauri-apps/api/core');
  return call<T>(cmd, args ?? {});
}

// ------------------------------------------------------------------ lecture

export interface LoadOutcome {
  state: GameState | null;
  /** Renseigné quand la sauvegarde principale était illisible. */
  error: string | null;
  raw: string | null;
  recoveredFromBackup: boolean;
}

async function readRaw(): Promise<string | null> {
  if (isTauri()) return (await invoke<string | null>('load_save')) ?? null;
  return localStorage.getItem(STORAGE_KEY);
}

async function readBackup(n: number): Promise<string | null> {
  if (isTauri()) return (await invoke<string | null>('read_backup', { n })) ?? null;
  return localStorage.getItem(BACKUP_KEY(n));
}

function parse(raw: string): GameState {
  const state = migrate(JSON.parse(raw));
  enforceInvariants(state, false);
  return state;
}

export async function loadGame(): Promise<LoadOutcome> {
  let raw: string | null = null;
  try {
    raw = await readRaw();
  } catch (err) {
    return { state: null, error: String(err), raw: null, recoveredFromBackup: false };
  }
  if (!raw) return { state: null, error: null, raw: null, recoveredFromBackup: false };

  try {
    return { state: parse(raw), error: null, raw, recoveredFromBackup: false };
  } catch (err) {
    // sauvegarde corrompue : on tente les copies, de la plus récente à la plus ancienne
    for (let n = 1; n <= BACKUP_COUNT; n++) {
      try {
        const backup = await readBackup(n);
        if (!backup) continue;
        return { state: parse(backup), error: String(err), raw, recoveredFromBackup: true };
      } catch {
        continue;
      }
    }
    return { state: null, error: String(err), raw, recoveredFromBackup: false };
  }
}

// ----------------------------------------------------------------- écriture

let backupsRotated = false;

/** Rotation des copies une seule fois par session, pas à chaque sauvegarde. */
async function rotateBackupsOnce(): Promise<boolean> {
  if (backupsRotated) return false;
  backupsRotated = true;
  if (isTauri()) return true; // la rotation est faite côté Rust, à la demande
  try {
    for (let n = BACKUP_COUNT; n > 1; n--) {
      const prev = localStorage.getItem(BACKUP_KEY(n - 1));
      if (prev) localStorage.setItem(BACKUP_KEY(n), prev);
    }
    const current = localStorage.getItem(STORAGE_KEY);
    if (current) localStorage.setItem(BACKUP_KEY(1), current);
  } catch {
    /* quota atteint : la sauvegarde principale prime */
  }
  return false;
}

export async function saveGame(state: GameState): Promise<void> {
  const rotate = await rotateBackupsOnce();
  const json = JSON.stringify(state, null, 2);
  if (isTauri()) {
    await invoke('write_save', { json, rotate });
    return;
  }
  localStorage.setItem(STORAGE_KEY, json);
}

// ------------------------------------------------------- export / import

export function serialize(state: GameState): string {
  return JSON.stringify(state, null, 2);
}

export function deserialize(json: string): GameState {
  return parse(json);
}

/** Téléchargement d'un fichier de sauvegarde (fonctionne aussi hors Tauri). */
export function downloadSave(state: GameState, filename = 'labo-kessler-sauvegarde.json'): void {
  const blob = new Blob([serialize(state)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
