# 13 — Roadmap et stratégie de test

Séquence de goals pour l'agent d'implémentation. Chaque goal se termine sur une **condition vérifiable** (tests qui passent, sortie console, capture) — jamais un critère flou. Un goal n'est pas terminé tant que ses critères ne sont pas démontrés.

## 0. Definition of Done transversale (tous les goals)

- `npm run check` (svelte-check + tsc), `npm run lint`, `npm test` passent.
- Aucune constante d'équilibrage hors `balance.ts` ; aucun contenu narratif hors des pools de `08` ; aucun import interdit dans `/src/game-logic` (`09` §9) ; aucun hex hors `tokens.css` (à partir du Goal 4).
- Les scénarios de test « obligatoires » listés en fin des docs 03–08 concernés sont implémentés tels quels.
- Commit(s) descriptifs pushés sur la branche de travail.

## Goal 1 — Squelette Tauri + module Todos complet

**Périmètre** : app Tauri qui démarre (fenêtre colonne transparente always-on-top, tray, single-instance, masquer≠quitter) ; composant `Panel` repliable réutilisable (`11` §3) ; colonne todo complète : 3 types (ponctuelle / récurrente / habitude binaire + compteur), quick-add avec parseur par règles et chips, code couleur catégorie + type, groupes Aujourd'hui/Semaine/Plus tard, panneau Habitudes replié par défaut ; moteur `applyAction`/`advanceTime` (périmètre todos : EN, minuits, streaks, pénalités) ; persistance atomique Rust + autosave + migrations v1 ; undo 10 s.

**Hors périmètre** : tout le reste du jeu (le solde d'EN s'accumule, c'est tout). Icônes provisoires acceptées (formes basiques), pas le design system.

**Critères d'acceptation** :
1. `npm test` vert — suites : moteur de récurrence (8 scénarios de `03` §8), parseur (8 cas de `03` §4.4), pénalités/streaks (`02` §4), `cargo test` persistance (écriture atomique + récupération backup).
2. Démonstration console (script `npm run sim -- --days 5 --seed 42`) : simulation de 5 jours avec todos variées → solde d'EN final exact et reproductible.
3. Capture d'écran : colonne avec les 3 types visibles, chips du parseur sur une saisie type, panneau Habitudes replié.
4. Relance de l'app : todos et solde persistés, panneau Habitudes de nouveau replié même s'il était déplié.

## Goal 2 — Game-logic labo + farming

**Périmètre** : `/src/game-logic` étendu — ressources complètes, extracteur + distillateur (cycles, Mk, convoyeur), farming (4 templates, 2 méthodes, dette, jachère, 5 parcelles), extraction, recettes légales (Tonique/Remède std/premium), ventes et prix effectifs (sans bandes ni corruption : modificateurs à 1), pollution/nettoyage, arbre R&D légal, offline 12 h, RNG seedé + grammaire de nommage. UI minimale de debug (boutons bruts dans le dock) acceptée.

**Critères d'acceptation** :
1. Suites Vitest : `04` §7 (scénarios 1-7 hors corruption), `05` §8 (1-6), courbes de coût, offline (20 h → 12 h créditées).
2. `npm run sim -- --days 14 --seed 42 --strategy legal` : sortie tabulaire jour par jour (EN, ₭, machines, dette) conforme à la courbe cible de `02` §13 (±20 %).
3. Couverture ≥ 90 % sur `/src/game-logic` (hors data).

## Goal 3 — Branche illégale, corruption, alignement, texture

**Périmètre** : clés + taxe, synthétiseur + 3 recettes illégales, graine toxique verrouillée, générateur d'événements (pools complets de `08` §6, 3 résolutions, faveurs, contrats, saisie), dette d'ouverture (rappels, remboursement, conversion), score d'alignement (deltas, decay, bandes, plafond quotidien), réputations, commission Courtier, subventions, texture Fin×Moyens + compteurs.

**Critères d'acceptation** :
1. Suites Vitest : `06` §7 (les 7 scénarios, dont le cas « cynique » chiffré), `08` §8 (tests 1-3).
2. `npm run sim -- --days 21 --seed 42 --strategy illegal` vs `--strategy legal` : l'illégal atteint le Synthétiseur Mk2 plus vite mais finit avec un revenu/jour effectif inférieur à J+21 (l'accordéon se paye) — l'assertion fait partie du test.
3. Sortie console d'un scénario scripté montrant : achat Clé 1 → événement au cycle prédit par la seed → les 3 résolutions testées sur trois branches de la simulation.

