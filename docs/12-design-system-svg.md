# 12 — Design system SVG

Objectif : un univers visuel **entièrement généré en code** (SVG + CSS), cohérent, sans aucun asset externe ni dépendance réseau au runtime. Tout est du texte — donc itérable par l'agent d'implémentation, tour après tour.

## 1. Pourquoi (rappel des contraintes)

- Aucune licence à vérifier, aucune indisponibilité réseau possible.
- Cohérence garantie : une palette, une grammaire de formes, définies une fois.
- Anime bien en CSS pur (rotation, remplissage, particules simples) sans lib.
- Un SVG se corrige par diff — pas de régénération d'image.

## 2. Design tokens (`/src/assets/svg/tokens.css`)

Toutes les couleurs de l'app viennent d'ici — aucun hex ailleurs (règle lint sur les composants).

```css
:root {
  /* fond & texte (widget sombre translucide) */
  --bg-0: #14181d;            /* fond principal (opacité pilotée par réglage) */
  --bg-1: #1c2229;            /* cartes / panneaux */
  --bg-2: #242c35;            /* éléments surélevés */
  --text-0: #e8e6e3;  --text-dim: #9aa3ab;  --line: #313b46;

  /* modules */
  --lab: #2a9d8f;             /* teal labo */
  --lab-steel: #5c6b73;       /* acier machines */
  --farm: #588157;            /* vert organique */
  --farm-soil: #6b5844;       /* terre */
  --legal: #3a6ea5;           /* bleu propre (Coopérative) */
  --corrupt: #a4243b;         /* rouge corruption */
  --corrupt-gold: #b08d3e;    /* or terni (clés, Zone) */
  --broker: #8d7fa8;          /* violet gris (Courtier) */

  /* catégories todo */
  --perso: #c96f4a;           /* terracotta */
  --pro: #4a7ba6;             /* bleu ardoise */

  /* sémantique */
  --ok: #7fb069;  --warn: #d9a441;  --danger: #a4243b;
  --supply: #e9c46a;          /* Fournisseur, caisses */
  --kess: #b08d3e;            /* monnaie */

  /* géométrie */
  --radius: 6px;  --radius-sm: 3px;
  --space: 8px;               /* grille d'espacement : multiples de 8 */
  --shadow: 0 2px 8px rgb(0 0 0 / .35);
}
```

Teintes de fond des cartes todo : `color-mix(in oklab, var(--perso) 12%, var(--bg-1))` (idem `--pro`) — jamais d'hex dérivé écrit en dur.

## 3. Thème de fenêtre

Fond `--bg-0` avec opacité réglable 60–100 % (`11` §7) ; le texte reste sur des surfaces `--bg-1` opaques à ≥ 85 % pour garantir le contraste (`11` §11). Un seul thème en V1 (sombre) — le widget vit sur des bureaux variés, le sombre translucide est le plus neutre.

## 4. Typographie (bundlée localement, jamais de CDN)

| Usage | Police | Fallback |
|---|---|---|
| UI générale | **IBM Plex Sans** (400/600) | system-ui |
| Chiffres, jauges, Registre | **IBM Plex Mono** (400) | monospace |
| Lettres de la Correspondance | **Special Elite** (machine à écrire) | serif |

Fichiers `.woff2` téléchargés depuis Google Fonts **au moment du build initial** et committés dans `/src/assets/fonts/` avec leur licence (OFL). Tailles : 13 px base, 11 px dim/meta, 15 px titres de panneau, 14 px corps de lettre.

## 5. Grammaire iconographique

