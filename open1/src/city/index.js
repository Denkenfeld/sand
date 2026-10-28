// Stadt-Modus: Bausteine backen → Stadtplan erzeugen → Renderer bauen; dazu Kamera (Übersicht, Flug, Spaziergang,
// Rundflug), Kollisionen fürs Laufen, Nachtlichter (Lichtpool), Feuer und Anklicken von Gebäuden.
import * as THREE from 'three';
import { Library } from './bake.js';
import { generateCity, DISTRICTS, DISTRICT_IDS } from './layout.js';
import { buildCityMap } from './ground.js';
import { CityRenderer } from './renderer.js';
import { KINDS } from './catalog.js';
import { OBJECTS } from '../objects/index.js';
import { setNight } from '../objects/town.js';
import { ARENA, terrainHeight } from '../core/atmosphere.js';
import { Actor } from '../gallery/index.js';

const tick = () => new Promise((r) => setTimeout(r, 0));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const angDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
const _lk = new THREE.Vector3(), NO_INPUT = {};
const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _e = new THREE.Euler(0, 0, 0, 'YXZ'), _qq = new THREE.Quaternion();

export const CAM_MODES = {
  orbit: { label: 'Übersicht', hint: 'Ziehen: drehen · Rechtsklick/Zweifinger: verschieben · Mausrad: Zoom · Klick auf ein Haus: Infos' },
  fly: { label: 'Flug', hint: 'W/A/S/D fliegen · Q/E hoch/runter · Shift schneller · Maus ziehen: umsehen' },
  walk: { label: 'Spaziergang', hint: 'W/A/S/D laufen · Shift rennen · Maus ziehen: umsehen · Häuser sind fest' },
  drive: { label: 'Fahren', hint: 'W/S Gas & Bremse · A/D lenken · Leertaste Handbremse (driften) · Shift Boost · Maus ziehen: umsehen · Mausrad: Abstand' },
  play: { label: 'Spiel', hint: '' },
  tour: { label: 'Rundflug', hint: 'Automatischer Flug an den Sehenswürdigkeiten entlang · jede Eingabe beendet ihn' },
};

export class CityMode {
  constructor(forge) {
    this.forge = forge;
    this.scene = forge.scene;
    this.camera = forge.camera;
    this.controls = forge.controls;
    this.atmosphere = forge.atmosphere;
    this.fx = forge.fx;
    this.lib = null;
    this.city = null;
    this.rend = null;
    this.map = null;
    this.active = false;
    this.camMode = 'orbit';
    this.seed = 1;
    this.district = null;
    this.selected = null;
    this.tween = null;
    this.yaw = 0;
    this.pitch = -0.3;
    this.eye = 1.7;
    this.fps = 60;
    this.listeners = new Set();
    this.onFrame = null;
    this.opt = { fires: true, lights: true, live: true, colliders: false, cycle: false, cycleSpeed: 0.25, lodScale: 1, shadows: true };
    this.pool = [];
    this.poolMap = new Map();
    this._lightT = 0;
    this._fireT = 0;
    this._distT = 0;
    this._cycleT = 0;
    this._near = [];
    this._saved = null;
    this._drag = null;
    this._info = { calls: 0, tris: 0 };
    this.game = null; // laufendes Studio-Spiel (steuert im Modus 'play' die Kamera)
    this.actor = null; // der fahrbare Buggy (Galerie-Adapter)
    this.dv = null; // Zustand der Verfolgerkamera
    this._fov0 = 0;
    this._bindInput();
  }

  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit(ev, data) { for (const fn of this.listeners) fn(ev, data); }

  /* ───────────── Aufbau ───────────── */
  async load(seed, onProgress) {
    if (!this.lib) {
      this.lib = new Library(OBJECTS);
      await this.lib.bakeAll((i, n, label) => onProgress && onProgress((i / n) * 0.66, `Bausteine werden gebacken · ${label}`), tick);
    }
    if (!this.actor) {
      onProgress && onProgress(0.67, 'Fahrzeuge werden gebaut');
      await tick();
      this.actor = new Actor('buggy', { scene: this.scene, heightAt: terrainHeight, obsAt: (x, z, m) => this.obstacleAt(x, z, m) });
      this.actor.onChange = () => this.emit('actor');
      this.actor.park();
    }
    await this.generate(seed ?? this.seed, onProgress);
  }

  async generate(seed, onProgress) {
    const say = async (f, t) => { onProgress && onProgress(f, t); await tick(); };
    await say(0.68, 'Stadtplan wird entworfen');
    const city = generateCity(this.lib, seed);
    await say(0.78, 'Gebäude werden gesetzt');
    if (!this.rend) this.rend = new CityRenderer(this.scene, this.lib);
    if (this.selected) this.select(null);
    this.rend.build(city);
    this.city = city;
    this.seed = seed;
    await say(0.88, 'Straßen und Plätze werden gepflastert');
    if (this.map) this.map.tex.dispose();
    this.map = buildCityMap(city);
    this._buildCollision();
    this._buildColliderLines();
    this._homeActor();
    this._near = [];
    this.poolMap.clear();
    await say(1, 'Fertig');
    if (this.active) this._applyScene();
    this.emit('city', city);
  }

  get info() {
    const r = this.rend;
    return r ? { ...r.info, calls: this._info.calls, tris: this._info.tris, fps: Math.round(this.fps) } : {};
  }

  /* ───────────── Ein- und Ausstieg ───────────── */
  enter() {
    const f = this.forge, a = this.atmosphere;
    if (this.active) return;
    this.active = true;
    if (f.testing) f.setTest(false);
    f.clearExtras();
    if (f.obj) { f.obj.dispose(); f.obj = null; }
    this._saved = { state: { ...a.state }, camPos: this.camera.position.clone(), target: this.controls.target.clone(), near: this.camera.near, far: this.camera.far };
    f.physics.setWall(false);
    f.debug.visible = false;
    this._initLights();
    this.rend.group.visible = true;
    this.rend.liveGroup.visible = true;
    if (this.actor) this.actor.unpark();
    a.onNight = setNight;
    this._applyScene();
    a.setHour(16.2);
    this.controls.minDistance = 3;
    this.controls.maxDistance = 760;
    this.controls.maxPolarAngle = Math.PI * 0.485;
    this.controls.enablePan = true;
    this.controls.screenSpacePanning = false;
    this.camera.far = 6000;
    this.setMode('orbit', { keep: true });
    this.overview(true);
    this.emit('enter');
  }

