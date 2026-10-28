// Befestigung und Straßenmobiliar: Mauer, Mauerturm, Stadttor, Kisten, Fässer, Schrott, Bänke, Wagen,
// Wegweiser, Strommast, Banner, Sandsäcke, Straßenlampe, Rohrleitung, Gestrüpp, Felsen, Sperren.
import {
  CAT, THREE, M, box, cyl, sph, mk, mulberry32, rblock, frame, arch, stairs, facade, awning, vault, gable, HIDDEN,
  pick, between, clayMats, clayM, sandDrift, rubble, parts, WIN, WIN_OFF, LAMP, FIREGLOW, CLOTH_COLORS, sign, cloth, nightMat, antenna,
} from './town.js';
import { damageParam, seedParam, CLAY_OPTIONS, PAL_OPTIONS } from './_common.js';
import { hazardMat, lattice, crystalMat, torus } from './kit.js';

const mass = (w, h, d, k = 110) => Math.max(5, Math.min(400, w * h * d * k));

/* ═════════════ Mauer ═════════════ */
export const wallSection = {
  id: 'wallSection',
  label: 'Stadtmauer',
  category: CAT,
  tag: 'Befestigung',
  hint: 'Mauerabschnitt mit Zinnen, Strebepfeilern, Schießscharten und Wehrgang – Außenseite zeigt nach +Z',
  buildStyle: 'rise',
  params: [
    { key: 'len', label: 'Länge', type: 'range', min: 8, max: 30, step: 1, value: 20, unit: 'm' },
    { key: 'h', label: 'Höhe', type: 'range', min: 5, max: 9, step: 0.5, value: 6.5, unit: 'm' },
    { key: 'clay', label: 'Putz', type: 'select', options: CLAY_OPTIONS, value: 'sand' },
    damageParam(0.4),
    seedParam(24),
  ],
  build(obj, p) {
    const rng = mulberry32(p.seed);
    const L = p.len, H = p.h, T = 2.0, dm = p.damage;
    const m = clayMats(p.clay);
    // Wand in 3–6 Stücken mit ausgefranster Krone
    const n = Math.max(2, Math.round(L / 5));
    let x = -L / 2;
    for (let i = 0; i < n; i++) {
      const seg = L / n;
      let hh = H * between(rng, 0.92, 1.04);
      if (dm > 0.35 && rng() < dm * 0.4) hh *= between(rng, 0.35, 0.75); // eingebrochen
      obj.add(rblock(seg + 0.02, hh, T, 0.25, m.wall, { x: x + seg / 2, taper: 0.06 }), { fracture: [2, 2, 1], mass: mass(seg, hh, T), surf: 'clay' });
      // Zinnen (nur auf intakten Stücken), Brocken auf eingestürzten
      if (hh > H * 0.85) {
        const k = Math.max(2, Math.floor(seg / 1.5));
        for (let j = 0; j < k; j++) {
          if (rng() < dm * 0.25) continue;
          obj.add(box(0.8, 0.9, 0.55, m.wall, { x: x + (seg / k) * (j + 0.5), y: hh + 0.45 - 0.04, z: T / 2 - 0.35 }), { collider: 'none', mass: 30, surf: 'clay' });
        }
        // Wehrgang: niedrige Innenbrüstung + Boden
        obj.add(box(seg, 0.1, T * 0.5, M.wood(0xa88f6c), { x: x + seg / 2, y: hh * 0.98, z: -T * 0.25, cast: false }), { collider: 'none', mass: 10, surf: 'wood' });
        if (rng() < 0.5) obj.add(box(0.14, 0.45, 0.45, WIN_OFF, { x: x + seg * rng(), y: hh * 0.62, z: T / 2 + 0.01, cast: false }), { collider: 'none', mass: 2, surf: 'clay' });
      } else {
        const r = rubble(rng, 4, seg * 0.7, m.wall);
        r.position.set(x + seg / 2, hh, 0);
        obj.add(r, { collider: 'none', mass: 20, surf: 'clay' });
      }
      x += seg;
    }
    // Strebepfeiler außen
    for (let i = 1; i < n; i++) obj.add(rblock(1.4, H * 0.82, 1.3, 0.2, m.wall, { x: -L / 2 + (L / n) * i, z: T / 2 + 0.55, taper: 0.2 }), { fracture: [1, 2, 1], mass: 120, surf: 'clay' });
    // Lampe + Treppe nach innen
    obj.add(mk(new THREE.CylinderGeometry(0.05, 0.07, 1.4, 6), M.metal('gray'), { x: L * 0.2, y: H + 0.8, z: T / 2 - 0.2 }), { collider: 'none', mass: 4, surf: 'metal' });
    obj.add(sph(0.14, LAMP, { x: L * 0.2, y: H + 1.55, z: T / 2 - 0.2, ws: 6, hs: 4, cast: false }), { collider: 'none', mass: 1, surf: 'metal' });
    obj.add(stairs(H * 0.9, 5, 1.2, 14, m.wall, { ry: Math.PI / 2, x: -L * 0.2, z: -T / 2 - 0.7 }), { collider: 'none', mass: 90, surf: 'clay' });
    obj.add(sandDrift(-L * 0.25, T / 2 + 1.2, 2), { collider: 'none', mass: 4, surf: 'clay' });
    obj.add(sandDrift(L * 0.3, T / 2 + 1, 1.5), { collider: 'none', mass: 4, surf: 'clay' });
  },
};

