// Spiel-Laufzeit des Studios: Spieler (Ego), Waffen, Einheiten mit KI, Geschosse, Pickups, Zonen, Zeitgeber, Ereignisse.
// Läuft im Stadt-Modus 'play'; die Stadt liefert Kollision (cm.collide) und Sichtlinien (cm.raycastWorld).
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { ModelCache } from './models.js';
import { WEAPONS, makeWeapon, ViewModel } from './weapons.js';
import { KINDS, TEAM_COLORS } from './units.js';
import { makeApi } from './api.js';

const R_MAX = 620, EYE = 1.65, GRAV = 16;
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
const _e = new THREE.Euler(0, 0, 0, 'YXZ');
const _col = { x: 0, z: 0, hit: false };
const _q = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0), _o = new THREE.Vector3(), _d = new THREE.Vector3(), _r = new THREE.Vector3(), _u = new THREE.Vector3();

const PICK = {
  health: { color: 0x58e08a, label: 'Medipack' },
  ammo: { color: 0xffc04a, label: 'Munition' },
  weapon: { color: 0xeaf4ff, label: 'Waffe' },
  upgrade: { color: 0xc07aff, label: 'Verbesserung' },
};
const UPGRADES = { damage: 'Schaden', firerate: 'Feuerrate', magazine: 'Magazin', reload: 'Nachladen', speed: 'Tempo', spread: 'Treffsicherheit' };

class Unit {
  constructor(game, id, kind, spec) {
    this.game = game; this.id = id; this.kind = kind;
    Object.assign(this, spec);
    this.data = {}; // freier Platz für Skripte
    this.dead = false; this.removed = false; this.deadT = 0;
    this.vx = 0; this.vz = 0; this.yaw = Math.random() * 6.28; this.y = 0;
    this.t = Math.random() * 5; this.alert = 0; this.atkCd = rnd(0.3, 1); this.windup = 0; this.atkVis = 0; this.stagger = 0;
    this.target = null; this.retarget = rnd(0, 0.4); this.threat = null;
    this.avoidT = 0; this.avoidAng = 0; this.strafe = Math.random() < 0.5 ? 1 : -1; this.strafeT = rnd(1, 3);
    this.stuckT = 0; this.sx = 0; this.sz = 0; this.wanderTo = null; this.wait = rnd(0, 2);
    this.order = null; this.leader = null; this.shadow = true; this.speedNow = 0;
  }
  get alive() { return !this.dead && !this.removed; }
  damage(n, by = null) { this.game.damageUnit(this, n, by); }
  kill() { this.game.damageUnit(this, 1e9, null); }
  remove() { this.game.removeUnit(this); }
  goTo(x, z) { this.order = { x, z }; return this; }
  follow(who = 'player') { this.ai = 'follow'; this.leader = who; return this; }
}