  exit() {
    if (!this.active) return;
    const f = this.forge, a = this.atmosphere;
    this.active = false;
    this.select(null);
    this.tween = null;
    this.rend.group.visible = false;
    this.rend.liveGroup.visible = false;
    this.rend._refreshLive({ x: 1e6, y: 0, z: 1e6 });
    if (this.actor) this.actor.park();
    this._restoreFov();
    for (const l of this.pool) l.intensity = 0;
    this.colliderLines.visible = false;
    a.setCityMap(null);
    a.onNight = null;
    setNight(0);
    a.fogScale = 1;
    a.setArena(ARENA);
    a.setShadowRadius(60);
    Object.assign(a.state, this._saved.state);
    a.apply();
    f.physics.setWall(true);
    this.controls.enabled = true;
    this.controls.minDistance = 1.5;
    this.controls.maxDistance = 140;
    this.controls.maxPolarAngle = Math.PI * 0.495;
    this.controls.screenSpacePanning = true;
    this.camera.near = this._saved.near;
    this.camera.far = this._saved.far;
    this.camera.updateProjectionMatrix();
    this.emit('exit');
  }

  _applyScene() {
    const a = this.atmosphere;
    a.setArena(470);
    a.fogScale = 0.55;
    a.setCityMap(this.map.tex, this.map.box);
    a.apply();
    this.rend.setShadows(this.opt.shadows);
    this.rend.setLodScale(this.opt.lodScale);
    this.rend.liveOn = this.opt.live;
  }

  /* ───────────── Lichter, Feuer ───────────── */
  _initLights() {
    if (this.pool.length) return;
    for (let i = 0; i < 14; i++) {
      const l = new THREE.PointLight(0xffc070, 0, 24, 2);
      l.castShadow = false;
      this.scene.add(l);
      this.pool.push(l);
    }
  }

  _updateLights(focus) {
    const night = this.atmosphere.nightK;
    const lights = this.city.lights;
    if (!this.opt.lights || night < 0.03) { for (const l of this.pool) l.intensity = 0; this.poolMap.clear(); return; }
    // die nächsten Lichtquellen (bereits belegte bleiben bevorzugt, damit nichts springt)
    const cand = [];
    for (let i = 0; i < lights.length; i++) {
      const c = lights[i];
      const dx = c.x - focus.x, dz = c.z - focus.z, dy = c.y - focus.y;
      const d2 = dx * dx + dz * dz + dy * dy * 0.3;
      if (d2 < 200 * 200) cand.push([d2 - (this.poolMap.has(i) ? 400 : 0), i]);
    }
    cand.sort((a, b) => a[0] - b[0]);
    const want = new Set(cand.slice(0, this.pool.length).map((c) => c[1]));
    const free = [];
    const used = new Set();
    for (const [i, slot] of [...this.poolMap]) {
      if (want.has(i)) used.add(slot); else { this.poolMap.delete(i); free.push(slot); }
    }
    for (let s = 0; s < this.pool.length; s++) if (!used.has(s) && !free.includes(s)) free.push(s);
    for (const i of want) {
      if (this.poolMap.has(i)) continue;
      const slot = free.pop();
      if (slot === undefined) break;
      this.poolMap.set(i, slot);
    }
    const slotUsed = new Set();
    for (const [i, slot] of this.poolMap) {
      const c = lights[i], l = this.pool[slot];
      l.position.set(c.x, c.y, c.z);
      l.color.setHex(c.c);
      l.intensity = night * c.k * 34;
      l.distance = 20 + c.k * 4;
      slotUsed.add(slot);
    }
    for (let s = 0; s < this.pool.length; s++) if (!slotUsed.has(s)) this.pool[s].intensity = 0;
  }

  _updateFires(dt, focus) {
    if (!this.opt.fires) return;
    this._fireT -= dt;
    if (this._fireT <= 0) {
      this._fireT = 0.4;
      const R2 = 95 * 95;
      const c = [];
      for (const f of this.city.fires) {
        const dx = f.x - focus.x, dz = f.z - focus.z;
        const d2 = dx * dx + dz * dz;
        if (d2 < R2) c.push([d2, f]);
      }
      c.sort((a, b) => a[0] - b[0]);
      this._near = c.slice(0, 26).map((x) => x[1]);
    }
    const k = Math.min(1, dt * 42);
    for (const f of this._near) {
      const p = this.rend.placements[f.id];
      if (p && this.rend.active.has(p)) continue; // das animierte Objekt zeichnet seine Flamme selbst
      if (Math.random() < k) this.fx.flame(f, f.size);
    }
  }

  /* ───────────── Kollision (Spaziergang) ───────────── */
  _buildCollision() {
    const CELL = 16;
    this.cell = CELL;
    this.grid = new Map();
    const add = (ob) => {
      const r = Math.hypot(ob.hx, ob.hz);
      for (let cx = Math.floor((ob.x - r) / CELL); cx <= Math.floor((ob.x + r) / CELL); cx++) {
        for (let cz = Math.floor((ob.z - r) / CELL); cz <= Math.floor((ob.z + r) / CELL); cz++) {
          const k = cx * 4096 + cz;
          let a = this.grid.get(k);
          if (!a) this.grid.set(k, (a = []));
          a.push(ob);
        }
      }
    };
    this.solids = [];
    for (const p of this.city.placements) {
      if (p.solid) { add(p.ob); this.solids.push(p); }
      if (p.blocks) for (const b of p.blocks) add(b);
    }
  }