/* ═════════════ Mauerturm ═════════════ */
export const wallTower = {
  id: 'wallTower',
  label: 'Mauerturm',
  category: CAT,
  tag: 'Befestigung',
  hint: 'Runder Eckturm mit Zinnenkranz, Schießscharten, Flagge und Scheinwerfer',
  buildStyle: 'rise',
  params: [
    { key: 'r', label: 'Radius', type: 'range', min: 2.5, max: 5, step: 0.25, value: 3.6, unit: 'm' },
    { key: 'h', label: 'Höhe', type: 'range', min: 8, max: 15, step: 0.5, value: 10.5, unit: 'm' },
    { key: 'clay', label: 'Putz', type: 'select', options: CLAY_OPTIONS, value: 'sand' },
    damageParam(0.35),
    seedParam(25),
  ],
  build(obj, p) {
    const rng = mulberry32(p.seed);
    const R = p.r, H = p.h, dm = p.damage;
    const m = clayMats(p.clay);
    obj.add(cyl(R * 0.92, R * 1.12, H, m.wall, { y: H / 2, radial: 18, hseg: 2 }), { fracture: [3, 3, 3], mass: 900, surf: 'clay' });
    obj.add(cyl(R * 1.28, R * 1.2, 0.8, m.trim, { y: H + 0.1, radial: 18 }), { collider: 'none', mass: 120, surf: 'clay' });
    const k = 10;
    for (let i = 0; i < k; i++) {
      if (rng() < dm * 0.3) continue;
      const a = (i / k) * Math.PI * 2;
      obj.add(box(1.0, 1.0, 0.6, m.wall, { x: Math.sin(a) * R * 1.15, y: H + 1.0, z: Math.cos(a) * R * 1.15, ry: a }), { collider: 'none', mass: 40, surf: 'clay' });
    }
    // Schießscharten
    for (let i = 0; i < 6; i++) {
      const a = i * 1.05 + 0.4, y = H * (0.45 + (i % 2) * 0.25);
      obj.add(box(0.22, 0.9, 0.12, WIN_OFF, { x: Math.sin(a) * (R * 1.0 + 0.05), y, z: Math.cos(a) * (R * 1.0 + 0.05), ry: a, cast: false }), { collider: 'none', mass: 2, surf: 'clay' });
    }
    // Sonnensegel, Scheinwerfer, Flagge
    obj.add(cyl(0.05, 0.05, 3.2, M.metal('gray'), { x: -R * 0.4, y: H + 1.7, z: -R * 0.4, radial: 5 }), { collider: 'none', mass: 4, surf: 'metal' });
    obj.add(cloth(1.6, 1.0, M.cloth(pick(rng, [0xa8553a, 0x4a5f78, 0x7a8456])), { x: -R * 0.4 + 0.85, y: H + 2.9, z: -R * 0.4, sag: 0, ripple: 0.14, seed: p.seed, segX: 6, segY: 3 }), { collider: 'none', mass: 4, surf: 'cloth' });
    const sl = new THREE.Group();
    sl.position.set(R * 0.5, H + 0.7, R * 0.5);
    sl.rotation.y = 0.8;
    sl.add(cyl(0.34, 0.26, 0.55, M.metal('gray'), { y: 0.4, rx: 1.2, radial: 12 }));
    sl.add(cyl(0.3, 0.3, 0.04, LAMP, { y: 0.48, z: 0.26, rx: 1.2, radial: 12, cast: false }));
    obj.add(sl, { collider: 'none', mass: 14, surf: 'metal' });
    obj.add(sandDrift(R * 0.6, R * 1.2, 1.8), { collider: 'none', mass: 4, surf: 'clay' });
    if (dm > 0.3) { const r = rubble(rng, 6, R * 1.4, m.wall); r.position.set(R * 1.3, 0, -R * 0.4); obj.add(r, { collider: 'none', mass: 20, surf: 'clay' }); }
  },
};

