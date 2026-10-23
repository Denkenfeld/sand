// Stadt-Katalog: Welche Objektarten die Stadt kennt, in wie vielen Varianten (Parameter-Sätze) sie gebaut werden
// und wie sie in Statistik / Karte eingeordnet sind. Alles deterministisch – gleiche Katalogdaten ergeben gleiche Bausteine.
import { mulberry32 } from '../core/noise.js';

// group: wohnen handel industrie militaer infra kultur wand prop fahrzeug figur natur
// type:  building (Gebäude, zählt als Haus) | prop | vehicle | figure | wall | nature
// live:  Schwergewicht mit Animation / Effekten – wird in der Nähe der Kamera als echtes, animiertes Objekt gezeigt
export const KINDS = {
  // Wohnen
  adobeHouse: { label: 'Lehmhaus', group: 'wohnen', type: 'building', color: '#d2a86a' },
  stackHouse: { label: 'Terrassenhaus', group: 'wohnen', type: 'building', color: '#e3c58e' },
  tenement: { label: 'Mietshaus', group: 'wohnen', type: 'building', color: '#b98a5a' },
  shack: { label: 'Blechhütte', group: 'wohnen', type: 'building', color: '#8a6a52' },
  tent: { label: 'Zelt', group: 'wohnen', type: 'building', color: '#c9803a' },
  ruin: { label: 'Ruine', group: 'natur', type: 'building', color: '#7a6a58' },
  domeHouse: { label: 'Kuppelhaus', group: 'wohnen', type: 'building', color: '#e6d3a8' },
  // Handel & Gemeinschaft
  stall: { label: 'Marktstand', group: 'handel', type: 'building', color: '#e0803a' },
  cantina: { label: 'Cantina', group: 'handel', type: 'building', color: '#e8b04a' },
  shop: { label: 'Laden', group: 'handel', type: 'building', color: '#d9a05a' },
  workshop: { label: 'Werkstatt', group: 'industrie', type: 'building', color: '#8a8f96' },
  warehouse: { label: 'Lagerhalle', group: 'industrie', type: 'building', color: '#9a9488' },
  hangar: { label: 'Hangar', group: 'industrie', type: 'building', color: '#7f8890' },
  // Wahrzeichen & Versorgung
  watchTower: { label: 'Wachturm', group: 'militaer', type: 'building', color: '#c06a4a' },
  spire: { label: 'Kristallturm', group: 'kultur', type: 'building', color: '#6fd0d8' },
  waterTower: { label: 'Wasserturm', group: 'infra', type: 'building', color: '#5a88b8' },
  cistern: { label: 'Zisterne', group: 'infra', type: 'building', color: '#5a88b8' },
  fountain: { label: 'Brunnen', group: 'kultur', type: 'building', color: '#6fd0d8' },
  well: { label: 'Ziehbrunnen', group: 'infra', type: 'prop', color: '#5a88b8' },
  monument: { label: 'Gründerstein', group: 'kultur', type: 'building', color: '#f0c060' },
  // Wirtschaft (Spielmodelle)
  hq: { label: 'Hauptquartier', group: 'kultur', type: 'building', color: '#f0a040', live: true },
  refinery: { label: 'Raffinerie', group: 'industrie', type: 'building', color: '#9aa0a8', live: true },
  factory: { label: 'Fabrik', group: 'industrie', type: 'building', color: '#8e949c', live: true },
  sandDriller: { label: 'Sandbohrer', group: 'industrie', type: 'building', color: '#b0623a', live: true },
  smelter: { label: 'Schmelze', group: 'industrie', type: 'building', color: '#d0603a', live: true },
  crystalDepot: { label: 'Kristalldepot', group: 'industrie', type: 'building', color: '#6fd0d8', live: true },
  battery: { label: 'Batteriespeicher', group: 'infra', type: 'building', color: '#8a9a60', live: true },
  dewCatcher: { label: 'Tauernte', group: 'infra', type: 'building', color: '#7ab0d0' },
  solarField: { label: 'Solarfeld', group: 'infra', type: 'building', color: '#4a6a9a' },
  condenserTower: { label: 'Kondensturm', group: 'infra', type: 'building', color: '#6a98c0', live: true },
  conveyor: { label: 'Förderband', group: 'industrie', type: 'prop', color: '#8e949c', live: true },
  // Militär & Forschung
  barracks: { label: 'Kaserne', group: 'militaer', type: 'building', color: '#c06a4a' },
  turret: { label: 'Geschützturm', group: 'militaer', type: 'building', color: '#d05a3a', live: true },
  shieldGen: { label: 'Schildgenerator', group: 'militaer', type: 'building', color: '#5ac0e0', live: true },
  radar: { label: 'Radarstation', group: 'militaer', type: 'building', color: '#b8c0c8', live: true },
  relay: { label: 'Relaisstation', group: 'militaer', type: 'building', color: '#f0a040', live: true },
  lab: { label: 'Forschungslabor', group: 'kultur', type: 'building', color: '#e0e8f0', live: true },
  spaceport: { label: 'Raumhafen', group: 'kultur', type: 'building', color: '#f4f4f0', live: true },
  fortress: { label: 'Festung', group: 'militaer', type: 'building', color: '#7a4a3a', live: true },
  torchTower: { label: 'Fackelturm', group: 'prop', type: 'prop', color: '#f0803a', live: true },
  // Wrack, Kreaturen
  wreckedHull: { label: 'Schiffswrack', group: 'natur', type: 'building', color: '#a8a8a0' },
  tamedWorm: { label: 'Gezähmter Wurm', group: 'natur', type: 'building', color: '#c0a070', live: true },
  sandworm: { label: 'Sandwurm', group: 'natur', type: 'building', color: '#c0a070', live: true },
  nightAliens: { label: 'Nachtschwarm', group: 'natur', type: 'prop', color: '#a070c0', live: true },
  // Fahrzeuge
  duneBuggy: { label: 'Dünenbuggy', group: 'fahrzeug', type: 'vehicle', color: '#f0c050' },
  hoverSkiff: { label: 'Gleiter', group: 'fahrzeug', type: 'vehicle', color: '#f0f0e8' },
  harvester: { label: 'Erntemaschine', group: 'fahrzeug', type: 'vehicle', color: '#d0a040', live: true },
  crawler: { label: 'Raupenfahrzeug', group: 'fahrzeug', type: 'vehicle', color: '#8a9a60', live: true },
  raider: { label: 'Plünderer-Buggy', group: 'fahrzeug', type: 'vehicle', color: '#b0502a', live: true },
  tank: { label: 'Panzer', group: 'fahrzeug', type: 'vehicle', color: '#404448', live: true },
  breaker: { label: 'Brecher', group: 'fahrzeug', type: 'vehicle', color: '#a04a2a', live: true },
  laserDrone: { label: 'Laserdrohne', group: 'fahrzeug', type: 'vehicle', color: '#505458', live: true },
  // Figuren
  wanderer: { label: 'Wanderer', group: 'figur', type: 'figure', color: '#f0e0b0' },
  warrior: { label: 'Krieger', group: 'figur', type: 'figure', color: '#e07a4a' },
  utilityDroid: { label: 'Arbeitsdroide', group: 'figur', type: 'figure', color: '#f0c050' },
  // Befestigung
  wallSection: { label: 'Stadtmauer', group: 'wand', type: 'wall', color: '#b8905a' },
  wallTower: { label: 'Mauerturm', group: 'wand', type: 'wall', color: '#b8905a' },
  gate: { label: 'Stadttor', group: 'wand', type: 'wall', color: '#e0a040' },
  // Requisiten
  crates: { label: 'Kisten', group: 'prop', type: 'prop', color: '#7a8a50' },
  barrels: { label: 'Fässer', group: 'prop', type: 'prop', color: '#a06a40' },
  junkPile: { label: 'Schrotthaufen', group: 'prop', type: 'prop', color: '#7a6a5a' },
  bench: { label: 'Bank', group: 'prop', type: 'prop', color: '#b59a78' },
  cart: { label: 'Karren', group: 'prop', type: 'prop', color: '#a08050' },
  signpost: { label: 'Wegweiser', group: 'prop', type: 'prop', color: '#c0a070' },
  powerPole: { label: 'Strommast', group: 'prop', type: 'prop', color: '#8a8a8a' },
  banner: { label: 'Banner', group: 'prop', type: 'prop', color: '#b04a2a' },
  sandbags: { label: 'Sandsäcke', group: 'prop', type: 'prop', color: '#c0a878' },
  streetLamp: { label: 'Straßenlampe', group: 'prop', type: 'prop', color: '#ffe0a0' },
  pipeRun: { label: 'Rohrleitung', group: 'prop', type: 'prop', color: '#8e949c' },
  scrub: { label: 'Gestrüpp', group: 'natur', type: 'nature', color: '#7a8a4a' },
  rocks: { label: 'Felsen', group: 'natur', type: 'nature', color: '#9a8a78' },
  barricade: { label: 'Stachelsperre', group: 'prop', type: 'prop', color: '#8a6a52' },
  brazier: { label: 'Feuerschale', group: 'prop', type: 'prop', color: '#f08030' },
  supplyPile: { label: 'Vorratsstapel', group: 'prop', type: 'prop', color: '#7a8a50' },
};

