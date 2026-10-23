// Wohnbauten der Stadt: Lehmhaus, Terrassenhaus, Mietshaus, Blechhütte, Zelt, Ruine.
// Maße w × d sind die Grundfläche des Gebäudes (Anbauten wie Treppen oder Planen ragen bis ca. 1,5 m darüber hinaus).
import {
  CAT, THREE, M, box, cyl, sph, mk, mulberry32, rblock, frame, arch, stairs, facade, addWindow, addDoor, tank, antenna, awning,
  pick, between, clayMats, clayM, sandDrift, rubble, parts, WIN, WIN_OFF, LAMP, CLOTH_COLORS, SHUTTER_PALS, sign, cloth,
} from './town.js';
import { solarMat } from './kit.js';
import { damageParam, seedParam, CLAY_OPTIONS } from './_common.js';

const FH = 2.9; // Geschosshöhe

// Weltposition eines Punktes auf einer Blockseite (u entlang der Wand, out nach außen) – für die Überdeckungsprüfung von Fenstern
function faceWorld(b, side, u, out) {
  if (side === '+z') return [b.x + u, b.z + b.d / 2 + out];
  if (side === '-z') return [b.x - u, b.z - b.d / 2 - out];
  if (side === '+x') return [b.x + b.w / 2 + out, b.z - u];
  return [b.x - b.w / 2 - out, b.z + u];
}
const inside = (blocks, self, x, z) => blocks.some((o) => o !== self && Math.abs(x - o.x) < o.w / 2 + 0.2 && Math.abs(z - o.z) < o.d / 2 + 0.2);

// Fenster einer Blockseite verteilen. skip = [u0,u1] Bereich ohne Fenster (Tür)
function windowsFor(obj, rng, blocks, b, side, mats, { shut, skipU = null, density = 1, floors = null, lit = 0.38, patches = 0 }) {
  const L = side === '+z' || side === '-z' ? b.w : b.d;
  const n = Math.floor((L - 1.4) / (2.5 / density));
  if (n < 1) return;
  const g = facade(side, b.w, b.d, b.x, b.z);
  const gap = (L - 1.6) / n;
  const F = floors ?? Math.max(1, Math.round(b.h / FH));
  let count = 0;
  for (let i = 0; i < n; i++) {
    const u = -((n - 1) / 2) * gap + i * gap + (rng() - 0.5) * 0.3;
    const [wx, wz] = faceWorld(b, side, u, 0.15);
    if (inside(blocks, b, wx, wz)) continue;
    for (let f = 0; f < F; f++) {
      if (skipU && f === 0 && u > skipU[0] && u < skipU[1]) continue;
      if (rng() < 0.12) continue; // unregelmäßig: manche Fenster fehlen/vermauert
      addWindow(g, u, f * FH + 1.65 + (rng() - 0.5) * 0.15, between(rng, 0.7, 1.0), between(rng, 0.9, 1.3), mats, {
        lit: rng() < lit, cool: rng() < 0.12, shut: rng() < 0.3 ? shut : null, round: rng() < 0.07,
      });
      count++;
    }
  }
  // Putzschäden und Blechflicken
  for (let k = 0; k < patches; k++) {
    const u = (rng() - 0.5) * (L - 1.5), y = 0.8 + rng() * (b.h - 1.5);
    const [wx, wz] = faceWorld(b, side, u, 0.1);
    if (inside(blocks, b, wx, wz)) continue;
    const bw = between(rng, 0.5, 1.4), bh = between(rng, 0.4, 1.0);
    g.add(box(bw, bh, 0.03, rng() < 0.65 ? mats.dark : M.metal(pick(rng, ['rust', 'gray', 'sand'])), { x: u, y, z: 0.015, ry: 0, rz: (rng() - 0.5) * 0.15, cast: false }));
  }
  if (g.children.length) parts.deco(obj, g, 'clay', 12);
}