## Goal 4 — Design system SVG + vraie UI des modules

**Périmètre** : `tokens.css`, fonts bundlées, les 3 sets d'icônes, machines animées (états/Mk/branche), plantes (stades), intégration complète du dock (`11` §5), mode discret, indicateur d'alignement, réglages, badges, undo/toasts, accessibilité (`11` §11).

**Critères d'acceptation** :
1. Captures : (a) app complète en jeu — cohérence « un seul illustrateur » ; (b) mode discret ; (c) machine `running` vs `idle` vs `blocked` ; (d) les 4 stades d'une plante.
2. Zéro hex hors `tokens.css` (vérifié par lint) ; `prefers-reduced-motion` testé (toggle OS ou media query forcée).
3. Budgets tenus : RAM < 150 Mo, CPU masqué ~0 % (mesure indiquée dans le rapport de goal).

## Goal 5 — Module Log + narratif

**Périmètre** : les 3 onglets du Log (Correspondance avec typo dédiée, Registre branché sur les effets, Carnet avec tendances), 3 lettres d'ouverture scriptées, 24 templates de lettres (budget de `08` §7, voix de `07` §3), file anti-spam, déclencheurs complets (paliers, événements, bandes, textures, streaks, offres), onboarding diégétique (`11` §8).

**Critères d'acceptation** :
1. Suites Vitest : `07` §6 (scénarios 1-5), `08` §8 (tests 4-5 : variables toutes résolues, anti-répétition).
2. `npm run sim -- --days 30 --seed 42 --strategy mixed --letters` : imprime les 30 jours de correspondance — relecture humaine : chaque lettre doit être identifiable à son PNJ sans signature.
3. Capture du premier lancement (lettre du notaire) et de l'onglet Carnet avec de vraies tendances.

## Goal 6 — Polish et release V1

**Périmètre** : notifications d'échéances à l'ouverture, export/import de save, validation d'invariants au chargement, gestion multi-écrans, écran de récupération de save, revue des budgets perf, packaging (`tauri build`) pour la plateforme hôte, QA manuelle sur checklist, `README` racine mis à jour avec instructions de build.

**Critères d'acceptation** :
1. Binaire produit et lancé depuis l'installeur ; taille < 15 Mo ; démarrage < 2 s.
2. Checklist QA manuelle passée et committée dans `docs/qa-v1.md` : cycle jour complet, absence 2 jours simulée (horloge), corruption de save volontaire → récupération, DST simulé, double lancement (single-instance).
3. Tag `v1.0.0`.

## Stratégie de test — synthèse

| Niveau | Outil | Cible |
|---|---|---|
| Unitaire logique | Vitest | Tout `/src/game-logic` — les scénarios « obligatoires » des docs 03–08 sont la spec exécutable |
| Simulation | script `sim` (Node, réutilise le moteur) | Équilibrage et régression économique sur des runs multi-jours seedés |
| Rust | `cargo test` | Écriture atomique, rotation de backups |
| Manuel | checklist QA | Fenêtre/tray/OS, DST, multi-écrans, perf |

Le script `sim` est un livrable de première classe (Goal 1) : c'est l'outil d'équilibrage du projet — il doit accepter `--days --seed --strategy` et sortir un tableau lisible.

## Backlog post-V1 (rappel, ne pas implémenter)

V1.5 : fallback parseur via API Claude, presse + catalyseur, recettes combinatoires, raccourci global, autostart, notifications planifiées. V2 : mining, prestige, fins de trajectoires, bandeau détachable, multi-instances de machines, auto-récolte.
