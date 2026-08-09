# 03 — Module Todos

Module le plus critique du projet : **source unique de la ressource primaire** (Énergie) et point de contact quotidien avec l'utilisateur. Objectif n°1 : friction de saisie minimale.

## 1. Types de todo

### 1.1 Ponctuelle

Une date (et heure optionnelle) d'échéance. Disparaît de la liste active une fois complétée (reste dans l'historique). Peut être créée sans échéance ("un jour").

### 1.2 Récurrente

Définie par trois paramètres combinables :

| Paramètre | Valeurs | Description |
|---|---|---|
| `frequency` | `daily` / `weekly` / `monthly` / `everyNDays(x)` | La période de référence |
| `mode` | `fixed` / `flexible` / `multiDaily` | `fixed` : jours ou date précis (ex. lun/mer/ven, ou le 5 du mois). `flexible` : N occurrences n'importe quand dans la période. `multiDaily` : compteur quotidien, reset à minuit |
| `N` | entier ≥ 1 | Occurrences requises quand mode = `flexible` ou `multiDaily` |

Exemples couverts (cas de test canoniques du moteur) :

| Saisie visée | frequency | mode | N | fixedDays |
|---|---|---|---|---|
| "tous les jours" | daily | fixed | 1 | — |
| "3x par jour" | daily | multiDaily | 3 | — |
| "une fois par semaine, peu importe le jour" | weekly | flexible | 1 | — |
| "tous les lundis et jeudis" | weekly | fixed | — | [lun, jeu] |
| "une fois par mois" | monthly | flexible | 1 | — |
| "le 5 du mois" | monthly | fixed | — | [5] |
| "tous les 3 jours" | everyNDays(3) | fixed | 1 | — |

### 1.3 Habitude

Sous-catégorie dédiée aux changements de comportement. Deux sous-types :

- **Binaire (abstinence)** : la journée est **validée par défaut sans action** ; seule l'action explicite « j'ai craqué » la fait échouer. Alimente un streak (économie : `02` §4).
- **Compteur (cumulatif)** : bouton +1 manuel à chaque occurrence dans la journée. Score calculé à minuit à partir des **seuils définis par l'utilisateur à la création** (`s1`, `s2` — aucun barème imposé). Compteur remis à zéro à minuit ; historique quotidien `{date, n, pénalité}` conservé intégralement pour les tendances du Log.

