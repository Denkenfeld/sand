// Handel, Gewerbe und Infrastruktur: Marktstand, Cantina, Laden, Werkstatt, Lagerhalle, Hangar,
// Wachturm, Minarett, Wasserturm, Zisterne, Brunnen, Denkmal.
import {
  CAT, THREE, M, box, cyl, sph, mk, mulberry32, rblock, frame, arch, stairs, facade, addWindow, addDoor, tank, antenna, awning, vault,
  pick, between, clayMats, clayM, sandDrift, rubble, parts, WIN, WIN_C, WIN_OFF, LAMP, FIREGLOW, CLOTH_COLORS, SHUTTER_PALS, sign, cloth, pole, gable,
} from './town.js';
import { crystalMat, spiceMat, waterMat, hazardMat, lattice, strut, crystal, torus } from './kit.js';
import { damageParam, seedParam, CLAY_OPTIONS, PAL_OPTIONS } from './_common.js';

const lamps = (g, rng, x0, x1, y, z, n, sag = 0.25) => {
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    g.add(sph(0.07, LAMP, { x: x0 + (x1 - x0) * t, y: y - Math.sin(t * Math.PI) * sag, z, ws: 6, hs: 4, cast: false }));
  }
  g.add(box(Math.abs(x1 - x0), 0.012, 0.012, M.dark(0x222222), { x: (x0 + x1) / 2, y: y + 0.02, z, cast: false }));
};

/* ═════════════ Marktstand ═════════════ */
const GOODS = [['spice', 'Gewürze'], ['water', 'Wasserkrüge'], ['scrap', 'Ersatzteile'], ['cloth', 'Stoffe'], ['crystal', 'Kristalle'], ['fruit', 'Früchte'], ['tools', 'Werkzeug']];
export const stall = {
  id: 'stall',
  label: 'Marktstand',
  category: CAT,
  tag: 'Basar',
  hint: 'Stand mit Sonnensegel, Lampe und Ware: Gewürze, Wasser, Schrott, Stoffe, Kristalle, Früchte oder Werkzeug',
  buildStyle: 'pop',
  params: [
    { key: 'goods', label: 'Ware', type: 'select', options: GOODS, value: 'spice' },
    { key: 'w', label: 'Breite', type: 'range', min: 2.5, max: 5, step: 0.25, value: 3.5, unit: 'm' },
    { key: 'color', label: 'Segel', type: 'select', options: CLOTH_COLORS.map((c, i) => [String(i), 'Farbe ' + (i + 1)]), value: '0' },
    seedParam(1),
  ],
  build(obj, p) {
    const rng = mulberry32(p.seed);
    const W = p.w;
    const wood = M.wood(0xb59a78);
    const add = (m, surf = 'wood', mass = 8, solid = false) => obj.add(m, solid ? { mass, surf } : { collider: 'none', mass, surf });
    // Tisch auf zwei Kistenböcken
    add(box(W, 0.09, 1.1, wood, { y: 0.95 }), 'wood', 40, true);
    for (const s of [-1, 1]) add(box(0.7, 0.9, 0.9, M.wood(0xa88f6c), { x: s * (W / 2 - 0.5), y: 0.45, z: 0 }), 'wood', 30, true);
    add(box(W * 0.9, 0.5, 0.04, M.cloth(CLOTH_COLORS[Number(p.color) % 8]), { y: 0.75, z: 0.57 }), 'cloth', 3);
    const top = 1.0;
    const g = new THREE.Group();
    g.position.set(0, top, 0);
    const n = Math.floor(W / 0.8);
    for (let i = 0; i < n; i++) {
      const x = -W / 2 + (W / n) * (i + 0.5);
      const z = (rng() - 0.5) * 0.4;
      if (p.goods === 'spice') {
        const mt = pick(rng, [spiceMat(), M.clay('red'), M.clay('adobe'), M.cloth(0xb09030)]);
        g.add(cyl(0.02, 0.26, 0.34, mt, { x, y: 0.17, z, radial: 10 }));
        g.add(cyl(0.3, 0.26, 0.08, M.metal('rust'), { x, y: 0.04, z, radial: 10 }));
      } else if (p.goods === 'water') {
        g.add(cyl(0.17, 0.22, 0.46, M.clay(pick(rng, ['adobe', 'white', 'red'])), { x, y: 0.23, z, radial: 10 }));
        g.add(cyl(0.08, 0.12, 0.18, M.clay('dark'), { x, y: 0.55, z, radial: 8 }));
      } else if (p.goods === 'scrap') {
        if (rng() < 0.4) g.add(torus(0.2, 0.06, M.metal(pick(rng, ['rust', 'gray'])), { x, y: 0.2, z, rx: Math.PI / 2 + (rng() - 0.5) * 0.4, ts: 12 }));
        else if (rng() < 0.5) g.add(cyl(0.08, 0.08, 0.5, M.metal('gray'), { x, y: 0.1, z, rz: 1.57, ry: rng() * 3, radial: 6 }));
        else g.add(box(0.35, 0.22, 0.3, M.metal(pick(rng, ['rust', 'olive', 'sand'])), { x, y: 0.11, z, ry: rng() * 3 }));
      } else if (p.goods === 'cloth') {
        g.add(cyl(0.12, 0.12, 0.7, M.cloth(pick(rng, CLOTH_COLORS)), { x, y: 0.12, z, rz: 1.5708, ry: (rng() - 0.5) * 0.5, radial: 8 }));
        if (rng() < 0.6) g.add(cyl(0.12, 0.12, 0.6, M.cloth(pick(rng, CLOTH_COLORS)), { x: x + 0.05, y: 0.34, z, rz: 1.5708, radial: 8 }));
      } else if (p.goods === 'crystal') {
        g.add(crystal(0.4 + rng() * 0.3, 0.09, { x, y: 0.28, z, rz: (rng() - 0.5) * 0.4 }, pick(rng, [0x3ad8ff, 0xb86cff, 0xffb347, 0x7dff9a]), 1.4));
        g.add(cyl(0.22, 0.22, 0.04, M.cloth(0x2a2430), { x, y: 0.02, z, radial: 10 }));
      } else if (p.goods === 'fruit') {
        g.add(box(0.6, 0.18, 0.45, wood, { x, y: 0.09, z }));
        for (let k = 0; k < 6; k++) g.add(sph(0.09, M.cloth(pick(rng, [0x7a8a3a, 0xa04a30, 0xb08a30])), { x: x + (rng() - 0.5) * 0.4, y: 0.24, z: z + (rng() - 0.5) * 0.3, ws: 6, hs: 4, cast: false }));
      } else {
        g.add(box(0.05, 0.4 + rng() * 0.2, 0.05, M.metal('gray'), { x, y: 0.28, z, rz: (rng() - 0.5) * 0.7 }));
        g.add(box(0.18, 0.1, 0.06, M.metal('rust'), { x: x + 0.05, y: 0.5, z }));
      }
    }
    add(g, 'wood', 10);
    // Segel + Pfosten, Lampe
    const aw = awning(W + 0.6, 1.7, 2.15, 2.75, CLOTH_COLORS[Number(p.color) % 8], { seed: p.seed });
    aw.position.set(0, 0, -0.55);
    for (const s of [-1, 1]) aw.add(cyl(0.045, 0.05, 2.75, wood, { x: s * (W / 2 + 0.22), y: 1.37, z: 0, radial: 6 }));
    add(aw, 'cloth', 30);
    add(sph(0.1, LAMP, { y: 2.1, z: 0.25, ws: 6, hs: 4, cast: false }), 'metal', 1);
    // Rückseite: Kisten und Fass
    for (let i = 0; i < 2 + Math.floor(rng() * 2); i++) add(box(0.7, 0.55, 0.6, wood, { x: (rng() - 0.5) * W, y: 0.28, z: -0.95 - rng() * 0.3, ry: rng() }), 'wood', 14, true);
    if (rng() < 0.5) add(cyl(0.3, 0.3, 0.85, M.metal(pick(rng, ['rust', 'blue', 'olive'])), { x: W / 2 + 0.2, y: 0.42, z: -0.6, radial: 10 }), 'metal', 20, true);
  },
};

