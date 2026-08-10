# QA V1 — checklist de recette

État à la livraison de la V1. Chaque ligne indique ce qui a été **effectivement
vérifié**, et par quel moyen.

## 1. Vérifications automatisées

| Contrôle | Moyen | État |
|---|---|---|
| Logique de jeu (86 tests) | `npm test` — scénarios obligatoires des docs 03→08 | ✅ |
| Non-régression d'équilibrage | `tests/balance.test.ts`, adossé au simulateur | ✅ |
| Typage frontend | `npm run check` (svelte-check) — 0 erreur, 0 avertissement | ✅ |
| Typage global | `npx tsc --noEmit` — 0 erreur | ✅ |
| Persistance atomique Rust | `npm run test:rust` — 2 tests | ✅ |
| Build frontend | `npm run build` | ✅ |
| Build desktop | `npx tauri build` → `.deb` (2,1 Mo) + AppImage | ✅ |

## 2. Parcours manuel (piloté par navigateur, Chromium)

Scénario rejoué de bout en bout sur l'application buildée :

| Étape | Attendu | État |
|---|---|---|
| Premier lancement | Log ouvert, lettre du notaire délivrée et lisible | ✅ |
| Quick-add « ranger la corvée de comptabilité tous les lundis » | chips `hebdo · lun` / `perso` / `corvée` | ✅ |
| Ajout de 5 todos (dont 2 habitudes) | chacune visible dans son groupe, groupe déplié automatiquement | ✅ |
| Complétion des tâches | cachet crédité en ₭, toast, undo proposé 10 s | ✅ |
| Panneau Habitudes | 2 habitudes, compteur `+1` → 2, pénalité affichée | ✅ |
| R&D « Blueprint extracteur » (20 ₭) | recherche possible, extracteur assemblé, panneau Production révélé | ✅ |
| Farming : semer | choix plante → choix méthode (coût/rendement/durée affichés) → parcelle en croissance | ✅ |
| Mode discret (`Ctrl+D`) | barre fine d'icônes + badges, retour à l'état précédent | ✅ |
| Rechargement de l'app | état restauré à l'identique | ✅ |
| Habitudes après redémarrage | panneau replié, contenu non affiché (docs/03 §1.3) | ✅ |
| Console navigateur | aucune erreur | ✅ |

## 3. Binaire desktop

