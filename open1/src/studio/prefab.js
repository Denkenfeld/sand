// Prefabs: eigene mehrteilige 3D-Objekte aus Grundkörpern (Box, Zylinder, Kugel, Kegel, Pyramide) mit Teilebaum und drehbaren Teilen.
// Eine Instanz heißt "Thing" (game.place). Things können Hindernisse sein (`solid`), Lebenspunkte und ein Team haben
// (dann greifen Gegner sie an) und lassen sich auf Ziele ausrichten (aimAt). Auch eigene Einheitentypen können aus Prefabs bestehen.
import * as THREE from 'three';
import { disposeTree } from './ext.js';

const rad = (d) => (d * Math.PI) / 180;
const angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
const SHAPES = ['box', 'cylinder', 'sphere', 'cone', 'pyramid', 'none'];
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q = new THREE.Quaternion();

const cloneOwn = (src, set) => {
  const mat = src.clone();
  mat.userData = { own: true, base: null, baseOpacity: src.opacity, transparent: src.transparent };
  set?.add(mat);
  return mat;
};
// Eigene (veränderbare) Materialien für ein Mesh anlegen; gemeinsam genutzte Prefab-/Modell-Materialien bleiben unberührt
function ownMaterial(m, set) {
  const mm = m.material;
  if (Array.isArray(mm)) { if (mm[0]?.userData?.own) return; m.material = mm.map((x) => cloneOwn(x, set)); return; }
  if (mm.userData.own) return;
  m.material = cloneOwn(mm, set);
}
const matsOf = (m) => (Array.isArray(m.material) ? m.material : [m.material]);

// Kürzester Abstand zwischen zwei Strecken (a→b, c→d); setzt SEG.s/SEG.t (0…1) und gibt den quadrierten Abstand zurück
const SEG = { s: 0, t: 0 };
const cl01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export function segSeg(ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz) {
  const d1x = bx - ax, d1y = by - ay, d1z = bz - az, d2x = dx - cx, d2y = dy - cy, d2z = dz - cz, rx = ax - cx, ry = ay - cy, rz = az - cz;
  const a = d1x * d1x + d1y * d1y + d1z * d1z, e = d2x * d2x + d2y * d2y + d2z * d2z, f = d2x * rx + d2y * ry + d2z * rz;
  let s, t;
  if (a <= 1e-9 && e <= 1e-9) { s = 0; t = 0; }
  else if (a <= 1e-9) { s = 0; t = cl01(f / e); }
  else {
    const c = d1x * rx + d1y * ry + d1z * rz;
    if (e <= 1e-9) { t = 0; s = cl01(-c / a); }
    else {
      const b = d1x * d2x + d1y * d2y + d1z * d2z, den = a * e - b * b;
      s = den > 1e-12 ? cl01((b * f - c * e) / den) : 0;
      t = (b * s + f) / e;
      if (t < 0) { t = 0; s = cl01(-c / a); } else if (t > 1) { t = 1; s = cl01((b - c) / a); }
    }
  }
  SEG.s = s; SEG.t = t;
  const px = ax + d1x * s - (cx + d2x * t), py = ay + d1y * s - (cy + d2y * t), pz = az + d1z * s - (cz + d2z * t);
  return px * px + py * py + pz * pz;
}
export { SEG };
const vec3 = (v, d) => (v == null ? d : typeof v === 'number' ? [v, v, v] : [v[0] ?? d[0], v[1] ?? d[1], v[2] ?? d[2]]);