/* ═════════════ Lehmhaus ═════════════ */
export const adobeHouse = {
  id: 'adobeHouse',
  label: 'Lehmhaus',
  category: CAT,
  tag: 'Wohnen',
  hint: 'Flachdachhaus aus Lehm mit Anbauten, Dachterrasse, Fensterläden und Flickstellen – das Standardhaus der Stadt',
  buildStyle: 'rise',
  params: [
    { key: 'w', label: 'Breite', type: 'range', min: 6, max: 14, step: 0.5, value: 9, unit: 'm' },
    { key: 'd', label: 'Tiefe', type: 'range', min: 6, max: 14, step: 0.5, value: 8, unit: 'm' },
    { key: 'floors', label: 'Geschosse', type: 'range', min: 1, max: 3, step: 1, value: 2 },
    { key: 'clay', label: 'Putz', type: 'select', options: CLAY_OPTIONS, value: 'sand' },
    { key: 'roof', label: 'Dachaufbauten', type: 'range', min: 0, max: 1, step: 0.01, value: 0.6, fmt: (v) => Math.round(v * 100) + ' %' },
    damageParam(0.4),
    seedParam(5),
  ],
  build(obj, p) {
    const rng = mulberry32(p.seed);
    const W = p.w, D = p.d, F = Math.round(p.floors), dm = p.damage;
    const m = clayMats(p.clay);
    const mats = { trim: m.trim, dark: m.dark };
    const shut = M.metal(pick(rng, SHUTTER_PALS));
    const doorMat = M.metal(pick(rng, ['rust', 'blue', 'olive', 'gray', 'red']));
    const H = F * FH + (rng() - 0.5) * 0.25;
    const lowH = Math.max(FH, H - FH * (rng() < 0.7 ? 1 : 0.5));
    const t = Math.floor(rng() * 4);
    const blocks = [];
    let doorBlock = 0;
    if (t === 0) blocks.push({ x: 0, z: 0, w: W, d: D, h: H });
    else if (t === 1) { // zwei Häuser nebeneinander, das rechte niedriger
      const wa = W * between(rng, 0.5, 0.65);
      const db = D * between(rng, 0.8, 1);
      blocks.push({ x: -W / 2 + wa / 2, z: 0, w: wa, d: D, h: H });
      blocks.push({ x: W / 2 - (W - wa) / 2, z: D / 2 - db / 2, w: W - wa, d: db, h: lowH });
      doorBlock = rng() < 0.5 ? 0 : 1;
    } else if (t === 2) { // Haupthaus vorn, niedriger Anbau hinten
      const dm1 = D * between(rng, 0.6, 0.72);
      blocks.push({ x: 0, z: D / 2 - dm1 / 2, w: W, d: dm1, h: H });
      blocks.push({ x: (rng() - 0.5) * W * 0.2, z: -D / 2 + (D - dm1) / 2, w: W * between(rng, 0.6, 0.85), d: D - dm1, h: lowH });
    } else { // L-Form
      const wa = W * between(rng, 0.55, 0.68);
      blocks.push({ x: -W / 2 + wa / 2, z: 0, w: wa, d: D, h: H });
      const db = D * between(rng, 0.5, 0.62);
      blocks.push({ x: W / 2 - (W - wa) / 2, z: -D / 2 + db / 2, w: W - wa, d: db, h: lowH });
    }
    const door = blocks[doorBlock];
    const doorU = (rng() - 0.5) * Math.max(0, door.w - 3.6);

    blocks.forEach((b, bi) => {
      const body = rblock(b.w, b.h, b.d, between(rng, 0.3, 0.7), m.wall, { x: b.x, z: b.z, taper: 0.015 });
      parts.solid(obj, body, b.w, b.h, b.d, 'clay', [2, 2, 2]);
      const topW = b.w * 0.985, topD = b.d * 0.985;
      parts.deco(obj, frame(topW - 0.1, topD - 0.1, 0.26, between(rng, 0.45, 0.7), m.wall, { x: b.x, y: b.h, z: b.z, r: 0.4 }), 'clay', 30);
      // Dachboden-Schmutzfläche gibt die Wetter-Shader automatisch
      for (const side of ['+z', '-z', '+x', '-x']) {
        windowsFor(obj, rng, blocks, b, side, mats, {
          shut, density: 1, lit: 0.36, patches: Math.round(dm * 2.2 + rng()),
          skipU: bi === doorBlock && side === '+z' && b.z + b.d / 2 > D / 2 - 0.3 ? [doorU - 1.7, doorU + 1.7] : null,
        });
      }
    });

    // Tür an der Front des Türblocks
    {
      const g = facade('+z', door.w, door.d, door.x, door.z);
      addDoor(g, doorU, 1.3, 2.25, mats, { door: doorMat, open: rng() < 0.35 });
      if (rng() < 0.6) {
        const a = awning(2.7, 1.4, 2.55, 3.0, pick(rng, CLOTH_COLORS), { seed: p.seed });
        a.position.set(doorU, 0, 0.1);
        g.add(a);
      }
      parts.deco(obj, g, 'clay', 20);
    }

    // Außentreppe aufs Dach/zum Obergeschoss
    if (F >= 2 && rng() < 0.65) {
      const b = blocks[0];
      const side = rng() < 0.5 ? '+x' : '-x';
      const g = facade(side, b.w, b.d, b.x, b.z);
      const run = 3.4;
      const st = stairs(FH, run, 1.0, 10, m.wall, { ry: Math.PI / 2, x: -b.d * 0.5 + 1.2, z: 0.55 });
      g.add(st);
      g.add(box(1.3, 0.16, 1.1, m.trim, { x: -b.d * 0.5 + 1.2 + run + 0.4, y: FH, z: 0.55 }));
      addDoor(g, -b.d * 0.5 + 1.2 + run + 0.4, 1.0, 1.9, mats, { door: doorMat });
      // addDoor sitzt auf Bodenhöhe → Tür auf Höhe des Absatzes heben
      g.children[g.children.length - 1].position.y += FH;
      g.children[g.children.length - 2].position.y += FH;
      g.children[g.children.length - 3].position.y += FH;
      g.children[g.children.length - 4].position.y += FH;
      parts.deco(obj, g, 'clay', 40);
    }

    // Dachaufbauten
    const top = blocks.reduce((a, b) => (b.h > a.h ? b : a), blocks[0]);
    const nRoof = Math.round(p.roof * 3 + rng() * 0.9);
    const used = new Set();
    for (let i = 0; i < nRoof; i++) {
      const kind = pick(rng, ['tank', 'antenna', 'hut', 'solar', 'vent', 'laundry', 'terrace', 'crates']);
      if (used.has(kind)) continue;
      used.add(kind);
      const px = top.x + (rng() - 0.5) * Math.max(0.5, top.w - 3), pz = top.z + (rng() - 0.5) * Math.max(0.5, top.d - 3);
      let g;
      if (kind === 'tank') g = tank(between(rng, 0.6, 0.95), between(rng, 1.0, 1.5), M.metal(pick(rng, ['blue', 'rust', 'gray', 'white'])), M.metal('gray'), { x: px, y: top.h, z: pz });
      else if (kind === 'antenna') { g = antenna(between(rng, 3, 6), M.metal('gray'), { dish: rng() < 0.5, light: rng() < 0.5 }); g.position.set(px, top.h, pz); }
      else if (kind === 'hut') {
        g = new THREE.Group();
        g.position.set(px, top.h, pz);
        g.rotation.y = Math.floor(rng() * 4) * Math.PI / 2;
        g.add(rblock(2.1, 2.3, 2.1, 0.3, m.wall, { taper: 0.02 }));
        g.add(frame(2.0, 2.0, 0.2, 0.25, m.wall, { y: 2.3, r: 0.25 }));
        g.add(arch(0.85, 1.7, 0.08, WIN_OFF, { z: 1.05 }));
      } else if (kind === 'solar') {
        g = new THREE.Group();
        g.position.set(px, top.h + 0.55, pz);
        g.rotation.y = rng() * 0.5 - 0.25;
        g.add(box(1.8, 0.05, 1.1, solarMat(), { rx: -0.6 }));
        g.add(box(0.06, 0.5, 0.06, M.metal('gray'), { y: -0.28, z: -0.2 }));
      } else if (kind === 'vent') {
        g = new THREE.Group();
        g.position.set(px, top.h, pz);
        g.add(cyl(0.22, 0.26, 0.9, M.metal('gray'), { y: 0.45, radial: 8 }));
        g.add(cyl(0.34, 0.1, 0.18, M.metal('rust'), { y: 1.0, radial: 8 }));
      } else if (kind === 'laundry') {
        g = new THREE.Group();
        g.position.set(px, top.h, pz);
        g.rotation.y = rng() < 0.5 ? 0 : Math.PI / 2;
        for (const s of [-1, 1]) g.add(cyl(0.03, 0.03, 1.9, M.metal('gray'), { x: s * 1.6, y: 0.95, radial: 5 }));
        g.add(box(3.2, 0.015, 0.015, M.dark(0x222222), { y: 1.8 }));
        for (let k = 0; k < 4; k++) g.add(cloth(0.5, 0.8, M.cloth(pick(rng, CLOTH_COLORS)), { x: -1.2 + k * 0.8, y: 1.38, sag: 0, ripple: 0.05, segX: 2, segY: 2, ry: (rng() - 0.5) * 0.3 }));
      } else if (kind === 'terrace') {
        g = awning(3.2, 2.2, 2.2, 2.7, pick(rng, CLOTH_COLORS), { seed: p.seed + 3 });
        g.position.set(px, top.h, pz);
        g.rotation.y = rng() * 6.28;
      } else {
        g = new THREE.Group();
        g.position.set(px, top.h, pz);
        for (let k = 0; k < 3; k++) g.add(box(0.7, 0.6, 0.7, M.wood(0xb59a78), { x: k * 0.75 - 0.7, y: 0.3 + (k === 1 ? 0.6 : 0), z: (rng() - 0.5) * 0.3, ry: rng() }));
      }
      parts.deco(obj, g, 'metal', 14);
    }

    // Verwehungen, Schutt, schiefer Balken
    const sd = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const b = pick(rng, blocks);
      const side = rng() < 0.5 ? 1 : -1;
      sd.add(sandDrift(b.x + side * (b.w / 2 - rng() * b.w * 0.4), b.z + b.d / 2 + 0.2, between(rng, 0.8, 1.6), rng() * 0.6 - 0.3));
    }
    parts.deco(obj, sd, 'clay', 4);
    if (dm > 0.3) {
      const b = pick(rng, blocks);
      const r = rubble(rng, 3 + Math.round(dm * 5), 2.4, m.dark);
      r.position.set(b.x + (rng() < 0.5 ? 1 : -1) * (b.w / 2 + 0.3), 0, b.z + b.d / 2 - 0.5 - rng() * 2);
      parts.deco(obj, r, 'clay', 14);
    }
  },
};

