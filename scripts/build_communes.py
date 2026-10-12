#!/usr/bin/env python3
"""Construit app/data/communes.json : revenus et population de chaque commune.

Revenus : niveau de vie disponible (médiane, 1er et 9e déciles, part des revenus d'activité,
des pensions et des prestations sociales). Population : somme des IRIS de la commune.
Sert à la section « revenus » de la fiche et au calcul du quota réglementaire.

Source : INSEE Filosofi 2020 à la commune, FILO2020_DISP_COM.csv (voir docs/donnees.md).
Pré-requis : app/data/iris.json déjà construit (scripts/build_iris.py).

Usage : python3 scripts/build_communes.py FILO2020_DISP_COM.csv
Les petites communes ont des revenus masqués (secret statistique, valeur « s ») : c'est normal,
elles gardent leur population et la fiche affiche « revenu inconnu ».
"""
import argparse
import csv
import json
import os

DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "app", "data")
IRIS = os.path.join(DATA, "iris.json")
OUT = os.path.join(DATA, "communes.json")

FIELDS = ["com", "pop", "med", "d1", "d9", "part_activite", "part_pensions", "part_prestations"]


def num(v):
    v = (v or "").strip()
    if v in ("", "s", "n", "nd", "N/A"):
        return None
    try:
        return round(float(v))
    except Exception:
        return None


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("filosofi", help="FILO2020_DISP_COM.csv (INSEE)")
    a = ap.parse_args()

    # 1) population de la commune = somme de ses IRIS
    irisd = json.load(open(IRIS))
    f = irisd["fields"]
    ipop, icom = f.index("pop"), f.index("com")
    compop = {}
    for r in irisd["rows"]:
        compop[r[icom]] = compop.get(r[icom], 0) + r[ipop]

    # 2) revenus Filosofi (Q220 = médiane, D120 / D920 = 1er / 9e décile)
    rows = []
    with open(a.filosofi, encoding="latin-1") as fh:
        for r in csv.DictReader(fh, delimiter=";"):
            c = r["CODGEO"]
            rows.append([
                c, compop.get(c, 0),
                num(r.get("Q220")), num(r.get("D120")), num(r.get("D920")),
                num(r.get("PACT20")), num(r.get("PPEN20")), num(r.get("PPSOC20")),
            ])

    json.dump({"fields": FIELDS, "rows": rows}, open(OUT, "w"), separators=(",", ":"))
    print(f"communes.json : {len(rows)} communes, {os.path.getsize(OUT) / 1e6:.2f} Mo")
    dans_filo = {r[0] for r in rows}
    print(f"communes ayant une population mais absentes de Filosofi : "
          f"{sum(1 for c in compop if c not in dans_filo)}")


if __name__ == "__main__":
    main()