export const GROUPS = {
  wohnen: 'Wohnen', handel: 'Handel', industrie: 'Industrie', militaer: 'Militär', infra: 'Versorgung',
  kultur: 'Wahrzeichen', wand: 'Befestigung', prop: 'Requisiten', fahrzeug: 'Fahrzeuge', figur: 'Figuren', natur: 'Landschaft',
};

/* ───────────── Varianten ───────────── */
const R = (rng, a, b) => a + (b - a) * rng();
const RS = (rng, a, b, s) => Math.round(R(rng, a, b) / s) * s;
const RI = (rng, a, b) => Math.floor(R(rng, a, b + 1));
const W = (rng, pairs) => {
  let t = 0;
  for (const [, w] of pairs) t += w;
  let x = rng() * t;
  for (const [v, w] of pairs) { x -= w; if (x <= 0) return v; }
  return pairs[pairs.length - 1][0];
};
const CLAYS = [['sand', 30], ['ochre', 24], ['adobe', 20], ['white', 13], ['red', 8], ['dark', 5]];
const CLAYS_RICH = [['white', 34], ['ochre', 26], ['sand', 24], ['red', 10], ['adobe', 6]];
const CLAYS_POOR = [['adobe', 34], ['dark', 22], ['sand', 22], ['red', 12], ['ochre', 10]];
const gradeOf = (dmg) => (dmg > 0.55 ? 0 : dmg > 0.3 ? 1 : 2);
// grade 0 = heruntergekommen, 1 = gewöhnlich, 2 = gepflegt
const dmgFor = (rng, grade, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, grade === 0 ? R(rng, 0.55, 0.92) : grade === 1 ? R(rng, 0.28, 0.55) : R(rng, 0.04, 0.28)));
const clayFor = (rng, grade) => W(rng, grade === 2 ? CLAYS_RICH : grade === 0 ? CLAYS_POOR : CLAYS);
const PALS = ['sand', 'gray', 'rust', 'blue', 'white', 'olive', 'red', 'black'];
const PAL_UTIL = [['gray', 24], ['sand', 22], ['rust', 20], ['olive', 14], ['blue', 8], ['white', 8], ['red', 4]];

