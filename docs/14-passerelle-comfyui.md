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

## 2. Voie A — le script du dépôt (recommandée)

`scripts/comfy.mjs` parle à l'API HTTP de ComfyUI. Aucune dépendance : du Node
nu, pour qu'il survive aux mises à jour de ComfyUI comme du projet.

```bash
npm run comfy -- --check          # ComfyUI répond-il ?
npm run comfy -- --list-models    # quels checkpoints avez-vous installés ?

npm run comfy -- --workflow assets/comfy/backdrop.json \
  --set ckpt=votre-modele.safetensors \
  --set prompt="atelier de lutherie reconverti, mur de brique sombre, lumière rasante de fenêtre à petits carreaux, palette froide, ambiance nocturne" \
  --seed 42
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

## 3. Voie B — un serveur MCP ComfyUI

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

## 4. Où des rasters ont leur place — et où ils n'en ont pas

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

### Le budget, à surveiller

La V1 tient en 4,7 Mo de binaire pour un budget de 15 Mo (`09` §8), et le fichier
HTML unique en 283 Ko. Un décor plein écran en PNG pèse vite 400 Ko à 1 Mo.
Règles à tenir :

- une seule image de décor, en WebP, redimensionnée à la taille réellement
  affichée (1216 × 256 pour le bandeau), pas à la taille générée ;
- rien dans la version « fichier HTML unique » : les rasters y seraient inlinés
  en base64, ce qui coûte encore 33 % de plus ;
- toute image ajoutée passe par `npm run build:single` pour constater le coût
  avant d'être commitée.

## 5. Direction artistique (rappel pour les prompts)

L'univers est posé dans `07` §1 : une zone franche post-industrielle, un ancien
atelier de facteur d'instruments reconverti en labo. Les mots qui reviennent :
bois usé, acier, verre, lumière rasante, palette froide (`12` §2), nuit
permanente, aucune présence humaine dans le décor.

À proscrire dans les prompts : personnages et visages (l'atelier est vide, c'est
le sujet), texte incrusté, néons saturés, esthétique « cyberpunk » générique. Le
registre est celui d'un atelier abandonné qu'on rallume, pas d'une usine
futuriste.
