# Installation et hébergement

> **En bref** : servir le dossier `app/` comme un site statique, et ajouter un relais
> `/geoapify-iso/` qui ajoute la clé Geoapify. Protéger l'accès par un mot de passe. Pas de
> base de données, pas de sauvegarde à prévoir en dehors du dépôt lui-même.
> Héberger l'outil demande l'accord écrit du titulaire du dépôt (`LICENCE.md`) ; l'essai sur
> son ordinateur (§ 2) est libre.

## 1. Pré-requis

- Une **clé Geoapify** (offre gratuite : 3 000 demandes par jour ; une analyse en consomme 3,
  une par anneau).
- Pour l'essai local : Python 3.8+. Pour le test du moteur : Node 18+.
- Pour un hébergement : n'importe quel serveur web capable de servir des fichiers et de relayer
  une requête (Caddy, nginx, Apache…). L'exemple fourni utilise Caddy, qui gère aussi le
  certificat HTTPS automatiquement.

## 2. Essai sur son ordinateur

```bash
GEOAPIFY_KEY=votre_cle python3 serveur/dev.py          # http://127.0.0.1:8080/
PORT=9000 GEOAPIFY_KEY=votre_cle python3 serveur/dev.py   # autre port
```

## 3. Hébergement avec Caddy

1. Copier le dépôt sur le serveur, par exemple dans `/srv/analyse-site-officine`.
2. Partir de `serveur/Caddyfile.exemple` : remplacer le nom de domaine et le chemin.
3. Créer le mot de passe : `caddy hash-password`, puis coller le résultat dans `basic_auth`.
4. Donner la clé à Caddy par une variable d'environnement. Avec systemd :
   `sudo systemctl edit caddy`, puis ajouter
   ```
   [Service]
   Environment=GEOAPIFY_KEY=votre_cle
   ```
   et `sudo systemctl restart caddy`.
5. Vérifier : `caddy validate --config /etc/caddy/Caddyfile`, puis ouvrir le site.

L'outil fonctionne aussi dans un sous-dossier (par exemple `https://exemple.fr/analyse/`) : tous
les chemins de la page sont relatifs. Avec Caddy, utiliser `handle_path /analyse/*` pour les
fichiers et `handle_path /analyse/geoapify-iso/*` pour le relais.

## 4. Avec un autre serveur web

Le relais doit transformer
`/geoapify-iso/<n'importe quoi>?<paramètres>` en
`https://api.geoapify.com/v1/isoline?<paramètres>&apiKey=<clé>`
et renvoyer la réponse JSON telle quelle. Les paramètres envoyés par la page sont `lat`, `lon`,
`type=time`, `mode` (`drive` ou `walk`), `range` (en secondes) et, en voiture,
`traffic=approximated`.

## 5. Vérifier que tout marche

- La page s'ouvre et affiche « Chargement des données… (7/7) » puis la carte.
- Un clic en France trace trois zones et ouvre la fiche.
- En cas de message « Zone atteignable indisponible (quota ?) » : vérifier la clé et le quota
  sur le tableau de bord Geoapify, puis le relais (adresse `/geoapify-iso/x?lat=48.85&lon=2.35&type=time&mode=walk&range=300`
  doit renvoyer du JSON).
- En cas d'erreur « type text/html (redirection auth ou mauvais chemin ?) » au chargement : les
  fichiers de `app/data/` ne sont pas servis à l'adresse attendue, ou l'authentification les
  redirige vers une page de connexion.

## 6. Mettre à jour

- Code : modifier, lancer `node tests/test_moteur.mjs`, changer le numéro `?v=` de l'import
  d'`engine.js` si le moteur a changé (voir `architecture.md` § 4), puis copier le dossier
  `app/` sur le serveur.
- Données : voir `donnees.md`.
- Noter chaque version dans `CHANGELOG.md`.