/* ═════════════ Terrassenhaus ═════════════ */
export const stackHouse = {
  id: 'stackHouse',
  label: 'Terrassenhaus',
  category: CAT,
  tag: 'Wohnen',
  hint: 'Gestapelte Lehmwürfel mit Terrassen, Außentreppen und bunten Türen – nach hinten ansteigend',
  buildStyle: 'rise',
  params: [
    { key: 'w', label: 'Breite', type: 'range', min: 7, max: 14, step: 0.5, value: 10, unit: 'm' },
    { key: 'd', label: 'Tiefe', type: 'range', min: 7, max: 13, step: 0.5, value: 9, unit: 'm' },
    { key: 'tiers', label: 'Ebenen', type: 'range', min: 2, max: 4, step: 1, value: 3 },
    { key: 'clay', label: 'Putz', type: 'select', options: CLAY_OPTIONS, value: 'white' },
    damageParam(0.35),
    seedParam(8),
  ],
  build(obj, p) {
    const rng = mulberry32(p.seed);
    const n = Math.round(p.tiers), dm = p.damage;
    const m = clayMats(p.clay);
    const mats = { trim: m.trim, dark: m.dark };
    const accent = M.metal(pick(rng, ['blue', 'rust', 'olive', 'red']));
    const tiers = [];
    let prev = null;
    for (let i = 0; i < n; i++) {
      let t;
      if (!prev) t = { x: 0, z: 0, w: p.w, d: p.d, y: 0, h: FH + (rng() - 0.5) * 0.2 };
      else {
        const w = prev.w * between(rng, 0.62, 0.8), d = prev.d * between(rng, 0.6, 0.78);
        const sx = (prev.w - w) / 2, sz = (prev.d - d) / 2;
        t = { x: prev.x + (rng() * 2 - 1) * sx * 0.9, z: prev.z - sz * between(rng, 0.3, 0.95), w, d, y: prev.y + prev.h, h: FH * between(rng, 0.9, 1.05) };
      }
      tiers.push(t);
      prev = t;
    }
    tiers.forEach((t, i) => {
      parts.solid(obj, rblock(t.w, t.h, t.d, between(rng, 0.4, 0.8), m.wall, { x: t.x, y: t.y, z: t.z, taper: 0.012 }), t.w, t.h, t.d, 'clay', [2, 1, 2]);
      parts.deco(obj, frame(t.w - 0.1, t.d - 0.1, 0.24, 0.5, m.wall, { x: t.x, y: t.y + t.h, z: t.z, r: 0.45 }), 'clay', 24);
      const below = tiers[i - 1];
      // Fenster auf allen freien Seiten
      for (const side of ['+z', '-z', '+x', '-x']) {
        const L = side === '+z' || side === '-z' ? t.w : t.d;
        const cnt = Math.max(1, Math.floor((L - 1.6) / 2.8));
        const g = facade(side, t.w, t.d, t.x, t.z);
        for (let k = 0; k < cnt; k++) {
          const u = -((cnt - 1) / 2) * 2.8 + k * 2.8;
          if (side === '+z' && k === Math.floor(cnt / 2) && (below ? t.z + t.d / 2 < below.z + below.d / 2 - 1.4 : true)) continue; // Platz für die Tür
          addWindow(g, u, t.y + 1.6, between(rng, 0.7, 0.95), between(rng, 0.9, 1.2), mats, { lit: rng() < 0.4, shut: rng() < 0.4 ? accent : null, round: rng() < 0.15 });
        }
        parts.deco(obj, g, 'clay', 10);
      }
      // Tür zur Terrasse davor
      const frontGap = below ? below.z + below.d / 2 - (t.z + t.d / 2) : 0;
      if (!below || frontGap > 1.4) {
        const g = facade('+z', t.w, t.d, t.x, t.z);
        const u = (rng() - 0.5) * (t.w - 3);
        addDoor(g, u, 1.2, 2.15, mats, { door: M.metal(pick(rng, ['blue', 'red', 'olive', 'rust'])), open: rng() < 0.3 });
        for (let k = 1; k <= 4; k++) g.children[g.children.length - k].position.y += t.y;
        if (rng() < 0.7) { const a = awning(2.6, Math.min(1.4, frontGap || 1.4), 2.5, 2.9, pick(rng, CLOTH_COLORS), { seed: p.seed + i }); a.position.set(u, t.y, 0.1); g.add(a); }
        parts.deco(obj, g, 'clay', 14);
      }
      // Treppe von der unteren Terrasse
      if (below && rng() < 0.85) {
        const g = facade(rng() < 0.5 ? '+x' : '-x', t.w, t.d, t.x, t.z);
        g.add(stairs(t.h, 3.0, 0.95, 9, m.wall, { ry: Math.PI / 2, x: -1.2, y: t.y, z: 0.5 }));
        parts.deco(obj, g, 'clay', 30);
      }
    });
    // Leiter + Aufbauten auf dem Dach
    const top = tiers[tiers.length - 1];
    const roof = new THREE.Group();
    roof.position.set(top.x, top.y + top.h, top.z);
    if (rng() < 0.7) roof.add(tank(0.7, 1.2, M.metal(pick(rng, ['blue', 'rust', 'white'])), M.metal('gray'), { x: (rng() - 0.5) * (top.w - 3), z: (rng() - 0.5) * (top.d - 3) }));
    if (rng() < 0.6) { const a = antenna(between(rng, 3, 5.5), M.metal('gray'), { dish: rng() < 0.5, light: true }); a.position.set((rng() - 0.5) * (top.w - 2), 0, (rng() - 0.5) * (top.d - 2)); roof.add(a); }
    if (rng() < 0.5) { const a = awning(3, 2, 2.2, 2.6, pick(rng, CLOTH_COLORS), { seed: p.seed }); a.position.set(0, 0, -top.d * 0.2); roof.add(a); }
    parts.deco(obj, roof, 'metal', 20);
    // Schäden
    const sd = new THREE.Group();
    sd.add(sandDrift(-p.w * 0.25, p.d / 2 + 0.2, 1.4), sandDrift(p.w * 0.3, p.d / 2 + 0.2, 1));
    if (dm > 0.3) { const r = rubble(rng, 4, 2.2, m.dark); r.position.set(p.w / 2 + 0.2, 0, p.d / 2 - 1.5); sd.add(r); }
    parts.deco(obj, sd, 'clay', 8);
  },
};

