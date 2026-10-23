// Gemeinsamer Baukasten für Gebäude, Fahrzeuge und Kreaturen: Kristalle, Solarflächen, Geländer,
// Leitern, Räder, Warnstreifen, Flaggen, Rauch-/Flammen-Emitter und Flackerlicht.
import * as THREE from 'three';
import { M, weatherize } from '../core/materials.js';
import { box, cyl, sph, torus, mk, cloth } from '../core/helpers.js';
import { env } from '../core/forge.js';
import { mulberry32 } from '../core/noise.js';

const cache = new Map();
const memo = (k, f) => {
  if (!cache.has(k)) cache.set(k, f());
  return cache.get(k);
};
const cv = (w, h = w) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};
const tex = (c, srgb = true) => {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

/* ───────────── Materialien ───────────── */
export const crystalMat = (color = 0x3ad8ff, k = 1.7) =>
  memo('cr' + color + k, () => new THREE.MeshStandardMaterial({ color: 0x0c2a33, emissive: color, emissiveIntensity: k, roughness: 0.22, metalness: 0.1, transparent: true, opacity: 0.93 }));

export const solarMat = () =>
  memo('solar', () => {
    const c = cv(128), g = c.getContext('2d');
    g.fillStyle = '#16283f';
    g.fillRect(0, 0, 128, 128);
    const gr = g.createLinearGradient(0, 0, 128, 128);
    gr.addColorStop(0, 'rgba(90,130,190,.28)');
    gr.addColorStop(1, 'rgba(10,20,40,.2)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
    g.strokeStyle = 'rgba(170,190,210,.55)';
    g.lineWidth = 2;
    for (let i = 0; i <= 4; i++) {
      g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, 128); g.stroke();
      g.beginPath(); g.moveTo(0, i * 32); g.lineTo(128, i * 32); g.stroke();
    }
    const m = new THREE.MeshStandardMaterial({ map: tex(c), roughness: 0.3, metalness: 0.55 });
    m.userData.tpm = 0.8;
    return weatherize(m, { wearable: 0 });
  });

// gelb-schwarze Warnstreifen
export const hazardMat = () =>
  memo('hazard', () => {
    const c = cv(64), g = c.getContext('2d');
    g.fillStyle = '#d6a21c';
    g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#1c1a18';
    for (let i = -2; i < 6; i++) {
      g.beginPath();
      g.moveTo(i * 16, 0); g.lineTo(i * 16 + 8, 0); g.lineTo(i * 16 + 72, 64); g.lineTo(i * 16 + 64, 64);
      g.fill();
    }
    const m = new THREE.MeshStandardMaterial({ map: tex(c), roughness: 0.7, metalness: 0.2 });
    m.userData.tpm = 0.6;
    return weatherize(m, { wearable: 0 });
  });

// feines Netz (Taufänger, Gitter): halbtransparent, grobe Maschen damit es auch aus der Ferne ein Netz bleibt
export const netMat = (color = 0xcfcab8) =>
  memo('net' + color, () => {
    const c = cv(64), g = c.getContext('2d');
    g.clearRect(0, 0, 64, 64);
    g.strokeStyle = '#ffffff';
    g.lineWidth = 2;
    for (let i = 0; i <= 4; i++) {
      g.beginPath(); g.moveTo(i * 16 + 1, 0); g.lineTo(i * 16 + 1, 64); g.stroke();
      g.beginPath(); g.moveTo(0, i * 16 + 1); g.lineTo(64, i * 16 + 1); g.stroke();
    }
    const t = tex(c);
    const m = new THREE.MeshStandardMaterial({ map: t, color, alphaMap: t, alphaTest: 0.04, transparent: true, depthWrite: false, side: THREE.DoubleSide, roughness: 0.9 });
    m.userData.tpm = 1.6;
    return m;
  });

export const waterMat = () =>
  memo('water', () => new THREE.MeshStandardMaterial({ color: 0x2f6f86, roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.8 }));

export const spiceMat = () =>
  memo('spice', () => {
    const m = new THREE.MeshStandardMaterial({ color: 0xb8561c, roughness: 0.95, emissive: 0x3a1204, emissiveIntensity: 0.5 });
    m.userData.tpm = 1;
    return m;
  });

export const shieldMat = (color = 0x58c8ff) =>
  memo('shield' + color, () =>
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })
  );

/* ───────────── Bauteile ───────────── */
// Kristall, h = Gesamthöhe, Mittelpunkt in der Mitte
export function crystal(h, r, o = {}, color = 0x3ad8ff, k = 1.7) {
  const g = new THREE.OctahedronGeometry(r, 0);
  g.scale(1, h / 2 / r, 1);
  return mk(g, crystalMat(color, k), { cast: false, ...o });
}

