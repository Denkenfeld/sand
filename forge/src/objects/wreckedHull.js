// Gestrandetes Frachterwrack: aufgeplatzter Rumpf, Triebwerksgondel, Flossen, Trümmerplatten. Statisch.
import * as THREE from 'three';
import { M } from '../core/materials.js';
import { box, cyl, torus, tube } from '../core/helpers.js';
import { mulberry32 } from '../core/noise.js';
import { damageParam, seedParam, PAL_OPTIONS } from './_common.js';

export default {
  id: 'wreckedHull',
  label: 'Frachterwrack',
  category: 'Kulisse & Beispiele',
  tag: 'statisch',
  hint: 'Abgestürzter Transporter, halb im Sand. Gut als Kulisse und Deckung.',
  buildStyle: 'drop',
  params: [
    { key: 'length', label: 'Länge', type: 'range', min: 8, max: 22, step: 0.5, value: 14, unit: 'm' },
    { key: 'pal', label: 'Lack', type: 'select', options: PAL_OPTIONS, value: 'white' },
    { key: 'tilt', label: 'Schieflage', type: 'range', min: 0, max: 0.5, step: 0.01, value: 0.14, fmt: (v) => (v * 57.3).toFixed(0) + '°' },
    { key: 'debris', label: 'Trümmerplatten', type: 'range', min: 0, max: 16, step: 1, value: 7 },
    damageParam(0.7),
    seedParam(33),
  ],

  build(obj, p) {
    const rng = mulberry32(p.seed);
    const dm = p.damage, L = p.length;
    const paint = M.metal(p.pal), gray = M.metal('gray'), dark = M.metal('black'), rust = M.metal('rust');
    const sandMat = M.clay('adobe', { sandBias: 4 });
    // Schieflage: Position und Orientierung jedes Teils um den Ursprung kippen
    const tiltQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(p.tilt * 0.6, 0, -p.tilt));
    const sink = 0.35; // wie tief der Rumpf im Sand steckt
    const T = (m) => {
      m.position.applyQuaternion(tiltQ);
      m.position.y -= sink;
      m.quaternion.premultiply(tiltQ);
      return m;
    };
    const part = (m, o) => obj.add(T(m), o);

    const W = 4.6, Hh = 2.6;
    // Hauptrumpf in drei Abschnitten
    const sec = L / 3;
    for (let i = 0; i < 3; i++) {
      const z = (i - 1) * sec;
      const w = W * (i === 2 ? 0.8 : 1), h = Hh * (i === 2 ? 0.85 : 1);
      part(box(w, h, sec * 0.98, paint, { y: h / 2 + 0.4, z, dmg: dm * (0.1 + 0.05 * i), seed: p.seed + i, freq: 0.8 }), { mass: 900, fracture: [3, 2, 3] });
      // Deckplatten
      part(box(w * 0.92, 0.1, sec * 0.9, gray, { y: h + 0.46, z, dmg: dm * 0.15, seed: p.seed + 10 + i }), { mass: 80, collider: 'none' });
    }
    // Bugspitze, aufgerissen
    part(box(W * 0.7, Hh * 0.7, 3.2, paint, { y: Hh * 0.35 + 0.35, z: L / 2 + 2.0, rx: 0.28, dmg: dm * 0.3, seed: p.seed + 20, freq: 0.7 }), { mass: 500, fracture: [2, 2, 2] });
    part(box(W * 0.45, 0.3, 2.2, paint, { y: Hh * 0.55, z: L / 2 + 3.4, rx: 0.5, dmg: dm * 0.25, seed: p.seed + 21 }), { mass: 120, collider: 'none' });
    // Cockpit-Fensterband
    part(box(W * 0.5, 0.4, 0.12, M.glass(0x2d3a40, 0.6), { y: Hh * 0.8, z: L / 2 + 0.6, cast: false }), { mass: 10, collider: 'none' });

    // Triebwerksgondeln, eine abgerissen
    for (const s of [-1, 1]) {
      const torn = s > 0;
      const e = cyl(0.95, 1.1, 4.2, gray, { radial: 18, hseg: 6, dmg: dm * 0.06, seed: p.seed + 30 + s });
      e.add(torus(1.1, 0.12, dark, { y: -2.0, rx: Math.PI / 2, ts: 20, rs: 6 }));
      e.add(cyl(0.7, 0.7, 0.1, M.glow(0x2a1a10, 0.3), { y: -2.15, radial: 16 }));
      e.position.set(s * (W / 2 + 1.1), 1.45, -L / 2 - 0.8);
      e.rotation.x = Math.PI / 2;
      if (torn) { e.position.set(W / 2 + 4.2, 0.9, -L / 2 + 1); e.rotation.set(Math.PI / 2 - 0.2, 0.6, 0.35); }
      part(e, { mass: 300 });
    }
    // Leitwerk
    part(box(0.2, 3.4, 2.8, paint, { y: Hh + 1.9, z: -L / 2 - 0.2, rx: -0.2, dmg: dm * 0.2, seed: p.seed + 35 }), { mass: 120, collider: 'none', fracture: [1, 3, 2] });
    part(box(4.6, 0.18, 1.8, paint, { x: 0, y: Hh + 0.9, z: -L / 2 - 1, dmg: dm * 0.2, seed: p.seed + 36 }), { mass: 100, collider: 'none' });

    // Aufgerissene Wand: Rippen und Kabel ragen heraus
    for (let i = 0; i < 4; i++) {
      const x = -W / 2 + 0.5 + i * 0.9;
      part(box(0.12, 1.8 + rng() * 0.8, 0.12, dark, { x, y: Hh + 0.7, z: sec * 0.2 + rng() * 0.6, rz: (rng() - 0.5) * 0.7, rx: (rng() - 0.5) * 0.4 }), { mass: 12, collider: 'none' });
    }
    for (let i = 0; i < 4; i++) {
      const x = -1.6 + i * 0.9, z = L * 0.12;
      part(tube([[x, Hh + 0.4, z], [x + rng() - 0.5, Hh + 1.1, z + rng() * 0.8], [x + rng() * 2 - 1, Hh + 0.2, z + 1 + rng()]], 0.04, dark, { segs: 14 }), { mass: 2, collider: 'none' });
    }

    // Trümmerplatten im Umkreis
    for (let i = 0; i < p.debris; i++) {
      const a = rng() * Math.PI * 2, r = L * 0.45 + rng() * L * 0.7;
      const w = 0.7 + rng() * 1.8, d = 0.6 + rng() * 1.5;
      const m = box(w, 0.1 + rng() * 0.1, d, rng() < 0.7 ? paint : rust, { x: Math.sin(a) * r * 0.6, y: 0.12, z: Math.cos(a) * r, ry: rng() * 3, rx: (rng() - 0.5) * 0.35, rz: (rng() - 0.5) * 0.35, dmg: dm * 0.18, seed: p.seed + 100 + i });
      obj.add(m, { mass: 60, surf: 'metal' });
    }

    // Sandverwehungen am Rumpf
    for (let i = 0; i < 6; i++) {
      const z = (rng() - 0.5) * L, s = 1.5 + rng() * 2;
      const mound = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8), sandMat);
      mound.position.set((rng() < 0.5 ? -1 : 1) * (W / 2 + 0.2), 0.05, z);
      mound.scale.set(s * 0.9, 0.55, s * 1.4);
      mound.receiveShadow = true;
      obj.add(mound, { mass: 5, surf: 'clay', collider: 'none', order: 0 });
    }
  },
};
