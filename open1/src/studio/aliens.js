// Eingebaute Alien-Figur „Skitter“ (sechsbeiniger Läufer). Blickrichtung +Z, wie alle Figuren.
// Läuft über dieselbe Figuren-Schnittstelle wie Wanderer & Krieger: obj.character.speedNow, obj.character.attack (0–1).
import * as THREE from 'three';
import { M } from '../core/materials.js';
import { box, cyl, sph } from '../core/helpers.js';
import { mulberry32 } from '../core/noise.js';

const EYES = { red: 0xff3a3a, green: 0x7aff6a, violet: 0xb06aff, amber: 0xffb43a };

// Zylinder von A nach B in der XY-Ebene
function seg(a, b, r0, r1, mat) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
  return cyl(r1, r0, L, mat, { x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, rz: Math.atan2(-dx, dy), radial: 6 });
}

export const skitter = {
  id: 'skitter',
  label: 'Skitter',
  category: 'Studio',
  tag: 'Alien',
  hint: 'Sechsbeiniger Läufer, greift im Rudel an.',
  params: [
    { key: 'eye', label: 'Augenfarbe', type: 'select', options: [['red', 'Rot'], ['green', 'Grün'], ['violet', 'Violett'], ['amber', 'Bernstein']], value: 'green' },
    { key: 'hue', label: 'Panzer', type: 'select', options: [['dark', 'Dunkel'], ['rust', 'Rost'], ['moss', 'Moos']], value: 'dark' },
    { key: 'seed', label: 'Seed', type: 'seed', value: 3 },
  ],
  build(obj, p) {
    obj.mode = 'character';
    obj.character = { radius: 0.42, height: 1.05, speed: 5, jump: 4, mass: 40 };
    const rng = mulberry32(p.seed);
    const shell = M.cloth({ dark: 0x2b2733, rust: 0x5a2c1e, moss: 0x2c3a26 }[p.hue]);
    const belly = M.cloth(0x4a4036);
    const bone = M.cloth(0x8a8070);
    const eye = M.glow(EYES[p.eye], 3);
    const H = 0.62; // Hüfthöhe

    // Körper
    obj.add(sph(0.3, shell, { y: H, sx: 0.85, sy: 0.7, sz: 1.5, ws: 14, hs: 10 }), { mass: 10, collider: 'none' });
    obj.add(sph(0.2, belly, { y: H - 0.08, z: -0.05, sx: 0.8, sy: 0.55, sz: 1.5, ws: 10, hs: 8 }), { mass: 2, collider: 'none' });
    for (let i = 0; i < 4; i++) obj.add(cyl(0.0, 0.05, 0.2 + rng() * 0.08, bone, { y: H + 0.24, z: -0.25 + i * 0.17, rx: -0.25, radial: 4 }), { mass: 1, collider: 'none' });
    obj.add(cyl(0.0, 0.09, 0.8, shell, { y: H + 0.05, z: -0.78, rx: -Math.PI / 2 + 0.5, radial: 6 }), { mass: 1, collider: 'none' });

    // Kopf mit Kiefern (Drehpunkt = Hals)
    const head = new THREE.Group();
    head.position.set(0, H + 0.04, 0.5);
    head.add(sph(0.16, shell, { sx: 0.95, sy: 0.85, sz: 1.2, ws: 12, hs: 9, z: 0.1 }));
    for (const s of [-1, 1]) {
      head.add(sph(0.04, eye, { x: s * 0.08, y: 0.05, z: 0.23, ws: 6, hs: 5, cast: false }));
      head.add(cyl(0.0, 0.03, 0.24, bone, { x: s * 0.06, y: -0.07, z: 0.3, rx: Math.PI / 2 + 0.35, rz: s * 0.25, radial: 4 }));
    }
    obj.add(head, { mass: 3, collider: 'none' });
    obj.anim.head = head;

    // Sechs Beine (Drehpunkt = Hüfte), Dreiergang
    obj.anim.legs = [];
    for (const [i, z] of [0.3, 0, -0.3].entries()) for (const s of [-1, 1]) {
      const g = new THREE.Group();
      g.position.set(s * 0.17, H - 0.02, z * 1.1);
      const knee = [s * 0.44, 0.2], foot = [s * 0.62, -H + 0.02];
      g.add(seg([0, 0], knee, 0.035, 0.028, shell));
      g.add(seg(knee, foot, 0.028, 0.012, bone));
      obj.add(g, { mass: 1, collider: 'none' });
      obj.anim.legs.push({ g, ph: ((i + (s > 0 ? 1 : 0)) % 2) * Math.PI, side: s, z });
    }
    obj.anim.phase = rng() * 6;
  },

  onFrame(obj, dt) {
    const a = obj.anim;
    if (obj.state !== 'active' || !a.legs) return;
    const sp = obj.character?.speedNow ?? 0;
    const walk = Math.min(1, sp / 2.5);
    a.phase += dt * (4 + sp * 1.8);
    const atk = obj.character?.attack ?? 0;
    for (const L of a.legs) {
      const sw = Math.sin(a.phase + L.ph);
      L.g.rotation.x = sw * 0.55 * walk + (Math.abs(L.z) < 0.01 ? 0 : -atk * 0.3);
      L.g.rotation.z = -L.side * Math.max(0, Math.cos(a.phase + L.ph)) * 0.35 * walk;
    }
    a.head.rotation.x = Math.sin(obj.time * 2.2) * 0.04 + atk * 0.55;
    a.head.position.z = 0.5 + atk * 0.12;
    a.head.rotation.y = Math.sin(obj.time * 1.3) * 0.08 * (1 - walk);
  },
};
