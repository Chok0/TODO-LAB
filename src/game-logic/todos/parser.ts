/**
 * Parseur de saisie par règles — offline, instantané (docs/03 §4).
 * Pré-remplit fréquence/mode/N/jours/catégorie/difficulté depuis du texte libre.
 * Aucun appel réseau : l'affinage via API est un fallback V1.5, pas un prérequis.
 */

import { addDays, dayOfWeek, startOfDay, type Timestamp } from '../time';
import type { Category, Difficulty, Frequency, RecurrenceMode } from '../../data/schema';
import type { TodoDraft } from '../actions';
import {
  ABSTINENCE_MARKERS,
  COUNTER_MARKERS,
  DIFFICULTY_KEYWORDS,
  EDGE_FILLERS,
  PERSO_KEYWORDS,
  PRO_KEYWORDS,
  WEEKDAYS,
  WEEKDAY_ALT,
} from './parser-rules.fr';

export interface Chip {
  field: 'recurrence' | 'category' | 'difficulty' | 'due' | 'habit';
  label: string;
  confidence: number;
}

export interface ParsedInput extends TodoDraft {
  chips: Chip[];
}

const HOUR_MS = 3600 * 1000;

/** Fin de journée locale (23:59) du jour contenant `ts`. */
function endOfDay(ts: Timestamp): Timestamp {
  return startOfDay(ts) + 24 * HOUR_MS - 60 * 1000;
}

/** Prochaine occurrence d'un jour de semaine, aujourd'hui inclus. */
function nextWeekday(now: Timestamp, target: number, forceNext = false): Timestamp {
  const today = dayOfWeek(now);
  let delta = (target - today + 7) % 7;
  if (forceNext && delta === 0) delta = 7;
  return endOfDay(addDays(now, delta));
}

interface Span {
  start: number;
  end: number;
}

function removeSpans(text: string, spans: Span[]): string {
  if (spans.length === 0) return text.trim();
  const sorted = [...spans].sort((a, b) => a.start - b.start);
  let out = '';
  let cursor = 0;
  for (const s of sorted) {
    if (s.start < cursor) continue;
    out += text.slice(cursor, s.start);
    cursor = s.end;
  }
  out += text.slice(cursor);
  return out.replace(/\s+/g, ' ').trim();
}

