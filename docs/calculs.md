# Règles de calcul

> **En bref** : la zone de chalandise est un ensemble d'IRIS (quartiers INSEE) ; les
> chiffres de la fiche sont des sommes sur ces IRIS ou des comptes de points dans la zone.
> Le marché vient d'un modèle simple (consommation moyenne française modulée par l'âge et le
> revenu). Toutes les hypothèses sont dans l'objet `CONFIG` d'`app/engine.js`.

## 1. La maille (zone de chalandise)

- Un IRIS fait partie de la maille si son **point central** tombe dans la zone de trajet, **ou**
  l'un des 8 points d'un cercle de **450 m** autour de lui (`CONFIG.smoothM`). Ce « lissage »
  évite de perdre des quartiers quand la zone en voiture a une forme étoilée (le long des
  routes).
- Seuls les contours extérieurs de la zone comptent (les trous sont ignorés).
- Population des anneaux : même règle pour chaque anneau. Le plus petit contient au moins
  l'IRIS du point, et chaque anneau au moins la population du précédent.

Validation : sur un site réel, la population de la zone calculée par l'outil a été comparée à
celle d'une étude de marché professionnelle : écart de −3,9 %. Les généralistes, officines et
maison de santé comptés étaient identiques. Ce site n'est pas cité ; le test du dépôt utilise un
autre point, neutre (voir `tests/test_moteur.mjs`).

## 2. Démographie et revenus

- Population, tranches d'âge et catégories socio-professionnelles : **sommes** sur la maille
  (recensement 2020).
- **Revenu médian de la commune** : celui de la commune d'implantation (Filosofi 2020).
- **Revenu de la zone** : moyenne des médianes des communes touchées, pondérée par leur
  population dans la maille (approximation : on ne peut pas recalculer une vraie médiane).
- **Évolution** : pour chaque commune touchée, la population dans la maille est projetée sur
  2006, 2011, 2016 et 2022 au prorata de la série communale ; la courbe est un indice
  (2006 = 100) comparé à la France. Le point 2025 prolonge la tendance 2016-2022.
- **Soldes** (commune d'implantation, 2016-2022) : naturel = (naissances − décès) / 6 ans /
  population ; total = croissance annuelle 2016-2022 ; migratoire = total − naturel.

## 3. Concurrence et armature médicale

- **Officines** : comptées point par point dans la zone (fichier `pharmacies.json`), triées par
  distance au site. Habitants par officine = population de la maille ÷ officines.
- **Professionnels de santé** : comptés point par point (`sante-points.json`) ; densités pour
  10 000 habitants.
- **Références France** : calculées par le moteur sur **les mêmes fichiers** (total France ÷
  population France), pour que la comparaison soit cohérente.
- Maisons de santé, établissements, commerces et écoles : sommes par IRIS
  (`iris-equip.json`).

## 4. Modèle de consommation

Consommation de référence en France, en euros par habitant et par an (`CONFIG.nat.perTete`,
ordre de grandeur Open Medic et panoramas de l'officine) :

| Poste | € / hab / an | Modulé par | Élasticité (`CONFIG.elast`) |
|---|---|---|---|
| Médicaments | 640 | part des 65 ans et plus | 1,8 |
| Matériel médical | 60 | part des 65 ans et plus | 2,6 |
| Cosmétique, parapharmacie | 90 | revenu | 0,5 |

Formules (`share65` = part des 65 ans et plus de la maille, France = 20,8 % ; revenu = revenu
de la zone, France = 22 040 €) :

```
médicaments = 640 × (1 + 1,8 × (share65 − 0,208))
matériel    =  60 × (1 + 2,6 × (share65 − 0,208))
cosmétique  =  90 × (revenu / 22 040) ^ 0,5
```

Chaque coefficient est borné entre 0,6 et 1,8. Marché de la zone = consommation par habitant ×
population. **Indice** = consommation par habitant ÷ 790 € × 100.

Exemple : une zone avec 25 % de 65 ans et plus a un coefficient médicaments de
1 + 1,8 × 0,042 = 1,076, soit 689 € par habitant au lieu de 640.

## 5. Quota réglementaire (article L.5125-11 du code de la santé publique)

- Une commune peut avoir une première officine à partir de **2 500 habitants**, puis une de
  plus par tranche entière de **4 500 habitants** (`CONFIG.quota`).
  Exemple : 11 600 habitants → 1 + ⌊(11 600 − 2 500) / 4 500⌋ = 3 officines autorisées.
- Officines existantes : celles de la commune d'après la BPE.
- **Feu** : rouge si la commune a moins de 2 500 habitants (création impossible, seulement
  transfert ou regroupement) ; vert si autorisées > existantes ; orange sinon (quota atteint).
- La fiche donne aussi l'écart au seuil et la population manquante pour le palier suivant.

Le code applique seulement la règle générale. Les seuils particuliers prévus par la loi pour
certains territoires (notamment l'Alsace-Moselle et la Guyane) et les dérogations décidées par
l'agence régionale de santé ne sont pas pris en compte : à vérifier pour chaque projet réel.

## 6. Chiffre d'affaires potentiel

CA = marché de la zone × part de marché. Par défaut, le marché est partagé à égalité entre les
officines **déjà présentes** dans la zone (part = 1 ÷ nombre d'officines ; 100 % s'il n'y en a
aucune). La nouvelle officine n'est donc pas comptée dans le partage. Le moteur accepte une
autre part (`opts.partMarche`), mais la page ne permet pas encore de la saisir.

## 7. Verdict

Chaque critère donne un point positif, négatif ou neutre :

| Critère | Positif | Négatif |
|---|---|---|
| Habitants par officine | ≥ 110 % de la France | ≤ 90 % de la France |
| Revenu médian de la commune | ≥ France + 500 € | ≤ France − 500 € |
| Densité de généralistes | > 115 % de la France | < 85 % de la France |
| Quota | feu vert | feu rouge (orange = neutre) |

Score = positifs − négatifs. **Favorable** si ≥ 2, **limitée** si ≤ −2, **modérée** sinon.

## 8. Cartes de couleur par commune

- **Ouverture** : si le quota permet déjà une officine de plus, délai 0. Sinon, délai = population
  manquante ÷ (population × croissance annuelle 2011-2022, ou 2006-2022 à défaut). Croissance
  nulle ou négative : « jamais » (rouge).
- **Revenu** : potentiel = population × (revenu médian ÷ revenu France) ÷ officines
  existantes (au moins 1). Les communes sont réparties en cinq classes de même effectif.
- Communes de moins de 60 habitants ignorées. Chaque point est la moyenne des centres des IRIS
  de la commune.
