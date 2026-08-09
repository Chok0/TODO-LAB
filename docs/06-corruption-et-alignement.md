# 06 — Corruption, alignement et texture morale

Cœur stratégique du jeu : l'asymétrie structurelle entre deux économies. Le joueur doit **ressentir** la différence, pas la lire dans un tooltip.

## 1. Les deux branches

| | Branche légale — linéaire | Branche illégale — accordéon |
|---|---|---|
| Coûts | Plats, courbe ×1.12 prévisible | Clés chères qui court-circuitent des paliers entiers |
| Croissance | Stable, sans aléatoire destructeur | Gros gains court terme, taxe permanente, événements aléatoires |
| Récompense | Richesse du contenu : lettres détaillées, visuels travaillés, variantes de recettes, subventions, dialogues fournis | Vitesse d'accès à l'équipement et aux recettes avancées |
| Risque | Aucun | Retombées rares mais mémorables (saisie, dette forcée) |

## 2. Clés de corruption

Achat unique et permanent (₭), visible seulement après la recherche Synthèse avancée :

| Clé | Prix | Taxe permanente ajoutée | Débloque |
|---|---|---|---|
| Clé 1 — « Laissez-passer » | 100 ₭ | +8 % | Recette Extrait brut, graine toxique |
| Clé 2 — « Protection » | 400 ₭ | +12 % | Recette Composé actif |
| Clé 3 — « Filière » | 1600 ₭ | +15 % | Recette Produit raffiné |

La **corruption régulière** est la somme des taxes des clés achetées (max 35 % en V1), appliquée à toutes les ventes, pour toujours (`02` §9). Le joueur paye en **vitesse long terme** — sa courbe s'aplatit durablement. L'UI l'affiche comme une ligne permanente dans le détail des prix, jamais comme une pénalité ponctuelle.

## 3. Corruption événementielle

### Déclenchement

- Actif dès la Clé 1. Chaque cycle de production illégale complété (app ouverte) : tirage `p = 1/17` (bande Coopérative : `p = 1/12` — la Coopérative surveille).
- Unique exception au prérequis de clé : les rappels de la **dette d'ouverture** (`07` §1) génèrent un événement dédié « rappel de dette » (gravité 2) même sans clé ni production illégale.
- Cooldown minimal : 3 cycles après un événement résolu. Jamais deux fois le même déclencheur consécutivement. Aucun tirage offline.
- Un seul événement pendant à la fois ; tant qu'il n'est pas résolu, les nouveaux cycles illégaux sont bloqués (DEC-09).

### Structure d'un événement (assemblé par le générateur, `08` §7)

```
{ déclencheur, PNJ porteur, gravité (1-3), coût de base, 3 options de résolution }
```

### Les trois modes de paiement — toujours proposés ensemble

| Mode | Coût | Conséquence narrative | Effet alignement |
|---|---|---|---|
| **Argent** | `max(30 × 2^(gravité−1), 2 % × gravité × richesse cumulée)` ₭ — le forfait sert de plancher, la part de richesse empêche l'incident de devenir dérisoire en fin de partie | Lettre de quittance sèche, rien ne ressurgit | 0 |
| **Réputation** | −10 × gravité sur la réputation de la faction du PNJ | Dette narrative : le PNJ « s'en souviendra » — module le ton des lettres futures | −1 |
| **Service** | Contrat forcé : livrer `X` produits en `Y` heures (X, Y selon gravité) | Crée une **faveur due** ; échec du contrat = saisie (perte du stock de PA + produits en cours) | −2 |

Si le joueur ne peut pas payer en argent (solde insuffisant), l'option est grisée mais visible — voir ce qu'on ne peut pas se payer fait partie de la tension.

### Faveurs dues

Registre persistant `{pnj, origine, date, remboursée}`. Les faveurs non remboursées sont des **hooks narratifs** : le générateur d'événements et de lettres les réutilise (un événement futur peut « rappeler un service dû » avec gravité +1). Une faveur se rembourse en acceptant le contrat qui la rappelle.

## 4. Score d'alignement

- Plage **−100..+100**, mis à jour à chaque choix significatif, **jamais affiché en valeur brute**. Le joueur ne voit que : la faction dominante actuelle (icône discrète) et la tendance récente (flèche), cohérent avec l'esprit « ambiance, pas tableau de bord moral ».
- Decay naturel : **−0.5/jour vers 0** — rester aligné demande des actes, pas un acquis.

### Deltas (table normative)

