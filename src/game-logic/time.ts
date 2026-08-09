/**
 * Helpers calendaires — SEUL endroit du projet autorisé à manipuler `Date`.
 * Voir docs/09 §4. Les timestamps sont des ms epoch UTC ; toute notion de
 * "jour" / "semaine" / "mois" est calculée dans le calendrier LOCAL.
 */

export type Timestamp = number;
export type DayKey = string; // 'YYYY-MM-DD' (local)

export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function dayKey(ts: Timestamp): DayKey {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function startOfDay(ts: Timestamp): Timestamp {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Minuit local strictement postérieur à `ts` (robuste aux changements d'heure). */
export function nextMidnight(ts: Timestamp): Timestamp {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function addDays(ts: Timestamp, n: number): Timestamp {
  const d = new Date(ts);
  d.setDate(d.getDate() + n);
  return d.getTime();
}

/** Début du jour local correspondant à une DayKey. */
export function dayKeyToTs(key: DayKey): Timestamp {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
}

/** 1 = lundi … 7 = dimanche (la semaine commence le lundi, docs/03 §3). */
export function dayOfWeek(ts: Timestamp): number {
  const js = new Date(ts).getDay(); // 0 = dimanche
  return js === 0 ? 7 : js;
}

export function dayOfMonth(ts: Timestamp): number {
  return new Date(ts).getDate();
}

export function daysInMonth(ts: Timestamp): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

/** Début (lundi 00:00) de la semaine contenant `ts`. */
export function startOfWeek(ts: Timestamp): Timestamp {
  const offset = dayOfWeek(ts) - 1;
  return startOfDay(addDays(ts, -offset));
}

export function startOfMonth(ts: Timestamp): Timestamp {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0).getTime();
}

/** Clés de période, utilisées pour détecter un changement de période. */
export function weekKey(ts: Timestamp): string {
  return `W:${dayKey(startOfWeek(ts))}`;
}

export function monthKey(ts: Timestamp): string {
  const d = new Date(ts);
  return `M:${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

/** Nombre de minuits locaux traversés entre deux instants (>= 0). */
export function daysBetween(from: Timestamp, to: Timestamp): number {
  if (to <= from) return 0;
  let n = 0;
  let cursor = nextMidnight(from);
  while (cursor <= to) {
    n++;
    cursor = nextMidnight(cursor);
  }
  return n;
}

/** Liste des minuits locaux dans l'intervalle ]from, to]. */
export function midnightsBetween(from: Timestamp, to: Timestamp): Timestamp[] {
  const out: Timestamp[] = [];
  let cursor = nextMidnight(from);
  // garde-fou : 10 ans d'absence maximum
  let guard = 0;
  while (cursor <= to && guard++ < 4000) {
    out.push(cursor);
    cursor = nextMidnight(cursor);
  }
  return out;
}

/** Formatage court pour l'UI : « ce soir », « jeu. », « 12/09 ». */
export function relativeDayLabel(target: Timestamp, now: Timestamp): string {
  const d0 = startOfDay(now);
  const d1 = startOfDay(target);
  const diff = Math.round((d1 - d0) / DAY);
  if (diff < 0) return 'en retard';
  if (diff === 0) return "aujourd'hui";
  if (diff === 1) return 'demain';
  if (diff < 7) {
    const names = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'];
    return names[dayOfWeek(target) - 1];
  }
  const d = new Date(target);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

/** Durée courte : « 3 min », « 1 h 12 », « 4 s ». */
export function formatDuration(ms: number): string {
  if (ms <= 0) return 'prêt';
  const s = Math.ceil(ms / 1000);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h} h ${pad(m % 60)}`;
}
