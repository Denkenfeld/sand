// Vorratsstapel: Kisten und Fässer als einzelne, bewegliche Körper (Modus "rigid").
import * as THREE from 'three';
import { M } from '../core/materials.js';
import { box, cyl, torus } from '../core/helpers.js';
import { mulberry32 } from '../core/noise.js';
import { damageParam, seedParam } from './_common.js';

export default {
  id: 'supplyPile',
  label: 'Vorratsstapel',
  category: 'Kulisse & Beispiele',
  tag: 'beweglich',
  hint: 'Kisten und Fässer, jedes Teil ein eigener Körper – kippt, rutscht, zerbricht',
  buildStyle: 'drop',
  params: [
    { key: 'rows', label: 'Kistenreihen', type: 'range', min: 1, max: 5, step: 1, value: 3 },
    { key: 'depth', label: 'Tiefe', type: 'range', min: 1, max: 3, step: 1, value: 2 },
    { key: 'barrels', label: 'Fässer', type: 'range', min: 0, max: 8, step: 1, value: 4 },
    { key: 'barrelPal', label: 'Fassfarbe', type: 'select', options: [['rust', 'Rost'], ['blue', 'Blau'], ['olive', 'Oliv'], ['gray', 'Grau'], ['red', 'Rot']], value: 'blue' },
    damageParam(0.4),
    seedParam(5),
  ],

  build(obj, p) {
    obj.mode = 'rigid';
    const rng = mulberry32(p.seed);
    const wood = M.wood(0xc2a47c);
    const woodD = M.wood(0x8e7658);
    const strap = M.metal('gray');
    const s = 0.9, gap = 0.04;
    const dm = p.damage;

    const crate = (x, y, z, ry) => {
      const m = box(s, s, s, rng() < 0.5 ? wood : woodD, { x, y, z, ry, dmg: dm * 0.03, seed: (rng() * 999) | 0 });
      for (const k of [-1, 1]) m.add(box(s + 0.03, 0.07, s + 0.03, strap, { y: k * s * 0.32, tpm: 0.5 }));
      obj.add(m, { fracture: [2, 2, 2], mass: 28, surf: 'wood' });
    };

    for (let d = 0; d < p.depth; d++) {
      const rows = Math.max(1, p.rows - d);
      for (let row = 0; row < rows; row++) {
        const n = rows - row;
        for (let i = 0; i < n; i++) {
          const x = (i - (n - 1) / 2) * (s + gap) + (rng() - 0.5) * 0.03;
          crate(x, s / 2 + row * (s + 0.002), d * (s + gap), (rng() - 0.5) * 0.05);
        }
      }
    }

    const barrelMat = M.metal(p.barrelPal);
    const ringMat = M.metal('gray');
    for (let i = 0; i < p.barrels; i++) {
      const a = (i / Math.max(1, p.barrels)) * Math.PI - Math.PI * 0.1;
      const bx = Math.cos(a) * (p.rows * 0.55 + 1.2 + rng() * 0.4);
      const bz = -0.8 - Math.sin(a) * 1.3 - rng() * 0.3;
      const b = cyl(0.3, 0.3, 0.9, barrelMat, { x: bx, y: 0.45, z: bz, radial: 16, dmg: dm * 0.02, seed: i + p.seed, hseg: 6 });
      for (const k of [-1, 0, 1]) b.add(torus(0.305, 0.022, ringMat, { y: k * 0.3, rx: Math.PI / 2, ts: 16, rs: 5 }));
      b.add(cyl(0.2, 0.22, 0.05, ringMat, { y: 0.46, radial: 12 }));
      obj.add(b, { mass: 32, surf: 'metal' });
    }
  },
};