/* ═════════════ Cantina ═════════════ */
export const cantina = {
  id: 'cantina',
  label: 'Cantina',
  category: CAT,
  tag: 'Treffpunkt',
  hint: 'Kuppelkneipe mit Vordach, Tischen, Lichterketten und Leuchtschild – hier trifft sich die ganze Stadt',
  buildStyle: 'rise',
  params: [
    { key: 'w', label: 'Breite', type: 'range', min: 13, max: 19, step: 0.5, value: 16, unit: 'm' },
    { key: 'd', label: 'Tiefe', type: 'range', min: 11, max: 16, step: 0.5, value: 13, unit: 'm' },
    { key: 'clay', label: 'Putz', type: 'select', options: CLAY_OPTIONS, value: 'sand' },
    { key: 'sign', label: 'Schild', type: 'range', min: 0, max: 15, step: 1, value: 3 },
    damageParam(0.35),
    seedParam(9),
  ],
  build(obj, p) {
    const rng = mulberry32(p.seed);
    const W = p.w, D = p.d, dm = p.damage;
    const m = clayMats(p.clay);
    const mats = { trim: m.trim, dark: m.dark };
    const wood = M.wood(0xb59a78);
    const rust = M.metal('rust');
    // Hauptsaal (hinten, rund) + Vorbau (breit)
    const hd = D * 0.66, hw = W * 0.74;
    parts.solid(obj, rblock(hw, 4.4, hd, Math.min(hw, hd) * 0.32, m.wall, { z: -D / 2 + hd / 2, taper: 0.02 }), hw, 4.4, hd, 'clay', [3, 2, 3]);
    const fd = D * 0.36;
    parts.solid(obj, rblock(W, 3.4, fd, 1.4, m.wall, { z: D / 2 - fd / 2, taper: 0.015 }), W, 3.4, fd, 'clay', [3, 2, 2]);
    parts.deco(obj, frame(W - 0.2, fd - 0.2, 0.28, 0.55, m.wall, { y: 3.4, z: D / 2 - fd / 2, r: 1.2 }), 'clay', 30);
    // Kuppel über dem Saal
    const R = Math.min(hw, hd) / 2 * 1.02;
    parts.deco(obj, sph(R, M.clay(p.clay, { side: THREE.DoubleSide }), { y: 4.4, z: -D / 2 + hd / 2, thetaLength: Math.PI / 2, sy: 0.55, ws: 20, hs: 7 }), 'clay', 150);
    parts.deco(obj, cyl(0.55, 0.7, 0.5, m.trim, { y: 4.4 + R * 0.55, z: -D / 2 + hd / 2, radial: 12 }), 'clay', 30);
    parts.deco(obj, sph(0.28, M.metal('gray'), { y: 4.4 + R * 0.55 + 0.45, z: -D / 2 + hd / 2, ws: 8, hs: 6 }), 'metal', 8);
    // Fassade vorn: großer Eingang, Fenster
    const g = facade('+z', W, D);
    addDoor(g, 0, 2.2, 2.7, mats, { door: M.wood(0x9a7a50), open: true });
    for (const s of [-1, 1]) for (let i = 0; i < 2; i++) {
      const u = s * (3.4 + i * 2.6);
      addWindow(g, u, 1.7, 0.95, 1.2, mats, { lit: true, cool: rng() < 0.3, shut: rng() < 0.5 ? M.metal('blue') : null, round: i === 1 });
    }
    g.add(sign(4.4, 1.1, p.sign, { y: 3.9, z: 0.08 }));
    for (const s of [-1, 1]) g.add(box(0.08, 1.4, 0.08, rust, { x: s * 2.3, y: 4.1, z: 0.06 }));
    // Vordach aus Stoff über den Tischen
    const aw = awning(W * 0.78, 3.4, 2.7, 3.2, pick(rng, [0xa8553a, 0x4a5f78, 0x7a8456]), { seed: p.seed });
    aw.position.set(0, 0, 0.3);
    g.add(aw);
    lamps(g, rng, -W * 0.37, W * 0.37, 2.55, 3.6, 10, 0.35);
    parts.deco(obj, g, 'clay', 30);
    // Seitenfenster Saal
    for (const side of ['+x', '-x', '-z']) {
      const gg = facade(side, hw, hd, 0, -D / 2 + hd / 2);
      const L = side === '-z' ? hw : hd;
      for (let i = 0; i < Math.floor(L / 3); i++) addWindow(gg, -L / 2 + 1.8 + i * 3, 2.2, 0.8, 1.2, mats, { lit: rng() < 0.7, cool: rng() < 0.2, round: true });
      parts.deco(obj, gg, 'clay', 10);
    }
    // Tische und Hocker vor der Tür
    for (let i = 0; i < 5; i++) {
      const x = -W * 0.3 + i * (W * 0.15) + (rng() - 0.5) * 0.5, z = D / 2 + 1.6 + rng() * 1.1;
      obj.add(cyl(0.45, 0.4, 0.06, wood, { x, y: 0.95, z, radial: 10 }), { collider: 'none', mass: 6, surf: 'wood' });
      obj.add(cyl(0.06, 0.1, 0.92, M.metal('gray'), { x, y: 0.46, z, radial: 6 }), { collider: 'none', mass: 6, surf: 'metal' });
      for (let k = 0; k < 3; k++) {
        const a = rng() * 6.28 + k * 2.1;
        obj.add(cyl(0.2, 0.2, 0.5, M.cloth(pick(rng, CLOTH_COLORS)), { x: x + Math.sin(a) * 0.85, y: 0.25, z: z + Math.cos(a) * 0.85, radial: 8 }), { collider: 'none', mass: 4, surf: 'cloth' });
      }
    }
    // Dach: Lüfter, Schornstein, Antenne
    const roof = new THREE.Group();
    roof.add(cyl(0.45, 0.5, 1.4, M.metal('gray'), { x: W * 0.28, y: 3.4 + 0.7, z: D / 2 - fd / 2, radial: 10 }));
    roof.add(cyl(0.7, 0.4, 0.3, rust, { x: W * 0.28, y: 3.4 + 1.5, z: D / 2 - fd / 2, radial: 10 }));
    const a = antenna(5.2, M.metal('gray'), { dish: true, light: true });
    a.position.set(-W * 0.3, 3.4, D / 2 - fd / 2);
    roof.add(a);
    parts.deco(obj, roof, 'metal', 40);
    // Schild quer zur Straße
    const hang = new THREE.Group();
    hang.position.set(W / 2 + 0.05, 0, D / 2 - 0.4);
    hang.add(box(0.1, 4.4, 0.1, rust, { y: 2.2 }));
    hang.add(box(1.8, 0.08, 0.08, rust, { y: 4.2, x: -0.9 }));
    const hs = sign(1.5, 0.38, (p.sign + 5) % 16, { y: 3.8, x: -0.9, ry: Math.PI / 2 });
    hang.add(hs);
    parts.deco(obj, hang, 'metal', 20);
    // Fässer, Verwehungen
    for (let i = 0; i < 3; i++) obj.add(cyl(0.3, 0.3, 0.9, M.metal(pick(rng, ['rust', 'blue', 'gray'])), { x: -W / 2 - 0.5, y: 0.45, z: D / 2 - 1.2 - i * 0.7, radial: 10 }), { mass: 20, surf: 'metal' });
    obj.add(sandDrift(W * 0.25, D / 2 + 0.3, 2), { collider: 'none', mass: 4, surf: 'clay' });
    if (dm > 0.4) {
      const rb = rubble(rng, 5, 2.4, m.dark);
      rb.position.set(-W / 2 - 0.4, 0, -D / 2 + 2);
      obj.add(rb, { collider: 'none', mass: 10, surf: 'clay' });
    }
  },
};

