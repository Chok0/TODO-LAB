# Labo Kessler — todo list gamifiée en widget desktop

> Une todo list qui vit sur le bord de votre écran. Chaque tâche accomplie dans la vraie vie produit de l'Énergie, et cette Énergie alimente un atelier de chimie hérité dans une zone franche post-industrielle. Développez vos machines, cultivez vos intrants, et choisissez à chaque étape entre la voie légale — lente, stable, respectée — et les arrangements de la Zone : rapides, chers, et définitifs. Une correspondance se souvient de tout ce que vous avez choisi.

**État : V1 jouable.** Logique de jeu complète et testée, interface complète, application desktop qui se build.

---

## Installer le jeu

Trois voies, de la plus simple à la plus complète.

### 1. Un seul fichier HTML — rien à installer

```bash
npm install && npm run build:single
```

Produit `dist-single/labo-kessler.html` : **283 Ko, un seul fichier, aucune dépendance réseau**. Double-cliquez, le jeu s'ouvre dans votre navigateur et se sauvegarde dedans. Pratique pour essayer, ou pour emporter la partie sur une clé USB.

### 2. L'installeur Windows (.exe) — sans rien installer non plus

C'est GitHub qui compile : Tauri ne sait pas fabriquer un `.exe` depuis Linux ou macOS, chaque plateforme doit se construire sur sa propre machine.

**Au choix :**

- **Bouton** — onglet *Actions* du dépôt → *Installeur Windows* → *Run workflow*. À la fin du run (~8 min), le `.exe` et le `.msi` se téléchargent en bas de la page, dans *Artifacts*.
- **Tag de version** — `git tag v1.0.0 && git push origin v1.0.0` crée en plus une *release* brouillon avec les installeurs attachés.

Les vérifications (typage, tests) tournent dans un job **séparé qui ne bloque pas la fabrication** : un test rouge se voit, mais ne vous prive pas de votre installeur.

> L'installeur n'est pas signé. Windows affichera un écran SmartScreen au premier lancement : *Informations complémentaires → Exécuter quand même*. Signer demande un certificat payant chez Microsoft — inutile pour un usage personnel.

**macOS et Linux** vivent dans un second workflow, [`installeur-autres-plateformes.yml`](.github/workflows/installeur-autres-plateformes.yml), qui **ne se déclenche jamais tout seul** — ni sur tag, ni sur push. Il ne tourne que si vous cliquez dessus. Supprimez le fichier si vous êtes sûr de ne jamais en avoir besoin : le workflow Windows est indépendant.

### 3. Compiler soi-même

```bash
npm install
npm run tauri dev     # développement, rechargement à chaud
npm run tauri build   # installeurs dans src-tauri/target/release/bundle/
```

