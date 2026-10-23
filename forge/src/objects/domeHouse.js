// Lehmkuppel-Haus: Wandring aus Blöcken, Eingangsvorbau, Kuppel aus Schalen, Antenne, Einrichtung.
import * as THREE from 'three';
import { M } from '../core/materials.js';
import { box, cyl, sph, torus, cloth, mk, scaleUV, crumple } from '../core/helpers.js';
import { mulberry32 } from '../core/noise.js';
import { damageParam, seedParam, CLAY_OPTIONS } from './_common.js';

export default {
  id: 'domeHouse',
  label: 'Lehmkuppel-Haus',
  category: 'Kulisse & Beispiele',
  tag: 'statisch',
  hint: 'Rundes Wohnhaus aus Lehm mit Vorbau, Metalltür und Antenne',
  buildStyle: 'rise',
  params: [
    { key: 'radius', label: 'Radius', type: 'range', min: 3.5, max: 9, step: 0.1, value: 5, unit: 'm' },
    { key: 'wallH', label: 'Wandhöhe', type: 'range', min: 2.4, max: 4.2, step: 0.1, value: 2.8, unit: 'm' },
    { key: 'rise', label: 'Kuppelhöhe', type: 'range', min: 0.35, max: 0.95, step: 0.01, value: 0.6, fmt: (v) => Math.round(v * 100) + ' % vom Radius' },
    { key: 'doorW', label: 'Türbreite', type: 'range', min: 1.1, max: 2.6, step: 0.05, value: 1.6, unit: 'm' },
    { key: 'clay', label: 'Putz', type: 'select', options: CLAY_OPTIONS, value: 'adobe' },
    { key: 'windows', label: 'Bullaugen', type: 'range', min: 0, max: 6, step: 1, value: 3 },
    damageParam(0.35),
    seedParam(11),
  ],

  build(obj, p) {
    const rng = mulberry32(p.seed);
    const r = p.radius, H = p.wallH, T = 0.55, dm = p.damage, rise = p.rise;
    const clay = M.clay(p.clay);
    const clayD = M.clay(p.clay, { side: THREE.DoubleSide });
    const dark = M.clay('dark');
    const wood = M.wood(0xb59a78);
    const mGray = M.metal('gray');
    const mRust = M.metal('rust');
    const mOlive = M.metal('olive');
    const mDish = M.metal('gray', { side: THREE.DoubleSide });
    const sandMat = M.clay('adobe', { sandBias: 3, noSand: 0 });

    // Boden
    obj.add(cyl(r - 0.04, r - 0.04, 0.06, dark, { y: 0.03, radial: 48 }), { collider: 'none', mass: 8, surf: 'clay' });

    // Wandring: Segmente um die Türlücke herum auslassen
    const N = Math.max(16, Math.round(r * 4.6));
    const step = (Math.PI * 2) / N;
    const outerR = r + T / 2;
    const len = 2 * outerR * Math.tan(step / 2) * 1.03;
    const doorW = p.doorW;
    const Hv = H; // Vorbau gleich hoch wie die Wand
    const wantGap = doorW + 1.0; // Platz für Vorbau-Seitenwände
    let k = Math.max(2, Math.round(wantGap / len / 2) * 2); // gerade Anzahl, Tür liegt auf einer Segmentgrenze
    const gapHalf = (k * step) / 2;
    for (let i = 0; i < N; i++) {
      const a = (i + 0.5) * step;
      const d = Math.atan2(Math.sin(a), Math.cos(a));
      if (Math.abs(d) < gapHalf) continue;
      if (dm > 0.55 && rng() < (dm - 0.55) * 0.3) continue; // eingestürzte Stelle
      const hv = 1 - dm * rng() * 0.2 + (rng() - 0.5) * 0.012;
      const w = box(len, H * hv, T, clay, { dmg: dm * 0.05, seed: p.seed + i, x: Math.sin(a) * r, y: (H * hv) / 2, z: Math.cos(a) * r, ry: a });
      obj.add(w, { fracture: [2, 3, 1], mass: 240, surf: 'clay' });
    }

    // Vorbau mit exakter Türöffnung
    const Wv = 2 * r * Math.sin(gapHalf); // Breite der Lücke (Sehne)
    const zEdge = r * Math.cos(gapHalf);
    const depth = 1.5;
    const zFront = zEdge + depth;
    const st = 0.42;
    for (const s of [-1, 1]) {
      obj.add(
        box(st, Hv, depth + 0.5, clay, { x: s * (Wv / 2), y: Hv / 2, z: zEdge + (depth - 0.5) / 2 + 0.25 - 0.0, dmg: dm * 0.04, seed: p.seed + 90 + s }),
        { fracture: [1, 3, 2], mass: 180, surf: 'clay' }
      );
      const pw = Wv / 2 + st / 2 - doorW / 2;
      obj.add(
        box(pw, 2.3, T, clay, { x: s * (doorW / 2 + pw / 2), y: 1.15, z: zFront, dmg: dm * 0.04, seed: p.seed + 95 + s }),
        { fracture: [1, 2, 1], mass: 120, surf: 'clay' }
      );
      // Türpfosten
      obj.add(box(0.2, 2.3, T + 0.14, mRust, { x: s * (doorW / 2 + 0.1), y: 1.15, z: zFront, dmg: dm * 0.02, seed: p.seed + 99 + s }), { mass: 35, surf: 'metal' });
    }
    // Sturz + Aufsatz + Dach des Vorbaus
    obj.add(box(doorW + 0.4, 0.26, T + 0.14, wood, { x: 0, y: 2.43, z: zFront, dmg: dm * 0.02, seed: p.seed + 7 }), { mass: 45, surf: 'wood' });
    obj.add(box(Wv + st, Hv - 2.56, T, clay, { x: 0, y: 2.56 + (Hv - 2.56) / 2, z: zFront, dmg: dm * 0.04, seed: p.seed + 8 }), { fracture: [3, 1, 1], mass: 150, surf: 'clay' });
    obj.add(box(Wv + st + 0.3, 0.28, depth + 0.9, clay, { x: 0, y: Hv + 0.14, z: zEdge + (depth + 0.9) / 2 - 0.4, dmg: dm * 0.03, seed: p.seed + 9 }), { fracture: [3, 1, 2], mass: 260, surf: 'clay' });

    // Tür, halb aufgeschwungen
    {
      const phi = 0.95, w = doorW * 0.52;
      const hx = -doorW / 2 + 0.04, hz = zFront + T / 2 + 0.06;
      const leaf = box(w, 2.1, 0.07, mRust, {
        x: hx + (Math.cos(phi) * w) / 2, y: 1.08, z: hz + (Math.sin(phi) * w) / 2, ry: -phi, dmg: 0.02 + dm * 0.05, seed: p.seed + 12, w: [0.2, 0.2, 1],
      });
      obj.add(leaf, { mass: 40, surf: 'metal', collider: 'none' });
      obj.add(box(w * 0.7, 0.18, 0.1, mGray, { x: hx + (Math.cos(phi) * w) / 2, y: 1.2, z: hz + (Math.sin(phi) * w) / 2 + 0.01, ry: -phi }), { mass: 5, collider: 'none' });
    }

    // Kuppel aus Schalen (damit sie zerbrechen kann)
    const domeR = outerR + 0.05;
    const rings = 3, segs = Math.max(12, Math.round(r * 3.4));
    const edges = [0, 0.36, 0.7, 1].map((t) => (t * Math.PI) / 2);
    const tpm = clayD.userData.tpm;
    for (let j = 0; j < rings; j++) {
      for (let i = 0; i < segs; i++) {
        const th0 = edges[j], th1 = edges[j + 1], ph0 = (i / segs) * Math.PI * 2, ph1 = ((i + 1) / segs) * Math.PI * 2;
        const geo = new THREE.SphereGeometry(domeR, 8, 6, ph0, ph1 - ph0, th0, th1 - th0);
        geo.scale(1, rise, 1);
        const aw = domeR * Math.sin((th0 + th1) / 2) * (ph1 - ph0), ah = domeR * (th1 - th0) * (0.5 + rise / 2);
        scaleUV(geo, aw * tpm, ah * tpm);
        if (dm * 0.05 > 0.004) crumple(geo, dm * 0.05, 1.1, p.seed + 300);
        const m = mk(geo, clayD, { y: H - 0.06 });
        obj.add(m, { mass: 55, surf: 'clay', order: H + j, shrink: 0.5 });
      }
    }
    const topY = H - 0.06 + rise * domeR;

    // Luke + Antenne
    {
      const g = new THREE.Group();
      g.position.set(0, topY - 0.05, 0);
      g.add(cyl(0.55, 0.62, 0.3, mGray, { y: 0.1, radial: 20 }));
      g.add(cyl(0.035, 0.05, 2.3, mGray, { y: 1.3 }));
      const dish = sph(0.5, mDish, { thetaLength: 1.15, ws: 20, hs: 8, y: 2.0, rx: -2.3, ry: 0.4 });
      g.add(dish);
      g.add(cyl(0.015, 0.015, 0.6, mGray, { y: 2.2, z: 0.28, rx: Math.PI / 2 - 0.4 }));
      const blink = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshStandardMaterial({ color: 0x220000, emissive: 0xff2a12, emissiveIntensity: 2 }));
      blink.position.y = 2.46;
      g.add(blink);
      obj.anim.blink = blink;
      obj.add(g, { collider: 'none', mass: 30, surf: 'metal', order: topY + 5 });
    }

    // Balkenköpfe (Vigas) rund um den Wandkranz
    for (let i = 0; i < N; i += 3) {
      const a = (i + 0.5) * step;
      const d = Math.atan2(Math.sin(a), Math.cos(a));
      if (Math.abs(d) < gapHalf + step) continue;
      const g = new THREE.Group();
      g.rotation.y = a;
      g.position.y = H - 0.28;
      g.add(cyl(0.06, 0.075, 0.9, wood, { z: r + 0.1, rx: Math.PI / 2, radial: 8 }));
      obj.add(g, { collider: 'none', mass: 4, surf: 'wood', order: H });
    }

    // Bullaugen
    const win = M.glow(0xffb464, 1.1);
    for (let n = 0; n < p.windows; n++) {
      const a = Math.PI * 0.55 + (n / Math.max(1, p.windows)) * Math.PI * 1.75 + 0.05 * (rng() - 0.5);
      const g = new THREE.Group();
      g.rotation.y = a;
      g.position.y = 1.7 + (rng() - 0.5) * 0.35;
      g.add(torus(0.34, 0.055, mRust, { z: r + T / 2 + 0.01, ts: 20 }));
      g.add(cyl(0.32, 0.32, 0.06, win, { z: r + T / 2 - 0.02, rx: Math.PI / 2, radial: 18 }));
      obj.add(g, { collider: 'none', mass: 8, surf: 'metal', order: 1.5 });
    }

    // Sonnensegel über dem Eingang
    {
      const g = new THREE.Group();
      g.position.set(0, 2.85, zFront + 0.9);
      const c = cloth(Wv + 1.6, 1.9, M.cloth(0xb9a07a), { sag: 0.16, ripple: 0.07, seed: p.seed, segX: 12, segY: 6 });
      c.rotation.set(-Math.PI / 2 + 0.38, 0, 0);
      c.castShadow = true;
      g.add(c);
      for (const s of [-1, 1]) g.add(cyl(0.045, 0.05, 2.9, mGray, { x: s * (Wv / 2 + 0.7), y: -1.45, z: 0.95, radial: 8 }));
      obj.add(g, { collider: 'none', mass: 20, surf: 'cloth', order: 2.8 });
    }

    // Einrichtung
    obj.add(box(1.5, 0.08, 0.85, wood, { x: -r * 0.3, y: 0.82, z: -r * 0.25, ry: 0.3 }), { mass: 20, surf: 'wood', collider: { type: 'box', size: [1.5, 0.9, 0.85], offset: [0, -0.45, 0] } });
    for (const s of [-1, 1]) obj.add(cyl(0.2, 0.2, 0.46, mOlive, { x: -r * 0.3 + s * 0.9, y: 0.23, z: -r * 0.25 + 0.5 * s, radial: 12 }), { mass: 8, surf: 'metal' });
    for (let i = 0; i < 3; i++) {
      const a = 2.2 + i * 0.45;
      obj.add(box(0.8, 0.7, 0.8, wood, { x: Math.sin(a) * (r - 0.8), y: 0.35, z: Math.cos(a) * (r - 0.8), ry: a }), { fracture: [2, 2, 2], mass: 22, surf: 'wood' });
    }
    // Lampe
    const lamp = mk(new THREE.SphereGeometry(0.14, 12, 10), M.glow(0xffc77a, 3), { y: H + rise * r * 0.55, cast: false });
    obj.add(lamp, { collider: 'none', mass: 2, surf: 'metal' });
    const lampLight = new THREE.PointLight(0xffb868, 26, 14, 2);
    lampLight.position.set(0, H + rise * r * 0.45, 0);
    obj.light(lampLight);

    // Sandverwehungen am Fuß
    for (let i = 0; i < 5; i++) {
      const a = rng() * Math.PI * 2;
      if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < gapHalf + 0.2) continue;
      const s = 0.9 + rng() * 1.1;
      const m = sph(1, sandMat, { x: Math.sin(a) * (outerR + 0.1), y: 0.04, z: Math.cos(a) * (outerR + 0.1), sx: s * 1.6, sy: 0.22, sz: s * 0.8, ry: a, ws: 14, hs: 8, cast: false });
      obj.add(m, { collider: 'none', mass: 2, surf: 'clay', order: 0 });
    }
  },

  onFrame(obj) {
    const b = obj.anim.blink;
    if (b && obj.state !== 'exploded') b.material.emissiveIntensity = Math.sin(obj.time * 3.2) > 0.6 ? 3 : 0.15;
  },
};
