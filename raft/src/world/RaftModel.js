import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import { makeWaterAware } from '../util/waterMaterial.js';
import { mulberry32, makeWoodTexture, makeRustTexture, makeFrondTexture, makeTarpTexture } from '../util/textures.js';

/**
 * Procedural, hand-"junked" raft. Everything is built from primitives + noise so
 * the project needs no external assets. Coordinates are RAFT-LOCAL:
 *   y = 0  -> water line at rest, +x right, -z forward.
 *
 * Returns { group, deck[], solids[], interactables[], update(t), halfX, halfZ, deckTop }
 *  - deck:   walkable plank boxes {minX,maxX,minZ,maxZ,top}
 *  - solids: blocking boxes (crate, tent, ...) {minX,maxX,minZ,maxZ,top}; jumpable if low enough
 *  - interactables: spots for the E-key (water, crate, tent ...)
 */
export function buildRaftModel() {
  const rnd = mulberry32(42);
  const R = (a, b) => a + (b - a) * rnd();
  const noise = createNoise2D(mulberry32(5));
  const group = new THREE.Group();
  group.name = 'raft';
  const deck = [], solids = [], interactables = [];
  const DECK_TOP = 0.37;

  // ---------------------------------------------------------------- materials
  const wood = makeWoodTexture(1);
  const bark = makeWoodTexture(5);
  bark.center.set(0.5, 0.5); bark.rotation = Math.PI / 2; bark.repeat.set(1, 2.4); // grain along the log

  const std = (o, wa) => makeWaterAware(new THREE.MeshStandardMaterial(o), wa);
  const plankMat = std({ map: wood, roughness: 0.82 }, { wet: true });
  const logMat = std({ map: bark, vertexColors: true, roughness: 0.9 }, { wet: true });
  const beamMat = std({ map: wood, color: 0x9a8770, roughness: 0.9 }, { wet: true });
  const barrelMat = std({ map: makeRustTexture(3), metalness: 0.45, roughness: 0.55 }, { wet: true });
  const ropeMat = std({ color: 0xc2a56d, roughness: 1 }, { wet: true });
  const nailMat = std({ color: 0x9a5d36, metalness: 0.6, roughness: 0.5 }, { caustics: false });
  const foamBlockMat = std({ color: 0xe9e5d6, roughness: 0.95 }, { wet: true });
  const tarpMat = std({ map: makeTarpTexture(), roughness: 0.92, side: THREE.DoubleSide, emissive: 0x1d5a66, emissiveIntensity: 0.35 }); // translucent-ish glow from sun behind
  const frondMat = std({ map: makeFrondTexture(), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.8 }, { caustics: false });
  const coconutMat = std({ color: 0x9a6a3c, roughness: 0.95 }, { caustics: false });
  const bottleMat = std({ color: 0x9fd6ee, roughness: 0.15, metalness: 0, transparent: true, opacity: 0.72 }, { caustics: false });
  const capMat = std({ color: 0xd8402e, roughness: 0.5 }, { caustics: false });
  const algaeMat = std({ color: 0xffffff, roughness: 0.7, side: THREE.DoubleSide }, { caustics: false });

  const add = (m, { cast = true, receive = true } = {}) => { m.castShadow = cast; m.receiveShadow = receive; group.add(m); return m; };
  const _up = new THREE.Vector3(0, 1, 0);
  const stick = (a, b, r, mat, seg = 7) => {
    const g = new THREE.CylinderGeometry(r, r * 1.08, a.distanceTo(b), seg);
    const m = new THREE.Mesh(g, mat);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(_up, b.clone().sub(a).normalize());
    return add(m);
  };

  // ---------------------------------------------------------- driftwood logs
  const algaeCol = new THREE.Color(0.22, 0.4, 0.16), barkCol = new THREE.Color();
  function logGeometry(len, r) {
    const g = new THREE.CylinderGeometry(r * 0.9, r, len, 12, 18);
    g.rotateZ(Math.PI / 2);
    const p = g.attributes.position, colors = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const ang = Math.atan2(z, y);
      const n = 1 + noise(x * 1.3, ang * 1.7) * 0.12 + noise(x * 5, ang * 3) * 0.035;
      p.setXYZ(i, x, y * n + Math.sin(x * 0.9) * 0.03, z * n);
      const algae = THREE.MathUtils.smoothstep(-(y / r) + noise(x * 2.2, z * 3.1) * 0.5, 0.15, 0.85);
      barkCol.setRGB(0.78 + noise(x, 9) * 0.08, 0.68, 0.56).lerp(algaeCol, algae * 0.9);
      colors[i * 3] = barkCol.r; colors[i * 3 + 1] = barkCol.g; colors[i * 3 + 2] = barkCol.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }
  const logZ = [-1.7, -0.85, 0, 0.85, 1.7], logR = [];
  logZ.forEach((z) => {
    const r = R(0.19, 0.23), len = R(4.2, 4.7);
    logR.push(r);
    const m = new THREE.Mesh(logGeometry(len, r), logMat);
    m.position.set(R(-0.2, 0.2), R(0.0, 0.05), z + R(-0.05, 0.05));
    m.rotation.set(R(-0.03, 0.03), R(-0.05, 0.05), R(-0.02, 0.02));
    add(m);
    // a broken-off branch stub
    if (rnd() < 0.6) {
      const stub = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.22, 6), beamMat);
      stub.position.set(m.position.x + R(-1.5, 1.5), m.position.y + 0.14, m.position.z + R(-0.05, 0.05));
      stub.rotation.set(R(-0.9, 0.9), 0, R(-0.9, 0.9)); add(stub);
    }
  });

  // cross beams
  const beamX = [-1.35, 1.35];
  beamX.forEach((x) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 4.5), beamMat);
    m.position.set(x + R(-0.03, 0.03), 0.275, R(-0.05, 0.05)); m.rotation.y = R(-0.012, 0.012); add(m);
  });

  // rope lashings around every log at the beam crossings (instanced)
  const lashes = [];
  beamX.forEach((bx) => logZ.forEach((z, i) => [-0.06, 0.06].forEach((o) => lashes.push([bx + o, z, logR[i]]))));
  const ropeInst = new THREE.InstancedMesh(new THREE.TorusGeometry(1, 0.1, 5, 18).rotateY(Math.PI / 2), ropeMat, lashes.length);
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), eul = new THREE.Euler(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
  lashes.forEach(([x, z, r], i) => {
    const s = r + 0.025; // uniform scale: ring radius = s, rope thickness = 0.1 * s
    mtx.compose(ps.set(x, 0.03, z), q.setFromEuler(eul.set(R(-0.2, 0.2), 0, 0)), sc.set(s, s, s));
    ropeInst.setMatrixAt(i, mtx);
  });
  add(ropeInst, { receive: false });

  // ------------------------------------------------------------- deck planks
  const plankRows = [];
  for (let z = -1.95; z <= 1.96; z += R(0.34, 0.39)) plankRows.push(z);
  const planks = [];
  plankRows.forEach((z, ri) => {
    const w = R(0.28, 0.35);
    let x = -2.2 + R(-0.15, 0.1);
    const endX = 2.2 + R(-0.15, 0.1);
    while (x < endX - 0.3) {
      let len = R(1.0, 2.3);
      if (x + len > endX - 0.35) len = endX - x;
      // ragged corners: shave boards at the front-right and back-left corner
      let a = x, b = x + len;
      if (z < -1.5) b = Math.min(b, 1.55 + R(0, 0.3));
      if (z > 1.5) a = Math.max(a, -1.8 + R(0, 0.2));
      if (b - a > 0.35) planks.push({ cx: (a + b) / 2, cz: z + R(-0.01, 0.01), len: b - a - 0.03, w, top: DECK_TOP + R(-0.015, 0.02), ry: R(-0.018, 0.018), ri });
      x += len;
    }
  });
  const plankInst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), plankMat, planks.length);
  const col = new THREE.Color();
  planks.forEach((p, i) => {
    const th = R(0.055, 0.07);
    mtx.compose(ps.set(p.cx, p.top - th / 2, p.cz), q.setFromEuler(eul.set(0, p.ry, R(-0.012, 0.012))), sc.set(p.len, th, p.w));
    plankInst.setMatrixAt(i, mtx);
    const v = R(0.62, 1.0);
    plankInst.setColorAt(i, col.setRGB(v, v * R(0.93, 1.0), v * R(0.84, 0.97)));
    deck.push({ minX: p.cx - p.len / 2, maxX: p.cx + p.len / 2, minZ: p.cz - p.w / 2, maxZ: p.cz + p.w / 2, top: p.top });
  });
  add(plankInst);

  // nails (instanced): two per board end, plus a few bent ones sticking up
  const nailPts = [];
  planks.forEach((p) => [-1, 1].forEach((s) => [-1, 1].forEach((t) => nailPts.push([p.cx + s * (p.len / 2 - 0.09), p.top + 0.004, p.cz + t * p.w * 0.25]))));
  const nails = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.009, 0.009, 0.008, 6), nailMat, nailPts.length);
  nailPts.forEach((n, i) => { mtx.compose(ps.set(...n), q.identity(), sc.set(1, 1, 1)); nails.setMatrixAt(i, mtx); });
  add(nails, { cast: false });
  for (let i = 0; i < 4; i++) {
    const p = planks[Math.floor(R(0, planks.length))];
    const bent = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.009, 0.09, 5), nailMat);
    bent.position.set(p.cx + R(-0.3, 0.3), p.top + 0.04, p.cz); bent.rotation.set(R(-0.6, 0.6), 0, R(-0.8, 0.8)); add(bent);
  }

  // --------------------------------------------------------- barrels & foam
  const barrels = [[1.1, 2.28, 0.04], [-1.2, -2.28, 0.05]];
  barrels.forEach(([x, z, y]) => {
    const g = new THREE.CylinderGeometry(0.28, 0.28, 0.95, 20).rotateZ(Math.PI / 2);
    const m = new THREE.Mesh(g, barrelMat); m.position.set(x, y, z); m.rotation.y = R(-0.08, 0.08); add(m);
    [-0.3, 0, 0.3].forEach((ox) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.283, 0.012, 5, 20).rotateY(Math.PI / 2), barrelMat);
      ring.position.set(x + ox, y, z); add(ring, { receive: false });
    });
    const bm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 8), nailMat); // bung
    bm.position.set(x + 0.2, y + 0.28, z); add(bm, { cast: false });
  });
  [[-2.05, 0.06, 1.35, 0.8, 0.3, 0.55, 0.2], [2.1, 0.05, -0.6, 0.55, 0.26, 0.45, -0.3]].forEach(([x, y, z, sx, sy, sz, ry]) => {
    const g = new THREE.BoxGeometry(sx, sy, sz, 4, 2, 4), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + noise(i, 1) * 0.035, p.getY(i) + noise(i, 2) * 0.02, p.getZ(i) + noise(i, 3) * 0.035);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, foamBlockMat); m.position.set(x, y, z); m.rotation.y = ry; add(m);
  });

  // ------------------------------------------------------ shelter (tent/tarp)
  const poleMat = beamMat, TX = -1.45, T0 = -1.45, T1 = 0.25, RIDGE = DECK_TOP + 1.35;
  const pole = (x, z, h = 1.35) => stick(new THREE.Vector3(x, DECK_TOP - 0.02, z), new THREE.Vector3(x, DECK_TOP + h, z), 0.032, poleMat);
  pole(TX, T0); pole(TX, T1);
  stick(new THREE.Vector3(TX, RIDGE, T0 - 0.05), new THREE.Vector3(TX, RIDGE, T1 + 0.05), 0.026, poleMat);
  const tarp = (side) => {
    const nu = 8, nv = 6, pos = [], uv = [], idx = [];
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
      const u = i / nu, v = j / nv;
      const sag = Math.sin(u * Math.PI) * 0.06 * v;
      pos.push(TX + side * (v * 0.62 + noise(i, j) * 0.015), RIDGE - 0.02 - v * 0.78 - sag, T0 + u * (T1 - T0) + side * noise(j, i) * 0.02);
      uv.push(u, v);
    }
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    return add(new THREE.Mesh(g, tarpMat), { receive: false }); // thin double-sided cloth: no self-shadow acne
  };
  tarp(1); tarp(-1);
  // guy ropes
  [[TX + 0.9, T0 - 0.35], [TX + 0.9, T1 + 0.35], [TX - 0.9, T0 - 0.25], [TX - 0.9, T1 + 0.25]].forEach(([x, z]) =>
    stick(new THREE.Vector3(TX, RIDGE - 0.05, z < (T0 + T1) / 2 ? T0 : T1), new THREE.Vector3(x, DECK_TOP + 0.02, z), 0.008, ropeMat, 4));
  solids.push({ minX: TX - 0.62, maxX: TX + 0.62, minZ: T0 - 0.1, maxZ: T1 + 0.1, top: DECK_TOP + 1.0, name: 'tent' });
  interactables.push({ name: 'tent', pos: new THREE.Vector3(TX + 0.9, DECK_TOP, (T0 + T1) / 2), radius: 1.0, text: 'Sein Schlafplatz unter der Plane. Noch ist hier nicht viel…' });

  // palm-leaf bed + thatch
  const frondGeo = (w, l) => {
    const g = new THREE.PlaneGeometry(w, l, 3, 10).rotateX(-Math.PI / 2), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const t = p.getZ(i) / l; p.setY(i, 0.12 * (1 - 4 * t * t) * 0.5 + Math.abs(p.getX(i)) * -0.25); }
    g.computeVertexNormals(); return g;
  };
  [[-1.2, -0.7, 0.4, 0.12], [-1.55, -0.3, -0.2, 0.2], [-1.1, -1.1, 0.9, 0.3]].forEach(([x, z, ry, y]) => {
    const m = new THREE.Mesh(frondGeo(0.55, 1.5), frondMat);
    m.position.set(x, DECK_TOP + 0.02 + y * 0.1, z); m.rotation.y = ry; add(m);
  });
  [[2.1, -1.6, 2.4], [-2.1, 1.3, 0.6]].forEach(([x, z, ry]) => { // leaves caught on the edge, hanging over
    const m = new THREE.Mesh(frondGeo(0.5, 1.3), frondMat);
    m.position.set(x, DECK_TOP + 0.03, z); m.rotation.set(0.0, ry, 0.3); add(m);
  });

  // crate + rope coil + fishing rod
  {
    const cx = 1.6, cz = -1.15, sx = 0.62, sy = 0.44, sz = 0.5;
    const crate = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), plankMat);
    crate.position.set(cx, DECK_TOP + sy / 2, cz); crate.rotation.y = 0.12; add(crate);
    for (const [px, pz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, sy + 0.02, 0.06), beamMat);
      post.position.set(cx + px * (sx / 2 - 0.01), DECK_TOP + sy / 2, cz + pz * (sz / 2 - 0.01)); post.rotation.y = 0.12; add(post);
    }
    solids.push({ minX: cx - 0.34, maxX: cx + 0.34, minZ: cz - 0.3, maxZ: cz + 0.3, top: DECK_TOP + sy, name: 'crate' });
    interactables.push({ name: 'crate', pos: new THREE.Vector3(cx, DECK_TOP, cz), radius: 1.1, text: 'Die Kiste ist fast leer: ein paar Nägel, etwas Schnur. (Hier kommt später Crafting hin.)' });

    const rod = stick(new THREE.Vector3(cx + 0.18, DECK_TOP + 0.44, cz + 0.2), new THREE.Vector3(cx + 1.0, DECK_TOP + 1.05, cz + 0.55), 0.012, beamMat, 5);
    rod.castShadow = true;
    const coil = new THREE.Group();
    for (let i = 0; i < 3; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.17 - i * 0.015, 0.03, 6, 16).rotateX(Math.PI / 2), ropeMat); t.position.y = 0.03 + i * 0.05; coil.add(t); }
    coil.position.set(0.35, DECK_TOP, 1.5); add(coil);
  }

  // coconuts, bottles, scrap
  const coco = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), coconutMat, 6);
  [[-0.55, 0.9], [-0.35, 1.05], [-0.7, 1.1], [0.9, 0.2], [-0.95, -0.55], [1.95, 1.2]].forEach(([x, z], i) => {
    const r = R(0.085, 0.105);
    mtx.compose(ps.set(x, DECK_TOP + r * 0.85, z), q.setFromEuler(eul.set(R(0, 3), R(0, 3), 0)), sc.set(r, r * R(0.95, 1.12), r * 0.95));
    coco.setMatrixAt(i, mtx);
    coco.setColorAt(i, col.setRGB(R(0.75, 1.05), R(0.7, 1), R(0.65, 0.95)));
  });
  add(coco);
  interactables.push({ name: 'coconuts', pos: new THREE.Vector3(-0.55, DECK_TOP, 1.0), radius: 0.9, text: 'Kokosnüsse. Sie sind noch frisch – später als Nahrung nutzbar.' });

  [[0.9, 0.9, 1.4], [-0.1, -1.3, 0.2], [-1.9, -0.9, 1.9]].forEach(([x, z, rot], i) => {
    const b = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.2, 10), bottleMat);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.04, 0.05, 10), bottleMat); neck.position.y = 0.125;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 8), capMat); cap.position.y = 0.16;
    b.add(body, neck, cap); b.position.set(x, DECK_TOP + 0.045, z); b.rotation.set(Math.PI / 2, 0, rot); add(b, { cast: false });
  });

  // ----------------------------------------------------- hanging algae strips
  const nAlgae = 22;
  const algaeGeo = new THREE.PlaneGeometry(0.07, 0.3, 1, 4).translate(0, -0.15, 0);
  const algaeInst = new THREE.InstancedMesh(algaeGeo, algaeMat, nAlgae);
  const algaeBase = [];
  for (let i = 0; i < nAlgae; i++) {
    const side = i % 4, t = R(-1, 1);
    const pos = side === 0 ? [t * 2.0, -1.9] : side === 1 ? [t * 2.0, 1.9] : side === 2 ? [-2.3, t * 1.8] : [2.3, t * 1.8];
    algaeBase.push({ x: pos[0], y: R(-0.12, -0.02), z: pos[1], ph: R(0, 6.28), s: R(0.7, 1.3), ry: R(0, 3.14) });
    algaeInst.setColorAt(i, col.setRGB(R(0.18, 0.35), R(0.32, 0.5), R(0.1, 0.2)));
  }
  add(algaeInst, { cast: false, receive: false });
  const _e = new THREE.Euler();
  const update = (t) => {
    for (let i = 0; i < nAlgae; i++) {
      const a = algaeBase[i];
      _e.set(Math.sin(t * 1.3 + a.ph) * 0.3, a.ry, Math.cos(t * 1.1 + a.ph) * 0.3, 'YXZ');
      mtx.compose(ps.set(a.x, a.y, a.z), q.setFromEuler(_e), sc.set(1, a.s, 1));
      algaeInst.setMatrixAt(i, mtx);
    }
    algaeInst.instanceMatrix.needsUpdate = true;
  };
  update(0);

  // water access points along the edge ("scoop water" etc.)
  interactables.push({ name: 'water', pos: new THREE.Vector3(0, DECK_TOP, 2.05), radius: 0.9, text: 'Du planschst mit der Hand im Wasser. Salzig.' });
  interactables.push({ name: 'water', pos: new THREE.Vector3(0.2, DECK_TOP, -2.0), radius: 0.9, text: 'Das Wasser ist klar und warm. Unten ziehen Fische vorbei.' });

  return { group, deck, solids, interactables, update, halfX: 2.2, halfZ: 2.1, deckTop: DECK_TOP, spawn: new THREE.Vector3(0.4, DECK_TOP, 0.6) };
}