/* ═════════════ Laden ═════════════ */
export const shop = {
  id: 'shop',
  label: 'Laden',
  category: CAT,
  tag: 'Handel',
  hint: 'Zweigeschossiger Laden mit Markise, Auslage, Schild und Dachterrasse',
  buildStyle: 'rise',
  params: [
    { key: 'w', label: 'Breite', type: 'range', min: 6, max: 11, step: 0.5, value: 8, unit: 'm' },
    { key: 'd', label: 'Tiefe', type: 'range', min: 6, max: 10, step: 0.5, value: 7.5, unit: 'm' },
    { key: 'clay', label: 'Putz', type: 'select', options: CLAY_OPTIONS, value: 'white' },
    { key: 'sign', label: 'Schild', type: 'range', min: 0, max: 15, step: 1, value: 6 },
    damageParam(0.3),
    seedParam(12),
  ],
  build(obj, p) {
    const rng = mulberry32(p.seed);
    const W = p.w, D = p.d, H = 3.3 + (rng() < 0.5 ? FH_ : 0);
    const m = clayMats(p.clay);
    const mats = { trim: m.trim, dark: m.dark };
    const wood = M.wood(0xb59a78);
    parts.solid(obj, rblock(W, H, D, 0.5, m.wall, { taper: 0.012 }), W, H, D, 'clay', [2, 2, 2]);
    parts.deco(obj, frame(W - 0.1, D - 0.1, 0.25, 0.55, m.wall, { y: H, r: 0.4 }), 'clay', 30);
    const g = facade('+z', W, D);
    const du = (rng() < 0.5 ? -1 : 1) * W * 0.28;
    addDoor(g, du, 1.2, 2.3, mats, { door: M.metal(pick(rng, ['blue', 'rust', 'olive'])), open: rng() < 0.5 });
    // Schaufenster
    const wu = -du * 0.8;
    g.add(box(2.6, 1.5, 0.08, rng() < 0.7 ? WIN : WIN_C, { x: wu, y: 1.5, z: 0.02, cast: false }));
    g.add(box(3.0, 0.12, 0.3, m.trim, { x: wu, y: 0.7, z: 0.12, cast: false }));
    g.add(box(3.0, 0.1, 0.2, m.trim, { x: wu, y: 2.35, z: 0.1, cast: false }));
    // Auslage vor dem Fenster
    for (let i = 0; i < 3; i++) g.add(box(0.5, 0.45, 0.5, wood, { x: wu - 0.9 + i * 0.9, y: 0.23, z: 0.9, ry: rng() }));
    const aw = awning(W * 0.85, 1.9, 2.55, 3.05, pick(rng, CLOTH_COLORS), { seed: p.seed });
    aw.position.set(0, 0, 0.1);
    g.add(aw);
    g.add(sign(2.6, 0.65, p.sign, { x: 0, y: H - 0.6, z: 0.07 }));
    if (H > 4) for (let i = 0; i < 3; i++) addWindow(g, (i - 1) * 2.4, 4.8, 0.85, 1.1, mats, { lit: rng() < 0.5, shut: rng() < 0.5 ? M.metal('rust') : null });
    parts.deco(obj, g, 'clay', 30);
    for (const side of ['+x', '-x', '-z']) {
      const gg = facade(side, W, D);
      const L = side === '-z' ? W : D;
      const n = Math.floor((L - 1.5) / 2.6);
      for (let i = 0; i < n; i++) addWindow(gg, -((n - 1) / 2) * 2.6 + i * 2.6, 1.8 + (H > 4 ? FH_ * 0.6 : 0), 0.8, 1.1, mats, { lit: rng() < 0.35, shut: rng() < 0.4 ? M.metal('blue') : null });
      parts.deco(obj, gg, 'clay', 10);
    }
    const roof = new THREE.Group();
    roof.position.set(0, H, 0);
    roof.add(tank(0.8, 1.3, M.metal(pick(rng, ['blue', 'rust', 'white'])), M.metal('gray'), { x: W * 0.25, z: -D * 0.2 }));
    if (rng() < 0.5) roof.add(awning(3, 2.2, 2.2, 2.6, pick(rng, CLOTH_COLORS), { seed: p.seed }));
    parts.deco(obj, roof, 'metal', 20);
    obj.add(sandDrift(-W * 0.2, D / 2 + 0.3, 1.2), { collider: 'none', mass: 4, surf: 'clay' });
  },
};
const FH_ = 2.9;

