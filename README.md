# Labo Kessler — todo list gamifiée en widget desktop

> Nom de code provisoire. Une todo list en widget desktop où chaque tâche accomplie dans la vraie vie alimente un atelier de chimie hérité dans une zone franche — avec une voie légale lente et riche, une voie illégale rapide et taxée, et une correspondance qui se souvient de vos choix.

## État du projet

**Phase actuelle : documentation terminée, prêt pour l'implémentation.** Aucune ligne de code n'existe encore — c'est voulu. La documentation dans `/docs` est la spécification complète du jeu et de l'application ; l'implémentation se fait goal par goal (`docs/13-roadmap-et-tests.md`).

## Lire la documentation

Ordre de lecture recommandé (une lecture intégrale est nécessaire avant le Goal 1) :

| # | Document | Ce qu'il fixe |
|---|---|---|
| 1 | [`docs/01-vision-et-perimetre.md`](docs/01-vision-et-perimetre.md) | Pitch, piliers, périmètre V1/V1.5/V2, **registre des décisions (DEC-01…11)** |
| 2 | [`docs/02-economie-et-equilibrage.md`](docs/02-economie-et-equilibrage.md) | Ressources, flux, **toutes les formules et constantes initiales** |
| 3 | [`docs/03-module-todos.md`](docs/03-module-todos.md) | Todos, habitudes, moteur de récurrence, parseur de saisie |
| 4 | [`docs/04-module-labo.md`](docs/04-module-labo.md) | R&D, machines, production, recettes |
| 5 | [`docs/05-module-farming.md`](docs/05-module-farming.md) | Parcelles, plantes, méthodes, dette environnementale |
| 6 | [`docs/06-corruption-et-alignement.md`](docs/06-corruption-et-alignement.md) | Clés, taxe, événements, alignement, texture Fin×Moyens |
| 7 | [`docs/07-narratif-et-module-log.md`](docs/07-narratif-et-module-log.md) | Univers, factions, PNJ, module Log |
| 8 | [`docs/08-generation-procedurale.md`](docs/08-generation-procedurale.md) | Pools, générateurs, RNG seedé, **budgets d'écriture** |
| 9 | [`docs/09-architecture-technique.md`](docs/09-architecture-technique.md) | Stack Tauri/Svelte/TS, moteur-réducteur, IPC, persistance, arborescence |
| 10 | [`docs/10-modele-de-donnees.md`](docs/10-modele-de-donnees.md) | `GameState` normatif, migrations, invariants |
| 11 | [`docs/11-ui-ux.md`](docs/11-ui-ux.md) | Layout, composant Panel, interactions, onboarding |
| 12 | [`docs/12-design-system-svg.md`](docs/12-design-system-svg.md) | Tokens, typo, icônes, machines/plantes SVG, animations |
| 13 | [`docs/13-roadmap-et-tests.md`](docs/13-roadmap-et-tests.md) | **Les 6 goals d'implémentation et leurs critères d'acceptation** |
| — | [`docs/GLOSSAIRE.md`](docs/GLOSSAIRE.md) | Vocabulaire canonique |
| — | `docs/archive/note-cadrage-idle-labo_1.md` | Note de cadrage d'origine (historique — les docs ci-dessus font foi) |

## Instructions pour l'agent d'implémentation (Claude Code / Opus)

Contraintes transversales, non négociables — reprises et détaillées dans les docs :

1. **Suivre la roadmap** : implémenter les goals de `docs/13` dans l'ordre, un goal à la fois, en démontrant ses critères d'acceptation avant de passer au suivant.
2. **Toute la logique de jeu en TypeScript pur** dans `/src/game-logic` — zéro import Svelte/Tauri, testable en Vitest sans lancer l'app (DEC-03, `09` §2).
3. **Un seul chemin pour le temps** : tout passe par `advanceTime(state, from, to)` ; jamais d'incrément par tick fixe, jamais de `Math.random`/`new Date()` hors `rng.ts`/`time.ts` (DEC-05/07).
4. **Toutes les constantes d'équilibrage dans `balance.ts`**, aucune ailleurs (`02`).
5. **Aucun contenu écrit en dur au-delà des pools et gabarits de `docs/08`** — le volume vient des templates × formules, pas de l'écriture. Les seules exceptions : les 3 lettres d'ouverture (`07` §5).
6. **Aucun asset externe, aucune requête réseau au runtime** : tout le visuel est généré en SVG/CSS selon `docs/12`, les polices sont bundlées.
7. **Les scénarios de test « obligatoires »** en fin des docs 03–08 sont la spec exécutable : les implémenter tels quels.
8. **Textes UI en français** centralisés dans `/src/i18n/fr.ts`, identifiants de code en anglais (DEC-04, table de correspondance dans `10` §1).
9. En cas d'ambiguïté ou de contradiction entre docs : `02` fait foi pour les chiffres, `10` pour les données, `13` pour le périmètre d'un goal — et le choix retenu se documente dans le registre des décisions de `01` §8.

## Stack (résumé)

Tauri 2 (Rust) + Svelte 5 + TypeScript strict + Vite + Vitest. Fenêtre-widget translucide always-on-top avec tray, sauvegarde JSON atomique locale, aucun serveur. Détail : `docs/09-architecture-technique.md`.