// Kristallhaufen (Gruppe), Spitzen nach oben
export function crystalCluster(n, seed, spread, H, color = 0x3ad8ff, k = 1.7) {
  const rng = mulberry32(seed);
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const a = rng() * Math.PI * 2, d = rng() * spread;
    const hh = H * (0.45 + rng() * 0.75);
    const c = crystal(hh, hh * 0.22, { x: Math.cos(a) * d, y: hh * 0.45, z: Math.sin(a) * d, rx: (rng() - 0.5) * 0.7, rz: (rng() - 0.5) * 0.7, ry: rng() * 3 }, color, k);
    g.add(c);
  }
  return g;
}

// Geländer entlang der X-Achse (Länge len), Boden bei y=0
export function railing(len, mat, o = {}) {
  const g = new THREE.Group();
  const n = Math.max(1, Math.round(len / 1.2));
  for (let i = 0; i <= n; i++) g.add(cyl(0.028, 0.028, 1.0, mat, { x: -len / 2 + (len * i) / n, y: 0.5, radial: 6, cast: true }));
  for (const y of [0.55, 1.0]) g.add(box(len, 0.035, 0.035, mat, { y }));
  return place(g, o);
}

export function ladder(h, mat, o = {}) {
  const g = new THREE.Group();
  for (const s of [-1, 1]) g.add(box(0.04, h, 0.04, mat, { x: s * 0.2, y: h / 2 }));
  for (let y = 0.3; y < h; y += 0.3) g.add(box(0.4, 0.03, 0.03, mat, { y }));
  return place(g, o);
}

function place(g, o) {
  g.position.set(o.x ?? 0, o.y ?? 0, o.z ?? 0);
  g.rotation.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0);
  if (o.s) g.scale.setScalar(o.s);
  return g;
}

// Rad mit Reifenprofil und Felge. Achse = X (wie der Buggy)
export function wheel(R, width, rimMat) {
  const g = new THREE.Group();
  const tire = new THREE.CylinderGeometry(R, R, width, 26, 1);
  tire.rotateZ(Math.PI / 2);
  g.add(mk(tire, M.tread()));
  g.add(cyl(R * 0.58, R * 0.58, width * 1.04, rimMat, { rz: Math.PI / 2, radial: 14 }));
  g.add(cyl(R * 0.2, R * 0.2, width * 1.3, M.metal('black'), { rz: Math.PI / 2, radial: 8 }));
  return g;
}

// Räder anlegen und passende Einträge für obj.vehicle.wheels liefern
// defs: [{ x, z, drive?, steer?, R? }] (x: Mitte des Rades, links = +X)
export function addWheels(obj, defs, { R = 0.5, width = 0.36, rest = 0.34, rimMat = M.metal('gray'), mass = 18 } = {}) {
  return defs.map((d) => {
    const r = d.R ?? R;
    const g = wheel(r, d.width ?? width, rimMat);
    g.position.set(d.x, r, d.z);
    const part = obj.add(g, { group: 'wheel', collider: { type: 'cyl', r, h: d.width ?? width, axis: 'x' }, mass, surf: 'rubber' });
    return { x: d.x, y: r + (d.rest ?? rest), z: d.z, part, drive: d.drive ?? true, steer: !!d.steer, radius: r };
  });
}

// Fahrzeugdaten aus Masse und Wunschbeschleunigung
// top = Höchstgeschwindigkeit (m/s), steerK = Lenkeinschlag nimmt mit Tempo ab (höher = träger), roll = Wankneigung
export function vehicleSpec(mass, wheels, { accel = 6, rest = 0.34, travel = 0.3, grip = 3.4, maxSteer = 0.5, stiffness = 34, top = 22, steerK = 0.06, roll = 0 } = {}) {
  const drive = Math.max(1, wheels.filter((w) => w.drive).length);
  return { mass, wheelRadius: wheels[0].radius, wheels, rest, travel, stiffness, engine: (mass * accel) / drive, maxSteer, brake: mass * 0.12, grip, compress: 4.4, relax: 2.4, maxSpeed: top, steerK, roll };
}

// Stab/Strebe zwischen zwei Punkten [x,y,z] (Gittertürme, Verstrebungen)
const _up = new THREE.Vector3(0, 1, 0), _d = new THREE.Vector3();
export function strut(a, b, r, mat, radial = 6) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const m = cyl(r, r, A.distanceTo(B), mat, { radial });
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(_up, _d.copy(B).sub(A).normalize());
  return m;
}