/* ═════════════ Stadttor ═════════════ */
export const gate = {
  id: 'gate',
  label: 'Stadttor',
  category: CAT,
  tag: 'Befestigung',
  hint: 'Torburg mit zwei Türmen, Rundbogen-Durchfahrt, geöffneten Torflügeln, Fallgitter und Bannern',
  buildStyle: 'drop',
  params: [
    { key: 'clay', label: 'Putz', type: 'select', options: CLAY_OPTIONS, value: 'sand' },
    { key: 'open', label: 'Tor geöffnet', type: 'bool', value: true },
    damageParam(0.35),
    seedParam(26),
  ],
  build(obj, p) {
    const rng = mulberry32(p.seed);
    const m = clayMats(p.clay), mats = { trim: m.trim };
    const rust = M.metal('rust'), gray = M.metal('gray'), wood = M.wood(0x8a6a44);
    const W = 22, T = 7, H = 9, PW = 6.4, PH = 6.2; // Breite, Tiefe, Wandhöhe, Durchfahrt
    // Durchfahrtswand: Rechteck mit Rundbogen-Öffnung
    const s = new THREE.Shape();
    s.moveTo(-W / 2, 0); s.lineTo(W / 2, 0); s.lineTo(W / 2, H); s.lineTo(-W / 2, H); s.lineTo(-W / 2, 0);
    const hole = new THREE.Path();
    hole.moveTo(-PW / 2, 0); hole.lineTo(-PW / 2, PH - PW / 2); hole.absarc(0, PH - PW / 2, PW / 2, Math.PI, 0, true); hole.lineTo(PW / 2, 0); hole.lineTo(-PW / 2, 0);
    s.holes.push(hole);
    const geo = new THREE.ExtrudeGeometry(s, { depth: T, bevelEnabled: false, curveSegments: 10 });
    geo.translate(0, 0, -T / 2);
    const tpm = m.wall.userData.tpm;
    const pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i)), nz = Math.abs(nor.getZ(i));
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      if (nx >= ny && nx >= nz) uv.setXY(i, z * tpm, y * tpm); else if (ny >= nz) uv.setXY(i, x * tpm, z * tpm); else uv.setXY(i, x * tpm, y * tpm);
    }
    obj.add(mk(geo, m.wall, {}), { fracture: [4, 2, 2], mass: 3000, surf: 'clay', collider: 'none' });
    // Kollisionskörper links/rechts der Durchfahrt
    for (const sx of [-1, 1]) obj.add(box(W / 2 - PW / 2, H, T, HIDDEN, { x: sx * (PW / 2 + (W / 2 - PW / 2) / 2), y: H / 2, cast: false, recv: false }), { mass: 1500, surf: 'clay' });
    // Türme
    for (const sx of [-1, 1]) {
      const x = sx * (W / 2 + 1.0);
      obj.add(cyl(3.3, 3.8, H + 4, m.wall, { x, y: (H + 4) / 2, radial: 16, hseg: 2 }), { fracture: [3, 3, 3], mass: 1200, surf: 'clay' });
      obj.add(cyl(4.3, 4.0, 0.9, m.trim, { x, y: H + 4.1, radial: 16 }), { collider: 'none', mass: 120, surf: 'clay' });
      for (let i = 0; i < 10; i++) {
        if (rng() < p.damage * 0.3) continue;
        const a = (i / 10) * Math.PI * 2;
        obj.add(box(1.1, 1.0, 0.6, m.wall, { x: x + Math.sin(a) * 4.1, y: H + 5.1, z: Math.cos(a) * 4.1, ry: a }), { collider: 'none', mass: 40, surf: 'clay' });
      }
      for (let i = 0; i < 4; i++) {
        const a = Math.PI * 0.5 + i * 0.9 - 1.3 + (sx > 0 ? 0 : 0);
        obj.add(box(0.26, 1.0, 0.12, i % 2 ? WIN : WIN_OFF, { x: x + Math.sin(a) * 3.5, y: 4 + i * 2.2, z: Math.cos(a) * 3.5, ry: a, cast: false }), { collider: 'none', mass: 2, surf: 'clay' });
      }
      obj.add(cyl(0.06, 0.07, 4, gray, { x: x + 1, y: H + 6.2, z: 1, radial: 5 }), { collider: 'none', mass: 5, surf: 'metal' });
      obj.add(cloth(0.9, 2.4, M.cloth(sx > 0 ? 0x8c3a2a : 0x2e4a6a), { x: x + 1.1, y: H + 5.5, z: 1.0, ry: 0, sag: 0, ripple: 0.12, seed: 3 + sx, segX: 3, segY: 8 }), { collider: 'none', mass: 4, surf: 'cloth' });
    }
    // Torflügel (geöffnet nach außen) und Fallgitter oben
    for (const sx of [-1, 1]) {
      const g = new THREE.Group();
      g.position.set(sx * PW / 2, 0, T / 2 - 0.2);
      g.rotation.y = p.open ? sx * -1.35 : 0;
      const w = PW / 2;
      g.add(box(w, PH - 0.8, 0.22, wood, { x: -sx * w / 2, y: (PH - 0.8) / 2 }));
      for (let k = 0; k < 4; k++) g.add(box(w, 0.14, 0.28, rust, { x: -sx * w / 2, y: 0.8 + k * 1.3 }));
      obj.add(g, { collider: 'none', mass: 150, surf: 'wood' });
    }
    for (let i = 0; i < 9; i++) obj.add(box(0.1, 1.5, 0.1, rust, { x: -PW / 2 + 0.5 + i * (PW - 1) / 8, y: PH - 0.9, z: 0 }), { collider: 'none', mass: 5, surf: 'metal' });
    obj.add(box(PW, 0.12, 0.12, rust, { y: PH - 1.7 }), { collider: 'none', mass: 8, surf: 'metal' });
    // Zinnen auf der Mauerkrone, Lampen, Schild
    const k = 14;
    for (let i = 0; i < k; i++) {
      const x = -W / 2 + 1 + (i * (W - 2)) / (k - 1);
      if (Math.abs(x) > W / 2 + 0.2 || rng() < p.damage * 0.15) continue;
      for (const sz of [-1, 1]) obj.add(box(0.9, 0.95, 0.6, m.wall, { x, y: H + 0.47, z: sz * (T / 2 - 0.35) }), { collider: 'none', mass: 30, surf: 'clay' });
    }
    for (const sx of [-1, 1]) {
      obj.add(cyl(0.05, 0.06, 1.5, gray, { x: sx * (PW / 2 + 0.7), y: PH + 0.2, z: T / 2 + 0.2, radial: 5 }), { collider: 'none', mass: 4, surf: 'metal' });
      obj.add(sph(0.2, LAMP, { x: sx * (PW / 2 + 0.7), y: PH + 1.0, z: T / 2 + 0.2, ws: 8, hs: 6, cast: false }), { collider: 'none', mass: 1, surf: 'metal' });
    }
    obj.add(sign(4.2, 1.05, 11, { y: PH + 1.6, z: T / 2 + 0.06 }), { collider: 'none', mass: 6, surf: 'metal' });
    obj.add(sandDrift(-3, T / 2 + 2, 2.6), { collider: 'none', mass: 4, surf: 'clay' });
    obj.add(sandDrift(4, -T / 2 - 2, 2.2), { collider: 'none', mass: 4, surf: 'clay' });
  },
};