// Ein Teil eines Things: die öffentliche Hülle um ein Object3D
export class Part {
  constructor(thing, obj, def, ext) { this.thing = thing; this.obj = obj; this.def = def; this.ext = ext; this.name = def.name; }
  get x() { return this.obj.position.x; } set x(v) { this.obj.position.x = v; this.thing._hvDirty = true; }
  get y() { return this.obj.position.y; } set y(v) { this.obj.position.y = v; this.thing._hvDirty = true; }
  get z() { return this.obj.position.z; } set z(v) { this.obj.position.z = v; this.thing._hvDirty = true; }
  // Drehwinkel relativ zum übergeordneten Teil, Bogenmaß (three.js-Achsen: yaw dreht um oben, pitch kippt nach unten, roll dreht um die Blickachse)
  get yaw() { return this.obj.rotation.y; } set yaw(v) { this.obj.rotation.y = v; this.thing._hvDirty = true; }
  get pitch() { return this.obj.rotation.x; } set pitch(v) { this.obj.rotation.x = v; this.thing._hvDirty = true; }
  get roll() { return this.obj.rotation.z; } set roll(v) { this.obj.rotation.z = v; this.thing._hvDirty = true; }
  get visible() { return this.obj.visible; } set visible(v) { this.obj.visible = !!v; }
  get scale() { return this.obj.scale.x; } set scale(v) { this.obj.scale.setScalar(v); this.thing._hvDirty = true; }
  // Farbe ändern (z. B. Treffer-Blitz): legt für das Teil ein eigenes Material an
  set color(c) {
    this.obj.traverse((m) => { if (m.isMesh && m.userData.own !== false) { this.thing._own(m); for (const x of matsOf(m)) if (x.color) { x.color.set(c); x.userData.base = null; } } });
  }
  set emissive(c) { this.obj.traverse((m) => { if (m.isMesh) { this.thing._own(m); for (const x of matsOf(m)) if (x.emissive) x.emissive.set(c); } }); }
  // Weltposition des vorderen Endes (Mündung): { x, y, z, dx, dy, dz }
  tip(local = null) {
    this.thing.root.updateMatrixWorld(true);
    const l = local ?? this.def.muzzle ?? [0, 0, this.def._tipZ ?? 0];
    this.obj.localToWorld(_v.set(l[0], l[1], l[2]));
    _v2.set(0, 0, 1).transformDirection(this.obj.matrixWorld);
    return { x: _v.x, y: _v.y, z: _v.z, dx: _v2.x, dy: _v2.y, dz: _v2.z };
  }
}

export class Thing {
  constructor(game, def, o) {
    this.game = game; this.def = def; this.prefab = def.name; this.isThing = true;
    this.id = o.id ?? game.nextId++;
    this.x = o.x ?? 0; this.z = o.z ?? 0; this.y = o.y ?? 0; this.yaw = o.yaw ?? 0;
    this.size = o.scale ?? o.size ?? 1;
    this.solid = o.solid ?? def.solid ?? 0;
    this.team = o.team ?? def.team ?? null;
    this.hp = o.hp ?? def.hp ?? null; this.maxHp = this.hp;
    this.dead = false; this.removed = false; this.ghost = !!o.ghost;
    this.data = o.data ? { ...o.data } : {};
    this.speedNow = 0;
    this._ownMats = new Set(); this._opacity = 1; this._tint = null;
    const b = game.prefabs.build(def, this);
    this.model = b.model ?? null; this.hits = def.hits?.length ? def.hits : null; this._hv = null; this._hvDirty = true;
    this.root = b.root; this.parts = {}; this.partList = b.parts;
    for (const p of b.parts) { const h = new Part(this, p.obj, p.def, p.ext); p.handle = h; if (p.def.name) this.parts[p.def.name] = h; }
    this.group = new THREE.Group(); this.group.add(this.root);
    this.height = (o.height ?? def.height ?? b.height) * this.size;
    this.radius = (o.radius ?? def.radius ?? b.radius) * this.size;
    this.meshes = b.meshes;
    for (const m of this.meshes) { m.castShadow = true; m.receiveShadow = true; }
    if (this.hp != null) {
      const bw = Math.max(0.9, this.radius * 1.6);
      this.bar = new THREE.Group();
      const bg = new THREE.Mesh(game.barGeo, game.barMats.bg), fg = new THREE.Mesh(game.barGeo, game.barMats.fg);
      bg.scale.set(bw, 0.1, 1); fg.scale.set(bw, 0.1, 1); fg.position.z = 0.002;
      this.bar.add(bg, fg); this.barFg = fg; this.barW = bw;
      this.bar.position.y = this.height + 0.4; this.bar.visible = false;
      this.group.add(this.bar);
    }
    this.sync();
    if (o.opacity != null) this.opacity = o.opacity;
    game.scene.add(this.group);
  }
  get alive() { return !this.dead && !this.removed; }
  get heading() { return Math.PI - this.yaw; } set heading(h) { this.yaw = Math.PI - h; }
  get forward() { return { x: Math.sin(this.yaw), z: Math.cos(this.yaw) }; }
  get visible() { return this.group.visible; } set visible(v) { this.group.visible = !!v; }
  get opacity() { return this._opacity; }
  set opacity(v) {
    this._opacity = v;
    for (const m of this.meshes) { this._own(m); for (const x of matsOf(m)) { x.transparent = v < 0.999 || x.userData.transparent; x.opacity = v * (x.userData.baseOpacity ?? 1); x.depthWrite = v >= 0.999; } }
  }
  // Einfärben (z. B. Bauplatz gültig/ungültig); null = zurück
  tint(c) {
    this._tint = c;
    for (const m of this.meshes) {
      this._own(m);
      for (const mat of matsOf(m)) {
        if (!mat.color) continue;
        if (!mat.userData.base) mat.userData.base = mat.color.clone();
        if (c == null) mat.color.copy(mat.userData.base);
        else mat.color.copy(mat.userData.base).lerp(new THREE.Color(c), 0.65);
      }
    }
  }
  _own(m) { ownMaterial(m, this._ownMats); }

