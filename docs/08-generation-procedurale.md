# 08 — Génération procédurale

Principe fondateur (contrainte de scope) : le volume perçu vient de **templates paramétrés × formules × variables injectées**, jamais d'un catalogue écrit à la main. Ce document définit les pools, leurs tailles maximales, et les générateurs.

**Règle dure pour l'agent d'implémentation : ne pas écrire de contenu "en dur" au-delà des pools et gabarits définis ici.** Agrandir un pool = décision d'équilibrage à documenter, pas un réflexe d'écriture.

## 1. RNG seedé (DEC-05)

- PRNG **mulberry32** ; la seed racine est générée au premier lancement et sauvegardée dans `meta.seed`.
- Streams dérivés par domaine : `rngEvents`, `rngLetters`, `rngNaming`, … (`seed_domaine = hash(seed_racine, nom_domaine)`) — tirer une lettre ne décale jamais la séquence des événements.
- Tout tirage passe par le stream injecté ; `Math.random` est interdit dans `/src/game-logic` (règle lint).

## 2. Vue d'ensemble des pools (tailles V1)

| Générateur | Pools | Volume écrit | Volume perçu |
|---|---|---|---|
| Machines | 5 templates × formule de scaling × 4 palettes | 5 fiches | ~20 visuels de machines |
| Recettes | 6 recettes signature (data) ; combinatoire V1.5 | 6 lignes | 6 (V1) → dizaines (V1.5) |
| Plantes | 4 templates × formule de rendement × 4 stades visuels | 4 fiches | 16 illustrations |
| Événements | 6 déclencheurs × 3 PNJ × 3 gravités × 3 coûts | 6 gabarits | ~50 événements distincts |
| Lettres | ~24 templates (8 par PNJ) × variables × variantes de ton | ~24 gabarits + 3 lettres scriptées | Des centaines de lettres |
| Noms de machines | grammaire `[préfixe][base][Mk N]` | 3 listes courtes | ~60 noms |

## 3. Machines

Template :

```ts
MachineTemplate {
  id: 'extractor' | 'still' | 'synthesizer' | 'press' | 'catalyst',
  baseCycleSec: number,          // 02 §6
  role: 'refine' | 'produce' | 'passive',
  paletteId: PaletteId,          // 12 §6
  svgBaseId: string              // dessin de base, décliné par états/Mk
}
```

