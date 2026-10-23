// Stadt-Renderer: alle Platzierungen als BatchedMesh (ein Draw-Call je Material), Fern-Detailstufen,
// und schwere Animations-Modelle werden in Kameranähe durch echte, animierte Objekte ersetzt.
import * as THREE from 'three';
import { createObject } from '../core/forge.js';
import { KINDS } from './catalog.js';
import { mulberry32 } from '../core/noise.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
const UP = new THREE.Vector3(0, 1, 0);

export class CityRenderer {
  constructor(scene, lib) {
    this.scene = scene;
    this.lib = lib;
    this.group = new THREE.Group();
    this.group.name = 'city';
    this.liveGroup = new THREE.Group();
    this.liveGroup.name = 'city-live';
    scene.add(this.group, this.liveGroup);
    this.meshes = [];
    this.placements = [];
    this.lodList = [];
    this.live = [];
    this.active = new Set();
    this.lodIdx = 0;
    this.lodScale = 1;
    this.maxLive = 6;
    this.liveR = 120;
    this.liveOn = true;
    this._liveT = 0;
    this.info = { instances: 0, meshes: 0, tris: 0 };
  }

  clear() {
    for (const p of this.active) this._deactivate(p, true);
    this.active.clear();
    for (const bm of this.meshes) { this.group.remove(bm); bm.dispose(); }
    this.meshes = [];
    this.placements = [];
    this.lodList = [];
    this.live = [];
  }

  build(city) {
    this.clear();
    const lib = this.lib;
    const PL = city.placements;
    this.placements = PL;

    // 1) Material → Geometrien (jede Variante nur einmal), Instanzzähler und Puffergrößen
    const mats = new Map();
    for (const p of PL) {
      const rec = lib.variants(p.kind)[p.vi];
      p.rec = rec;
      for (const part of rec.parts) {
        let e = mats.get(part.mat.uuid);
        if (!e) mats.set(part.mat.uuid, (e = { mat: part.mat, geos: new Map(), inst: 0, verts: 0, idx: 0 }));
        e.inst++;
        if (!e.geos.has(part)) {
          e.geos.set(part, null);
          e.verts += part.hi.attributes.position.count;
          e.idx += part.hi.index.count;
          if (part.lo !== part.hi) { e.verts += part.lo.attributes.position.count; e.idx += part.lo.index.count; }
        }
      }
    }

    // 2) Ein BatchedMesh je Material
    for (const e of mats.values()) {
      const bm = new THREE.BatchedMesh(e.inst, e.verts, e.idx, e.mat);
      bm.sortObjects = !!e.mat.transparent;
      bm.perObjectFrustumCulled = true;
      bm.castShadow = !e.mat.transparent;
      bm.receiveShadow = true;
      for (const part of e.geos.keys()) {
        const hi = bm.addGeometry(part.hi);
        const lo = part.lo === part.hi ? hi : bm.addGeometry(part.lo);
        e.geos.set(part, [hi, lo]);
      }
      e.bm = bm;
      this.group.add(bm);
      this.meshes.push(bm);
    }

    // 3) Instanzen: Matrix + leichte Farbvariation
    const rng = mulberry32((city.seed * 977 + 31) >>> 0);
    let tris = 0;
    for (const p of PL) {
      const info = KINDS[p.kind];
      _q.setFromAxisAngle(UP, p.ry);
      _p.set(p.x, p.y, p.z);
      _s.set(p.sx, p.sy, p.sz);
      _m.compose(_p, _q, _s);
      const l = info.type === 'building' || info.type === 'wall' ? 0.86 + rng() * 0.22 : info.type === 'prop' || info.type === 'nature' ? 0.9 + rng() * 0.14 : 0.96 + rng() * 0.08;
      const w = (rng() - 0.5) * (info.type === 'figure' ? 0.04 : 0.1);
      _c.setRGB(l * (1 + w), l, l * (1 - w));
      p.inst = [];
      let hasLod = false;
      for (const part of p.rec.parts) {
        const e = mats.get(part.mat.uuid);
        const [hi, lo] = e.geos.get(part);
        const id = e.bm.addInstance(hi);
        e.bm.setMatrixAt(id, _m);
        e.bm.setColorAt(id, _c);
        p.inst.push({ bm: e.bm, id, hi, lo });
        if (hi !== lo) hasLod = true;
        tris += part.hi.index.count / 3;
      }
      p.lod = 0;
      p.lodR = 85 + Math.max(p.ob.hx, p.ob.hz) * 7 + p.ob.h * 2.5;
      if (hasLod) this.lodList.push(p);
      if (p.live) { p.obj = null; this.live.push(p); if (p.rec.spare) p.rec.spareUsed = false; }
    }
    for (const bm of this.meshes) { bm.computeBoundingBox(); bm.computeBoundingSphere(); }
    this.info = { instances: PL.reduce((a, p) => a + p.inst.length, 0), meshes: this.meshes.length, tris: Math.round(tris), placements: PL.length };
    return this.info;
  }

