# 14 — Passerelle ComfyUI

Comment brancher Claude Code sur ComfyUI pour produire les visuels du jeu, et
surtout : **où des images générées ont réellement leur place** dans un projet
dont tout le graphisme est aujourd'hui du SVG écrit à la main.

## 1. La contrainte à connaître d'abord

ComfyUI tourne **sur votre machine**. Une session Claude Code exécutée dans le
cloud (claude.ai/code, GitHub Actions) vit dans un conteneur isolé : elle ne peut
pas atteindre votre `127.0.0.1:8188`, et aucune configuration ne changera cela.

Il y a donc exactement deux montages, et le premier détermine le second :

| Où tourne Claude Code | Ce qui est possible |
|---|---|
| **Sur votre machine** (Claude Code en terminal, ou l'app desktop) | Tout : appeler ComfyUI, régler les prompts, relancer, regarder les images produites |
| **Dans le cloud** (comme cette session) | Écrire et versionner les workflows et le script ; **c'est vous qui lancez la génération** |

Le montage retenu ici marche dans les deux cas : **le pipeline vit dans le
dépôt**, et l'exécution se fait là où ComfyUI tourne.

## 2. La direction artistique, en une commande

Toute la DA est décrite dans `assets/comfy/da.json` : un prompt par visuel, sa
taille, sa **seed figée**, et le fichier cible. Un suffixe de style commun est
collé à chaque prompt — c'est lui qui tient la cohérence de la série.

```bash
export COMFYUI_CKPT=votre-modele.safetensors   # une fois par session
npm run comfy -- --list-models                 # si vous ne savez pas lequel
npm run comfy -- --da                          # toute la série
npm run comfy -- --da backdrop                 # un seul visuel
```

| id | Ce que c'est | Taille | Où ça atterrit |
|---|---|---|---|
| `backdrop` | décor du bandeau : mur, sol, profondeur | 1216 × 256 | `src/assets/generated/atelier-backdrop.png` |
| `papier` | texture de papier des lettres | 768 × 768 | `src/assets/generated/papier-lettre.png` |
| `icone` | source de l'icône d'application | 512 × 512 | à détourer vers `src-tauri/icons/` |
| `reference-machines` | planche à **tracer** en SVG | 1024 × 640 | ne part pas dans le bundle |

Les seeds sont figées volontairement : c'est ce qui permet de refaire exactement
la même image dans six mois, et donc de traiter la DA comme du code plutôt que
comme une trouvaille. Changez-en une pour explorer, gardez-la dès que le
résultat convient.

ComfyUI nomme ses sorties lui-même (`kessler-backdrop_00001_.png`) : renommez
vers le fichier cible, sinon rien ne se branche.

## 3. Voie A — le script du dépôt (recommandée)

`scripts/comfy.mjs` parle à l'API HTTP de ComfyUI. Aucune dépendance : du Node
nu, pour qu'il survive aux mises à jour de ComfyUI comme du projet.

```bash
npm run comfy -- --check          # ComfyUI répond-il ?
npm run comfy -- --list-models    # quels checkpoints avez-vous installés ?

# hors manifeste : un visuel ponctuel, avec son propre prompt
npm run comfy -- --workflow assets/comfy/txt2img.json \
  --set ckpt=votre-modele.safetensors \
  --set prompt="établi de lutherie, serre-joints et gabarits au mur, lumière rasante" \
  --set width=1216 --set height=256 --seed 42
```

Les images atterrissent dans `src/assets/generated/`, accompagnées d'un
`derniere-generation.json` qui note le workflow, les valeurs et la seed — de quoi
refaire exactement la même image dans six mois.

**Le workflow doit être au format API**, pas au format d'édition : dans ComfyUI,
⚙ → *Enable Dev mode Options*, puis *Save (API Format)*. Rangez-le dans
`assets/comfy/`. Les `{{placeholders}}` du JSON sont remplacés par les `--set` ;
un placeholder oublié fait échouer le script plutôt que de peindre `{{prompt}}`
dans l'image. Les valeurs par défaut se déclarent dans une clé `_defaults` du
workflow lui-même.

Pourquoi cette voie plutôt qu'un serveur MCP : **le prompt et la seed sont du
code**. Versionnés, relisibles en diff, rejouables. Une image dont on a perdu le
prompt est une image qu'on ne peut plus retoucher.

## 4. Voie B — un serveur MCP ComfyUI

Si vous lancez Claude Code sur votre machine et voulez qu'il appelle ComfyUI
directement, sans passer par le script, ajoutez un serveur MCP à la racine du
dépôt dans `.mcp.json` :

```json
{
  "mcpServers": {
    "comfyui": {
      "command": "uvx",
      "args": ["comfyui-mcp-server"],
      "env": { "COMFYUI_URL": "http://127.0.0.1:8188" }
    }
  }
}
```

Remplacez `comfyui-mcp-server` par le paquet que vous aurez choisi — plusieurs
existent, aucun n'est officiel, et leurs surfaces d'outils diffèrent ; vérifiez
ce qu'ils exposent avant de les installer. Claude Code lit `.mcp.json` au
démarrage et vous demande d'approuver le serveur à la première session.

Cette voie est plus directe mais moins traçable : les prompts vivent dans la
conversation, pas dans le dépôt. Le compromis raisonnable est d'**itérer** en MCP
et de **figer** le résultat retenu dans un workflow de `assets/comfy/`.

## 5. Où des rasters ont leur place — et où ils n'en ont pas

Le design system (`12`) est SVG pour de bonnes raisons : les machines changent
d'état, la V1 tient en 4,7 Mo, et rien ne sort du binaire au runtime. Générer
des PNG n'annule aucune de ces raisons. Découpage proposé :

| Élément | Support | Pourquoi |
|---|---|---|
| Décor de l'atelier : mur, sol, lumière de fenêtre | **PNG généré**, une seule image large | Décor fixe, jamais animé, jamais teinté par un état. C'est exactement ce qu'une image fait mieux que du SVG |
| Papier des lettres, tampons, texture du Registre | **PNG généré**, tuilable | Idem : de la matière, pas de l'interface |
| Icône de l'application et du tray | **PNG généré** puis nettoyé | Elle vit hors de la page, aux tailles imposées par l'OS |
| Machines, plantes, icônes d'UI | **SVG, à la main** | Elles portent des états (`idle`/`running`/`blocked`, 4 stades de croissance), se teintent par variable CSS, et doivent rester nettes à toutes les densités |
| Cartes todo, panneaux, boutons | **CSS** | Ce n'est pas du dessin |

Une image générée peut aussi servir de **référence à tracer** : produire l'objet
en raster, puis le redessiner en SVG. C'est souvent le meilleur usage sur un
projet où la cohérence de trait compte plus que le détail.

### Comment le décor se branche — et pourquoi il ne casse rien

`Backdrop.svelte` cherche l'image par `import.meta.glob`. Absente, la scène garde
son décor CSS ; présente, elle se glisse **sous** le mur dessiné. Le jeu ne
dépend donc jamais d'une image générée : on peut la remplacer, la retoucher ou la
retirer sans toucher au code.

Trois garde-fous tiennent la lisibilité, parce que l'image est produite **hors du
dépôt** et qu'on ne peut rien supposer de ce qui y atterrira :

1. **Un filtre borne sa luminance** (`brightness(0.62) saturate(0.8)`, opacité 0,78).
2. **Le voile n'est pas uniforme.** Il est opaque là où il y a du texte — la
   rangée des titres de station en haut, la rangée des légendes sous la ligne de
   sol — et s'efface au milieu, où l'image a le champ libre. Un voile uniforme
   étoufferait l'image au point de la rendre inutile.
3. **Le texte du milieu de scène porte son propre fond** : le message de
   l'établi vide, les pastilles, et le tableau des Compteurs.

Vérifié en poussant l'entrée à l'absurde — un décor **entièrement blanc**, la
pire image possible. Fond mesuré sous les rangées de texte : 49 à 54 sur 255,
soit **4,8:1 pour `--text-dim` et 9,7:1 pour `--text-0`**, au-dessus du seuil de
4,5:1 (`11` §11). Si ça tient contre du blanc, ça tient contre n'importe quoi.

### Le budget, à surveiller

La V1 tient en 4,7 Mo de binaire pour un budget de 15 Mo (`09` §8), et le fichier
HTML unique en 321 Ko. Un décor plein écran en PNG pèse vite 400 Ko à 1 Mo.
Règles à tenir :

- une seule image de décor, en WebP, redimensionnée à la taille réellement
  affichée (1216 × 256 pour le bandeau), pas à la taille générée ;
- rien dans la version « fichier HTML unique » : les rasters y seraient inlinés
  en base64, ce qui coûte encore 33 % de plus ;
- toute image ajoutée passe par `npm run build:single` pour constater le coût
  avant d'être commitée.

## 6. Direction artistique (rappel pour les prompts)

L'univers est posé dans `07` §1 : une zone franche post-industrielle, un ancien
atelier de facteur d'instruments reconverti en labo. Les mots qui reviennent :
bois usé, acier, verre, lumière rasante, palette froide (`12` §2), nuit
permanente, aucune présence humaine dans le décor.

À proscrire dans les prompts : personnages et visages (l'atelier est vide, c'est
le sujet), texte incrusté, néons saturés, esthétique « cyberpunk » générique. Le
registre est celui d'un atelier abandonné qu'on rallume, pas d'une usine
futuriste.
