# Note de cadrage — Idle Todo Labo (nom provisoire)

## 1. Concept en une phrase

Une todo list gamifiée en widget desktop, où chaque tâche accomplie alimente un labo clandestin/légal de développement de produits, avec deux branches d'expansion (légale linéaire, illégale chaotique) et un module narratif qui capitalise les choix moraux du joueur.

## 2. Modules retenus (V1 → V2)

| Module | Rôle | Priorité |
|---|---|---|
| **Todos** | Cœur fonctionnel : ajout, récurrence, tags de difficulté → génération de ressource primaire | V1, non négociable |
| **Labo — Développement** | R&D de machines/recettes, arbre de tech, blueprints | V1 |
| **Labo — Production** | Affectation des ressources aux machines développées, choix de recette légale/illégale | V1 |
| **Farming** | Culture de plantes → extraction de principes actifs, fournit les intrants du labo | V1 |
| **Mining** | Extraction de minéraux à propriétés chimiques, autre source d'intrants | V2 (optionnel, fusionnable avec farming comme "sources") |
| **Story / Log** | Journal narratif qui s'écrit selon les paliers et les choix moraux — c'est la récompense "soft" | V1 en version light, V2 enrichie |

Le module politico-économique évoqué plus tôt reste **hors scope V1/V2** — il resurgit uniquement sous forme d'événements ponctuels dans le module Story (ex. un lobby qui propose de légaliser un produit), pas comme simulation à part entière.

## 2b. Module Todos — spécification détaillée

C'est le module le plus critique du projet (source unique de ressource primaire) et celui qui doit avoir le moins de friction de saisie possible.

### Types de todo

- **Ponctuelle** : une date/heure, disparaît une fois faite.
- **Récurrente** : définie par trois paramètres combinables plutôt que des cases figées :
  - `fréquence` : quotidienne / hebdomadaire / mensuelle / intervalle personnalisé (tous les X jours)
  - `mode` : *fixe* (jours ou date précis, ex. lun/mer/ven, ou le 5 du mois) / *flexible* (N fois dans la période, n'importe quel jour) / *plusieurs fois par jour* (compteur quotidien, reset à minuit)
  - `N` : nombre d'occurrences requises dans la période quand mode = flexible ou plusieurs fois par jour

  Exemples couverts : "tous les jours", "3x par jour", "une fois par semaine peu importe le jour", "tous les lundis et jeudis", "une fois par mois".

- **Habitude** : voir sous-section dédiée ci-dessous (binaire ou compteur).

### Habitudes (types négatifs)

Sous-catégorie de todo dédiée aux changements de comportement, avec deux sous-types :

- **Binaire (abstinence)** : la journée est **validée par défaut** sans action ; seule une action explicite ("j'ai craqué") la fait échouer. Alimente un streak ; plus le streak est long, plus la perte en cas d'écart est significative.
- **Compteur (cumulatif)** : chaque occurrence dans la journée s'incrémente manuellement (+1 unité). En fin de journée, un score est calculé à partir de **seuils définis par l'utilisateur à la création de l'habitude** (pas de barème moral imposé par défaut) — ex. 0-1 = neutre, 2-3 = pénalité légère, 4+ = pénalité à courbe croissante (l'abus pèse disproportionnellement plus que la quantité brute). Le compteur se remet à zéro à minuit ; l'historique quotidien est conservé (pas juste le score du jour) pour permettre des vues de tendance dans le module Log. La pénalité calculée **s'intègre à l'économie générale du jeu** au même titre que les autres pertes (ressources/corruption), pas un système de scoring séparé.

**Visibilité** : le panneau Habitudes est **replié par défaut** au démarrage de l'app, distinct du reste de la colonne todo qui reste visible normalement. Un clic explicite est nécessaire pour le déplier et voir/loguer le détail — rien de ce type ne s'affiche passivement.

### Classification et paramètres