  move(x, z) { this.x = x; this.z = z; this.sync(); if (this.solid > 0) this.game.nav?.invalidate(); return this; }
  set(o = {}) {
    for (const [k, v] of Object.entries(o)) {
      if (k === 'x' || k === 'z' || k === 'y' || k === 'yaw' || k === 'size') this[k] = v;
      else if (k === 'scale') this.size = v;
      else if (k === 'heading') this.heading = v;
      else if (k === 'opacity') this.opacity = v;
      else if (k === 'visible') this.visible = v;
      else if (k === 'data') Object.assign(this.data, v);
      else if (k === 'team' || k === 'hp') { this[k] = v; if (k === 'hp') this.maxHp = Math.max(this.maxHp ?? 0, v); }
      else if (k === 'solid') { this.solid = v; this.game.nav?.invalidate(); }
      else this.game.warn('Thing.set: unbekannte Eigenschaft „' + k + '“');
    }
    this.sync();
    if ('x' in o || 'z' in o) if (this.solid > 0) this.game.nav?.invalidate();
    return this;
  }
  sync() { this.group.position.set(this.x, this.y, this.z); this.root.rotation.y = this.yaw; this.root.scale.setScalar(this.size); this._hvDirty = true; }
  part(name) { const p = this.parts[name]; if (!p) this.game.warn('Prefab „' + this.prefab + '“ hat kein Teil „' + name + '“. Teile: ' + Object.keys(this.parts).join(', ')); return p ?? null; }
  muzzle(name = null) {
    const p = name ? this.part(name) : this.partList.find((q) => q.def.muzzle)?.handle ?? this.partList[this.partList.length - 1]?.handle;
    return p ? p.tip() : { x: this.x, y: this.y + this.height, z: this.z, dx: 0, dy: 0, dz: 1 };
  }
  // Teile auf ein Ziel ausrichten: yawPart dreht um die Hochachse, pitchPart kippt. Gibt { aligned, err } zurück.
  // target: { x, z, y? } oder Einheit/Thing; o: { yawPart, pitchPart, rate (rad/s), tolerance, minElev, maxElev, dt }
  aimAt(target, o = {}) {
    const yp = this.part(o.yawPart ?? 'head'), pp = o.pitchPart === undefined ? this.parts.barrel ?? null : o.pitchPart ? this.part(o.pitchPart) : null;
    if (!yp || !target) return { aligned: false, err: 9 };
    const dt = o.dt ?? this.game.dt ?? 0.016, rate = (o.rate ?? 6) * dt;
    const ty = target.y !== undefined ? target.y + (target.height != null ? target.height * 0.55 : 0) : this.y + 1;
    this.root.updateMatrixWorld(true);
    const tw = _v.set(target.x, ty, target.z).clone();
    const par = yp.obj.parent;
    const lv = par.worldToLocal(tw.clone()).sub(yp.obj.position);
    const wantYaw = Math.atan2(lv.x, lv.z), dy = angDiff(yp.obj.rotation.y, wantYaw);
    yp.obj.rotation.y += Math.max(-rate, Math.min(rate, dy));
    let err = Math.max(0, Math.abs(dy) - rate);
    if (pp) {
      this.root.updateMatrixWorld(true);
      const pl = pp.obj.parent.worldToLocal(tw.clone()).sub(pp.obj.position);
      const elev = Math.max(o.minElev ?? -0.35, Math.min(o.maxElev ?? 1.3, Math.atan2(pl.y, Math.hypot(pl.x, pl.z))));
      const dp = angDiff(pp.obj.rotation.x, -elev);
      pp.obj.rotation.x += Math.max(-rate, Math.min(rate, dp));
      err += Math.max(0, Math.abs(dp) - rate);
    }
    return { aligned: err < (o.tolerance ?? 0.06), err };
  }

