# 05 — Module Farming

Fournit les intrants du labo. Boucle : **plantation → croissance (idle, durée fixe) → récolte → extraction (labo) → principes actifs**.

## 1. Parcelles

- Départ : **2 parcelles**. Achats suivants : 100 ₭, 250 ₭, 600 ₭ (max **5 parcelles** en V1) — courbe ~×1.12 appliquée à des paliers arrondis.
- États d'une parcelle : `empty` (vide), `growing` (plante + timestamp de fin), `ready` (récolte disponible), `fallow` (jachère, se régénère).
- Chaque parcelle porte sa propre **dette environnementale** (0–80 %).

## 2. Templates de plantes (4 — génération procédurale, `08` §6)

| Template | Graine (₭) | Croissance | Récoltes/cycle | PA produit | Tag Fin | Déblocage |
|---|---|---|---|---|---|---|
| Médicinale | 5 (3 offertes au départ, DEC-10) | 20 min | 3 | PA_MED | bénéfique | — |
| Industrielle | 8 | 35 min | 2 | PA_IND | neutre | Distillateur construit |
| Récréative | 12 | 45 min | 3 | PA_REC | neutre | Synthétiseur construit |
| Toxique | 25 | 60 min | 2 | PA_TOX | nocif | Clé de corruption 1 |

Le rendement affiché est le rendement de base, modulé par la méthode et la dette : `récoltes = round(base × modificateur_méthode × (1 − DEBT_ENV))`, minimum 1.

## 3. Méthode de culture (axe Moyens — choisie à chaque plantation)

| | Agroécologie (propre) | Monoculture intensive (dégradant) |
|---|---|---|
| Coût graine | ×1.2 | ×1 |
| Durée de croissance | +20 % | nominale |
| Rendement | nominal | +50 % |
| Dette environnementale | **−1 %** par récolte (régénère, plancher 0) | **+2 %** par récolte |

La dette est la mécanique-miroir de la taxe de corruption : un taux permanent qui aplatit le rendement de la parcelle au fil du temps. Partiellement réversible :

- **Agroécologie prolongée** : régénération lente en continuant de produire.
- **Jachère** : parcelle mise en pause explicitement, **−2 %/heure**, aucun rendement pendant ce temps.

## 4. Récolte et extraction

- `ready` → clic « récolter » crédite `HARVEST_<plant>` ; avec la recherche Convoyeur, les récoltes sont transférées automatiquement au stock du labo et la récolte elle-même reste manuelle en V1 (le geste de récolter fait partie du plaisir de la boucle courte ; auto-récolte = V2).
- Extraction : l'Extracteur convertit 1 récolte → 1 PA du type correspondant (cycle 60 s, `04` §2). La recette d'extraction est implicite (pas dans la liste des 6 recettes signature) : l'Extracteur assigné à un type de récolte le traite en continu si convoyeur.

## 5. Choix de la plante et stratégie

La tension voulue : les plantes légales (médicinale, industrielle) alimentent des recettes moins lucratives mais sans risque ; récréative et toxique n'ont de valeur que via le Synthétiseur et la branche illégale. La graine toxique verrouillée derrière la Clé 1 fait du farming un **engagement visible** dans la voie illégale, pas juste une case cochée au labo.

## 6. Mining (V2 — esquisse, hors périmètre)

Deuxième source d'intrants : minerais à propriétés chimiques (catalyseurs, sels, solvants) requis par les recettes Mk3+. Même grammaire que le farming : petits templates × formule de rendement, veines qui s'épuisent (équivalent de la dette environnementale). Peut être fusionné avec le farming dans un module « Sources » si l'UI devient trop chargée. Aucune structure de données V1 ne doit l'empêcher (le type `ResourceId` reste extensible).

## 7. UI du panneau Farming (détail dans `11-ui-ux.md`)

- Une carte par parcelle : illustration SVG de la plante avec **4 stades visuels de croissance** (`12` §7), jauge de temps restant, badge dette environnementale si > 10 %, bouton récolter quand `ready`.
- Plantation : choix plante (parmi débloquées) puis méthode (deux boutons, coût/effets affichés) — deux taps maximum.
- Badge du dock replié : nombre de parcelles `ready`.

## 8. Scénarios de test (obligatoires)

1. Plantation médicinale intensive : fin à `t+20min`, 3 récoltes (2×1.5), dette +2 %.
2. Dette 30 % : rendement intensif = round(2×1.5×0.7) = 2 ; la dette continue de monter.
3. Agroécologie avec dette 10 % : coût graine ×1.5, durée 24 min, dette 9 % après récolte.
4. Jachère 5 h sur dette 12 % : dette 2 % ; remise en culture possible à tout moment.
5. Offline 8 h : plante de 45 min plantée avant fermeture → `ready` au retour (pas de plafond sur la croissance, DEC-11).
6. Graine toxique invisible et inachetable sans Clé 1, y compris par manipulation d'état (le moteur refuse l'action, pas seulement l'UI).