**Visibilité** : le panneau Habitudes est **replié par défaut à chaque démarrage** (ne mémorise PAS l'état déplié entre sessions, contrairement aux autres panneaux). Rien de son contenu ne s'affiche passivement — un clic explicite est requis pour voir/loguer le détail.

## 2. Classification et paramètres communs

| Champ | Valeurs | Effet |
|---|---|---|
| `category` | `perso` / `pro` (extensible V2) | Pilote la teinte de fond de la carte |
| `difficulty` | 1 trivial / 2 facile / 3 normal / 4 corvée | Échelle de **coût en motivation** (pas en temps) → EN générée (`02` §4) |
| `gain` (optionnel) | `{resource, amount}` | Récompense additionnelle à la complétion |
| `loss` (optionnel) | `{resource, amount}` | Pénalité au dépassement d'échéance (pertinent surtout pour récurrentes/habitudes) |

Une todo simple sans enjeu déclaré génère juste l'EN de sa difficulté. `gain` et `loss` sont indépendants et jamais obligatoires.

## 3. Moteur de récurrence — sémantique normative

- **Calendrier local** de la machine ; la semaine commence le **lundi** ; les journées basculent à **minuit local**.
- Période courante : jour civil (`daily`), semaine lun→dim (`weekly`), mois civil (`monthly`), fenêtre glissante ancrée à la date de création (`everyNDays`).
- `monthly fixed` sur un jour absent du mois (le 31 en avril) → reporté au **dernier jour du mois**.
- Création en milieu de période : la période courante est due au prorata **plancher**, minimum 1 — formule (hebdo) : `max(1, floor(N × jours_restants / 7))`. Exemple : créer "3x/semaine" un vendredi (3 jours restants) → 1 occurrence due cette semaine-là. Même principe au prorata des jours restants pour le mensuel.
- Complétion rétroactive : autorisée pour **J−1 uniquement** (menu contextuel « fait hier »), au-delà l'occasion est perdue. L'EN est créditée au jour effectif de complétion.
- Une occurrence `fixed` non faite à la fin de sa journée est **manquée** (applique `loss` si défini, sinon rien). Une `flexible` n'est manquée qu'en fin de période si le compte < N.
- Jours d'absence (app fermée) : traités séquentiellement au rattrapage (`02` §11) — les occurrences dues sont marquées manquées, les binaires validées par défaut.

## 4. Parseur de saisie par règles

Pré-remplit `frequency/mode/N/fixedDays/category/difficulty` depuis le texte libre. **Offline, instantané, par règles** (regex + dictionnaires) — l'affinage via API Claude est un fallback V1.5, jamais un prérequis.

### 4.1 Architecture

```
texte libre
  → normalisation (minuscules, accents conservés, trim)
  → passes de règles ordonnées (première règle qui matche par champ gagne)
  → extraction { champ, valeur, confiance, span du texte matché }
  → le texte matché par les règles de récurrence est retiré du titre final
  → chips pré-remplis affichés, modifiables en un clic avant validation
```

Chaque règle = `{ pattern: RegExp, field, resolve(match) => value, confidence }`. Les dictionnaires et règles vivent dans `/src/game-logic/todos/parser-rules.fr.ts` (extensible par langue).

### 4.2 Dictionnaires français (V1, extensibles)

**Récurrence** — motifs (ordre de priorité décroissant) :

| Motif (regex simplifiée) | Résolution |
|---|---|
| `(\d+)\s*(x\|fois)\s*(par\|/)\s*jour` | daily / multiDaily / N |
| `tous les jours`, `chaque jour`, `quotidien` | daily / fixed |
| `tous les (\d+) jours` | everyNDays(x) |
| `(tous les\|chaque)\s+(lundi\|mardi\|…)((,\|et)\s*(…))*` | weekly / fixed / jours listés |
| `(\d+)\s*(x\|fois)\s*(par\|/)\s*semaine` | weekly / flexible / N |
| `(une\|1)\s*fois\s*par\s*semaine` | weekly / flexible / 1 |
| `le (\d{1,2}) (du mois\|de chaque mois)` | monthly / fixed / jour |
| `(une\|1)\s*fois\s*par\s*mois`, `mensuel` | monthly / flexible / 1 |
| `demain`, `ce soir`, `lundi prochain`, date `12/09` | ponctuelle + échéance |

**Catégorie** — mots-clés `pro` : comptable, client, facture, devis, réunion, mail, boulot, atelier, commande, livraison… ; mots-clés `perso` : courses, sport, médecin, famille, maison, ménage… Aucun match → défaut `perso`, confiance basse.

**Difficulté** — `corvée`, `pénible`, `galère` → 4 ; `vite fait`, `rapide`, `2 min` → 1 ; verbes lourds (`ranger`, `trier`, `déclarer`) → 3. Aucun match → défaut 2 (facile).

**Habitude** — préfixes explicites uniquement : `arrêter de …`, `ne plus …` → binaire ; `limiter …`, `max N par jour` → compteur (N pré-rempli comme s2). Le parseur ne crée jamais une habitude sans un de ces marqueurs.

### 4.3 Comportement UI

- La saisie se fait dans un champ unique en haut de la colonne (quick-add).
- Les valeurs détectées apparaissent en **chips** sous le champ (ex. `[hebdo · lun] [pro] [normal]`) ; un clic sur un chip ouvre le correcteur ; `Entrée` valide tel quel.
- Confiance basse (< 0.6) → chip affiché en style "suggestion" (pointillé) pour inviter à vérifier.
- Le formulaire complet reste accessible (bouton "détails") mais ne doit jamais être le chemin par défaut.

### 4.4 Cas de test canoniques du parseur

À implémenter tels quels en tests unitaires :

| Entrée | Attendu |
|---|---|
| « appeler le comptable tous les lundis » | titre "appeler le comptable", weekly/fixed/[lun], pro |
| « méditer 2x par jour » | daily/multiDaily/N=2, perso |
| « facture client avant vendredi » | ponctuelle, échéance vendredi courant, pro |
| « sport 3 fois par semaine » | weekly/flexible/N=3, perso |
| « arrêter de fumer » | habitude binaire, perso |
| « limiter café max 3 par jour » | habitude compteur, s2 pré-rempli = 3 |
| « déclarer la TVA le 5 du mois » | monthly/fixed/[5], pro, difficulté 3 |
| « ranger l'atelier » | ponctuelle sans échéance, difficulté 3 |

## 5. Interactions de complétion

- Ponctuelle / occurrence : case à cocher → animation brève + flottant `+X EN` → la carte quitte la liste active.
- Compteur d'habitude : bouton `+1` (répétable) ; le total du jour est visible **uniquement panneau déplié**.
- Binaire : bouton discret « j'ai craqué » (confirmation en un tap, pas de modal culpabilisante) → streak reset + perte (`02` §4).
- Annulation : toute complétion est annulable pendant 10 s (undo toast) — l'économie est recalculée, pas juste masquée.

## 6. UI de la colonne (détail dans `11-ui-ux.md`)

- Colonne ancrée à droite ; sections : quick-add, « Aujourd'hui » (inclut les tâches sans échéance), « Cette semaine », « Plus tard », panneau Habitudes (replié par défaut).
- Code couleur double : **teinte de fond** = catégorie (perso/pro) ; **bordure gauche / icône** = type de récurrence (ponctuelle / fixe / flexible / abstinence / compteur).
- Chaque section est individuellement repliable (principe transversal du projet).

## 7. Données et persistance

Structures TypeScript complètes dans `10-modele-de-donnees.md`. Points notables :

- `completionHistory` conserve chaque complétion `{date, enGained}` (borné aux 365 derniers jours, compacté au-delà en agrégats mensuels).
- `dailyHistory` des compteurs conserve `{date, count, penalty}` sans limite V1 (volume négligeable).
- Le moteur de récurrence est une fonction pure `dueOccurrences(todo, from, to)` — aucune écriture d'état pendant le calcul, testable sur des plages de dates arbitraires.

## 8. Scénarios de test du moteur (obligatoires)

1. Hebdo fixe lun/jeu créée un mercredi : seule l'occurrence de jeudi est due cette semaine-là.
2. Flexible 3x/semaine, 2 faites, fin de semaine : 1 manquée, `loss` appliquée une seule fois.
3. multiDaily 3x : 4 complétions le même jour → la 4ᵉ ne génère pas d'EN (plafonnée à N).
4. Binaire streak 12, absence de 3 jours : streak = 15 au retour (validation par défaut), EN passif crédité pour chaque minuit traversé.
5. Compteur s1=1, s2=3, n=6 : pénalité = 2×1 + ceil(2×3^1.5) = 2 + 11 = 13 EN.
6. Mensuel fixe le 31, mois d'avril : due le 30.
7. Changement d'heure (DST) : aucune journée dupliquée ni sautée.
8. « fait hier » sur une occurrence de J−1 manquée : occurrence validée, `loss` annulée si déjà appliquée.