- **Catégorie** : perso / pro (extensible plus tard, mais binaire suffit en V1) — pilote la couleur.
- **Difficulté** : échelle de coût en motivation plutôt qu'en temps (ex. 4 paliers : trivial / facile / normal / corvée) — détermine la quantité de ressource générée.
- **Gain / Perte (optionnels, indépendants)** : une todo peut définir un gain à la complétion, une perte au non-respect de l'échéance (surtout pertinent pour les récurrentes et les habitudes), ou les deux. Pas obligatoire à la création — une todo simple sans enjeu déclaré génère juste la ressource de base liée à sa difficulté.

### Autocomplétion à la saisie

Un **parseur par règles** (regex + dictionnaire de mots-clés, offline, instantané) pré-remplit fréquence/mode/catégorie/difficulté à partir du texte libre saisi (ex. "appeler le comptable tous les lundis" → hebdo/lundi/pro). L'utilisateur valide ou corrige en un clic plutôt que de remplir un formulaire complet à chaque fois. Un affinage via l'API Claude en fallback pour les cas ambigus est une amélioration V1.5, pas un prérequis de V1.

### UI

Colonne à droite de l'écran. Code couleur double : teinte de fond = perso/pro, bordure ou icône = type de récurrence (ponctuelle / fixe / flexible / abstinence). **Principe transversal du projet** (pas seulement cette colonne) : tous les panneaux — colonne todo, chaque module du bandeau du bas, log narratif — doivent être individuellement repliables/dépliables, pour que l'utilisateur puisse réduire l'emprise visuelle du jeu sur le bureau à volonté.

## 2c. Module Farming — spécification V1

**Boucle** : plantation → temps de croissance (idle) → récolte → extraction de principe actif → devient intrant du Labo.

**Méthode de culture (axe Moyens)** : à chaque parcelle, choix entre :
- **Agroécologie** : rendement stable, coût plus élevé en ressources/temps, régénère légèrement la parcelle (bonus long terme).
- **Monoculture intensive** : rendement immédiat supérieur, mais installe une **dette environnementale** — mécanique identique à la taxe de corruption régulière (section 3) : un taux permanent qui réduit le rendement de la parcelle au fil du temps. Réversible partiellement via jachère (parcelle mise en pause, se régénère lentement).

**Génération procédurale** : comme pour les machines (4d), un petit nombre de templates de plantes (3-4 : médicinale, récréative, industrielle, toxique) × formule de rendement par niveau, plutôt qu'un catalogue de plantes écrites une par une.

## 3. Mécanique légal / illégal

**Branche légale — linéaire**
Coût plat, croissance stable, pas d'aléatoire destructeur. La récompense n'est pas dans la vitesse mais dans la richesse du contenu débloqué : entrées de log détaillées, visuels de machines plus travaillés, variantes de recettes, réputation qui ouvre des dialogues narratifs plus fournis.

**Branche illégale — accordéon**
Accès rapide à de l'équipement/recettes avancées contre achat de **clés de corruption**. Deux familles de coût :