| Contrôle | État |
|---|---|
| Le binaire démarre et reste en vie (Xvfb + D-Bus) | ✅ |
| Fenêtre créée sans avertissement GTK | ✅ (un défaut d'ancrage HiDPI a été trouvé ici puis corrigé) |
| Taille du binaire : 4,7 Mo | ✅ (budget < 15 Mo) |
| Paquet `.deb` : 2,1 Mo | ✅ |

## 4. Non vérifié — à faire sur une machine de bureau réelle

Ces points **ne peuvent pas** être testés dans un conteneur sans gestionnaire de
fenêtres, compositeur, ni bureau :

- Rendu visuel de la fenêtre native transparente et `always-on-top` (le contenu
  est identique au webview, déjà vérifié par capture).
- Icône et menu de la barre système (afficher/masquer, mode discret, quitter).
- Fermeture de la fenêtre = masquage, application toujours vivante dans le tray.
- Comportement multi-écrans et recentrage (`Réglages → Recentrer la fenêtre`).
- Notifications système.
- Instance unique (double lancement).
- Mesure réelle de RAM/CPU au repos (budgets visés : < 150 Mo, ~0 % masqué).
- Changement d'heure (DST) sur horloge système réelle — couvert par test unitaire
  en fuseau Europe/Paris, mais pas sur une vraie bascule.
- Récupération après corruption volontaire du fichier de sauvegarde côté Tauri
  (le chemin est couvert côté navigateur et par les tests Rust d'écriture atomique).

## 4b. Ajouts postérieurs à la V1 — vérifié / non vérifié

| Point | État |
|---|---|
| Deux vues (`?zone=todo`, `?zone=atelier`) rendues sans erreur en navigateur | ✅ |
| Scène de l'atelier : 4 stations alignées sur une ligne de sol commune | ✅ |
| Synchronisation hôte/cliente entre fenêtres Tauri | ⚠️ compile et suit un modèle simple (un seul écrivain), **non exécuté** faute de gestionnaire de fenêtres dans le conteneur |
| Placement réel des deux fenêtres sur la zone de travail | ⚠️ non vérifiable ici — à contrôler au premier lancement |

## 4c. Révision « monnaie unique » — vérifié / non vérifié

Changements DEC-14 (monnaie unique), DEC-15 (fenêtres au niveau du bureau) et
DEC-16 (Fournisseur + farming à débloquer).

| Point | Moyen | État |
|---|---|---|
| 86 tests de logique, dont 8 nouveaux sur le Fournisseur et la friche verrouillée | `npm test` | ✅ |
| Le jeu ne démarre pas sans todos cochées (stratégie `idle` : 0 ₭ de production, 0 machine) | simulateur, `tests/balance.test.ts` | ✅ |
| Part des todos dans le revenu comprise entre 20 % et 80 % à tous les stades, cachet croissant | simulateur sur 30 j, deux stratégies | ✅ |
| Corruption totale = piège : moins de ₭ cumulés et revenu/jour inférieur à la voie légale sur 30 j | simulateur | ✅ |
| Acheter coûte toujours plus cher que cultiver, sur les quatre plantes | test unitaire | ✅ |
| Migration v1 → v2 sans perte (Énergie fusionnée, historiques renommés, farming crédité) | relecture + normalisation ; **pas encore rejouée sur une vraie sauvegarde v1** | ⚠️ |
| Parcours navigateur : étal fermé → recherche → étal ouvert → achat → cycle lancé, 0 erreur console | Chromium piloté, captures relues | ✅ |
| Déploiement du bandeau : le panneau s'ouvre **au-dessus** de la scène, qui reste visible | capture | ✅ (côté web ; le redimensionnement de la fenêtre Tauri reste à voir sur machine réelle) |
| Fenêtres `alwaysOnBottom` réellement sous les applications, et bascule des 3 niveaux | — | ⚠️ non vérifiable sans gestionnaire de fenêtres |
| `set_atelier_expanded` : la fenêtre grandit vers le haut sans passer sous la barre des tâches | — | ⚠️ à contrôler au premier lancement |

## 5. Écarts assumés par rapport à la spécification

| Point | Spec | Livré | Raison |
|---|---|---|---|
| Polices | `/src/assets/fonts` | `/public/fonts` | Vite ne réécrit pas les `url()` d'un `@import` CSS ; `public/` est la voie fiable, et les polices restent embarquées (aucun réseau au runtime). |
| Tâche sans échéance | groupe « Plus tard » | groupe « Aujourd'hui » | Une tâche qu'on vient d'écrire disparaissait dans un panneau replié — défaut d'usage constaté au test. Docs 03 et 11 mises à jour. |
| Rendement médicinale, coût agroécologie, taxe de corruption, coût des incidents, bonus Coopérative | valeurs initiales des docs | recalibrés | L'économie légale ne décollait pas et la voie illégale était strictement supérieure. Corrigé et documenté dans `02` et `06`. |
| Presse et Catalyseur (machines) | V1.5 | absents | Conforme au périmètre. |
| Nombre de fenêtres | une seule (DEC-01) | deux (DEC-12) | Le dock vertical étouffait la partie jeu. Demande explicite, et le bandeau large est ce qui permet une vraie scène. |
| Ressource primaire | Énergie distincte du Kess (DEC-06) | monnaie unique (DEC-14) | Demande explicite. Le cachet des todos est désormais indexé sur le meilleur prix de vente **net** : sans cette indexation, cocher une case devenait dérisoire dès la deuxième machine. |
| Garde-fou anti-blocage du farming | bouture de secours (`05` §9) | retiré | Avec une monnaie unique, le blocage qu'il couvrait ne peut plus se produire. Un chemin jamais emprunté est un chemin jamais testé. |
| Durées de croissance | 20 à 60 min | 3 à 14 h | Une culture prête toutes les vingt minutes n'est jamais prête au moment où l'on regarde un widget. |
| Prix et coûts | barème V1 | rehaussés d'un facteur ~3 à 20 | Conséquence mécanique de la fusion : les deux échelles (R&D en EN, achats en ₭) devaient se rejoindre, et la courbe de progression a été recalée au simulateur sur 21 jours. |
