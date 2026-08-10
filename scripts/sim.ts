/**
 * CLI du simulateur d'équilibrage (docs/13).
 *
 *   npm run sim -- --days 14 --seed 42 --strategy legal
 *   npm run sim -- --days 30 --seed 42 --strategy mixed --letters
 */

import { runSimulation, type Strategy } from './sim-core';
import { currentBand } from '../src/game-logic/selectors';

function parseArgs() {
  const argv = process.argv.slice(2);
  const get = (name: string, fallback: string) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
  };
  return {
    days: Number(get('days', '14')),
    seed: Number(get('seed', '42')),
    strategy: get('strategy', 'legal') as Strategy,
    letters: argv.includes('--letters'),
    quiet: argv.includes('--quiet'),
  };
}

const opts = parseArgs();
const { state, rows, firstMk2, revenuePerDay, todoShare } = runSimulation(opts.days, opts.seed, opts.strategy);

if (!opts.quiet) {
  const header = ['J', '₭', '₭ cumul', 'Todos', 'Prod', 'Mach/Mk2', 'R&D', 'Parc', 'Dette', 'Taxe', 'Align', 'Bande', 'Ltr'];
  const cells = rows.map((r) => [
    String(r.day),
    r.kess.toFixed(0),
    r.kessTotal.toFixed(0),
    r.fromTodos.toFixed(0),
    r.fromProd.toFixed(0),
    `${r.machines}/${r.mk2}`,
    String(r.research),
    String(r.plots),
    r.debt.toFixed(0),
    `${Math.round(r.tax * 100)}%`,
    r.alignment.toFixed(1),
    r.band,
    String(r.letters),
  ]);
  const widths = header.map((h, i) => Math.max(h.length, ...cells.map((c) => c[i].length)));
  const line = (c: string[]) => c.map((v, i) => v.padStart(widths[i])).join('  ');
  console.log(`\n=== Simulation — ${opts.strategy}, ${opts.days} jours, seed ${opts.seed} ===\n`);
  console.log(line(header));
  console.log(widths.map((w) => '-'.repeat(w)).join('  '));
  for (const c of cells) console.log(line(c));
}

console.log('\n--- Bilan ---');
console.log(`Kess cumulés          : ${state.stats.kessEarnedTotal.toFixed(0)} ₭`);
console.log(`Revenu/jour (fin)     : ${revenuePerDay.toFixed(1)} ₭`);
console.log(
  `Origine des gains     : todos ${(todoShare * 100).toFixed(0)} % · production ${((1 - todoShare) * 100).toFixed(0)} %`,
);
console.log(`Ventes légales        : ${state.stats.salesLegal}`);
console.log(`Ventes illégales      : ${state.stats.salesIllegal}`);
console.log(`Cycles produits       : ${state.stats.cyclesCompleted}`);
console.log(`Récoltes              : ${state.stats.harvests}`);
console.log(`Machines Mk2 dès J    : ${firstMk2 ?? '—'}`);
console.log(`Taxe de corruption    : ${Math.round(state.corruption.taxRate * 100)} %`);
console.log(`Alignement / bande    : ${state.alignment.score.toFixed(1)} (${currentBand(state)})`);
console.log(
  `Réputations           : coop ${state.alignment.reputation.coop}, zone ${state.alignment.reputation.zone}, courtier ${state.alignment.reputation.broker}`,
);
console.log(`Événements résolus    : ${state.stats.eventsResolved}`);
console.log(`Contrats honorés/ratés: ${state.stats.contractsHonored}/${state.stats.contractsFailed}`);
console.log(
  `Textures              : ${Object.entries(state.stats.textureCounts).filter(([, n]) => n > 0).map(([k, n]) => `${k}=${n}`).join(', ') || '—'}`,
);
console.log(`Lettres reçues        : ${state.narrative.letters.length}`);
console.log(
  `Pollution / dettes env: ${Math.round(state.lab.pollution * 100)} % / ${state.farm.plots.map((p) => Math.round(p.envDebt * 100) + '%').join(' ')}`,
);

if (opts.letters) {
  console.log('\n--- Correspondance ---');
  for (const letter of [...state.narrative.letters].reverse()) {
    console.log(`\n[${letter.day}] ${letter.pnj.toUpperCase()} — ${letter.title}\n`);
    console.log(letter.body);
    console.log('-'.repeat(70));
  }
}