  // Kreis (r) gegen Gebäude-Boxen: gibt die korrigierte Position zurück
  collide(x, z, r, out = { x: 0, z: 0, hit: false }) {
    out.hit = false;
    for (let pass = 0; pass < 3; pass++) {
      let moved = false;
      const cx = Math.floor(x / this.cell), cz = Math.floor(z / this.cell);
      for (let ix = cx - 1; ix <= cx + 1; ix++) for (let iz = cz - 1; iz <= cz + 1; iz++) {
        const a = this.grid.get(ix * 4096 + iz);
        if (!a) continue;
        for (const ob of a) {
          const dx = x - ob.x, dz = z - ob.z;
          const lx = dx * ob.c - dz * ob.s, lz = dx * ob.s + dz * ob.c;
          const qx = clamp(lx, -ob.hx, ob.hx), qz = clamp(lz, -ob.hz, ob.hz);
          let px = lx - qx, pz = lz - qz;
          let d = Math.hypot(px, pz);
          if (d >= r) continue;
          if (d < 1e-5) { // Mittelpunkt liegt im Inneren: entlang der nächsten Seite hinausschieben
            const ox = ob.hx - Math.abs(lx), oz = ob.hz - Math.abs(lz);
            if (ox < oz) { px = Math.sign(lx || 1); pz = 0; d = -ox; } else { px = 0; pz = Math.sign(lz || 1); d = -oz; }
          } else { px /= d; pz /= d; }
          const push = r - d;
          x += (px * ob.c + pz * ob.s) * push;
          z += (-px * ob.s + pz * ob.c) * push;
          moved = true;
          out.hit = true;
        }
      }
      if (!moved) break;
    }
    out.x = x;
    out.z = z;
    return out;
  }

  // Punkt gegen aufgeblähte Gebäude-Boxen (für den Buggy); m = Sicherheitsabstand in Metern
  obstacleAt(x, z, m = 0.45) {
    if (x * x + z * z > 640 * 640) return true;
    const g = this.grid;
    if (!g) return false;
    const C = this.cell;
    const x0 = Math.floor((x - 0.8) / C), x1 = Math.floor((x + 0.8) / C), z0 = Math.floor((z - 0.8) / C), z1 = Math.floor((z + 0.8) / C);
    for (let ix = x0; ix <= x1; ix++) for (let iz = z0; iz <= z1; iz++) {
      const a = g.get(ix * 4096 + iz);
      if (!a) continue;
      for (const ob of a) {
        if (ob.h < 0.55) continue; // niedriges Zeug überfährt der Buggy
        const dx = x - ob.x, dz = z - ob.z;
        const lx = dx * ob.c - dz * ob.s, lz = dx * ob.s + dz * ob.c;
        if (Math.abs(lx) < ob.hx + m && Math.abs(lz) < ob.hz + m) return true;
      }
    }
    return false;
  }

  // Strahl (Richtung normiert) gegen feste Gebäude-Boxen: Abstand des ersten Treffers oder Infinity
  raycastWorld(ox, oy, oz, dx, dy, dz, maxT = 200) {
    const C = this.cell, g = this.grid;
    if (!g) return Infinity;
    const stamp = (this._rq = (this._rq ?? 0) + 1);
    let ix = Math.floor(ox / C), iz = Math.floor(oz / C);
    const sx = dx > 0 ? 1 : -1, sz = dz > 0 ? 1 : -1;
    const tdx = Math.abs(dx) > 1e-9 ? C / Math.abs(dx) : Infinity, tdz = Math.abs(dz) > 1e-9 ? C / Math.abs(dz) : Infinity;
    let tx = Math.abs(dx) > 1e-9 ? ((dx > 0 ? ix + 1 : ix) * C - ox) / dx : Infinity;
    let tz = Math.abs(dz) > 1e-9 ? ((dz > 0 ? iz + 1 : iz) * C - oz) / dz : Infinity;
    let best = maxT;
    for (let n = 0; n < 160; n++) {
      const a = g.get(ix * 4096 + iz);
      if (a) {
        for (const ob of a) {
          if (ob._rq === stamp || ob.h < 0.45) continue;
          ob._rq = stamp;
          const px = ox - ob.x, pz = oz - ob.z;
          const lox = px * ob.c - pz * ob.s, loz = px * ob.s + pz * ob.c, ldx = dx * ob.c - dz * ob.s, ldz = dx * ob.s + dz * ob.c;
          let t0 = 0, t1 = best, ok = true;
          for (const [po, pd, h0, h1] of [[lox, ldx, -ob.hx, ob.hx], [oy, dy, 0, ob.h], [loz, ldz, -ob.hz, ob.hz]]) {
            if (Math.abs(pd) < 1e-9) { if (po < h0 || po > h1) { ok = false; break; } continue; }
            let q0 = (h0 - po) / pd, q1 = (h1 - po) / pd;
            if (q0 > q1) { const t = q0; q0 = q1; q1 = t; }
            if (q0 > t0) t0 = q0;
            if (q1 < t1) t1 = q1;
            if (t0 > t1) { ok = false; break; }
          }
          if (ok && t0 < best) best = t0;
        }
      }
      if (Math.min(tx, tz) > best) break;
      if (tx < tz) { ix += sx; tx += tdx; } else { iz += sz; tz += tdz; }
    }
    return best < maxT ? best : Infinity;
  }

  _fits(x, z, ry, hw, hl) {
    const s = Math.sin(ry), c = Math.cos(ry), m = this.actor.margin;
    for (const lx of [-hw, -hw / 2, 0, hw / 2, hw]) for (const lz of [-hl, -hl * 0.66, -hl / 3, 0, hl / 3, hl * 0.66, hl]) {
      if (this.obstacleAt(x + lx * c + lz * s, z - lx * s + lz * c, m)) return false;
    }
    return true;
  }

  // freie Stelle für den Wagen in der Nähe von (x,z); face = zum Ausgangspunkt gedreht, sonst Richtung ry
  findSpot(x, z, ry, minR = 0, face = false) {
    const { hw, hl } = this.actor;
    const turn = (px, pz) => (face ? Math.atan2(-(x - px), -(z - pz)) : ry);
    if (!minR && this._fits(x, z, ry, hw, hl)) return { x, z, ry, ok: true };
    for (let r = Math.max(2.5, minR); r <= 80; r += 2.5) {
      const n = Math.max(10, Math.round(r * 1.2));
      for (let i = 0; i < n; i++) {
        const ang = ry + (i / n) * Math.PI * 2;
        const px = x + Math.sin(ang) * r, pz = z + Math.cos(ang) * r, rr = turn(px, pz);
        if (this._fits(px, pz, rr, hw, hl)) return { x: px, z: pz, ry: rr, ok: true };
      }
    }
    return { x, z, ry, ok: false };
  }