- **Corruption régulière** : achetée une fois, agit comme une taxe permanente sur le flux de ressource/seconde (ta courbe de progression s'aplatit durablement — tu payes en vitesse long terme).
- **Corruption ponctuelle / événementielle** : table d'événements aléatoires ("la douane a saisi un convoi", "le Sergent Coles vous rappelle un service dû") où le joueur choisit *comment* payer — argent (immédiat, indolore mais cher), réputation (dette narrative, ressurgit plus tard), ou service (débloque une sous-quête forcée dans le module Story). Chaque mode de paiement a un coût différent et une conséquence narrative différente, pas juste un chiffre.

Cette asymétrie légal/illégal est le cœur du fun : le joueur ressent une vraie tension stratégique, pas juste un choix moral cosmétique.

## 4. Paragraphe créatif — proposition de skin narratif

Et si le décor n'était ni pur sci-fi ni pur clandestin, mais une **zone franche post-industrielle** — une ancienne friche minière reconvertie, à cheval sur trois juridictions qui ne s'accordent jamais sur ce qui est légal ? Le joueur hérite d'un atelier familial vétuste (le "labo" est littéralement un ancien atelier de facteur d'instruments recyclé — clin d'œil à ton propre métier), et doit choisir entre le rejoindre au syndicat des chimistes agréés (lent, respecté, accès aux subventions de la Coopérative) ou traiter avec les intermédiaires de la Zone qui achètent tout sans poser de questions. Le module Story ne serait pas un simple journal de bord mais une **correspondance** : des lettres reçues de personnages récurrents (un client reconnaissant, un inspecteur corrompu, un ancien associé qui a mal tourné) qui réagissent à tes choix cumulés — ce qui donne de la texture sans nécessiter de vrai moteur de dialogue.

## 4b. Backstory étoffée — factions et PNJ

**Contexte** : la Zone Franche de Kessler, ancien bassin minier à cheval sur trois juridictions qui ne coordonnent jamais leurs lois. Le joueur hérite de l'atelier de son oncle, fermé depuis deux ans, dettes non soldées comprises — le point de départ explique mécaniquement pourquoi le joueur a besoin de ressources vite, quelle que soit la voie choisie.

**Trois factions, correspondant aux trois scénarios (4c)** :
- **La Coopérative** — syndicat légal des chimistes agréés. Contact récurrent : *Inspectrice Voss*, rigide mais loyale si on la respecte. Offre subventions, accès labo avancé, mais processus lents (validations, quotas).
- **La Zone** — réseau clandestin qui contrôle les intermédiaires. Contact récurrent : *Sergent Coles*, douanier corrompu, jovial en apparence, impitoyable sur les dettes. Offre accès rapide et cash immédiat contre corruption croissante.
- **Le Courtier** — figure neutre, ne travaille pour personne, revend l'accès aux deux marchés contre commission. Contact récurrent : *Reyes*, insaisissable, jamais le même discours deux fois. C'est la porte d'entrée mécanique du scénario opportuniste.

**Arc général** : chaque faction réagit aux choix cumulés du joueur (pas juste au dernier choix) — la réputation est une ressource à part entière qui module le ton et le contenu des lettres du module Log.

## 4c. Trois trajectoires narratives (Good / Evil / Opportuniste)

Un score d'alignement caché (-100 à +100, mis à jour à chaque choix significatif : recette choisie, résolution d'événement, faveur acceptée/refusée) place le joueur sur l'une de trois bandes, qui teinte le jeu sans le figer :

| Trajectoire | Déclencheur | Économie | Registre narratif |
|---|---|---|---|
| **Good (Coopérative)** | Score élevé, faveurs Zone refusées | Linéaire, lente, stable ; meilleurs gains "soft" (visuels riches, subventions) | Reconnaissance, réhabilitation de l'atelier familial, fin où le joueur devient référence légitime |
| **Evil (Zone)** | Score bas, corruption assumée | Accordéon chaotique, gros gains court terme, dettes qui s'accumulent | Ascension rapide, tension permanente, fin binaire : empire souterrain consolidé OU saisie totale |
| **Opportuniste (Courtier)** | Score proche de zéro, joue les deux camps | Accès aux deux marchés mais surtaxé par commission constante (ni le tarif Coopérative, ni le rabais Zone) ; volatilité de réputation plus forte (chaque faction se méfie) | Registre pragmatique, pas d'allégeance, fin ouverte : "ni un empire, ni une légende, un survivant" |

Le score n'est **jamais affiché en valeur brute** au joueur — seule la faction dominante actuelle et son évolution récente sont visibles (cohérent avec l'esprit "ambiance" plutôt que "tableau de bord moral").

## 4d. Dimension procédurale — volume d'items sans explosion de scope

