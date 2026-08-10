# Labo Kessler — todo list gamifiée en widget desktop

> Une todo list posée sur votre bureau, sous vos fenêtres. Chaque tâche accomplie dans la vraie vie rapporte des kessler, et ces kessler financent un atelier de chimie hérité dans une zone franche post-industrielle. Achetez vos premiers intrants, remettez la friche en culture, développez vos machines — et choisissez à chaque étape entre la voie légale (lente, stable, respectée) et les arrangements de la Zone : rapides, chers, et définitifs. Une correspondance se souvient de tout ce que vous avez choisi.

**État : V1 jouable.** Logique de jeu complète et testée, interface complète, application desktop qui se build.

---

## Installer le jeu

Trois voies, de la plus simple à la plus complète.

### 1. Un seul fichier HTML — rien à installer

```bash
npm install && npm run build:single
```

Produit `dist-single/labo-kessler.html` : **321 Ko, un seul fichier, aucune dépendance réseau**. Double-cliquez, le jeu s'ouvre dans votre navigateur et se sauvegarde dedans. Pratique pour essayer, ou pour emporter la partie sur une clé USB.

### 2. L'installeur Windows (.exe) — sans rien installer non plus

C'est GitHub qui compile : Tauri ne sait pas fabriquer un `.exe` depuis Linux ou macOS, chaque plateforme doit se construire sur sa propre machine.

**Au choix :**

- **Bouton** — onglet *Actions* du dépôt → *Installeur Windows* → *Run workflow*. À la fin du run (~8 min), le `.exe` et le `.msi` se téléchargent en bas de la page, dans *Artifacts*.
- **Tag de version** — `git tag v1.0.0 && git push origin v1.0.0` crée en plus une *release* brouillon avec les installeurs attachés.

Les vérifications (typage, tests) tournent dans un job **séparé qui ne bloque pas la fabrication** : un test rouge se voit, mais ne vous prive pas de votre installeur.

L'installeur s'installe **pour votre compte utilisateur seul** (`installMode: currentUser`) : pas d'invite administrateur, rien dans `Program Files`, rien qui touche les autres comptes de la machine.

#### Windows bloque l'installeur — c'est attendu

L'installeur n'est **pas signé** : signer demande un certificat payant renouvelé chaque année, disproportionné pour un projet personnel. Windows ne sait donc pas qui l'a produit, et un fichier téléchargé quelques dizaines de fois n'a aucune réputation. Il vous met en garde par principe, pas parce qu'il a trouvé quelque chose.

Deux écrans différents, à ne pas confondre :

| Ce que vous voyez | Ce que ça veut dire | Quoi faire |
|---|---|---|
| Écran **bleu**, « Windows a protégé votre ordinateur », *éditeur inconnu* | SmartScreen : avertissement de réputation. Aucune analyse n'a rien trouvé. | *Informations complémentaires* → *Exécuter quand même* |
| Bandeau **rouge**, « Menace trouvée », fichier mis en quarantaine, nom de virus affiché | Détection antivirus réelle — ou faux positif | Ne passez pas outre à l'aveugle : vérifiez l'empreinte (ci-dessous) avant tout |

**Vérifier que le fichier est bien celui que GitHub a compilé.** Le workflow imprime l'empreinte SHA-256 de chaque installeur dans son journal (étape *Empreintes SHA-256*). Chez vous :

```powershell
Get-FileHash .\labo-kessler_1.0.0_x64-setup.exe -Algorithm SHA256
```

Si les deux chaînes sont identiques, le fichier est exactement celui que les serveurs de GitHub ont construit à partir du code de ce dépôt — il n'a été ni altéré en route, ni fabriqué ailleurs. Pour un second avis, [VirusTotal](https://www.virustotal.com) accepte le fichier ou son empreinte.

