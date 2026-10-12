# Données

> **En bref** : 7 fichiers dans `app/data/`, tous issus de données publiques gratuites
> (INSEE, OpenStreetMap). Ils sont livrés prêts à l'emploi. Pour les mettre à jour :
> télécharger les fichiers officiels, lancer les scripts de `scripts/` dans l'ordre ci-dessous,
> relancer le test, puis changer `DATA_V` dans `app/index.html`.

## 1. Les fichiers et leurs dates

| Fichier | Contenu | Source (millésime) | Script |
|---|---|---|---|
| `iris.json` | ~49 000 IRIS : code, commune, centre (lat, lon), population, tranches d'âge, catégories socio-professionnelles | INSEE recensement 2020 à l'IRIS + centres Opendatasoft | `build_iris.py` |
| `communes.json` | ~35 000 communes : population (somme des IRIS), revenu médian, 1er et 9e déciles, parts activité / pensions / prestations | INSEE Filosofi 2020 | `build_communes.py` |
| `iris-equip.json` | ~41 000 IRIS : nombre d'équipements par catégorie (14 catégories) | INSEE BPE 2025 | `build_equip.py` |
| `sante-points.json` | ~400 000 professionnels de santé : position et catégorie | INSEE BPE 2025 | `build_sante_points.py` |
| `communes-evol.json` | population communale 2006, 2011, 2016, 2022 | INSEE séries historiques 2022 | `build_series.py` |
| `communes-demo.json` | personnes par ménage, naissances et décès 2016-2022 | INSEE séries historiques 2022 | `build_series.py` |
| `pharmacies.json` | ~19 000 officines : position, nom, ville | OpenStreetMap via magOSM (juillet 2026) | `build_pharmacies.py` |

Les codes de commune sont les codes INSEE (5 caractères, par exemple `75056`) ; les codes
IRIS ont 9 caractères (code commune + 4 chiffres).

## 2. Où trouver les fichiers officiels

| Fichier attendu | Où le trouver |
|---|---|
| `base-ic-evol-struct-pop-2020.CSV` | insee.fr, « Population en 2020 — bases infracommunales (IRIS) » (publication 7704076) |
| export CSV `georef-france-iris` | public.opendatasoft.com, jeu « georef-france-iris », export CSV (séparateur `;`) |
| `FILO2020_DISP_COM.csv` | insee.fr, « Revenus, pauvreté et niveau de vie en 2020 (Filosofi) », fichier communes, revenus disponibles (publication 6692220) |
| `BPE25.csv` | insee.fr, « Base permanente des équipements 2025 », fichier géolocalisé de l'ensemble des équipements, format CSV (publication 8217525, environ 1,5 Go) |
| `base-cc-serie-historique-2022.CSV` | insee.fr, « Séries historiques des résultats du recensement 2022 », base communale |
| pharmacies | téléchargées par le script (service magOSM de Magellium, données OpenStreetMap) |

Les numéros de publication sont ceux utilisés en 2026. Si l'INSEE publie un nouveau millésime,
les noms des colonnes changent souvent d'année (par exemple `P20_POP` devient `P21_POP`) : il
faut alors adapter les noms de colonnes dans le script concerné.

## 3. Reconstruire les données

Les scripts n'utilisent que Python 3 (aucune bibliothèque à installer). Ils écrivent directement
dans `app/data/`. L'ordre compte : `build_communes.py` a besoin d'`iris.json`.

```bash
python3 scripts/build_iris.py      base-ic-evol-struct-pop-2020.CSV georef-france-iris.csv
python3 scripts/build_communes.py  FILO2020_DISP_COM.csv
python3 scripts/build_equip.py     BPE25.csv
python3 scripts/build_sante_points.py BPE25.csv
python3 scripts/build_series.py    base-cc-serie-historique-2022.CSV
python3 scripts/build_pharmacies.py
node tests/test_moteur.mjs
```

Chaque script affiche des chiffres de contrôle (population France, nombre de pharmacies…) : les
comparer à ceux indiqués en tête du script. Le test signalera des écarts dès que les données
changent : c'est attendu ; vérifier que les nouvelles valeurs sont plausibles, puis mettre à
jour la liste `ATTENDU` du test.

Enfin, changer `DATA_V` dans `app/index.html` pour que les navigateurs rechargent les données.

## 4. Points d'attention

- **Secret statistique** : Filosofi ne publie pas les revenus des petites communes (valeur
  « s ») ; la fiche affiche alors « — ».
- **Paris, Lyon, Marseille** : l'INSEE compte par arrondissement ; la Base adresse nationale
  renvoie parfois le code de la ville entière. Le moteur se rabat sur l'arrondissement de
  l'IRIS le plus proche (`analyze`, commune d'implantation).
- **Pharmacies** : deux sources différentes coexistent. Le nombre d'officines « dans la
  zone » et la liste nominative viennent d'OpenStreetMap (`pharmacies.json`) ; les officines
  « existantes » de la commune pour le quota viennent de la BPE (`iris-equip.json`). Les deux
  peuvent différer d'une unité.
- **Généralistes sans nom** : aucune source ouverte gratuite ne donne à la fois le nom et la
  position.
- **magOSM** est parfois indisponible (erreur 504) : relancer `build_pharmacies.py` plus tard.
  Le script n'écrit rien en cas d'échec.

## 5. Licences

Données INSEE et Opendatasoft : Licence Ouverte Etalab 2.0 (citer la source). Données
OpenStreetMap : licence ODbL (citer « © contributeurs OpenStreetMap »). La page affiche ces
mentions dans l'attribution de la carte.