| Action | Δ alignement |
|---|---|
| Vente de production légale | +1 (plafonné à +5/jour) |
| Vente de production illégale | −1 (tag Fin nocif : −2) |
| Achat d'une clé de corruption | −5 |
| Événement payé en argent | 0 |
| Événement payé en réputation | −1 |
| Événement payé en service | −2 |
| Refuser une faveur proposée par la Zone (offre spontanée, `08` §7) | +3 |
| Accepter une subvention Coopérative | +2 |

### Bandes et trajectoires

| Trajectoire | Condition | Économie | Registre narratif |
|---|---|---|---|
| **Good — Coopérative** | score ≥ +30 | Ventes légales +25 %, événements ×1.4, subventions | Reconnaissance, réhabilitation de l'atelier familial ; V2 : fin « référence légitime » |
| **Opportuniste — Courtier** | −30 < score < +30 | Accès aux deux marchés mais commission 15 % sur tout ; pertes de réputation ×1.5 aux événements | Pragmatique, sans allégeance ; V2 : fin « ni un empire, ni une légende — un survivant » |
| **Evil — Zone** | score ≤ −30 | Ventes illégales +10 %, légales −10 %, subventions inaccessibles | Ascension rapide, tension permanente ; V2 : fin binaire empire consolidé / saisie totale |

Les **fins** de trajectoire sont V2 ; en V1 les bandes teintent l'économie et le narratif sans conclure.

## 5. Réputation par faction

Trois jauges −100..+100, distinctes de l'alignement (l'alignement dit *de quel côté tu penches*, la réputation dit *ce que chaque faction pense de toi*).

| Source | Effet |
|---|---|
| Journée avec ≥1 vente légale et 0 vente illégale | REP_COOP +2 |
| Journée avec ≥1 vente illégale | REP_ZONE +1 |
| Paiement d'événement en réputation | −10 × gravité sur la faction du PNJ |
| Contrat de service honoré | REP_ZONE +5 (ou faction du PNJ porteur) |
| Contrat échoué | −15 faction du PNJ + saisie |
| Toute vente via le Courtier (bande neutre) | REP_BROKER +1/jour actif |

Effets : `REP_COOP ≥ 20` conditionne les subventions ; les seuils de réputation sélectionnent les variantes de ton des lettres (`08` §8). La réputation ne modifie pas les prix en V1 (c'est le rôle des bandes).

## 6. Deuxième axe — Fin vs Moyens (texture)

L'alignement mesure *avec qui tu traites*. Il ne capture pas la cohérence entre **ce que tu produis** (Fin) et **comment** (Moyens) :

- **Axe Fin** : tag porté par chaque recette/plante — `bénéfique / neutre / nocif` (`02` §7, `05` §2).
- **Axe Moyens** : choix fait à chaque production/plantation — `propre / dégradant` (`02` §8).

Matrice de texture, calculée à chaque production terminée :

| | Moyens propres | Moyens dégradants |
|---|---|---|
| **Fin bénéfique** | `aligné` | `cynique` (un remède produit par un procédé toxique) |
| **Fin neutre** | `neutre` | `négligent` |
| **Fin nocive** | `artisan_du_vice` (produit néfaste, méthode intègre) | `zone_pure` |

**La texture n'a aucun effet économique.** Elle est un sélecteur de variantes dans les pools de lettres : Voss peut se montrer mal à l'aise face à un produit noble fabriqué salement (`cynique`), Coles peut respecter un artisan du vice. Le moteur maintient un compteur cumulé par texture (`textureCounts`) ; les seuils de déblocage de lettres s'appuient dessus (`07` §5).

## 7. Scénarios de test (obligatoires)

1. Achat Clé 1 puis Clé 2 : taxe 20 %, appliquée aux ventes légales comme illégales.
2. 17 cycles illégaux avec RNG seedé : l'événement tombe au cycle prédit par la seed ; cooldown respecté ; déclencheur suivant ≠ précédent.
3. Événement payé en service, contrat 5 Extraits bruts / 12 h : produits retenus au lieu d'être vendus, contrat honoré → REP_ZONE +5, faveur soldée.
4. Contrat échoué : stock de PA et productions en cours saisis, REP −15, lettre de conséquence débloquée.
5. Cas « cynique » chiffré : Remède standard (bénéfique) en Moyens dégradants → texture `cynique`, compteur incrémenté, prix inchangé par la texture.
6. Score +32 → bande Coopérative ; deux jours sans action → decay → +31 ; vente illégale nocive ×2 → +27 → bande neutre, commission 15 % réapparaît.
7. Plafond quotidien : 8 ventes légales le même jour → alignement +5, pas +8.
