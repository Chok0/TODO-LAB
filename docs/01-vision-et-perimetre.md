# 01 — Vision et périmètre

> Projet : **Labo Kessler** (nom de code provisoire — anciennement "Idle Todo Labo")

## 1. Pitch

Une todo list gamifiée en widget desktop : chaque tâche accomplie dans la vraie vie génère de l'Énergie qui alimente un atelier de chimie hérité dans une zone franche post-industrielle. Le joueur développe machines et recettes, cultive ses intrants, et choisit en permanence entre une voie légale (lente, stable, riche en contenu) et une voie illégale (rapide, chaotique, taxée par la corruption). Un module narratif épistolaire capitalise ses choix moraux cumulés.

## 2. Expérience cible

- **La vraie vie est le moteur.** Aucune ressource primaire n'est générée par le jeu lui-même : seule la complétion de todos réelles produit de l'Énergie. Le jeu est une machine à motivation, pas un aspirateur à temps.
- **Discret sur le bureau.** Le jeu vit en widget (colonne à droite de l'écran, translucide, always-on-top). Tout panneau est repliable individuellement ; l'emprise visuelle peut être réduite à une barre fine à tout moment.
- **Tension stratégique réelle.** L'asymétrie légal/illégal n'est pas un choix cosmétique : deux économies structurellement différentes (linéaire stable vs accordéon chaotique).
- **Contenu procédural borné.** Le volume perçu (machines, recettes, événements, lettres) vient de templates paramétrés × formules, jamais de contenu écrit en dur à l'infini. L'effort d'écriture est plafonné dès la conception.

## 3. Piliers de design

1. **Zéro friction de saisie** — ajouter une todo doit être aussi rapide que dans une app de notes ; un parseur par règles pré-remplit les paramètres depuis le texte libre.
2. **L'échéance pardonne, l'habitude engage** — une todo ratée ne punit pas par défaut ; seules les habitudes (configurées explicitement par l'utilisateur, avec ses propres seuils) portent des pénalités.
3. **Le choix moral a une texture, pas un tableau de bord** — le score d'alignement n'est jamais affiché en brut ; le joueur le lit dans le ton des lettres et les réactions des PNJ.
4. **Timestamp-based, jamais tick-based** — tout l'état du jeu est une fonction du temps écoulé ; l'app peut être fermée, masquée ou throttlée sans corrompre l'économie.

## 4. Anti-objectifs (ce que le jeu n'est PAS)

- Pas de multijoueur, pas de serveur, pas de compte en ligne — tout est local.
- Pas de monétisation, pas de dark patterns non plafonnés (le renforcement variable est volontairement borné, voir `02-economie-et-equilibrage.md` §12).
- Pas de barème moral imposé sur les habitudes : les seuils sont définis par l'utilisateur.
- Pas de simulation politico-économique complète : le politique n'existe que comme événements narratifs ponctuels.
- Pas d'assets externes (images, sons, packs) : tout le visuel est généré en SVG/CSS (voir `12-design-system-svg.md`).

## 5. Joueur cible et contexte d'usage

Un utilisateur unique (l'auteur du projet) : travailleur indépendant, sensible aux mécaniques idle, qui veut un compagnon de productivité tournant en permanence sur son bureau sans plomber la machine. Sessions d'interaction courtes (10 secondes — 2 minutes) plusieurs fois par jour ; le jeu progresse entre les interactions.

Plateformes : desktop Windows / Linux / macOS via Tauri. Aucune version mobile ou web prévue.

## 6. Périmètre par version

| Module / fonctionnalité | V1 | V1.5 | V2 |
|---|---|---|---|
| Todos (ponctuelle, récurrente, habitudes binaire + compteur) | ✔ cœur | | |
| Parseur de saisie par règles (offline) | ✔ | affinage via API Claude en fallback | |
| Labo — Développement (R&D, arbre tech) | ✔ | machines presse + catalyseur | |
| Labo — Production (recettes, choix Moyens propre/dégradant) | ✔ | recettes combinatoires procédurales | |
| Farming (4 templates de plantes, agroécologie/intensive, jachère) | ✔ | | |
| Mining | | | ✔ (ou fusionné dans "sources") |
| Corruption (clés, taxe, événements à 3 résolutions) | ✔ | | |
| Alignement (score caché, 3 trajectoires) + texture Fin/Moyens | ✔ | | |
| Story / Log (correspondance, templates PNJ) | ✔ light | | enrichi (fins de trajectoire, arcs longs) |
| Design system SVG complet | ✔ | | style plus illustratif si besoin |
| Prestige / reset doux | | | ✔ |
| Fenêtre bandeau bas détachable | | | ✔ |
| Raccourci global d'ajout de todo, autostart au login | | ✔ | |
| Notifications système planifiées | échéances du jour à l'ouverture | ✔ planifiées | |
| Export / import de sauvegarde (JSON) | ✔ | | |

## 7. Risques et mitigations

| Risque | Mitigation |
|---|---|
| Explosion de scope contenu | Contrainte dure : rien d'écrit au-delà des pools définis dans `08-generation-procedurale.md` |
| Équilibrage cassé (économie trop rapide/lente) | Toutes les constantes dans un seul fichier `balance.ts`, logique pure testable sans UI |
| Widget trop intrusif → rejet de l'outil | Tout repliable, mode discret, habitudes masquées par défaut |
| Dérive "machine à culpabilité" sur les habitudes | Seuils utilisateur uniquement, pénalités plafonnées, pas d'affichage passif |
| Complexité multi-fenêtres / overlay OS | V1 = une seule fenêtre colonne ; bandeau détaché repoussé en V2 |
| Horloge système manipulée ou changement d'heure | Règles de clamp définies dans `09-architecture-technique.md` §8 |

## 8. Registre des décisions structurantes

Décisions prises pendant la phase de documentation, au-delà de la note de cadrage d'origine (`docs/archive/note-cadrage-idle-labo_1.md`). Chacune peut être renversée avant le début du code — les renverser après coûtera plus cher.

| ID | Décision | Justification |
|---|---|---|
| DEC-01 | **Une seule fenêtre en V1** : la colonne droite contient todos + dock modules + log. Le "bandeau du bas" détaché devient une option V2. | Simplifie drastiquement la gestion de fenêtres Tauri (positionnement, always-on-top, multi-écrans) sans sacrifier le principe "tout repliable". |
| DEC-02 | **Sauvegarde JSON versionnée** (fichier unique + écriture atomique + 3 backups rotatifs), pas SQLite en V1. | Volume de données faible, schéma évolutif, migrations simples en TS. SQLite réévalué en V2 si l'historique devient lourd. |
| DEC-03 | **Toute la logique de jeu en TypeScript pur** (`/src/game-logic`), Rust limité à : fenêtre, tray, persistance, notifications. | Testable en Vitest sans Tauri, itération rapide, un seul langage pour l'équilibrage. |
| DEC-04 | **Identifiants de code en anglais, textes UI en français** centralisés dans `/src/i18n/fr.ts`. | Convention d'écosystème ; la table de correspondance domaine FR→EN est dans `10-modele-de-donnees.md` §1. |
| DEC-05 | **RNG seedé** (mulberry32) injecté partout, seed sauvegardée. | Tests déterministes du contenu procédural et des événements. |
| DEC-06 | Ressource primaire nommée **Énergie (EN)** ; monnaie locale nommée **Kess (₭)**. | L'Énergie représente l'élan investi dans l'atelier ; le Kess ancre la monnaie dans le lore de la Zone Franche de Kessler. |
| DEC-07 | **Moteur = réducteur pur** : `applyAction(state, action)` + `advanceTime(state, from, to)` retournant `{state, effects[]}`. Jamais d'incrément par tick fixe. | Résiste au throttling des timers, au masquage de fenêtre et au calcul offline — même chemin de code partout. |
| DEC-08 | **Recettes V1 fixes (6 recettes "signature" définies en data)** ; la génération combinatoire de recettes passe en V1.5. | L'arbre V1 de la note liste 6 recettes précises ; le générateur combinatoire a besoin d'une économie stabilisée pour être équilibrable. |
| DEC-09 | Événement de corruption = **carte épinglée non bloquante** dans le dock, mais bloque le lancement de nouvelles productions illégales tant qu'irrésolu. | Respecte la discrétion du widget tout en créant la pression voulue. |
| DEC-10 | **Bootstrap narratif et économique** : l'atelier de l'oncle contient un extracteur récupérable (construction offerte après R&D) + 3 graines médicinales + une dette d'ouverture de 500 ₭ envers la Zone. | Explique mécaniquement le besoin d'argent rapide (note §4b) et fournit le premier arc narratif. |
| DEC-11 | Fenêtre fermée = production machines plafonnée à **12 h** de rattrapage ; croissance des plantes **non plafonnée** (durée fixe). | Standard idle : récompense le retour sans rendre l'absence optimale. |

## 9. Carte de la documentation

| Document | Contenu |
|---|---|
| `01-vision-et-perimetre.md` | Ce document |
| `02-economie-et-equilibrage.md` | Ressources, flux, formules, constantes initiales |
| `03-module-todos.md` | Spécification complète du module Todos + parseur |
| `04-module-labo.md` | R&D, machines, production, recettes |
| `05-module-farming.md` | Parcelles, plantes, méthodes, dette environnementale |
| `06-corruption-et-alignement.md` | Clés, taxe, événements, score d'alignement, texture Fin/Moyens |
| `07-narratif-et-module-log.md` | Univers, factions, PNJ, module Log |
| `08-generation-procedurale.md` | Templates, pools, générateurs, RNG |
| `09-architecture-technique.md` | Stack, moteur, IPC, persistance, fenêtres |
| `10-modele-de-donnees.md` | Interfaces TypeScript, format de sauvegarde, invariants |
| `11-ui-ux.md` | Layout, composants, interactions, états |
| `12-design-system-svg.md` | Tokens, typographie, icônes, animations |
| `13-roadmap-et-tests.md` | Séquence de goals, critères d'acceptation, stratégie de test |
| `GLOSSAIRE.md` | Vocabulaire canonique du projet |