/* ═════════════ Werkstatt ═════════════ */
export const workshop = {
  id: 'workshop',
  label: 'Werkstatt',
  category: CAT,
  tag: 'Gewerbe',
  hint: 'Offene Reparaturhalle mit Schiebetor, Kranbalken, Motorblock, Reifenstapel und Schweißlicht',
  buildStyle: 'drop',
  params: [
    { key: 'w', label: 'Breite', type: 'range', min: 8, max: 14, step: 0.5, value: 11, unit: 'm' },
    { key: 'd', label: 'Tiefe', type: 'range', min: 8, max: 12, step: 0.5, value: 9.5, unit: 'm' },
    { key: 'pal', label: 'Blech', type: 'select', options: PAL_OPTIONS, value: 'gray' },
    damageParam(0.5),
    seedParam(14),
  ],
  build(obj, p) {
    const rng = mulberry32(p.seed);
    const W = p.w, D = p.d, H = 4.2;
    const metal = M.metal(p.pal), rust = M.metal('rust'), clay = M.clay('sand'), dark = M.clay('dark');
    const solid = (mesh, w, h, d, surf = 'clay') => parts.solid(obj, mesh, w, h, d, surf, [2, 2, 1]);
    // Rückwand und Seitenwände aus Lehmziegeln, vorn offen
    solid(box(W, H, 0.5, clay, { y: H / 2, z: -D / 2 + 0.25 }), W, H, 0.5);
    for (const s of [-1, 1]) solid(box(0.5, H, D, s > 0 ? clay : dark, { x: s * (W / 2 - 0.25), y: H / 2 }), 0.5, H, D);
    // Dach: Blech, leicht geneigt, mit Oberlicht
    obj.add(box(W + 0.8, 0.1, D + 1.4, metal, { y: H + 0.25, z: 0.3, rx: -0.07 }), { fracture: [3, 1, 3], mass: 120, surf: 'metal' });
    obj.add(box(W * 0.3, 0.12, D * 0.25, WIN_C, { x: -W * 0.2, y: H + 0.34, z: -D * 0.1, rx: -0.07, cast: false }), { collider: 'none', mass: 8, surf: 'metal' });
    for (let i = -2; i <= 2; i++) obj.add(box(0.14, 0.4, D + 1.2, M.wood(0x8a7050), { x: i * W * 0.22, y: H - 0.05, z: 0.3 }), { collider: 'none', mass: 14, surf: 'wood' });
    // Tor: Pfosten, Laufschiene und halb zugeschobenes Blechtor
    obj.add(box(W - 1.4, 0.2, 0.22, rust, { y: 3.9, z: D / 2 - 0.1 }), { collider: 'none', mass: 20, surf: 'metal' });
    obj.add(box(W * 0.46, 3.5, 0.1, metal, { x: W * 0.26, y: 1.75, z: D / 2 + 0.05 }), { fracture: [2, 2, 1], mass: 60, surf: 'metal' });
    obj.add(box(W * 0.46, 0.4, 0.14, M.metal('red'), { x: W * 0.26, y: 3.0, z: D / 2 + 0.12, cast: false }), { collider: 'none', mass: 8, surf: 'metal' });
    // Kranbalken mit Kette
    obj.add(box(W - 1, 0.26, 0.26, rust, { y: 3.7, z: -0.8 }), { collider: 'none', mass: 40, surf: 'metal' });
    obj.add(cyl(0.02, 0.02, 1.2, M.metal('gray'), { x: W * 0.05, y: 3.0, z: -0.8, radial: 4 }), { collider: 'none', mass: 2, surf: 'metal' });
    obj.add(box(0.35, 0.28, 0.25, M.metal('olive'), { x: W * 0.05, y: 2.3, z: -0.8 }), { collider: 'none', mass: 6, surf: 'metal' });
    // Arbeitsplatz: Werkbank, Motorblock, Schweißlicht
    obj.add(box(2.6, 0.1, 0.9, M.wood(0xa88f6c), { x: -W * 0.28, y: 0.95, z: -D / 2 + 1.1 }), { mass: 40, surf: 'wood' });
    for (const s of [-1, 1]) obj.add(box(0.1, 0.95, 0.8, rust, { x: -W * 0.28 + s * 1.2, y: 0.48, z: -D / 2 + 1.1 }), { collider: 'none', mass: 8, surf: 'metal' });
    obj.add(box(1.0, 0.8, 0.7, M.metal('black'), { x: W * 0.05, y: 0.4, z: -0.8 }), { mass: 120, surf: 'metal' });
    for (let i = 0; i < 3; i++) obj.add(cyl(0.12, 0.12, 0.35, M.metal('gray'), { x: W * 0.05 - 0.3 + i * 0.3, y: 0.97, z: -0.8, radial: 8 }), { collider: 'none', mass: 6, surf: 'metal' });
    obj.add(box(0.5, 0.35, 0.5, FIREGLOW, { x: -W * 0.28, y: 1.17, z: -D / 2 + 1.1 }), { collider: 'none', mass: 2, surf: 'metal' });
    obj.add(sph(0.12, LAMP, { x: 0, y: 3.4, z: 1.2, ws: 6, hs: 4, cast: false }), { collider: 'none', mass: 1, surf: 'metal' });
    // draußen: Reifenstapel, Fässer, Schrott
    for (let i = 0; i < 4; i++) obj.add(mk(new THREE.TorusGeometry(0.42, 0.18, 6, 14), M.tread(), { x: -W / 2 - 1.0, y: 0.18 + i * 0.36, z: D / 2 - 1.4, rx: Math.PI / 2 }), { collider: 'none', mass: 10, surf: 'rubber' });
    for (let i = 0; i < 3; i++) obj.add(cyl(0.3, 0.3, 0.9, M.metal(pick(rng, ['rust', 'blue', 'olive'])), { x: W / 2 + 0.9, y: 0.45, z: D / 2 - 0.6 - i * 0.7, radial: 10, rz: i === 2 ? 1.57 : 0, ry: i === 2 ? 0.4 : 0 }), { mass: 20, surf: 'metal' });
    const rb = rubble(rng, 7, 3, M.metal('rust'));
    rb.position.set(W / 2 + 1.2, 0, -D / 2 + 1.5);
    obj.add(rb, { collider: 'none', mass: 14, surf: 'metal' });
    // Rohr und Schild
    obj.add(cyl(0.12, 0.12, H + 0.4, M.metal('gray'), { x: W / 2 - 0.1, y: (H + 0.4) / 2, z: -D / 2 - 0.1, radial: 6 }), { collider: 'none', mass: 8, surf: 'metal' });
    obj.add(sign(2.2, 0.55, 9, { x: -W * 0.2, y: H - 0.55, z: D / 2 + 0.2 }), { collider: 'none', mass: 4, surf: 'metal' });
    obj.add(sandDrift(0, D / 2 + 1, 2.2), { collider: 'none', mass: 4, surf: 'clay' });
  },
};

/* ═════════════ Lagerhalle ═════════════ */
export const warehouse = {
  id: 'warehouse',
  label: 'Lagerhalle',
  category: CAT,
  tag: 'Lager',
  hint: 'Tonnenhalle aus Wellblech mit Rolltor, Laderampe, Oberlichtern und Frachtkisten',
  buildStyle: 'drop',
  params: [
    { key: 'w', label: 'Breite', type: 'range', min: 9, max: 16, step: 0.5, value: 12, unit: 'm' },
    { key: 'd', label: 'Länge', type: 'range', min: 12, max: 26, step: 0.5, value: 18, unit: 'm' },
    { key: 'pal', label: 'Blech', type: 'select', options: PAL_OPTIONS, value: 'sand' },
    damageParam(0.45),
    seedParam(15),
  ],
  build(obj, p) {
    const rng = mulberry32(p.seed);
    const W = p.w, D = p.d, WH = 3.6, rise = W * 0.2;
    const metal = M.metal(p.pal, { side: THREE.DoubleSide }), metalS = M.metal(p.pal), clay = clayM('white'), dark = M.clay('dark');
    const rust = M.metal('rust');
    // Sockel/Seitenwände
    for (const s of [-1, 1]) parts.solid(obj, box(0.4, WH, D, s > 0 ? clay : dark, { x: s * (W / 2 - 0.2), y: WH / 2 }), 0.4, WH, D, 'clay', [1, 2, 4]);
    parts.solid(obj, box(W, WH, 0.4, clay, { y: WH / 2, z: -D / 2 + 0.2 }), W, WH, 0.4, 'clay', [3, 2, 1]);
    // Tonnendach aus Wellblech
    obj.add(vault(W, D, rise, metal, { y: WH }), { fracture: [3, 1, 4], mass: 200, surf: 'metal' });
    // Giebelwand vorn + Rolltor
    const gw = facade('+z', W, D);
    const frontL = box(W * 0.28, WH, 0.4, clay, { x: -W * 0.36, y: WH / 2, z: 0.0 });
    gw.add(frontL);
    gw.add(box(W * 0.28, WH, 0.4, dark, { x: W * 0.36, y: WH / 2, z: 0.0 }));
    gw.add(box(W * 0.44, 0.9, 0.4, clay, { y: WH - 0.45, z: 0.0 }));
    gw.add(box(W * 0.44, WH - 1.2, 0.08, metalS, { y: (WH - 1.2) / 2, z: 0.18 })); // Rolltor teilweise heruntergelassen
    gw.add(box(W * 0.44, 0.9, 0.1, hazardMat(), { y: 0.45, z: 0.24, cast: false }));
    gw.add(gable(W, rise, 0.4, clay, { y: WH }));
    parts.deco(obj, gw, 'clay', 40);
    obj.add(gable(W, rise, 0.4, dark, { y: WH, z: -D / 2 + 0.2 }), { collider: 'none', mass: 60, surf: 'clay' });
    // Oberlichter
    for (let i = 0; i < Math.floor(D / 5); i++) obj.add(box(W * 0.25, 0.1, 1.6, WIN_C, { y: WH + rise + 0.05, z: -D / 2 + 3 + i * 4.8, rx: 0, cast: false }), { collider: 'none', mass: 4, surf: 'metal' });
    // Laderampe + Kisten
    obj.add(box(W * 0.5, 1.0, 3, clay, { y: 0.5, z: D / 2 + 1.5, x: W * 0.05 }), { mass: 80, surf: 'clay' });
    const colors = ['olive', 'rust', 'blue', 'sand', 'gray'];
    for (let i = 0; i < 6 + Math.floor(rng() * 4); i++) {
      const s = between(rng, 0.7, 1.3);
      const onRamp = rng() < 0.4;
      obj.add(box(s, s * 0.8, s, M.metal(pick(rng, colors)), { x: onRamp ? (rng() - 0.5) * W * 0.4 + W * 0.05 : W / 2 + 0.9 + rng() * 1.4, y: onRamp ? 1.0 + s * 0.4 : s * 0.4, z: onRamp ? D / 2 + 1.5 : D / 2 - rng() * 5, ry: rng() }), { mass: 30, surf: 'metal' });
    }
    // Lüfter + Schild + Verwehungen
    obj.add(cyl(0.4, 0.4, 0.4, rust, { x: 0, y: WH + rise + 0.25, z: D * 0.2, radial: 10 }), { collider: 'none', mass: 10, surf: 'metal' });
    obj.add(sign(2.4, 0.6, 12, { y: WH + 0.2, x: -W * 0.1, z: D / 2 + 0.22 }), { collider: 'none', mass: 4, surf: 'metal' });
    obj.add(sandDrift(-W * 0.25, D / 2 + 0.5, 2), { collider: 'none', mass: 4, surf: 'clay' });
    obj.add(sandDrift(W / 2 + 0.4, -D * 0.1, 1.8, 1.57), { collider: 'none', mass: 4, surf: 'clay' });
  },
};

