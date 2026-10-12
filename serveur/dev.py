#!/usr/bin/env python3
"""Petit serveur pour essayer l'outil sur son ordinateur (Python 3.8+, rien à installer).

Il sert le dossier app/ et relaie les demandes de zone de trajet vers Geoapify en y ajoutant
la clé, pour que celle-ci n'apparaisse jamais dans le navigateur.

Usage :
    GEOAPIFY_KEY=votre_cle python3 serveur/dev.py
puis ouvrir http://127.0.0.1:8080/

Pour un vrai hébergement, utiliser plutôt un serveur web (voir serveur/Caddyfile.exemple et
docs/installation.md). Ce serveur écoute uniquement sur l'ordinateur lui-même (127.0.0.1).
"""
import http.server
import os
import sys
import urllib.error
import urllib.request
from functools import partial
from urllib.parse import urlsplit

APP = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "app")
PORT = int(os.environ.get("PORT", "8080"))
CLE = os.environ.get("GEOAPIFY_KEY", "")
PREFIXE = "/geoapify-iso/"


class Gestionnaire(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith(PREFIXE):
            return self.relayer()
        return super().do_GET()

    def relayer(self):
        if not CLE:
            self.send_error(503, "GEOAPIFY_KEY absente : relancer avec GEOAPIFY_KEY=...")
            return
        requete = urlsplit(self.path).query
        url = f"https://api.geoapify.com/v1/isoline?{requete}&apiKey={CLE}"
        try:
            with urllib.request.urlopen(url, timeout=60) as r:
                corps, code = r.read(), r.status
        except urllib.error.HTTPError as e:
            corps, code = e.read(), e.code
        except OSError as e:
            self.send_error(502, f"Geoapify injoignable : {e}")
            return
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(corps)))
        self.end_headers()
        self.wfile.write(corps)

    def log_message(self, fmt, *args):
        # ne jamais écrire la clé dans le terminal
        sys.stderr.write(("%s - " + fmt + "\n") % (self.address_string(), *args))


if __name__ == "__main__":
    if not CLE:
        print("Attention : GEOAPIFY_KEY absente, la carte s'affichera mais aucune analyse ne marchera.")
    serveur = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), partial(Gestionnaire, directory=APP))
    print(f"Outil disponible sur http://127.0.0.1:{PORT}/  (Ctrl-C pour arrêter)")
    serveur.serve_forever()
