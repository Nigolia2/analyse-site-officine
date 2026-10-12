#!/usr/bin/env python3
"""Construit app/data/iris-equip.json : nombre d'équipements de chaque catégorie par IRIS.

Catégories : généralistes, spécialistes, dentistes, kinés, infirmiers, sages-femmes, pharmacies,
laboratoires, maisons de santé, établissements de santé, autres paramédicaux, commerces
alimentaires, commerces (total), écoles.
Sert aux sections « armature médicale » (maisons de santé, établissements) et « armature
commerciale » de la fiche. Les professionnels de santé eux-mêmes sont comptés plus finement
par sante-points.json (scripts/build_sante_points.py).

Source : INSEE, Base permanente des équipements 2025 géolocalisée, BPE25.csv (1,5 Go,
séparateur « ; »). Codes des équipements (TYPEQU) : scripts/typequ.csv.

Usage : python3 scripts/build_equip.py BPE25.csv
Contrôle attendu : environ 20 000 pharmacies en France.
"""
import argparse
import csv
import json
import os

DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "app", "data")
OUT = os.path.join(DATA, "iris-equip.json")

SPEC = {"D251", "D252", "D253", "D254", "D255", "D256", "D257", "D258", "D259", "D260",
        "D261", "D262", "D266", "D267", "D268", "D269", "D270", "D271", "D272", "D273",
        "D274", "D275", "D276"}                      # médecins spécialistes
ETAB = {"D101", "D102", "D103", "D104", "D105", "D106", "D107", "D108", "D109", "D110",
        "D111", "D112", "D114", "D115"}              # établissements de santé
PARAM = {"D245", "D246", "D247", "D248", "D249", "D250", "D280", "D282", "D283"}  # autres paramédicaux
COM_ALIM = {"B104", "B105", "B201", "B202", "B204", "B205", "B206", "B207", "B208", "B209"}
ECOLE = {"C107", "C108", "C109"}

# ordre des compteurs dans chaque ligne
CATS = ["gen", "spec", "dent", "kine", "inf", "sage", "pharma", "labo", "msp", "etab",
        "param", "com_alim", "com_tot", "ecole"]
IDX = {c: k for k, c in enumerate(CATS)}


def cat(t):
    if t == "D265": return "gen"
    if t == "D277": return "dent"
    if t == "D279": return "kine"
    if t == "D281": return "inf"
    if t == "D278": return "sage"
    if t == "D307": return "pharma"
    if t == "D302": return "labo"
    if t == "D113": return "msp"
    if t in SPEC: return "spec"
    if t in ETAB: return "etab"
    if t in PARAM: return "param"
    if t in ECOLE: return "ecole"
    return None


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("bpe", help="BPE25.csv (INSEE)")
    a = ap.parse_args()

    counts = {}  # iris -> compteurs

    def bump(iris, c):
        row = counts.get(iris)
        if row is None:
            row = counts[iris] = [0] * len(CATS)
        row[IDX[c]] += 1

    total = 0
    with open(a.bpe, encoding="utf-8", newline="") as f:
        rd = csv.reader(f, delimiter=";")
        header = next(rd)
        it, ic = header.index("TYPEQU"), header.index("DCIRIS")
        for r in rd:
            total += 1
            if len(r) <= max(it, ic):
                continue
            t, iris = r[it], r[ic]
            if not iris or iris == "ZZZZZZZZZ":
                continue
            c = cat(t)
            if c:
                bump(iris, c)
            if t and t[0] == "B":                      # tous les commerces
                bump(iris, "com_tot")
                if t in COM_ALIM:
                    bump(iris, "com_alim")

    # seuls les IRIS ayant au moins un équipement suivi sont écrits
    rows = [[iris] + v for iris, v in counts.items() if any(v)]
    json.dump({"fields": ["iris"] + CATS, "rows": rows}, open(OUT, "w"), separators=(",", ":"))
    print(f"lignes BPE lues : {total:,}")
    print(f"iris-equip.json : {len(rows)} IRIS équipés, {os.path.getsize(OUT) / 1e6:.2f} Mo")
    tot = {c: sum(v[IDX[c]] for v in counts.values()) for c in CATS}
    print("Totaux France (contrôle) :", {k: tot[k] for k in ["gen", "spec", "dent", "kine", "inf", "pharma", "com_tot", "ecole"]})


if __name__ == "__main__":
    main()