function seedOf(kind, i) {
  let h = 2166136261;
  for (let k = 0; k < kind.length; k++) h = Math.imul(h ^ kind.charCodeAt(k), 16777619);
  return (h ^ Math.imul(i + 1, 40503)) >>> 0;
}

// Erzeugt n Varianten einer Art. gen(rng, i) → { params, tags? }
function make(kind, n, gen) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const rng = mulberry32(seedOf(kind, i));
    const v = gen(rng, i);
    v.params.seed = (seedOf(kind, i) % 9000) + 100;
    v.tags = { grade: 1, ...(v.tags ?? {}) };
    out.push(v);
  }
  return out;
}
const fixed = (list) => list.map((params) => ({ params, tags: { grade: 1 } }));

export function buildVariantTable() {
  const V = {};

  /* Wohnen */
  V.adobeHouse = make('adobeHouse', 56, (r, i) => {
    const grade = i % 3;
    const dmg = dmgFor(r, grade);
    const floors = W(r, grade === 2 ? [[1, 25], [2, 55], [3, 20]] : [[1, 38], [2, 50], [3, 12]]);
    return { params: { w: RS(r, 6.5, 12, 0.5), d: RS(r, 6, 11, 0.5), floors, clay: clayFor(r, grade), roof: R(r, 0.15, 0.95), damage: dmg }, tags: { grade, floors } };
  });
  V.stackHouse = make('stackHouse', 24, (r, i) => {
    const grade = i % 3;
    return { params: { w: RS(r, 8, 13, 0.5), d: RS(r, 8, 12, 0.5), tiers: RI(r, 2, 4), clay: clayFor(r, grade), damage: dmgFor(r, grade) }, tags: { grade } };
  });
  V.tenement = make('tenement', 26, (r, i) => {
    const grade = i % 3;
    return { params: { w: RS(r, 9, 14, 0.5), d: RS(r, 8, 12, 0.5), floors: RI(r, 3, 6), clay: clayFor(r, grade), shop: r() < 0.55, damage: dmgFor(r, grade) }, tags: { grade } };
  });
  V.shack = make('shack', 34, (r, i) => {
    const grade = i % 3 === 2 ? 1 : 0;
    return { params: { w: RS(r, 3, 7, 0.25), d: RS(r, 3, 6, 0.25), pal: W(r, [['mix', 40], ['rust', 20], ['gray', 14], ['sand', 16], ['blue', 10]]), damage: dmgFor(r, grade, 0.4, 1) }, tags: { grade } };
  });
  const TENT = ['sand', 'red', 'blue', 'green', 'white', 'purple'];
  V.tent = make('tent', 20, (r, i) => ({ params: { kind: ['ridge', 'bell', 'pavilion'][i % 3], size: RS(r, 3.5, 7, 0.25), color: TENT[Math.floor(r() * TENT.length)], damage: R(r, 0.1, 0.7) } }));
  V.ruin = make('ruin', 20, (r) => ({ params: { w: RS(r, 6, 13, 0.5), d: RS(r, 5, 11, 0.5), clay: clayFor(r, 0), damage: R(r, 0.5, 1) }, tags: { grade: 0 } }));
  V.domeHouse = make('domeHouse', 6, (r, i) => ({ params: { radius: RS(r, 4, 7, 0.1), wallH: RS(r, 2.6, 3.6, 0.1), rise: RS(r, 0.5, 0.8, 0.01), doorW: RS(r, 1.4, 2.0, 0.05), clay: W(r, CLAYS_RICH), windows: RI(r, 2, 5) }, tags: { grade: 2 } }));

  /* Handel & Gemeinschaft */
  const GOODS = ['spice', 'water', 'scrap', 'cloth', 'crystal', 'fruit', 'tools'];
  V.stall = make('stall', 28, (r, i) => ({ params: { goods: GOODS[i % GOODS.length], w: RS(r, 2.5, 5, 0.25), color: String(RI(r, 0, 7)) } }));
  V.cantina = make('cantina', 6, (r, i) => ({ params: { w: RS(r, 13, 19, 0.5), d: RS(r, 11, 16, 0.5), clay: W(r, CLAYS), sign: RI(r, 0, 15), damage: R(r, 0.2, 0.6) }, tags: { grade: 1 } }));
  V.shop = make('shop', 16, (r, i) => ({ params: { w: RS(r, 6, 11, 0.5), d: RS(r, 6, 10, 0.5), clay: W(r, CLAYS_RICH), sign: RI(r, 0, 15), damage: dmgFor(r, i % 3) }, tags: { grade: i % 3 } }));
  V.workshop = make('workshop', 10, (r) => ({ params: { w: RS(r, 8, 14, 0.5), d: RS(r, 8, 12, 0.5), pal: W(r, PAL_UTIL), damage: R(r, 0.3, 0.8) } }));
  V.warehouse = make('warehouse', 10, (r) => ({ params: { w: RS(r, 9, 16, 0.5), d: RS(r, 12, 26, 0.5), pal: W(r, PAL_UTIL), damage: R(r, 0.25, 0.75) } }));
  V.hangar = make('hangar', 4, (r) => ({ params: { w: RS(r, 16, 26, 1), d: RS(r, 20, 32, 1), pal: W(r, [['gray', 40], ['sand', 30], ['white', 20], ['olive', 10]]), damage: R(r, 0.25, 0.6) } }));

  /* Wahrzeichen & Versorgung */
  V.watchTower = make('watchTower', 8, (r) => ({ params: { h: RS(r, 7, 14, 0.5), clay: W(r, CLAYS), damage: R(r, 0.2, 0.7) } }));
  V.spire = make('spire', 3, (r, i) => ({ params: { h: RS(r, 17, 28, 1), clay: 'white', color: ['cyan', 'amber', 'violet'][i % 3], damage: R(r, 0.1, 0.4) } }));
  V.waterTower = make('waterTower', 5, (r) => ({ params: { h: RS(r, 9, 15, 0.5), r: RS(r, 1.8, 3, 0.1), pal: W(r, [['blue', 40], ['white', 25], ['sand', 20], ['gray', 15]]), damage: R(r, 0.2, 0.6) } }));
  V.cistern = make('cistern', 6, (r) => ({ params: { r: RS(r, 2, 4.5, 0.25), h: RS(r, 3, 6, 0.25), pal: W(r, PAL_UTIL), damage: R(r, 0.2, 0.7) } }));
  V.fountain = make('fountain', 4, (r) => ({ params: { r: RS(r, 2.5, 4.5, 0.25), clay: W(r, CLAYS_RICH), damage: R(r, 0.1, 0.5) } }));
  V.well = make('well', 4, () => ({ params: {} }));
  V.monument = make('monument', 2, (r, i) => ({ params: { h: RS(r, 12, 18, 0.5), color: ['amber', 'cyan'][i % 2], damage: R(r, 0.1, 0.4) } }));

  /* Befestigung (Länge wählt der Mauerring selbst: lenIdx) */
  const LENS = [14, 16, 18, 20, 22, 24, 26];
  V.wallSection = [];
  for (const len of LENS) for (let k = 0; k < 2; k++) V.wallSection.push({ params: { len, h: k ? 7 : 6.5, clay: k ? 'ochre' : 'sand', damage: k ? 0.5 : 0.3, seed: len * 7 + k * 31 }, tags: { grade: 1, len } });
  V.wallTower = make('wallTower', 4, (r, i) => ({ params: { r: RS(r, 3.2, 4.4, 0.2), h: RS(r, 9.5, 13, 0.5), clay: i % 2 ? 'ochre' : 'sand', damage: R(r, 0.2, 0.6) } }));
  V.gate = make('gate', 2, (r, i) => ({ params: { clay: i ? 'ochre' : 'sand', open: true, damage: R(r, 0.2, 0.5) } }));

  /* Requisiten */
  V.crates = make('crates', 12, (r) => ({ params: { n: RI(r, 2, 8), pal: W(r, PAL_UTIL), damage: R(r, 0.2, 0.7) } }));
  V.barrels = make('barrels', 10, (r) => ({ params: { n: RI(r, 1, 7), damage: R(r, 0.2, 0.7) } }));
  V.junkPile = make('junkPile', 12, (r) => ({ params: { size: RS(r, 1.5, 4.5, 0.25) } }));
  V.bench = make('bench', 3, (r) => ({ params: { len: RS(r, 1.5, 2.6, 0.1) } }));
  V.cart = make('cart', 4, () => ({ params: {} }));
  V.signpost = make('signpost', 4, () => ({ params: {} }));
  V.powerPole = make('powerPole', 3, () => ({ params: {} }));
  V.banner = make('banner', 8, (r, i) => ({ params: { color: String(i % 4), h: RS(r, 4.5, 8, 0.5) } }));
  V.sandbags = make('sandbags', 3, () => ({ params: {} }));
  V.streetLamp = make('streetLamp', 3, () => ({ params: {} }));
  V.pipeRun = make('pipeRun', 6, (r) => ({ params: { len: RS(r, 6, 22, 1), n: RI(r, 1, 3), pal: W(r, PAL_UTIL) } }));
  V.scrub = make('scrub', 8, () => ({ params: {} }));
  V.rocks = make('rocks', 8, () => ({ params: {} }));
  V.barricade = make('barricade', 3, () => ({ params: {} }));
  V.brazier = make('brazier', 3, () => ({ params: {} }));
  V.supplyPile = make('supplyPile', 4, (r) => ({ params: { rows: RI(r, 1, 4), depth: RI(r, 1, 3), barrels: RI(r, 0, 6) } }));

  /* Spielmodelle als Wahrzeichen und Betriebe (Parameter-Sätze je Exemplar) */
  V.hq = fixed([{ wings: 5, towerH: 14, pal: 'sand', banner: true, seed: 11 }]);
  V.refinery = fixed([{ tanks: 3, stackH: 11, pal: 'white', smoke: true, seed: 12 }, { tanks: 4, stackH: 13.5, pal: 'gray', smoke: true, seed: 13 }]);
  V.factory = fixed([{ chimneys: 2, teeth: 3, crawler: true, smoke: true, pal: 'gray', seed: 14 }, { chimneys: 3, teeth: 4, crawler: false, smoke: true, pal: 'sand', seed: 15 }]);
  V.sandDriller = fixed([{ height: 10, speed: 3, dust: true, pal: 'rust', seed: 16 }, { height: 12, speed: 2.4, dust: true, pal: 'gray', seed: 17 }]);
  V.smelter = fixed([{ heat: 0.8, chimneyH: 8.5, crystals: 6, smoke: true, pal: 'black', seed: 18 }, { heat: 0.65, chimneyH: 10.5, crystals: 8, smoke: true, pal: 'rust', seed: 19 }]);
  V.crystalDepot = fixed([{ gem: 'cyan', fill: 13, glow: 1.7, pal: 'white', seed: 20 }, { gem: 'amber', fill: 16, glow: 1.9, pal: 'adobe', seed: 21 }, { gem: 'violet', fill: 10, glow: 1.6, pal: 'dark', seed: 22 }]);
  V.battery = fixed([{ cells: 4, charge: 0.7, fans: true, pal: 'olive', seed: 23 }, { cells: 6, charge: 0.9, fans: true, pal: 'gray', seed: 24 }, { cells: 3, charge: 0.4, fans: true, pal: 'sand', seed: 25 }]);
  V.dewCatcher = fixed([{ nets: 6, height: 4.8, trough: true, pal: 'white', seed: 26 }, { nets: 8, height: 5.5, trough: true, pal: 'sand', seed: 27 }, { nets: 4, height: 4.2, trough: true, pal: 'gray', seed: 28 }]);
  V.solarField = fixed([{ rows: 3, cols: 4, tilt: 0.55, pal: 'gray', seed: 29 }, { rows: 4, cols: 5, tilt: 0.5, pal: 'sand', seed: 30 }, { rows: 2, cols: 6, tilt: 0.6, pal: 'gray', seed: 31 }]);
  V.condenserTower = make('condenserTower', 10, (r) => ({ params: { height: RS(r, 4.5, 9, 0.1), fins: RI(r, 3, 10), finW: RS(r, 0.7, 1.3, 0.05), pal: W(r, PAL_UTIL), lean: RS(r, 0, 0.12, 0.01), tank: r() < 0.6 } }));
  V.conveyor = fixed([{ shape: 'line', segs: 4, cargo: true, pal: 'gray' }, { shape: 'line', segs: 6, cargo: true, pal: 'rust' }, { shape: 'curve', segs: 4, cargo: true, pal: 'gray' }, { shape: 'tee', segs: 4, cargo: false, pal: 'olive' }]);

  V.barracks = fixed([{ annex: 2, dummies: 3, tower: true, banner: true, pal: 'adobe', seed: 32 }, { annex: 3, dummies: 4, tower: true, banner: true, pal: 'white', seed: 33 }, { annex: 1, dummies: 2, tower: false, banner: true, pal: 'dark', seed: 34 }]);
  V.turret = fixed([{ barrels: 2, auto: true, aim: 0, fire: false, ammo: 2, pal: 'sand' }, { barrels: 1, auto: true, aim: 0, fire: false, ammo: 3, pal: 'gray' }, { barrels: 3, auto: true, aim: 0, fire: false, ammo: 1, pal: 'olive' }]);
  V.shieldGen = fixed([{ radius: 10, shield: false, color: 'cyan', pal: 'white' }, { radius: 12, shield: false, color: 'amber', pal: 'gray' }]);
  V.radar = fixed([{ towerH: 7, dish: 5, speed: 0.6, pal: 'white' }, { towerH: 10, dish: 6, speed: 0.4, pal: 'gray' }, { towerH: 5, dish: 4, speed: 0.9, pal: 'sand' }]);
  V.relay = fixed([{ active: true, beamH: 22, color: 'amber', pal: 'gray' }, { active: true, beamH: 30, color: 'cyan', pal: 'white' }, { active: true, beamH: 14, color: 'green', pal: 'olive' }]);
  V.lab = fixed([{ pods: 2, relic: true, glow: 1.6, pal: 'white', seed: 35 }, { pods: 3, relic: true, glow: 2, pal: 'sand', seed: 36 }]);
  V.spaceport = fixed([{ rocketH: 22, boosters: 3, gantry: true, tanks: 2, steam: true, pal: 'white', seed: 37 }]);
  V.fortress = fixed([{ size: 22, houses: 8, turrets: true, banners: true, barricade: true, pal: 'dark', seed: 38 }]);
  V.torchTower = make('torchTower', 6, (r, i) => ({ params: { style: ['pole', 'tripod', 'stone'][i % 3], height: RS(r, 4, 8, 0.1), lit: true, flame: RS(r, 0.8, 1.5, 0.05), pal: W(r, [['rust', 40], ['gray', 30], ['black', 30]]) } }));

  V.wreckedHull = fixed([{ length: 15, pal: 'white', tilt: 0.16, debris: 8, seed: 39 }]);
  V.tamedWorm = fixed([{ rear: 6.5, size: 0.9, skin: 'adobe', breath: true }]);
  V.sandworm = fixed([{ rear: 8, size: 1.1, skin: 'dark', breath: true }]);
  V.nightAliens = fixed([{ count: 16, radius: 9, height: 6, flap: 9, eye: 'violet' }]);

  /* Fahrzeuge & Figuren */
  V.duneBuggy = make('duneBuggy', 12, (r) => ({ params: { pal: W(r, PAL_UTIL), wheelR: RS(r, 0.4, 0.58, 0.01), cage: r() < 0.7, cargo: r() < 0.5, lights: false } }));
  V.hoverSkiff = make('hoverSkiff', 8, (r) => ({ params: { pal: W(r, [['white', 30], ['sand', 22], ['gray', 18], ['blue', 12], ['red', 10], ['olive', 8]]), hoverH: RS(r, 0.7, 1.2, 0.05), shield: r() < 0.6 } }));
  V.harvester = fixed([{ pal: 'sand', wheelR: 0.85, load: 0.6, arm: true }, { pal: 'rust', wheelR: 0.9, load: 0.9, arm: true }, { pal: 'gray', wheelR: 0.8, load: 0.3, arm: false }]);
  V.crawler = fixed([{ pal: 'olive', scan: true, cargo: true, skirt: true }, { pal: 'sand', scan: true, cargo: false, skirt: true }, { pal: 'gray', scan: true, cargo: true, skirt: false }]);
  V.raider = make('raider', 5, (r) => ({ params: { pal: W(r, [['rust', 40], ['black', 25], ['red', 20], ['gray', 15]]), rider: true, spikes: true, pennant: true, lights: false } }));
  V.tank = fixed([{ pal: 'black', gun: 3.8, scan: true, skirt: true }, { pal: 'rust', gun: 4.4, scan: true, skirt: false }]);
  V.breaker = fixed([{ pal: 'rust', roller: 2.4, spikes: 9, smoke: true }]);
  V.laserDrone = fixed([{ pal: 'black', hoverH: 2.4, laser: false, range: 11 }, { pal: 'gray', hoverH: 3.2, laser: false, range: 11 }]);

  const ROBE = ['sand', 'umber', 'gray', 'indigo', 'olive'];
  V.wanderer = make('wanderer', 16, (r, i) => ({ params: { height: RS(r, 1.55, 1.98, 0.01), robe: ROBE[i % ROBE.length], hood: r() < 0.65, goggles: r() < 0.6, pack: r() < 0.6, ragged: R(r, 0.15, 0.9) } }));
  const ARM = ['sand', 'gray', 'olive', 'rust', 'blue', 'black'], WEAP = ['rifle', 'spear', 'blade'];
  V.warrior = make('warrior', 12, (r, i) => ({ params: { height: RS(r, 1.7, 2, 0.01), armor: ARM[i % ARM.length], weapon: WEAP[(i * 7 + (i >> 1)) % 3], shield: r() < 0.5, cape: r() < 0.55, pack: r() < 0.6, worn: R(r, 0.2, 0.9) } }));
  V.utilityDroid = make('utilityDroid', 8, (r, i) => ({ params: { pal: ['sand', 'gray', 'rust', 'olive', 'white', 'blue'][i % 6], eye: ['orange', 'blue', 'red', 'green'][i % 4], size: RS(r, 0.85, 1.25, 0.01), antenna: r() < 0.7, arms: r() < 0.8 } }));

  return V;
}

// Reihenfolge: zuerst Kit-Gebäude, dann Spielmodelle – nur für Fortschrittsanzeige und stabile Material-/Geometrie-Indizes
export const KIND_ORDER = Object.keys(KINDS);

// Pro Art: welche Gruppe zählt wie in den Statistiken
export const isBuilding = (kind) => KINDS[kind]?.type === 'building';
