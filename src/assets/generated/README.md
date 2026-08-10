# Visuels générés

Ce dossier reçoit ce que produit `npm run comfy -- --da` (voir `docs/14`).
Il est vide dans le dépôt : **le jeu tourne sans aucun de ces fichiers**, et
chaque intégration teste leur présence plutôt que de la supposer.

| Fichier attendu | Où il apparaît | Sans lui |
|---|---|---|
| `atelier-backdrop.png` (ou `.webp`) | décor du bandeau, sous la scène SVG | le décor CSS actuel, inchangé |
| `papier-lettre.png` | fond du panneau Correspondance | fond uni du panneau |
| `icone-source.png` | source à détourer pour `src-tauri/icons/` | l'icône actuelle |
| `reference-machines.png` | planche à tracer en SVG — **ne part pas dans le bundle** | — |

ComfyUI nomme ses sorties lui-même (`kessler-backdrop_00001_.png`) : renommez
vers le nom attendu ci-dessus, sinon rien ne se branche.

## Le poids compte

Le binaire fait 4,7 Mo pour un budget de 15 (`09` §8), le fichier HTML unique
321 Ko. Un décor plein bandeau en PNG pèse vite 800 Ko à 1,5 Mo. Convertissez-le
avant de le committer :

```bash
cwebp -q 80 atelier-backdrop.png -o atelier-backdrop.webp && rm atelier-backdrop.png
```

Puis constatez le coût réel : `npm run build:single` imprime la taille du
fichier autonome. Si elle bondit, l'image est trop lourde pour cette voie —
gardez-la pour la version desktop et laissez le HTML unique en décor CSS.
