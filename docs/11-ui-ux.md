# 11 — UI / UX

## 1. Principes

1. **Discrétion** : le widget vit en permanence sur le bureau — tout panneau est repliable individuellement, l'ensemble se réduit en barre fine (« mode discret »). Le jeu ne réclame jamais l'attention par du mouvement non sollicité.
2. **Friction de saisie minimale** : le quick-add avec parseur est le chemin par défaut ; le formulaire complet est une option.
3. **Le jeu récompense, il n'interrompt pas** : pas de modal bloquante (même les événements de corruption sont des cartes épinglées, DEC-09) ; les feedbacks sont brefs et locaux.
4. **Habitudes invisibles par défaut** : panneau replié à chaque démarrage, aucun contenu affiché passivement (`03` §1.3).

## 2. Layout général (une fenêtre, DEC-01)

```
┌─────────────────────────────┐ 380px, ancrée à droite
│ ▪ barre de titre fine       │ drag, pin (always-on-top), mode discret, ⚙
├─────────────────────────────┤
│ [quick-add ______________ ] │ + chips du parseur
├─────────────────────────────┤
│ ▼ Aujourd'hui           (3) │ cartes todo
│ ▼ Cette semaine         (5) │
│ ▶ Plus tard             (8) │ replié
│ ▶ Habitudes              ·  │ TOUJOURS replié au démarrage
├─────────────────────────────┤
│ ══ DOCK MODULES ══          │ onglets accordéon (un seul déplié)
│ ▶ 🧪 Labo R&D               │
│ ▼ ⚗ Labo Production        │ cartes machines, jauges de cycle
│ ▶ 🌱 Farming            (2) │ badge : parcelles prêtes
│ ▶ ✉ Log                 (1) │ badge : lettres non lues
└─────────────────────────────┘
```

- **Mode discret** : tout replié → barre verticale de ~48 px (icônes + badges only). Un clic restaure l'état précédent des panneaux.
- Événement de corruption en attente : carte épinglée en tête du dock, liseré rouge/or, badge sur l'icône tray. Elle ne bloque rien d'autre que les nouveaux cycles illégaux.
- États repliés persistés dans `settings.collapsedPanels` — à l'exception du panneau Habitudes.

## 3. Composant `Panel` (fondation, à construire au Goal 1)

Contrat du composant réutilisable — tous les panneaux de l'app l'utilisent :

- Props : `id` (clé de persistance), `title`, `badge` (nombre ou pastille), `persistCollapse` (défaut true ; false pour Habitudes), `headerSlot` optionnel.
- Comportement : chevron + clic sur tout le header ; animation de repli 150 ms ease-out (hauteur), désactivée si `prefers-reduced-motion` ; le contenu replié est démonté du DOM (perf) mais son état logique vit dans les stores, pas dans le composant.
- Le badge reste visible replié — c'est le canal d'information principal du mode discret.

## 4. Colonne todo

- **Carte todo** : fond teinté par catégorie (perso/pro), bordure gauche + petite icône par type de récurrence (ponctuelle/fixe/flexible/abstinence/compteur — `12` §5), titre, échéance relative (« ce soir », « jeu. »), points de difficulté (1–4 points discrets).
- Groupes : Aujourd'hui (occurrences dues, échéances du jour **et tâches sans échéance** — c'est l'inbox : une tâche qu'on vient d'écrire ne doit jamais disparaître hors de vue), Cette semaine, Plus tard (échéances au-delà de la semaine). Tri par échéance puis difficulté décroissante. Le groupe qui reçoit une todo se déplie automatiquement à la création.
- Complétion : case → micro-animation (`12` §8) + flottant `+X EN` ; undo toast 10 s (`03` §5).
- Compteur d'habitude : bouton `+1` et total du jour visibles uniquement le panneau déplié ; « j'ai craqué » = bouton texte discret, confirmation inline en un tap.
- Édition : clic sur carte → popover d'édition (mêmes chips que le parseur + champs gain/perte/seuils).

## 5. Dock modules

- Accordéon : un seul module déplié à la fois (l'espace vertical est compté) ; le dock entier est repliable.
- **Labo R&D** : arbre compact vertical (nœuds : verrouillé/disponible/acquis), coût EN affiché, tooltip d'effet. Achat en un clic si solde suffisant.
- **Labo Production** : une carte par machine — icône SVG (animée si `running`, `12` §8), nom généré, jauge de cycle avec temps restant, recette assignée (sélecteur), toggle Moyens propre/dégradant (icône goutte/fumée), jauge pollution globale du labo + bouton nettoyage.
- **Farming** : une carte par parcelle — illustration du stade de croissance, jauge temps, badge dette si > 10 %, bouton récolter. Plantation = deux taps : plante puis méthode (coûts/effets affichés sur les deux boutons).
- **Log** : trois onglets (`07` §4) — Correspondance (lettres, typo dédiée), Registre (fil factuel), Carnet (tendances habitudes 7/30 j, petits sparklines sobres).

## 6. Indicateur d'alignement

Un unique glyphe discret dans la barre de titre : icône de la faction dominante + flèche de tendance récente. Tooltip qualitatif (« La Coopérative vous regarde d'un bon œil »), **jamais de valeur numérique** (`06` §4).

## 7. Réglages (⚙)

Opacité (60–100 %), always-on-top, position/taille (reset), mode discret au démarrage, export/import de sauvegarde, à-propos. V1.5 : raccourci global quick-add, autostart. Pas de réglages d'équilibrage exposés.

## 8. Premier lancement (onboarding diégétique)

1. La fenêtre apparaît avec la **lettre du notaire** ouverte (Log déplié) : elle explique l'héritage, la dette, et se termine par « commencez par noter ce que vous avez à faire » — le tutoriel est la fiction.
2. Trois placeholders suggérés dans le quick-add (rotation d'exemples type « appeler le comptable tous les lundis »).
3. Le dock n'affiche que le Labo R&D (un seul nœud accessible) ; les modules se révèlent quand leur premier élément existe (première machine → Production ; distillateur → graine industrielle → etc.).
4. Aucune autre étape guidée — la boucle courte s'auto-explique.

## 9. Raccourcis clavier (V1)

| Raccourci | Action |
|---|---|
| `Ctrl/Cmd+N` | focus quick-add |
| `Entrée` / `Échap` | valider / annuler la saisie |
| `Ctrl/Cmd+D` | mode discret |
| `Ctrl/Cmd+Z` | undo complétion (pendant la fenêtre de 10 s) |

## 10. États vides et erreurs

- Panneau sans contenu : une ligne sobre en `text-dim` (« Aucune tâche pour aujourd'hui »), jamais d'illustration pleine page.
- Sauvegarde corrompue : écran de récupération (backups + export du fichier fautif, `09` §5) — le seul écran bloquant autorisé de l'app.
- Solde insuffisant : les boutons d'achat restent visibles, grisés, avec le manque affiché (« 12 ₭ manquants ») — voir ce qu'on ne peut pas se payer fait partie du jeu (`06` §3).

## 11. Accessibilité

- Toutes les couleurs sémantiques doublées d'une forme (icône/bordure) — jamais la couleur seule.
- Contraste texte ≥ 4.5:1 sur les fonds translucides (le fond a une opacité minimale garantie de 60 %).
- `prefers-reduced-motion` : toutes les animations décoratives coupées, seuls les changements d'état instantanés restent.
- Navigation clavier complète sur la colonne todo (tab/espace/entrée).