  placeActor(x, z, ry, minR = 0) {
    const a = this.actor;
    if (!a) return;
    const s = this.findSpot(x, z, ry, minR);
    a.place(s.x, s.z, s.ry);
    this._blendCamera();
  }

  // freie Strecke vor dem Wagen (Meter, höchstens max)
  _freeRun(x, z, ry, max = 40) {
    const fx = -Math.sin(ry), fz = -Math.cos(ry), rx = Math.cos(ry), rz = -Math.sin(ry), hw = this.actor.hw, m = this.actor.margin;
    for (let d = 3; d <= max; d += 1.5) for (const lx of [-hw, 0, hw]) if (this.obstacleAt(x + fx * d + rx * lx, z + fz * d + rz * lx, m)) return d;
    return max;
  }

  // Ausgangsplatz: auf einer breiten Straße nahe dem Zentrum mit langer freier Strecke; sonst am Kernplatz
  _homeActor() {
    const a = this.actor;
    if (!a || !this.city) return;
    const pl = this.city.plazas[0];
    const cx = pl ? pl.x : 0, cz = pl ? pl.z : 0;
    const { hw, hl } = a;
    let best = null;
    for (const r of this.city.roads) {
      if (r.cls === 'ring' || r.hw < 4) continue;
      for (let i = 0; i + 2 < r.pts.length; i += 2) {
        const [x, z] = r.pts[i], [x2, z2] = r.pts[i + 2];
        const d = Math.hypot(x - cx, z - cz);
        if (d < 22 || d > 110) continue;
        const base = Math.atan2(-(x2 - x), -(z2 - z));
        for (const ry of [base, base + Math.PI]) {
          if (!this._fits(x, z, ry, hw, hl)) continue;
          const sc = this._freeRun(x, z, ry, 70) - d * 0.15;
          if (!best || sc > best.sc) best = { x, z, ry, sc };
        }
      }
    }
    if (!best) {
      const s = this.findSpot(cx, cz, 0.6, 9, true);
      best = { x: s.x, z: s.z, ry: s.ry };
      let bs = -1;
      for (let i = 0; i < 24; i++) {
        const ry = (i / 24) * Math.PI * 2;
        if (!this._fits(s.x, s.z, ry, hw, hl)) continue;
        const sc = this._freeRun(s.x, s.z, ry);
        if (sc > bs) { bs = sc; best.ry = ry; }
      }
    }
    a.place(best.x, best.z, best.ry);
    this._blendCamera();
  }

  _restoreFov() {
    if (this._fov0 && this.camera.fov !== this._fov0) { this.camera.fov = this._fov0; this.camera.updateProjectionMatrix(); }
    this._fov0 = 0;
  }

  // Kamera sanft aus der jetzigen Lage in die Verfolgerposition führen
  _blendCamera() {
    if (this.dv) { this.dv.blend = 0; this.dv.from = { pos: this.camera.position.clone(), q: this.camera.quaternion.clone() }; }
  }

