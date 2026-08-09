# QA V1 — checklist de recette

État à la livraison de la V1. Chaque ligne indique ce qui a été **effectivement
vérifié**, et par quel moyen.

## 1. Vérifications automatisées

| Contrôle | Moyen | État |
|---|---|---|
| Logique de jeu (77 tests) | `npm test` — scénarios obligatoires des docs 03→08 | ✅ |
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
| Complétion des tâches | +16 EN crédités, toast, undo proposé 10 s | ✅ |
| Panneau Habitudes | 2 habitudes, compteur `+1` → 2, pénalité affichée | ✅ |
| R&D « Blueprint extracteur » (10 EN) | recherche possible, extracteur assemblé, panneau Production révélé | ✅ |
| Farming : semer | choix plante → choix méthode (coût/rendement/durée affichés) → parcelle en croissance | ✅ |
| Mode discret (`Ctrl+D`) | barre fine d'icônes + badges, retour à l'état précédent | ✅ |
| Rechargement de l'app | état restauré à l'identique (EN 6 → 6) | ✅ |
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

## 5. Écarts assumés par rapport à la spécification

| Point | Spec | Livré | Raison |
|---|---|---|---|
| Polices | `/src/assets/fonts` | `/public/fonts` | Vite ne réécrit pas les `url()` d'un `@import` CSS ; `public/` est la voie fiable, et les polices restent embarquées (aucun réseau au runtime). |
| Tâche sans échéance | groupe « Plus tard » | groupe « Aujourd'hui » | Une tâche qu'on vient d'écrire disparaissait dans un panneau replié — défaut d'usage constaté au test. Docs 03 et 11 mises à jour. |
| Rendement médicinale, coût agroécologie, taxe de corruption, coût des incidents, bonus Coopérative | valeurs initiales des docs | recalibrés | L'économie légale ne décollait pas et la voie illégale était strictement supérieure. Corrigé et documenté dans `02` et `06`. |
| Presse et Catalyseur (machines) | V1.5 | absents | Conforme au périmètre. |
