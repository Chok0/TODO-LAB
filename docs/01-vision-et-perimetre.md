# 01 — Vision et périmètre

> Projet : **Labo Kessler** (nom de code provisoire — anciennement "Idle Todo Labo")

## 1. Pitch

Une todo list gamifiée en widget desktop : chaque tâche accomplie dans la vraie vie rapporte des kessler, la monnaie qui finance un atelier de chimie hérité dans une zone franche post-industrielle. Le joueur développe machines et recettes, cultive ses intrants, et choisit en permanence entre une voie légale (lente, stable, riche en contenu) et une voie illégale (rapide, chaotique, taxée par la corruption). Un module narratif épistolaire capitalise ses choix moraux cumulés.

## 2. Expérience cible

- **La vraie vie est le moteur.** L'atelier ne s'amorce pas tout seul : sans tâche cochée, il n'y a ni premier plan, ni premier intrant, ni première vente. Le cachet d'une tâche suit ensuite la montée en gamme de l'atelier, de sorte que cocher une case reste une somme qui compte jusqu'à la fin. Le jeu est une machine à motivation, pas un aspirateur à temps.
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
| ~~DEC-01~~ | ~~Une seule fenêtre en V1~~ — **renversée après essai (DEC-12)**. | — |
| DEC-02 | **Sauvegarde JSON versionnée** (fichier unique + écriture atomique + 3 backups rotatifs), pas SQLite en V1. | Volume de données faible, schéma évolutif, migrations simples en TS. SQLite réévalué en V2 si l'historique devient lourd. |
| DEC-03 | **Toute la logique de jeu en TypeScript pur** (`/src/game-logic`), Rust limité à : fenêtre, tray, persistance, notifications. | Testable en Vitest sans Tauri, itération rapide, un seul langage pour l'équilibrage. |
| DEC-04 | **Identifiants de code en anglais, textes UI en français** centralisés dans `/src/i18n/fr.ts`. | Convention d'écosystème ; la table de correspondance domaine FR→EN est dans `10-modele-de-donnees.md` §1. |
| DEC-05 | **RNG seedé** (mulberry32) injecté partout, seed sauvegardée. | Tests déterministes du contenu procédural et des événements. |
| ~~DEC-06~~ | ~~Ressource primaire **Énergie (EN)** distincte de la monnaie **Kess (₭)**~~ — **renversée (DEC-14)**. | — |
| DEC-07 | **Moteur = réducteur pur** : `applyAction(state, action)` + `advanceTime(state, from, to)` retournant `{state, effects[]}`. Jamais d'incrément par tick fixe. | Résiste au throttling des timers, au masquage de fenêtre et au calcul offline — même chemin de code partout. |
| DEC-08 | **Recettes V1 fixes (6 recettes "signature" définies en data)** ; la génération combinatoire de recettes passe en V1.5. | L'arbre V1 de la note liste 6 recettes précises ; le générateur combinatoire a besoin d'une économie stabilisée pour être équilibrable. |
| DEC-09 | Événement de corruption = **carte épinglée non bloquante** dans le dock, mais bloque le lancement de nouvelles productions illégales tant qu'irrésolu. | Respecte la discrétion du widget tout en créant la pression voulue. |
| DEC-10 | **Bootstrap narratif et économique** : l'atelier de l'oncle contient un extracteur récupérable (construction offerte après R&D) + 3 graines médicinales + une dette d'ouverture de 500 ₭ envers la Zone. | Explique mécaniquement le besoin d'argent rapide (note §4b) et fournit le premier arc narratif. |
| DEC-11 | Fenêtre fermée = production machines plafonnée à **12 h** de rattrapage ; croissance des plantes **non plafonnée** (durée fixe). | Standard idle : récompense le retour sans rendre l'absence optimale. |
| DEC-12 | **Deux fenêtres** (renverse DEC-01) : `todo` ancrée au bord droit sur la hauteur utile, `atelier` posée au-dessus de la barre des tâches sur la largeur restante. Les deux se calent sur la *zone de travail* de l'écran. | Le dock vertical de 380 px étouffait la partie jeu : elle n'y tenait qu'en listes. Un bandeau large permet une scène en élévation — établi, cultures, mur — c'est-à-dire un jeu plutôt qu'un tableau de bord. |
| DEC-13 | La fenêtre `todo` est **l'hôte** : elle seule fait avancer le temps et écrit la sauvegarde. `atelier` est cliente — elle envoie ses actions et affiche l'état diffusé. Chaque fenêtre garde une horloge d'affichage locale pour ses jauges. | Une seule horloge, un seul écrivain : pas de partie divergente ni d'écriture concurrente. Diffuser l'état seulement quand il change évite d'envoyer l'état complet chaque seconde. |
| DEC-14 | **Monnaie unique : le kessler (₭)** (renverse DEC-06). Une tâche cochée rapporte des ₭ ; la R&D, les machines, les graines, les intrants, les clés et les incidents se paient en ₭. Le cachet d'une tâche est indexé sur le **prix de vente net du meilleur produit accessible** — ce que l'atelier encaisse vraiment, taxe de corruption comprise. | Deux compteurs pour un seul geste (cocher) demandaient au joueur d'arbitrer entre deux réserves sans jamais pouvoir les comparer. Un compteur unique rend chaque décision lisible : ce plan coûte trois grosses tâches. L'indexation évite le défaut symétrique — qu'une tâche devienne dérisoire dès la deuxième machine. |
| DEC-15 | Les deux fenêtres se posent **au niveau du bureau** (`alwaysOnBottom`), sous les applications, et non par-dessus. Trois niveaux au choix dans les réglages : bureau (défaut), fenêtre ordinaire, premier plan. | Un widget permanent qui recouvre le travail en cours devient un obstacle et finit masqué. Posé sur le fond d'écran, il se consulte en réduisant les fenêtres — le geste que fait déjà quiconque veut « voir son bureau ». |
| DEC-16 | Le **farming se débloque** (recherche « Remise en culture ») ; avant cela les intrants s'achètent au **Fournisseur**, dans la limite d'un quota quotidien. | La partie commençait avec deux parcelles offertes, donc sans rien à désirer côté agriculture. Acheter d'abord, cultiver ensuite donne un palier économique franc : le même intrant, deux fois et demie moins cher, contre du temps de croissance. Le quota est ce qui empêche l'achat de rester préférable. |

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
| `14-passerelle-comfyui.md` | Génération d'images : script, workflows, ce qui reste en SVG |
| `GLOSSAIRE.md` | Vocabulaire canonique du projet |