Pour éviter de devoir écrire à la main des dizaines de machines/recettes/événements (le risque de scope qu'on a identifié au début), le contenu est **généré par templates paramétrés** plutôt qu'entièrement rédigé :

- **Machines** : un petit nombre de *templates de base* (4-5 : extracteur, distillateur, synthétiseur, presse, catalyseur) × une formule de scaling par niveau (`stats(N) = base × croissance^N`, croissance ~1.12 cohérent avec la section 5) × une palette de 3-4 variantes visuelles obtenues par modification de couleur/détail SVG, pas par redessin. Résultat perçu : des dizaines de machines "différentes", contenu réel : 5 templates + 1 formule + 1 palette.
- **Recettes** : générées par combinaison procédurale de 2-3 intrants pris dans les pools de ressources (farming/mining) × une formule de valeur de sortie liée à la rareté des intrants, plutôt qu'une liste de recettes écrites une par une.
- **Événements de corruption** : un générateur combine `{déclencheur, PNJ, coût, options de résolution}` piochés dans des pools courts (5-6 déclencheurs, 3 PNJ récurrents, 3 types de coût) plutôt qu'une table d'événements figée — ça donne une variété de long terme avec un effort d'écriture borné.
- **Lettres du Log** : templates de lettres par PNJ avec variables injectées (montant, faction, streak) plutôt que des textes uniques par palier — quelques dizaines de templates suffisent à couvrir des centaines de situations.

Ce principe doit être posé comme contrainte dès le Goal de contenu : Claude Code ne doit **pas** écrire de contenu "en dur" au-delà des templates/formules définis ici.

## 4e. Deuxième axe — Fin vs Moyens (texture morale)

Le score d'alignement (4c) mesure *de quel côté tu es* (Coopérative/Zone/Courtier). Il ne capture pas la cohérence entre **ce que tu produis** (Fin) et **comment tu le produis** (Moyens) — deux axes indépendants, applicables au Labo comme au Farming :

- **Axe Fin** : le produit final aide ou nuit (ex. vaccin vs drogue destructrice, engrais régénérant vs pesticide toxique) — tag porté par chaque recette/plante.
- **Axe Moyens** : le procédé est propre ou dégradant (synthèse propre vs rejets toxiques ; agroécologie vs monoculture intensive) — déterminé par le choix de méthode fait à la production.

Croisés, ça donne une **texture** calculée à chaque production, pas un second score économique parallèle :

| | Moyens propres | Moyens dégradants |
|---|---|---|
| **Fin bénéfique** | Aligné | **Cynique** (ex. un remède produit par un procédé toxique) |
| **Fin nocif** | Artisan du vice (produit néfaste, méthode intègre) | Zone pure |

Cette texture colore le contenu généré du module Log (ton des lettres, réactions PNJ — Voss peut se montrer mal à l'aise même face à un produit noble si la méthode est sale) sans complexifier l'économie sous-jacente. Elle réutilise le système de templates procéduraux ci-dessus : un tag Fin + un tag Moyens sélectionnent simplement une variante de lettre dans le pool existant.

## 5. Recherche — mathématiques des courbes de fun

Quelques repères théoriques utiles pour calibrer les deux branches :

- **Renforcement à ratio variable (Skinner)** : les récompenses imprévisibles créent un engagement plus fort et plus addictif que les récompenses fixes — c'est le socle mathématique de ta branche illégale "accordéon". À calibrer avec prudence : c'est aussi le mécanisme des jeux d'argent, donc mieux vaut plafonner l'amplitude plutôt que la rendre infinie.
- **Aversion à la perte (Kahneman & Tversky, théorie des perspectives)** : une perte est ressentie environ deux fois plus intensément qu'un gain équivalent. C'est ce qui justifie que tes retombées catastrophiques (saisie, dette forcée) doivent rester rares mais mémorables — un event tous les 15-20 cycles de prod suffit largement à créer la tension recherchée sans lasser.
- **Courbes de coût exponentiel (design idle classique, type Cookie Clicker)** : un ratio de coût croissant autour de x1.10–x1.15 par achat est le standard qui garde une sensation de progression fluide sans stagnation ; c'est un bon point de départ pour ta branche légale.
- **Prestige / reset doux** : conserver un multiplicateur permanent après un cycle "terminé" évite la frustration du reset à zéro — mécanique que tu as déjà expérimentée sur ton projet idle rhythm-based, directement réutilisable ici.
- **Flow (Csikszentmihalyi)** : le fun optimal se situe à l'équilibre défi/compétence — traduit en design idle, ça veut dire faire varier le rythme des déblocages pour que le joueur ne soit jamais ni en attente passive prolongée, ni submergé de décisions.

## 6. Arbre de progression (V1 — module Labo uniquement)

**Développement (R&D)**
1. Blueprint extracteur basique → débloque Extracteur Mk1
2. Blueprint distillateur → débloque Distillateur Mk1
3. Recherche automatisation → convoyeur simple (réduit le temps de transfert entre machines)
4. Recherche synthèse avancée → Synthétiseur Mk1 (accès branche illégale à partir d'ici)
5. Recherche catalyse → améliore rendement de toutes les machines Mk1 → débloque Mk2

**Production**
- Recettes légales : Tonique de base → Remède standard → Remède premium (débloque subventions Coopérative)
- Recettes illégales : Extrait brut → Composé actif → Produit raffiné (chaque palier demande une clé de corruption)

**Items/déblocages transversaux**
- Skins de machines (visuel qui évolue avec le niveau, pas juste une jauge qui grossit)
- Entrées de Log (lettres, débloquées par paliers légaux ou illégaux — contenu différent selon la branche dominante)
- "Faveurs dues" (dettes narratives illégales, réutilisables comme hooks d'events futurs)

## 7. Décision de stack — Tauri (Godot écarté)

Godot est mis de côté pour ce projet : ce n'est pas un moteur pensé pour vivre en overlay/widget permanent sur le bureau, et ça ajouterait une friction d'apprentissage sans bénéfice direct sur l'objectif réel (te motiver à faire tes todos). On part sur **Tauri** :

- **Frontend** : HTML/CSS/JS (vanilla ou léger framework type Svelte — recommandé pour Tauri, empreinte mémoire minimale, bon fit avec un widget qui doit rester discret en ressources) + Canvas ou SVG pour les visuels animés (jauges, machines, effets).
- **Backend** : Rust (via Tauri) pour la persistance locale (SQLite ou simple JSON/fichier), la gestion de fenêtre (transparence, always-on-top, tray icon), et le scheduler pour la prod idle en arrière-plan (calcul du temps écoulé même app fermée).
- **Pourquoi Tauri plutôt qu'Electron** : binaire final beaucoup plus léger (quelques Mo vs ~100+ Mo), consommation mémoire réduite au repos — important pour un widget censé tourner en permanence sans plomber la machine.

## 8. Stratégie assets — génération autonome

Objectif : que Claude Code se débrouille seul pour produire un univers visuel cohérent, sans dépendre de téléchargements externes (licences à vérifier, disponibilité réseau incertaine en environnement autonome, risque d'incohérence de style entre packs).

**Approche retenue : bibliothèque d'assets vectoriels générés en code (SVG), pas d'assets externes.**

Raisons :
- Aucune dépendance réseau ni contrainte de licence — tout est généré par Claude directement en SVG/CSS.
- Cohérence de style garantie : une seule palette de couleurs, une seule grammaire de formes (traits, coins, ombres) définie une fois dans un design system, réutilisée partout.
- Facilement itérable : un SVG est du texte, donc modifiable par Claude Code turn après turn sans regénération d'image.
- Anime bien en CSS/JS (rotation d'engrenage, remplissage de jauge, particules simples) sans lib lourde.

**Ce que Claude Code doit produire en autonomie :**
1. Un fichier `design-tokens` (palette couleurs par module — labo=teal/acier, farming=vert organique, corruption=rouge/or terni, légal=bleu propre) + grille d'icônes de base (8-12 icônes UI : todo, check, flèche, cadenas, etc.)
2. Un set d'icônes machines (extracteur, distillateur, synthétiseur, presse) en SVG, style cohérent, 2-3 états visuels chacune (inactif/actif/niveau supérieur) obtenus par variation de couleur/détail plutôt que par redessin complet.
3. Des icônes ressources (principes actifs, minerais, argent, corruption) en petit format, lisibles à 24-32px.
4. Le lettering/typographie du module Story via une police Google Fonts à choisir et charger localement (pas de dépendance CDN au runtime).

Si un module (V2 Farming/Mining) demande un jour un style plus illustratif que ce que le SVG généré permet, on réévaluera à ce moment — pas une contrainte à anticiper maintenant.

## 9. Architecture de données (V1)

```
Todo {
  id, titre, catégorie(perso/pro), difficulté(1-4),
  type(ponctuelle/récurrente/habitude),
  récurrence: { fréquence, mode(fixe/flexible/plusieurs_fois_jour), N, joursFixes[] },
  habitude: { sousType(binaire/compteur), seuils[](pour compteur), compteur_jour, historique_quotidien[], masqué(défaut true) } | null,
  gain: { ressource, quantité } | null,
  perte: { ressource, quantité } | null,
  streak,
  historique_complétion[]
}
Ressource   { type, quantité, taux_génération_sec }
Machine     { id, type, niveau, statut(dev/actif), branche(légal/illégal) }
Recette     { id, machine_requise, intrants[], sortie, branche }
Corruption  { régulière: taux_taxe_permanent, événements: [{type, coût, résolution, date}] }
Alignement  { score(-100..100), factionDominante, réputationParFaction: {coopérative, zone, courtier} }
Culture     { id, planteTemplate, niveau, méthode(agroécologie/intensive), detteEnvironnementale, statut }
Production  { recetteId, finTag(bénéfique/neutre/nocif), moyensTag(propre/dégradant), texture(calculée) }
LogEntry    { id, déclencheur(palier/event), texte, débloqué_le }
```

La todo complétée est la seule source de génération de ressource primaire — tout le reste (machines, recettes, corruption) consomme/transforme cette ressource. Le calcul idle (prod hors ligne) se fait par différence de timestamp à la réouverture de l'app, pas par tick serveur.

## 10. Structure de projet suggérée

```
/src-tauri        → backend Rust (fenêtre, persistance, scheduler idle)
/src
  /components      → UI (todo list, jauges, panneau labo, log)
  /assets/svg       → bibliothèque SVG générée (design tokens + icônes)
  /game-logic       → pur JS/TS : calcul ressources, coûts, événements corruption
  /data             → schémas + sauvegarde locale
```

Séparer `/game-logic` du reste permet de tester l'équilibrage (courbes de coût, ratio légal/illégal) indépendamment de l'UI — utile pour un `/goal` ciblé sur la logique avant même de toucher au rendu.

**Principe transversal UI** : tout panneau (colonne todo, modules du bandeau bas, log) doit être individuellement repliable/dépliable — à prévoir dans le composant de base dès le Goal 1, pas ajouté après coup.

## 11. Séquence de goals suggérée (Claude Code)

1. **Goal 1 — Squelette Tauri + module Todos complet** : app Tauri qui démarre, fenêtre transparente always-on-top, composant panneau repliable réutilisable, colonne todo avec les 3 types (ponctuelle/récurrente/habitude binaire+compteur), panneau Habitudes replié par défaut, code couleur perso/pro + type, parseur de saisie par règles pour pré-remplissage, persistée en local. Condition remplie quand les todos peuvent être créées et complétées pour chaque type, que le compteur d'habitude s'incrémente et se score selon des seuils custom, que le streak binaire se comporte correctement, et que le panneau Habitudes reste masqué au redémarrage sauf action explicite.
2. **Goal 2 — Game logic labo + farming** : module `/game-logic` isolé, todo complétée → génération ressource → 2 machines (extracteur, distillateur) + module farming (2 templates de plantes, méthode agroécologie/intensive avec dette environnementale) → recette légale simple, testé unitairement, sans UI riche.
3. **Goal 3 — Branche illégale + alignement** : recette illégale + corruption régulière (taxe permanente) + table d'événements ponctuels avec 3 choix de résolution + score d'alignement (3 trajectoires) + calcul de texture Fin/Moyens, testé sur des scénarios chiffrés incluant un cas "cynique" (fin bénéfique, moyens dégradants).
4. **Goal 4 — Design system SVG** : génération de la palette + icônes UI + icônes machines/ressources/plantes, intégration dans les composants existants.
5. **Goal 5 — Module Log** : entrées débloquées par palier/event/texture, affichage type correspondance, templates par PNJ (Voss/Coles/Reyes) avec variables injectées.

Chaque goal doit se terminer sur une condition vérifiable (tests qui passent, capture d'écran cohérente, ou sortie console des calculs) plutôt qu'un critère flou — c'est ce qui permet à l'évaluateur automatique du `/goal` de juger correctement la complétion.
