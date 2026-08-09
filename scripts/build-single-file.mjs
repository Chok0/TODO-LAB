/**
 * Assemble le build Vite en UN seul fichier HTML autonome.
 *
 * Utilité : essayer le jeu sans rien installer (double-clic sur le fichier,
 * ou hébergement statique). La sauvegarde utilise alors le stockage du
 * navigateur — c'est exactement le mode « hors Tauri » de src/data/save.ts.
 *
 *   npm run build && node scripts/build-single-file.mjs
 *   → dist-single/labo-kessler.html
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const OUT_DIR = 'dist-single';
const OUT = join(OUT_DIR, 'labo-kessler.html');

let html = readFileSync(join(DIST, 'index.html'), 'utf8');

// --- 1. polices en data: URI (rien ne doit être chargé depuis le réseau) ---
function inlineFonts(css) {
  return css.replace(/url\(['"]?\/fonts\/([^'")]+)['"]?\)/g, (_m, file) => {
    const data = readFileSync(join(DIST, 'fonts', file)).toString('base64');
    return `url(data:font/woff2;base64,${data})`;
  });
}

// --- 2. feuille de style dans un <style> ---
html = html.replace(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"[^>]*>/g, (_m, href) => {
  const css = inlineFonts(readFileSync(join(DIST, href.replace(/^\//, '')), 'utf8'));
  return `<style>\n${css}\n</style>`;
});

// --- 3. module principal dans un <script> ---
html = html.replace(/<script[^>]+type="module"[^>]+src="([^"]+)"[^>]*><\/script>/g, (_m, src) => {
  const js = readFileSync(join(DIST, src.replace(/^\//, '')), 'utf8')
    // une séquence </script> dans une chaîne fermerait la balise
    .replace(/<\/script>/gi, '<\\/script>');
  return `<script type="module">\n${js}\n</script>`;
});

// --- 4. favicon en data: URI ---
html = html.replace(/<link[^>]+rel="icon"[^>]+href="\/favicon\.svg"[^>]*>/, () => {
  const svg = readFileSync(join(DIST, 'favicon.svg')).toString('base64');
  return `<link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,${svg}" />`;
});

// --- 5. plus aucune référence externe ne doit subsister ---
const leftovers = [...html.matchAll(/(?:src|href)="(\/[^"]+)"/g)].map((m) => m[1]);
if (leftovers.length) {
  console.warn('⚠ références non inlinées :', leftovers.join(', '));
}

mkdirSync(OUT_DIR, { recursive: true });

/**
 * Variante `--artifact` : contenu de <body> uniquement, pour un hébergeur qui
 * fournit lui-même le squelette HTML.
 *
 * Deux corrections indispensables dans ce contexte :
 *  - le widget est conçu pour être posé sur un bureau, donc `body` est
 *    transparent. Sur une page hébergée, un fond transparent emprunte celui de
 *    l'hôte : le texte clair peut se retrouver sur un fond clair. On peint donc
 *    explicitement un fond de bureau, dans les couleurs du jeu ;
 *  - `overflow: hidden` sur html/body doit être conservé pour que la colonne se
 *    comporte comme une fenêtre et non comme un document.
 */
if (process.argv.includes('--artifact')) {
  // Vite place le <style> et le <script> dans le <head> : on garde le contenu
  // des deux sections, dans l'ordre, sans les balises de structure.
  const inner = (tag) => {
    const m = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
    return m ? m[1] : '';
  };
  const head = inner('head')
    .replace(/<meta[^>]*>/gi, '')
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .trim();
  const body = `${head}\n${inner('body').trim()}`;
  const frame = `
<style>
  /* cadre de présentation — le jeu vit normalement ancré au bord de l'écran */
  html, body {
    height: 100%;
    overflow: hidden;
    background: radial-gradient(130% 105% at 78% -10%, #1d232b 0%, #12161b 55%, #0b0e11 100%);
  }
  #app { height: 100vh; }
  /* rappel discret de ce qu'on regarde, masqué dès que la place manque */
  .desk-note {
    position: fixed;
    left: 28px;
    bottom: 26px;
    max-width: 22rem;
    font-family: var(--font-ui);
    color: var(--text-dim);
    line-height: 1.6;
  }
  .desk-note strong {
    display: block;
    margin-bottom: 6px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--lab);
  }
  .desk-note p { font-size: 13px; }
  .desk-note code {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-0);
  }
  @media (max-width: 780px) { .desk-note { display: none; } }
</style>
<aside class="desk-note">
  <strong>Labo Kessler</strong>
  <p>
    Le jeu tel qu'il se pose sur un bureau. Écrivez une tâche dans le champ du haut
    — <code>ranger l'atelier</code>, <code>sport 3 fois par semaine</code> — cochez-la,
    puis dépensez l'Énergie en recherche. La partie est sauvegardée dans ce navigateur.
  </p>
</aside>
`;
  const artifactPath = join(OUT_DIR, 'labo-kessler-artifact.html');
  writeFileSync(artifactPath, body + frame);
  console.log(`${artifactPath} — ${(Buffer.byteLength(body + frame) / 1024).toFixed(0)} Ko (contenu de body)`);
}

writeFileSync(OUT, html);

const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
const chunks = readdirSync(join(DIST, 'assets')).filter((f) => f.endsWith('.js')).length;
console.log(`${OUT} — ${kb} Ko, autonome (${chunks} chunk(s) JS d'origine)`);