  _buildColliderLines() {
    if (this.colliderLines) { this.scene.remove(this.colliderLines); this.colliderLines.geometry.dispose(); }
    const pos = [];
    const edges = [[0, 1], [1, 2], [2, 3], [3, 0]];
    const box = (ob, h) => {
      const c = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => {
        const lx = sx * ob.hx, lz = sz * ob.hz;
        return [ob.x + lx * ob.c + lz * ob.s, ob.z - lx * ob.s + lz * ob.c];
      });
      for (const [a, b] of edges) {
        pos.push(c[a][0], 0.05, c[a][1], c[b][0], 0.05, c[b][1]);
        pos.push(c[a][0], h, c[a][1], c[b][0], h, c[b][1]);
        pos.push(c[a][0], 0.05, c[a][1], c[a][0], h, c[a][1]);
      }
    };
    for (const p of this.solids) box(p.ob, Math.min(p.ob.h, 14));
    for (const p of this.city.placements) if (p.blocks) for (const b of p.blocks) box(b, 8);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    this.colliderLines = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x45ffa8, transparent: true, opacity: 0.8, fog: false }));
    this.colliderLines.frustumCulled = false;
    this.colliderLines.visible = this.opt.colliders && this.active;
    this.scene.add(this.colliderLines);
  }

  setOption(key, value) {
    this.opt[key] = value;
    if (key === 'colliders' && this.colliderLines) this.colliderLines.visible = value && this.active;
    else if (key === 'shadows') this.rend.setShadows(value);
    else if (key === 'lodScale') this.rend.setLodScale(value);
    else if (key === 'live') this.rend.liveOn = value;
    this.emit('option', key);
  }

  /* ───────────── Kamera ───────────── */
  setMode(mode, { keep = false } = {}) {
    if (!CAM_MODES[mode]) return;
    const cam = this.camera, c = this.controls;
    const prev = this.camMode;
    this.tween = null;
    if (prev === 'orbit' && mode !== 'orbit' && !keep) {
      // Blickrichtung aus der Orbit-Kamera übernehmen
      _v.copy(c.target).sub(cam.position);
      this.yaw = Math.atan2(-_v.x, -_v.z);
      this.pitch = Math.atan2(_v.y, Math.hypot(_v.x, _v.z));
    } else if (prev !== 'orbit' && mode !== 'orbit' && !keep) {
      cam.getWorldDirection(_v);
      this.yaw = Math.atan2(-_v.x, -_v.z);
      this.pitch = Math.asin(clamp(_v.y, -1, 1));
    }
    this.camMode = mode;
    c.enabled = mode === 'orbit';
    if (prev === 'drive' && mode !== 'drive') this._restoreFov();
    if (mode === 'orbit') {
      if (prev !== 'orbit' && !keep) {
        cam.getWorldDirection(_v);
        // Zielpunkt: Schnitt des Blicks mit dem Boden, sonst ein Stück voraus
        let t = _v.y < -0.05 ? -cam.position.y / _v.y : 60;
        t = clamp(t, 12, 320);
        c.target.copy(cam.position).addScaledVector(_v, t);
        c.target.y = Math.max(0, c.target.y);
        if (prev === 'drive' && this.actor) c.target.set(this.actor.x, 0, this.actor.z);
        if (cam.position.y < 4) cam.position.y = 4;
      }
      c.update();
    } else if (mode === 'play') {
      if (!this.game) return this.setMode(prev === 'play' ? 'orbit' : prev);
    } else if (mode === 'drive') {
      if (!this.actor) return this.setMode(prev === 'drive' ? 'orbit' : prev);
      this._enterDrive(prev);
    } else if (mode === 'walk') {
      if (prev === 'orbit' && !keep) {
        cam.position.set(c.target.x, this.eye, c.target.z);
        this.pitch = 0;
      } else if (prev === 'drive' && !keep && this.actor) {
        // aussteigen: links neben den Wagen, Blick in Fahrtrichtung
        const a = this.actor;
        cam.position.set(a.x - Math.cos(a.ry) * (a.hw + 1.4), this.eye, a.z + Math.sin(a.ry) * (a.hw + 1.4));
        this.yaw = a.ry;
        this.pitch = 0;
      }
      const r = this.collide(cam.position.x, cam.position.z, 0.5);
      cam.position.set(r.x, this.eye, r.z);
      this.pitch = clamp(this.pitch, -1.2, 1.2);
    } else if (mode === 'fly') {
      if (cam.position.y < 3) cam.position.y = 3;
    } else if (mode === 'tour') {
      if (!this._buildTour()) return this.setMode('orbit');
    }
    this._applyView();
    this.emit('mode', mode);
  }

  // Einsteigen: Wagen zur Blickstelle holen (wenn er weiter als 30 m weg steht), Kamera gleitet hinter ihn
  _enterDrive(prev) {
    const a = this.actor, cam = this.camera, c = this.controls;
    let tx, tz;
    if (prev === 'orbit') { tx = c.target.x; tz = c.target.z; }
    else {
      const d = prev === 'walk' ? 8 : clamp(cam.position.y * 0.8, 8, 60);
      tx = cam.position.x - Math.sin(this.yaw) * d;
      tz = cam.position.z - Math.cos(this.yaw) * d;
    }
    this._fov0 = this._fov0 || cam.fov;
    if (Math.hypot(a.x - tx, a.z - tz) > 30) {
      const s = this.findSpot(tx, tz, this.yaw);
      a.place(s.x, s.z, s.ry);
    }
    this.dv = {
      yaw: Math.atan2(cam.position.x - a.x, cam.position.z - a.z), base: a.ry, offYaw: 0, offPitch: 0, scale: 1, fov: 0,
      blend: 0, from: { pos: cam.position.clone(), q: cam.quaternion.clone() }, drag: false, dragT: 0,
    };
  }

  _applyView() {
    if (this.camMode === 'orbit' || this.camMode === 'drive' || this.camMode === 'play') return;
    _e.set(this.pitch, this.yaw, 0);
    this.camera.quaternion.setFromEuler(_e);
  }

  // Gesamtansicht der Stadt
  overview(instant = false) {
    const R = this.city ? this.city.wallR : 230;
    this.goTo(new THREE.Vector3(0, 0, 18), new THREE.Vector3(-R * 0.55, R * 0.78, R * 1.12), instant);
  }

  // Kamera sanft zu Position/Blickziel bewegen (nur in den freien Modi; im Spaziergang springt sie)
  goTo(target, pos, instant = false) {
    const cam = this.camera;
    if (this.camMode === 'tour') this.setMode('orbit');
    if (this.camMode === 'drive') {
      this.placeActor(pos.x, pos.z, Math.atan2(-(target.x - pos.x), -(target.z - pos.z)));
      return;
    }
    if (this.camMode === 'walk') {
      const r = this.collide(pos.x, pos.z, 0.5);
      cam.position.set(r.x, this.eye, r.z);
      _v.copy(target).sub(cam.position);
      this.yaw = Math.atan2(-_v.x, -_v.z);
      this.pitch = clamp(Math.atan2(_v.y - this.eye, Math.hypot(_v.x, _v.z)) * 0.4, -0.5, 0.4);
      this._applyView();
      return;
    }
    const fromPos = cam.position.clone(), fromTarget = this.controls.target.clone();
    const fromYaw = this.yaw, fromPitch = this.pitch;
    let toYaw = 0, toPitch = 0;
    if (this.camMode === 'fly') {
      _v.copy(target).sub(pos);
      toYaw = Math.atan2(-_v.x, -_v.z);
      toPitch = Math.atan2(_v.y, Math.hypot(_v.x, _v.z));
    }
    const apply = (k) => {
      cam.position.lerpVectors(fromPos, pos, k);
      if (this.camMode === 'orbit') this.controls.target.lerpVectors(fromTarget, target, k);
      else { this.yaw = fromYaw + angDiff(fromYaw, toYaw) * k; this.pitch = fromPitch + (toPitch - fromPitch) * k; this._applyView(); }
    };
    if (instant) { apply(1); if (this.camMode === 'orbit') this.controls.update(); return; }
    const dist = fromPos.distanceTo(pos);
    this.tween = { t: 0, dur: clamp(0.9 + dist / 260, 1.1, 2.6), apply };
  }

  // Auf einen Punkt/Platzierung zufliegen
  flyTo(x, z, { height = 6, dist = 0, instant = false } = {}) {
    const cam = this.camera;
    const target = new THREE.Vector3(x, Math.min(height * 0.45, 8), z);
    const d = dist || clamp(height * 2.6 + 26, 34, 110);
    // Seite, von der wir uns nähern: aktuelle Blickrichtung beibehalten (sonst von Süden)
    let ax = 0, az = 1;
    if (this.camMode === 'orbit') { ax = cam.position.x - this.controls.target.x; az = cam.position.z - this.controls.target.z; }
    else { _v.set(0, 0, -1).applyQuaternion(cam.quaternion); ax = -_v.x; az = -_v.z; }
    const l = Math.hypot(ax, az) || 1;
    ax /= l; az /= l;
    const walk = this.camMode === 'walk';
    const pos = walk
      ? new THREE.Vector3(x + ax * (Math.max(6, d * 0.28)), this.eye, z + az * (Math.max(6, d * 0.28)))
      : this.camMode === 'drive'
        ? new THREE.Vector3(x + ax * Math.min(d, 30), 0, z + az * Math.min(d, 30))
        : new THREE.Vector3(x + ax * d, target.y + d * 0.5, z + az * d);
    this.goTo(target, pos, instant);
  }

  // Minimap-Klick: Ansicht an eine andere Stelle der Stadt verschieben, Blickwinkel und Höhe behalten
  teleport(x, z) {
    const cam = this.camera;
    if (this.camMode === 'tour') this.setMode('orbit');
    if (this.camMode === 'orbit') {
      const off = cam.position.clone().sub(this.controls.target);
      const t = new THREE.Vector3(x, 0, z);
      this.goTo(t, t.clone().add(off));
    } else if (this.camMode === 'drive') {
      this.placeActor(x, z, this.actor.ry);
    } else if (this.camMode === 'fly') {
      const from = cam.position.clone(), to = new THREE.Vector3(x, Math.max(cam.position.y, 14), z);
      this.tween = { t: 0, dur: clamp(0.8 + from.distanceTo(to) / 300, 1, 2.2), apply: (k) => cam.position.lerpVectors(from, to, k) };
    } else this.goTo(new THREE.Vector3(x + Math.sin(-this.yaw) * 10, 1.4, z - Math.cos(this.yaw) * 10), new THREE.Vector3(x, this.eye, z), true);
  }

  /* ───────────── Rundflug ───────────── */
  _buildTour() {
    const C = this.city;
    const pts = C.pois.filter((p) => p.d !== 'out' || ['fortress', 'sandworm', 'wreckedHull', 'solarField'].includes(p.kind)).map((p) => ({ x: p.x, z: p.z, a: Math.atan2(-p.z, p.x), r: Math.hypot(p.x, p.z) }));
    pts.sort((a, b) => a.a - b.a);
    const cam = [], look = [];
    pts.forEach((p, i) => {
      const k = i % 3;
      const back = 26 + k * 9;
      const out = Math.hypot(p.x, p.z) || 1;
      // Kamera steht auf der Mittelpunktsseite versetzt und seitlich, damit der Weg Kurven fliegt
      const side = i % 2 ? 1 : -1;
      const nx = p.x / out, nz = p.z / out;
      cam.push(new THREE.Vector3(p.x - nx * back * 0.5 - nz * side * back, 12 + k * 9 + (p.r > 200 ? 8 : 0), p.z - nz * back * 0.5 + nx * side * back));
      look.push(new THREE.Vector3(p.x, 4, p.z));
    });
    if (cam.length < 4) return false;
    this.tourCam = new THREE.CatmullRomCurve3(cam, true, 'centripetal');
    this.tourLook = new THREE.CatmullRomCurve3(look, true, 'centripetal');
    this.tourLen = this.tourCam.getLength();
    // beim aktuellen Punkt der Bahn einsteigen
    let best = 0, bd = 1e12;
    for (let u = 0; u < 1; u += 0.01) { const d = this.tourCam.getPointAt(u).distanceToSquared(this.camera.position); if (d < bd) { bd = d; best = u; } }
    this.tourU = best;
    this.tourFrom = { pos: this.camera.position.clone(), q: this.camera.quaternion.clone(), t: 0 };
    this.tourSpeed = 1;
    return true;
  }

  _tickTour(dt) {
    const cam = this.camera;
    this.tourU = (this.tourU + (dt * 15 * this.tourSpeed) / this.tourLen) % 1;
    const p = this.tourCam.getPointAt(this.tourU);
    const l = this.tourLook.getPointAt(this.tourU);
    const f = this.tourFrom;
    f.t = Math.min(1, f.t + dt / 2.2);
    const k = ease(f.t);
    cam.position.copy(f.pos).lerp(p, k);
    cam.lookAt(l);
    if (k < 1) { _qq.copy(f.q).slerp(cam.quaternion, k); cam.quaternion.copy(_qq); }
    cam.position.y = Math.max(cam.position.y, 3.5);
  }

  /* ───────────── Eingabe ───────────── */
  _bindInput() {
    const el = this.forge.renderer.domElement;
    el.addEventListener('pointerdown', (e) => {
      if (!this.active || this.camMode === 'play') return;
      this._drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), moved: false, id: e.pointerId };
      if (this.camMode === 'tour') this.setMode('fly');
      if (this.camMode === 'fly' || this.camMode === 'walk' || this.camMode === 'drive') el.setPointerCapture?.(e.pointerId);
      if (this.camMode === 'drive' && this.dv) { this.dv.drag = true; this.dv.dragT = 0; }
    });
    el.addEventListener('pointermove', (e) => {
      const d = this._drag;
      if (!d || !this.active) return;
      if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 5) d.moved = true;
      if (this.camMode === 'fly' || this.camMode === 'walk') {
        this.yaw -= (e.clientX - d.x) * 0.0032;
        this.pitch = clamp(this.pitch - (e.clientY - d.y) * 0.0032, -1.5, 1.5);
        this._applyView();
      }
      if (this.camMode === 'drive' && this.dv) {
        this.dv.offYaw -= (e.clientX - d.x) * 0.0035;
        this.dv.offPitch = clamp(this.dv.offPitch + (e.clientY - d.y) * 0.0035, -0.3, 1.0);
      }
      d.x = e.clientX;
      d.y = e.clientY;
    });
    const up = (e) => {
      const d = this._drag;
      this._drag = null;
      if (this.dv) { this.dv.drag = false; this.dv.dragT = 0; }
      if (!d || !this.active || e.type === 'pointercancel') return;
      if (!d.moved && performance.now() - d.t < 450 && e.button === 0) this._click(e);
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', (e) => {
      if (!this.active) return;
      if (this.camMode === 'tour') this.setMode('orbit');
      else if (this.camMode === 'drive' && this.dv) this.dv.scale = clamp(this.dv.scale * (e.deltaY > 0 ? 1.1 : 0.9), 0.45, 3);
    }, { passive: true });
  }

  _click(e) {
    const el = this.forge.renderer.domElement, r = el.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const hit = this.rend.pick(ray.ray);
    this.select(hit && hit.t < 900 ? hit.p : null);
  }

  select(p) {
    this.selected = p;
    if (!this.hl) {
      const g = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));
      this.hl = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x62d9c0, depthTest: false, transparent: true, opacity: 0.95, fog: false }));
      this.hl.renderOrder = 999;
      this.hl.frustumCulled = false;
      this.scene.add(this.hl);
    }
    this.hl.visible = !!p;
    if (p) {
      const ob = p.ob;
      this.hl.position.set(ob.x, ob.h / 2, ob.z);
      this.hl.scale.set(ob.hx * 2 + 0.3, ob.h + 0.3, ob.hz * 2 + 0.3);
      this.hl.rotation.set(0, Math.atan2(ob.s, ob.c), 0);
    }
    this.emit('select', p);
  }

  describe(p) {
    const k = KINDS[p.kind];
    const rec = this.rend.placements[p.id]?.rec;
    const n = this.lib.variants(p.kind).length;
    return {
      name: k.label,
      district: p.d === 'out' ? 'Außerhalb der Mauern' : DISTRICTS[p.d]?.name ?? p.d,
      variant: `${p.vi + 1} von ${n}`,
      size: `${(p.ob.hx * 2).toFixed(1)} × ${(p.ob.hz * 2).toFixed(1)} m · ${p.ob.h.toFixed(1)} m hoch`,
      tris: rec ? Math.round(rec.tris) : 0,
      type: k.type,
      live: !!p.live,
    };
  }

  /* ───────────── Pro Frame ───────────── */
  update(dt, raw = dt) {
    if (!this.active) return;
    const cam = this.camera, a = this.atmosphere, keys = this.forge.keys;
    this.fps += (Math.min(120, 1 / Math.max(raw, 1e-4)) - this.fps) * 0.08;

    if (this.tween) {
      const t = this.tween;
      t.t += dt;
      const k = ease(Math.min(1, t.t / t.dur));
      t.apply(k);
      if (t.t >= t.dur) this.tween = null;
    }

    const shift = keys.has('ShiftLeft') || keys.has('ShiftRight');
    const mv = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
    const st = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    const R = 700;
    let focusY = 0;
    if (this.camMode === 'fly') {
      const lift = (keys.has('KeyE') || keys.has('Space') ? 1 : 0) - (keys.has('KeyQ') || keys.has('KeyC') ? 1 : 0);
      if (mv || st || lift) this.tween = null;
      const sp = clamp(cam.position.y * 0.9, 7, 70) * (shift ? 3 : 1);
      _v.set(0, 0, -1).applyQuaternion(cam.quaternion);
      _w.set(1, 0, 0).applyQuaternion(cam.quaternion);
      cam.position.addScaledVector(_v, mv * sp * dt).addScaledVector(_w, st * sp * dt);
      cam.position.y += lift * sp * 0.7 * dt;
      cam.position.y = clamp(cam.position.y, 2.2, 520);
      const l = Math.hypot(cam.position.x, cam.position.z);
      if (l > R) { cam.position.x *= R / l; cam.position.z *= R / l; }
      focusY = cam.position.y;
    } else if (this.camMode === 'walk') {
      if (mv || st) this.tween = null;
      const sp = shift ? 8.5 : 4.4;
      const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
      // vorwärts = (−sin yaw, −cos yaw), rechts = (cos yaw, −sin yaw)
      let dx = fx * mv + Math.cos(this.yaw) * st;
      let dz = fz * mv - Math.sin(this.yaw) * st;
      const l = Math.hypot(dx, dz);
      if (l > 0) {
        dx /= l; dz /= l;
        const nx = cam.position.x + dx * sp * dt, nz = cam.position.z + dz * sp * dt;
        const rr = this.collide(nx, nz, 0.5);
        const rad = Math.hypot(rr.x, rr.z);
        if (rad > R) { rr.x *= R / rad; rr.z *= R / rad; }
        cam.position.x = rr.x;
        cam.position.z = rr.z;
        // leichtes Wippen beim Gehen
        this._bob = (this._bob ?? 0) + dt * sp * 1.6;
      }
      cam.position.y = this.eye + Math.sin(this._bob ?? 0) * (l > 0 ? 0.035 : 0);
      focusY = 1.7;
    } else if (this.camMode === 'play') {
      if (this.game) this.game.update(dt);
      focusY = 1.7;
    } else if (this.camMode === 'drive') {
      this._stepActor(dt, { sx: st, sy: mv, jump: keys.has('Space'), boost: shift }, true);
      this._tickDrive(dt);
      focusY = cam.position.y;
    } else if (this.camMode === 'tour') {
      this._tickTour(dt);
      focusY = cam.position.y;
    } else {
      // Übersicht: Zielpunkt in der Stadt halten, Kamera nie unter den Boden
      const t = this.controls.target;
      const l = Math.hypot(t.x, t.z);
      if (l > R) { t.x *= R / l; t.z *= R / l; }
      if (cam.position.y < 1.2) cam.position.y = 1.2;
      focusY = cam.position.distanceTo(t);
    }

    // Schattenreichweite und Bildtiefe folgen der Kamerahöhe
    const gv = this.camMode === 'play' && this.game ? this.game.view() : null; // Spiel: Schwerpunkt, Schattenreichweite und Nahebene kommen vom aktiven Controller
    const sr = this.camMode === 'orbit' ? clamp(focusY * 0.6 + 25, 40, 190) : this.camMode === 'walk' ? 80 : this.camMode === 'drive' || this.camMode === 'play' ? (gv ? gv.shadow : 90) : clamp(focusY * 1.6 + 40, 60, 190);
    a.setShadowRadius(sr);
    const near = this.camMode === 'walk' || this.camMode === 'play' ? 0.12 : this.camMode === 'orbit' ? clamp(focusY * 0.01, 0.2, 3) : clamp(cam.position.y * 0.02, 0.3, 3);
    if (gv ? gv.near != null && Math.abs(gv.near - cam.near) > cam.near * 0.2 : Math.abs(near - cam.near) > cam.near * 0.2) { cam.near = gv ? gv.near : near; cam.updateProjectionMatrix(); }

    // Fokuspunkt (Schatten, Staub, Lichter, Feuer)
    let focus;
    if (this.camMode === 'orbit') focus = this.controls.target;
    else if (this.camMode === 'drive') focus = _w.set(this.actor.x, 0, this.actor.z);
    else if (this.camMode === 'play' && this.game) focus = _w.set(gv.x, 0, gv.z);
    else {
      _v.set(0, 0, -1).applyQuaternion(cam.quaternion);
      _v.y = 0;
      _v.normalize().multiplyScalar(this.camMode === 'walk' ? 18 : Math.min(60, cam.position.y * 0.8));
      focus = _w.copy(cam.position).add(_v);
      focus.y = 0;
    }
    a.focus(focus);

    this.rend.update(cam, dt);
    if (this.actor && this.camMode !== 'drive') {
      // geparkt: nur weiterlaufen lassen, solange er in Sichtweite ist
      const dx = this.actor.x - focus.x, dz = this.actor.z - focus.z, cx = this.actor.x - cam.position.x, cz = this.actor.z - cam.position.z;
      if (dx * dx + dz * dz < 250 * 250 || cx * cx + cz * cz < 250 * 250) this._stepActor(dt, null, false);
    }

    this._lightT -= dt;
    if (this._lightT <= 0) { this._lightT = 0.2; this._updateLights(this.camMode === 'orbit' ? this.controls.target : focus); }
    this._updateFires(dt, focus);

    // Tagesverlauf
    if (this.opt.cycle) {
      this._cycleT += dt;
      if (this._cycleT > 0.12) {
        a.setHour(a.state.hour + this._cycleT * this.opt.cycleSpeed);
        this._cycleT = 0;
        this.emit('hour', a.state.hour);
      }
    }

    // Distrikt unter der Kamera
    this._distT -= dt;
    if (this._distT <= 0) {
      this._distT = 0.3;
      const px = this.camMode === 'orbit' ? this.controls.target.x : this.camMode === 'drive' ? this.actor.x : cam.position.x;
      const pz = this.camMode === 'orbit' ? this.controls.target.z : this.camMode === 'drive' ? this.actor.z : cam.position.z;
      const d = this.city.districtAt(px, pz) ?? 'out';
      if (d !== this.district) { this.district = d; this.emit('district', d); }
    }
    if (this.onFrame) this.onFrame(dt);
  }

  /* ───────────── Fahren ───────────── */
  _stepActor(dt, I, driving) {
    const a = this.actor, cam = this.camera;
    a.setPointScale(this.forge.renderer.domElement.height / (2 * Math.tan((cam.fov * Math.PI) / 360)));
    const shake = a.update(dt, driving ? I : NO_INPUT, this.atmosphere.nightK);
    if (shake > 0.02 && this.fx.onShake) this.fx.onShake(shake * 0.5);
  }

  // Verfolgerkamera: folgt der Fahrtrichtung, Maus ziehen schaut sich um (kehrt beim Fahren von selbst zurück)
  _tickDrive(dt) {
    const a = this.actor, cam = this.camera, dv = this.dv;
    const ch = a.chase();
    const f = a.focus;
    if (ch) dv.base = ch.yaw;
    dv.yaw += angDiff(dv.yaw, dv.base + dv.offYaw) * (1 - Math.exp(-(ch ? ch.k ?? 3.2 : 4) * dt));
    if (ch && !dv.drag) {
      dv.dragT += dt;
      if (dv.dragT > 1.4) { const k = Math.exp(-dt * 1.6); dv.offYaw *= k; dv.offPitch *= k; }
    }
    const pitch = clamp((ch ? ch.pitch : 0.22) + dv.offPitch, -0.12, 1.25);
    const dist = (ch ? ch.dist : 12) * dv.scale;
    const hd = Math.cos(pitch) * dist;
    let cx = f.x + Math.sin(dv.yaw) * hd, cz = f.z + Math.cos(dv.yaw) * hd;
    const r = this.collide(cx, cz, 0.8); // nie in Hauswänden
    cx = r.x; cz = r.z;
    const cy = Math.max(f.y + Math.sin(pitch) * dist, terrainHeight(cx, cz) + 1.1);
    const lead = clamp(a.speed * 0.12, 0, 3);
    _lk.set(f.x - Math.sin(a.ry) * lead, f.y + 0.4, f.z - Math.cos(a.ry) * lead);
    if (dv.blend < 1) {
      dv.blend = Math.min(1, dv.blend + dt / 0.9);
      const k = ease(dv.blend);
      cam.position.copy(dv.from.pos).lerp(_v.set(cx, cy, cz), k);
      cam.lookAt(_lk);
      _qq.copy(dv.from.q).slerp(cam.quaternion, k);
      cam.quaternion.copy(_qq);
    } else {
      cam.position.set(cx, cy, cz);
      cam.lookAt(_lk);
    }
    // Sichtfeld weitet sich bei Tempo und Boost
    dv.fov += ((ch ? ch.fov ?? 0 : 0) - dv.fov) * (1 - Math.exp(-3 * dt));
    const fov = this._fov0 + dv.fov;
    if (Math.abs(fov - cam.fov) > 0.05) { cam.fov = fov; cam.updateProjectionMatrix(); }
  }

  // nach dem Rendern aufrufen (renderer.info ist dann aktuell)
  afterRender(info) {
    this._info.calls = info.render.calls;
    this._info.tris = info.render.triangles;
  }
}

export { DISTRICTS, DISTRICT_IDS };
