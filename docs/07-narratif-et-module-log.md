# 07 — Narratif et module Log

Le Log est la **récompense "soft"** du jeu : une correspondance qui s'écrit selon les paliers atteints et les choix moraux cumulés. Pas de moteur de dialogue — des lettres reçues, générées par templates (`08` §8).

## 1. Univers — la Zone Franche de Kessler

Ancien bassin minier reconverti en zone franche, à cheval sur **trois juridictions qui ne s'accordent jamais** sur ce qui est légal — c'est l'explication-monde de la coexistence des deux économies. Décor post-industriel : friches, ateliers reconvertis, canaux, douanes intérieures. Ni pur sci-fi, ni pur film noir : une économie grise plausible.

Le joueur hérite de **l'atelier de son oncle**, fermé depuis deux ans — littéralement un ancien atelier de facteur d'instruments reconverti en labo (l'établi, les gabarits et les serre-joints sont encore là ; les machines SVG gardent des traces de cet héritage, `12` §6). L'héritage vient avec ses **dettes non soldées : 500 ₭ dus à la Zone** (DEC-10) — le point de départ explique mécaniquement pourquoi il faut des ressources vite, quelle que soit la voie choisie.

### La dette d'ouverture (premier arc)

- Visible dès le premier lancement (lettre d'intro de Coles). Remboursable en une ou plusieurs fois via un bouton dédié du panneau Log.
- Tant qu'elle court : Coles envoie des rappels de plus en plus appuyés (paliers : J+7, J+14, puis 1 événement de gravité 2 « rappel de dette » tous les ~10 jours, même sans production illégale — seul cas d'événement possible sans clé).
- Soldée en argent → lettre de quittance + REP_ZONE +5 (« un client sérieux »). Soldée puis clés achetées → autre variante. Jamais remboursée mais Clé 2 achetée → Coles la « convertit » en faveur due permanente.

## 2. Les trois factions

| Faction | Nature | Offre | Prix |
|---|---|---|---|
| **La Coopérative** | Syndicat légal des chimistes agréés | Subventions, accès labo avancé, respectabilité | Lenteur : validations, quotas, contrôles |
| **La Zone** | Réseau clandestin contrôlant les intermédiaires | Accès rapide, cash immédiat | Corruption croissante, dettes qui s'accumulent |
| **Le Courtier** | Figure neutre, ne travaille pour personne | Revend l'accès aux deux marchés | Commission constante, méfiance des deux camps |

Chaque faction réagit aux **choix cumulés** (réputation + bande d'alignement), jamais au seul dernier choix.

## 3. Les trois PNJ récurrents — fiches de voix

Ces fiches sont **normatives pour l'écriture des templates de lettres** : chaque template doit être identifiable à son auteur sans signature.

### Inspectrice Voss (Coopérative)
- **Voix** : administratif sec, phrases courtes, vocabulaire réglementaire précis ; des fissures d'humanité apparaissent avec la réputation (une remarque personnelle en post-scriptum, jamais dans le corps).
- **Motivation** : croit sincèrement que la norme protège les gens de la Zone.
- **Relation** : rigide mais loyale si on la respecte ; `REP_COOP ≥ 40` → elle défend le joueur en interne (lettres le mentionnant) ; texture `cynique` répétée → malaise explicite même si le produit est noble.

### Sergent Coles (Zone, douanier corrompu)
- **Voix** : jovial, argot douanier, faux-bonhomme ; la menace est toujours en sous-texte, jamais frontale (« ce serait dommage que… »). Impitoyable sur les dettes.
- **Motivation** : son pourcentage, et l'ordre particulier qu'il fait régner.
- **Relation** : chaleureux tant que ça paye ; chaque faveur due le rend plus familier (tutoiement progressif dans les variantes de templates).

### Reyes (Courtier)
- **Voix** : elliptique, commercial, jamais le même angle deux fois (contrainte pour les templates : les lettres de Reyes piochent leur structure dans 3 gabarits différents — note de marché, proposition chiffrée, anecdote à chute).
- **Motivation** : opaque ; Reyes ne juge jamais, Reyes cote.
- **Relation** : disponible pour tous, fidèle à personne ; en bande neutre prolongée, Reyes devient le correspondant principal.

## 4. Module Log — fonctionnement

### Trois onglets

1. **Correspondance** : les lettres, présentation type courrier (typo « machine à écrire », `12` §4), triées antéchronologiquement, badge non-lu. Une lettre = un objet daté, archivé définitivement (relisible toujours).
2. **Registre** : fil d'activité factuel (ventes, recherches, événements résolus, contrats) — froid, comptable, généré des effets du moteur.
3. **Carnet** : vues de tendance des habitudes (compteurs quotidiens, streaks) sur 7/30 jours, en petits graphiques sobres. C'est ici — et seulement ici — que l'historique des habitudes est visualisé.

### Déclencheurs de lettres

| Famille | Exemples |
|---|---|
| Paliers économiques | première vente, 100 ₭ cumulés, chaque machine construite, chaque Mk2, dette soldée |
| Événements de corruption | chaque résolution (variante selon le mode de paiement) |
| Bascules d'alignement | entrée dans une bande, sortie d'une bande |
| Seuils de texture cumulée | `textureCounts.cynique ≥ 3` → lettre de malaise de Voss ; `zone_pure ≥ 5` → lettre d'estime de Coles… |
| Vie des todos | premier streak 7, streak 30, récupération après un « j'ai craqué » (lettre encourageante du PNJ dominant — la seule intrusion du narratif dans les habitudes, toujours bienveillante) |
| Offres spontanées | la Zone propose une faveur (refusable, `06` §4) ; la Coopérative propose la subvention |

### Anti-spam

Maximum **2 lettres/jour** ; les déclencheurs excédentaires sont mis en file et délivrés les jours suivants (les lettres datées restent cohérentes : elles mentionnent l'événement au passé). Les lettres d'événements de corruption sont prioritaires et ne comptent pas dans le plafond.

## 5. Contenu écrit à la main vs généré

**Seul contenu autorisé à être écrit à la main** (l'exception au principe procédural) :

- Les **3 lettres d'ouverture** (une par faction, premier lancement, séquencées sur les 3 premiers jours) : le notaire transmet l'atelier (contexte + tutorial diégétique), Coles signale la dette, Voss propose la voie de l'agrément.
- Les gabarits de structure des templates eux-mêmes (`08` §8).

Tout le reste — corps des lettres, événements, noms de machines — sort des pools × variables. **Interdiction d'ajouter du contenu narratif en dur ailleurs** (contrainte reprise dans `README` et `13`).

## 6. Scénarios de test (obligatoires)

1. Premier lancement : lettre du notaire présente ; lettres de Coles et Voss délivrées aux minuits suivants (file d'anti-spam).
2. `textureCounts.cynique` passe à 3 : lettre de Voss variante `cynique` sélectionnée (seed fixée), pas redéclenchée à 4.
3. 5 déclencheurs le même jour : 2 lettres délivrées, 3 en file, délivrées à 2/jour ensuite.
4. Dette soldée au jour 10 : lettre de quittance, REP_ZONE +5, plus aucun rappel ensuite.
5. Le Registre reflète exactement les effets émis par le moteur (aucune écriture directe de l'UI dans le Registre).