- Scaling : `durée(Mk) = base × 0.85^(Mk−1)` ; coûts dans `balance.ts`.
- Variantes visuelles par **modification de couleur/détail SVG** (calques d'accent activés par Mk), jamais par redessin (`12` §6).
- Presse et Catalyst : définis dans les données dès V1, inaccessibles (aucun nœud R&D ne pointe vers eux avant V1.5) — ajouter V1.5 = ajouter deux nœuds d'arbre.

### Grammaire de nommage

`[Préfixe d'usure] [Base] [Mk N]` — préfixes (pool de 8 : « Vieux », « Réformé », « Série K », …) tirés une fois à la construction via `rngNaming`, stockés sur l'instance. Donne de la personnalité sans écrire de catalogue.

## 4. Recettes

V1 : les 6 recettes signature sont de la **data** (`recipes.data.ts`), pas du code — table complète dans `02` §7 avec intrants, sorties, machines, prérequis, tag Fin.

V1.5 (défini maintenant pour ne pas être bloqué plus tard) : générateur combinatoire — `2-3 intrants ∈ pools PA × formule de valeur : prix = Σ(rareté_intrant × coefficient) × multiplicateur_machine`, tag Fin hérité du pire intrant (un composant toxique rend la fin nocive). Les recettes générées s'ajoutent aux signatures, ne les remplacent pas.

## 5. Plantes

```ts
PlantTemplate {
  id: 'medicinal' | 'industrial' | 'recreational' | 'toxic',
  seedCost: number, growthMin: number, baseYield: number,
  paOutput: ResourceId, endTag: 'beneficial' | 'neutral' | 'harmful',
  unlock: UnlockCondition, paletteId: PaletteId
}
```

Table des valeurs : `05` §2. Rendement : `round(baseYield × modMéthode × (1 − dette))`, min 1. Visuels : un dessin de base × 4 stades de croissance × recoloration par template (`12` §7).

## 6. Générateur d'événements de corruption

### Pools

**Déclencheurs (6)** — chaque entrée : `{id, gabarit de titre/description avec variables, gravitéMin, gravitéMax, contraintes}` :

1. `customs_seizure` — « La douane a saisi un convoi » (gravité 2-3)
2. `favor_recall` — « [PNJ] vous rappelle un service dû » (requiert une faveur due ; sinon retiré du tirage)
3. `surprise_inspection` — « Inspection surprise » (porté par Voss ; gravité 1-2)
4. `middleman_blackmail` — « Un intermédiaire en sait trop » (gravité 2)
5. `workshop_theft` — « Vol dans l'atelier » (gravité 1-2)
6. `market_rumor` — « Une rumeur court sur votre production » (gravité 1)

**PNJ porteurs (3)** : Voss / Coles / Reyes — contraints par déclencheur (une inspection ne peut pas être portée par Coles).

**Coûts de base (par gravité)** : `coût_base(g) = max(30 × 2^(g−1), 2 % × g × richesse cumulée)` ₭ — forfait plancher 30/60/120 relevé à proportion de la richesse (`06` §3).

### Assemblage

```
tirage déclencheur (pondéré, filtré par contraintes, ≠ précédent)
→ tirage PNJ compatible
→ tirage gravité dans [min, max]
→ instanciation des 3 options de résolution (06 §3)
→ génération du texte : gabarit du déclencheur + variables {pnj, montant, produit, faveurs}
```

**Offre spontanée** (hors événements-sanctions) : à chaque bascule de palier économique (première fois 200/1000/5000 ₭ cumulés), la Zone propose une faveur gratuite refusable (+3 alignement si refus, faveur due si acceptation : −3). Même générateur, gabarit dédié.

## 7. Générateur de lettres

### Structure d'un template

```ts
LetterTemplate {
  id: string,
  pnj: 'voss' | 'coles' | 'reyes',
  trigger: TriggerCondition,     // palier | événement résolu | bande | seuil texture | streak | offre
  conditions?: { band?, minRep?, maxRep?, texture?, debtOpen? },
  weight: number,                // pondération de tirage entre variantes éligibles
  bodyVariants: string[]         // 2-3 corps par template, variables {}
}
```

Variables injectables : `{playerName?, amount, faction, product, machine, streak, texture, debtRemaining, favorCount, day}`.

### Sélection

1. À chaque effet déclencheur émis par le moteur : filtrer les templates dont `trigger` + `conditions` matchent.
2. Pondérer par `weight` × fraîcheur (un template déjà servi récemment voit son poids divisé par 4 — anti-répétition).
3. Tirer template puis variante via `rngLetters` ; injecter les variables ; dater ; passer par la file anti-spam (`07` §4).

### Budget d'écriture V1 (plafond dur)

- 8 templates × 3 PNJ = 24 templates, 2-3 variantes chacun (~60 corps de 60-120 mots).
- +3 lettres d'ouverture scriptées (`07` §5).
- Répartition indicative par PNJ : 2 paliers, 2 résolutions d'événement, 1 bascule de bande, 1 texture, 1 relation todo/streak, 1 spécifique (dette pour Coles, subvention pour Voss, marché pour Reyes).

Le **ton** de chaque corps doit respecter les fiches de voix de `07` §3 — c'est le travail d'écriture le plus exigeant du projet ; les gabarits sont en français.

## 8. Tests du procédural (obligatoires)

1. Déterminisme : même seed → même séquence d'événements, de lettres et de noms sur un scénario de 30 jours simulé.
2. Indépendance des streams : consommer 100 tirages de lettres ne change pas le prochain événement.
3. Couverture : sur 200 événements simulés, les 6 déclencheurs et les 3 PNJ apparaissent tous ; jamais deux déclencheurs identiques consécutifs ; `favor_recall` jamais tiré sans faveur due.
4. Lettres : toutes les variables de tous les gabarits sont résolues (aucun `{placeholder}` résiduel sur un fuzzing des états).
5. Anti-répétition : un template servi voit sa probabilité effectivement réduite (test statistique sur seed fixe).