/* ═════════════ Mietshaus ═════════════ */
export const tenement = {
  id: 'tenement',
  label: 'Mietshaus',
  category: CAT,
  tag: 'Wohnen',
  hint: 'Hohes Wohnhaus mit Balkonen, Wäscheleinen, Klimageräten, Wasserbehältern und Leuchtschild',
  buildStyle: 'drop',
  params: [
    { key: 'w', label: 'Breite', type: 'range', min: 8, max: 15, step: 0.5, value: 11, unit: 'm' },
    { key: 'd', label: 'Tiefe', type: 'range', min: 8, max: 13, step: 0.5, value: 9, unit: 'm' },
    { key: 'floors', label: 'Geschosse', type: 'range', min: 3, max: 6, step: 1, value: 4 },
    { key: 'clay', label: 'Putz', type: 'select', options: CLAY_OPTIONS, value: 'sand' },
    { key: 'shop', label: 'Laden im Erdgeschoss', type: 'bool', value: true },
    damageParam(0.4),
    seedParam(3),
  ],
  build(obj, p) {
    const rng = mulberry32(p.seed);
    const W = p.w, D = p.d, F = Math.round(p.floors), dm = p.damage;
    const m = clayMats(p.clay);
    const mats = { trim: m.trim, dark: m.dark };
    const shut = M.metal(pick(rng, SHUTTER_PALS));
    const shut2 = M.metal(pick(rng, SHUTTER_PALS));
    const H = F * FH;
    const b = { x: 0, z: 0, w: W, d: D, h: H };
    parts.solid(obj, rblock(W, H, D, 0.35, m.wall, { taper: 0.01 }), W, H, D, 'clay', [2, 3, 2]);
    parts.deco(obj, frame(W - 0.1, D - 0.1, 0.3, 0.65, m.wall, { y: H, r: 0.3 }), 'clay', 40);
    // Geschossbänder
    for (let f = 1; f < F; f++) parts.deco(obj, frame(W + 0.14, D + 0.14, 0.1, 0.16, m.trim, { y: f * FH - 0.1, r: 0.35 }), 'clay', 20);

    const doorU = (rng() - 0.5) * (W - 5);
    for (const side of ['+z', '-z', '+x', '-x']) {
      const L = side === '+z' || side === '-z' ? W : D;
      const cnt = Math.floor((L - 1.2) / 2.3);
      const g = facade(side, W, D);
      const gap = (L - 1.2) / cnt;
      for (let f = 0; f < F; f++) {
        const lastFloorWin = f === 0 && p.shop && side === '+z';
        for (let k = 0; k < cnt; k++) {
          const u = -((cnt - 1) / 2) * gap + k * gap;
          if (f === 0 && side === '+z' && Math.abs(u - doorU) < 1.9) continue;
          if (lastFloorWin) continue;
          if (rng() < 0.07) continue;
          const y = f * FH + 1.7;
          addWindow(g, u, y, 0.85, 1.25, mats, { lit: rng() < 0.4, cool: rng() < 0.15, shut: rng() < 0.55 ? (rng() < 0.5 ? shut : shut2) : null });
          // Klimagerät unter dem Fenster / Balkon
          if (rng() < 0.17 && f > 0) {
            g.add(box(0.7, 0.5, 0.45, M.metal('white'), { x: u + 0.2, y: y - 1.05, z: 0.3 }));
            g.add(cyl(0.18, 0.18, 0.05, M.dark(0x222222), { x: u + 0.2, y: y - 1.05, z: 0.55, rx: Math.PI / 2, radial: 8, cast: false }));
          } else if (side === '+z' && f > 0 && rng() < 0.2) {
            const bl = new THREE.Group();
            bl.position.set(u, f * FH + 0.3, 0.6);
            bl.add(box(2.1, 0.14, 1.2, m.trim, {}));
            bl.add(box(2.1, 0.8, 0.05, M.metal('rust'), { y: 0.5, z: 0.55 }));
            bl.add(box(0.05, 0.8, 1.1, M.metal('rust'), { x: -1.02, y: 0.5 }));
            bl.add(box(0.05, 0.8, 1.1, M.metal('rust'), { x: 1.02, y: 0.5 }));
            g.add(bl);
          }
        }
      }
      // Putzschäden/Flicken
      for (let k = 0; k < Math.round(dm * 5 + 1); k++) {
        g.add(box(between(rng, 0.6, 1.8), between(rng, 0.5, 1.4), 0.03, rng() < 0.7 ? m.dark : M.metal(pick(rng, ['rust', 'gray'])), { x: (rng() - 0.5) * (L - 1.5), y: 1 + rng() * (H - 2), z: 0.015, rz: (rng() - 0.5) * 0.2, cast: false }));
      }
      // Fallrohr an der Ecke
      if (rng() < 0.6) g.add(cyl(0.07, 0.07, H - 0.2, M.metal('gray'), { x: L / 2 - 0.25, y: H / 2, z: 0.12, radial: 6 }));
      parts.deco(obj, g, 'clay', 40);
    }
    // Eingang bzw. Laden
    {
      const g = facade('+z', W, D);
      addDoor(g, doorU, 1.5, 2.4, mats, { door: M.metal(pick(rng, ['rust', 'blue', 'olive'])), open: rng() < 0.4 });
      if (p.shop) {
        const u = doorU > 0 ? doorU - 3.6 : doorU + 3.6;
        const wu = Math.max(-W / 2 + 2.2, Math.min(W / 2 - 2.2, u));
        g.add(box(3.0, 1.7, 0.08, rng() < 0.6 ? WIN : WIN_OFF, { x: wu, y: 1.5, z: 0.02, cast: false }));
        g.add(box(3.4, 0.14, 0.3, m.trim, { x: wu, y: 0.55, z: 0.12, cast: false }));
        const a = awning(3.4, 1.6, 2.35, 2.8, pick(rng, CLOTH_COLORS), { seed: p.seed });
        a.position.set(wu, 0, 0.1);
        g.add(a);
        g.add(sign(2.4, 0.6, Math.floor(rng() * 16), { x: wu, y: 3.35, z: 0.06 }));
      }
      parts.deco(obj, g, 'clay', 30);
    }
    // Wäscheleinen zwischen den Seiten
    if (rng() < 0.7) {
      const g = new THREE.Group();
      const f = 1 + Math.floor(rng() * (F - 1));
      g.position.set(0, f * FH + 2.0, D / 2 + 0.35);
      g.add(box(W * 0.7, 0.015, 0.015, M.dark(0x222222), {}));
      for (let k = 0; k < 5; k++) g.add(cloth(0.55, 0.8, M.cloth(pick(rng, CLOTH_COLORS)), { x: -W * 0.28 + k * (W * 0.14), y: -0.42, sag: 0, ripple: 0.04, segX: 2, segY: 2, ry: (rng() - 0.5) * 0.4 }));
      parts.deco(obj, g, 'cloth', 6);
    }
    // Dach
    const roof = new THREE.Group();
    roof.position.set(0, H, 0);
    const nR = 1 + Math.floor(rng() * 3);
    for (let i = 0; i < nR; i++) {
      const x = (rng() - 0.5) * (W - 3), z = (rng() - 0.5) * (D - 3);
      const k = Math.floor(rng() * 4);
      if (k === 0) roof.add(tank(between(rng, 0.7, 1.1), between(rng, 1.2, 1.8), M.metal(pick(rng, ['blue', 'rust', 'gray'])), M.metal('gray'), { x, z }));
      else if (k === 1) { const a = antenna(between(rng, 3.5, 7), M.metal('gray'), { dish: rng() < 0.6, light: true }); a.position.set(x, 0, z); roof.add(a); }
      else if (k === 2) { const hut = rblock(2.2, 2.4, 2.2, 0.3, m.wall, { x, z }); roof.add(hut); roof.add(arch(0.85, 1.7, 0.08, WIN_OFF, { x, z: z + 1.1 })); }
      else { const s = new THREE.Group(); s.position.set(x, 0.55, z); s.rotation.y = rng() - 0.5; s.add(box(2.2, 0.05, 1.3, solarMat(), { rx: -0.6 })); roof.add(s); }
    }
    // Leuchtschild senkrecht an der Ecke
    if (rng() < 0.6) {
      const s = sign(2.2, 0.55, Math.floor(rng() * 16), { x: W / 2 + 0.12, y: H * 0.55 + 1, z: D / 2 - 0.5, ry: Math.PI / 2 });
      s.rotation.z = Math.PI / 2; // Schrift läuft senkrecht
      parts.deco(obj, s, 'metal', 6);
    }
    parts.deco(obj, roof, 'metal', 30);
    obj.add(sandDrift(-W * 0.2, D / 2 + 0.3, 1.4), { collider: 'none', mass: 4, surf: 'clay' });
  },
};

