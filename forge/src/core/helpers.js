// Kleine Baukasten-Funktionen: Meshes mit sinnvollen UVs, Beulen, Rohre, Hüllkörper.
import * as THREE from 'three';
import { fbm3 } from './noise.js';

const _v = new THREE.Vector3();

// Box-Projektion der UVs: gleiche Texeldichte auf jeder Fläche (nur für ebenflächige Geometrie wie BoxGeometry)
export function projectUV(geo, tpm = 1) {
  const pos = geo.attributes.position, nor = geo.attributes.normal;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i)), nz = Math.abs(nor.getZ(i));
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (nx >= ny && nx >= nz) uv.setXY(i, z * tpm, y * tpm);
    else if (ny >= nz) uv.setXY(i, x * tpm, z * tpm);
    else uv.setXY(i, x * tpm, y * tpm);
  }
  uv.needsUpdate = true;
  return geo;
}

export function scaleUV(geo, su, sv = su) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  uv.needsUpdate = true;
  return geo;
}

// Verknitterung: verschiebt Vertices nur anhand ihrer Position → keine Risse an Kanten.
// weights = wie stark pro Achse (dünne Bleche: nur die dünne Achse stark).
export function crumple(geo, amt, freq = 1.2, seed = 1, weights = [1, 1, 1]) {
  if (!amt) return geo;
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const big = 1;
    const dx = fbm3(x * freq + 3.1, y * freq, z * freq, 3, seed) - 0.5;
    const dy = fbm3(x * freq, y * freq + 7.7, z * freq, 3, seed + 5) - 0.5;
    const dz = fbm3(x * freq, y * freq, z * freq + 13.3, 3, seed + 9) - 0.5;
    pos.setXYZ(i, x + dx * amt * 2 * weights[0] * big, y + dy * amt * 2 * weights[1] * big, z + dz * amt * 2 * weights[2] * big);
  }
  geo.computeVertexNormals();
  return geo;
}

// Einschlag: drückt alles im Radius um `depth` in Richtung dir (lokal) ein.
export function dent(geo, point, radius, depth, dir) {
  const pos = geo.attributes.position;
  const d = new THREE.Vector3(...dir).normalize();
  for (let i = 0; i < pos.count; i++) {
    _v.fromBufferAttribute(pos, i);
    const dist = _v.distanceTo(point);
    if (dist < radius) {
      const f = Math.pow(1 - dist / radius, 2);
      pos.setXYZ(i, _v.x + d.x * depth * f, _v.y + d.y * depth * f, _v.z + d.z * depth * f);
    }
  }
  geo.computeVertexNormals();
  return geo;
}

export function place(obj, o = {}) {
  obj.position.set(o.x ?? 0, o.y ?? 0, o.z ?? 0);
  obj.rotation.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0);
  if (o.s) obj.scale.setScalar(o.s);
  if (o.sx !== undefined) obj.scale.set(o.sx, o.sy ?? o.sx, o.sz ?? o.sx);
  return obj;
}

export function mk(geo, mat, o = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = o.cast ?? true;
  m.receiveShadow = o.recv ?? true;
  place(m, o);
  if (o.name) m.name = o.name;
  return m;
}

const tpmOf = (mat, o) => o.tpm ?? mat?.userData?.tpm ?? 1;

// o.dmg = Beulenstärke in Metern, o.seed, o.w = Achsgewichte
export function box(w, h, d, mat, o = {}) {
  const auto = (s) => Math.max(1, Math.min(28, Math.ceil(s / 0.3)));
  const seg = o.seg ?? (o.dmg ? [auto(w), auto(h), auto(d)] : [1, 1, 1]);
  const geo = new THREE.BoxGeometry(w, h, d, seg[0], seg[1], seg[2]);
  projectUV(geo, tpmOf(mat, o));
  if (o.dmg) crumple(geo, o.dmg, o.freq ?? 1.4, o.seed ?? 1, o.w);
  return mk(geo, mat, o);
}

export function cyl(rt, rb, h, mat, o = {}) {
  const geo = new THREE.CylinderGeometry(rt, rb, h, o.radial ?? 16, o.hseg ?? 1, o.open ?? false);
  const t = tpmOf(mat, o);
  scaleUV(geo, Math.max(rt, rb) * 2 * Math.PI * t, h * t);
  if (o.dmg) crumple(geo, o.dmg, o.freq ?? 1.4, o.seed ?? 1);
  return mk(geo, mat, o);
}

export function sph(r, mat, o = {}) {
  const geo = new THREE.SphereGeometry(r, o.ws ?? 20, o.hs ?? 14, o.phiStart, o.phiLength, o.thetaStart, o.thetaLength);
  const t = tpmOf(mat, o);
  scaleUV(geo, r * 2 * Math.PI * t, r * Math.PI * t);
  if (o.dmg) crumple(geo, o.dmg, o.freq ?? 1.4, o.seed ?? 1);
  return mk(geo, mat, o);
}

export function torus(R, r, mat, o = {}) {
  const geo = new THREE.TorusGeometry(R, r, o.rs ?? 8, o.ts ?? 24);
  const t = tpmOf(mat, o);
  scaleUV(geo, R * 2 * Math.PI * t, r * 2 * Math.PI * t);
  return mk(geo, mat, o);
}

// Rohr/Kabel entlang einer Kurve aus [x,y,z]-Punkten
export function tube(points, r, mat, o = {}) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.3);
  const geo = new THREE.TubeGeometry(curve, o.segs ?? points.length * 6, r, o.radial ?? 8, false);
  scaleUV(geo, curve.getLength() * tpmOf(mat, o), r * 6 * tpmOf(mat, o));
  return mk(geo, mat, o);
}

// Dünne, leicht durchhängende Stoffbahn (für Planen, Fahnen, Umhänge)
export function cloth(w, h, mat, o = {}) {
  const geo = new THREE.PlaneGeometry(w, h, o.segX ?? 10, o.segY ?? 8);
  const pos = geo.attributes.position;
  const sag = o.sag ?? 0, ripple = o.ripple ?? 0, seed = o.seed ?? 3;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    const u = x / w + 0.5;
    const z = -Math.sin(u * Math.PI) * sag + (fbm3(x * 1.5, y * 1.5, 0, 3, seed) - 0.5) * ripple;
    pos.setZ(i, z);
  }
  geo.computeVertexNormals();
  scaleUV(geo, w * tpmOf(mat, o), h * tpmOf(mat, o));
  return mk(geo, mat, o);
}

// Achsenparalleler Hüllkörper im LOKALEN Raum von obj (inkl. Kinder)
const _b = new THREE.Box3();
const _inv = new THREE.Matrix4();
const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
export function localBounds(obj) {
  obj.updateWorldMatrix(true, true);
  _inv.copy(obj.matrixWorld).invert();
  const out = new THREE.Box3();
  obj.traverse((c) => {
    if (!c.isMesh || !c.geometry) return;
    if (!c.geometry.boundingBox) c.geometry.computeBoundingBox();
    _b.copy(c.geometry.boundingBox);
    _m.multiplyMatrices(_inv, c.matrixWorld);
    for (let i = 0; i < 8; i++) {
      _p.set(i & 1 ? _b.max.x : _b.min.x, i & 2 ? _b.max.y : _b.min.y, i & 4 ? _b.max.z : _b.min.z).applyMatrix4(_m);
      out.expandByPoint(_p);
    }
  });
  return out;
}

export const rad = (d) => (d * Math.PI) / 180;
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