/* ═════════════ Hangar ═════════════ */
export const hangar = {
  id: 'hangar',
  label: 'Hangar',
  category: CAT,
  tag: 'Raumhafen',
  hint: 'Großer Rundbogen-Hangar für Raumschiffe: offene Front, Rippen, Warnstreifen und Landefeld-Beleuchtung',
  buildStyle: 'rise',
  params: [
    { key: 'w', label: 'Breite', type: 'range', min: 16, max: 28, step: 1, value: 22, unit: 'm' },
    { key: 'd', label: 'Länge', type: 'range', min: 18, max: 34, step: 1, value: 26, unit: 'm' },
    { key: 'pal', label: 'Blech', type: 'select', options: PAL_OPTIONS, value: 'gray' },
    damageParam(0.4),
    seedParam(16),
  ],
  build(obj, p) {
    const rng = mulberry32(p.seed);
    const W = p.w, D = p.d, rise = W * 0.46;
    const metal = M.metal(p.pal, { side: THREE.DoubleSide }), rust = M.metal('rust'), dark = M.metal('black'), white = M.metal('white');
    obj.add(vault(W, D, rise, metal, { radial: 18 }), { fracture: [3, 1, 4], mass: 400, surf: 'metal' });
    // Rippen
    const n = Math.round(D / 4);
    const r = (W * W / 4 + rise * rise) / (2 * rise);
    const half = Math.atan2(W / 2, r - rise);
    for (let i = 0; i <= n; i++) {
      const rib = mk(new THREE.TorusGeometry(r + 0.05, 0.12, 4, 22, half * 2), rust, { y: -(r - rise), z: -D / 2 + (D * i) / n, rz: Math.PI / 2 - half });
      obj.add(rib, { collider: 'none', mass: 30, surf: 'metal' });
    }
    // Boden, Rückwand
    obj.add(box(W - 0.4, 0.08, D - 0.4, M.clay('dark'), { y: 0.04, cast: false }), { collider: 'none', mass: 10, surf: 'clay' });
    obj.add(gable(W, rise, 0.4, M.metal(p.pal), { z: -D / 2 + 0.2 }), { fracture: [3, 3, 1], mass: 200, surf: 'metal' });
    // Warnstreifen am Rand, Leuchtfeuer
    for (const s of [-1, 1]) obj.add(box(0.5, 0.06, D, hazardMat(), { x: s * (W / 2 + 0.3), y: 0.03, cast: false }), { collider: 'none', mass: 6, surf: 'metal' });
    obj.add(box(W * 0.5, 0.06, 6, white, { y: 0.1, z: D / 2 + 3, cast: false }), { collider: 'none', mass: 6, surf: 'metal' });
    for (const s of [-1, 1]) {
      obj.add(cyl(0.08, 0.1, 3.6, M.metal('gray'), { x: s * (W / 2 + 0.9), y: 1.8, z: D / 2 + 0.5, radial: 6 }), { collider: 'none', mass: 8, surf: 'metal' });
      obj.add(sph(0.2, LAMP, { x: s * (W / 2 + 0.9), y: 3.7, z: D / 2 + 0.5, ws: 8, hs: 6, cast: false }), { collider: 'none', mass: 2, surf: 'metal' });
    }
    // Anbau (Büro/Lager) an der Seite
    obj.add(rblock(4.5, 3.2, 8, 0.4, clayM('white'), { x: W / 2 + 3.2, z: -D * 0.15, taper: 0.01 }), { fracture: [2, 2, 2], mass: 300, surf: 'clay' });
    obj.add(box(4.6, 0.12, 8.1, rust, { x: W / 2 + 3.2, y: 3.25, z: -D * 0.15 }), { collider: 'none', mass: 40, surf: 'metal' });
    obj.add(box(1.2, 1.2, 0.08, WIN, { x: W / 2 + 3.2, y: 1.8, z: -D * 0.15 + 4.02, cast: false }), { collider: 'none', mass: 4, surf: 'metal' });
    obj.add(sign(3, 0.75, 14, { x: 0, y: rise * 0.68, z: D / 2 + 0.2 }), { collider: 'none', mass: 4, surf: 'metal' });
    // Schiebetor-Laufrahmen offen
    for (const s of [-1, 1]) obj.add(box(0.5, 3.2, 0.5, rust, { x: s * (W / 2 - 0.3), y: 1.6, z: D / 2 - 0.2 }), { collider: 'none', mass: 30, surf: 'metal' });
    obj.add(sandDrift(-W * 0.2, D / 2 + 1, 2.4), { collider: 'none', mass: 4, surf: 'clay' });
    // innen ein Fass- und Kistenlager
    for (let i = 0; i < 4; i++) obj.add(cyl(0.3, 0.3, 0.9, M.metal(pick(rng, ['rust', 'blue', 'olive'])), { x: -W * 0.35 + rng() * 2, y: 0.45, z: -D * 0.3 + i * 1.2, radial: 10 }), { mass: 20, surf: 'metal' });
  },
};