/* ═════════════ Blechhütte ═════════════ */
export const shack = {
  id: 'shack',
  label: 'Blechhütte',
  category: CAT,
  tag: 'Slum',
  hint: 'Zusammengeflickte Hütte aus Wellblech, Planen und Schrott – Behausung im Randviertel',
  buildStyle: 'pop',
  params: [
    { key: 'w', label: 'Breite', type: 'range', min: 3, max: 8, step: 0.25, value: 5, unit: 'm' },
    { key: 'd', label: 'Tiefe', type: 'range', min: 3, max: 7, step: 0.25, value: 4.5, unit: 'm' },
    { key: 'pal', label: 'Blech', type: 'select', options: [['mix', 'Gemischt'], ['rust', 'Rost'], ['gray', 'Grau'], ['sand', 'Sand'], ['blue', 'Blau']], value: 'mix' },
    damageParam(0.6),
    seedParam(2),
  ],
  build(obj, p) {
    const rng = mulberry32(p.seed);
    const W = p.w, D = p.d, dm = p.damage;
    const pals = ['rust', 'gray', 'sand', 'blue', 'olive'];
    const mat = () => M.metal(p.pal === 'mix' ? pick(rng, pals) : p.pal);
    const wood = M.wood(0xb59a78);
    const H = between(rng, 2.2, 2.8);
    // vier Wände aus Blechbahnen
    const walls = [['+z', W, D / 2, 0], ['-z', W, -D / 2, 0], ['+x', D, 0, W / 2], ['-x', D, 0, -W / 2]];
    for (const [side, len, z, x] of walls) {
      const n = Math.max(1, Math.round(len / 1.1));
      const seg = len / n;
      for (let i = 0; i < n; i++) {
        const hh = H * between(rng, 0.88, 1.02);
        const u = -len / 2 + seg * (i + 0.5);
        const horiz = side === '+z' || side === '-z';
        if (side === '+z' && i === Math.floor(n / 2)) continue; // Eingang
        if (dm > 0.5 && rng() < (dm - 0.5) * 0.35) continue; // Lücke
        const mesh = horiz
          ? box(seg * 0.98, hh, 0.07, mat(), { x: u, y: hh / 2, z, ry: (rng() - 0.5) * 0.04 })
          : box(0.07, hh, seg * 0.98, mat(), { x, y: hh / 2, z: u, ry: (rng() - 0.5) * 0.04 });
        obj.add(mesh, { mass: 25, surf: 'metal' });
      }
    }
    // Eingangsvorhang + Türrahmen
    obj.add(box(1.1, 2.0, 0.04, M.cloth(pick(rng, CLOTH_COLORS)), { x: (rng() - 0.5) * 0.3 * W * 0.1, y: 1.0, z: D / 2 + 0.03 }), { collider: 'none', mass: 4, surf: 'cloth' });
    // schiefes Dach: Pult mit Überstand
    const slope = between(rng, 0.12, 0.3);
    const roof = box(W + 0.9, 0.08, D + 0.9, mat(), { y: H + 0.2, rx: -slope * (rng() < 0.5 ? 1 : -1), ry: (rng() - 0.5) * 0.08 });
    obj.add(roof, { fracture: [2, 1, 2], mass: 60, surf: 'metal' });
    // Zweitplatte + Planenreste
    if (rng() < 0.6) obj.add(box(W * 0.55, 0.06, D * 0.6, M.metal(pick(rng, pals)), { x: (rng() - 0.5) * W * 0.4, y: H + 0.3, z: (rng() - 0.5) * D * 0.3, rx: -0.05, ry: rng() }), { collider: 'none', mass: 20, surf: 'metal' });
    if (rng() < 0.55) obj.add(cloth(W * 0.9, D * 0.9, M.cloth(pick(rng, CLOTH_COLORS)), { sag: 0.1, ripple: 0.12, seed: p.seed, y: H + 0.42, rx: -Math.PI / 2, segX: 6, segY: 6 }), { collider: 'none', mass: 8, surf: 'cloth' });
    // Beschwerung auf dem Dach: Reifen und Steine
    for (let i = 0; i < 2 + Math.floor(rng() * 3); i++) {
      const x = (rng() - 0.5) * W * 0.8, z = (rng() - 0.5) * D * 0.8;
      if (rng() < 0.5) obj.add(mk(new THREE.TorusGeometry(0.3, 0.12, 6, 12), M.tread(), { x, y: H + 0.5, z, rx: Math.PI / 2 }), { collider: 'none', mass: 8, surf: 'rubber' });
      else obj.add(box(0.5, 0.35, 0.45, M.clay('dark'), { x, y: H + 0.45, z, ry: rng() * 3 }), { collider: 'none', mass: 14, surf: 'clay' });
    }
    // Ofenrohr, Fass, Kisten, Antenne
    obj.add(cyl(0.07, 0.07, 1.4, M.metal('rust'), { x: W * 0.3, y: H + 0.9, z: -D * 0.2, radial: 6 }), { collider: 'none', mass: 6, surf: 'metal' });
    obj.add(cyl(0.2, 0.2, 0.2, M.metal('rust'), { x: W * 0.3, y: H + 1.65, z: -D * 0.2, radial: 8 }), { collider: 'none', mass: 3, surf: 'metal' });
    for (let i = 0; i < 2 + Math.floor(rng() * 3); i++) {
      const side = rng() < 0.5 ? -1 : 1;
      if (rng() < 0.5) obj.add(cyl(0.3, 0.3, 0.9, M.metal(pick(rng, pals)), { x: side * (W / 2 + 0.5), y: 0.45, z: D / 2 - 0.5 - rng() * 1.5, radial: 10 }), { mass: 20, surf: 'metal' });
      else obj.add(box(0.7, 0.55, 0.6, wood, { x: side * (W / 2 + 0.5), y: 0.28, z: D / 2 - rng() * 2, ry: rng() }), { mass: 12, surf: 'wood' });
    }
    if (rng() < 0.5) { const a = antenna(between(rng, 2, 3.5), M.metal('gray'), { dish: rng() < 0.5 }); a.position.set(-W * 0.3, H + 0.3, D * 0.1); obj.add(a, { collider: 'none', mass: 3, surf: 'metal' }); }
    // dunkles Licht im Eingang
    obj.add(box(0.5, 0.35, 0.03, rng() < 0.5 ? WIN : WIN_OFF, { x: W * 0.28, y: 1.5, z: D / 2 + 0.05, cast: false }), { collider: 'none', mass: 2, surf: 'metal' });
    obj.add(sandDrift(0, D / 2 + 0.6, 1.4), { collider: 'none', mass: 4, surf: 'clay' });
  },
};