Nécessite [Node](https://nodejs.org) et [Rust](https://rustup.rs). Sous Windows, WebView2 est déjà présent sur Windows 10/11. Sous Linux : `libwebkit2gtk-4.1-dev`, `libappindicator3-dev`, `librsvg2-dev`, `patchelf`. Détail : [prérequis Tauri](https://tauri.app/start/prerequisites/).

Pour développer sans toucher à Rust : `npm run dev` ouvre le jeu sur `http://localhost:5173`. Il est **entièrement jouable ainsi** — seules les fonctions de coque manquent (fenêtre transparente, barre système, notifications).

### Où vit la sauvegarde

| | |
|---|---|
| Application desktop | `%APPDATA%/fr.kessler.labo/save/` (Windows), `~/Library/Application Support/fr.kessler.labo/save/` (macOS), `~/.local/share/fr.kessler.labo/save/` (Linux) |
| Navigateur / fichier HTML | stockage local du navigateur |

Dans les deux cas, *Réglages → Exporter la sauvegarde* produit un `.json` réimportable ailleurs.

## Vérifier

```bash
npm run verify        # typage + 77 tests + tests Rust + build
npm test              # logique de jeu seule
npm run sim -- --days 21 --seed 42 --strategy legal    # simulateur d'équilibrage
npm run sim -- --days 30 --seed 42 --strategy mixed --letters   # avec la correspondance
```

Le simulateur est l'outil d'équilibrage du projet : il rejoue une partie complète par sessions réalistes et imprime la courbe jour par jour. C'est lui qui a révélé les trois défauts corrigés avant livraison (voir `docs/qa-v1.md` §5).

## Comment on joue

1. **Écrivez ce que vous avez à faire** dans le champ du haut. Le parseur comprend le français : « appeler le comptable tous les lundis », « sport 3 fois par semaine », « limiter café max 3 par jour ». Corrigez d'un clic sur une puce, `Entrée` valide.
2. **Cochez vos tâches.** Chaque complétion produit de l'Énergie — 1 à 8 selon la difficulté. C'est la seule source d'Énergie du jeu.
3. **Dépensez-la en recherche.** L'extracteur de votre oncle est encore là ; il ne demande qu'un plan.
4. **Semez, récoltez, raffinez, vendez.** Le convoyeur (60 EN) fait basculer le jeu en vrai idle : les machines tournent pendant que vous travaillez.
5. **Choisissez.** La Coopérative paie mieux mais impose ses délais. La Zone ouvre des recettes très lucratives contre une taxe permanente et des incidents qu'il faudra régler — en argent, en réputation, ou en service rendu.

Tout est local : aucun compte, aucun serveur, aucune requête réseau au runtime.

## Architecture en une page

```
/src/game-logic     TypeScript pur, zéro dépendance UI — toute la règle du jeu vit ici
  engine.ts         applyAction(state, action) + advanceTime(state, from, to)
  balance.ts        TOUTES les constantes d'équilibrage
  data/             recettes, plantes, arbre de tech, pools d'événements, lettres
/src/components     Svelte — ne mute jamais l'état, envoie des actions
/src/stores         pont moteur ↔ UI : tick, autosave, undo
/src-tauri          Rust : fenêtre, tray, persistance atomique. Ne connaît aucune règle de jeu.
/tests              77 tests, miroirs des scénarios obligatoires de la documentation
/scripts            simulateur d'équilibrage
```

Deux principes portent tout le reste :

- **Un seul chemin pour le temps.** Rien n'avance « par tick » : tout est fonction de `(état, instant de départ, instant d'arrivée)`. Le même code sert au tick d'une seconde, au retour de veille et au rattrapage après deux jours d'absence — donc rien ne se désynchronise jamais.
- **Le moteur est un réducteur pur.** Il ne connaît ni le DOM, ni Tauri, ni l'horloge : on lui passe l'instant. C'est ce qui permet de simuler 21 jours de partie en une seconde et de tester l'équilibrage sans lancer l'application.

## Documentation

La spécification complète est dans [`/docs`](docs/) — elle a précédé le code et reste la référence.

| # | Document | Contenu |
|---|---|---|
| 1 | [Vision et périmètre](docs/01-vision-et-perimetre.md) | Piliers, périmètre V1/V1.5/V2, registre des décisions |
| 2 | [Économie](docs/02-economie-et-equilibrage.md) | Ressources, formules, constantes |
| 3 | [Todos](docs/03-module-todos.md) | Types, habitudes, récurrence, parseur |
| 4 | [Labo](docs/04-module-labo.md) | R&D, machines, production |
| 5 | [Farming](docs/05-module-farming.md) | Parcelles, plantes, dette environnementale |
| 6 | [Corruption et alignement](docs/06-corruption-et-alignement.md) | Clés, événements, texture Fin×Moyens |
| 7 | [Narratif](docs/07-narratif-et-module-log.md) | Univers, factions, PNJ, module Log |
| 8 | [Génération procédurale](docs/08-generation-procedurale.md) | Pools, générateurs, RNG seedé |
| 9 | [Architecture](docs/09-architecture-technique.md) | Stack, moteur, IPC, persistance |
| 10 | [Modèle de données](docs/10-modele-de-donnees.md) | `GameState`, migrations, invariants |
| 11 | [UI/UX](docs/11-ui-ux.md) | Layout, composants, onboarding |
| 12 | [Design system](docs/12-design-system-svg.md) | Tokens, icônes, machines et plantes SVG |
| 13 | [Roadmap et tests](docs/13-roadmap-et-tests.md) | Les 6 goals et leurs critères |
| — | [Recette V1](docs/qa-v1.md) | Ce qui a été vérifié, comment, et ce qui reste à tester sur une vraie machine |
| — | [Glossaire](docs/GLOSSAIRE.md) | Vocabulaire canonique |

## Ce qui reste pour plus tard

**V1.5** — affinage du parseur via API en secours, presse et catalyseur, recettes combinatoires, raccourci global, lancement au démarrage, notifications planifiées.
**V2** — mining, prestige, fins de trajectoire, bandeau détachable, plusieurs machines du même type, récolte automatique.
