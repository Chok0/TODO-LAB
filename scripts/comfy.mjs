#!/usr/bin/env node
/**
 * Passerelle ComfyUI — génère les visuels du jeu depuis le dépôt.
 *
 * ComfyUI tourne sur VOTRE machine ; ce script lui parle en HTTP et range les
 * images produites dans le dépôt. Il ne dépend d'aucune bibliothèque : c'est du
 * Node nu, pour qu'il survive aux mises à jour de ComfyUI comme du projet.
 *
 *   node scripts/comfy.mjs --check
 *   node scripts/comfy.mjs --list-models
 *   node scripts/comfy.mjs --workflow assets/comfy/backdrop.json --out src/assets/generated
 *   node scripts/comfy.mjs --workflow assets/comfy/backdrop.json --set prompt="mur d'atelier, brique sombre" --seed 42
 *
 * Le workflow doit être exporté au format **API** depuis ComfyUI
 * (menu ⚙ → « Enable Dev mode Options », puis « Save (API Format) »).
 * Les placeholders `{{nom}}` du JSON sont remplacés par les `--set nom=valeur`.
 *
 * Voir docs/14-passerelle-comfyui.md.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

const DEFAULT_HOST = process.env.COMFYUI_URL || 'http://127.0.0.1:8188';
const DEFAULT_WORKFLOW = 'assets/comfy/txt2img.json';
const DA_MANIFEST = 'assets/comfy/da.json';
/** ComfyUI rend la main tout de suite : on interroge l'historique jusqu'au bout. */
const POLL_INTERVAL = 1500;
const POLL_TIMEOUT = 10 * 60 * 1000;

// ------------------------------------------------------------------ options

function parseArgs(argv) {
  const opts = { set: {}, host: DEFAULT_HOST, out: 'src/assets/generated' };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => argv[++i];
    switch (arg) {
      case '--check': opts.check = true; break;
      case '--list-models': opts.listModels = true; break;
      case '--workflow': opts.workflow = next(); break;
      case '--out': opts.out = next(); break;
      case '--host': opts.host = next(); break;
      case '--seed': opts.set.seed = next(); break;
      case '--da': opts.da = argv[i + 1] && !argv[i + 1].startsWith('--') ? next() : '*'; break;
      case '--ckpt': opts.ckpt = next(); break;
      case '--dry-run': opts.dryRun = true; break;
      case '--set': {
        const pair = next() ?? '';
        const eq = pair.indexOf('=');
        if (eq < 0) fail(`--set attend cle=valeur, reçu « ${pair} »`);
        opts.set[pair.slice(0, eq)] = pair.slice(eq + 1);
        break;
      }
      case '--help': case '-h': opts.help = true; break;
      default: fail(`Option inconnue : ${arg}`);
    }
  }
  return opts;
}

function fail(message) {
  console.error(`\n  ✗ ${message}\n`);
  process.exit(1);
}

const USAGE = `
Passerelle ComfyUI — génère les visuels du jeu.

  --check                 vérifie que ComfyUI répond
  --list-models           liste les checkpoints disponibles sur votre installation
  --da [id]               produit toute la direction artistique (assets/comfy/da.json),
                          ou le seul visuel <id>
  --ckpt <nom>            checkpoint à utiliser (ou variable COMFYUI_CKPT)
  --workflow <fichier>    workflow au format API (défaut : assets/comfy/txt2img.json)
  --set cle=valeur        remplace {{cle}} dans le workflow (répétable)
  --seed <n>              raccourci pour --set seed=<n>
  --out <dossier>         où ranger les images (défaut : src/assets/generated)
  --host <url>            URL de ComfyUI (défaut : ${DEFAULT_HOST})
  --dry-run               affiche le workflow résolu sans rien envoyer
`;

// -------------------------------------------------------------------- HTTP

async function call(host, path, init) {
  let response;
  try {
    response = await fetch(`${host}${path}`, init);
  } catch (err) {
    fail(
      `ComfyUI ne répond pas sur ${host}.\n` +
        `    Lancez-le (python main.py) ou indiquez son adresse avec --host.\n` +
        `    Détail : ${err.message}`,
    );
  }
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    fail(`${path} → HTTP ${response.status}\n    ${body.slice(0, 800)}`);
  }
  return response;
}

const getJson = async (host, path) => (await call(host, path)).json();

// --------------------------------------------------------------- workflow

/**
 * Remplace les `{{cle}}` du workflow. Un placeholder non fourni est une erreur :
 * mieux vaut refuser que générer silencieusement une image avec le mot-clé
 * `{{prompt}}` peint dedans.
 */