- Grille **24×24**, stroke **2 px**, `stroke-linecap/linejoin: round`, coins arrondis rayon 2, style outline ; remplissages réservés aux accents d'état (couleur du module).
- Icônes lisibles à 16 px (test : chaque icône rendue à 16 px doit rester identifiable).
- **Set UI (12)** : todo/check, plus, chevron, épingle (niveau de fenêtre), engrenage (réglages), cadenas, chariot (Fournisseur), pièce (₭), goutte (propre), fumée (dégradant), enveloppe, alerte.
- **Set récurrence (5)** : ponctuelle (point), fixe (calendrier), flexible (vague), abstinence (bouclier), compteur (barres).
- **Set ressources (8)** : récolte, PA (fiole), produit (caisse), réputation (poignée de main), clé de corruption, dette (jauge fendue), pollution (nuage), streak (flamme).
- Wrapper Svelte `Icon.svelte` : `<Icon name size tone />`, SVG inline (pas de sprite externe), `currentColor` par défaut.

## 6. Machines (SVG 64×64)

Anatomie commune — 3 calques par machine :

1. **Base** : châssis en `--lab-steel`, silhouette propre au template (l'extracteur garde un étau et un gabarit de lutherie au mur — trace de l'atelier du facteur d'instruments, `07` §1).
2. **Module actif** : la partie qui identifie la fonction (cuve, colonne, serpentin) en couleur du module.
3. **Accents Mk** : détails additionnels activés par niveau (Mk2 : tuyauterie cuivre + voyant) — la montée en niveau **ajoute des calques**, ne redessine pas.

États visuels (classes CSS sur le même SVG) : `idle` (statique, voyants éteints), `running` (animations §8, voyants), `blocked` (voyant `--warn` clignotant lent). Variantes de palette par branche : une machine produisant de l'illégal teinte ses accents vers `--corrupt-gold`.

## 7. Plantes (SVG 48×48)

Un dessin de base par **stade** (4 : semis, pousse, mature, prêt-à-récolter) ; le template (médicinale/industrielle/récréative/toxique) ne change que la palette de la frondaison et un détail de silhouette (fleur, épi, capsule) — 4 stades + 4 variantes = 16 rendus pour ~5 dessins réels. Parcelle : cadre de terre `--farm-soil`, badge dette (jauge fendue) en surimpression si > 10 %.

## 8. Animations (CSS uniquement)

| Élément | Animation | Durée |
|---|---|---|
| Machine `running` | rotation d'engrenage / bulles de cuve (2-3 éléments max) | boucle 2-4 s |
| Jauge de cycle | remplissage linéaire piloté par la vraie progression (custom property mise à jour au tick) | continue |
| Complétion de todo | check qui se dessine (stroke-dashoffset) + flottant `+X ₭` qui monte et s'estompe | 400 ms |
| Récolte | 3-5 particules simples | 500 ms |
| Repli de panneau | hauteur ease-out | 150 ms |
| Lettre non lue | pastille — pulsation lente unique puis statique | 2 s puis stop |

Règles dures : jamais plus d'une animation d'ambiance par carte visible ; **toutes les animations en pause quand la fenêtre est masquée** (`09` §8) ; `prefers-reduced-motion` coupe tout le décoratif ; pas d'animation JS (hors mise à jour de custom properties au tick).

## 9. Organisation des fichiers

```
/src/assets/svg/
  tokens.css
  icons/            → un .svelte par icône (inline, currentColor)
  machines/         → Extractor.svelte, Still.svelte, Synthesizer.svelte
  plants/           → Plant.svelte (props: template, stage)
  misc/             → logo tray (16/32 px), pastilles d'état
/src/assets/fonts/  → .woff2 + OFL.txt
```

Les composants machines/plantes prennent leurs états en props (`mk`, `state`, `branch`, `stage`) et n'embarquent aucune logique de jeu.

## 10. Ordre de production (Goal 4)

1. `tokens.css` + fonts bundlées.
2. Set UI + récurrence (17 icônes) — débloque la vraie UI todo.
3. Set ressources (8).
4. Machines (3 × 3 états × accents Mk2).
5. Plantes (stades + variantes).
6. Animations et raffinements.

Critère de cohérence final : une capture de l'app complète doit donner l'impression d'**un seul illustrateur** — même stroke, même palette, même géométrie partout.
