// Géomarketing officinal — moteur d'analyse M2 (client-side, pur JS, sans DOM).
// Entrées sérialisables -> recalcul déterministe. Utilisable navigateur (ES module) ET Node.
// Pipeline : isochrone Geoapify -> IRIS centroïde-in-zone (lissage) -> agrégation
//            démographie + revenus + armature + concurrence + modèle conso + quota + CA.
// Explications : docs/architecture.md (structure) et docs/calculs.md (règles de calcul).

// ---------------------------------------------------------------------------
// CONFIG — toutes les hypothèses du modèle, calibrables et documentées.
// ---------------------------------------------------------------------------
export const CONFIG = {
  smoothM: 450,                 // rayon de lissage du test centroïde-in-zone (m)

  // Références nationales (France = 100). Consommation officinale €/hab/an.
  // Sources d'ordre de grandeur : Open Medic (médicaments), panorama officine.
  nat: {
    share65p: 0.208,            // part 65+ France (RP)
    income: 22040,             // revenu médian niveau de vie France (Filosofi 2020)
    perTete: { medic: 640, materiel: 60, cosmeto: 90 }, // €/hab/an (total 790)
  },

  // Élasticités du modèle de consommation (calibrables).
  elast: {
    medicAge: 1.8,              // médicaments ~ vieillissement : +10 pt de 65+ -> +18 %
    materielAge: 2.6,          // matériel médical / MAD ~ vieillissement (plus fort)
    cosmetoIncome: 0.5,        // cosméto/parapharma ~ revenu (élasticité)
    clampLo: 0.6, clampHi: 1.8, // bornes de sécurité des modulateurs
  },

  // Quota réglementaire (Art. L.5125-11 CSP) : 1re licence à 2500 hab,
  // +1 officine par tranche entière de 4500 hab supplémentaires.
  quota: { seuil1: 2500, tranche: 4500 },

  franceHabParOfficine: 3300,   // repère densité (médiane nationale ~3300 hab/officine)
};

// ---------------------------------------------------------------------------
// Géométrie : contours d'isochrone, ray-casting, test avec lissage.
// ---------------------------------------------------------------------------

// N'extrait que les anneaux EXTÉRIEURS (ignore les trous) d'un (Multi)Polygon GeoJSON.
export function ringsFromIso(geojson) {
  const rings = [];
  const feats = geojson.features || [geojson];
  for (const ft of feats) {
    const g = ft.geometry || ft;
    const polys = g.type === "MultiPolygon" ? g.coordinates : [g.coordinates];
    for (const poly of polys) rings.push(poly[0]); // anneau 0 = extérieur
  }
  return rings;
}

