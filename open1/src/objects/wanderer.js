// Wüstenwanderer: Mensch in langem Gewand mit Kapuze, Schutzbrille und Rucksack. Läuft (Figur).
// Blickrichtung +Z. Die Beine und Arme pendeln beim Gehen (siehe onFrame).
import * as THREE from 'three';
import { M } from '../core/materials.js';
import { box, cyl, sph, torus, mk } from '../core/helpers.js';
import { mulberry32 } from '../core/noise.js';
import { seedParam } from './_common.js';

const ROBES = [['sand', 'Sand'], ['umber', 'Umbra'], ['gray', 'Grau-braun'], ['indigo', 'Indigo, verblasst'], ['olive', 'Oliv']];
const ROBE_COLOR = { sand: 0xb59c74, umber: 0x6a4e38, gray: 0x7a7266, indigo: 0x4a5266, olive: 0x6a6a45 };

export default {
  id: 'wanderer',
  label: 'Wüstenwanderer',
  category: 'Kulisse & Beispiele',
  tag: 'läuft',
  hint: 'Mensch in Wickelgewand mit Kapuze und Staubbrille. Steuern mit WASD.',
  params: [
    { key: 'height', label: 'Körpergröße', type: 'range', min: 1.5, max: 2.05, step: 0.01, value: 1.78, unit: 'm' },
    { key: 'robe', label: 'Gewand', type: 'select', options: ROBES, value: 'sand' },
    { key: 'hood', label: 'Kapuze', type: 'bool', value: true },
    { key: 'goggles', label: 'Staubbrille', type: 'bool', value: true },
    { key: 'pack', label: 'Rucksack', type: 'bool', value: true },
    { key: 'ragged', label: 'Zerschlissenheit', type: 'range', min: 0, max: 1, step: 0.01, value: 0.5, fmt: (v) => Math.round(v * 100) + ' %' },
    seedParam(2),
  ],

  build(obj, p) {
    obj.mode = 'character';
    const k = p.height / 1.8;
    obj.character = { radius: 0.3, height: p.height, speed: 2.4, jump: 4.6, mass: 75 };
    const rng = mulberry32(p.seed);
    const rag = p.ragged;
    const robeC = ROBE_COLOR[p.robe];
    const robe = M.cloth(robeC);
    const robeD = M.cloth(new THREE.Color(robeC).multiplyScalar(0.72).getHex());
    const skin = M.cloth(0x9a6f52);
    const leather = M.cloth(0x4a3a2c);
    const dark = M.metal('black');
    const gray = M.metal('gray');
    const lens = M.glow(0xffa24a, 0.9);

    const ref = (name, g) => (obj.anim[name] = g);

    // Beine (Drehpunkt = Hüfte)
    for (const s of [-1, 1]) {
      const g = new THREE.Group();
      g.position.set(s * 0.11 * k, 0.9 * k, 0);
      g.add(cyl(0.085 * k, 0.062 * k, 0.78 * k, robeD, { y: -0.4 * k, radial: 10, dmg: rag * 0.012 * k, seed: p.seed + s }));
      g.add(box(0.13 * k, 0.16 * k, 0.28 * k, leather, { y: -0.84 * k, z: 0.04 * k, dmg: rag * 0.01, seed: 4 + s }));
      obj.add(g, { mass: 9, surf: 'cloth' });
      ref(s < 0 ? 'legR' : 'legL', g);
    }

    // Rumpf, langes Gewand, Gürtel
    obj.add(cyl(0.2 * k, 0.25 * k, 0.6 * k, robe, { y: 1.2 * k, radial: 14, hseg: 4, dmg: rag * 0.01 * k, seed: p.seed + 5 }), { mass: 22, surf: 'cloth' });
    obj.add(cyl(0.25 * k, 0.31 * k, 0.6 * k, robe, { y: 0.7 * k, radial: 18, hseg: 5, dmg: rag * 0.03 * k, seed: p.seed + 6 }), { mass: 14, surf: 'cloth', collider: 'none' });
    obj.add(torus(0.255 * k, 0.03 * k, leather, { y: 0.96 * k, rx: Math.PI / 2, ts: 18, rs: 5 }), { mass: 3, surf: 'cloth', collider: 'none' });
    for (const s of [-1, 1]) obj.add(box(0.1 * k, 0.13 * k, 0.07 * k, leather, { x: s * 0.2 * k, y: 0.94 * k, z: 0.2 * k }), { mass: 1, surf: 'cloth', collider: 'none' });
    // Schärpe quer über der Brust
    obj.add(box(0.1 * k, 0.62 * k, 0.04 * k, leather, { y: 1.22 * k, z: 0.215 * k, rz: 0.78, tpm: 1.5 }), { mass: 1, surf: 'cloth', collider: 'none' });

    // Arme (Drehpunkt = Schulter)
    for (const s of [-1, 1]) {
      const g = new THREE.Group();
      g.position.set(s * 0.27 * k, 1.46 * k, 0);
      g.add(cyl(0.07 * k, 0.055 * k, 0.6 * k, robe, { y: -0.28 * k, radial: 10, dmg: rag * 0.012 * k, seed: p.seed + 8 + s }));
      g.add(sph(0.05 * k, skin, { y: -0.62 * k, ws: 10, hs: 8 }));
      obj.add(g, { mass: 5, surf: 'cloth' });
      ref(s < 0 ? 'armR' : 'armL', g);
    }

    // Kopf
    const head = new THREE.Group();
    head.position.set(0, 1.64 * k, 0.01 * k);
    head.add(sph(0.108 * k, skin, { ws: 16, hs: 12 }));
    if (p.hood) {
      const hood = sph(0.15 * k, robe, { ws: 18, hs: 12, thetaLength: 2.35, y: 0.01 * k, z: -0.02 * k, sz: 1.05, sy: 1.05, dmg: rag * 0.008 * k, seed: p.seed + 11 });
      hood.rotation.x = -0.3;
      head.add(hood);
      head.add(torus(0.12 * k, 0.026 * k, robe, { y: -0.02 * k, z: 0.0, rx: Math.PI / 2 + 0.2, ts: 16, rs: 5 }));
    } else {
      head.add(sph(0.112 * k, M.cloth(0x2a2018), { ws: 14, hs: 8, thetaLength: 1.5, y: 0.015 * k }));
    }
    if (p.goggles) {
      head.add(torus(0.108 * k, 0.014 * k, dark, { y: 0.015 * k, z: 0.0, rx: Math.PI / 2, ts: 18, rs: 5 }));
      for (const s of [-1, 1]) {
        head.add(cyl(0.032 * k, 0.032 * k, 0.03 * k, lens, { x: s * 0.045 * k, y: 0.02 * k, z: 0.098 * k, rx: Math.PI / 2, radial: 12 }));
        head.add(torus(0.034 * k, 0.008 * k, dark, { x: s * 0.045 * k, y: 0.02 * k, z: 0.103 * k, ts: 12, rs: 4 }));
      }
    }
    // Gesichtstuch
    head.add(sph(0.114 * k, robeD, { ws: 14, hs: 8, thetaStart: 1.75, thetaLength: 0.7, y: -0.005 * k, z: 0.012 * k }));
    obj.add(head, { mass: 5, surf: 'cloth' });
    ref('head', head);

    // Schal
    obj.add(torus(0.12 * k, 0.045 * k, robeD, { y: 1.53 * k, rx: Math.PI / 2, ts: 18, rs: 6 }), { mass: 2, surf: 'cloth', collider: 'none' });

    // Rucksack mit Wasserschlauch
    if (p.pack) {
      const pack = box(0.36 * k, 0.46 * k, 0.2 * k, leather, { y: 1.24 * k, z: -0.24 * k, dmg: rag * 0.015, seed: p.seed + 12, tpm: 1.5 });
      pack.add(cyl(0.07 * k, 0.07 * k, 0.34 * k, gray, { y: 0.0, z: -0.14 * k, rz: Math.PI / 2, radial: 10 }));
      pack.add(box(0.3 * k, 0.05 * k, 0.215 * k, robeD, { y: 0.12 * k, tpm: 1.5 }));
      obj.add(pack, { mass: 8, surf: 'cloth' });
    }

    obj.anim.phase = 0;
    obj.anim.rag = rng();
  },

  onFrame(obj, dt) {
    const a = obj.anim;
    if (obj.state !== 'active' || !a.legL) return;
    const sp = obj.character?.speedNow ?? 0;
    const walk = Math.min(1, sp / 1.6);
    a.phase += dt * (3.2 + sp * 2.1);
    const sw = Math.sin(a.phase) * 0.8 * walk;
    const breathe = Math.sin(obj.time * 1.6) * 0.012;
    a.legL.rotation.x = sw;
    a.legR.rotation.x = -sw;
    a.armL.rotation.x = -sw * 0.8 + breathe;
    a.armR.rotation.x = sw * 0.8 - breathe;
    a.armL.rotation.z = -0.06;
    a.armR.rotation.z = 0.06;
    a.head.rotation.x = Math.sin(a.phase * 2) * 0.03 * walk;
    a.head.position.y = a.head.userData.y0 ??= a.head.position.y;
    a.head.position.y = a.head.userData.y0 + Math.abs(Math.sin(a.phase)) * 0.02 * walk;
    if (!obj.character.grounded) {
      a.armL.rotation.x = -2.2; a.armR.rotation.x = -2.2;
    }
  },
};