/* ═════════════ Kisten ═════════════ */
export const crates = {
  id: 'crates',
  label: 'Kistenstapel',
  category: CAT,
  tag: 'Requisite',
  hint: 'Gestapelte Fracht: Holz- und Blechkisten, teils mit Plane',
  buildStyle: 'pop',
  params: [
    { key: 'n', label: 'Anzahl', type: 'range', min: 2, max: 9, step: 1, value: 5 },
    { key: 'pal', label: 'Blechkisten', type: 'select', options: PAL_OPTIONS, value: 'olive' },
    seedParam(27),
  ],
  build(obj, p) {
    const rng = mulberry32(p.seed);
    const wood = M.wood(0xb59a78), metal = M.metal(p.pal);
    const cols = Math.ceil(Math.sqrt(p.n));
    let placed = 0;
    for (let i = 0; i < p.n; i++) {
      const gx = i % cols, gz = Math.floor(i / cols);
      const s = between(rng, 0.8, 1.15), isM = rng() < 0.45;
      const x = (gx - (cols - 1) / 2) * 1.2 + (rng() - 0.5) * 0.15, z = gz * 1.2 + (rng() - 0.5) * 0.15;
      obj.add(box(s, s * 0.85, s, isM ? metal : wood, { x, y: s * 0.43, z, ry: (rng() - 0.5) * 0.3 }), { mass: 25, surf: isM ? 'metal' : 'wood' });
      if (rng() < 0.5 && placed < 4) { obj.add(box(s * 0.85, s * 0.7, s * 0.85, rng() < 0.5 ? metal : wood, { x, y: s * 0.85 + s * 0.35, z, ry: rng() * 0.6 }), { mass: 20, surf: 'wood' }); placed++; }
    }
    if (rng() < 0.4) obj.add(cloth(1.8, 1.6, M.cloth(pick(rng, CLOTH_COLORS)), { y: 1.15, z: 0.6, rx: -Math.PI / 2 + 0.5, sag: 0.12, ripple: 0.1, seed: p.seed }), { collider: 'none', mass: 4, surf: 'cloth' });
  },
};

/* ═════════════ Fässer ═════════════ */
export const barrels = {
  id: 'barrels',
  label: 'Fässer',
  category: CAT,
  tag: 'Requisite',
  hint: 'Gruppe von Öl- und Wasserfässern, teils umgekippt, mit Rostflecken',
  buildStyle: 'pop',
  params: [
    { key: 'n', label: 'Anzahl', type: 'range', min: 1, max: 8, step: 1, value: 4 },
    seedParam(28),
  ],
  build(obj, p) {
    const rng = mulberry32(p.seed);
    for (let i = 0; i < p.n; i++) {
      const a = rng() * 6.28, r = i === 0 ? 0 : 0.7 + rng() * 0.5;
      const m = M.metal(pick(rng, ['rust', 'blue', 'olive', 'gray', 'red', 'sand']));
      const tip = rng() < 0.18;
      const x = Math.sin(a) * r, z = Math.cos(a) * r;
      if (tip) obj.add(cyl(0.3, 0.3, 0.9, m, { x, y: 0.3, z, rz: Math.PI / 2, ry: rng() * 3, radial: 10 }), { mass: 20, surf: 'metal' });
      else {
        obj.add(cyl(0.3, 0.3, 0.9, m, { x, y: 0.45, z, radial: 10 }), { mass: 20, surf: 'metal' });
        obj.add(cyl(0.31, 0.31, 0.06, M.metal('black'), { x, y: 0.6, z, radial: 10, cast: false }), { collider: 'none', mass: 1, surf: 'metal' });
      }
    }
  },
};

/* ═════════════ Schrotthaufen ═════════════ */
export const junkPile = {
  id: 'junkPile',
  label: 'Schrotthaufen',
  category: CAT,
  tag: 'Requisite',
  hint: 'Haufen aus Blech, Rohren, Reifen und kaputten Teilen',
  buildStyle: 'pop',
  params: [
    { key: 'size', label: 'Größe', type: 'range', min: 1.5, max: 5, step: 0.25, value: 3, unit: 'm' },
    seedParam(29),
  ],
  build(obj, p) {
    const rng = mulberry32(p.seed);
    const S = p.size;
    const pals = ['rust', 'gray', 'olive', 'sand', 'blue'];
    for (let i = 0; i < 6 + Math.round(S * 3); i++) {
      const r = rng() * S * 0.45, a = rng() * 6.28;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const y = Math.max(0.1, (1 - r / (S * 0.5)) * S * 0.28);
      const k = rng();
      if (k < 0.35) obj.add(box(between(rng, 0.6, 1.6), 0.07, between(rng, 0.5, 1.1), M.metal(pick(rng, pals)), { x, y, z, rx: (rng() - 0.5) * 0.8, ry: rng() * 3, rz: (rng() - 0.5) * 0.8 }), { mass: 14, surf: 'metal' });
      else if (k < 0.55) obj.add(cyl(0.1, 0.1, between(rng, 0.8, 1.8), M.metal(pick(rng, pals)), { x, y, z, rz: 1.3 + rng() * 0.4, ry: rng() * 3, radial: 6 }), { mass: 8, surf: 'metal' });
      else if (k < 0.7) obj.add(mk(new THREE.TorusGeometry(0.38, 0.16, 6, 12), M.tread(), { x, y: y + 0.1, z, rx: Math.PI / 2 + (rng() - 0.5) * 0.7, ry: rng() }), { mass: 10, surf: 'rubber' });
      else if (k < 0.85) obj.add(box(between(rng, 0.3, 0.8), between(rng, 0.3, 0.6), between(rng, 0.3, 0.7), M.metal(pick(rng, pals)), { x, y: y + 0.2, z, ry: rng() * 3, rz: (rng() - 0.5) * 0.5 }), { mass: 20, surf: 'metal' });
      else obj.add(cyl(0.28, 0.28, 0.8, M.metal(pick(rng, pals)), { x, y: y + 0.3, z, radial: 8, rz: rng() < 0.5 ? 1.4 : 0 }), { mass: 14, surf: 'metal' });
    }
    obj.add(sandDrift(0, 0, S * 0.5), { collider: 'none', mass: 4, surf: 'clay' });
  },
};

