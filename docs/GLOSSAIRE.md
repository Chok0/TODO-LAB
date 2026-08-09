# Glossaire

Vocabulaire canonique du projet. En cas de doute dans une discussion ou un commit, c'est ce sens qui fait foi.

| Terme | Définition | Réf. |
|---|---|---|
| **Énergie (EN)** | Ressource primaire, générée uniquement par la complétion de todos. | `02` §1 |
| **Kess (₭)** | Monnaie locale de la Zone Franche de Kessler, obtenue par la vente de produits. | `02` §1 |
| **Principe actif (PA)** | Intrant raffiné obtenu par extraction d'une récolte ; typé par plante (méd/ind/récr/tox). | `02` §1 |
| **Habitude binaire (abstinence)** | Todo validée par défaut chaque jour ; seule l'action « j'ai craqué » la fait échouer. Alimente un streak. | `03` §1.3 |
| **Habitude compteur** | Todo à occurrences quotidiennes incrémentées manuellement, scorée à minuit selon des seuils définis par l'utilisateur (s1/s2). | `03` §1.3 |
| **Streak** | Nombre de jours consécutifs de réussite d'une habitude binaire. Sa perte croît avec sa longueur (plafonnée). | `02` §4 |
| **Quick-add** | Champ de saisie unique en haut de la colonne, alimenté par le parseur par règles. | `03` §4 |
| **Parseur par règles** | Analyseur offline (regex + dictionnaires FR) qui pré-remplit les paramètres d'une todo depuis le texte libre. | `03` §4 |
| **Blueprint** | Résultat d'une R&D qui débloque la construction d'une machine. | `04` §1 |
| **Mk (Mark)** | Niveau d'une machine (Mk1, Mk2). Monter de Mk réduit la durée de cycle de 15 %. | `02` §6 |
| **Convoyeur** | Recherche qui fait enchaîner les cycles automatiquement — la bascule « vrai idle » du jeu. | `04` §1 |
| **Cycle** | Une exécution de recette par une machine (intrants réservés au départ, sortie créditée à la fin). | `04` §3 |
| **Moyens (propre/dégradant)** | Le *comment* de la production : procédé propre ou dégradant (labo), agroécologie ou monoculture intensive (farming). | `02` §8 |
| **Fin (bénéfique/neutre/nocif)** | Le *quoi* : tag moral porté par chaque recette et chaque plante. | `06` §6 |
| **Texture** | Croisement Fin × Moyens d'une production (`aligné`, `cynique`, `artisan_du_vice`, `zone_pure`, …). Aucun effet économique ; sélectionne les variantes narratives. | `06` §6 |
| **Pollution d'atelier** | Jauge du labo (0–50 %) montée par les procédés dégradants ; réduit les ventes labo ; nettoyable contre EN. | `02` §8 |
| **Dette environnementale** | Taux par parcelle (0–80 %) installé par la monoculture intensive ; réduit le rendement ; réversible par agroécologie/jachère. | `05` §3 |
| **Jachère** | Parcelle mise en pause qui régénère sa dette environnementale (−2 %/h). | `05` §3 |
| **Clé de corruption** | Achat permanent qui débloque un palier illégal contre une taxe permanente sur toutes les ventes. | `06` §2 |
| **Corruption régulière** | La somme des taxes des clés — un impôt permanent sur le flux, payé en vitesse long terme. | `06` §2 |
| **Événement (de corruption)** | Incident aléatoire tiré sur les cycles illégaux, toujours résoluble en argent / réputation / service. | `06` §3 |
| **Faveur due** | Dette narrative créée par une résolution « service » ou une offre acceptée ; réutilisée comme hook d'événements et de lettres. | `06` §3 |
| **Contrat** | Livraison forcée (X produits en Y heures) issue d'une résolution « service » ; l'échec provoque une saisie. | `06` §3 |
| **Saisie** | Perte du stock de PA et des productions en cours (conséquence d'un contrat échoué). | `06` §3 |
| **Dette d'ouverture** | Les 500 ₭ dus à la Zone hérités avec l'atelier — premier arc narratif et moteur du début de partie. | `07` §1 |
| **Alignement** | Score caché −100..+100 mesurant de quel côté penche le joueur ; jamais affiché en brut. | `06` §4 |
| **Bande** | Tranche d'alignement active : Coopérative (≥ +30), neutre (Courtier), Zone (≤ −30). Module prix et narratif. | `06` §4 |
| **Trajectoire** | Lecture narrative de la bande dominante dans la durée : Good / Opportuniste / Evil. | `06` §4 |
| **Réputation** | Trois jauges (Coopérative/Zone/Courtier) mesurant ce que chaque faction pense du joueur — distinct de l'alignement. | `06` §5 |
| **Subvention** | Avantage Coopérative (100 ₭/sem + R&D −20 %) sous conditions de réputation et de palier légal. | `02` §9 |
| **Correspondance / Registre / Carnet** | Les trois onglets du Log : lettres reçues / fil d'activité factuel / tendances des habitudes. | `07` §4 |
| **Lettre** | Récompense narrative générée par template + variables, datée, archivée définitivement. | `08` §7 |
| **Template / pool** | Gabarit paramétré et liste courte dont tout le contenu du jeu est généré — la frontière dure du scope d'écriture. | `08` |
| **Effet (`Effect`)** | Fait notable émis par le moteur (vente, lettre, événement) — consommé par l'UI et le Registre, jamais un callback. | `09` §3 |
| **`advanceTime`** | L'unique chemin de code qui fait avancer le temps du jeu (tick, réveil, lancement, offline). | `09` §3 |
| **Mode discret** | Réduction de tout le widget en barre fine d'icônes + badges. | `11` §2 |
| **Dock** | Zone basse de la colonne regroupant les modules de jeu en accordéon. | `11` §2 |
| **Sim** | Script de simulation multi-jours seedé (`npm run sim`) — l'outil d'équilibrage du projet. | `13` |
| **Zone Franche de Kessler** | Le décor : ancien bassin minier à cheval sur trois juridictions qui ne s'accordent jamais. | `07` §1 |
| **La Coopérative / La Zone / Le Courtier** | Les trois factions (légale / clandestine / neutre). | `07` §2 |
| **Voss / Coles / Reyes** | Les trois PNJ récurrents porteurs de la correspondance. | `07` §3 |
