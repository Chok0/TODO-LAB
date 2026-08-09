/**
 * RNG seedé et resumable (DEC-05, docs/08 §1).
 *
 * Implémentation par compteur : chaque tirage est `splitmix32(base ^ ++counter)`.
 * Conséquence importante : l'état d'un stream tient dans un entier (le compteur),
 * qui est sauvegardé — recharger une partie reprend exactement la séquence.
 *
 * `Math.random` est interdit dans /src/game-logic : tout passe par ici.
 */

export type StreamName = 'events' | 'letters' | 'naming' | 'misc';
export const STREAM_NAMES: StreamName[] = ['events', 'letters', 'naming', 'misc'];

function splitmix32(a: number): number {
  a = (a + 0x9e3779b9) | 0;
  let t = a ^ (a >>> 16);
  t = Math.imul(t, 0x21f0aaad);
  t = t ^ (t >>> 15);
  t = Math.imul(t, 0x735a2d97);
  return (t ^ (t >>> 15)) >>> 0;
}

/** Hash stable d'un nom de stream, combiné à la seed racine. */
export function hashSeed(rootSeed: number, name: string): number {
  let h = rootSeed | 0;
  for (let i = 0; i < name.length; i++) {
    h = Math.imul(h ^ name.charCodeAt(i), 0x01000193) | 0;
  }
  return h >>> 0;
}

export class Rng {
  readonly base: number;
  counter: number;

  constructor(base: number, counter = 0) {
    this.base = base >>> 0;
    this.counter = counter;
  }

  /** Flottant dans [0, 1). */
  next(): number {
    this.counter = (this.counter + 1) | 0;
    return splitmix32(this.base ^ this.counter) / 4294967296;
  }

  /** Entier dans [0, maxExclusive). */
  int(maxExclusive: number): number {
    if (maxExclusive <= 0) return 0;
    return Math.floor(this.next() * maxExclusive);
  }

  /** Entier dans [min, max] inclus. */
  range(min: number, max: number): number {
    if (max <= min) return min;
    return min + this.int(max - min + 1);
  }

  /** true avec la probabilité `p`. */
  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(items: readonly T[]): T {
    return items[this.int(items.length)];
  }

  /** Tirage pondéré ; les poids <= 0 sont ignorés. */
  weighted<T>(items: readonly T[], weightOf: (item: T) => number): T | null {
    const weights = items.map((it) => Math.max(0, weightOf(it)));
    const total = weights.reduce((a, b) => a + b, 0);
    if (total <= 0) return null;
    let r = this.next() * total;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r < 0) return items[i];
    }
    return items[items.length - 1];
  }
}

export type RngStreams = Record<StreamName, Rng>;

export function makeStreams(rootSeed: number, counters: Partial<Record<StreamName, number>> = {}): RngStreams {
  const streams = {} as RngStreams;
  for (const name of STREAM_NAMES) {
    streams[name] = new Rng(hashSeed(rootSeed, name), counters[name] ?? 0);
  }
  return streams;
}

export function readCounters(streams: RngStreams): Record<StreamName, number> {
  const out = {} as Record<StreamName, number>;
  for (const name of STREAM_NAMES) out[name] = streams[name].counter;
  return out;
}

/** Seed racine pour une nouvelle partie (seul point d'entrée d'entropie du jeu). */
export function freshSeed(entropy: number): number {
  return splitmix32(Math.floor(entropy) | 0);
}