/* ═════════════ Bank ═════════════ */
export const bench = {
  id: 'bench',
  label: 'Bank',
  category: CAT,
  tag: 'Requisite',
  hint: 'Einfache Sitzbank aus Holzplanken auf Blechfüßen',
  buildStyle: 'pop',
  params: [{ key: 'len', label: 'Länge', type: 'range', min: 1.2, max: 3, step: 0.1, value: 2, unit: 'm' }, seedParam(30)],
  build(obj, p) {
    const wood = M.wood(0xb59a78), rust = M.metal('rust');
    for (const s of [-1, 1]) obj.add(box(0.08, 0.48, 0.5, rust, { x: s * (p.len / 2 - 0.15), y: 0.24 }), { mass: 8, surf: 'metal' });
    obj.add(box(p.len, 0.07, 0.46, wood, { y: 0.5 }), { mass: 14, surf: 'wood' });
    obj.add(box(p.len, 0.4, 0.05, wood, { y: 0.82, z: -0.24, rx: 0.12 }), { mass: 10, surf: 'wood' });
  },
};

/* ═════════════ Handkarren ═════════════ */
export const cart = {
  id: 'cart',
  label: 'Handkarren',
  category: CAT,
  tag: 'Requisite',
  hint: 'Zweirädriger Karren mit Ladung aus Säcken, Krügen oder Kisten',
  buildStyle: 'pop',
  params: [{ key: 'load', label: 'Ladung', type: 'select', options: [['sacks', 'Säcke'], ['jugs', 'Krüge'], ['crates', 'Kisten'], ['empty', 'Leer']], value: 'sacks' }, seedParam(31)],
  build(obj, p) {
    const rng = mulberry32(p.seed);
    const wood = M.wood(0xb59a78), rust = M.metal('rust');
    obj.add(box(1.5, 0.12, 1.0, wood, { y: 0.7 }), { mass: 30, surf: 'wood' });
    for (const s of [-1, 1]) {
      obj.add(box(1.5, 0.3, 0.06, wood, { x: 0, y: 0.9, z: s * 0.5 }), { collider: 'none', mass: 10, surf: 'wood' });
      obj.add(cyl(0.45, 0.45, 0.08, M.tread(), { x: 0, y: 0.45, z: s * 0.62, rx: Math.PI / 2, radial: 14 }), { collider: 'none', mass: 10, surf: 'rubber' });
      obj.add(box(1.6, 0.06, 0.06, wood, { x: 1.4, y: 0.7, z: s * 0.35, rz: -0.12 }), { collider: 'none', mass: 6, surf: 'wood' });
    }
    obj.add(box(0.06, 0.06, 0.8, wood, { x: 2.1, y: 0.62 }), { collider: 'none', mass: 4, surf: 'wood' });
    obj.add(cyl(0.05, 0.05, 1.5, rust, { y: 0.45, rx: Math.PI / 2, radial: 6, cast: false }), { collider: 'none', mass: 3, surf: 'metal' });
    for (let i = 0; i < 5 && p.load !== 'empty'; i++) {
      const x = -0.4 + (i % 3) * 0.45, z = (i < 3 ? -0.2 : 0.22), y = 0.85 + (i < 3 ? 0 : 0.3);
      if (p.load === 'sacks') obj.add(sph(0.26, M.cloth(pick(rng, CLOTH_COLORS)), { x, y, z, sy: 0.7, ws: 8, hs: 6 }), { collider: 'none', mass: 6, surf: 'cloth' });
      else if (p.load === 'jugs') obj.add(cyl(0.16, 0.2, 0.45, M.clay(pick(rng, ['adobe', 'white', 'red'])), { x, y: y - 0.02, z, radial: 8 }), { collider: 'none', mass: 6, surf: 'clay' });
      else obj.add(box(0.5, 0.45, 0.5, rng() < 0.5 ? wood : M.metal('olive'), { x, y, z, ry: rng() }), { collider: 'none', mass: 10, surf: 'wood' });
    }
  },
};