/* ═════════════ Zelt ═════════════ */
const TENT_COLORS = [['sand', 'Sand', 0xd0aa68], ['red', 'Rot, verblasst', 0xb04a2e], ['blue', 'Indigo', 0x3a5c8c], ['green', 'Oliv', 0x6c8040], ['white', 'Leinen', 0xe0d2a8], ['purple', 'Violett', 0x6a4c8c]];
export const tent = {
  id: 'tent',
  label: 'Zelt',
  category: CAT,
  tag: 'Basar',
  hint: 'Karawanen- und Händlerzelte: Giebelzelt, Glockenzelt oder Pavillon mit Teppichen und Kisten',
  buildStyle: 'pop',
  params: [
    { key: 'kind', label: 'Form', type: 'select', options: [['ridge', 'Giebelzelt'], ['bell', 'Glockenzelt'], ['pavilion', 'Pavillon']], value: 'ridge' },
    { key: 'size', label: 'Größe', type: 'range', min: 3, max: 8, step: 0.25, value: 4.5, unit: 'm' },
    { key: 'color', label: 'Stoff', type: 'select', options: TENT_COLORS.map(([k, l]) => [k, l]), value: 'sand' },
    damageParam(0.4),
    seedParam(4),
  ],
  build(obj, p) {
    const rng = mulberry32(p.seed);
    const col = TENT_COLORS.find((c) => c[0] === p.color)[2];
    const cl = M.cloth(col);
    const cl2 = M.cloth(pick(rng, CLOTH_COLORS));
    const wood = M.wood(0xb59a78);
    const S = p.size, dm = p.damage;
    const add = (m, surf = 'cloth', mass = 10) => obj.add(m, { collider: 'none', mass, surf });
    // Teppich vor/in dem Zelt
    add(box(S * 0.9, 0.03, S * 0.9, cl2, { y: 0.016, ry: rng() * 0.3, cast: false }), 'cloth', 8);
    if (p.kind === 'ridge') {
      const w = S, d = S * 1.35, H = S * 0.55;
      const sl = Math.hypot(w / 2, H), th = Math.atan2(w / 2, H);
      for (const s of [-1, 1]) {
        const g = new THREE.Group();
        g.position.set(s * w / 4, H / 2, 0);
        g.rotation.z = s * th;
        g.add(cloth(d, sl, cl, { sag: 0.08, ripple: 0.07, seed: p.seed + s, ry: Math.PI / 2, segX: 8, segY: 4 }));
        obj.add(g, { collider: 'none', mass: 18, surf: 'cloth' });
      }
      // Giebelflächen
      const tri = new THREE.Shape();
      tri.moveTo(-w / 2, 0); tri.lineTo(w / 2, 0); tri.lineTo(0, H); tri.lineTo(-w / 2, 0);
      for (const s of [-1, 1]) {
        const gg = new THREE.ShapeGeometry(tri);
        add(mk(gg, s > 0 ? M.cloth(0x3a3026) : cl, { z: s * d / 2, ry: s > 0 ? 0 : Math.PI, cast: true }), 'cloth', 6);
      }
      add(cyl(0.04, 0.04, d + 0.5, wood, { y: H + 0.02, rx: Math.PI / 2, radial: 6 }), 'wood', 6);
      for (const s of [-1, 1]) add(cyl(0.05, 0.05, H + 0.1, wood, { y: (H + 0.1) / 2, z: s * (d / 2 + 0.2), radial: 6 }), 'wood', 5);
      // Abspannleinen
      for (const s of [-1, 1]) for (const e of [-1, 1]) add(cyl(0.012, 0.012, 2.2, wood, { x: s * (w / 2 + 0.7), y: 0.55, z: e * (d / 2 - 0.2), rz: s * 0.9, radial: 4, cast: false }), 'wood', 1);
    } else if (p.kind === 'bell') {
      const R = S * 0.55, H = S * 0.7;
      add(cyl(0.18, R, H, cl, { y: H / 2, radial: 14, open: true }), 'cloth', 30);
      add(cyl(0.05, 0.05, H * 0.45, wood, { y: H + 0.12, radial: 6 }), 'wood', 3);
      add(sph(0.1, M.metal('rust'), { y: H + 0.4, ws: 6, hs: 5, cast: false }), 'metal', 1);
      add(cyl(R * 1.04, R * 1.04, 0.28, cl2, { y: 0.14, radial: 14, open: true }), 'cloth', 8); // Saum
      add(box(R * 0.55, H * 0.55, 0.05, M.cloth(0x2c241c), { y: H * 0.28, z: R * 0.93, rx: -0.07 }), 'cloth', 3); // Eingang
      add(cyl(0.04, 0.04, H, wood, { x: 0, y: H / 2, z: 0, radial: 5, cast: false }), 'wood', 4);
    } else {
      const w = S, H = 2.4, rh = S * 0.38;
      for (const x of [-1, 1]) for (const z of [-1, 1]) add(cyl(0.05, 0.06, H, wood, { x: x * w / 2, y: H / 2, z: z * w / 2, radial: 6 }), 'wood', 6);
      add(cyl(0.05, w * 0.82, rh, cl, { y: H + rh / 2, radial: 4, ry: Math.PI / 4 }), 'cloth', 30);
      add(sph(0.12, M.metal('rust'), { y: H + rh + 0.1, ws: 6, hs: 5, cast: false }), 'metal', 1);
      for (const s of [-1, 1]) add(cloth(w * 0.46, H * 0.9, cl2, { x: s * w * 0.26, y: H * 0.46, z: -w / 2, sag: 0, ripple: 0.1, seed: p.seed + s, segX: 5, segY: 6 }), 'cloth', 4);
      add(cloth(w * 0.9, H * 0.9, cl, { x: -w / 2, y: H * 0.46, ry: Math.PI / 2, sag: 0, ripple: 0.12, seed: p.seed, segX: 5, segY: 6 }), 'cloth', 4);
      // Sitzkissen
      for (let i = 0; i < 4; i++) add(sph(0.3, M.cloth(pick(rng, CLOTH_COLORS)), { x: (rng() - 0.5) * w * 0.5, y: 0.1, z: (rng() - 0.5) * w * 0.5, sy: 0.4, ws: 8, hs: 5 }), 'cloth', 3);
    }
    // Kisten und Krüge
    for (let i = 0; i < 2 + Math.floor(rng() * 3); i++) {
      const a = rng() * 6.28, r = S * (0.65 + rng() * 0.2);
      if (rng() < 0.5) obj.add(box(0.7, 0.55, 0.6, wood, { x: Math.sin(a) * r, y: 0.28, z: Math.cos(a) * r, ry: rng() * 3 }), { mass: 12, surf: 'wood' });
      else obj.add(cyl(0.22, 0.28, 0.6, M.clay('adobe'), { x: Math.sin(a) * r, y: 0.3, z: Math.cos(a) * r, radial: 8 }), { mass: 8, surf: 'clay' });
    }
    if (dm > 0.5) add(rubble(rng, 3, 2, M.clay('dark')), 'clay', 5);
  },
};

