#!/usr/bin/env python3
"""Construit deux fichiers à partir des séries historiques communales de l'INSEE :

app/data/communes-evol.json : population de chaque commune en 2006, 2011, 2016 et 2022.
  Sert à la courbe « évolution de la population » (zone comparée à la France) et à la
  carte de couleur « délai avant une nouvelle officine ».

app/data/communes-demo.json : personnes par ménage, naissances et décès 2016-2022.
  Sert à la structure du foyer et aux soldes naturel et migratoire.
  - personnes par ménage = P22_PMEN / résidences principales
    (résidences principales = P22_LOG - P22_RSECOCC - P22_LOGVAC)
  - naissances et décès cumulés sur 2016-2022 : NAIS1621, DECE1621 (6 ans)

Source : INSEE, séries historiques du recensement 2022, base-cc-serie-historique-2022.CSV
(voir docs/donnees.md).

Usage : python3 scripts/build_series.py base-cc-serie-historique-2022.CSV
Contrôle attendu : environ 2,1 personnes par ménage en France.
"""
import argparse
import csv
import json
import os

DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "app", "data")
OUT_EVOL = os.path.join(DATA, "communes-evol.json")
OUT_DEMO = os.path.join(DATA, "communes-demo.json")


def nombre(v):
    try:
        return float((v or "").replace(",", "."))
    except ValueError:
        return None


def entier(v):
    x = nombre(v)
    return None if x is None else int(round(x))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("series", help="base-cc-serie-historique-2022.CSV (INSEE)")
    a = ap.parse_args()

    evol, demo = [], []
    tot_pmen = tot_men = 0.0
    with open(a.series, encoding="utf-8-sig", newline="") as fh:
        for r in csv.DictReader(fh, delimiter=";"):
            com = r["CODGEO"]

            # évolution : P06/P11/P16/P22
            p = [entier(r.get(k)) for k in ("P06_POP", "P11_POP", "P16_POP", "P22_POP")]
            if p[3] is not None:
                evol.append([com] + p)

            # ménages et mouvement naturel
            pmen = nombre(r.get("P22_PMEN"))
            log, rsec, vac = nombre(r.get("P22_LOG")), nombre(r.get("P22_RSECOCC")), nombre(r.get("P22_LOGVAC"))
            rp = log - rsec - vac if None not in (log, rsec, vac) else None
            persmen = round(pmen / rp, 2) if (pmen and rp and rp > 0) else None
            nais, dece = nombre(r.get("NAIS1621")), nombre(r.get("DECE1621"))
            demo.append([com, persmen, round(nais) if nais is not None else None,
                         round(dece) if dece is not None else None])
            if pmen and rp and rp > 0:
                tot_pmen += pmen
                tot_men += rp

    json.dump({"fields": ["com", "p06", "p11", "p16", "p22"], "rows": evol}, open(OUT_EVOL, "w"), separators=(",", ":"))
    json.dump({"fields": ["com", "persmen", "nais", "dece"], "rows": demo}, open(OUT_DEMO, "w"), separators=(",", ":"))
    print(f"communes-evol.json : {len(evol)} communes, {os.path.getsize(OUT_EVOL) / 1e6:.2f} Mo")
    print(f"communes-demo.json : {len(demo)} communes, {os.path.getsize(OUT_DEMO) / 1e6:.2f} Mo")
    tot = [sum(r[k] for r in evol if r[k] is not None) for k in (1, 2, 3, 4)]
    print("Population France 2006 / 2011 / 2016 / 2022 :", " / ".join(f"{v:,}" for v in tot))
    print(f"Personnes par ménage France (contrôle, ~2,1) : {tot_pmen / tot_men:.3f}")


if __name__ == "__main__":
    main()