/* ═════════════ Wegweiser ═════════════ */
export const signpost = {
  id: 'signpost',
  label: 'Wegweiser',
  category: CAT,
  tag: 'Requisite',
  hint: 'Mast mit leuchtenden Richtungsschildern und Lampe',
  buildStyle: 'pop',
  params: [{ key: 'n', label: 'Schilder', type: 'range', min: 1, max: 4, step: 1, value: 3 }, seedParam(32)],
  build(obj, p) {
    const rng = mulberry32(p.seed);
    const rust = M.metal('rust'), gray = M.metal('gray');
    obj.add(cyl(0.07, 0.1, 3.8, gray, { y: 1.9, radial: 8 }), { mass: 30, surf: 'metal' });
    for (let i = 0; i < p.n; i++) {
      const y = 3.3 - i * 0.62, a = rng() * 6.28;
      const g = new THREE.Group();
      g.position.set(0, y, 0);
      g.rotation.y = a;
      g.add(box(1.5, 0.45, 0.05, rust, { x: 0.8, z: 0.02 }));
      g.add(sign(1.35, 0.34, Math.floor(rng() * 16), { x: 0.8, z: 0.06 }));
      g.add(sign(1.35, 0.34, Math.floor(rng() * 16), { x: 0.8, z: -0.02, ry: Math.PI }));
      obj.add(g, { collider: 'none', mass: 6, surf: 'metal' });
    }
    obj.add(sph(0.14, LAMP, { y: 3.95, ws: 8, hs: 6, cast: false }), { collider: 'none', mass: 1, surf: 'metal' });
  },
};

/* ═════════════ Strommast ═════════════ */
export const powerPole = {
  id: 'powerPole',
  label: 'Strommast',
  category: CAT,
  tag: 'Requisite',
  hint: 'Holzmast mit Querträger und Isolatoren; die Leitungen zieht die Stadtplanung später dazwischen',
  buildStyle: 'pop',
  params: [{ key: 'h', label: 'Höhe', type: 'range', min: 6, max: 11, step: 0.5, value: 8, unit: 'm' }, seedParam(33)],
  build(obj, p) {
    const wood = M.wood(0x8a7050), gray = M.metal('gray');
    obj.add(cyl(0.12, 0.17, p.h, wood, { y: p.h / 2, radial: 6, rz: 0.02 }), { mass: 60, surf: 'wood' });
    obj.add(box(2.2, 0.12, 0.14, wood, { y: p.h - 0.5 }), { collider: 'none', mass: 8, surf: 'wood' });
    obj.add(box(1.4, 0.1, 0.12, wood, { y: p.h - 1.4 }), { collider: 'none', mass: 6, surf: 'wood' });
    for (const x of [-1, -0.4, 0.4, 1]) obj.add(cyl(0.04, 0.05, 0.22, gray, { x, y: p.h - 0.32, radial: 5 }), { collider: 'none', mass: 1, surf: 'metal' });
    for (const x of [-0.6, 0.6]) obj.add(cyl(0.04, 0.05, 0.22, gray, { x, y: p.h - 1.22, radial: 5 }), { collider: 'none', mass: 1, surf: 'metal' });
    obj.add(box(0.6, 0.5, 0.3, M.metal('olive'), { y: 3, z: 0.22 }), { collider: 'none', mass: 8, surf: 'metal' }); // Kasten
    obj.add(box(0.1, 1.0, 0.04, gray, { x: 0.3, y: p.h * 0.4, z: 0.14 }), { collider: 'none', mass: 1, surf: 'metal' }); // Strebe
  },
};

/* ═════════════ Banner ═════════════ */
export const banner = {
  id: 'banner',
  label: 'Banner',
  category: CAT,
  tag: 'Requisite',
  hint: 'Hoher Mast mit langem, ausgefranstem Stoffbanner',
  buildStyle: 'pop',
  params: [
    { key: 'color', label: 'Farbe', type: 'select', options: [['0', 'Rotbraun'], ['1', 'Indigo'], ['2', 'Oliv'], ['3', 'Senf']], value: '0' },
    { key: 'h', label: 'Höhe', type: 'range', min: 4, max: 9, step: 0.5, value: 6, unit: 'm' },
    seedParam(34),
  ],
  build(obj, p) {
    const c = [0x8c3a2a, 0x2e4a6a, 0x6b7a42, 0xb08a30][Number(p.color)];
    obj.add(cyl(0.06, 0.09, p.h, M.metal('gray'), { y: p.h / 2, radial: 6 }), { mass: 20, surf: 'metal' });
    obj.add(cyl(0.025, 0.025, 1.3, M.metal('gray'), { x: 0.6, y: p.h - 0.2, rz: Math.PI / 2, radial: 4 }), { collider: 'none', mass: 2, surf: 'metal' });
    obj.add(cloth(1.0, p.h * 0.55, M.cloth(c), { x: 0.6, y: p.h - 0.2 - p.h * 0.275, sag: 0, ripple: 0.2, seed: p.seed, segX: 4, segY: 10 }), { collider: 'none', mass: 6, surf: 'cloth' });
    obj.add(sph(0.1, M.metal('rust'), { y: p.h + 0.1, ws: 6, hs: 5, cast: false }), { collider: 'none', mass: 1, surf: 'metal' });
  },
};