// Ray-casting standard. ring = [[lon,lat],...]
export function pointInRing(lon, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    if (((yi > lat) !== (yj > lat)) &&
        (lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

// Lissage : le centroïde OU un des 8 points d'une couronne de `smoothM` mètres
// tombe dans un contour -> IRIS retenu. Robuste aux isochrones voiture étoilées.
export function inZone(lon, lat, rings, smoothM = CONFIG.smoothM) {
  const dLat = smoothM / 111320;
  const dLon = smoothM / (111320 * Math.cos((lat * Math.PI) / 180));
  const pts = [[lon, lat]];
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    pts.push([lon + dLon * Math.cos(a), lat + dLat * Math.sin(a)]);
  }
  for (const [x, y] of pts) for (const r of rings) if (pointInRing(x, y, r)) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Indexation des 3 fichiers socle (une fois au chargement).
// ---------------------------------------------------------------------------
export function indexData({ iris, communes, equip, pharmacies, evol, sociodemo, santePoints }) {
  const fi = {}; iris.fields.forEach((n, k) => (fi[n] = k));
  const fc = {}; communes.fields.forEach((n, k) => (fc[n] = k));
  const fe = {}; equip.fields.forEach((n, k) => (fe[n] = k));
  const comBy = new Map(communes.rows.map((r) => [r[fc.com], r]));
  const eqBy = new Map(equip.rows.map((r) => [r[fe.iris], r]));
  // Références nationales (densités /10k et /100k) calculées depuis nos propres agrégats
  // → « vs France » auto-cohérent avec les mêmes sources.
  // totaux + index commune→pop et commune→officines (depuis les IRIS = fait foi pour NOS données ;
  // gère le décalage code agrégé/arrondissement Paris-Lyon-Marseille via la résolution dans analyze)
  let totPop = 0; const comPopAll = new Map(), comPharmaAll = new Map();
  for (const r of iris.rows) {
    totPop += r[fi.pop];
    const c = r[fi.com];
    comPopAll.set(c, (comPopAll.get(c) || 0) + r[fi.pop]);
    const e = eqBy.get(r[fi.iris]);
    if (e && e[fe.pharma]) comPharmaAll.set(c, (comPharmaAll.get(c) || 0) + e[fe.pharma]);
  }
  const totEq = {}; for (const c of equip.fields) if (c !== 'iris') totEq[c] = 0;
  for (const r of equip.rows) for (const c in totEq) totEq[c] += r[fe[c]];
  const per10k = k => totEq[k] / totPop * 10000, per100k = k => totEq[k] / totPop * 100000;
  const nat = {
    pop: totPop,
    gen10k: per10k('gen'), spec10k: per10k('spec'), inf10k: per10k('inf'),
    kine10k: per10k('kine'), dent10k: per10k('dent'), sage10k: per10k('sage'),
    pharma100k: per100k('pharma'), habParOfficine: totEq.pharma ? totPop / totEq.pharma : 3300,
  };
  const fp = pharmacies ? (() => { const o = {}; pharmacies.fields.forEach((n, k) => o[n] = k); return o; })() : null;
  // évolution population : [com, p06, p11, p16, p22] + totaux France par année (pour l'indice)
  let evolBy = null, natEvol = null;
  if (evol) {
    evolBy = new Map(evol.rows.map(r => [r[0], r]));
    natEvol = [0, 0, 0, 0];
    for (const r of evol.rows) for (let k = 0; k < 4; k++) if (r[k + 1] != null) natEvol[k] += r[k + 1];
  }
  // socio-démo : [com, persmen, nais(2016-22), dece(2016-22)]
  const demoBy = sociodemo ? new Map(sociodemo.rows.map(r => [r[0], r])) : null;
  const natPersMen = 2.13;   // France 2022 (INSEE)
  // points santé (BPE géolocalisés) → comptage « points dans l'isochrone » (plus juste que par IRIS)
  // + densités nationales recalculées sur la MÊME source, pour cohérence maille/France.
  const fsp = santePoints ? (() => { const o = {}; santePoints.fields.forEach((n, k) => o[n] = k); return o; })() : null;
  if (santePoints) {
    const medTot = { gen: 0, spec: 0, dent: 0, kine: 0, inf: 0, sage: 0 };
    for (const p of santePoints.rows) { const c = p[fsp.cat]; if (medTot[c] != null) medTot[c]++; }
    nat.gen10k = medTot.gen / totPop * 10000; nat.spec10k = medTot.spec / totPop * 10000;
    nat.dent10k = medTot.dent / totPop * 10000; nat.kine10k = medTot.kine / totPop * 10000;
    nat.inf10k = medTot.inf / totPop * 10000; nat.sage10k = medTot.sage / totPop * 10000;
  }
  return { iris, communes, equip, fi, fc, fe, comBy, eqBy, nat, comPopAll, comPharmaAll,
           pharmacies: pharmacies || null, fp,
           evolBy, natEvol, demoBy, natPersMen, santePoints: santePoints || null, fsp };
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Population captée dans une isochrone (pour les anneaux de chalandise). Léger.
export function zonePopulation(idx, isoGeoJSON, smoothM = CONFIG.smoothM) {
  const { iris, fi } = idx;
  const rings = ringsFromIso(isoGeoJSON);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const r of rings) for (const p of r) {
    if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0];
    if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1];
  }
  const M = 0.01; let pop = 0;
  for (const r of iris.rows) {
    const lon = r[fi.lon], lat = r[fi.lat];
    if (lon > x0 - M && lon < x1 + M && lat > y0 - M && lat < y1 + M && inZone(lon, lat, rings, smoothM))
      pop += r[fi.pop];
  }
  return pop;
}

// ---------------------------------------------------------------------------
// Analyse complète d'un site.
//   idx      : sortie de indexData()
//   isoGeoJSON : réponse Geoapify isoline
//   center   : { lat, lon } point d'implantation
//   opts     : { smoothM?, partMarche? }
// ---------------------------------------------------------------------------
export function analyze(idx, isoGeoJSON, center, opts = {}) {
  const { iris, fi, fc, fe, comBy, eqBy } = idx;
  const rings = ringsFromIso(isoGeoJSON);
  const smoothM = opts.smoothM ?? CONFIG.smoothM;

  // pré-filtre bbox (perf) puis test précis
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const r of rings) for (const p of r) {
    if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0];
    if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1];
  }
  const M = 0.01;
  const maille = iris.rows.filter((r) => {
    const lon = r[fi.lon], lat = r[fi.lat];
    return lon > x0 - M && lon < x1 + M && lat > y0 - M && lat < y1 + M &&
           inZone(lon, lat, rings, smoothM);
  });

  // --- démographie ---
  let pop = 0, a014 = 0, a65 = 0, a75 = 0, a1529 = 0, a3044 = 0, a4559 = 0, a6074 = 0;
  const csp = [0,0,0,0,0,0,0,0];
  const comPop = new Map();
  for (const r of maille) {
    pop += r[fi.pop]; a014 += r[fi.a0_14]; a65 += r[fi.a65p]; a75 += r[fi.a75p];
    a1529 += r[fi.a15_29] || 0; a3044 += r[fi.a30_44] || 0; a4559 += r[fi.a45_59] || 0; a6074 += r[fi.a60_74] || 0;
    for (let c = 1; c <= 8; c++) csp[c-1] += r[fi["cs"+c]];
    const com = r[fi.com]; comPop.set(com, (comPop.get(com) || 0) + r[fi.pop]);
  }

  // --- commune d'implantation ---
  // opts.implCom = reverse-geocoding du marqueur (code INSEE). On le résout vers un code
  // présent dans NOS données : si le code a 0 hab chez nous (code agrégé Paris/Lyon/Marseille,
  // ou absent), on bascule sur la commune de l'IRIS le plus proche = l'arrondissement réel.
  let nearCom = null, nearestIrisPop = 0, bestD = Infinity;
  for (const r of iris.rows) {
    const d = (r[fi.lat] - center.lat) ** 2 + (r[fi.lon] - center.lon) ** 2;
    if (d < bestD) { bestD = d; nearCom = r[fi.com]; nearestIrisPop = r[fi.pop]; }
  }
  let implCom = opts.implCom || nearCom;
  if (!(idx.comPopAll.get(implCom) > 0)) implCom = nearCom;

  // --- revenus : médiane commune d'implantation + médiane pondérée de la maille ---
  const comRow = implCom ? comBy.get(implCom) : null;
  const communeMedian = comRow ? comRow[fc.med] : null;
  let num = 0, den = 0;
  for (const [com, p] of comPop) {
    const cr = comBy.get(com);
    if (cr && cr[fc.med]) { num += cr[fc.med] * p; den += p; }
  }
  const mailleMedian = den ? Math.round(num / den) : null;

  // --- armature (équipements) sommés sur les IRIS de la maille ---
  const cats = idx.equip.fields.filter((c) => c !== "iris");
  const arm = Object.fromEntries(cats.map((c) => [c, 0]));
  for (const r of maille) {
    const e = eqBy.get(r[fi.iris]);
    if (e) for (const c of cats) arm[c] += e[fe[c]];
  }

  // --- concurrence (liste nominative FINESS si fournie, sinon comptes BPE) ---
  const haversineKm = (a, b) => {
    const R = 6371, dLat = (b.lat - a.lat) * Math.PI / 180, dLon = (b.lon - a.lon) * Math.PI / 180;
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  };
  let competitors = null, pharma = arm.pharma;
  if (idx.pharmacies) {
    const fp = idx.fp, lst = [];
    for (const p of idx.pharmacies.rows) {
      const lon = p[fp.lon], lat = p[fp.lat];
      if (lon > x0 - M && lon < x1 + M && lat > y0 - M && lat < y1 + M && rings.some(r => pointInRing(lon, lat, r)))
        lst.push({ name: p[fp.name], city: p[fp.city], lat, lon, dist: +haversineKm(center, { lat, lon }).toFixed(1) });
    }
    lst.sort((a, b) => a.dist - b.dist);
    competitors = lst; pharma = lst.length;
  }
  const habParOfficine = pharma ? Math.round(pop / pharma) : null;
  const densite100k = pop ? +(pharma / pop * 100000).toFixed(1) : 0;
  // densités médicales /10k hab (maille) pour comparaison vs France
  // pros de santé géolocalisés (points BPE) → comptage « points dans l'isochrone » : écrase les
  // comptes « par IRIS » (qui sous-comptaient), avant le calcul des densités.
  let prescripteurs = null;
  if (idx.santePoints) {
    const fsp = idx.fsp, med = { gen: 0, spec: 0, dent: 0, kine: 0, inf: 0, sage: 0 }, genList = [];
    for (const p of idx.santePoints.rows) {
      const lon = p[fsp.lon], lat = p[fsp.lat];
      if (lon > x0 - M && lon < x1 + M && lat > y0 - M && lat < y1 + M && rings.some(r => pointInRing(lon, lat, r))) {
        const cat = p[fsp.cat]; if (med[cat] != null) med[cat]++;
        if (cat === 'gen') genList.push({ lat, lon, dist: +haversineKm(center, { lat, lon }).toFixed(1) });
      }
    }
    genList.sort((a, b) => a.dist - b.dist);
    arm.gen = med.gen; arm.spec = med.spec; arm.dent = med.dent; arm.kine = med.kine; arm.inf = med.inf; arm.sage = med.sage;
    prescripteurs = { count: genList.length, liste: genList };
  }
  const per10k = k => pop ? +(arm[k] / pop * 10000).toFixed(1) : 0;
  const dens = { gen: per10k('gen'), inf: per10k('inf'), kine: per10k('kine'), dent: per10k('dent'), sage: per10k('sage') };

  // --- modèle de consommation (ventilé, indice France=100) ---
  const share65 = pop ? a65 / pop : CONFIG.nat.share65p;
  const incForModel = mailleMedian || CONFIG.nat.income;
  const E = CONFIG.elast, N = CONFIG.nat;
  const modMedic = clamp(1 + E.medicAge * (share65 - N.share65p), E.clampLo, E.clampHi);
  const modMat   = clamp(1 + E.materielAge * (share65 - N.share65p), E.clampLo, E.clampHi);
  const modCos   = clamp(Math.pow(incForModel / N.income, E.cosmetoIncome), E.clampLo, E.clampHi);
  const tete = {
    medic: N.perTete.medic * modMedic,
    materiel: N.perTete.materiel * modMat,
    cosmeto: N.perTete.cosmeto * modCos,
  };
  tete.total = tete.medic + tete.materiel + tete.cosmeto;
  const natTotal = N.perTete.medic + N.perTete.materiel + N.perTete.cosmeto;
  const marche = { // k€/an
    medic: (tete.medic * pop) / 1000,
    materiel: (tete.materiel * pop) / 1000,
    cosmeto: (tete.cosmeto * pop) / 1000,
  };
  marche.total = marche.medic + marche.materiel + marche.cosmeto;
  const mix = {
    medic: marche.total ? marche.medic / marche.total : 0,
    materiel: marche.total ? marche.materiel / marche.total : 0,
    cosmeto: marche.total ? marche.cosmeto / marche.total : 0,
  };
  const indice = Math.round((tete.total / natTotal) * 100);

  // --- quota réglementaire (commune d'implantation) ---
  const communePop = idx.comPopAll.get(implCom) || 0;
  const Q = CONFIG.quota;
  const autorisees = communePop >= Q.seuil1
    ? 1 + Math.floor((communePop - Q.seuil1) / Q.tranche) : 0;
  const existantes = idx.comPharmaAll.get(implCom) || 0;   // officines de la commune d'implantation
  // prochain palier de population qui permettra une officine de plus que le max(présentes, autorisées)
  // → toujours strictement au-dessus de la population actuelle (donc "à atteindre" toujours > 0)
  const prochainSeuil = Q.seuil1 + Math.max(existantes, autorisees) * Q.tranche;
  const manqueHab = Math.max(0, prochainSeuil - communePop);
  const marge = autorisees - existantes;
  const feu = communePop < Q.seuil1 ? "rouge" : (marge > 0 ? "vert" : "orange");

  // --- CA potentiel : marché adressable × part de marché captée ---
  const partMarche = opts.partMarche ?? (pharma ? 1 / pharma : 1);
  const caPotentiel = marche.total * partMarche; // k€/an

  // --- verdict de synthèse (points +/−) ---
  const NAT = idx.nat, fmtI = n => Math.round(n).toLocaleString('fr-FR');
  const drivers = [];
  if (habParOfficine != null) {
    if (habParOfficine >= NAT.habParOfficine * 1.1)
      drivers.push({ s: 'pos', t: `Zone sous-équipée en officines — ${fmtI(habParOfficine)} hab./officine contre ~${fmtI(NAT.habParOfficine)} en France (${pharma} officine(s)).` });
    else if (habParOfficine <= NAT.habParOfficine * 0.9)
      drivers.push({ s: 'neg', t: `Zone dense en officines — ${fmtI(habParOfficine)} hab./officine contre ~${fmtI(NAT.habParOfficine)} en France.` });
    else drivers.push({ s: 'neu', t: `Densité d’officines proche de la moyenne (${fmtI(habParOfficine)} hab./officine).` });
  }
  if (communeMedian != null) {
    const dv = communeMedian - CONFIG.nat.income;
    if (dv >= 500) drivers.push({ s: 'pos', t: `Revenus supérieurs à la France — ${fmtI(communeMedian)} € de revenu médian (France ${fmtI(CONFIG.nat.income)} €).` });
    else if (dv <= -500) drivers.push({ s: 'neg', t: `Revenus inférieurs à la France — ${fmtI(communeMedian)} € (France ${fmtI(CONFIG.nat.income)} €).` });
  }
  if (dens.gen) {
    const ratio = dens.gen / NAT.gen10k;
    if (ratio < 0.85) drivers.push({ s: 'neg', t: `Déficit de généralistes — ${dens.gen}/10k hab. contre ${NAT.gen10k.toFixed(1)} en France : moteur de prescription limité.` });
    else if (ratio > 1.15) drivers.push({ s: 'pos', t: `Généralistes bien présents — ${dens.gen}/10k hab. (France ${NAT.gen10k.toFixed(1)}).` });
  }
  if (feu === 'rouge') drivers.push({ s: 'neg', t: `Création impossible — commune de ${fmtI(communePop)} hab. (< 2 500) : développement par transfert / regroupement.` });
  else if (feu === 'vert') drivers.push({ s: 'pos', t: `Création réglementairement possible — marge de ${autorisees - existantes} officine(s).` });
  else drivers.push({ s: 'neu', t: `Quota atteint — implantation par transfert / rachat.` });
  const score = drivers.filter(d => d.s === 'pos').length - drivers.filter(d => d.s === 'neg').length;
  const verdict = {
    level: score >= 2 ? 'vert' : score <= -2 ? 'rouge' : 'orange',
    label: score >= 2 ? 'Opportunité favorable' : score <= -2 ? 'Opportunité limitée' : 'Opportunité modérée',
  };

  // --- note de positionnement (conso) ---
  const profil = mix.medic > 0.82 ? 'très « médicament »' : mix.cosmeto > 0.16 ? 'équilibré (parapharmacie notable)' : 'classique';
  const indTxt = indice >= 103 ? `consommation au-dessus de la moyenne (indice ${indice})`
    : indice <= 97 ? `consommation sous la moyenne (indice ${indice})` : `consommation dans la moyenne (indice ${indice})`;
  const conseil = mix.medic > 0.82 ? 'officine de proximité / santé (soins chroniques, maintien à domicile) ; parapharmacie à construire.'
    : 'offre équilibrée soin + parapharmacie.';
  const positioning = `Profil ${profil} (${Math.round(mix.medic * 100)} % médicaments), ${indTxt}. Positionnement conseillé : ${conseil}`;

  // --- évolution de la population (maille vs France, indice base 100 en 2006) ---
  let evolution = null;
  if (idx.evolBy && idx.natEvol) {
    const ms = [0, 0, 0, 0]; let ok = false;
    for (const [com, p] of comPop) {                 // p = population maille de la commune
      const s = idx.evolBy.get(com); if (!s || !s[4]) continue;   // s = [com,p06,p11,p16,p22]
      for (let k = 0; k < 4; k++) if (s[k + 1] != null) ms[k] += p * s[k + 1] / s[4];
      ok = true;
    }
    if (ok && ms[0]) {
      const b = ms[0], fb = idx.natEvol[0] || 1, ne = idx.natEvol;
      const mi = ms.map(v => +(v / b * 100).toFixed(1));
      const fiA = ne.map(v => +(v / fb * 100).toFixed(1));
      // projection 2022 → 2025 (3 ans) à partir de la tendance récente (CAGR 2016-2022)
      const mCagr = ms[2] > 0 ? Math.pow(ms[3] / ms[2], 1 / 6) - 1 : 0;
      const fCagr = ne[2] > 0 ? Math.pow(ne[3] / ne[2], 1 / 6) - 1 : 0;
      evolution = {
        years: [2006, 2011, 2016, 2022, 2025],
        mailleIndex: [...mi, +(mi[3] * Math.pow(1 + mCagr, 3)).toFixed(1)],
        franceIndex: [...fiA, +(fiA[3] * Math.pow(1 + fCagr, 3)).toFixed(1)],
        projFrom: 3,                                     // segments après l'indice 3 = projection (pointillés)
        mailleGrowth: +((ms[3] / ms[0] - 1) * 100).toFixed(1),
        franceGrowth: +((ne[3] / ne[0] - 1) * 100).toFixed(1),
      };
    }
  }

  // --- structure du foyer & dynamique démographique de la COMMUNE d'implantation (comme l'ELM pro) ---
  let socio = null;
  if (idx.demoBy) {
    const s = idx.demoBy.get(implCom);                   // [com, persmen, nais, dece] (2016-2022)
    let persMenage = s && s[1] != null ? s[1] : null;
    if (persMenage == null) {                            // commune absente du fichier → moyenne pondérée de la maille
      let wp = 0, wsum = 0;
      for (const [com, p] of comPop) { const d = idx.demoBy.get(com); if (d && d[1] != null) { wp += d[1] * p; wsum += p; } }
      persMenage = wsum ? +(wp / wsum).toFixed(2) : null;
    }
    const yrs = 6;
    let soldeNaturel = null, tauxTotal = null, soldeMigratoire = null;
    if (s && s[2] != null && s[3] != null && communePop > 0)
      soldeNaturel = +(((s[2] - s[3]) / yrs) / communePop * 100).toFixed(2);
    const ev = idx.evolBy.get(implCom);                  // [com,p06,p11,p16,p22]
    if (ev && ev[3] > 0 && ev[4] > 0) tauxTotal = +((Math.pow(ev[4] / ev[3], 1 / yrs) - 1) * 100).toFixed(2);
    if (tauxTotal != null && soldeNaturel != null) soldeMigratoire = +(tauxTotal - soldeNaturel).toFixed(2);
    socio = { persMenage, natPersMen: idx.natPersMen, soldeNaturel, soldeMigratoire, tauxTotal };
  }

  return {
    center, params: { smoothM, range: (isoGeoJSON.features?.[0]?.properties) || null },
    socio,
    maille: { irisCount: maille.length, communeCount: comPop.size,
              communes: [...comPop.entries()].map(([com, p]) => ({ com, pop: p })) },
    demo: { pop, a0_14: a014, a65p: a65, a75p: a75,
            share0_14: pop ? a014/pop : 0, share65p: share65, share75p: pop ? a75/pop : 0,
            ages: { a0_14: a014, a15_29: a1529, a30_44: a3044, a45_59: a4559, a60_74: a6074, a75p: a75 },
            csp },
    income: { implCommune: implCom, communeMedian, mailleMedian,
              d1: comRow ? comRow[fc.d1] : null, d9: comRow ? comRow[fc.d9] : null,
              vsFrance: communeMedian ? communeMedian - N.income : null },
    verdict, drivers, positioning, evolution, prescripteurs, nearestIrisPop,
    mailleIris: maille.map(r => ({ iris: r[fi.iris], com: r[fi.com], lat: r[fi.lat], lon: r[fi.lon], pop: r[fi.pop] })),
    armature: arm,
    densite: { ...dens, nat: { gen: NAT.gen10k, inf: NAT.inf10k, kine: NAT.kine10k, dent: NAT.dent10k, sage: NAT.sage10k } },
    commerce: { total: arm.com_tot, alim: arm.com_alim, ecole: arm.ecole },
    competition: { pharma, habParOfficine, densite100k, natDensite100k: +NAT.pharma100k.toFixed(1),
                   natHabParOfficine: Math.round(NAT.habParOfficine),
                   vsFrance: habParOfficine ? habParOfficine - Math.round(NAT.habParOfficine) : null,
                   liste: competitors },
    consumption: { perTete: tete, marche_keur: marche, mix, indice,
                   modulateurs: { medic: modMedic, materiel: modMat, cosmeto: modCos } },
    quota: { communePop, autorisees, existantes, marge, feu, seuil: CONFIG.quota.seuil1,
             ecartSeuil: communePop - CONFIG.quota.seuil1, prochainSeuil, manqueHab },
    ca: { partMarche, potentiel_keur: caPotentiel },
  };
}
