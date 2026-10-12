# Ce que fait l'outil, vu par l'utilisateur

> **En bref** : on pose un point, on choisit un temps de trajet, l'outil trace trois zones
> (« anneaux ») et affiche une fiche d'évaluation. Deux cartes de couleur aident à repérer les
> communes intéressantes avant même de poser un point. La fiche s'exporte (PDF, tableur,
> GeoJSON) et se partage par un lien qui rejoue l'analyse.

## 1. Poser un site

- **Cliquer sur la carte**, ou **chercher une adresse** (champ de recherche, Base adresse
  nationale). Le marqueur se déplace ensuite par glisser-déposer : l'analyse se refait.
- L'outil demande à la Base adresse nationale la **commune** du point (code INSEE). C'est la
  « commune d'implantation », utilisée pour les revenus et le quota réglementaire.
- Le bouton « Ma position » centre la carte sur l'appareil.

## 2. Régler l'analyse

Panneau « Analyse » en haut :
- **mode** : voiture ou à pied ;
- **temps** : 5, 10, 15, 20 ou 30 minutes.

Changer un réglage relance l'analyse. En voiture, le trajet tient compte d'une circulation
approximative (sinon les zones sont nettement trop grandes, voir `historique.md`).

## 3. Les trois anneaux

Pour un temps de T minutes, l'outil demande trois zones : environ T/3, 2T/3 et T minutes. Elles
sont dessinées en dégradé, et la fiche donne la population cumulée de chacune. La **dernière
zone** (T minutes) sert à toute l'analyse : on l'appelle la **zone de chalandise** ou **maille**.

## 4. La fiche d'évaluation

Dans l'ordre d'affichage :

| Bloc | Contenu |
|---|---|
| Verdict | « favorable », « modérée » ou « limitée », avec les points positifs et négatifs qui l'expliquent |
| Marché adressable | consommation estimée de la zone en pharmacie (k€ par an), ventilée médicaments / matériel médical / cosmétique, avec un indice (France = 100) ; en dessous, le **chiffre d'affaires potentiel** |
| 01 Population et profil | habitants de la zone, 65 ans et plus, 0-14 ans, revenu médian de la commune comparé à la France ; courbe d'évolution 2006-2022 (projection 2025) ; tranches d'âge ; catégories socio-professionnelles ; structure du foyer (personnes par ménage, soldes naturel et migratoire) |
| 02 Positionnement | profil de consommation et conseil d'offre (proximité ou parapharmacie) |
| 03 Zone de chalandise | habitants de chacun des trois anneaux |
| 04 Environnement concurrentiel | officines de la zone, **par nom**, avec leur distance (8 premières) ; habitants par officine comparés à la France |
| 05 Armature médicale | généralistes, spécialistes, dentistes, kinés, infirmiers, sages-femmes : nombres et densités pour 10 000 habitants comparées à la France ; maisons de santé |
| 06 Armature commerciale | commerces, dont alimentaires, et écoles |
| 07 Cadre réglementaire | feu vert / orange / rouge du quota d'officines de la commune, écart au seuil |

Les règles de calcul de chaque bloc sont dans `calculs.md`.

## 5. Ce qui s'affiche sur la carte

- **Officines concurrentes** de la zone : épingles vertes à croix, avec le nom.
- **Généralistes** de la zone : points bleus (sans nom, voir les limites).
- **Toutes les officines** connues, à partir du zoom 12 : petites épingles vertes, même sans
  analyse en cours.

## 6. Les cartes de couleur (panneau « Calques »)

Chaque commune est un point coloré :
- **Ouverture** : délai estimé avant qu'une officine supplémentaire soit autorisée par le quota,
  d'après la croissance récente de la population (vert : déjà possible ou moins d'un an ;
  rouge : population en baisse, donc jamais).
- **Revenu** : potentiel par officine (population × revenu relatif ÷ officines existantes),
  classé en cinq niveaux de « très faible » à « excellent ».

Les pastilles de la légende servent de filtre (cliquer pour masquer une couleur).

## 7. Exporter et partager

- **PDF** : image de la fiche, fabriquée dans le navigateur (l'impression classique ne marche
  pas sur iPhone).
- **Tableur** : fichier CSV (séparateur `;`, accents compatibles Excel).
- **GeoJSON** : le site, la zone, les concurrents et les IRIS retenus, pour un logiciel de SIG.
- **Lien** : l'adresse de la page contient `#lat,lon,mode,minutes,commune` ; ouvrir ce lien
  refait exactement la même analyse.