// Gittermast: quadratischer Querschnitt (w0 unten → w1 oben), Höhe H, Ebenen levels
export function lattice(w0, w1, H, levels, mat, matD = mat, r = 0.09) {
  const g = new THREE.Group();
  const corners = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
  const pt = (c, t) => { const w = w0 + (w1 - w0) * t; return [c[0] * w, t * H, c[1] * w]; };
  for (const c of corners) g.add(strut(pt(c, 0), pt(c, 1), r, mat, 7));
  for (let l = 0; l <= levels; l++) {
    const t = l / levels;
    for (let k = 0; k < 4; k++) g.add(strut(pt(corners[k], t), pt(corners[(k + 1) % 4], t), r * 0.5, mat));
    if (l < levels) {
      const t2 = (l + 1) / levels;
      for (let k = 0; k < 4; k++) {
        const flip = (l + k) % 2;
        g.add(strut(pt(corners[k], flip ? t : t2), pt(corners[(k + 1) % 4], flip ? t2 : t), r * 0.4, matD));
      }
    }
  }
  return g;
}

// Mast mit Leuchtkopf (Gruppe, Boden bei y=0)
export function lampPost(h = 3.4, mat = M.metal('gray'), color = 0xfff0c8, k = 2.4, pos = [0, 0, 0]) {
  const g = new THREE.Group();
  g.position.set(pos[0], pos[1], pos[2]);
  g.add(cyl(0.05, 0.08, h, mat, { y: h / 2, radial: 6 }));
  g.add(box(0.6, 0.12, 0.3, M.glow(color, k), { y: h + 0.05 }));
  return g;
}

export function flag(color = 0xb23d22, w = 1.2, h = 0.8, o = {}) {
  return cloth(w, h, M.cloth(color), { sag: 0, ripple: 0.14, segX: 8, segY: 4, ...o });
}

/* ───────────── Laufzeit (onFrame) ───────────── */
export const alive = (obj) => obj.state === 'active';

const _v = new THREE.Vector3();
// Dauerhafter Rauch/Flammen an einem lokalen Punkt. rate = Partikel pro Sekunde
export function emit(obj, key, local, dt, rate, kind = 'smoke', size = 1) {
  if (!alive(obj)) return;
  const a = (obj.anim.emit ??= {});
  a[key] = Math.min(4, (a[key] ?? 0) + dt * rate);
  while (a[key] >= 1) {
    a[key] -= 1;
    _v.set(local[0], local[1], local[2]);
    obj.root.localToWorld(_v);
    if (kind === 'flame') env.fx.flame(_v, size);
    else if (kind === 'dust') env.fx.dust(_v, 1, size, 0.6);
    else env.fx.chimney(_v, size);
  }
}

// Lichter leicht flackern lassen (Feuer, Ofen)
export function flicker(obj, amount = 0.18, speed = 9) {
  if (!alive(obj)) return;
  const t = obj.time * speed;
  const f = 1 - amount * 0.5 + amount * (0.5 * Math.sin(t) + 0.3 * Math.sin(t * 2.3 + 1.7) + 0.2 * Math.sin(t * 5.1));
  for (const l of obj.lights) l.light.intensity = l.base * f;
}

// Pulsierendes Leuchten eines Materials
export function pulse(mat, t, lo, hi, speed = 2) {
  mat.emissiveIntensity = lo + (hi - lo) * (0.5 + 0.5 * Math.sin(t * speed));
}

// Humanoide Laufanimation (Beine/Arme/Kopf aus obj.anim)
export function animateHumanoid(obj, dt, { legAmp = 0.8, speedK = 2.1 } = {}) {
  const a = obj.anim;
  if (!alive(obj) || !a.legL) return;
  const sp = obj.character?.speedNow ?? 0;
  const walk = Math.min(1, sp / 1.6);
  a.phase = (a.phase ?? 0) + dt * (3.2 + sp * speedK);
  const sw = Math.sin(a.phase) * legAmp * walk;
  const breathe = Math.sin(obj.time * 1.6) * 0.012;
  a.legL.rotation.x = sw;
  a.legR.rotation.x = -sw;
  if (a.armL) { a.armL.rotation.x = -sw * 0.8 + breathe; a.armL.rotation.z = -0.06; }
  if (a.armR && !a.armRFixed) { a.armR.rotation.x = sw * 0.8 - breathe; a.armR.rotation.z = 0.06; }
  if (a.head) a.head.rotation.x = Math.sin(a.phase * 2) * 0.03 * walk;
}

export { M, box, cyl, sph, torus, mk, cloth, mulberry32, THREE };