/* ═════════════ Ruine ═════════════ */
export const ruin = {
  id: 'ruin',
  label: 'Ruine',
  category: CAT,
  tag: 'Ruine',
  hint: 'Eingestürztes Lehmhaus: Mauerreste, ein Bogenfragment, Schutt und Sand',
  buildStyle: 'rise',
  params: [
    { key: 'w', label: 'Breite', type: 'range', min: 5, max: 14, step: 0.5, value: 9, unit: 'm' },
    { key: 'd', label: 'Tiefe', type: 'range', min: 5, max: 12, step: 0.5, value: 8, unit: 'm' },
    { key: 'clay', label: 'Putz', type: 'select', options: CLAY_OPTIONS, value: 'sand' },
    seedParam(6),
  ],
  build(obj, p) {
    const rng = mulberry32(p.seed);
    const W = p.w, D = p.d;
    const m = clayMats(p.clay);
    // Mauerreste: vier Wände, jede in 2–4 Stücken unterschiedlicher Resthöhe
    const sides = [['z', D / 2 - 0.3, W], ['z', -D / 2 + 0.3, W], ['x', W / 2 - 0.3, D], ['x', -W / 2 + 0.3, D]];
    for (const [ax, off, len] of sides) {
      let u = -len / 2;
      while (u < len / 2 - 0.5) {
        if (rng() < 0.22) { u += between(rng, 1, 2.2); continue; } // Lücke
        const seg = Math.min(between(rng, 1.4, 3.6), len / 2 - u);
        const h = between(rng, 0.7, 3.4);
        const mesh = ax === 'z'
          ? rblock(seg, h, 0.55, 0.15, m.wall, { x: u + seg / 2, z: off, ry: (rng() - 0.5) * 0.05, taper: 0.03 })
          : rblock(0.55, h, seg, 0.15, m.wall, { x: off, z: u + seg / 2, ry: (rng() - 0.5) * 0.05, taper: 0.03 });
        obj.add(mesh, { fracture: [2, 2, 1], mass: mass(seg, h), surf: 'clay' });
        // ausgebrochene Krone: kleine Brocken obendrauf
        if (rng() < 0.6) obj.add(box(seg * 0.35, 0.3, 0.45, m.wall, { x: ax === 'z' ? u + seg * rng() : off, y: h + 0.1, z: ax === 'z' ? off : u + seg * rng(), ry: rng(), rz: (rng() - 0.5) * 0.4 }), { collider: 'none', mass: 8, surf: 'clay' });
        u += seg + (rng() < 0.3 ? between(rng, 0.4, 1.2) : 0.05);
      }
    }
    // Bogenrest (Türöffnung)
    const g = new THREE.Group();
    g.position.set((rng() - 0.5) * W * 0.3, 0, D / 2 - 0.3);
    g.add(arch(1.8, 2.6, 0.55, m.trim, { z: -0.28 }));
    g.add(box(1.1, 2.7, 0.55, m.wall, { x: -1.4, y: 1.35, z: 0 }));
    g.add(box(0.8, 1.6, 0.55, m.wall, { x: 1.35, y: 0.8, z: 0 }));
    obj.add(g, { collider: 'none', mass: 120, surf: 'clay' });
    // umgestürzter Balken, Schutt, Verwehungen
    obj.add(cyl(0.12, 0.14, 3.2, M.wood(0xa88f6c), { x: (rng() - 0.5) * W * 0.4, y: 0.3, z: (rng() - 0.5) * D * 0.3, rz: 1.4 + rng() * 0.3, ry: rng() * 3, radial: 6 }), { collider: 'none', mass: 30, surf: 'wood' });
    for (let i = 0; i < 3; i++) obj.add(rubble(rng, 6 + Math.floor(rng() * 6), 2.8, m.wall), { collider: 'none', mass: 20, surf: 'clay' });
    const heaps = obj.parts.slice(-3);
    heaps.forEach((h) => { const a = rng() * 6.28, r = rng() * Math.min(W, D) * 0.3; h.mesh.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); h.home.pos.copy(h.mesh.position); });
    for (let i = 0; i < 4; i++) obj.add(sandDrift((rng() - 0.5) * W * 0.9, (rng() - 0.5) * D * 0.9, between(rng, 1, 2.4), rng() * 3), { collider: 'none', mass: 4, surf: 'clay' });
  },
};

function mass(w, h) { return Math.max(10, Math.min(300, w * h * 0.55 * 110)); }