/** Rogne les mots de liaison orphelins aux extrémités. */
function trimFillers(title: string): string {
  let words = title.split(/\s+/).filter(Boolean);
  const isFiller = (w: string) => EDGE_FILLERS.includes(w.toLowerCase().replace(/[',.]/g, ''));
  while (words.length > 1 && isFiller(words[words.length - 1])) words = words.slice(0, -1);
  while (words.length > 1 && isFiller(words[0])) words = words.slice(1);
  return words.join(' ').replace(/\s+([,.;:])/g, '$1').trim();
}

function detectCategory(text: string): { value: Category; confidence: number } {
  for (const kw of PRO_KEYWORDS) {
    if (text.includes(kw)) return { value: 'pro', confidence: 0.8 };
  }
  for (const kw of PERSO_KEYWORDS) {
    if (text.includes(kw)) return { value: 'perso', confidence: 0.8 };
  }
  return { value: 'perso', confidence: 0.3 };
}

function detectDifficulty(text: string): { value: Difficulty; confidence: number } {
  for (const rule of DIFFICULTY_KEYWORDS) {
    for (const w of rule.words) {
      if (text.includes(w)) return { value: rule.difficulty, confidence: 0.75 };
    }
  }
  return { value: 2, confidence: 0.3 };
}

const MODE_LABEL: Record<RecurrenceMode, string> = {
  fixed: 'fixe',
  flexible: 'souple',
  multiDaily: 'par jour',
};

function frequencyLabel(freq: Frequency, mode: RecurrenceMode, target: number, days: number[]): string {
  const dayNames = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'];
  if (freq === 'daily') {
    return mode === 'multiDaily' ? `${target}×/jour` : 'chaque jour';
  }
  if (freq === 'weekly') {
    if (mode === 'fixed' && days.length) return `hebdo · ${days.map((d) => dayNames[d - 1]).join('/')}`;
    return `${target}×/semaine`;
  }
  if (freq === 'monthly') {
    if (mode === 'fixed' && days.length) return `le ${days[0]} du mois`;
    return `${target}×/mois`;
  }
  return `tous les ${freq.everyNDays} j`;
}

/**
 * Analyse un texte libre. `now` est injecté (aucun accès direct à l'horloge).
 */
export function parseInput(raw: string, now: Timestamp): ParsedInput {
  const text = raw.toLowerCase();
  const spans: Span[] = [];
  const chips: Chip[] = [];

  let kind: 'oneshot' | 'recurring' | 'habit' = 'oneshot';
  let habitKind: 'abstinence' | 'counter' | undefined;
  let thresholds: { s1: number; s2: number } | null = null;
  let frequency: Frequency | undefined;
  let mode: RecurrenceMode | undefined;
  let target = 1;
  let fixedDays: number[] = [];
  let dueAt: number | null = null;

  const mark = (m: RegExpMatchArray | null) => {
    if (m && m.index !== undefined) spans.push({ start: m.index, end: m.index + m[0].length });
  };

  // ---------------------------------------------------------------- habitudes
  // Les marqueurs explicites priment sur toute détection de récurrence.
  for (const re of ABSTINENCE_MARKERS) {
    if (re.test(text)) {
      kind = 'habit';
      habitKind = 'abstinence';
      chips.push({ field: 'habit', label: 'abstinence', confidence: 0.9 });
      break;
    }
  }

  if (kind !== 'habit') {
    for (const re of COUNTER_MARKERS) {
      if (re.test(text)) {
        kind = 'habit';
        habitKind = 'counter';
        // seuil s2 : « max 3 », sinon « 3 par jour »
        const maxMatch = text.match(/\bmax(?:imum)?\s*(\d+)/);
        const perDay = text.match(/(\d+)\s*(?:x|fois)?\s*(?:par|\/)\s*jours?/);
        const n = Number(maxMatch?.[1] ?? perDay?.[1] ?? 2);
        thresholds = { s1: Math.max(0, n - 1), s2: n };
        mark(maxMatch);
        mark(perDay);
        chips.push({ field: 'habit', label: `compteur · max ${n}`, confidence: 0.85 });
        break;
      }
    }
  }

  // --------------------------------------------------------------- récurrence
  if (kind === 'oneshot') {
    const rules: { re: RegExp; apply: (m: RegExpMatchArray) => void }[] = [
      {
        re: /(\d+)\s*(?:x|fois)\s*(?:par|\/)\s*jours?/,
        apply: (m) => {
          frequency = 'daily';
          mode = 'multiDaily';
          target = Number(m[1]);
        },
      },
      {
        re: /\btous\s+les\s+(\d+)\s+jours?\b/,
        apply: (m) => {
          frequency = { everyNDays: Number(m[1]) };
          mode = 'fixed';
        },
      },
      {
        re: /\b(?:tous\s+les\s+jours|chaque\s+jour|quotidiennement|quotidienne?)\b/,
        apply: () => {
          frequency = 'daily';
          mode = 'fixed';
        },
      },
      {
        re: new RegExp(
          `\\b(?:tous\\s+les|chaque)\\s+((?:${WEEKDAY_ALT})(?:\\s*(?:,|et)\\s*(?:${WEEKDAY_ALT}))*)`,
        ),
        apply: (m) => {
          frequency = 'weekly';
          mode = 'fixed';
          fixedDays = m[1]
            .split(/\s*(?:,|et)\s*/)
            .map((d) => WEEKDAYS[d.replace(/s$/, '')])
            .filter((d): d is number => typeof d === 'number')
            .sort((a, b) => a - b);
        },
      },
      {
        re: /(\d+)\s*(?:x|fois)\s*(?:par|\/)\s*semaines?/,
        apply: (m) => {
          frequency = 'weekly';
          mode = 'flexible';
          target = Number(m[1]);
        },
      },
      {
        re: /\b(?:une|1)\s*fois\s*par\s*semaine\b|\bhebdomadaire\b/,
        apply: () => {
          frequency = 'weekly';
          mode = 'flexible';
          target = 1;
        },
      },
      {
        re: /\ble\s+(\d{1,2})\s+(?:du\s+mois|de\s+chaque\s+mois)\b/,
        apply: (m) => {
          frequency = 'monthly';
          mode = 'fixed';
          fixedDays = [Number(m[1])];
        },
      },
      {
        re: /\b(?:(?:une|1)\s*fois\s*par\s*mois|mensuel(?:le)?)\b/,
        apply: () => {
          frequency = 'monthly';
          mode = 'flexible';
          target = 1;
        },
      },
    ];

    for (const rule of rules) {
      const m = text.match(rule.re);
      if (m) {
        rule.apply(m);
        mark(m);
        kind = 'recurring';
        chips.push({
          field: 'recurrence',
          label: frequencyLabel(frequency!, mode!, target, fixedDays),
          confidence: 0.9,
        });
        break;
      }
    }
  }

  // ------------------------------------------------------------------ échéance
  if (kind === 'oneshot') {
    const soir = text.match(/\bce\s+soir\b/);
    const demain = text.match(/\bdemain\b/);
    const aujourdhui = text.match(/\baujourd'?hui\b/);
    const dateNum = text.match(/\b(\d{1,2})[\/-](\d{1,2})\b/);
    const weekday = text.match(new RegExp(`\\b(${WEEKDAY_ALT})(\\s+prochain)?\\b`));

    if (soir) {
      dueAt = startOfDay(now) + 21 * HOUR_MS;
      mark(soir);
      chips.push({ field: 'due', label: 'ce soir', confidence: 0.9 });
    } else if (demain) {
      dueAt = endOfDay(addDays(now, 1));
      mark(demain);
      chips.push({ field: 'due', label: 'demain', confidence: 0.9 });
    } else if (aujourdhui) {
      dueAt = endOfDay(now);
      mark(aujourdhui);
      chips.push({ field: 'due', label: "aujourd'hui", confidence: 0.9 });
    } else if (weekday) {
      const day = WEEKDAYS[weekday[1].replace(/s$/, '')];
      if (day) {
        dueAt = nextWeekday(now, day, Boolean(weekday[2]));
        mark(weekday);
        chips.push({ field: 'due', label: weekday[1], confidence: 0.8 });
      }
    } else if (dateNum) {
      const d = Number(dateNum[1]);
      const mo = Number(dateNum[2]);
      if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12) {
        const ref = new Date(now);
        let year = ref.getFullYear();
        let candidate = new Date(year, mo - 1, d, 23, 59, 0, 0).getTime();
        if (candidate < startOfDay(now)) candidate = new Date(year + 1, mo - 1, d, 23, 59, 0, 0).getTime();
        dueAt = candidate;
        mark(dateNum);
        chips.push({ field: 'due', label: `${d}/${mo}`, confidence: 0.85 });
      }
    }
  }

  // ------------------------------------------------------- catégorie & difficulté
  const category = detectCategory(text);
  const difficulty = detectDifficulty(text);
  chips.push({ field: 'category', label: category.value, confidence: category.confidence });
  chips.push({
    field: 'difficulty',
    label: ['trivial', 'facile', 'normal', 'corvée'][difficulty.value - 1],
    confidence: difficulty.confidence,
  });

  const title = trimFillers(removeSpans(raw, spans)) || raw.trim();

  const draft: ParsedInput = {
    title,
    category: category.value,
    difficulty: difficulty.value,
    kind,
    chips,
    gain: null,
    loss: null,
  };
  if (kind === 'recurring') {
    draft.frequency = frequency;
    draft.mode = mode;
    draft.target = target;
    draft.fixedDays = fixedDays;
  }
  if (kind === 'habit') {
    draft.habitKind = habitKind;
    draft.thresholds = thresholds;
  }
  if (kind === 'oneshot') {
    draft.dueAt = dueAt;
  }
  return draft;
}

/** Suggestions tournantes du quick-add (docs/11 §8). */
export const PLACEHOLDER_EXAMPLES = [
  'appeler le comptable tous les lundis',
  'sport 3 fois par semaine',
  'déclarer la TVA le 5 du mois',
  'méditer 2x par jour',
  'ranger l\'atelier',
];

export { MODE_LABEL };
