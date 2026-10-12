// Test de référence du moteur de calcul (app/engine.js), sans navigateur.
// Lancement : node tests/test_moteur.mjs   (Node 18 ou plus récent)
//
// Il rejoue l'analyse d'un point fixe (centre de Vierzon, Cher) avec les mêmes fichiers que
// l'appli, puis vérifie les résultats attendus. Ce point est un exemple neutre, sans lien
// avec un projet réel : il sert seulement à détecter un changement de calcul ou de données.
//
// La zone est figée dans tests/site-reference-isochrone.json. C'est un simple cercle de
// 5 km (pas une vraie zone de trajet Geoapify) : le test ne dépend donc ni d'Internet ni de
// la clé Geoapify.
//
// Si vous modifiez volontairement le calcul ou les données, les valeurs attendues changent :
// vérifiez que l'écart est voulu, puis mettez à jour ATTENDU ci-dessous.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { indexData, analyze } from "../app/engine.js";

const ICI = dirname(fileURLToPath(import.meta.url));
const DATA = join(ICI, "..", "app", "data");
const lire = (p) => JSON.parse(readFileSync(p, "utf8"));

// Même chargement que app/index.html (liste FILES).
const idx = indexData({
  iris: lire(join(DATA, "iris.json")),
  communes: lire(join(DATA, "communes.json")),
  equip: lire(join(DATA, "iris-equip.json")),
  pharmacies: lire(join(DATA, "pharmacies.json")),
  evol: lire(join(DATA, "communes-evol.json")),
  sociodemo: lire(join(DATA, "communes-demo.json")),
  santePoints: lire(join(DATA, "sante-points.json")),
});
const iso = lire(join(ICI, "site-reference-isochrone.json"));
const r = analyze(idx, iso, { lat: 47.2219, lon: 2.0686 }, { implCom: "18279" });

const ATTENDU = {
  "population de la zone": [r.demo.pop, 27658],
  "nombre d'IRIS": [r.maille.irisCount, 14],
  "part des 65 ans et plus (%)": [+(100 * r.demo.share65p).toFixed(1), 28.8],
  "revenu médian de la commune (€)": [r.income.communeMedian, 18840],
  "population de la commune": [r.quota.communePop, 25038],
  "officines autorisées par le quota": [r.quota.autorisees, 6],
  "feu réglementaire": [r.quota.feu, "orange"],
  "consommation par habitant (€)": [Math.round(r.consumption.perTete.total), 889],
  "indice de consommation (France = 100)": [r.consumption.indice, 113],
  "marché total (k€/an)": [Math.round(r.consumption.marche_keur.total), 24582],
};

let ecarts = 0;
for (const [libelle, [obtenu, attendu]] of Object.entries(ATTENDU)) {
  const ok = obtenu === attendu;
  if (!ok) ecarts++;
  console.log(`${ok ? "ok    " : "ÉCART "} ${libelle} : ${obtenu}${ok ? "" : ` (attendu ${attendu})`}`);
}
console.log("Valeurs d'information (non vérifiées) :");
console.log(`  officines dans la zone : ${r.competition.pharma}, généralistes : ${r.armature.gen}`);
console.log(`  verdict : ${r.verdict.label}`);
console.log(ecarts ? `${ecarts} écart(s)` : "Tout est conforme.");
process.exit(ecarts ? 1 : 0);