  setShadows(on) { for (const bm of this.meshes) bm.castShadow = on && !bm.material.transparent; }
  setLodScale(k) { this.lodScale = k; }

  /* ───── Live-Objekte (animierte Schwergewichte in Kameranähe) ───── */
  _activate(p) {
    let obj = p.obj;
    if (!obj) {
      const rec = p.rec;
      if (rec.spare && !rec.spareUsed) { obj = rec.spare; rec.spareUsed = true; }
      else obj = createObject(this.lib.defs[p.kind], rec.params);
      for (const l of obj.lights) l.light.visible = false; // Licht kommt aus dem Lichtpool der Stadt
      obj.time = Math.random() * 5;
      p.obj = obj;
    }
    obj.root.position.set(p.x, p.y, p.z);
    obj.root.rotation.set(0, p.ry, 0);
    obj.root.scale.set(p.sx, p.sy, p.sz);
    obj.state = 'active';
    this.liveGroup.add(obj.root);
    obj.root.updateMatrixWorld(true);
    for (const it of p.inst) it.bm.setVisibleAt(it.id, false);
    this.active.add(p);
  }

  _deactivate(p, quiet) {
    if (p.obj) this.liveGroup.remove(p.obj.root);
    for (const it of p.inst ?? []) it.bm.setVisibleAt(it.id, true);
    this.active.delete(p);
  }

  update(camera, dt) {
    const cp = camera.position;
    // Fern-Detailstufen, zeitlich verteilt
    const N = this.lodList.length;
    if (N) {
      const chunk = Math.min(N, 160);
      for (let k = 0; k < chunk; k++) {
        const p = this.lodList[this.lodIdx++ % N];
        const dx = p.x - cp.x, dz = p.z - cp.z;
        const dy = cp.y * 0.5; // Höhe zählt halb: aus der Vogelperspektive reichen einfachere Modelle
        const d2 = dx * dx + dz * dz + dy * dy;
        const R = p.lodR * this.lodScale;
        const want = p.lod ? d2 > R * R * 0.81 : d2 > R * R;
        if (want !== !!p.lod) {
          p.lod = want ? 1 : 0;
          for (const it of p.inst) if (it.lo !== it.hi) it.bm.setGeometryIdAt(it.id, want ? it.lo : it.hi);
        }
      }
    }
    // Live-Objekte
    this._liveT -= dt;
    if (this._liveT <= 0) {
      this._liveT = 0.25;
      this._refreshLive(cp);
    }
    for (const p of this.active) p.obj.update(dt, null);
  }

  _refreshLive(cp) {
    if (!this.liveOn) { for (const p of [...this.active]) this._deactivate(p); return; }
    const R2 = this.liveR * this.liveR;
    const cand = [];
    for (const p of this.live) {
      const dx = p.x - cp.x, dz = p.z - cp.z;
      const d2 = dx * dx + dz * dz + (cp.y * cp.y) * 0.25;
      p._d2 = d2;
      if (d2 < R2 * 1.44) cand.push(p);
    }
    cand.sort((a, b) => a._d2 - b._d2);
    const keep = new Set();
    for (let i = 0; i < cand.length && keep.size < this.maxLive; i++) {
      const p = cand[i];
      if (p._d2 < R2 || this.active.has(p)) keep.add(p);
    }
    for (const p of [...this.active]) if (!keep.has(p)) this._deactivate(p);
    let created = 0;
    for (const p of keep) if (!this.active.has(p) && created++ < 2) this._activate(p); // höchstens 2 neue je Takt (Bauzeit)
  }

  /* ───── Auswahl per Strahl (Platzierungs-Boxen) ───── */
  pick(ray) {
    let best = null, bt = Infinity;
    const o = ray.origin, d = ray.direction;
    for (const p of this.placements) {
      const ob = p.ob;
      if (ob.h < 0.5 || KINDS[p.kind].type === 'figure') continue;
      const ox = o.x - ob.x, oy = o.y - ob.h / 2, oz = o.z - ob.z;
      const lox = ox * ob.c - oz * ob.s, loz = ox * ob.s + oz * ob.c;
      const ldx = d.x * ob.c - d.z * ob.s, ldz = d.x * ob.s + d.z * ob.c;
      let t0 = 0, t1 = Infinity, ok = true;
      for (const [po, pd, h] of [[lox, ldx, ob.hx], [oy, d.y, ob.h / 2], [loz, ldz, ob.hz]]) {
        if (Math.abs(pd) < 1e-9) { if (Math.abs(po) > h) { ok = false; break; } continue; }
        let a = (-h - po) / pd, b = (h - po) / pd;
        if (a > b) [a, b] = [b, a];
        t0 = Math.max(t0, a); t1 = Math.min(t1, b);
        if (t0 > t1) { ok = false; break; }
      }
      if (ok && t0 < bt) { bt = t0; best = p; }
    }
    return best ? { p: best, t: bt } : null;
  }

  dispose() {
    this.clear();
    this.scene.remove(this.group, this.liveGroup);
  }
}