/* ═════════════ Wachturm ═════════════ */
export const watchTower = {
  id: 'watchTower',
  label: 'Wachturm',
  category: CAT,
  tag: 'Sicherheit',
  hint: 'Gedrungener Lehmturm mit Rundum-Plattform, Sonnensegel, Suchscheinwerfer und Funkmast',
  buildStyle: 'rise',
  params: [
    { key: 'h', label: 'Höhe', type: 'range', min: 7, max: 14, step: 0.5, value: 10, unit: 'm' },
    { key: 'clay', label: 'Putz', type: 'select', options: CLAY_OPTIONS, value: 'sand' },
    damageParam(0.4),
    seedParam(17),
  ],
  build(obj, p) {
    const rng = mulberry32(p.seed);
    const H = p.h, B = 3.2;
    const m = clayMats(p.clay);
    const mats = { trim: m.trim, dark: m.dark };
    const rust = M.metal('rust'), gray = M.metal('gray');
    parts.solid(obj, rblock(B + 0.9, 1.0, B + 0.9, 0.4, m.wall, {}), B + 0.9, 1, B + 0.9, 'clay', [2, 1, 2]);
    parts.solid(obj, rblock(B, H - 1, B, 0.5, m.wall, { y: 1.0, taper: 0.12 }), B, H, B, 'clay', [2, 3, 2]);
    // Plattform
    const py = H;
    obj.add(rblock(B + 2.2, 0.35, B + 2.2, 0.8, m.wall, { y: py - 0.2 }), { fracture: [2, 1, 2], mass: 200, surf: 'clay' });
    obj.add(frame(B + 2.1, B + 2.1, 0.2, 0.9, m.wall, { y: py + 0.15, r: 0.8 }), { collider: 'none', mass: 40, surf: 'clay' });
    // Brüstungslücke fürs Gewehr: dunkle Schlitze
    // Fensterschlitze am Schaft
    for (const side of ['+z', '-z', '+x', '-x']) {
      const g = facade(side, B * 0.9, B * 0.9);
      for (let k = 0; k < 2; k++) g.add(box(0.28, 0.9, 0.08, rng() < 0.5 ? WIN : WIN_OFF, { x: (k - 0.5) * 1.2, y: 3 + k * 2.6 + (rng() - 0.5), z: 0.02, cast: false }));
      parts.deco(obj, g, 'clay', 6);
    }
    const g = facade('+z', B * 0.9, B * 0.9);
    addDoor(g, 0, 0.95, 1.9, mats, { door: M.metal('rust') });
    parts.deco(obj, g, 'clay', 12);
    // Sonnensegel über der Plattform
    const roof = new THREE.Group();
    roof.position.set(0, py + 0.2, 0);
    for (const x of [-1, 1]) for (const z of [-1, 1]) roof.add(cyl(0.05, 0.06, 2.4, M.wood(0xb59a78), { x: x * (B / 2 + 0.6), y: 1.2, z: z * (B / 2 + 0.6), radial: 6 }));
    roof.add(cloth(B + 2, B + 2, M.cloth(pick(rng, CLOTH_COLORS)), { y: 2.45, rx: -Math.PI / 2 + 0.1, sag: 0.12, ripple: 0.06, seed: p.seed, segX: 6, segY: 6 }));
    parts.deco(obj, roof, 'cloth', 40);
    // Suchscheinwerfer + Funkmast
    const sl = new THREE.Group();
    sl.position.set(B / 2 + 0.6, py + 0.6, B / 2 + 0.6);
    sl.rotation.y = 0.8;
    sl.add(cyl(0.06, 0.08, 0.7, gray, { y: 0.35, radial: 6 }));
    sl.add(cyl(0.34, 0.26, 0.55, gray, { y: 0.85, z: 0.0, rx: 1.2, radial: 12 }));
    sl.add(cyl(0.3, 0.3, 0.04, LAMP, { y: 0.93, z: 0.26, rx: 1.2, radial: 12, cast: false }));
    parts.deco(obj, sl, 'metal', 14);
    const a = antenna(H * 0.45, gray, { dish: rng() < 0.6, light: true });
    a.position.set(-B / 2 - 0.4, py, -B / 2 - 0.4);
    parts.deco(obj, a, 'metal', 10);
    // Leiter
    const lad = new THREE.Group();
    lad.position.set(B / 2 * 0.0 + 1.5, 0, B / 2 + 0.2);
    lad.add(box(0.04, H, 0.04, rust, { x: -0.2, y: H / 2 }), box(0.04, H, 0.04, rust, { x: 0.2, y: H / 2 }));
    for (let y = 0.4; y < H; y += 0.35) lad.add(box(0.4, 0.03, 0.03, rust, { y }));
    parts.deco(obj, lad, 'metal', 6);
    obj.add(sandDrift(1, B / 2 + 1.2, 1.6), { collider: 'none', mass: 4, surf: 'clay' });
  },
};

/* ═════════════ Minarett ═════════════ */
export const spire = {
  id: 'spire',
  label: 'Minarett',
  category: CAT,
  tag: 'Wahrzeichen',
  hint: 'Schlanker Rundturm mit Balkonen, Zwiebelkuppel und leuchtendem Kristall an der Spitze',
  buildStyle: 'rise',
  params: [
    { key: 'h', label: 'Höhe', type: 'range', min: 14, max: 30, step: 1, value: 21, unit: 'm' },
    { key: 'clay', label: 'Putz', type: 'select', options: CLAY_OPTIONS, value: 'white' },
    { key: 'color', label: 'Kristall', type: 'select', options: [['cyan', 'Cyan'], ['amber', 'Bernstein'], ['violet', 'Violett']], value: 'cyan' },
    damageParam(0.3),
    seedParam(18),
  ],
  build(obj, p) {
    const rng = mulberry32(p.seed);
    const H = p.h;
    const m = clayMats(p.clay);
    const col = { cyan: 0x3ad8ff, amber: 0xffb347, violet: 0xb86cff }[p.color];
    const rust = M.metal('rust');
    // Sockel (viereckig), Schaft (rund, verjüngt), Balkone, Kuppel
    parts.solid(obj, rblock(5.2, 2.2, 5.2, 0.6, m.wall, { taper: 0.05 }), 5.2, 2.2, 5.2, 'clay', [2, 1, 2]);
    const r0 = 1.55, r1 = 1.0;
    parts.solid(obj, cyl(r1, r0, H * 0.78, m.wall, { y: 2.2 + H * 0.39, radial: 16, hseg: 2 }), 3, H * 0.78, 3, 'clay', [2, 4, 2]);
    const topY = 2.2 + H * 0.78;
    for (const t of [0.25, 0.55, 0.9]) {
      const y = 2.2 + H * 0.78 * t, r = r0 + (r1 - r0) * t;
      obj.add(cyl(r + 0.6, r + 0.5, 0.22, m.trim, { y, radial: 16 }), { collider: 'none', mass: 40, surf: 'clay' });
      obj.add(cyl(r + 0.5, r + 0.5, 0.06, rust, { y: y + 0.5, radial: 16, cast: false }), { collider: 'none', mass: 10, surf: 'metal' });
    }
    // Fensterschlitze leuchtend
    for (let i = 0; i < 6; i++) {
      const a = i * 1.05 + 0.3, t = 0.18 + i * 0.12, y = 2.2 + H * 0.78 * t, r = r0 + (r1 - r0) * t;
      obj.add(box(0.28, 0.9, 0.08, rng() < 0.5 ? WIN : WIN_C, { x: Math.sin(a) * (r - 0.02), y, z: Math.cos(a) * (r - 0.02), ry: a, cast: false }), { collider: 'none', mass: 3, surf: 'clay' });
    }
    // Spitze: Zwiebelkuppel + Nadel + Kristall
    obj.add(cyl(r1 + 0.9, r1 + 0.7, 0.4, m.trim, { y: topY + 0.1, radial: 16 }), { collider: 'none', mass: 30, surf: 'clay' });
    obj.add(sph(1.45, M.metal('rust', { side: THREE.DoubleSide }), { y: topY + 1.2, sy: 1.25, ws: 14, hs: 10 }), { collider: 'none', mass: 60, surf: 'metal' });
    obj.add(cyl(0.02, 0.45, 1.8, M.metal('rust'), { y: topY + 3.2, radial: 12 }), { collider: 'none', mass: 20, surf: 'metal' });
    obj.add(crystal(1.1, 0.26, { y: topY + 4.6 }, col, 2.4), { collider: 'none', mass: 6, surf: 'metal' });
    // Türbogen am Fuß
    const g = facade('+z', 5.2, 5.2);
    addDoor(g, 0, 1.3, 2.0, { trim: m.trim }, { door: M.wood(0x8a6a44) });
    parts.deco(obj, g, 'clay', 12);
    obj.add(sandDrift(1.2, 3, 1.6), { collider: 'none', mass: 4, surf: 'clay' });
  },
};