  // Bewegen mit Kollision gegen Gebäude und Stadtrand (dx, dz in Metern). Gibt { moved, blocked } zurück.
  // Vertrag: nur x/z, Hitboxen folgen automatisch; `solid` und Navigation werden mitgeführt, andere Dinge/Einheiten blockieren NICHT.
  walk(dx, dz, o = {}) {
    const cm = this.game.cm, r = o.radius ?? Math.min(this.radius, 1.2), ox = this.x, oz = this.z;
    const res = cm.collide(ox + dx, oz + dz, r, { x: 0, z: 0, hit: false });
    let nx = res.x, nz = res.z; const rad = Math.hypot(nx, nz); if (rad > 620) { nx *= 620 / rad; nz *= 620 / rad; }
    this.x = nx; this.z = nz; this.sync();
    if (this.solid > 0 && (nx !== ox || nz !== oz)) this.game.nav?.invalidate();
    return { moved: Math.hypot(nx - ox, nz - oz), blocked: !!res.hit };
  }
  // In Richtung eines Punktes drehen (Kompasswinkel, sofort)
  face(x, z) { this.heading = Math.atan2(x - this.x, -(z - this.z)); this.sync(); return this; }

  // Animationsclips (nur Dinge mit GLB-Modell)
  get clips() { return this.model ? this.model.clips : []; }
  play(name, o) { if (!this.model) { this.game.warn('Thing.play: Dieses Objekt hat kein Modell mit Animationen (prefab mit model: "…")'); return null; } return this.model.play(name, o); }
  stop(name) { this.model?.stop(name); }

  // Trefferzonen in Weltkoordinaten: [{ name, mult, x, y, z, x2, y2, z2, r }] (Kugel: x2=x…; Kapsel: Strecke (x,y,z)→(x2,y2,z2) mit Radius r)
  hitVolumes() {
    if (this._hv && !this._hvDirty && this._hvAt === this.game.frameNo) return this._hv;
    this.group.updateMatrixWorld(true);
    const out = [];
    for (const h of this.hits ?? []) {
      let obj = this.root;
      if (h.follow) obj = typeof h.follow === 'function' ? h.follow(this) : h.follow;
      else if (h.part) obj = this.parts[h.part]?.obj;
      if (!obj || !obj.isObject3D) continue;
      const k = obj.matrixWorld.getMaxScaleOnAxis(), p = h.pos ?? [0, 0, 0];
      _v.set(p[0], p[1], p[2]).applyMatrix4(obj.matrixWorld);
      const v = { name: h.name ?? 'body', mult: h.mult ?? 1, x: _v.x, y: _v.y, z: _v.z, x2: _v.x, y2: _v.y, z2: _v.z, r: Math.max(0.01, (h.r ?? 0.5) * k) };
      if (h.to) { _v.set(h.to[0], h.to[1], h.to[2]).applyMatrix4(obj.matrixWorld); v.x2 = _v.x; v.y2 = _v.y; v.z2 = _v.z; }
      out.push(v);
    }
    this._hv = out; this._hvDirty = false; this._hvAt = this.game.frameNo;
    return out;
  }
  // Wird die Strecke a→b (mit Zusatzradius `extra`) von einer Trefferzone getroffen? → { u (0…1 entlang a→b), zone, mult } oder null
  segHit(ax, ay, az, bx, by, bz, extra = 0) {
    let best = null;
    for (const v of this.hitVolumes()) {
      const d2 = segSeg(ax, ay, az, bx, by, bz, v.x, v.y, v.z, v.x2, v.y2, v.z2), R = v.r + extra;
      if (d2 > R * R) continue;
      const u = Math.max(0, SEG.s - Math.sqrt(Math.max(0, R * R - d2)) / Math.max(1e-6, Math.hypot(bx - ax, by - ay, bz - az)));
      if (!best || u < best.u) best = { u, zone: v.name, mult: v.mult };
    }
    return best;
  }
  rayHit(o, d, maxT) {
    const h = this.segHit(o.x, o.y, o.z, o.x + d.x * maxT, o.y + d.y * maxT, o.z + d.z * maxT, 0);
    return h ? { t: h.u * maxT, zone: h.zone, mult: h.mult } : null;
  }