**Ce que le programme fait, et ce qu'il ne fait pas.** Il ouvre deux fenêtres, pose une icône dans la barre système, affiche des notifications, et écrit un fichier JSON de sauvegarde dans `%APPDATA%\fr.kessler.labo\save\`. C'est tout. Il ne **communique avec rien** : six dépendances Rust en tout ([`src-tauri/Cargo.toml`](src-tauri/Cargo.toml) — tauri, trois greffons officiels pour l'instance unique / les notifications / les dialogues de fichier, et serde pour lire le JSON), donc aucun greffon réseau, aucun updater, aucune télémétrie ; et la politique de sécurité de la fenêtre (`csp` dans [`tauri.conf.json`](src-tauri/tauri.conf.json)) interdit à l'interface toute connexion sortante. Les permissions accordées à l'interface sont listées et minimales : [`src-tauri/capabilities/default.json`](src-tauri/capabilities/default.json) — fenêtre, notifications, ouverture/enregistrement de fichier. Rien sur le système de fichiers hors du dossier de sauvegarde, rien sur le shell, rien sur le réseau.

**Si vous préférez ne pas installer du tout** : le fichier HTML unique (voie 1 ci-dessus) est un simple document, sans exécutable, et le jeu y est complet — seules manquent les fonctions de coque (fenêtres ancrées, barre système, notifications).

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

### Désinstaller

*Paramètres → Applications → Applications installées → **Labo Kessler** → Désinstaller.* Pas d'invite administrateur : l'installation appartient à votre compte. L'`uninstall.exe` posé dans le dossier d'installation fait exactement la même chose.

Quittez d'abord l'application par la barre système (*clic droit sur l'icône → Quitter*) : fenêtres masquées, elle tourne toujours, et le désinstalleur bute sur les fichiers verrouillés.

La désinstallation retire le programme, **pas vos données** — c'est volontaire : réinstaller retrouve la partie. Deux dossiers survivent, à supprimer à la main pour effacer toute trace :

| Dossier | Contenu |
|---|---|
| `%APPDATA%\fr.kessler.labo\` | la sauvegarde et ses trois copies de secours |
| `%LOCALAPPDATA%\fr.kessler.labo\` | le cache WebView2 de la fenêtre |

Collez `%APPDATA%\fr.kessler.labo` dans la barre d'adresse de l'Explorateur pour y aller directement. **Avant de supprimer**, si la partie compte : *Réglages → Exporter la sauvegarde* met le `.json` où vous voulez, et *Importer* le relit plus tard — y compris dans la version navigateur.

## Vérifier

```bash
npm run verify        # typage + 87 tests + tests Rust + build
npm test              # logique de jeu seule
npm run sim -- --days 21 --seed 42 --strategy legal    # simulateur d'équilibrage
npm run sim -- --days 30 --seed 42 --strategy mixed --letters   # avec la correspondance
npm run sim -- --days 21 --seed 42 --strategy idle     # sans jamais cocher une tâche
```

La stratégie `idle` est le garde-fou du pilier du jeu : elle termine à **0 ₭ de
production et 0 machine**. L'atelier ne s'amorce pas tout seul.

Le simulateur est l'outil d'équilibrage du projet : il rejoue une partie complète par sessions réalistes et imprime la courbe jour par jour. C'est lui qui a révélé les trois défauts corrigés avant livraison (voir `docs/qa-v1.md` §5).

## Comment on joue

1. **Écrivez ce que vous avez à faire** dans le champ du haut. Le parseur comprend le français : « appeler le comptable tous les lundis », « sport 3 fois par semaine », « limiter café max 3 par jour ». Corrigez d'un clic sur une puce, `Entrée` valide.
2. **Cochez vos tâches.** Chaque complétion rapporte des kessler (₭) — la seule monnaie du jeu. Le cachet suit la montée en gamme de votre atelier : ce que vaut votre heure augmente à mesure que ce que vous produisez se vend mieux.
3. **Dépensez-les en recherche.** L'extracteur de votre oncle est encore là ; il ne demande qu'un plan (20 ₭).
4. **Achetez vos intrants, puis cultivez-les.** Le Fournisseur livre la matière au comptant, dans la limite de ce que la Zone laisse passer chaque jour. La « Remise en culture » (150 ₭) ouvre la friche : le même intrant, deux fois et demie moins cher, contre du temps de croissance.
5. **Raffinez, vendez.** Le convoyeur (300 ₭) fait basculer le jeu en vrai idle : les machines enchaînent pendant que vous travaillez.
6. **Choisissez.** La Coopérative paie mieux mais impose ses délais. La Zone ouvre des recettes très lucratives contre une taxe permanente et des incidents qu'il faudra régler — en argent, en réputation, ou en service rendu.

Les deux fenêtres se posent **sur le bureau, sous vos applications** : le jeu ne
recouvre jamais votre travail. Réduisez vos fenêtres pour le voir ; l'épingle de
la barre de titre bascule entre bureau, fenêtre ordinaire et premier plan.

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
/tests              87 tests, miroirs des scénarios obligatoires de la documentation
/scripts            simulateur d'équilibrage + passerelle ComfyUI
/assets/comfy       workflows de génération d'images, versionnés
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
| 14 | [Passerelle ComfyUI](docs/14-passerelle-comfyui.md) | Générer les visuels : script, workflows, ce qui reste en SVG |
| — | [Recette V1](docs/qa-v1.md) | Ce qui a été vérifié, comment, et ce qui reste à tester sur une vraie machine |
| — | [Glossaire](docs/GLOSSAIRE.md) | Vocabulaire canonique |

## Ce qui reste pour plus tard

**V1.5** — affinage du parseur via API en secours, presse et catalyseur, recettes combinatoires, raccourci global, lancement au démarrage, notifications planifiées.
**V2** — mining, prestige, fins de trajectoire, bandeau détachable, plusieurs machines du même type, récolte automatique.
