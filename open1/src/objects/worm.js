// Sandwürmer: ein Baukasten, zwei Objekte – der wilde Sandwurm (Gegner & Kreaturen) und der gezähmte Wurm (Truppen).
// Der Körper ist eine Kurve aus Ringsegmenten, die sich aus einer Sandwehe aufrichtet; vorne der Rachen mit Zahnringen.
import * as THREE from 'three';
import { tube } from '../core/helpers.js';
import { M, box, cyl, sph, torus, mk, mulberry32, flag, emit, alive } from './kit.js';
import { damageParam, seedParam } from './_common.js';

const UP = new THREE.Vector3(0, 1, 0), FWD = new THREE.Vector3(0, 0, 1);
const SKINS = [['adobe', 'Sandgelb'], ['dark', 'Schiefer'], ['red', 'Rostrot']];

function orient(m, dir, from = UP) {
  m.quaternion.setFromUnitVectors(from, dir.clone().normalize());
  return m;
}

function buildWorm(obj, p, tamed) {
  const rng = mulberry32(p.seed), dm = p.damage, S = p.size;
  const hide = M.clay(p.skin), bone = M.clay('white'), dark = M.metal('black'), gray = M.metal('gray'), rust = M.metal('rust');
  const H = p.rear, L = 7.5;
  const pts = [[0, -2.2, -L], [0, -0.7, -L * 0.74], [0, H * 0.16, -L * 0.45], [0, H * 0.52, -L * 0.2], [0, H * 0.9, L * 0.02], [0, H, L * 0.26], [0, H - 0.8, L * 0.46]]
    .map((q) => new THREE.Vector3(q[0] * S, q[1] * S, q[2] * S));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
  const N = 24;
  const radius = (t) => S * (1.25 + 0.2 * Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.5) + (t > 0.9 ? 0.2 : 0));
  const P = [], T = [], R = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    P.push(curve.getPoint(t));
    T.push(curve.getTangent(t).normalize());
    R.push(radius(t));
  }
  const chunkN = 5, chunks = [];
  for (let k = 0; k < chunkN; k++) chunks.push({ g: new THREE.Group(), idx: [] });

  // Segmente + Panzerringe
  for (let i = 0; i < N; i++) {
    const c = chunks[Math.min(chunkN - 1, Math.floor((i * chunkN) / N))];
    const a = P[i], b = P[i + 1], len = a.distanceTo(b);
    const seg = cyl(R[i + 1], R[i], len * 1.08, hide, { radial: 16, dmg: dm * 0.08 * S, seed: p.seed + i, tpm: 0.5 });
    seg.position.copy(a).add(b).multiplyScalar(0.5);
    orient(seg, b.clone().sub(a));
    c.g.add(seg);
    c.idx.push(i);
    const ring = torus(R[i] * 1.0, 0.1 * S, bone, { rs: 5, ts: 16, dmg: 0 });
    ring.position.copy(a);
    ring.quaternion.setFromUnitVectors(FWD, T[i]);
    c.g.add(ring);
  }

  // Rückenstacheln (wild: viele und lang, gezähmt: stumpfe Noppen)
  const outN = (i) => new THREE.Vector3(0, T[i].z, -T[i].y).normalize();
  for (let i = 3; i < N - 3; i += tamed ? 3 : 2) {
    const c = chunks[Math.min(chunkN - 1, Math.floor((i * chunkN) / N))];
    const len = (tamed ? 0.3 : 0.5 + rng() * 0.7) * S;
    const n = outN(i);
    const sp = cyl(0.0, 0.14 * S * (tamed ? 1.3 : 1), len, bone, { radial: 6 });
    sp.position.copy(P[i]).addScaledVector(n, R[i] + len * 0.35);
    orient(sp, n.clone().add(new THREE.Vector3(0, 0, -0.35)));
    c.g.add(sp);
  }

  // Kopf: Wulst, Rachen, Zahnringe
  const hp = P[N], ht = T[N];
  const pivot = new THREE.Group();
  pivot.position.copy(hp);
  pivot.quaternion.setFromUnitVectors(FWD, ht);
  const mouthG = new THREE.Group();
  pivot.add(mouthG);
  const hr = R[N] * 1.12;
  mouthG.add(torus(hr, 0.38 * S, hide, { z: 0.15, rs: 10, ts: 24, tpm: 0.5 }));
  mouthG.add(torus(hr * 0.82, 0.2 * S, bone, { z: 0.55 * S, rs: 8, ts: 22 }));
  const throat = new THREE.MeshStandardMaterial({ color: 0x2a0a08, emissive: 0xff4a1c, emissiveIntensity: 0.5, roughness: 0.6 });
  mouthG.add(mk(new THREE.CircleGeometry(hr * 0.9, 24), throat, { z: 0.05, cast: false }));
  const teeth = new THREE.Group();
  mouthG.add(teeth);
  const ringDefs = [[hr * 0.92, 20, 0.85 * S, 0.32], [hr * 0.62, 13, 0.6 * S, 0.5], [hr * 0.34, 7, 0.4 * S, 0.7]];
  for (const [rr, n, tl, tilt] of ringDefs) {
    for (let i = 0; i < n; i++) {
      if (!tamed && rng() < 0.07) continue; // abgebrochener Zahn
      const a = (i / n) * Math.PI * 2 + (rr < hr * 0.5 ? 0.2 : 0);
      const d = new THREE.Vector3(-Math.cos(a) * tilt, -Math.sin(a) * tilt, 1).normalize();
      const th = cyl(0.0, 0.13 * S * (rr / hr + 0.6), tl, bone, { radial: 6 });
      th.position.set(Math.cos(a) * rr, Math.sin(a) * rr, 0.3).addScaledVector(d, tl * 0.5);
      orient(th, d);
      teeth.add(th);
    }
  }
  if (tamed) {
    // Zügelring und Metallkappen
    mouthG.add(torus(hr * 1.02, 0.07 * S, gray, { z: 0.62 * S, rs: 5, ts: 24 }));
  } else {
    // Narben: Kerben im Wulst
    for (let i = 0; i < 4; i++) {
      const a = rng() * Math.PI * 2;
      mouthG.add(box(0.5 * S, 0.12 * S, 0.12 * S, M.clay('dark'), { x: Math.cos(a) * hr, y: Math.sin(a) * hr, z: 0.5, rz: a, cast: false }));
    }
  }
  chunks[chunkN - 1].g.add(pivot);
  obj.anim.mouth = mouthG;
  obj.anim.teeth = teeth;
  obj.anim.throat = throat;
  obj.anim.hp = hp.clone();

  // Zaumzeug, Sattel, Lampe, Fahne (gezähmt)
  if (tamed) {
    const leather = M.cloth(0x5a4030), red = M.cloth(0xa23a24), strap = M.cloth(0x3a2a20);
    const sI = Math.round(N * 0.62), c = chunks[Math.min(chunkN - 1, Math.floor((sI * chunkN) / N))];
    const sn = outN(sI);
    const saddle = new THREE.Group();
    saddle.position.copy(P[sI]).addScaledVector(sn, R[sI] + 0.12);
    orient(saddle, sn);
    saddle.add(box(1.1 * S, 0.22, 1.7 * S, leather, { dmg: 0.02, seed: p.seed + 5 }));
    saddle.add(box(1.0 * S, 0.5, 0.2, leather, { y: 0.3, z: -0.8 * S }));
    saddle.add(box(0.3, 0.3, 0.3, red, { y: 0.25, z: 0.62 * S }));
    for (const s of [-1, 1]) saddle.add(box(0.06, 0.6, 0.3, strap, { x: s * 0.56 * S, y: -0.3 }));
    c.g.add(saddle);
    for (const i of [sI - 2, sI + 2]) {
      const r2 = torus(R[i] + 0.04, 0.08 * S, red, { rs: 5, ts: 18 });
      r2.position.copy(P[i]);
      r2.quaternion.setFromUnitVectors(FWD, T[i]);
      c.g.add(r2);
    }
    // Zügel vom Rachen zum Sattel
    for (const s of [-1, 1]) {
      const a0 = new THREE.Vector3(s * hr * 0.9, 0, 0.5 * S).applyQuaternion(pivot.quaternion).add(hp);
      const a1 = P[sI + 3].clone().addScaledVector(sn, R[sI + 3] + 0.5).add(new THREE.Vector3(s * 0.4, 0, 0));
      const mid = a0.clone().lerp(a1, 0.5).add(new THREE.Vector3(s * 0.7, 0.2, 0));
      chunks[chunkN - 2].g.add(tube([a0.toArray(), mid.toArray(), a1.toArray()], 0.035 * S + 0.02, strap, { segs: 16 }));
    }
    // Lampe + Fahne am Sattel
    const lamp = sph(0.12, M.glow(0xffc070, 2), { ws: 8, hs: 6 });
    lamp.position.copy(saddle.position).addScaledVector(sn, 1.3 * S).add(new THREE.Vector3(0, 0, -0.5 * S));
    c.g.add(lamp);
    const pole = cyl(0.03, 0.04, 2.4 * S, gray, { radial: 6 });
    pole.position.copy(saddle.position).addScaledVector(sn, 1.2 * S).add(new THREE.Vector3(0.45 * S, 0, -0.7 * S));
    orient(pole, sn);
    c.g.add(pole);
    const fl = flag(0xc8472a, 1.5, 0.9, { seed: p.seed });
    fl.position.copy(pole.position).addScaledVector(sn, 0.9 * S).add(new THREE.Vector3(0.78, 0, 0));
    c.g.add(fl);
    obj.anim.lampPos = [lamp.position.x, lamp.position.y, lamp.position.z];
    const L1 = new THREE.PointLight(0xffb868, 10, 8, 2);
    L1.position.copy(lamp.position);
    obj.light(L1);
  }

  // Sandwehe um den Austritt
  const base = curve.getPoint(0.12);
  const sand = M.clay('adobe', { sandBias: 4 });
  const nm = 9;
  for (let i = 0; i < nm; i++) {
    const a = (i / nm) * Math.PI * 2 + rng() * 0.4, r = (2.2 + rng() * 1.6) * S;
    const s = sph(1, sand, { x: Math.cos(a) * r * 1.1, y: 0.02, z: base.z + Math.sin(a) * r, sx: (1.2 + rng()) * S, sy: 0.28 * S, sz: (1.2 + rng()) * S, ws: 12, hs: 7, cast: true });
    obj.add(s, { mass: 40, surf: 'clay', collider: 'none', order: 0 });
  }
  for (const k of [2.4, 3.6]) obj.add(torus(k * S, 0.05, M.clay('dark'), { x: 0, y: 0.05, z: base.z, rx: Math.PI / 2, ts: 36, rs: 4, cast: false }), { mass: 1, collider: 'none', order: 0 });
  obj.anim.dustAt = [base.x, 0.4, base.z];

  // Körper-Chunks als Teile (Kugelkollider)
  // Kollider: Quader um die Segmente jedes Chunks (Kugeln würden nach der Explosion davonrollen), nie unter den Boden
  chunks.forEach((c, k) => {
    const bb = new THREE.Box3();
    for (const i of c.idx.concat(c.idx[c.idx.length - 1] + 1)) bb.expandByPoint(P[i]);
    const rr = R[c.idx[Math.floor(c.idx.length / 2)]] * 0.85;
    bb.expandByScalar(rr);
    const size = bb.getSize(new THREE.Vector3()), ctr = bb.getCenter(new THREE.Vector3());
    ctr.y = Math.max(ctr.y, size.y / 2);
    obj.add(c.g, { mass: k === chunkN - 1 ? 500 : 900, surf: 'clay', collider: { type: 'box', size: [size.x, size.y, size.z], offset: [ctr.x, ctr.y, ctr.z] } });
  });
}