  damage(n, by = null, zone = null) {
    if (this.dead || this.removed || this.hp == null || n <= 0) return;
    if (this.def.onDamage) {
      let r;
      try { r = this.def.onDamage(this, { amount: n, by, zone }); } catch (e) { this.game.onError(e, 'Prefab „' + this.prefab + '“ onDamage'); }
      if (r === false) return;
      if (typeof r === 'number') n = r;
      if (n <= 0) return;
    }
    if (this.game.handlers.thingHit?.length) this.game.emit('thingHit', { thing: this, amount: n, by, zone });
    this.hp -= n;
    if (this.bar) { const f = Math.max(0, this.hp / this.maxHp); this.barFg.scale.x = Math.max(0.001, this.barW * f); this.barFg.position.x = -(this.barW * (1 - f)) / 2; this.bar.visible = f < 1; }
    if (this.hp <= 0) {
      this.dead = true; this.hp = 0;
      const ev = { thing: this, by };
      this.game.emit('thingDestroyed', ev);
      try { this.def.onDestroy?.(this, by); } catch (e) { this.game.onError(e, 'Prefab „' + this.prefab + '“ onDestroy'); }
      if (this.def.explode !== 0 && !this.removed) this.game.fx3d?.explosion(this.x, this.y + this.height * 0.4, this.z, { scale: this.def.explode ?? 0.7 });
      this.remove();
    }
  }
  kill() { this.damage(1e9, null); }
  heal(n) { if (this.hp == null) return; this.hp = Math.min(this.maxHp, this.hp + n); this.damage(0); if (this.bar) { const f = this.hp / this.maxHp; this.barFg.scale.x = Math.max(0.001, this.barW * f); this.bar.visible = f < 1; } }

  remove() {
    if (this.removed) return;
    this.removed = true;
    this.game.scene.remove(this.group);
    for (const m of this._ownMats) m.dispose();
    if (this.model) this.model.dispose();
    if (this.def.build) disposeTree(this.root);
    this.game.things = this.game.things.filter((t) => t !== this);
    this.game.ghosts = this.game.ghosts.filter((t) => t !== this);
    if (this.solid > 0) this.game.nav?.invalidate();
  }
}

export class Prefabs {
  constructor(game) { this.g = game; this.defs = new Map(); this.geo = new Map(); this.mat = new Map(); }

  clear() { this.defs.clear(); }

