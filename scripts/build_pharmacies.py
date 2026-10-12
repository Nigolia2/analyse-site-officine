#!/usr/bin/env python3
"""Construit app/data/pharmacies.json : position, nom et ville de chaque officine.

Sert à la liste nominative des concurrents dans la zone et à la couche « toutes les
officines » visible dès le zoom 12.

Source : couche « pharmacies_point » de magOSM (Magellium), extraction quotidienne
d'OpenStreetMap, publiée sur data.gouv.fr. Elle est téléchargée directement (aucun fichier
à fournir). Le fichier livré dans le dépôt (juillet 2026) venait de cette même couche.

Usage : python3 scripts/build_pharmacies.py
Contrôle attendu : environ 19 000 à 21 000 officines.
La ville est vide quand la fiche OpenStreetMap ne la renseigne pas : c'est normal.
"""
import json
import os
import urllib.request

DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "app", "data")
OUT = os.path.join(DATA, "pharmacies.json")
URL = ("https://magosm.magellium.com/geoserver/wfs/?request=GetFeature&version=2.0.0"
       "&count=500000&outputFormat=application/json&typeName=magosm:pharmacies_point"
       "&srsName=EPSG:4326")


def main():
    with urllib.request.urlopen(URL, timeout=300) as r:
        fc = json.load(r)
    rows = []
    for ft in fc["features"]:
        g, p = ft.get("geometry") or {}, ft.get("properties") or {}
        if g.get("type") != "Point":
            continue
        lon, lat = g["coordinates"][:2]
        rows.append([round(lon, 5), round(lat, 5),
                     (p.get("name") or "Pharmacie").strip(), (p.get("addr-city") or "").strip()])

    json.dump({"fields": ["lon", "lat", "name", "city"], "rows": rows}, open(OUT, "w"),
              separators=(",", ":"), ensure_ascii=False)
    print(f"pharmacies.json : {len(rows)} officines, {os.path.getsize(OUT) / 1e6:.2f} Mo")


if __name__ == "__main__":
    main()
