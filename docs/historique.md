# Historique, choix, limites et pistes

> **En bref** : outil construit en juillet-août 2026 en trois étapes (données, moteur,
> interface), puis complété. Les choix structurants : tout calculer dans le navigateur, uniquement
> avec des données publiques gratuites. Les limites et les pistes sont listées en fin de page.

## 1. Étapes

| Date | Étape | Contenu |
|---|---|---|
| 2026-07-30 | M1, socle de données | `iris.json`, `communes.json`, `iris-equip.json` ; validation sur le site de référence (population −3,9 % par rapport à une étude professionnelle, équipements identiques) |
| 2026-07-30 | M2, moteur | `engine.js` : maille, démographie, revenus, armature, concurrence, consommation, quota, chiffre d'affaires ; test sous Node |
| 2026-07-30 | M3, interface | carte, réglages, fiche, exports PDF / CSV / GeoJSON, lien de partage ; mise en ligne |
| 2026-07-30 / 31 | Compléments | évolution de la population, structure du foyer, officines par nom, généralistes géolocalisés, comptage des professionnels point par point, cartes de couleur par commune |
| 2026-08-04 | Correctifs | couche « toutes les officines » dès le zoom 12 ; trafic approximatif en voiture |
| 2026-10-12 | Sécurité (1.0.1) | les noms d'officines (OpenStreetMap) et de commune (Base adresse nationale) sont neutralisés avant affichage (`escapeHtml`) : un nom piégé ne peut plus exécuter de script |
| 2026-10-12 | Sécurité (1.0.2) | export tableur : le texte commençant par `=`, `+`, `-`, `@`, tabulation ou retour chariot est préfixé d'une apostrophe, pour qu'Excel ne l'exécute pas comme une formule ; les nombres ne changent pas |
| 2026-10-12 | Dépôt autonome | extraction dans ce dépôt, documentation, scripts rendus réutilisables, bibliothèque commune copiée dans `app/commun/` |

## 2. Choix et raisons

- **Calcul dans le navigateur** : pas de serveur applicatif à maintenir, rien n'est stocké ni
  transmis à part les coordonnées du point. Contrepartie : environ 3 Mo compressés à télécharger
  au démarrage.
- **Données ouvertes uniquement** : coût nul et réutilisation libre. Contrepartie : pas de noms
  de médecins, millésimes différents selon les sources.
- **Maille par IRIS avec lissage de 450 m** : précision suffisante (validée sur le site de
  référence) avec un calcul instantané. Un découpage plus fin (carreaux de 200 m de l'INSEE)
  serait plus précis mais beaucoup plus lourd.
- **Trafic approximatif en voiture** (2026-08-04) : sans `traffic=approximated`, Geoapify
  calcule à vitesse maximale autorisée. Sur un point testé, la zone de 10 minutes était bien
  plus grande qu'un vrai trajet Google Maps ; avec le paramètre, elle devient cohérente.
- **Comptage point par point des professionnels** : le comptage par IRIS sous-estimait les
  professionnels présents dans la zone (IRIS coupés par la limite).
- **Modèle de consommation simple et réglable** : deux signaux seulement sont disponibles à la
  maille (âge et revenu) ; les coefficients sont rassemblés dans `CONFIG` pour pouvoir être
  recalés.
- **Export PDF en image** : `window.print()` ne fonctionne pas sur Safari iPhone.

## 3. Limites connues

1. **Zones Geoapify parfois anormales** : sur certains points, la zone est très petite (le
   point se cale sur une route mal reliée). Déplacer légèrement le marqueur ou changer le temps.
2. **Généralistes sans nom** (voir `donnees.md`).
3. **Montants indicatifs** : le marché et le chiffre d'affaires viennent d'un modèle simplifié,
   non calé sur des chiffres d'affaires réels.
4. **Quota simplifié** : règle générale seulement (voir `calculs.md` § 5).
5. **Deux sources pour les officines** (OpenStreetMap et BPE), qui peuvent différer.
6. **Fichier unique de 1 000 lignes** : `index.html` mélange style, structure et script ; à
   découper si l'outil grossit.

## 4. Pistes

- Saisie de la part de marché dans la page (le moteur l'accepte déjà : `opts.partMarche`).
- Noms des généralistes (source payante, ou rapprochement avec l'annuaire santé).
- Évolution des logements (disponible dans les séries historiques déjà utilisées).
- Bibliothèque d'analyses enregistrées et partagées (nécessiterait un petit serveur).
- Couleurs : un passage de la couleur principale sarcelle (`#0F766E`) au bleu `#2f6fed` avait été
  décidé pour harmoniser avec les autres cartes du site d'origine ; il n'a pas été fait. Libre
  au repreneur de le reprendre ou non.
