/**
 * Faits notables émis par le moteur (docs/09 §3). Ce sont des DONNÉES :
 * jamais de callback. L'UI en tire ses toasts, le Log son Registre.
 */

import type { Band, MachineTemplateId, PlantId, RecipeId, Texture, TechId, PaymentMode } from '../data/schema';

export type Effect =
  | { kind: 'energy'; amount: number; todoId: string; title: string }
  | { kind: 'penalty'; amount: number; todoId: string; title: string; reason: 'miss' | 'break' | 'counter' }
  | { kind: 'streak'; todoId: string; title: string; streak: number }
  | { kind: 'research'; tech: TechId; label: string }
  | { kind: 'machine_built'; machine: MachineTemplateId; name: string }
  | { kind: 'machine_upgraded'; machine: MachineTemplateId; name: string; mk: number }
  | { kind: 'cycle'; machine: MachineTemplateId; recipe: RecipeId; label: string }
  | { kind: 'sale'; recipe: RecipeId; label: string; kess: number; branch: 'legal' | 'illegal' }
  | { kind: 'contract_delivery'; recipe: RecipeId; remaining: number }
  | { kind: 'contract_done'; pnj: string }
  | { kind: 'contract_failed'; pnj: string }
  | { kind: 'seizure'; lost: string }
  | { kind: 'harvest'; plot: string; plant: PlantId; amount: number }
  | { kind: 'planted'; plot: string; plant: PlantId; method: 'agro' | 'intensive' }
  | { kind: 'texture'; texture: Texture; recipe: RecipeId }
  | { kind: 'key_bought'; key: number; tax: number }
  | { kind: 'event_triggered'; id: string; title: string }
  | { kind: 'event_resolved'; mode: PaymentMode; title: string }
  | { kind: 'debt_repaid'; amount: number; remaining: number }
  | { kind: 'subsidy'; kess: number }
  | { kind: 'band_changed'; from: Band; to: Band }
  | { kind: 'letter'; letterId: string; title: string }
  | { kind: 'pollution_cleaned'; amount: number }
  | { kind: 'plot_bought'; total: number }
  | { kind: 'blocked'; reason: string };

export interface RegistryRender {
  text: string;
  tone: 'neutral' | 'good' | 'bad';
}

const f = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** Rendu d'un effet dans le Registre du Log. `null` = non journalisé. */
export function renderEffect(e: Effect): RegistryRender | null {
  switch (e.kind) {
    case 'energy':
      return { text: `${e.title} — +${f(e.amount)} EN`, tone: 'good' };
    case 'penalty':
      return { text: `${e.title} — −${f(e.amount)} EN`, tone: 'bad' };
    case 'streak':
      return e.streak > 0 && e.streak % 7 === 0
        ? { text: `${e.title} — ${e.streak} jours de suite`, tone: 'good' }
        : null;
    case 'research':
      return { text: `Recherche terminée : ${e.label}`, tone: 'good' };
    case 'machine_built':
      return { text: `Machine assemblée : ${e.name}`, tone: 'good' };
    case 'machine_upgraded':
      return { text: `${e.name} passe en Mk${e.mk}`, tone: 'good' };
    case 'sale':
      return { text: `${e.label} vendu — +${f(e.kess)} ₭`, tone: 'good' };
    case 'contract_delivery':
      return { text: `Livraison au titre du contrat (${e.remaining} restant)`, tone: 'neutral' };
    case 'contract_done':
      return { text: `Contrat honoré — ${e.pnj} est satisfait`, tone: 'good' };
    case 'contract_failed':
      return { text: `Contrat non honoré — ${e.pnj} ne l'oubliera pas`, tone: 'bad' };
    case 'seizure':
      return { text: `Saisie : ${e.lost}`, tone: 'bad' };
    case 'harvest':
      return { text: `Récolte — ${e.amount} unité(s)`, tone: 'good' };
    case 'key_bought':
      return { text: `Arrangement conclu — taxe permanente portée à ${Math.round(e.tax * 100)} %`, tone: 'bad' };
    case 'event_triggered':
      return { text: e.title, tone: 'bad' };
    case 'event_resolved':
      return { text: `Réglé : ${e.title}`, tone: 'neutral' };
    case 'debt_repaid':
      return {
        text: e.remaining > 0 ? `Dette : −${f(e.amount)} ₭ (${f(e.remaining)} ₭ restants)` : 'Dette de l\'oncle soldée',
        tone: 'good',
      };
    case 'subsidy':
      return { text: `Subvention de la Coopérative — +${f(e.kess)} ₭`, tone: 'good' };
    case 'band_changed':
      return { text: `Votre position a changé`, tone: 'neutral' };
    case 'letter':
      return { text: `Courrier reçu — ${e.title}`, tone: 'neutral' };
    case 'pollution_cleaned':
      return { text: `Atelier nettoyé`, tone: 'good' };
    case 'plot_bought':
      return { text: `Nouvelle parcelle (${e.total})`, tone: 'good' };
    default:
      return null;
  }
}