const commonParams = (seed, damage, skin) => [
  { key: 'rear', label: 'Aufrichthöhe', type: 'range', min: 4, max: 10, step: 0.1, value: 7, unit: 'm' },
  { key: 'size', label: 'Größe', type: 'range', min: 0.6, max: 1.5, step: 0.01, value: 1, fmt: (v) => '× ' + v.toFixed(2) },
  { key: 'skin', label: 'Haut', type: 'select', options: SKINS, value: skin },
  { key: 'breath', label: 'Atmung / Rachen', type: 'bool', value: true },
  damageParam(damage),
  seedParam(seed),
];

function wormFrame(obj, dt) {
  if (!alive(obj)) return;
  const a = obj.anim, t = obj.time;
  if (a.mouth) a.mouth.rotation.x = Math.sin(t * 0.7) * 0.07;
  if (obj.params.breath) {
    if (a.teeth) { const k = 1 + 0.06 * Math.sin(t * 2.1); a.teeth.scale.set(k, k, 1 + 0.08 * Math.sin(t * 2.1 + 1)); }
    if (a.throat) a.throat.emissiveIntensity = 0.5 + 0.6 * (0.5 + 0.5 * Math.sin(t * 1.4));
  }
  if (a.dustAt) emit(obj, 'dust', a.dustAt, dt, 3, 'dust', 1.6);
}

export const sandworm = {
  id: 'sandworm',
  label: 'Sandwurm',
  category: 'Gegner & Kreaturen',
  tag: 'Kreatur',
  hint: 'Lauert unter bestimmten Feldern und kann gezähmt werden.',
  params: commonParams(37, 0.5, 'adobe'),
  build(obj, p) { buildWorm(obj, p, false); },
  onFrame: wormFrame,
};

export const tamedWorm = {
  id: 'tamedWorm',
  label: 'Gezähmter Wurm',
  category: 'Verteidigung & Truppen',
  tag: 'Verbündeter',
  hint: 'Lauert im Sand und greift Feinde auf Nachbarfeldern an.',
  params: commonParams(38, 0.2, 'dark'),
  build(obj, p) { buildWorm(obj, p, true); },
  onFrame: wormFrame,
};
