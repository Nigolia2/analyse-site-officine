# Architecture

> **En bref** : une page web statique. Au démarrage elle télécharge 7 fichiers JSON (toute la
> France), les indexe en mémoire, puis chaque analyse est un calcul local : la seule demande
> réseau par analyse est le calcul des zones de trajet (Geoapify), via un relais qui ajoute la
> clé. Le calcul est isolé dans `app/engine.js`, testable sans navigateur.

## 1. Vue d'ensemble

```
Navigateur                                        Serveur web (Caddy, ou serveur/dev.py)
──────────                                        ──────────────────────────────────────
index.html ── charge ──> commun/*.js, *.css  <──── fichiers statiques de app/
           ── charge ──> data/*.json (7)     <────
           ── import ──> engine.js           <────
clic sur la carte
  ├─ api-adresse.data.gouv.fr/reverse  → code INSEE de la commune
  ├─ geoapify-iso/x?lat=…&range=…  ───────────────> relais : ajoute apiKey, transmet à
  │                                                 api.geoapify.com/v1/isoline
  └─ engine.analyze(données, zone, point) → résultat → fiche + couches de carte
```

Aucune donnée d'analyse ne part vers un serveur à part les coordonnées du point (Geoapify et
Base adresse nationale). Il n'y a ni compte, ni base de données, ni sauvegarde côté outil.

## 2. Les fichiers

### `app/engine.js` — le moteur (environ 400 lignes)

Module JavaScript sans aucun accès à la page (pas de DOM), donc utilisable dans le navigateur
et sous Node (c'est ce que fait `tests/test_moteur.mjs`). Entrées et sorties sont de simples
objets : la même entrée donne toujours le même résultat, ce qui permet le lien de partage.

| Élément | Rôle |
|---|---|
| `CONFIG` | **toutes les hypothèses réglables** : lissage, références France, consommation par habitant, élasticités, quota. Voir `calculs.md` |
| `indexData({iris, communes, equip, pharmacies, evol, sociodemo, santePoints})` | appelé une fois au chargement : construit les index (par commune, par IRIS) et les références France calculées sur les mêmes données |
| `analyze(idx, zone, {lat, lon}, {implCom})` | l'analyse complète d'un site ; renvoie un objet avec `demo`, `income`, `armature`, `competition`, `consumption`, `quota`, `ca`, `verdict`, `drivers`, `evolution`, `socio`, `prescripteurs`… |
| `zonePopulation(idx, zone)` | population d'une zone seule (pour les trois anneaux) |
| `ringsFromIso`, `pointInRing`, `inZone` | géométrie : contours de la zone, test « point dans le polygone », test avec lissage |

### `app/index.html` — la page (environ 1 000 lignes)

Un seul fichier contenant le style, la structure et le script principal (module JavaScript).
Repères dans le script, dans l'ordre :

| Fonction ou zone | Rôle |
|---|---|
| en tête | `window.__PAGE_V__`, import de `engine.js?v=…` (numéro de version : voir § 4) |
| `buildHeatData`, `HeatCanvas`, `setupHeatmaps` | les cartes de couleur par commune (calque dessiné sur un canvas) |
| `FILES`, `DATA_V` | liste des 7 fichiers chargés au démarrage et leur numéro de version |
| `setSite` | pose du point, appel à la Base adresse nationale pour la commune |
| `run` | l'analyse : 3 demandes de zones à Geoapify, `analyze`, `zonePopulation`, puis affichage |
| `drawRings`, `drawPharmacies`, `drawGeneralistes`, `refreshPharmBase` | couches de la carte |
| `renderFiche` | construit le HTML de la fiche à partir du résultat |
| `updateHash`, `replayFromHash` | lien de partage `#lat,lon,mode,minutes,commune` |
| `exportPDF`, `exportCSV`, `exportGeoJSON`, `shareLink` | exports |
| `geocode` | recherche d'adresse |

Bibliothèques chargées depuis unpkg.com : Leaflet 1.9.4 (carte) ; jsPDF 2.5.1 et html2canvas
1.4.1, seulement au premier export PDF.

### `app/commun/`

Copie de la bibliothèque partagée par les autres cartes du site d'origine. L'outil n'en
utilise que quatre fonctions : `addBasemap` (fond de carte), `makePin` (épingles),
`attachDoubleTapDragZoom` (zoom à une main sur téléphone) et `attachGeolocation` (bouton
« Ma position »). Le fond de carte se change à un seul endroit : `CMAP_BASEMAP` en tête de
`map-common.js`. Le reste du fichier peut être ignoré ou élagué.

### `app/data/` — les données

Chaque fichier a la forme compacte `{"fields": [noms des colonnes], "rows": [[…], […]]}`.
Le détail des colonnes et des sources est dans `donnees.md`.

## 3. Le calcul d'une analyse, pas à pas

1. **Zones** : trois demandes à Geoapify (T/3, 2T/3, T minutes), en voiture avec
   `traffic=approximated`.
2. **Maille** : on garde les IRIS dont le point central, ou l'un des 8 points d'un cercle de
   450 m autour, tombe dans la zone de T minutes (voir `calculs.md` § 1).
3. **Agrégation** : population, âges et catégories socio-professionnelles sont additionnés sur
   la maille ; les équipements aussi ; les professionnels de santé et les officines sont
   comptés **point par point** dans la zone.
4. **Commune d'implantation** : celle donnée par la Base adresse nationale ; à défaut, celle de
   l'IRIS le plus proche (cas de Paris, Lyon et Marseille, où l'INSEE compte par
   arrondissement).
5. **Modèles** : consommation, quota, chiffre d'affaires, verdict (`calculs.md`).
6. **Affichage** : la fiche, puis l'adresse de la page est mise à jour pour le partage.

## 4. Les numéros de version (cache)

Le serveur garde en cache `engine.js` et les données. Pour forcer les navigateurs à prendre
une nouvelle version :
- après une modification de `engine.js` : changer le `?v=…` de la ligne
  `import … from './engine.js?v=…'` dans `index.html` ;
- après une mise à jour d'un fichier de `app/data/` : changer `DATA_V` dans `index.html`.

`index.html` lui-même doit être servi sans cache (`Cache-Control: no-cache`, voir
`serveur/Caddyfile.exemple`).

## 5. Sécurité

- **Clé Geoapify** : elle ne doit jamais apparaître dans un fichier de `app/`. Elle est ajoutée
  par le relais (`serveur/dev.py` ou la règle `handle_path /geoapify-iso/*` de Caddy).
- **Accès** : l'outil n'a pas de connexion. Il doit être placé derrière une authentification ou
  réservé à un réseau privé, sinon n'importe qui peut consommer le quota Geoapify.
- **Données affichées** : les noms d'officines viennent d'OpenStreetMap et sont insérés tels
  quels dans la fiche (`renderFiche`, `drawPharmacies`). Voir la piste correspondante dans
  `historique.md`.