/* ═════════════ Wasserturm ═════════════ */
export const waterTower = {
  id: 'waterTower',
  label: 'Wasserturm',
  category: CAT,
  tag: 'Versorgung',
  hint: 'Hochbehälter auf Gitterbeinen mit Leiter und Fallrohr – die wichtigste Marke der Stadt',
  buildStyle: 'drop',
  params: [
    { key: 'h', label: 'Höhe', type: 'range', min: 8, max: 16, step: 0.5, value: 11, unit: 'm' },
    { key: 'r', label: 'Tank-Radius', type: 'range', min: 1.6, max: 3.2, step: 0.1, value: 2.4, unit: 'm' },
    { key: 'pal', label: 'Tank', type: 'select', options: PAL_OPTIONS, value: 'blue' },
    damageParam(0.5),
    seedParam(19),
  ],
  build(obj, p) {
    const rng = mulberry32(p.seed);
    const H = p.h, R = p.r;
    const tankM = M.metal(p.pal, { side: THREE.DoubleSide }), rust = M.metal('rust'), gray = M.metal('gray');
    const legs = lattice(R * 0.85, R * 0.75, H, 3, rust, rust, 0.13);
    obj.add(legs, { fracture: [1, 3, 1], mass: 300, surf: 'metal', collider: { type: 'box', size: [R * 1.7, H, R * 1.7], offset: [0, H / 2, 0] } });
    obj.add(cyl(R, R, R * 1.5, tankM, { y: H + R * 0.75, radial: 18 }), { fracture: [2, 1, 2], mass: 400, surf: 'metal' });
    obj.add(sph(R, tankM, { y: H + R * 1.5, thetaLength: Math.PI / 2, ws: 18, hs: 5, sy: 0.45 }), { collider: 'none', mass: 100, surf: 'metal' });
    obj.add(sph(R, tankM, { y: H, thetaStart: Math.PI / 2, thetaLength: Math.PI / 2, ws: 18, hs: 5, sy: 0.4 }), { collider: 'none', mass: 100, surf: 'metal' });
    for (const y of [0.2, 0.75, 1.3]) obj.add(cyl(R + 0.05, R + 0.05, 0.08, rust, { y: H + R * y, radial: 18, cast: false }), { collider: 'none', mass: 10, surf: 'metal' });
    // Leiter bis zum Tank, Fallrohr, Plattform
    const lad = new THREE.Group();
    lad.position.set(R * 0.9, 0, R * 0.9);
    lad.rotation.y = Math.PI / 4;
    lad.add(box(0.05, H + R, 0.05, gray, { x: -0.25, y: (H + R) / 2 }), box(0.05, H + R, 0.05, gray, { x: 0.25, y: (H + R) / 2 }));
    for (let y = 0.4; y < H + R; y += 0.4) lad.add(box(0.5, 0.035, 0.035, gray, { y }));
    obj.add(lad, { collider: 'none', mass: 30, surf: 'metal' });
    obj.add(cyl(0.16, 0.16, H, M.metal('gray'), { x: -R * 0.5, y: H / 2, z: -R * 0.5, radial: 8 }), { collider: 'none', mass: 30, surf: 'metal' });
    obj.add(box(R * 2.4, 0.12, R * 2.4, rust, { y: H - 0.1 }), { collider: 'none', mass: 60, surf: 'metal' });
    obj.add(sign(R * 1.5, R * 0.4, 4, { y: H + R * 0.8, z: R + 0.03 }), { collider: 'none', mass: 4, surf: 'metal' });
    // Sockelbetonblock
    obj.add(box(R * 2.2, 0.4, R * 2.2, M.clay('dark'), { y: 0.2 }), { mass: 100, surf: 'clay' });
    obj.add(sandDrift(R, R * 1.3, 1.4), { collider: 'none', mass: 4, surf: 'clay' });
  },
};

/* ═════════════ Zisterne ═════════════ */
export const cistern = {
  id: 'cistern',
  label: 'Zisterne',
  category: CAT,
  tag: 'Versorgung',
  hint: 'Stehender Wassertank mit Rohren, Ventilen und Warnstreifen – Wasser ist hier Währung',
  buildStyle: 'pop',
  params: [
    { key: 'r', label: 'Radius', type: 'range', min: 2, max: 5, step: 0.25, value: 3, unit: 'm' },
    { key: 'h', label: 'Höhe', type: 'range', min: 3, max: 7, step: 0.25, value: 5, unit: 'm' },
    { key: 'pal', label: 'Blech', type: 'select', options: PAL_OPTIONS, value: 'sand' },
    damageParam(0.5),
    seedParam(20),
  ],
  build(obj, p) {
    const rng = mulberry32(p.seed);
    const R = p.r, H = p.h;
    const m = M.metal(p.pal), rust = M.metal('rust'), gray = M.metal('gray');
    obj.add(cyl(R + 0.3, R + 0.4, 0.4, M.clay('dark'), { y: 0.2, radial: 20 }), { mass: 200, surf: 'clay' });
    obj.add(cyl(R, R, H, m, { y: 0.4 + H / 2, radial: 24, hseg: 2 }), { fracture: [3, 2, 3], mass: 500, surf: 'metal' });
    obj.add(sph(R, m, { y: 0.4 + H, thetaLength: Math.PI / 2, sy: 0.3, ws: 24, hs: 4 }), { collider: 'none', mass: 100, surf: 'metal' });
    obj.add(cyl(R + 0.03, R + 0.03, 0.5, hazardMat(), { y: 1.1, radial: 24, cast: false }), { collider: 'none', mass: 10, surf: 'metal' });
    for (const y of [0.35, 0.7]) obj.add(cyl(R + 0.05, R + 0.05, 0.07, rust, { y: 0.4 + H * y, radial: 24, cast: false }), { collider: 'none', mass: 8, surf: 'metal' });
    const lad = new THREE.Group();
    lad.position.set(0, 0, R + 0.06);
    lad.add(box(0.05, H, 0.05, gray, { x: -0.25, y: 0.4 + H / 2 }), box(0.05, H, 0.05, gray, { x: 0.25, y: 0.4 + H / 2 }));
    for (let y = 0.8; y < H; y += 0.4) lad.add(box(0.5, 0.035, 0.035, gray, { y }));
    obj.add(lad, { collider: 'none', mass: 20, surf: 'metal' });
    // Rohre + Ventil
    const a = rng() * 6;
    const pipe = new THREE.Group();
    pipe.rotation.y = a;
    pipe.add(cyl(0.18, 0.18, 2.4, gray, { x: R + 1.1, y: 0.9, rz: Math.PI / 2, radial: 8 }));
    pipe.add(cyl(0.18, 0.18, 1.2, gray, { x: R + 2.2, y: 0.3, radial: 8 }));
    pipe.add(torus(0.28, 0.05, M.metal('red'), { x: R + 1.1, y: 1.3, ry: Math.PI / 2, ts: 10 }));
    obj.add(pipe, { collider: 'none', mass: 30, surf: 'metal' });
    obj.add(sign(R * 1.2, R * 0.3, 2, { y: H * 0.7, z: R + 0.04, ry: 0 }), { collider: 'none', mass: 2, surf: 'metal' });
    obj.add(sandDrift(R * 0.9, R * 0.9, 1.6), { collider: 'none', mass: 4, surf: 'clay' });
  },
};

