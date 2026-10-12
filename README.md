# Analyse de site — Officine

Outil web d'aide à la décision pour **implanter ou transférer une pharmacie** en France.
On pose un point sur la carte, on choisit un temps de trajet (en voiture ou à pied), et
l'outil produit une **fiche d'évaluation** de la zone : population, âges, revenus, médecins,
pharmacies concurrentes, marché estimé, règle du quota d'officines et chiffre d'affaires
potentiel.

Tout le calcul se fait **dans le navigateur**, à partir de données publiques gratuites (INSEE,
OpenStreetMap). Il n'y a ni base de données ni programme serveur : seulement des fichiers à
servir et un relais vers le service de calcul de trajets Geoapify.

> **En bref, pour reprendre le projet**
> 1. Lire ce fichier, puis `docs/fonctionnement.md` (ce que voit l'utilisateur).
> 2. Essayer l'outil sur son ordinateur (5 minutes, voir ci-dessous).
> 3. Lire `docs/architecture.md` (comment c'est construit) et `docs/calculs.md` (les règles).
> 4. Pour l'héberger (avec l'accord du titulaire, voir `LICENCE.md`) : `docs/installation.md`. Pour mettre à jour les données : `docs/donnees.md`.
> 5. Les choix passés, les limites connues et les pistes sont dans `docs/historique.md`.
> 6. Conditions : consultation uniquement, tous droits réservés (`LICENCE.md`).

## Essayer en 5 minutes

Il faut Python 3.8 ou plus récent, et une **clé Geoapify** (gratuite jusqu'à 3 000 demandes
par jour : créer un compte sur <https://www.geoapify.com>, puis un projet, puis copier sa clé).

```bash
git clone <adresse du dépôt> analyse-site-officine
cd analyse-site-officine
GEOAPIFY_KEY=votre_cle python3 serveur/dev.py
```

Ouvrir <http://127.0.0.1:8080/>, attendre le chargement des données (quelques secondes), puis
cliquer n'importe où en France : la zone de trajet et la fiche apparaissent.

Vérifier que le calcul est intact (Node 18 ou plus récent) :

```bash
node tests/test_moteur.mjs      # doit finir par « Tout est conforme. »
```

## Contenu du dépôt

| Dossier ou fichier | Rôle |
|---|---|
| `app/index.html` | la page : carte, réglages, fiche, exports (HTML, CSS et JavaScript dans un seul fichier) |
| `app/engine.js` | le **moteur de calcul**, sans affichage, utilisable aussi sous Node |
| `app/commun/` | bibliothèque de carte partagée (`map-common.js`) et thème visuel (`ios-theme.css`) |
| `app/data/` | les 7 fichiers de données préparés (environ 21 Mo, 3 Mo une fois compressés) |
| `scripts/` | les scripts Python qui fabriquent `app/data/` à partir des fichiers officiels |
| `tests/` | le test de référence du moteur et sa zone de trajet figée |
| `serveur/dev.py` | serveur d'essai local (relais Geoapify compris) |
| `serveur/Caddyfile.exemple` | exemple de configuration pour un hébergement réel |
| `docs/` | la documentation détaillée |
| `CHANGELOG.md` | les versions |
| `LICENCE.md` | les conditions d'utilisation (consultation uniquement) |

## Services extérieurs utilisés par la page

| Service | Usage | Clé |
|---|---|---|
| Geoapify (Isoline) | calcul des zones de trajet | oui, **côté serveur uniquement** |
| api-adresse.data.gouv.fr (Base adresse nationale) | recherche d'adresse, commune du point posé | non |
| OpenStreetMap France | fond de carte | non |
| unpkg.com | bibliothèques Leaflet (carte), jsPDF et html2canvas (export PDF) | non |

## Conditions d'utilisation

Tous droits réservés : ce dépôt est communiqué **pour consultation uniquement**. Le lire et
l'essayer sur son ordinateur est autorisé ; le copier ailleurs, l'héberger, le modifier ou le
diffuser demande l'accord écrit de son titulaire. Détails dans `LICENCE.md`.

## Avertissement

Les montants (marché, chiffre d'affaires) viennent d'un **modèle simplifié et réglable**
(`docs/calculs.md`) : ce sont des ordres de grandeur pour comparer des sites, pas une
évaluation professionnelle. Les données ont des dates différentes (recensement 2020 et 2022,
équipements 2025) : voir `docs/donnees.md`.
