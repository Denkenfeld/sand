import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// All creature meshes are authored at UNIT length along +z (nose = +z, tail = -z),
// so system code just scales them to metres.

const col = (hex) => new THREE.Color(hex);        // hex -> linear working space (correct for vertex colours)

function tint(geo, fn) {
  const p = geo.attributes.position, n = geo.attributes.normal, c = new Float32Array(p.count * 3), out = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    fn(out, p.getX(i), p.getY(i), p.getZ(i), n.getX(i), n.getY(i), n.getZ(i));
    c[i * 3] = out.r; c[i * 3 + 1] = out.g; c[i * 3 + 2] = out.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return geo;
}
function prep(geo) { // uniform attribute set for merging
  let g = geo.index ? geo.toNonIndexed() : geo;
  g.deleteAttribute('uv');
  if (!g.attributes.normal) g.computeVertexNormals();
  return g;
}
function flat(points, tris) { // tiny helper for hand-made fins
  const g = new THREE.BufferGeometry();
  const pos = [];
  tris.forEach(([a, b, c]) => pos.push(...points[a], ...points[b], ...points[c]));
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/** Small reef fish. detail 1 = near LOD (~100 tris), 0 = far LOD (~20 tris). */
export function makeFishGeometry(detail = 1) {
  const white = col('#ffffff'), belly = col('#f2f6f8'), back = col('#c9d8e0');
  const bodyG = new THREE.SphereGeometry(0.5, detail ? 12 : 6, detail ? 8 : 4);
  bodyG.scale(0.3, 0.5, 1.0);
  const body = tint(prep(bodyG), (c, x, y) => c.copy(back).lerp(belly, THREE.MathUtils.smoothstep(-y, -0.05, 0.18)));
  const tail = tint(prep(flat([[0, 0, -0.42], [0, 0.26, -0.78], [0, -0.26, -0.78], [0, 0, -0.62]], [[0, 1, 3], [0, 3, 2], [0, 3, 1], [0, 2, 3]])), (c) => c.copy(white));
  const parts = [body, tail];
  if (detail) {
    parts.push(tint(prep(flat([[0, 0.22, 0.2], [0, 0.4, -0.1], [0, 0.2, -0.28]], [[0, 1, 2], [0, 2, 1]])), (c) => c.copy(white))); // dorsal fin
    parts.push(tint(prep(flat([[0.1, -0.1, 0.2], [0.26, -0.2, 0.0], [0.08, -0.12, 0.0]], [[0, 1, 2], [0, 2, 1]])), (c) => c.copy(white))); // pectoral R
    parts.push(tint(prep(flat([[-0.1, -0.1, 0.2], [-0.26, -0.2, 0.0], [-0.08, -0.12, 0.0]], [[0, 2, 1], [0, 1, 2]])), (c) => c.copy(white))); // pectoral L
    const eyeG = new THREE.SphereGeometry(0.045, 6, 5);
    parts.push(tint(prep(eyeG.clone().translate(0.14, 0.08, 0.34)), (c) => c.set(0x050505)));
    parts.push(tint(prep(eyeG.clone().translate(-0.14, 0.08, 0.34)), (c) => c.set(0x050505)));
  }
  return mergeGeometries(parts, false);
}

/** Shark, unit length. */
export function makeSharkGeometry() {
  const slate = col('#566a78'), mid = col('#8497a3'), belly = col('#e9eef0'), finC = col('#3e505c'), tipC = col('#dfe6ea');

  // --- lofted spindle body
  const NL = 34, NR = 16, R = 0.1;
  const prof = (t) => t < 0.3 ? Math.pow(Math.sin((t / 0.3) * Math.PI / 2), 0.72)
    : 1 - Math.pow((t - 0.3) / 0.7, 1.35) * 0.93;
  const pos = [], idx = [];
  for (let i = 0; i <= NL; i++) {
    const t = i / NL, z = 0.5 - t, r = R * prof(t);
    for (let j = 0; j <= NR; j++) {
      const a = (j / NR) * Math.PI * 2;
      const squash = t < 0.3 ? 0.88 : 0.82;     // slightly flattened head, laterally compressed tail
      const belly_ = Math.sin(a) < 0 ? 0.9 : 1.0;
      pos.push(Math.cos(a) * r * squash, Math.sin(a) * r * belly_, z);
    }
  }
  for (let i = 0; i < NL; i++) for (let j = 0; j < NR; j++) {
    const a = i * (NR + 1) + j, b = a + NR + 1;
    idx.push(a, a + 1, b, a + 1, b + 1, b);
  }
  let bodyG = new THREE.BufferGeometry();
  bodyG.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  bodyG.setIndex(idx);
  bodyG.computeVertexNormals();
  bodyG = prep(bodyG);
  const body = tint(bodyG, (c, x, y, z) => {
    const k = THREE.MathUtils.smoothstep(-y / R, -0.12, 0.2);      // countershading line
    c.copy(slate).lerp(mid, THREE.MathUtils.smoothstep(z, 0.2, 0.5) * 0.5).lerp(belly, k);
  });

  const extrude = (shape, depth) => new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 6 });
  const fin = (geo, color, tipColor = null) => tint(prep(geo), (c, x, y, z) => {
    c.copy(color); if (tipColor) c.lerp(tipColor, THREE.MathUtils.smoothstep(y, 0.1, 0.2) * 0.9);
  });
  const parts = [body];

  // dorsal fin: shape x = towards the tail, y = up  (rotateY(+90deg) maps shape +x -> world -z)
  const dS = new THREE.Shape(); dS.moveTo(0, 0); dS.quadraticCurveTo(0.012, 0.09, 0.075, 0.175); dS.quadraticCurveTo(0.105, 0.07, 0.155, 0); dS.lineTo(0, 0);
  parts.push(fin(extrude(dS, 0.012).translate(0, 0, -0.006).rotateY(Math.PI / 2).translate(0, R * 0.78, 0.13), finC, tipC));
  // small second dorsal + anal fin
  const sS = new THREE.Shape(); sS.moveTo(0, 0); sS.lineTo(0.012, 0.03); sS.lineTo(0.05, 0); sS.lineTo(0, 0);
  parts.push(fin(extrude(sS, 0.008).translate(0, 0, -0.004).rotateY(Math.PI / 2).translate(0, R * 0.12, -0.26), finC));
  parts.push(fin(extrude(sS, 0.008).translate(0, 0, -0.004).rotateY(Math.PI / 2).scale(1, -1, 1).translate(0, -R * 0.1, -0.27), finC));

  // pectoral fins (span along +/-x, chord towards the tail), angled down and out
  for (const sgn of [1, -1]) {
    const pS = new THREE.Shape();
    pS.moveTo(0, 0); pS.quadraticCurveTo(sgn * 0.07, 0.01, sgn * 0.17, 0.12); pS.quadraticCurveTo(sgn * 0.1, 0.07, sgn * 0.02, 0.1); pS.lineTo(0, 0);
    const g = extrude(pS, 0.01).translate(0, 0, -0.005).rotateX(-Math.PI / 2).rotateZ(-sgn * 0.45).translate(sgn * R * 0.55, -R * 0.45, 0.2);
    parts.push(fin(g, finC));
  }
  // pelvic fins
  for (const sgn of [1, -1]) {
    const pS = new THREE.Shape(); pS.moveTo(0, 0); pS.lineTo(sgn * 0.045, 0.02); pS.lineTo(sgn * 0.01, 0.06); pS.lineTo(0, 0);
    parts.push(fin(extrude(pS, 0.008).translate(0, 0, -0.004).rotateX(-Math.PI / 2).translate(sgn * R * 0.4, -R * 0.75, -0.14), finC));
  }
  // caudal fin: big upper lobe, shorter lower lobe (heterocercal crescent)
  const tS = new THREE.Shape();
  tS.moveTo(0, 0.012); tS.quadraticCurveTo(0.05, 0.1, 0.17, 0.215); tS.quadraticCurveTo(0.13, 0.09, 0.115, 0.012);
  tS.quadraticCurveTo(0.14, -0.06, 0.12, -0.115); tS.quadraticCurveTo(0.05, -0.07, 0, -0.012); tS.lineTo(0, 0.012);
  parts.push(fin(extrude(tS, 0.012).translate(0, 0, -0.006).rotateY(Math.PI / 2).translate(0, 0, -0.475), finC, tipC));

  // dark eyes
  for (const sgn of [1, -1]) {
    const e = new THREE.SphereGeometry(0.0085, 6, 5).translate(sgn * R * 0.8, R * 0.18, 0.4);
    parts.push(tint(prep(e), (c) => c.set(0x020303)));
  }
  return mergeGeometries(parts, false);
}