/* ═════════════ Brunnen / Tauspender ═════════════ */
export const fountain = {
  id: 'fountain',
  label: 'Tauspender',
  category: CAT,
  tag: 'Platz',
  hint: 'Gemeinschaftsbrunnen mit Becken, Säule und Kondensationsschale – hier holen die Leute ihr Wasser',
  buildStyle: 'rise',
  params: [
    { key: 'r', label: 'Radius', type: 'range', min: 2, max: 5, step: 0.25, value: 3, unit: 'm' },
    { key: 'clay', label: 'Stein', type: 'select', options: CLAY_OPTIONS, value: 'white' },
    seedParam(21),
  ],
  build(obj, p) {
    const R = p.r, m = clayMats(p.clay);
    obj.add(cyl(R + 0.7, R + 0.8, 0.25, m.trim, { y: 0.12, radial: 24 }), { mass: 200, surf: 'clay' });
    obj.add(cyl(R + 0.3, R + 0.3, 0.9, m.wall, { y: 0.7, radial: 24, open: true }), { fracture: [4, 1, 1], mass: 300, surf: 'clay' });
    obj.add(torus(R + 0.3, 0.13, m.trim, { y: 1.16, rx: Math.PI / 2, ts: 28, rs: 6 }), { collider: 'none', mass: 30, surf: 'clay' });
    obj.add(cyl(R - 0.1, R - 0.1, 0.05, waterMat(), { y: 0.85, radial: 24, cast: false }), { collider: 'none', mass: 4, surf: 'metal' });
    obj.add(cyl(0.35, 0.5, 2.4, m.wall, { y: 1.3, radial: 12 }), { fracture: [1, 3, 1], mass: 200, surf: 'clay' });
    obj.add(sph(R * 0.55, M.metal('rust', { side: THREE.DoubleSide }), { y: 3.0, thetaLength: Math.PI / 2, sy: 0.4, ws: 16, hs: 4 }), { collider: 'none', mass: 40, surf: 'metal' });
    obj.add(sph(0.2, LAMP, { y: 3.65, ws: 8, hs: 6, cast: false }), { collider: 'none', mass: 2, surf: 'metal' });
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + 0.4;
      obj.add(cyl(0.06, 0.06, 0.5, M.metal('gray'), { x: Math.sin(a) * (R + 0.5), y: 1.5, z: Math.cos(a) * (R + 0.5), rz: 0, radial: 6 }), { collider: 'none', mass: 4, surf: 'metal' });
    }
  },
};

/* ═════════════ Ziehbrunnen ═════════════ */
export const well = {
  id: 'well',
  label: 'Ziehbrunnen',
  category: CAT,
  tag: 'Platz',
  hint: 'Alter Schachtbrunnen mit Seilwinde, Eimer und Trog',
  buildStyle: 'pop',
  params: [seedParam(22)],
  build(obj, p) {
    const m = clayMats('sand'), wood = M.wood(0xb59a78), rust = M.metal('rust');
    obj.add(cyl(1.2, 1.3, 0.9, m.wall, { y: 0.45, radial: 14, open: false }), { fracture: [3, 1, 1], mass: 250, surf: 'clay' });
    obj.add(cyl(0.85, 0.85, 0.05, M.dark(0x050505), { y: 0.92, radial: 14, cast: false }), { collider: 'none', mass: 2, surf: 'clay' });
    for (const s of [-1, 1]) obj.add(box(0.14, 2.6, 0.14, wood, { x: s * 1.0, y: 1.6, z: 0 }), { mass: 20, surf: 'wood' });
    obj.add(box(2.4, 0.14, 0.14, wood, { y: 2.8 }), { mass: 20, surf: 'wood' });
    obj.add(cyl(0.12, 0.12, 2.1, rust, { y: 2.55, rz: Math.PI / 2, radial: 8 }), { collider: 'none', mass: 8, surf: 'metal' });
    obj.add(cyl(0.012, 0.012, 1.5, M.dark(0x44382a), { x: 0.05, y: 2.0, radial: 4, cast: false }), { collider: 'none', mass: 1, surf: 'cloth' });
    obj.add(cyl(0.2, 0.16, 0.3, rust, { x: 0.05, y: 1.2, radial: 10 }), { collider: 'none', mass: 4, surf: 'metal' });
    obj.add(box(1.6, 0.4, 0.6, wood, { x: 0.4, y: 0.2, z: 1.8, ry: 0.3 }), { mass: 30, surf: 'wood' });
    obj.add(box(1.4, 0.04, 0.45, waterMat(), { x: 0.4, y: 0.4, z: 1.8, ry: 0.3, cast: false }), { collider: 'none', mass: 1, surf: 'metal' });
    obj.add(sandDrift(-1, 1.5, 1.4), { collider: 'none', mass: 4, surf: 'clay' });
  },
};

/* ═════════════ Denkmal ═════════════ */
export const monument = {
  id: 'monument',
  label: 'Gründerstein',
  category: CAT,
  tag: 'Wahrzeichen',
  hint: 'Monolith auf Stufen mit leuchtenden Zeichen, Feuerschalen und Pollern – Mittelpunkt des Hauptplatzes',
  buildStyle: 'rise',
  params: [
    { key: 'h', label: 'Höhe', type: 'range', min: 9, max: 20, step: 0.5, value: 14, unit: 'm' },
    { key: 'color', label: 'Leuchten', type: 'select', options: [['cyan', 'Cyan'], ['amber', 'Bernstein'], ['violet', 'Violett']], value: 'amber' },
    damageParam(0.3),
    seedParam(23),
  ],
  build(obj, p) {
    const H = p.h;
    const stone = M.clay('ochre'), light = clayM('white');
    const col = { cyan: 0x3ad8ff, amber: 0xffb347, violet: 0xb86cff }[p.color];
    // Stufen
    parts.solid(obj, rblock(11, 0.5, 11, 1.2, light, {}), 11, 0.5, 11, 'clay', [3, 1, 3]);
    parts.solid(obj, rblock(8.5, 0.5, 8.5, 1.0, light, { y: 0.5 }), 8.5, 0.5, 8.5, 'clay', [3, 1, 3]);
    parts.solid(obj, rblock(6, 0.6, 6, 0.8, stone, { y: 1.0 }), 6, 0.6, 6, 'clay', [2, 1, 2]);
    // Monolith: verjüngter Block, schräg abgeschnitten
    parts.solid(obj, rblock(2.6, H, 2.0, 0.3, stone, { y: 1.6, taper: 0.45 }), 2.6, H, 2.0, 'clay', [2, 5, 2]);
    // leuchtende Zeichenbänder
    for (let i = 0; i < 4; i++) {
      const t = 0.18 + i * 0.2, y = 1.6 + H * t, k = 1 - 0.45 * t;
      obj.add(box(1.9 * k, 0.3, 0.06, new THREE.MeshStandardMaterial({ color: 0x151008, emissive: col, emissiveIntensity: 1.4 }), { y, z: 1.0 * k + 0.02, cast: false }), { collider: 'none', mass: 4, surf: 'metal' });
    }
    obj.add(crystal(2.2, 0.5, { y: 1.6 + H + 1.2 }, col, 2.2), { collider: 'none', mass: 10, surf: 'metal' });
    // Feuerschalen an den Ecken + Poller
    for (const x of [-1, 1]) for (const z of [-1, 1]) {
      const px = x * 4.2, pz = z * 4.2;
      obj.add(cyl(0.18, 0.28, 1.2, M.metal('rust'), { x: px, y: 1.0 + 0.6, z: pz, radial: 8 }), { mass: 30, surf: 'metal' });
      obj.add(cyl(0.5, 0.2, 0.35, M.metal('rust'), { x: px, y: 2.4, z: pz, radial: 10 }), { collider: 'none', mass: 10, surf: 'metal' });
      obj.add(sph(0.38, FIREGLOW, { x: px, y: 2.6, z: pz, ws: 8, hs: 5, sy: 0.7, cast: false }), { collider: 'none', mass: 2, surf: 'metal' });
    }
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      obj.add(cyl(0.18, 0.22, 0.8, M.metal('gray'), { x: Math.sin(a) * 6.8, y: 0.4, z: Math.cos(a) * 6.8, radial: 8 }), { collider: 'none', mass: 12, surf: 'metal' });
    }
  },
};