  define(name, def) {
    if (!def || typeof def !== 'object') { this.g.warn('prefab(' + name + '): zweites Argument muss ein Objekt mit „parts“ sein'); return null; }
    const parts = def.parts ?? [];
    const custom = def.build != null || def.model != null;
    if (def.build != null && typeof def.build !== 'function') { this.g.warn('prefab „' + name + '“: „build“ muss eine Funktion (thing) → THREE.Object3D sein'); return null; }
    if (def.model != null && typeof def.model !== 'string' && !(typeof def.model === 'object' && typeof def.model.id === 'string')) { this.g.warn('prefab „' + name + '“: „model“ ist die ID eines geladenen Modells (Text) oder { id, height, scale, forward, origin }'); return null; }
    if (def.build != null && def.model != null) { this.g.warn('prefab „' + name + '“: „build“ und „model“ gleichzeitig – es wird nur „build“ benutzt'); }
    if (!custom && (!Array.isArray(parts) || !parts.length)) { this.g.warn('prefab „' + name + '“ braucht eine Liste „parts“ mit mindestens einem Teil – oder „build“ (eigene 3D-Darstellung) oder „model“ (GLB)'); return null; }
    if (def.hits != null) {
      if (!Array.isArray(def.hits)) { this.g.warn('prefab „' + name + '“: „hits“ ist eine Liste von Trefferzonen { name, r, pos, to?, part?, follow?, mult? }'); return null; }
      for (const h of def.hits) if (!h || !(h.r > 0)) this.g.warn('prefab „' + name + '“: jede Trefferzone braucht einen Radius r > 0');
    }
    const seen = new Set();
    const check = (list, path) => {
      for (const p of list) {
        if (p.shape && !SHAPES.includes(p.shape)) this.g.warn('prefab „' + name + '“: Form „' + p.shape + '“ unbekannt. Formen: ' + SHAPES.join(', '));
        if (p.name) { if (seen.has(p.name)) this.g.warn('prefab „' + name + '“: Teilname „' + p.name + '“ kommt doppelt vor'); seen.add(p.name); }
        if (p.children) check(p.children, path + '/' + (p.name ?? ''));
      }
    };
    check(parts, name);
    const d = { ...def, name, parts };
    this.defs.set(name, d);
    return d;
  }

  _geo(shape, o) {
    const key = shape + '|' + (o.top ?? 1);
    let g = this.geo.get(key);
    if (g) return g;
    if (shape === 'box') g = new THREE.BoxGeometry(1, 1, 1);
    else if (shape === 'cylinder') g = new THREE.CylinderGeometry(0.5 * (o.top ?? 1), 0.5, 1, 20);
    else if (shape === 'cone') g = new THREE.ConeGeometry(0.5, 1, 20);
    else if (shape === 'pyramid') { g = new THREE.ConeGeometry(0.5, 1, 4); g.rotateY(Math.PI / 4); }
    else g = new THREE.SphereGeometry(0.5, 20, 14);
    this.geo.set(key, g);
    return g;
  }

  _mat(p) {
    const color = p.color ?? '#9a8f80', key = [color, p.emissive ?? '', p.glow ?? '', p.metal ?? '', p.rough ?? '', p.opacity ?? ''].join('|');
    let m = this.mat.get(key);
    if (m) return m;
    m = new THREE.MeshStandardMaterial({ color, roughness: p.rough ?? 0.72, metalness: p.metal ?? 0.12, emissive: p.emissive ?? 0x000000, emissiveIntensity: p.glow ?? (p.emissive ? 1.4 : 0) });
    if (p.opacity != null && p.opacity < 1) { m.transparent = true; m.opacity = p.opacity; m.userData.baseOpacity = p.opacity; m.userData.transparent = true; }
    this.mat.set(key, m);
    return m;
  }

  // Eigene Darstellung: build(thing) liefert ein THREE.Object3D, oder ein geladenes GLB-Modell. Benannte Knoten werden zu Teilen (thing.part('Name')).
  _buildCustom(def, thing) {
    const g = this.g, root = new THREE.Group(), meshes = [], parts = [];
    let obj = null, model = null;
    if (def.build) {
      try { obj = def.build(thing ?? { stub: true }, { THREE, game: g.api }); } catch (e) { g.onError(e, 'Prefab „' + def.name + '“ build'); }
      if (!obj || !obj.isObject3D) { g.warn('prefab „' + def.name + '“: build muss ein THREE.Object3D zurückgeben'); obj = new THREE.Group(); }
    } else {
      const m = typeof def.model === 'string' ? { id: def.model } : def.model;
      model = g.assets.model(m.id, m);
      obj = model ? model.object : new THREE.Group();
    }
    root.add(obj);
    const seen = new Set();
    obj.traverse((o) => {
      if (o.isMesh) meshes.push(o);
      if (o !== obj && o.name && !seen.has(o.name)) { seen.add(o.name); parts.push({ obj: o, def: { name: o.name }, ext: [0, 0, 0] }); }
    });
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const height = box.isEmpty() ? 1 : Math.max(0.2, box.max.y), radius = box.isEmpty() ? 0.5 : Math.max(0.2, Math.max(box.max.x - box.min.x, box.max.z - box.min.z) / 2);
    return { root, parts, meshes, height, radius, model };
  }

