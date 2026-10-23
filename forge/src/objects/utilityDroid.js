// Wartungsdroide: kantiger Rumpf mit Rückentank, Visier-Kopf, dünne Beine. Läuft (Figur).
import * as THREE from 'three';
import { M } from '../core/materials.js';
import { box, cyl, sph, tube } from '../core/helpers.js';
import { damageParam, seedParam, PAL_OPTIONS } from './_common.js';

const EYES = [['orange', 'Orange', 0xff8a2a], ['blue', 'Blau', 0x4ab4ff], ['red', 'Rot', 0xff3a2a], ['green', 'Grün', 0x5cff8a]];

export default {
  id: 'utilityDroid',
  label: 'Wartungsdroide',
  category: 'Kulisse & Beispiele',
  tag: 'läuft',
  hint: 'Kantiger Servicedroide mit Visier und Rückentank. Steuern mit WASD.',
  params: [
    { key: 'pal', label: 'Lack', type: 'select', options: PAL_OPTIONS, value: 'sand' },
    { key: 'eye', label: 'Visierfarbe', type: 'select', options: EYES.map(([v, l]) => [v, l]), value: 'orange' },
    { key: 'size', label: 'Größe', type: 'range', min: 0.7, max: 1.4, step: 0.01, value: 1, fmt: (v) => '×' + v.toFixed(2) },
    { key: 'antenna', label: 'Antenne', type: 'bool', value: true },
    { key: 'arms', label: 'Greifarme', type: 'bool', value: true },
    damageParam(0.5),
    seedParam(4),
  ],

  build(obj, p) {
    obj.mode = 'character';
    const k = p.size, dm = p.damage;
    obj.character = { radius: 0.26 * k, height: 1.15 * k, speed: 1.8, jump: 3.2, mass: 40 };
    const paint = M.metal(p.pal);
    const gray = M.metal('gray');
    const dark = M.metal('black');
    const rust = M.metal('rust');
    const eyeColor = EYES.find((e) => e[0] === p.eye)[2];
    const eye = M.glow(eyeColor, 2.2);
    const ref = (n, g) => (obj.anim[n] = g);

    // Beine
    for (const s of [-1, 1]) {
      const g = new THREE.Group();
      g.position.set(s * 0.14 * k, 0.42 * k, 0);
      g.add(cyl(0.032 * k, 0.028 * k, 0.4 * k, gray, { y: -0.2 * k, radial: 8 }));
      g.add(cyl(0.05 * k, 0.05 * k, 0.1 * k, dark, { y: -0.03 * k, radial: 8 }));
      g.add(box(0.15 * k, 0.06 * k, 0.28 * k, dark, { y: -0.41 * k, z: 0.05 * k, dmg: dm * 0.015 * k, seed: p.seed + s }));
      obj.add(g, { mass: 5 });
      ref(s < 0 ? 'legR' : 'legL', g);
    }

    // Rumpf: kantiger Kasten mit Tank-Zylinder auf dem Rücken, Panelen, Lüftung
    const body = box(0.4 * k, 0.5 * k, 0.32 * k, paint, { y: 0.68 * k, dmg: dm * 0.05 * k, seed: p.seed + 2, seg: [3, 3, 3] });
    body.add(box(0.26 * k, 0.14 * k, 0.03 * k, dark, { y: 0.08 * k, z: 0.17 * k }));
    for (let i = 0; i < 4; i++) body.add(box(0.2 * k, 0.012 * k, 0.03 * k, gray, { y: -0.1 * k + i * 0.024 * k, z: 0.172 * k }));
    body.add(box(0.2 * k, 0.24 * k, 0.03 * k, rust, { x: -0.08 * k, y: 0.0, z: -0.17 * k, ry: 0.15, dmg: dm * 0.02, seed: 5 }));
    body.add(cyl(0.085 * k, 0.085 * k, 0.46 * k, gray, { x: 0.1 * k, y: 0.0, z: -0.24 * k, radial: 12 }));
    body.add(cyl(0.06 * k, 0.06 * k, 0.4 * k, M.metal('olive'), { x: -0.08 * k, y: 0.0, z: -0.26 * k, radial: 10 }));
    obj.add(body, { mass: 18 });
    obj.add(box(0.34 * k, 0.07 * k, 0.26 * k, gray, { y: 0.4 * k }), { mass: 3, collider: 'none' });

    // Kopf: breiter Kasten mit Visierband und zwei Ohrzylindern
    const head = new THREE.Group();
    head.position.set(0, 1.0 * k, 0);
    head.add(box(0.34 * k, 0.2 * k, 0.26 * k, paint, { dmg: dm * 0.04 * k, seed: p.seed + 7, seg: [3, 2, 3] }));
    head.add(box(0.3 * k, 0.06 * k, 0.03 * k, dark, { y: 0.01 * k, z: 0.135 * k }));
    head.add(box(0.2 * k, 0.03 * k, 0.03 * k, eye, { y: 0.01 * k, z: 0.15 * k }));
    for (const s of [-1, 1]) head.add(cyl(0.05 * k, 0.05 * k, 0.07 * k, gray, { x: s * 0.2 * k, rz: Math.PI / 2, radial: 10 }));
    head.add(box(0.12 * k, 0.05 * k, 0.12 * k, dark, { y: -0.125 * k }));
    if (p.antenna) {
      for (const s of [-1, 1]) head.add(cyl(0.007 * k, 0.011 * k, 0.28 * k * (s < 0 ? 1 : 0.65), gray, { x: s * 0.11 * k, y: 0.22 * k, radial: 6, rz: s * 0.12 }));
      head.add(sph(0.02 * k, M.glow(0xff3a2a, 1.4), { x: -0.11 * k - 0.017 * k, y: 0.36 * k, ws: 8, hs: 6 }));
    }
    obj.add(head, { mass: 6 });
    ref('head', head);

    // Greifarme
    if (p.arms) {
      for (const s of [-1, 1]) {
        const g = new THREE.Group();
        g.position.set(s * 0.26 * k, 0.86 * k, 0);
        g.add(cyl(0.032 * k, 0.026 * k, 0.4 * k, gray, { y: -0.2 * k, radial: 8 }));
        g.add(box(0.07 * k, 0.07 * k, 0.07 * k, dark, { y: -0.42 * k }));
        g.add(box(0.015 * k, 0.07 * k, 0.015 * k, gray, { x: 0.025 * k, y: -0.48 * k }));
        g.add(box(0.015 * k, 0.07 * k, 0.015 * k, gray, { x: -0.025 * k, y: -0.48 * k }));
        obj.add(g, { mass: 2 });
        ref(s < 0 ? 'armR' : 'armL', g);
      }
    }
    // Kabelbaum an der Seite
    obj.add(tube([[0.2 * k, 0.9 * k, -0.1 * k], [0.28 * k, 0.7 * k, -0.18 * k], [0.18 * k, 0.5 * k, -0.2 * k]], 0.012 * k, dark), { mass: 0.5, collider: 'none' });
        obj.anim.phase = 0;
  },

  onFrame(obj, dt) {
    const a = obj.anim;
    if (obj.state !== 'active' || !a.legL) return;
    const sp = obj.character?.speedNow ?? 0;
    const walk = Math.min(1, sp / 1.2);
    a.phase += dt * (5 + sp * 2);
    const sw = Math.sin(a.phase) * 0.7 * walk;
    a.legL.rotation.x = sw;
    a.legR.rotation.x = -sw;
    if (a.armL) {
      a.armL.rotation.x = -sw * 0.6;
      a.armR.rotation.x = sw * 0.6;
    }
    // Kopf schaut sich um, wenn er steht
    a.head.rotation.y = Math.sin(obj.time * 0.8) * 0.6 * (1 - walk);
    a.head.rotation.z = Math.sin(a.phase * 2) * 0.04 * walk;
  },
};