/* ═════════════ Sandsäcke ═════════════ */
export const sandbags = {
  id: 'sandbags',
  label: 'Sandsackwall',
  category: CAT,
  tag: 'Befestigung',
  hint: 'Gestapelte Sandsäcke als Deckung, mit Lücke und Tarnnetz',
  buildStyle: 'pop',
  params: [{ key: 'len', label: 'Länge', type: 'range', min: 2, max: 10, step: 0.5, value: 5, unit: 'm' }, { key: 'rows', label: 'Lagen', type: 'range', min: 1, max: 4, step: 1, value: 3 }, seedParam(35)],
  build(obj, p) {
    const rng = mulberry32(p.seed);
    const cl = M.cloth(0xa89468);
    const per = Math.round(p.len / 0.55);
    for (let r = 0; r < p.rows; r++) for (let i = 0; i < per - (r % 2); i++) {
      if (r === p.rows - 1 && rng() < 0.25) continue;
      obj.add(sph(0.3, cl, { x: -p.len / 2 + (i + 0.5 + (r % 2) * 0.5) * (p.len / per), y: 0.17 + r * 0.3, z: (rng() - 0.5) * 0.05, sx: 1, sy: 0.5, sz: 0.65, ry: (rng() - 0.5) * 0.15, ws: 8, hs: 5 }), { mass: 20, surf: 'cloth', collider: 'none' });
    }
    obj.add(box(p.len, p.rows * 0.3, 0.38, HIDDEN, { y: p.rows * 0.15, cast: false, recv: false }), { mass: 200, surf: 'cloth' });
  },
};

/* ═════════════ Straßenlampe ═════════════ */
export const streetLamp = {
  id: 'streetLamp',
  label: 'Straßenlampe',
  category: CAT,
  tag: 'Requisite',
  hint: 'Mast mit Laterne; nachts warmes Licht (Stadt-Uhrzeit)',
  buildStyle: 'pop',
  params: [{ key: 'h', label: 'Höhe', type: 'range', min: 3, max: 6, step: 0.25, value: 4.2, unit: 'm' }, { key: 'arm', label: 'Ausleger', type: 'bool', value: true }, seedParam(36)],
  build(obj, p) {
    const gray = M.metal('gray');
    obj.add(cyl(0.06, 0.1, p.h, gray, { y: p.h / 2, radial: 6 }), { mass: 20, surf: 'metal' });
    obj.add(cyl(0.16, 0.16, 0.2, gray, { y: 0.1, radial: 8 }), { mass: 10, surf: 'metal' });
    if (p.arm) {
      obj.add(box(0.9, 0.06, 0.06, gray, { x: 0.4, y: p.h - 0.1 }), { collider: 'none', mass: 4, surf: 'metal' });
      obj.add(box(0.34, 0.3, 0.34, LAMP, { x: 0.8, y: p.h - 0.28 }), { collider: 'none', mass: 3, surf: 'metal' });
      obj.add(cyl(0.02, 0.28, 0.12, gray, { x: 0.8, y: p.h - 0.04, radial: 4, ry: 0.78 }), { collider: 'none', mass: 2, surf: 'metal' });
    } else {
      obj.add(box(0.34, 0.4, 0.34, LAMP, { y: p.h + 0.12 }), { collider: 'none', mass: 3, surf: 'metal' });
      obj.add(cyl(0.02, 0.3, 0.14, gray, { y: p.h + 0.4, radial: 4, ry: 0.78 }), { collider: 'none', mass: 2, surf: 'metal' });
    }
  },
};

/* ═════════════ Rohrleitung ═════════════ */
export const pipeRun = {
  id: 'pipeRun',
  label: 'Rohrleitung',
  category: CAT,
  tag: 'Industrie',
  hint: 'Dicke Rohre auf Stützen mit Flanschen, Ventilen und einem Knick – verbindet Werke miteinander (Länge entlang X)',
  buildStyle: 'assemble',
  params: [
    { key: 'len', label: 'Länge', type: 'range', min: 4, max: 24, step: 1, value: 12, unit: 'm' },
    { key: 'n', label: 'Rohre', type: 'range', min: 1, max: 3, step: 1, value: 2 },
    { key: 'pal', label: 'Farbe', type: 'select', options: PAL_OPTIONS, value: 'gray' },
    seedParam(37),
  ],
  build(obj, p) {
    const rng = mulberry32(p.seed);
    const L = p.len;
    for (let i = 0; i < p.n; i++) {
      const m = M.metal(i === 0 ? p.pal : pick(rng, ['rust', 'gray', 'blue']));
      const z = (i - (p.n - 1) / 2) * 0.55, r = 0.2 + rng() * 0.08;
      obj.add(cyl(r, r, L, m, { y: 0.8, z, rz: Math.PI / 2, radial: 10 }), { mass: 60, surf: 'metal' });
      for (let k = 0; k <= Math.round(L / 3); k++) obj.add(cyl(r + 0.04, r + 0.04, 0.1, M.metal('rust'), { x: -L / 2 + (L * k) / Math.round(L / 3), y: 0.8, z, rz: Math.PI / 2, radial: 10, cast: false }), { collider: 'none', mass: 3, surf: 'metal' });
      if (rng() < 0.6) obj.add(torus(0.3, 0.05, M.metal('red'), { x: (rng() - 0.5) * L * 0.5, y: 1.15, z, ry: Math.PI / 2, ts: 10 }), { collider: 'none', mass: 2, surf: 'metal' });
    }
    for (let k = 0; k <= Math.round(L / 4); k++) {
      const x = -L / 2 + (L * k) / Math.round(L / 4);
      obj.add(box(0.2, 0.8, p.n * 0.55 + 0.2, M.metal('rust'), { x, y: 0.4 }), { collider: 'none', mass: 14, surf: 'metal' });
    }
  },
};

