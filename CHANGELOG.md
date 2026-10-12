# Versions

## 1.0.3 — 2026-10-12

- Conditions d'utilisation ajoutées (`LICENCE.md`) : tous droits réservés, consultation
  uniquement.
- Le test du moteur utilise un point neutre (centre de Vierzon, zone fictive en cercle de 5 km)
  à la place du site réel qui avait servi à valider l'outil ; valeurs attendues mises à jour.

## 1.0.2 — 2026-10-12

- Sécurité : export tableur protégé contre les formules. Une cellule de texte commençant par
  `=`, `+`, `-`, `@`, une tabulation ou un retour chariot est préfixée d'une apostrophe ; les
  colonnes numériques restent inchangées.

## 1.0.1 — 2026-10-12

- Sécurité : les noms d'officines et de commune sont neutralisés (`escapeHtml`) avant d'être
  affichés dans l'infobulle, la fenêtre d'une officine, le tableau des concurrents et l'export
  PDF. Avant, un nom contenant du HTML aurait été interprété par le navigateur.

## 1.0.0 — 2026-10-12

Première version du dépôt autonome. L'outil est identique à celui en service depuis le
2026-08-04, à trois différences près :
- les chemins de la page sont relatifs (`commun/`, `geoapify-iso/`), pour l'héberger n'importe où ;
- la bibliothèque de carte commune est copiée dans `app/commun/` ;
- les scripts de préparation des données prennent les fichiers sources en argument et écrivent
  dans `app/data/` ; le fichier `generalistes.json`, qui n'était plus chargé par la page, est
  retiré (remplacé par `sante-points.json`).
