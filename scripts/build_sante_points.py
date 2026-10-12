#!/usr/bin/env python3
"""Construit app/data/sante-points.json : position de chaque professionnel de santé.

Catégories : gen (généraliste, D265), spec (spécialistes), dent (dentiste, D277),
kine (kinésithérapeute, D279), inf (infirmier, D281), sage (sage-femme, D278).
Permet de compter les professionnels situés DANS la zone de trajet (plus juste qu'un
comptage par IRIS) et d'afficher les généralistes sur la carte. Aucun nom : la BPE n'en
fournit pas.

Source : INSEE BPE25.csv (même fichier que scripts/build_equip.py).

Usage : python3 scripts/build_sante_points.py BPE25.csv
"""
import argparse
import csv
import json
import os

DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "app", "data")
OUT = os.path.join(DATA, "sante-points.json")

SPEC = {"D251", "D252", "D253", "D254", "D255", "D256", "D257", "D258", "D259", "D260",
        "D261", "D262", "D266", "D267", "D268", "D269", "D270", "D271", "D272", "D273",
        "D274", "D275", "D276"}


def cat(t):
    if t == "D265": return "gen"
    if t == "D277": return "dent"
    if t == "D279": return "kine"
    if t == "D281": return "inf"
    if t == "D278": return "sage"
    if t in SPEC: return "spec"
    return None


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("bpe", help="BPE25.csv (INSEE)")
    a = ap.parse_args()

    rows = []
    with open(a.bpe, encoding="utf-8", newline="") as f:
        rd = csv.reader(f, delimiter=";")
        h = next(rd)
        it, ilon, ilat = h.index("TYPEQU"), h.index("LONGITUDE"), h.index("LATITUDE")
        for r in rd:
            if len(r) <= max(it, ilon, ilat):
                continue
            c = cat(r[it])
            if not c:
                continue
            try:
                lon, lat = round(float(r[ilon]), 5), round(float(r[ilat]), 5)
            except ValueError:
                continue
            rows.append([lon, lat, c])

    json.dump({"fields": ["lon", "lat", "cat"], "rows": rows}, open(OUT, "w"), separators=(",", ":"))
    print(f"sante-points.json : {len(rows)} points, {os.path.getsize(OUT) / 1e6:.2f} Mo")


if __name__ == "__main__":
    main()