export class Game {
  constructor(ctx) {
    Object.assign(this, ctx); // forge, cm, scene, camera, renderer, fx, hud
    this.models = new ModelCache((root) => { const r = this.renderer.compileAsync?.(root, this.camera, this.scene); if (r && r.catch) r.catch(() => {}); });
    this.vm = new ViewModel();
    this.state = 'idle'; // idle | playing | paused | ended
    this.fov0 = 48;
    this.onError = (e) => console.error(e);
    this.onEnd = null;
    this.api = null;
    this.keysEdge = (e) => this._key(e);
    this._hook = {};
    this.tracerGeo = new THREE.BoxGeometry(1, 1, 1);
    this.tracerMats = { p: new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }), e: new THREE.MeshBasicMaterial({ color: 0xff7a50, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }) };
    this.markGeo = new THREE.OctahedronGeometry(0.12);
    this.barGeo = new THREE.PlaneGeometry(1, 1);
    this.barMats = { bg: new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false }), fg: new THREE.MeshBasicMaterial({ color: 0xff5a3a, depthWrite: false }) };
    this.markMats = new Map();
    this.pickGeo = new THREE.BoxGeometry(0.45, 0.45, 0.45);
    this.beamGeo = new THREE.CylinderGeometry(0.1, 0.1, 5, 8, 1, true);
    this.ringGeo = new THREE.RingGeometry(0.93, 1, 64);
    this.rocketGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.6, 8);
    this.rocketMat = new THREE.MeshBasicMaterial({ color: 0xffd08a });
  }

  // Modelle der Standard-Typen schon vor dem Spielstart bauen und übersetzen, einzeln über die Zeit verteilt
  prewarm() {
    if (this._pw) return;
    this._pw = true;
    const jobs = Object.values(KINDS).map((k) => () => {
      const params = { ...k.params };
      for (const [key, list] of Object.entries(k.vary ?? {})) params[key] = list[0];
      this.models.template(k.model, params);
    });
    const next = () => { const j = jobs.shift(); if (!j) return; try { j(); } catch (e) { console.warn('Vorwärmen:', e); } setTimeout(next, 350); };
    setTimeout(next, 600);
  }

  get running() { return this.state !== 'idle'; }
  get nightK() { return this.forge.atmosphere?.nightK ?? 0; }

  /* ───────────── Start / Stop ───────────── */
  start(code, opts = {}) {
    if (this.state !== 'idle') this.stop(true);
    const cm = this.cm, cam = this.camera;
    this.saved = { mode: cm.camMode, pos: cam.position.clone(), quat: cam.quaternion.clone(), target: cm.controls.target.clone(), fov: cam.fov, yaw: cm.yaw, pitch: cm.pitch };
    this.fov0 = cam.fov;
    this.savedHour = this.forge.atmosphere.state.hour;
    this.code = code;
    this.opts = opts;
    this._reset();
    cm.game = this;
    this.state = 'playing';
    cm.setMode('play');
    this._attach();
    this.hud.show();
    this._refreshHud();
    const ok = this._runScript();
    if (!ok) { this.stop(); return false; }
    this._lockPointer();
    this.emit('start');
    return true;
  }

  restart() {
    const code = this.code, opts = this.opts;
    this.hud.hideEnd();
    this._clearWorld();
    this._reset();
    this.state = 'playing';
    this._refreshHud();
    if (!this._runScript()) { this.stop(); return; }
    this._lockPointer();
    this.emit('start');
  }

  stop(silent = false) {
    if (this.state === 'idle') return;
    this._detach();
    this._clearWorld();
    this.state = 'idle';
    const cm = this.cm, cam = this.camera, s = this.saved;
    this.hud.hide();
    try { document.exitPointerLock?.(); } catch (e) { /* egal */ }
    cm.game = null;
    if (this.savedHour != null) { this.forge.atmosphere.setHour(this.savedHour); cm.emit('hour', this.savedHour); }
    cam.fov = s.fov; cam.updateProjectionMatrix();
    cam.position.copy(s.pos); cam.quaternion.copy(s.quat);
    cm.controls.target.copy(s.target);
    cm.yaw = s.yaw; cm.pitch = s.pitch;
    const mode = s.mode === 'play' ? 'orbit' : s.mode;
    cm.setMode(mode, { keep: true });
    cam.position.copy(s.pos); cam.quaternion.copy(s.quat);
    if (mode === 'orbit') cm.controls.update();
    if (!silent && this.onEnd) this.onEnd();
  }

  _reset() {
    this.t = 0; this.units = []; this.pickups = []; this.zones = []; this.timers = []; this.projs = []; this.tracers = [];
    this.handlers = {}; this.hostMap = new Map(); this.teamColors = { ...TEAM_COLORS };
    this.score = 0; this.kills = 0; this.nextId = 1; this.warned = new Set(); this.finished = null;
    this.weaponDefs = { ...WEAPONS };
    this.statTime = 0;
    this.recoil = { p: 0, y: 0 };
    this.noiseT = 0;
    const cm = this.cm, cam = this.camera;
    // Startpunkt: dort, wo die Übersichtskamera hinschaut
    let sx = cm.controls.target.x, sz = cm.controls.target.z;
    if (this.saved.mode !== 'orbit') { sx = this.saved.pos.x; sz = this.saved.pos.z; }
    const spot = this.openPoint(sx, sz, 0, 40) ?? { x: sx, z: sz };
    this.spawnPoint = { x: spot.x, z: spot.z, yaw: this.saved.yaw ?? 0 };
    this.player = {
      x: spot.x, y: 0, z: spot.z, yaw: this.saved.mode === 'orbit' ? Math.atan2(-(cm.controls.target.x - this.saved.pos.x), -(cm.controls.target.z - this.saved.pos.z)) : this.saved.yaw, pitch: 0,
      vx: 0, vz: 0, vy: 0, hp: 100, maxHp: 100, team: 'player', radius: 0.4, height: 1.8, alive: true, grounded: true,
      weapons: [], cur: 0, last: 0, mods: { damage: 1, firerate: 1, magazine: 1, reload: 1, speed: 1, spread: 1 },
      aim: 0, aimOn: false, fire: false, fireEdge: false, cd: 0, reloadT: -1, reloadDur: 1, swap: 0, swapTo: -1, bloom: 0, bob: 0, move: 0, hurtT: 0, deadT: 0,
      deaths: 0, shots: 0, hits: 0,
    };
    this.loadout(['pistol', 'rifle']);
    this.freeLook = false;
    this.locked = false;
    this.everLocked = false;
  }

  _clearWorld() {
    for (const u of this.units) this._disposeUnit(u);
    for (const p of this.pickups) this._disposePickup(p);
    for (const z of this.zones) this._disposeZone(z);
    for (const p of this.projs) this.scene.remove(p.mesh);
    for (const t of this.tracers) this.scene.remove(t.mesh);
    this.units = []; this.pickups = []; this.zones = []; this.projs = []; this.tracers = []; this.timers = [];
  }

  _runScript() {
    try {
      this.api = makeApi(this);
      const fn = new Function('game', this.code + '\n//# sourceURL=skript.js');
      fn.call(null, this.api);
      return true;
    } catch (e) {
      this.onError(e, 'Skript');
      return false;
    }
  }

  /* ───────────── Eingabe ───────────── */
  _attach() {
    const el = this.renderer.domElement;
    this._hook = {
      key: (e) => this._key(e),
      down: (e) => { if (this.state !== 'playing') return; if (e.button === 0) { this.player.fire = true; this.player.fireEdge = true; } else if (e.button === 2) this.player.aimOn = true; },
      up: (e) => { if (e.button === 0) this.player.fire = false; else if (e.button === 2) this.player.aimOn = false; },
      move: (e) => {
        if (this.state !== 'playing') return;
        if (!this.locked && !(this.freeLook && (e.buttons & 2))) return;
        const P = this.player, s = 0.0022 * (this.camera.fov / this.fov0);
        P.yaw -= e.movementX * s; P.pitch = clamp(P.pitch - e.movementY * s, -1.5, 1.5);
      },
      wheel: (e) => { if (this.state === 'playing') { e.preventDefault(); this._cycle(e.deltaY > 0 ? 1 : -1); } },
      ctx: (e) => e.preventDefault(),
      lock: () => {
        const on = document.pointerLockElement === el;
        this.locked = on;
        if (on) this.everLocked = true;
        if (on) { if (this.state === 'paused') this._resume(); }
        else if (this.state === 'playing' && !this.freeLook) this._pause();
      },
      lockErr: () => { this._lockFailed(); },
      blur: () => { this.player.fire = false; this.player.aimOn = false; },
    };
    const h = this._hook;
    window.addEventListener('keydown', h.key, true);
    window.addEventListener('mousedown', h.down, true);
    window.addEventListener('mouseup', h.up, true);
    window.addEventListener('mousemove', h.move, true);
    window.addEventListener('wheel', h.wheel, { passive: false, capture: true });
    window.addEventListener('contextmenu', h.ctx, true);
    window.addEventListener('blur', h.blur);
    document.addEventListener('pointerlockchange', h.lock);
    document.addEventListener('pointerlockerror', h.lockErr);
  }

  _detach() {
    const h = this._hook;
    if (!h.key) return;
    window.removeEventListener('keydown', h.key, true);
    window.removeEventListener('mousedown', h.down, true);
    window.removeEventListener('mouseup', h.up, true);
    window.removeEventListener('mousemove', h.move, true);
    window.removeEventListener('wheel', h.wheel, { capture: true });
    window.removeEventListener('contextmenu', h.ctx, true);
    window.removeEventListener('blur', h.blur);
    document.removeEventListener('pointerlockchange', h.lock);
    document.removeEventListener('pointerlockerror', h.lockErr);
    this._hook = {};
  }

  _lockPointer() {
    const el = this.renderer.domElement;
    try {
      const r = el.requestPointerLock?.();
      if (r && r.catch) r.catch(() => this._lockFailed());
      else if (!el.requestPointerLock) this._lockFailed();
    } catch (e) { this._lockFailed(); }
  }

  _lockFailed() {
    if (this.locked || this.freeLook || this.everLocked || this.state === 'idle') return;
    this.freeLook = true;
    if (this.state === 'paused') this._resume();
    this.hud.message('Maus lässt sich hier nicht fangen – zum Umsehen die rechte Maustaste halten und ziehen', 6);
  }

  _pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.player.fire = false; this.player.aimOn = false;
    this.hud.pause(true, { resume: () => this._lockPointer(), quit: () => this.stop() });
  }

  _resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.hud.pause(false);
  }

  _key(e) {
    if (this.state === 'idle') return;
    const P = this.player;
    if (this.state === 'paused' && this.freeLook && e.code === 'Escape') { this.stop(); return; }
    if (this.state !== 'playing') return;
    if (e.repeat) return;
    if (/^Digit[1-9]$/.test(e.code)) this._select(+e.code.slice(5) - 1);
    else if (e.code === 'KeyR') this._reload();
    else if (e.code === 'KeyQ') this._select(P.last);
    else if (e.code === 'KeyE') this.emit('use', { x: P.x, z: P.z });
    else if (e.code === 'Escape' && this.freeLook) this._pause();
  }

  /* ───────────── Spieler: Waffen ───────────── */
  _spec(w) { return w.spec; }
  _cap(w) { return Math.max(1, Math.round(w.spec.mag * this.player.mods.magazine)); }
  _maxRes(w) { return Math.round(w.spec.reserve * this.player.mods.magazine); }

  giveWeapon(id, { ammo = null } = {}) {
    const P = this.player;
    const base = this.weaponDefs[id];
    if (!base) { this.warn('Unbekannte Waffe „' + id + '“. Es gibt: ' + Object.keys(this.weaponDefs).join(', ')); return null; }
    let w = P.weapons.find((x) => x.id === id);
    if (w) { w.reserve = Math.min(this._maxRes(w), w.reserve + Math.ceil(this._maxRes(w) * 0.5)); }
    else {
      w = { id, spec: base, ammo: 0, reserve: 0 };
      w.ammo = this._cap(w); w.reserve = Math.round(this._maxRes(w) * 0.5);
      P.weapons.push(w);
    }
    if (ammo != null) w.reserve = clamp(ammo, 0, this._maxRes(w));
    this._refreshHud();
    return w;
  }

  loadout(ids) {
    const P = this.player;
    P.weapons = [];
    for (const id of ids) this.giveWeapon(id);
    for (const w of P.weapons) w.reserve = this._maxRes(w);
    P.cur = 0; P.last = 0; P.reloadT = -1; P.swap = 0; P.swapTo = -1;
    this._equip();
    this._refreshHud();
  }

  giveAmmo(frac = 0.4) {
    for (const w of this.player.weapons) w.reserve = Math.min(this._maxRes(w), w.reserve + Math.ceil(this._maxRes(w) * frac));
    this._refreshHud();
  }

  upgrade(stat, factor = 1.25) {
    const P = this.player;
    if (stat === 'health') { P.maxHp = Math.round(P.maxHp * factor); P.hp = Math.min(P.maxHp, P.hp + Math.round((factor - 1) * 100)); }
    else if (stat in P.mods) P.mods[stat] *= factor;
    else { this.warn('Unbekannte Verbesserung „' + stat + '“. Es gibt: health, ' + Object.keys(P.mods).join(', ')); return; }
    this._refreshHud();
  }

  _equip() { const w = this.player.weapons[this.player.cur]; if (w) this.vm.setModel(w.spec.model); }

  _select(i) {
    const P = this.player;
    if (i < 0 || i >= P.weapons.length || i === P.cur || P.swapTo >= 0 || !P.alive) return;
    P.swapTo = i; P.reloadT = -1;
  }

  _cycle(dir) {
    const P = this.player, n = P.weapons.length;
    if (n > 1) this._select((P.cur + dir + n) % n);
  }

  _reload() {
    const P = this.player, w = P.weapons[P.cur];
    if (!w || P.reloadT >= 0 || P.swapTo >= 0 || w.ammo >= this._cap(w) || w.reserve <= 0) return;
    P.reloadDur = w.spec.reload / P.mods.reload;
    P.reloadT = 0;
    audio.play('reload');
  }

  _firePlayer() {
    const P = this.player, w = P.weapons[P.cur], s = w.spec;
    if (w.ammo <= 0) { audio.play('empty'); P.cd = 0.25; if (w.reserve > 0) this._reload(); return; }
    w.ammo--;
    P.cd = s.rate / P.mods.firerate;
    P.shots++;
    audio.play(s.snd);
    this.vm.fire(s.kick);
    this.recoil.p += s.kick * 0.012 * (1 - P.aim * 0.4); this.recoil.y += rnd(-1, 1) * s.kick * 0.004;
    if (this.fx.onShake) this.fx.onShake(0.03 * s.kick);
    this._noise(P.x, P.z, s.kind === 'proj' ? 60 : 42);
    _e.set(P.pitch, P.yaw, 0);
    _q.setFromEuler(_e);
    _d.set(0, 0, -1).applyQuaternion(_q);
    _o.set(P.x, P.y + EYE, P.z);
    const spreadK = (s.spread + P.bloom) * P.mods.spread * (1 - P.aim * 0.5) * (P.grounded ? 1 : 1.6) * (1 + P.move * 0.5);
    P.bloom = Math.min(s.bloom * 18, P.bloom + s.bloom);
    const muz = _u.set(0.2 * (1 - P.aim), -0.17, -0.55).applyQuaternion(_q).add(_o).clone();
    if (s.kind === 'proj') { this._rocket(muz, _d, s, 'player'); }
    else {
      let hit = false, kill = false, head = false;
      for (let i = 0; i < s.pellets; i++) {
        this._dirSpread(_d, spreadK, _r);
        const res = this.trace(_o, _r, s.range, null);
        if (res.unit) {
          const fall = s.pellets > 1 ? 1 - 0.55 * clamp(res.t / s.range, 0, 1) : 1;
          const dmg = s.dmg * P.mods.damage * fall * (res.head ? 2 : 1);
          if (!res.unit.dead) {
            const wasAlive = !res.unit.dead;
            this.damageUnit(res.unit, dmg, 'player', res.head);
            hit = true; head = head || res.head; if (wasAlive && res.unit.dead) kill = true;
          }
          this.fx.sparks(res.point, 3, 0.35);
        } else if (res.type !== 'none') {
          this.fx.sparks(res.point, 3, 0.4);
          if (res.type === 'ground') this.fx.dust(res.point, 2, 0.5, 0.8);
        }
        if (res.t > 6 && i < 3) this.tracer(muz, res.point, 'p');
      }
      if (hit) { P.hits++; this.hud.hitmarker(kill, head); audio.play(head ? 'headshot' : 'hit'); }
    }
    this._refreshHud();
    if (w.ammo <= 0 && w.reserve > 0) this._reload();
  }

  _dirSpread(d, k, out) {
    if (k <= 0) return out.copy(d);
    _u.set(d.z, 0, -d.x).normalize(); // rechts
    const up = new THREE.Vector3().crossVectors(_u, d).normalize();
    const a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * k;
    return out.copy(d).addScaledVector(_u, Math.cos(a) * r).addScaledVector(up, Math.sin(a) * r).normalize();
  }

  /* ───────────── Strahlen & Treffer ───────────── */
  // Strahl gegen Gebäude, Boden und Einheiten. ignore = Einheit, die nicht getroffen werden kann.
  trace(o, d, maxT, ignore, units = true) {
    let t = this.cm.raycastWorld(o.x, o.y, o.z, d.x, d.y, d.z, maxT), type = t < Infinity ? 'world' : 'none', unit = null, head = false;
    if (!(t < Infinity)) t = maxT;
    if (d.y < -1e-6) { const tg = -o.y / d.y; if (tg > 0 && tg < t) { t = tg; type = 'ground'; } }
    if (units) {
      for (const u of this.units) {
        if (u.dead || u === ignore || !u.group.visible) continue;
        const r = u.hitR, ux = u.x, uz = u.z;
        const a = d.x * d.x + d.z * d.z; if (a < 1e-9) continue;
        const bx = o.x - ux, bz = o.z - uz;
        const b = bx * d.x + bz * d.z, c = bx * bx + bz * bz - r * r;
        const disc = b * b - a * c; if (disc < 0) continue;
        let q = (-b - Math.sqrt(disc)) / a; if (q < 0) q = c < 0 ? 0.001 : -1;
        if (q < 0 || q >= t) continue;
        const y = o.y + d.y * q;
        if (y < u.y - 0.05 || y > u.y + u.height + 0.1) continue;
        t = q; type = 'unit'; unit = u; head = y > u.y + u.height * 0.78;
      }
    }
    return { t, type, unit, head, point: new THREE.Vector3(o.x + d.x * t, o.y + d.y * t, o.z + d.z * t) };
  }

  los(ax, ay, az, bx, by, bz) {
    const dx = bx - ax, dy = by - ay, dz = bz - az, L = Math.hypot(dx, dy, dz);
    if (L < 0.5) return true;
    return !(this.cm.raycastWorld(ax, ay, az, dx / L, dy / L, dz / L, L - 0.3) < Infinity);
  }

  tracer(a, b, kind = 'p') {
    const len = a.distanceTo(b);
    let t = this.tracers.find((x) => !x.live && x.kind === kind);
    if (!t) {
      const mesh = new THREE.Mesh(this.tracerGeo, this.tracerMats[kind]);
      mesh.frustumCulled = false;
      this.scene.add(mesh);
      t = { mesh, live: false, age: 0, kind };
      if (this.tracers.length < 60) this.tracers.push(t); else return;
    }
    t.mesh.position.copy(a).lerp(b, 0.5);
    t.mesh.lookAt(b);
    t.mesh.scale.set(kind === 'p' ? 0.025 : 0.04, kind === 'p' ? 0.025 : 0.04, len);
    t.mesh.visible = true; t.live = true; t.age = 0;
  }

  _rocket(origin, dir, s, owner) {
    const mesh = new THREE.Mesh(this.rocketGeo, this.rocketMat);
    mesh.rotation.order = 'YXZ';
    this.scene.add(mesh);
    const v = dir.clone().normalize();
    this.projs.push({ mesh, pos: origin.clone(), v: v.multiplyScalar(s.speed), s, owner, age: 0 });
  }

  _stepProj(p, dt) {
    p.age += dt;
    const step = p.v.length() * dt, dir = _d.copy(p.v).normalize();
    let hit = false, t = step;
    const tw = this.cm.raycastWorld(p.pos.x, p.pos.y, p.pos.z, dir.x, dir.y, dir.z, step);
    if (tw < Infinity) { t = tw; hit = true; }
    if (dir.y < -1e-6) { const tg = -p.pos.y / dir.y; if (tg >= 0 && tg < t) { t = tg; hit = true; } }
    const nx = p.pos.x + dir.x * t, ny = p.pos.y + dir.y * t, nz = p.pos.z + dir.z * t;
    if (!hit) {
      for (const u of this.units) {
        if (u.dead || u.team === p.owner) continue;
        if (Math.hypot(nx - u.x, nz - u.z) < u.hitR + 0.25 && ny > u.y && ny < u.y + u.height + 0.2) { hit = true; break; }
      }
    }
    p.pos.set(nx, ny, nz);
    p.mesh.position.copy(p.pos);
    p.mesh.quaternion.setFromUnitVectors(_up, dir);
    this.fx.flame(p.pos, 0.9);
    if (Math.random() < 0.5) this.fx.dust(p.pos, 1, 0.5, 0.3);
    if (hit || p.age > 5) { this._explode(p.pos, p.s, p.owner); this.scene.remove(p.mesh); return false; }
    return true;
  }

  _explode(pos, s, owner) {
    const R = s.radius ?? 6, P = this.player;
    this.fx.explosion(new THREE.Vector3(pos.x, Math.max(0.4, pos.y), pos.z), 0.55);
    for (const u of this.units) {
      if (u.dead) continue;
      const dx = u.x - pos.x, dz = u.z - pos.z, dy = (u.y + u.height * 0.5) - pos.y;
      const d = Math.hypot(dx, dy, dz) - u.hitR;
      if (d > R || (owner === 'player' && u.team === 'player')) continue;
      const f = 1 - clamp(d / R, 0, 1);
      if (owner === 'player' || u.team !== owner) {
        const was = !u.dead;
        this.damageUnit(u, s.dmg * (owner === 'player' ? P.mods.damage : 1) * (0.25 + 0.75 * f), owner === 'player' ? 'player' : null, false);
        if (owner === 'player' && was) { this.hud.hitmarker(u.dead, false); }
      }
    }
    const dp = Math.hypot(P.x - pos.x, P.y + 0.9 - pos.y, P.z - pos.z);
    if (P.alive && dp < R) this.hurtPlayer(s.dmg * 0.4 * (1 - dp / R), pos.x, pos.z);
    if (dp < R * 2 && this.fx.onShake) this.fx.onShake(0.6 * (1 - dp / (R * 2)));
    this._noise(pos.x, pos.z, 70);
  }

  _noise(x, z, r) {
    for (const u of this.units) {
      if (u.dead || !u.flee) continue;
      const d = Math.hypot(u.x - x, u.z - z);
      if (d < r) { u.alert = Math.max(u.alert, 4); u.threat = { x, z }; }
    }
  }

  /* ───────────── Schaden ───────────── */
  hostile(a, b) {
    if (a === b) return false;
    const k = a + '|' + b;
    if (this.hostMap.has(k)) return this.hostMap.get(k);
    if (a === 'npc' || b === 'npc') return false;
    return true;
  }
  setHostile(a, b, v = true) { this.hostMap.set(a + '|' + b, v); this.hostMap.set(b + '|' + a, v); }

  damageUnit(u, dmg, by, head = false) {
    if (u.dead || u.removed || dmg <= 0) return;
    u.hp -= dmg;
    u.alert = 5;
    if (by && by !== 'player') u.threat = { x: by.x, z: by.z }; else if (by === 'player') u.threat = { x: this.player.x, z: this.player.z };
    if (dmg > u.maxHp * 0.2) u.stagger = 0.22;
    if (by === 'player' && !u.target && u.atk && this.hostile(u.team, 'player')) u.target = this.player;
    if (u.hp <= 0) this._killUnit(u, by, head);
    else this._updateBar(u);
  }

  _killUnit(u, by, head) {
    u.dead = true; u.hp = 0; u.deadT = 0; u.target = null;
    if (u.marker) u.marker.visible = false;
    if (u.bar) u.bar.visible = false;
    if (by === 'player') { this.kills++; this.score += u.score; this._refreshHud(); }
    this.emit('kill', { unit: u, killer: by === 'player' ? 'player' : by, headshot: !!head });
  }

  hurtPlayer(dmg, fx, fz) {
    const P = this.player;
    if (!P.alive || this.state !== 'playing' || this.finished) return;
    P.hp -= dmg;
    P.hurtT = 0.4;
    this.hud.damage(clamp(dmg / 25, 0.25, 1));
    if (this._hurtSnd == null || this.t - this._hurtSnd > 0.25) { audio.play('hurt'); this._hurtSnd = this.t; }
    if (this.fx.onShake) this.fx.onShake(0.1 + dmg * 0.01);
    this.hud.setHp(Math.max(0, P.hp), P.maxHp);
    if (P.hp <= 0) this._playerDie();
  }

  healPlayer(n) {
    const P = this.player;
    P.hp = Math.min(P.maxHp, P.hp + n);
    this.hud.setHp(P.hp, P.maxHp);
  }

  _playerDie() {
    const P = this.player;
    P.hp = 0; P.alive = false; P.deadT = 0; P.deaths++;
    P.fire = false; P.aimOn = false;
    this.emit('playerDeath');
    if (!P.alive && !this.handlers.playerDeath?.length && !this.finished) this.after(1.6, () => this.lose('Gefallen'));
  }

  respawnPlayer(at = null) {
    const P = this.player;
    const sp = at ?? this.spawnPoint;
    P.x = sp.x; P.z = sp.z; P.y = 0; P.hp = P.maxHp; P.alive = true; P.vx = P.vz = P.vy = 0; P.deadT = 0;
    if (sp.yaw != null) P.yaw = sp.yaw;
    for (const w of P.weapons) { w.ammo = this._cap(w); }
    this.hud.setHp(P.hp, P.maxHp);
    this._refreshHud();
  }

  /* ───────────── Einheiten ───────────── */
  openPoint(cx, cz, minR = 0, maxR = 40, tries = 40) {
    const cm = this.cm;
    for (let i = 0; i < tries; i++) {
      const a = Math.random() * 6.283, r = minR + Math.sqrt(Math.random()) * (maxR - minR);
      const x = cx + Math.sin(a) * r, z = cz + Math.cos(a) * r;
      if (Math.hypot(x, z) > R_MAX - 10) continue;
      if (!cm.obstacleAt(x, z, 0.7) && !cm.obstacleAt(x + 0.8, z, 0.3) && !cm.obstacleAt(x - 0.8, z, 0.3) && !cm.obstacleAt(x, z + 0.8, 0.3) && !cm.obstacleAt(x, z - 0.8, 0.3)) return { x, z };
    }
    return null;
  }

  spawn(kind, o = {}) {
    const base = KINDS[kind];
    if (!base) { this.warn('Unbekannter Einheitentyp „' + kind + '“. Es gibt: ' + Object.keys(KINDS).join(', ')); return null; }
    if (this.units.filter((u) => !u.dead).length >= (this.opts.maxUnits ?? 70)) { this.warn('Zu viele Einheiten gleichzeitig (Grenze 70) – spawn übersprungen'); return null; }
    const P = this.player;
    let x = o.x, z = o.z;
    if (x == null || z == null) {
      const c = o.near ?? P, minR = o.minR ?? (base.team === 'npc' ? 12 : 22), maxR = o.maxR ?? Math.max(minR + 25, 55);
      const pt = this.openPoint(c.x, c.z, minR, maxR);
      if (!pt) return null;
      x = pt.x; z = pt.z;
    }
    const params = { ...base.params };
    for (const [k, list] of Object.entries(base.vary ?? {})) if (!(o.params && k in o.params)) params[k] = list[Math.floor(Math.random() * list.length)];
    Object.assign(params, o.params ?? {});
    const scale = o.scale ?? (base.scale ?? 1) * (1 + (Math.random() * 2 - 1) * (base.jitter ?? 0));
    const mdl = this.models.spawn(base.model, params, scale);
    const atk = o.atk === null ? null : base.atk ? { ...base.atk, ...(o.atk ?? {}) } : o.atk ?? null;
    if (atk && o.dmg != null) atk.dmg = o.dmg;
    const spec = {
      team: o.team ?? base.team, hp: o.hp ?? base.hp, maxHp: o.hp ?? base.hp, speed: o.speed ?? base.speed, run: o.run ?? (o.speed ? o.speed * 1.5 : base.run),
      ai: o.ai ?? base.ai, sight: o.sight ?? base.sight ?? 60, hunt: o.hunt ?? base.hunt ?? false, flee: o.flee ?? base.flee ?? false,
      atk, score: o.score ?? base.score ?? 0, style: base.style ?? 'tip', name: o.name ?? base.label,
      radius: base.hitR ? base.hitR * scale : mdl.radius, hitR: base.hitR ? base.hitR * scale : mdl.radius * 1.2, height: (base.height ?? mdl.height / scale) * scale,
      wanderR: o.wanderR ?? 28, color: o.color ?? base.color,
    };
    spec.radius = Math.min(spec.radius, 0.9 * scale);
    const u = new Unit(this, this.nextId++, kind, spec);
    u.mdl = mdl; u.x = x; u.z = z; u.home = { x, z }; u.scale = scale;
    u.group = new THREE.Group();
    u.root = mdl.root;
    u.root.rotation.order = 'YXZ';
    u.group.add(u.root);
    u.meshes = [];
    u.root.traverse((m) => { if (m.isMesh) u.meshes.push(m); });
    // Mannschafts-Marke und Lebensbalken
    const col = this.teamColors[u.team] ?? 0xffffff;
    if (u.team !== 'npc') {
      let mat = this.markMats.get(col);
      if (!mat) this.markMats.set(col, (mat = new THREE.MeshBasicMaterial({ color: col })));
      u.marker = new THREE.Mesh(this.markGeo, mat);
      u.marker.position.y = u.height + 0.38;
      u.marker.scale.setScalar(Math.max(1, Math.sqrt(scale)));
      u.group.add(u.marker);
    }
    u.bar = new THREE.Group();
    const bw = Math.max(0.7, 0.45 * scale);
    const bg = new THREE.Mesh(this.barGeo, this.barMats.bg), fg = new THREE.Mesh(this.barGeo, this.barMats.fg);
    bg.scale.set(bw, 0.07, 1); fg.scale.set(bw, 0.07, 1); fg.position.z = 0.002;
    u.bar.add(bg, fg); u.barFg = fg; u.barW = bw;
    u.bar.position.y = u.height + 0.22; u.bar.visible = false;
    u.group.add(u.bar);
    u.group.position.set(x, 0, z);
    this.scene.add(u.group);
    this.units.push(u);
    if (o.leader) u.leader = o.leader;
    this.emit('spawn', { unit: u });
    return u;
  }

  spawnWave(kind, n, o = {}) {
    const out = [];
    for (let i = 0; i < n; i++) { const u = this.spawn(kind, { minR: 30, maxR: 70, ...o }); if (u) out.push(u); }
    return out;
  }

  removeUnit(u) {
    if (u.removed) return;
    u.removed = true;
    this._disposeUnit(u);
    this.units = this.units.filter((x) => x !== u);
  }
  _disposeUnit(u) { this.scene.remove(u.group); }

  _updateBar(u) {
    const f = clamp(u.hp / u.maxHp, 0, 1);
    u.barFg.scale.x = Math.max(0.001, u.barW * f);
    u.barFg.position.x = -(u.barW * (1 - f)) / 2;
    u.bar.visible = f < 1 && !u.dead;
  }

  /* ───────────── Einheiten: KI ───────────── */
  _pickTarget(u) {
    if (!u.atk) { u.target = null; return; }
    const P = this.player, cands = [];
    const sight = u.hunt ? 1e9 : u.sight;
    const lim = u.leader && u.ai === 'follow' ? 45 : 1e9;
    if (P.alive && this.hostile(u.team, 'player')) cands.push({ t: P, d: Math.hypot(P.x - u.x, P.z - u.z) });
    for (const o of this.units) {
      if (o === u || o.dead || !this.hostile(u.team, o.team)) continue;
      cands.push({ t: o, d: Math.hypot(o.x - u.x, o.z - u.z) });
    }
    cands.sort((a, b) => a.d - b.d);
    let best = null;
    for (let i = 0; i < Math.min(3, cands.length); i++) {
      const c = cands[i];
      if (c.d > sight || c.d > lim) break;
      if (u.hunt || c.d < 14 || u.alert > 0 || this._seen(u, c.t)) { best = c.t; break; }
    }
    if (!best && u.target && !u.target.dead && (u.target.alive ?? true) && Math.hypot(u.target.x - u.x, u.target.z - u.z) < sight * 1.3) best = u.target;
    u.target = best;
  }

  _seen(u, t) {
    const ty = (t.y ?? 0) + (t.height ?? 1.8) * 0.6;
    return this.los(u.x, u.y + u.height * 0.8, u.z, t.x, ty, t.z);
  }

  _clearAngle(u, dx, dz, L) {
    const cm = this.cm, cand = [0, 0.55, -0.55, 1.1, -1.1, 1.8, -1.8];
    if (u.avoidAng < 0) for (let i = 1; i < cand.length; i += 2) { const t = cand[i]; cand[i] = cand[i + 1]; cand[i + 1] = t; }
    for (const a of cand) {
      const c = Math.cos(a), s = Math.sin(a), rx = dx * c - dz * s, rz = dx * s + dz * c;
      if (cm.raycastWorld(u.x, 0.9, u.z, rx, 0, rz, L) === Infinity && !cm.obstacleAt(u.x + rx * L * 0.6, u.z + rz * L * 0.6, u.radius * 0.6)) return a;
    }
    return 2.4;
  }

  _move(u, tx, tz, spd, dt) {
    let dx = tx - u.x, dz = tz - u.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.05) { u.dvx = u.dvz = 0; return; }
    dx /= d; dz /= d;
    u.avoidT -= dt;
    if (u.avoidT <= 0) { u.avoidT = 0.2 + Math.random() * 0.1; u.avoidAng = this._clearAngle(u, dx, dz, Math.max(2.4, spd * 0.7) + u.radius); }
    if (u.avoidAng) { const c = Math.cos(u.avoidAng), s = Math.sin(u.avoidAng), nx = dx * c - dz * s, nz = dx * s + dz * c; dx = nx; dz = nz; }
    const sp = Math.min(spd, d * 5);
    u.dvx = dx * sp; u.dvz = dz * sp;
  }

  _unit(u, dt, P) {
    if (u.dead) {
      u.deadT += dt;
      const k = Math.min(1, u.deadT / 0.55), e = 1 - (1 - k) * (1 - k);
      if (u.style === 'flip') { u.root.rotation.z = e * Math.PI; u.root.position.y = e * 0.6 * u.scale; u.root.rotation.x = 0; }
      else { u.root.rotation.x = -e * Math.PI / 2; u.root.position.y = e * 0.05; }
      u.root.rotation.y = u.yaw;
      if (u.deadT > 7) { const f = clamp((8 - u.deadT), 0, 1); u.group.scale.setScalar(Math.max(0.01, f)); if (u.deadT > 8) this.removeUnit(u); }
      return;
    }
    u.t += dt; u.alert = Math.max(0, u.alert - dt); u.atkCd -= dt; u.stagger = Math.max(0, u.stagger - dt);
    u.retarget -= dt;
    if (u.retarget <= 0) { u.retarget = 0.3 + Math.random() * 0.25; this._pickTarget(u); }
    let T = u.target;
    if (T && (T.dead || T.removed || (T === P && !P.alive))) T = u.target = null;

    u.dvx = 0; u.dvz = 0;
    let speed = u.speed, faceX = null, faceZ = null;
    const dP = Math.hypot(P.x - u.x, P.z - u.z);

    if (u.stagger > 0) { /* taumelt */ }
    else if (u.flee && u.alert > 0 && u.threat) {
      const dx = u.x - u.threat.x, dz = u.z - u.threat.z, d = Math.hypot(dx, dz) || 1;
      this._move(u, u.x + (dx / d) * 10, u.z + (dz / d) * 10, u.run, dt);
    } else if (u.order) {
      this._move(u, u.order.x, u.order.z, u.run * 0.8, dt);
      if (Math.hypot(u.order.x - u.x, u.order.z - u.z) < 1.5) { u.order = null; u.home = { x: u.x, z: u.z }; }
    } else if (T && u.atk) {
      const dx = T.x - u.x, dz = T.z - u.z, d = Math.hypot(dx, dz) || 1;
      const a = u.atk;
      faceX = dx; faceZ = dz;
      const ty = (T.y ?? 0) + (T.height ?? 1.8) * 0.6;
      u.losT = (u.losT ?? 0) - dt;
      if (u.losT <= 0) { u.losT = 0.15; u.los = this.los(u.x, u.y + u.height * 0.8, u.z, T.x, ty, T.z); }
      if (a.type === 'ranged') {
        const pref = a.range * 0.55;
        if (!u.los || d > pref * 1.15) this._move(u, T.x, T.z, u.run, dt);
        else {
          u.strafeT -= dt; if (u.strafeT <= 0) { u.strafeT = rnd(1.2, 3.2); u.strafe = -u.strafe; }
          if (d < pref * 0.6) this._move(u, u.x - (dx / d) * 4, u.z - (dz / d) * 4, speed * 0.8, dt);
          else this._move(u, u.x + (-dz / d) * u.strafe * 3, u.z + (dx / d) * u.strafe * 3, speed * 0.6, dt);
        }
        const aim = Math.abs(angDiff(u.yaw, Math.atan2(dx, dz)));
        if (u.los && d <= a.range && u.atkCd <= 0 && aim < 0.4) this._shootAt(u, T, d, a);
      } else {
        if (d > a.reach * 0.8) this._move(u, T.x, T.z, u.run, dt);
        if (u.windup > 0) { u.windup -= dt; u.dvx *= 0.2; u.dvz *= 0.2; if (u.windup <= 0) this._bite(u, T, a); }
        else if (u.atkCd <= 0 && d <= a.reach && u.stagger <= 0) { u.windup = 0.28; u.atkCd = a.rate * rnd(0.9, 1.15); }
      }
    } else if (u.ai === 'follow') {
      const L = u.leader === 'player' || !u.leader ? P : u.leader;
      const dx = L.x - u.x, dz = L.z - u.z, d = Math.hypot(dx, dz);
      if (d > 6.5) this._move(u, L.x - (dx / d) * 4, L.z - (dz / d) * 4, d > 14 ? u.run : u.speed, dt);
      else if (d < 3 && d > 0.1) this._move(u, u.x - (dx / d) * 2, u.z - (dz / d) * 2, u.speed * 0.5, dt);
    } else if (u.ai === 'wander' || (u.ai === 'chase' && !u.hunt)) {
      if (u.wanderTo) {
        const d = Math.hypot(u.wanderTo.x - u.x, u.wanderTo.z - u.z);
        if (d < 1.2 || u.stuckT > 1) { u.wanderTo = null; u.wait = rnd(1, 4); u.stuckT = 0; }
        else this._move(u, u.wanderTo.x, u.wanderTo.z, u.speed * 0.55, dt);
      } else {
        u.wait -= dt;
        if (u.wait <= 0 && u.ai === 'wander') { const p = this.openPoint(u.home.x, u.home.z, 5, u.wanderR, 10); if (p) u.wanderTo = p; else u.wait = 2; }
      }
    } else if (u.ai === 'guard') {
      const d = Math.hypot(u.home.x - u.x, u.home.z - u.z);
      if (d > 3) this._move(u, u.home.x, u.home.z, u.speed, dt);
    }

    // Bewegung mit Trägheit und Kollision
    const k = Math.min(1, 9 * dt);
    u.vx += (u.dvx - u.vx) * k; u.vz += (u.dvz - u.vz) * k;
    let nx = u.x + u.vx * dt, nz = u.z + u.vz * dt;
    const r = this.cm.collide(nx, nz, u.radius, _col);
    nx = r.x; nz = r.z;
    // Abstand zu anderen Einheiten und zum Spieler
    for (const o of this.units) {
      if (o === u || o.dead) continue;
      const ddx = nx - o.x, ddz = nz - o.z, rr = (u.radius + o.radius) * 0.9;
      if (ddx * ddx + ddz * ddz < rr * rr) { const d = Math.hypot(ddx, ddz) || 0.01, push = (rr - d) * 0.5; nx += (ddx / d) * push; nz += (ddz / d) * push; }
    }
    if (P.alive) {
      const ddx = nx - P.x, ddz = nz - P.z, rr = u.radius + P.radius;
      if (ddx * ddx + ddz * ddz < rr * rr) { const d = Math.hypot(ddx, ddz) || 0.01; nx = P.x + (ddx / d) * rr; nz = P.z + (ddz / d) * rr; }
    }
    const rad = Math.hypot(nx, nz); if (rad > R_MAX) { nx *= R_MAX / rad; nz *= R_MAX / rad; }
    // Festhängen erkennen
    u.stuckAcc = (u.stuckAcc ?? 0) + dt;
    if (u.stuckAcc > 0.6) {
      const moved = Math.hypot(nx - u.sx, nz - u.sz), want = Math.hypot(u.dvx, u.dvz) * u.stuckAcc;
      if (want > 0.6 && moved < want * 0.25) { u.stuckT += 0.6; u.avoidAng = (Math.random() < 0.5 ? 1 : -1) * 1.5; u.avoidT = 0.8; } else u.stuckT = Math.max(0, u.stuckT - 0.3);
      u.sx = nx; u.sz = nz; u.stuckAcc = 0;
    }
    u.speedNow = Math.hypot(nx - u.x, nz - u.z) / Math.max(dt, 1e-4);
    u.x = nx; u.z = nz;

    // Blickrichtung
    let want = u.yaw;
    if (faceX != null && (Math.abs(faceX) + Math.abs(faceZ)) > 0.01 && u.stagger <= 0) want = Math.atan2(faceX, faceZ);
    else if (u.speedNow > 0.4) want = Math.atan2(u.vx, u.vz);
    u.yaw += angDiff(u.yaw, want) * Math.min(1, (u.speedNow > 0.4 || faceX != null ? 9 : 2) * dt);
  }

  _shootAt(u, T, d, a) {
    u.atkCd = a.rate * rnd(0.85, 1.25);
    const ty = (T.y ?? 0) + (T.height ?? 1.8) * 0.62;
    const ox = u.x + Math.sin(u.yaw) * 0.5, oz = u.z + Math.cos(u.yaw) * 0.5, oy = u.y + u.height * 0.72;
    const moving = T === this.player ? this.player.move : Math.min(1, (T.speedNow ?? 0) / 4);
    const p = clamp((a.acc ?? 0.7) * (1.15 - 0.7 * d / a.range) * (1 - 0.3 * moving), 0.08, 0.92);
    const hit = Math.random() < p;
    const tx = T.x + (hit ? 0 : rnd(-1.6, 1.6)), tz = T.z + (hit ? 0 : rnd(-1.6, 1.6)), tyy = hit ? ty : ty + rnd(-0.8, 0.5);
    if (d > 3) this.tracer(_u.set(ox, oy, oz), _r.set(tx, tyy, tz), 'e');
    const vol = clamp(1 - d / 90, 0.06, 1);
    if (this.t - (this._eshot ?? -1) > 0.05) { audio.play('enemyshot', vol); this._eshot = this.t; }
    if (hit) { if (T === this.player) this.hurtPlayer(a.dmg, u.x, u.z); else this.damageUnit(T, a.dmg, u); }
    else if (T === this.player && this.fx.onShake) this.fx.onShake(0.02);
  }

  _bite(u, T, a) {
    if (T.dead || T.removed || (T === this.player && !T.alive)) return;
    const d = Math.hypot(T.x - u.x, T.z - u.z);
    if (d > a.reach * 1.3) return;
    if (T === this.player) this.hurtPlayer(a.dmg, u.x, u.z); else this.damageUnit(T, a.dmg, u);
  }

  /* ───────────── Pickups, Zonen, Zeitgeber ───────────── */
  addPickup(type, x, z, o = {}) {
    const def = PICK[type];
    if (!def) { this.warn('Unbekannter Pickup-Typ „' + type + '“. Es gibt: ' + Object.keys(PICK).join(', ')); return null; }
    const color = o.color ?? def.color;
    const mesh = new THREE.Mesh(this.pickGeo, new THREE.MeshBasicMaterial({ color }));
    const beam = new THREE.Mesh(this.beamGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    const g = new THREE.Group();
    mesh.position.y = 0.9; beam.position.y = 2.5;
    g.add(mesh, beam);
    g.position.set(x, 0, z);
    this.scene.add(g);
    const p = { type, x, z, g, mesh, beam, color, amount: o.amount ?? (type === 'health' ? 50 : 0.4), weapon: o.weapon, stat: o.stat, factor: o.factor ?? 1.25, respawn: o.respawn ?? 0, taken: false, back: 0, t: Math.random() * 6, label: o.label ?? def.label };
    this.pickups.push(p);
    return p;
  }

  _disposePickup(p) { this.scene.remove(p.g); p.mesh.material.dispose(); p.beam.material.dispose(); }

  _collect(p) {
    const P = this.player;
    if (p.type === 'health') { if (P.hp >= P.maxHp) return false; this.healPlayer(p.amount); this.hud.message('+' + p.amount + ' Leben', 1.4); }
    else if (p.type === 'ammo') { this.giveAmmo(p.amount); this.hud.message('Munition aufgefüllt', 1.4); }
    else if (p.type === 'weapon') { const w = this.giveWeapon(p.weapon ?? 'rifle'); if (!w) return false; this.hud.message(w.spec.name, 1.6); }
    else if (p.type === 'upgrade') { this.upgrade(p.stat ?? 'damage', p.factor); this.hud.message((UPGRADES[p.stat] ?? p.stat ?? 'Schaden') + ' verbessert', 2); }
    audio.play('pickup');
    this.emit('pickup', { type: p.type, x: p.x, z: p.z, weapon: p.weapon, stat: p.stat });
    return true;
  }

  addZone(o) {
    const r = o.r ?? 8, color = o.color ?? 0x62b9a8;
    const z = { x: o.x, z: o.z, r, name: o.name ?? '', color, onEnter: o.onEnter, onLeave: o.onLeave, who: o.who ?? 'player', inside: new Set(), visible: o.visible !== false, removed: false };
    if (z.visible) {
      const m = new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      m.rotation.x = -Math.PI / 2; m.position.set(o.x, 0.08, o.z); m.scale.setScalar(r);
      this.scene.add(m); z.mesh = m;
    }
    this.zones.push(z);
    return z;
  }
  _disposeZone(z) { z.removed = true; if (z.mesh) { this.scene.remove(z.mesh); z.mesh.material.dispose(); } }
  removeZone(z) { this._disposeZone(z); this.zones = this.zones.filter((q) => q !== z); }

  after(sec, fn) { const t = { at: this.t + sec, fn, every: 0, dead: false, cancel() { this.dead = true; } }; this.timers.push(t); return t; }
  every(sec, fn) { const t = { at: this.t + sec, fn, every: sec, dead: false, cancel() { this.dead = true; } }; this.timers.push(t); return t; }

  on(name, fn) { (this.handlers[name] ??= []).push(fn); }
  emit(name, ev = {}) {
    for (const fn of this.handlers[name] ?? []) { try { fn(ev); } catch (e) { this.onError(e, 'Ereignis „' + name + '“'); } }
  }

  warn(msg) {
    if (this.warned.has(msg)) return;
    this.warned.add(msg);
    this.onError(new Error(msg), 'Hinweis', true);
  }

  /* ───────────── Ende ───────────── */
  win(text = 'Geschafft!') { this._finish(true, text); }
  lose(text = 'Verloren') { this._finish(false, text); }
  _finish(won, text) {
    if (this.finished || this.state === 'idle') return;
    this.finished = { won, text };
    this.state = 'ended';
    audio.play(won ? 'win' : 'lose');
    const P = this.player;
    try { document.exitPointerLock?.(); } catch (e) { /* egal */ }
    this.hud.end(won, text, { Punkte: this.score, Abschüsse: this.kills, Zeit: Math.round(this.t) + ' s', Treffer: P.shots ? Math.round((P.hits / P.shots) * 100) + ' %' : '–' }, { again: () => this.restart(), quit: () => this.stop() });
  }

  /* ───────────── Pro Frame ───────────── */
  update(dt) {
    if (this.state === 'idle') return;
    dt = Math.min(dt, 0.05);
    const P = this.player;
    if (this.state === 'playing') {
      this.t += dt;
      this._player(dt, P);
      for (const u of this.units.slice()) this._unit(u, dt, P);
      this._visuals(dt, P);
      for (let i = this.projs.length - 1; i >= 0; i--) if (!this._stepProj(this.projs[i], dt)) this.projs.splice(i, 1);
      for (const p of this.pickups) this._pickup(p, dt, P);
      this._zones(dt, P);
      for (let i = this.timers.length - 1; i >= 0; i--) {
        const t = this.timers[i];
        if (t.dead) { this.timers.splice(i, 1); continue; }
        if (this.t >= t.at) {
          if (t.every) t.at += t.every; else { t.dead = true; this.timers.splice(i, 1); }
          try { t.fn(); } catch (e) { this.onError(e, 'Zeitgeber'); t.dead = true; }
        }
      }
      if (this.handlers.update) this.emit('update', { dt, t: this.t });
    } else if (this.state === 'ended') {
      this._visuals(0, P);
    }
    for (const t of this.tracers) if (t.live) { t.age += dt; t.mesh.material.opacity = 0.9; if (t.age > 0.07) { t.live = false; t.mesh.visible = false; } }
    this._camera(dt, P);
    this.statTime += dt;
    if (this.statTime > 0.25) { this.statTime = 0; this.hud.setStats(this.score, this.kills, this.units.filter((u) => !u.dead && this.hostile('player', u.team)).length); }
  }

  _player(dt, P) {
    const keys = this.forge.keys;
    if (!P.alive) { P.deadT += dt; P.vx *= 0.9; P.vz *= 0.9; return; }
    // Bewegung
    const mv = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
    const st = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    const sprint = (keys.has('ShiftLeft') || keys.has('ShiftRight')) && mv > 0 && P.aim < 0.3;
    let dx = -Math.sin(P.yaw) * mv + Math.cos(P.yaw) * st, dz = -Math.cos(P.yaw) * mv - Math.sin(P.yaw) * st;
    const l = Math.hypot(dx, dz);
    const sp = (sprint ? 8.6 : 5.3) * P.mods.speed * (1 - 0.4 * P.aim);
    if (l > 0) { dx /= l; dz /= l; }
    const k = Math.min(1, (P.grounded ? 11 : 2.2) * dt);
    P.vx += (dx * sp - P.vx) * k; P.vz += (dz * sp - P.vz) * k;
    if (P.grounded && keys.has('Space')) { P.vy = 5.4; P.grounded = false; }
    P.vy -= GRAV * dt;
    P.y += P.vy * dt;
    if (P.y <= 0) { P.y = 0; P.vy = 0; P.grounded = true; }
    let nx = P.x + P.vx * dt, nz = P.z + P.vz * dt;
    const r = this.cm.collide(nx, nz, P.radius, _col);
    nx = r.x; nz = r.z;
    const rad = Math.hypot(nx, nz); if (rad > R_MAX) { nx *= R_MAX / rad; nz *= R_MAX / rad; }
    const moved = Math.hypot(nx - P.x, nz - P.z) / Math.max(dt, 1e-4);
    P.x = nx; P.z = nz;
    P.move = clamp(moved / 8, 0, 1);
    P.bob += dt * moved * 1.5;
    // Zielen
    P.aim += ((P.aimOn ? 1 : 0) - P.aim) * Math.min(1, 12 * dt);
    // Waffe
    P.cd -= dt;
    P.bloom = Math.max(0, P.bloom - dt * 0.03);
    const w = P.weapons[P.cur];
    if (P.swapTo >= 0) {
      P.swap += dt / 0.16;
      if (P.swap >= 1) { P.last = P.cur; P.cur = P.swapTo; P.swapTo = -2; this._equip(); this._refreshHud(); }
    } else if (P.swapTo === -2) {
      P.swap -= dt / 0.16;
      if (P.swap <= 0) { P.swap = 0; P.swapTo = -1; }
    }
    if (P.reloadT >= 0 && w) {
      P.reloadT += dt;
      if (P.reloadT >= P.reloadDur) {
        const need = this._cap(w) - w.ammo, take = Math.min(need, w.reserve);
        w.ammo += take; w.reserve -= take; P.reloadT = -1; this._refreshHud();
      }
    }
    if (w && P.swapTo === -1 && P.reloadT < 0 && P.cd <= 0) {
      if (P.fire && (w.spec.auto || P.fireEdge)) this._firePlayer();
      else if (P.fireEdge && w.ammo <= 0) { audio.play('empty'); P.cd = 0.2; }
    }
    P.fireEdge = false;
    P.hurtT = Math.max(0, P.hurtT - dt);
  }

  _visuals(dt, P) {
    const cam = this.camera.position;
    for (const u of this.units) {
      const dx = u.x - cam.x, dz = u.z - cam.z, d2 = dx * dx + dz * dz;
      u.group.position.x = u.x; u.group.position.z = u.z;
      const far = d2 > 190 * 190;
      u.group.visible = !far;
      if (far) continue;
      u.root.rotation.y = u.yaw;
      if (!u.dead) {
        u.atkVis += ((u.windup > 0 ? 1 : 0) - u.atkVis) * Math.min(1, 14 * dt);
        u.mdl.update(dt, u.speedNow, u.atkVis);
        if (u.marker) { u.marker.position.y = u.height + 0.38 + Math.sin(u.t * 3) * 0.04; u.marker.rotation.y += dt * 2; }
        if (u.bar.visible) u.bar.quaternion.copy(this.camera.quaternion);
      }
      const sh = d2 < 62 * 62;
      if (sh !== u.shadow) { u.shadow = sh; for (const m of u.meshes) m.castShadow = sh; }
    }
  }

  _pickup(p, dt, P) {
    if (p.taken) { if (p.respawn > 0) { p.back -= dt; if (p.back <= 0) { p.taken = false; p.g.visible = true; } } return; }
    p.t += dt;
    p.mesh.rotation.y += dt * 1.8; p.mesh.rotation.x = 0.4;
    p.mesh.position.y = 0.9 + Math.sin(p.t * 2.4) * 0.12;
    if (P.alive && Math.hypot(P.x - p.x, P.z - p.z) < 1.7) {
      if (!this._collect(p)) return;
      p.taken = true;
      if (p.respawn > 0) { p.back = p.respawn; p.g.visible = false; }
      else { this._disposePickup(p); this.pickups = this.pickups.filter((q) => q !== p); }
    }
  }

  _zones(dt, P) {
    this.zoneT = (this.zoneT ?? 0) - dt;
    if (this.zoneT > 0) return;
    this.zoneT = 0.15;
    for (const z of this.zones.slice()) {
      const test = (t) => Math.hypot(t.x - z.x, t.z - z.z) < z.r;
      const subjects = [];
      if (z.who === 'player' || z.who === 'any') if (P.alive) subjects.push(['player', P]);
      if (z.who !== 'player') for (const u of this.units) if (!u.dead && (z.who === 'any' || z.who === u.team)) subjects.push([u, u]);
      const now = new Set();
      for (const [key, t] of subjects) {
        if (!test(t)) continue;
        now.add(key);
        if (!z.inside.has(key)) { try { z.onEnter?.(key === 'player' ? 'player' : key); } catch (e) { this.onError(e, 'Zone „' + z.name + '“'); } }
      }
      for (const key of z.inside) if (!now.has(key)) { try { z.onLeave?.(key); } catch (e) { this.onError(e, 'Zone „' + z.name + '“'); } }
      z.inside = now;
      z.has = now.size > 0;
    }
  }

  _camera(dt, P) {
    const cam = this.camera;
    const aimK = P.aim, w = P.weapons[P.cur];
    const zoom = w ? w.spec.zoom : 1;
    const fov = this.fov0 / (1 + (zoom - 1) * aimK);
    if (Math.abs(fov - cam.fov) > 0.02) { cam.fov = fov; cam.updateProjectionMatrix(); }
    this.recoil.p *= Math.exp(-dt * 9); this.recoil.y *= Math.exp(-dt * 9);
    let ey = P.y + EYE + Math.sin(P.bob) * 0.035 * P.move * (P.grounded ? 1 : 0);
    let roll = 0, pitch = P.pitch + this.recoil.p;
    if (!P.alive) { const k = Math.min(1, P.deadT / 0.6); ey = P.y + EYE - k * 1.15; roll = k * 0.9; pitch = P.pitch * (1 - k) - k * 0.2; }
    cam.position.set(P.x, ey, P.z);
    _e.set(pitch, P.yaw + this.recoil.y, roll);
    cam.quaternion.setFromEuler(_e);
    // Waffenmodell
    this.vm.update(dt, { bob: P.bob, move: P.move, aim: P.alive ? P.aim : 0, swap: clamp(P.swapTo === -1 ? 0 : P.swap, 0, 1), reload: P.reloadT >= 0 ? P.reloadT / P.reloadDur : -1, light: 1 - this.nightK * 0.75 });
    this.hud.update(dt, { spread: ((w?.spec.spread ?? 0) + P.bloom) * P.mods.spread * (1 + P.move * 0.5) * 900, aim: P.aim, hp: P.hp / P.maxHp, hurt: P.hurtT });
  }

  renderOverlay(renderer) {
    if (this.state === 'idle' || !this.player.alive || !this.player.weapons.length) return;
    const el = renderer.domElement;
    this.vm.render(renderer, (el.clientWidth || 1) / (el.clientHeight || 1));
  }

  _refreshHud() {
    const P = this.player, w = P.weapons[P.cur];
    this.hud.setHp(P.hp, P.maxHp);
    this.hud.setSlots(P.weapons.map((x) => x.spec.name), P.cur);
    this.hud.setAmmo(w ? w.ammo : 0, w ? w.reserve : 0, w ? w.spec.name : '–');
    this.hud.setStats(this.score, this.kills, null);
  }

  // Minimap: Punkte für Einheiten, Pickups, Zonen und Spieler
  mapData() {
    const P = this.player;
    return {
      player: { x: P.x, z: P.z, yaw: P.yaw },
      units: this.units.filter((u) => !u.dead).map((u) => ({ x: u.x, z: u.z, c: u.team === 'npc' ? '#d8c8a0' : '#' + (this.teamColors[u.team] ?? 0xff4040).toString(16).padStart(6, '0'), h: this.hostile('player', u.team) })),
      pickups: this.pickups.filter((p) => !p.taken).map((p) => ({ x: p.x, z: p.z, c: '#' + p.color.toString(16).padStart(6, '0') })),
      zones: this.zones.filter((z) => z.visible).map((z) => ({ x: z.x, z: z.z, r: z.r, c: '#' + z.color.toString(16).padStart(6, '0') })),
    };
  }
}