  // Baut den Teilebaum. Gibt { root, parts:[{obj,def,ext}], meshes, height, radius } zurück
  build(def, thing = null) {
    if (def.build || def.model) return this._buildCustom(def, thing);
    const root = new THREE.Group(), parts = [], meshes = [];
    const add = (list, parent) => {
      for (const p of list) {
        const pivot = new THREE.Object3D();
        const pos = vec3(p.pos, [0, 0, 0]);
        pivot.position.set(pos[0], pos[1], pos[2]);
        const r = p.rotDeg ? vec3(p.rotDeg, [0, 0, 0]).map(rad) : vec3(p.rot, [0, 0, 0]);
        pivot.rotation.order = 'YXZ'; pivot.rotation.set(r[0], r[1], r[2]);
        if (p.scale != null) pivot.scale.setScalar(p.scale);
        if (p.visible === false) pivot.visible = false;
        let ext = [0, 0, 0];
        const shape = p.shape ?? 'none';
        if (shape !== 'none') {
          const sz = vec3(p.size, [1, 1, 1]);
          const axis = p.axis ?? 'y';
          const mesh = new THREE.Mesh(this._geo(shape, p), this._mat(p));
          mesh.scale.set(sz[0], sz[1], sz[2]);
          ext = sz.slice();
          if (axis === 'z' && (shape === 'cylinder' || shape === 'cone' || shape === 'pyramid')) { mesh.rotation.x = Math.PI / 2; ext = [sz[0], sz[2], sz[1]]; }
          else if (axis === 'x' && (shape === 'cylinder' || shape === 'cone' || shape === 'pyramid')) { mesh.rotation.z = Math.PI / 2; ext = [sz[1], sz[0], sz[2]]; }
          const an = vec3(p.anchor, [0, 0, 0]);
          mesh.position.set(-an[0] * ext[0], -an[1] * ext[1], -an[2] * ext[2]);
          pivot.add(mesh); meshes.push(mesh);
          p._tipZ = mesh.position.z + ext[2] / 2;
        }
        parent.add(pivot);
        parts.push({ obj: pivot, def: p, ext });
        if (p.children) add(p.children, pivot);
      }
    };
    add(def.parts, root);
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const height = Math.max(0.2, box.max.y), radius = Math.max(0.2, Math.max(box.max.x - box.min.x, box.max.z - box.min.z) / 2);
    return { root, parts, meshes, height, radius };
  }

  place(name, o = {}) {
    const def = this.defs.get(name);
    if (!def) { this.g.warn('Unbekanntes Prefab „' + name + '“. Definiert: ' + ([...this.defs.keys()].join(', ') || '(keine – erst game.prefab(name, {...}) aufrufen)')); return null; }
    const t = new Thing(this.g, def, o);
    if (!o.ghost) this.g.things.push(t);
    else this.g.ghosts.push(t);
    if (t.solid > 0 && !o.ghost) this.g.nav?.invalidate();
    return t;
  }

  // Modell für eine prefab-basierte Einheit (game.defineKind mit prefab:)
  unitModel(name, spec) {
    const def = this.defs.get(name);
    if (!def) { this.g.warn('defineKind: Prefab „' + name + '“ ist nicht definiert'); return null; }
    const b = this.build(def);
    const parts = {};
    for (const p of b.parts) if (p.def.name) parts[p.def.name] = new Part({ _own: (m) => ownMaterial(m), root: b.root }, p.obj, p.def, p.ext);
    const animate = spec.animate;
    return {
      root: b.root, radius: b.radius, height: b.height, parts, def,
      update: (dt, speed, attack, u) => { if (animate) animate(parts, { dt, speed, attack, t: u ? u.t : 0, unit: u }); },
    };
  }
}