/* ═════════════ Gestrüpp / Felsen / Totholz ═════════════ */
export const scrub = {
  id: 'scrub',
  label: 'Dornbusch',
  category: CAT,
  tag: 'Natur',
  hint: 'Trockenes Gestrüpp aus verholzten Ästen, graugrün',
  buildStyle: 'pop',
  params: [{ key: 'size', label: 'Größe', type: 'range', min: 0.6, max: 2.2, step: 0.1, value: 1.2, unit: 'm' }, seedParam(38)],
  build(obj, p) {
    const rng = mulberry32(p.seed);
    const wood = M.wood(0x8a7a5a), leaf = M.cloth(pick(rng, [0x7d8458, 0x8a8a5c, 0x6f7a50]));
    for (let i = 0; i < 8; i++) {
      const a = rng() * 6.28, t = 0.4 + rng() * 0.6;
      obj.add(cyl(0.012, 0.035, p.size * t * 1.2, wood, { x: Math.sin(a) * 0.1, y: p.size * t * 0.5, z: Math.cos(a) * 0.1, rz: Math.sin(a) * 0.9, rx: Math.cos(a) * 0.9, radial: 4, cast: false }), { collider: 'none', mass: 1, surf: 'wood' });
    }
    for (let i = 0; i < 5; i++) obj.add(sph(p.size * 0.3, leaf, { x: (rng() - 0.5) * p.size * 0.6, y: p.size * (0.3 + rng() * 0.4), z: (rng() - 0.5) * p.size * 0.6, sy: 0.7, ws: 6, hs: 4, cast: false }), { collider: 'none', mass: 1, surf: 'cloth' });
  },
};

export const rocks = {
  id: 'rocks',
  label: 'Felsgruppe',
  category: CAT,
  tag: 'Natur',
  hint: 'Verwitterte Felsbrocken, halb im Sand',
  buildStyle: 'rise',
  params: [{ key: 'size', label: 'Größe', type: 'range', min: 1, max: 6, step: 0.25, value: 2.5, unit: 'm' }, seedParam(39)],
  build(obj, p) {
    const rng = mulberry32(p.seed);
    const m = M.clay(pick(rng, ['dark', 'red', 'adobe']));
    for (let i = 0; i < 3 + Math.floor(p.size); i++) {
      const s = p.size * between(rng, 0.25, 0.6) * (i === 0 ? 1.3 : 1);
      obj.add(sph(s, m, { x: (rng() - 0.5) * p.size * 1.2, y: s * 0.35, z: (rng() - 0.5) * p.size * 1.2, sx: between(rng, 0.9, 1.5), sy: between(rng, 0.55, 0.95), sz: between(rng, 0.9, 1.4), ry: rng() * 3, ws: 7, hs: 5, dmg: 0.12, seed: p.seed + i }), { mass: 200 * s, surf: 'clay', fracture: i === 0 ? [2, 2, 2] : null });
    }
    obj.add(sandDrift(0, 0, p.size * 0.6), { collider: 'none', mass: 4, surf: 'clay' });
  },
};

export const barricade = {
  id: 'barricade',
  label: 'Panzersperre',
  category: CAT,
  tag: 'Befestigung',
  hint: 'Stahlträger-Igel und Stacheldraht-Böcke gegen Fahrzeuge',
  buildStyle: 'pop',
  params: [{ key: 'n', label: 'Anzahl', type: 'range', min: 1, max: 6, step: 1, value: 3 }, seedParam(40)],
  build(obj, p) {
    const rng = mulberry32(p.seed);
    const rust = M.metal('rust');
    for (let i = 0; i < p.n; i++) {
      const x = (i - (p.n - 1) / 2) * 1.9 + (rng() - 0.5) * 0.3, z = (rng() - 0.5) * 0.5;
      const g = new THREE.Group();
      g.position.set(x, 0.62, z);
      g.rotation.y = rng() * 3;
      for (const [rx, rz] of [[0.78, 0], [0, 0.78], [0.78, 0.78]]) g.add(box(0.14, 1.6, 0.14, rust, { rx, rz }));
      obj.add(g, { mass: 80, surf: 'metal', collider: { type: 'box', size: [1.3, 1.3, 1.3], offset: [0, 0, 0] } });
    }
    obj.add(box(p.n * 1.9, 0.05, 0.05, M.dark(0x222222), { y: 0.9, cast: false }), { collider: 'none', mass: 2, surf: 'metal' });
  },
};

export const brazier = {
  id: 'brazier',
  label: 'Feuerkorb',
  category: CAT,
  tag: 'Licht',
  hint: 'Eiserner Feuerkorb auf drei Beinen mit Glut (leuchtet immer)',
  buildStyle: 'pop',
  params: [seedParam(41)],
  build(obj) {
    const rust = M.metal('rust');
    for (let i = 0; i < 3; i++) { const a = i * 2.09; obj.add(cyl(0.03, 0.04, 0.9, rust, { x: Math.sin(a) * 0.2, y: 0.4, z: Math.cos(a) * 0.2, rz: Math.sin(a) * 0.2, rx: -Math.cos(a) * 0.2, radial: 5 }), { collider: 'none', mass: 3, surf: 'metal' }); }
    obj.add(cyl(0.4, 0.2, 0.3, rust, { y: 0.98, radial: 10 }), { mass: 14, surf: 'metal' });
    obj.add(sph(0.34, FIREGLOW, { y: 1.1, sy: 0.6, ws: 8, hs: 5, cast: false }), { collider: 'none', mass: 1, surf: 'metal' });
  },
};
