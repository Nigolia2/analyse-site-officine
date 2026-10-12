#!/usr/bin/env python3
"""Construit app/data/iris.json : position et population de chaque IRIS (France).

Un IRIS est un « quartier » statistique de l'INSEE (environ 2 000 habitants).
Pour chaque IRIS : son point central (centroïde), sa population, ses tranches d'âge et
ses catégories socio-professionnelles (CSP).

Sources (voir docs/donnees.md pour les liens) :
  - INSEE, recensement 2020 à l'IRIS : base-ic-evol-struct-pop-2020.CSV
  - Opendatasoft, georef-france-iris : export CSV (séparateur « ; ») avec iris_code,
    com_code et geo_point_2d (« lat, lon »)

Usage : python3 scripts/build_iris.py POPULATION.CSV CENTROIDES.csv
Contrôle attendu : environ 49 000 IRIS et 67 millions d'habitants.
"""
import argparse
import csv
import json
import os

DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "app", "data")
OUT = os.path.join(DATA, "iris.json")

FIELDS = ["iris", "com", "lat", "lon", "pop", "a0_14", "a65p", "a75p", "a15_29", "a30_44",
          "a45_59", "a60_74", "cs1", "cs2", "cs3", "cs4", "cs5", "cs6", "cs7", "cs8"]


def i(v):
    try:
        return int(float(v))
    except Exception:
        return 0


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("population", help="base-ic-evol-struct-pop-2020.CSV (INSEE)")
    ap.add_argument("centroides", help="export CSV georef-france-iris (Opendatasoft)")
    a = ap.parse_args()

    # 1) population par IRIS
    demo = {}
    with open(a.population, encoding="latin-1") as f:
        for r in csv.DictReader(f, delimiter=";"):
            demo[r["IRIS"]] = [
                i(r["P20_POP"]), i(r["P20_POP0014"]), i(r["P20_POP65P"]), i(r["P20_POP75P"]),
                i(r["P20_POP1529"]), i(r["P20_POP3044"]), i(r["P20_POP4559"]), i(r["P20_POP6074"]),
                i(r["C20_POP15P_CS1"]), i(r["C20_POP15P_CS2"]), i(r["C20_POP15P_CS3"]), i(r["C20_POP15P_CS4"]),
                i(r["C20_POP15P_CS5"]), i(r["C20_POP15P_CS6"]), i(r["C20_POP15P_CS7"]), i(r["C20_POP15P_CS8"]),
            ]
    print(f"IRIS avec population : {len(demo)}")

    # 2) jointure avec les centroïdes
    rows, sans_pop = [], 0
    with open(a.centroides, encoding="utf-8-sig") as f:
        for r in csv.DictReader(f, delimiter=";"):
            code = r["iris_code"]
            d = demo.get(code)
            if not d:
                sans_pop += 1
                continue
            gp = (r["geo_point_2d"] or "").split(",")
            if len(gp) != 2:
                continue
            lat, lon = round(float(gp[0]), 5), round(float(gp[1]), 5)
            rows.append([code, r["com_code"], lat, lon] + d)

    json.dump({"fields": FIELDS, "rows": rows}, open(OUT, "w"), separators=(",", ":"))
    print(f"iris.json : {len(rows)} IRIS, {os.path.getsize(OUT) / 1e6:.2f} Mo "
          f"(centroïdes sans population ignorés : {sans_pop})")
    print(f"Population totale (contrôle, ~67 M) : {sum(r[4] for r in rows):,}")


if __name__ == "__main__":
    main()