function resolvePlaceholders(raw, values) {
  const missing = new Set();
  const resolved = raw.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_match, key) => {
    if (values[key] === undefined) {
      missing.add(key);
      return '';
    }
    // le workflow est du JSON : la valeur doit être échappée, sans les guillemets
    return JSON.stringify(String(values[key])).slice(1, -1);
  });

  if (missing.size) {
    fail(
      `Placeholders non fournis : ${[...missing].map((k) => `{{${k}}}`).join(', ')}\n` +
        `    Ajoutez --set ${[...missing][0]}=…`,
    );
  }
  return resolved;
}

/**
 * Retire les clés de service (`_commentaire`, `_defaults`) : ComfyUI refuserait
 * un nœud dont il ne connaît pas la classe.
 */
function stripMeta(workflow) {
  const clean = {};
  for (const [id, node] of Object.entries(workflow)) {
    if (!id.startsWith('_')) clean[id] = node;
  }
  return clean;
}

/** Nœuds produisant des images : c'est là qu'on ira chercher les sorties. */
function outputNodes(workflow) {
  return Object.entries(workflow)
    .filter(([, node]) => node.class_type === 'SaveImage' || node.class_type === 'PreviewImage')
    .map(([id]) => id);
}

// ------------------------------------------------------------------ actions

async function check(host) {
  const stats = await getJson(host, '/system_stats');
  const device = stats.devices?.[0];
  console.log(`  ✓ ComfyUI répond sur ${host}`);
  if (stats.system) console.log(`    ComfyUI ${stats.system.comfyui_version ?? '?'} · Python ${stats.system.python_version?.split(' ')[0] ?? '?'}`);
  if (device) {
    const gb = (n) => (n ? `${(n / 1024 ** 3).toFixed(1)} Go` : '?');
    console.log(`    ${device.name} · VRAM libre ${gb(device.vram_free)} / ${gb(device.vram_total)}`);
  }
}

async function listModels(host) {
  const info = await getJson(host, '/object_info/CheckpointLoaderSimple');
  const names = info.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0] ?? [];
  if (!names.length) {
    console.log('  Aucun checkpoint installé dans ComfyUI/models/checkpoints.');
    return;
  }
  console.log(`  ${names.length} checkpoint(s) disponibles :`);
  for (const name of names) console.log(`    · ${name}`);
  console.log('\n  Reportez le nom exact dans le workflow (champ ckpt_name).');
}

async function waitForResult(host, promptId) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < POLL_TIMEOUT) {
    const history = await getJson(host, `/history/${promptId}`);
    const entry = history[promptId];
    if (entry) {
      const status = entry.status?.status_str;
      if (status === 'error') {
        const messages = (entry.status?.messages ?? [])
          .filter(([kind]) => kind === 'execution_error')
          .map(([, payload]) => `${payload.node_type} : ${payload.exception_message}`);
        fail(`ComfyUI a échoué.\n    ${messages.join('\n    ') || 'voir la console ComfyUI'}`);
      }
      if (entry.outputs && Object.keys(entry.outputs).length) return entry.outputs;
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
  }
  fail(`Aucun résultat après ${POLL_TIMEOUT / 60000} min. La file de ComfyUI est peut-être bloquée.`);
}

async function download(host, outDir, image) {
  const params = new URLSearchParams({
    filename: image.filename,
    subfolder: image.subfolder ?? '',
    type: image.type ?? 'output',
  });
  const response = await call(host, `/view?${params}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const target = join(outDir, image.filename);
  await writeFile(target, bytes);
  console.log(`  ✓ ${target}  (${(bytes.length / 1024).toFixed(0)} Ko)`);
  return target;
}

async function generate(opts) {
  const raw = await readFile(opts.workflow, 'utf8').catch(() => fail(`Workflow illisible : ${opts.workflow}`));

  // Les valeurs par défaut vivent dans le workflow (clé `_defaults`) : le fichier
  // reste lançable sans une demi-douzaine de --set, tout en restant paramétrable.
  let defaults = {};
  try {
    defaults = JSON.parse(raw.replace(/\{\{[^}]*\}\}/g, '0'))._defaults ?? {};
  } catch {
    /* placeholders dans une position non-JSON : on se passe des défauts */
  }

  // une seed absente est tirée ici plutôt que laissée au hasard de ComfyUI :
  // on veut pouvoir rejouer exactement la même image
  const values = { seed: String(Math.floor(Math.random() * 2 ** 31)), ...defaults, ...opts.set };
  const workflow = stripMeta(JSON.parse(resolvePlaceholders(raw, values)));

  if (!outputNodes(workflow).length) {
    fail('Ce workflow ne contient aucun nœud SaveImage : il ne produirait rien de récupérable.');
  }

  if (opts.dryRun) {
    console.log(JSON.stringify(workflow, null, 2));
    return;
  }

  console.log(`  → ${basename(opts.workflow)} · seed ${values.seed}`);
  const queued = await (
    await call(opts.host, '/prompt', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: workflow, client_id: 'labo-kessler' }),
    })
  ).json();

  if (queued.node_errors && Object.keys(queued.node_errors).length) {
    const details = Object.entries(queued.node_errors)
      .map(([id, e]) => `nœud ${id} : ${(e.errors ?? []).map((x) => x.message).join(', ')}`)
      .join('\n    ');
    fail(`Workflow refusé par ComfyUI.\n    ${details}\n\n    Astuce : --list-models pour les noms de checkpoints valides.`);
  }

  console.log(`  … en file (${queued.prompt_id}), génération en cours`);
  const outputs = await waitForResult(opts.host, queued.prompt_id);

  await mkdir(opts.out, { recursive: true });
  const written = [];
  for (const node of Object.values(outputs)) {
    for (const image of node.images ?? []) {
      written.push(await download(opts.host, opts.out, image));
    }
  }
  if (!written.length) fail('Génération terminée mais aucune image renvoyée.');

  // trace reproductible à côté des images : de quoi refaire la même
  await writeFile(
    join(opts.out, 'derniere-generation.json'),
    JSON.stringify({ workflow: opts.workflow, values, files: written.map(basename) }, null, 2) + '\n',
  );
}

// ------------------------------------------------------- direction artistique

/**
 * Produit la série définie dans `assets/comfy/da.json`. Les seeds y sont figées :
 * c'est ce qui permet de refaire exactement la même image dans six mois, et donc
 * de traiter la DA comme du code plutôt que comme une trouvaille.
 */
async function generateDA(opts) {
  const manifest = JSON.parse(
    await readFile(DA_MANIFEST, 'utf8').catch(() => fail(`Manifeste illisible : ${DA_MANIFEST}`)),
  );
  const style = manifest._style ?? {};
  const entries = Object.entries(manifest).filter(([id]) => !id.startsWith('_'));

  const wanted = opts.da === '*' ? entries : entries.filter(([id]) => id === opts.da);
  if (!wanted.length) {
    fail(`Visuel « ${opts.da} » inconnu.\n    Disponibles : ${entries.map(([id]) => id).join(', ')}`);
  }

  const ckpt = opts.ckpt ?? opts.set.ckpt ?? process.env.COMFYUI_CKPT;
  if (!ckpt) {
    fail(
      'Aucun checkpoint indiqué.\n' +
        '    --ckpt <nom>, ou export COMFYUI_CKPT=<nom>\n' +
        '    Pour connaître les vôtres : npm run comfy -- --list-models',
    );
  }

  for (const [id, asset] of wanted) {
    console.log(`\n▸ ${id} — ${asset._role ?? ''}`);
    await generate({
      ...opts,
      workflow: opts.workflow ?? DEFAULT_WORKFLOW,
      set: {
        ckpt,
        // le suffixe de style est ce qui tient la cohérence de la série
        prompt: [asset.prompt, style.suffixe].filter(Boolean).join(', '),
        negative: style.negatif ?? asset.negative,
        width: asset.width,
        height: asset.height,
        seed: asset.seed,
        prefix: asset.prefix ?? `kessler-${id}`,
        ...opts.set,
      },
    });
    if (asset.cible) console.log(`    cible attendue : ${asset.cible}`);
  }

  console.log(
    `\n  Les fichiers portent le nom donné par ComfyUI. Renommez-les vers la\n` +
      `  « cible attendue » ci-dessus pour que le jeu les prenne en compte.\n`,
  );
}

// --------------------------------------------------------------------- main

const opts = parseArgs(process.argv.slice(2));

if (opts.help || (!opts.check && !opts.listModels && !opts.workflow && !opts.da)) {
  console.log(USAGE);
  process.exit(opts.help ? 0 : 1);
}

if (opts.check) await check(opts.host);
if (opts.listModels) await listModels(opts.host);
if (opts.da) await generateDA(opts);
else if (opts.workflow) await generate(opts);
