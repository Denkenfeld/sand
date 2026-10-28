// Eingabe-Aktionen, Kameras (Rigs) und austauschbare Controller.
//  • Input: Aktionen und Achsen mit Bindungen und Kontexten statt fest verdrahteter Tasten. UI verbraucht Zeigerereignisse vorher (siehe layer.js).
//  • Rig: eine beschriebene Kamera (perspektivisch oder orthografisch). Das Spiel überträgt die aktive auf die Render-Kamera.
//  • Controller: wer steuert gerade? „ego“ (Spielfigur), „topdown“ (Vogelperspektive), „free“ (freie Kamera) – und eigene über game.controller.define.
import * as THREE from 'three';

const R_MAX = 620;
const UP = new THREE.Vector3(0, 1, 0), _m = new THREE.Matrix4(), _v = new THREE.Vector3(), _w = new THREE.Vector3(), _e = new THREE.Euler(0, 0, 0, 'YXZ');
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

/* ───────────── Eingabe ───────────── */
// Quellen: Tastencodes ('KeyW', 'Space', 'ShiftLeft', 'ArrowUp' …), 'Mouse0|1|2', 'WheelUp', 'WheelDown', 'MouseX', 'MouseY' (Bewegung in Pixeln)
// Kurzformen: 'w', '5', 'space', 'shift', 'ctrl', 'esc', 'enter', 'tab', 'up|down|left|right'
const SHORT = { space: 'Space', shift: 'ShiftLeft', ctrl: 'ControlLeft', alt: 'AltLeft', esc: 'Escape', escape: 'Escape', enter: 'Enter', tab: 'Tab', up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', mouse: 'Mouse0', wheelup: 'WheelUp', wheeldown: 'WheelDown' };
const ANALOG = new Set(['MouseX', 'MouseY', 'WheelUp', 'WheelDown']);
export function normSource(s) {
  if (typeof s !== 'string') return null;
  const k = s.trim(), l = k.toLowerCase();
  if (SHORT[l]) return SHORT[l];
  if (/^[a-z]$/i.test(k)) return 'Key' + k.toUpperCase();
  if (/^\d$/.test(k)) return 'Digit' + k;
  if (/^mouse[0-4]$/i.test(k)) return 'Mouse' + k.slice(5);
  if (/^[A-Z][A-Za-z0-9]*$/.test(k)) return k;
  return null;
}

export class Input {
  constructor(g) {
    this.g = g; this.defs = new Map(); this.st = new Map(); this.held = new Set(); this.stack = [];
    this.mouse = { x: 0, y: 0, dx: 0, dy: 0, inside: false };
    this._md = { x: 0, y: 0 }; this._wh = { up: 0, down: 0 }; this.wheel = { up: 0, down: 0 };
  }
  get count() { return this.defs.size; }
  clear() { this.defs.clear(); this.st.clear(); this.held.clear(); this.stack = []; this._md.x = this._md.y = 0; this._wh.up = this._wh.down = 0; this.wheel.up = this.wheel.down = 0; this.mouse.dx = this.mouse.dy = 0; }

  _list(v, what) {
    const out = [];
    for (const s of v == null ? [] : Array.isArray(v) ? v : [v]) {
      const n = normSource(s);
      if (!n) this.g.warn('input: Quelle „' + s + '“ in ' + what + ' ist unbekannt (Beispiele: "KeyW", "w", "Space", "Mouse0", "WheelUp")');
      else out.push(n);
    }
    return out;
  }

  // type: 'action' (an/aus) | 'axis' (−1…+1 bzw. analog). o: { keys | pos, neg, context, scale }
  define(name, type, o = {}, scope = null) {
    if (typeof name !== 'string' || !name) { this.g.warn('input.' + type + '(name, {…}): der Name der Aktion fehlt'); return null; }
    const old = this.defs.get(name);
    const d = { name, type, pos: this._list(o.pos ?? o.keys, name), neg: this._list(o.neg, name), context: o.context ?? '*', scale: o.scale ?? 1, scope, builtin: !!o.builtin };
    if (old && old.builtin && !o.builtin) d.builtin = false;
    this.defs.set(name, d);
    if (!this.st.has(name)) this.st.set(name, { down: false, pressed: false, released: false, value: 0, eD: false, eU: false, virt: null });
    return d;
  }
  remove(name) { this.defs.delete(name); this.st.delete(name); }
  // Bindung ändern: bind('fire', ['Mouse0', 'KeyF']) ersetzt, mit { add: true } ergänzt. Achsen: bind('move.y', { pos: [...], neg: [...] })
  bind(name, src, o = {}) {
    const d = this.defs.get(name);
    if (!d) { this.g.warn('input.bind: Aktion „' + name + '“ gibt es nicht. Vorhanden: ' + [...this.defs.keys()].join(', ')); return false; }
    const isObj = src && !Array.isArray(src) && typeof src === 'object';
    const pos = this._list(isObj ? src.pos ?? src.keys : src, name), neg = isObj ? this._list(src.neg, name) : null;
    d.pos = o.add ? [...new Set([...d.pos, ...pos])] : pos;
    if (neg) d.neg = o.add ? [...new Set([...d.neg, ...neg])] : neg;
    d.builtin = false;
    return true;
  }
  bindings(name) { const d = this.defs.get(name); return d ? { pos: [...d.pos], neg: [...d.neg], context: d.context, type: d.type } : null; }
  list() { return [...this.defs.values()].map((d) => ({ name: d.name, type: d.type, context: d.context, pos: [...d.pos], neg: [...d.neg] })); }

  /* Kontext: wer bekommt die Eingaben? Pausenmenü/Skript-Pause = 'menu'; sonst oben auf dem Stapel, sonst der Kontext des Controllers */
  activeContext() {
    const g = this.g;
    if (g.scriptPause || g.state === 'paused' || g.state === 'ended') return 'menu';
    return this.stack.length ? this.stack[this.stack.length - 1] : g.ctl?.def.context ?? 'ego';
  }
  push(c) { this.stack.push(String(c)); return this.stack.length; }
  pop(c) {
    if (c == null) return this.stack.pop() ?? null;
    const i = this.stack.lastIndexOf(c);
    if (i < 0) return null;
    this.stack.splice(i, 1); return c;
  }
  _in(d, ctx) { const c = d.context; return c === ctx || (c === '*' && ctx !== 'menu') || (Array.isArray(c) && c.includes(ctx)); }

  /* Ereignisse vom Fenster */
  keyDown(e) { const c = e.code; if (!c || this.held.has(c)) return; this.held.add(c); this._edge(c, true); }
  keyUp(e) { const c = e.code; if (!c || !this.held.delete(c)) return; this._edge(c, false); }
  mouseDown(e) { const c = 'Mouse' + e.button; if (this.held.has(c)) return; this.held.add(c); this._edge(c, true); }
  mouseUp(e) { const c = 'Mouse' + e.button; if (!this.held.delete(c)) return; this._edge(c, false); }
  mouseMove(e, el) {
    this._md.x += e.movementX || 0; this._md.y += e.movementY || 0;
    const r = el.getBoundingClientRect();
    if (document.pointerLockElement) { this.mouse.x = r.width / 2; this.mouse.y = r.height / 2; this.mouse.inside = true; }
    else { this.mouse.x = e.clientX - r.left; this.mouse.y = e.clientY - r.top; this.mouse.inside = this.mouse.x >= 0 && this.mouse.y >= 0 && this.mouse.x <= r.width && this.mouse.y <= r.height; }
  }
  wheelEvt(e) {
    if (e.deltaY > 0) { this._wh.down++; this._edge('WheelDown', true); this._edge('WheelDown', false); }
    else if (e.deltaY < 0) { this._wh.up++; this._edge('WheelUp', true); this._edge('WheelUp', false); }
  }
  _edge(src, down) {
    for (const d of this.defs.values()) {
      if (!d.pos.includes(src) && !(d.type === 'axis' && d.neg.includes(src))) continue;
      const s = this.st.get(d.name);
      if (d.type === 'action' || d.pos.includes(src)) { if (down) s.eD = true; else s.eU = true; }
    }
  }
  // Fokusverlust: alles Gehaltene loslassen (die Freigabe wird noch als „released“ gemeldet)
  reset() {
    for (const s of this.st.values()) { if (s.down) s.eU = true; s.down = false; s.value = 0; }
    this.held.clear(); this._md.x = this._md.y = 0; this._wh.up = this._wh.down = 0;
  }

  _val(s) {
    if (this.held.has(s)) return 1;
    if (s === 'MouseX') return this.mouse.dx; if (s === 'MouseY') return this.mouse.dy;
    if (s === 'WheelUp') return this.wheel.up; if (s === 'WheelDown') return this.wheel.down;
    return 0;
  }
  // Am Anfang jedes Bildes: Zustände und Flanken (pressed/released) einfrieren
  begin() {
    this.mouse.dx = this._md.x; this.mouse.dy = this._md.y; this._md.x = this._md.y = 0;
    this.wheel.up = this._wh.up; this.wheel.down = this._wh.down; this._wh.up = this._wh.down = 0;
    const ctx = this.activeContext();
    for (const d of this.defs.values()) {
      const s = this.st.get(d.name), on = this._in(d, ctx);
      s.pressed = on && s.eD; s.released = on && s.eU; s.eD = s.eU = false;
      let v = 0;
      if (on) {
        if (s.virt != null) v = s.virt;
        else if (d.type === 'action') { for (const p of d.pos) if (this._val(p) > 0) { v = 1; break; } }
        else {
          let a = 0, analog = false;
          for (const p of d.pos) { a += this._val(p); if (ANALOG.has(p)) analog = true; }
          for (const p of d.neg) { a -= this._val(p); if (ANALOG.has(p)) analog = true; }
          v = a * d.scale; if (!analog) v = clamp(v, -1, 1);
        }
      }
      s.value = v; s.down = d.type === 'action' ? v > 0.5 : v !== 0;
    }
  }
  _s(name) {
    const s = this.st.get(name);
    if (!s) this.g.warn('input: Aktion „' + name + '“ gibt es nicht. Vorhanden: ' + [...this.defs.keys()].join(', '));
    return s;
  }
  down(name) { return this._s(name)?.down ?? false; }
  pressed(name) { return this._s(name)?.pressed ?? false; }
  released(name) { return this._s(name)?.released ?? false; }
  value(name) { return this._s(name)?.value ?? 0; }
  // Virtuelles Gerät (z. B. Touch-Stick als Widget): setzt den Wert einer Aktion/Achse von außen; null = zurück zu Tasten/Maus
  set(name, v) {
    const s = this._s(name); if (!s) return;
    const was = s.down;
    s.virt = v == null ? null : +v;
    const now = s.virt != null && Math.abs(s.virt) > 0.5;
    if (s.virt != null && now && !was) s.eD = true; else if (s.virt != null && !now && was) s.eU = true;
  }
}

/* ───────────── Kamera-Rig ───────────── */
export class Rig {
  constructor(name, o = {}) {
    this.name = name; this.type = o.type === 'orthographic' ? 'orthographic' : 'perspective';
    this.position = new THREE.Vector3(); this.quaternion = new THREE.Quaternion();
    this.fov = o.fov ?? 55; this.size = o.size ?? 60; this.near = o.near ?? 0.12; this.far = o.far ?? null;
    this.native = !!o.native; this.scope = null; this.removed = false; this._game = null;
    if (o.position) this.setPosition(o.position.x ?? o.position[0], o.position.y ?? o.position[1], o.position.z ?? o.position[2]);
    if (o.lookAt) this.lookAt(o.lookAt.x ?? o.lookAt[0], o.lookAt.y ?? o.lookAt[1], o.lookAt.z ?? o.lookAt[2]);
  }
  setPosition(x, y, z) { this.position.set(x, y, z); return this; }
  lookAt(x, y, z) {
    _v.set(x, y, z);
    const dx = x - this.position.x, dz = z - this.position.z;
    _m.lookAt(this.position, _v, Math.abs(dx) + Math.abs(dz) < 1e-4 ? _w.set(0, 0, -1) : UP);
    this.quaternion.setFromRotationMatrix(_m);
    return this;
  }
  // Blickrichtung aus Winkeln: yaw 0 = Norden (−z), im Uhrzeigersinn; pitch > 0 = nach oben (Bogenmaß)
  setAngles(yaw, pitch = 0) { _e.set(pitch, -yaw, 0); this.quaternion.setFromEuler(_e); return this; }
  get direction() { _v.set(0, 0, -1).applyQuaternion(this.quaternion); return { x: _v.x, y: _v.y, z: _v.z }; }
  remove() { this._game?.removeRig(this); }
}

/* ───────────── Eingebaute Controller (benutzen dieselbe öffentliche Schnittstelle wie eigene) ───────────── */
const ground = () => 0;

export const TOPDOWN = {
  name: 'topdown', context: 'topdown', cursor: 'free', player: 'idle', viewmodel: false,
  input: {
    'cam.x': { pos: ['KeyD', 'ArrowRight'], neg: ['KeyA', 'ArrowLeft'] },
    'cam.y': { pos: ['KeyW', 'ArrowUp'], neg: ['KeyS', 'ArrowDown'] },
    'cam.rotate': { pos: ['KeyE'], neg: ['KeyQ'] },
    'cam.zoom': { pos: ['WheelDown'], neg: ['WheelUp'] },
    'cam.fast': { keys: ['ShiftLeft', 'ShiftRight'], type: 'action' },
  },
  // Optionen: x, z oder at (Ortsname/{x,z}), dist (Abstand, m), pitch (Neigung, rad), yaw, ortho (true = orthografisch), minDist, maxDist, edgePan (Bildrand schiebt)
  enter(cc, prev) {
    const g = cc.game, s = cc.state, o = cc.opts;
    const at = o.at ? (typeof o.at === 'string' ? g.city.poi(o.at) : o.at) : null;
    const P = g.player;
    if (at) { s.x = at.x; s.z = at.z; } else { if (o.x != null) s.x = o.x; if (o.z != null) s.z = o.z; }
    if (s.x == null) { s.x = P.x; s.z = P.z; }
    s.minDist = o.minDist ?? s.minDist ?? 14; s.maxDist = o.maxDist ?? s.maxDist ?? 190;
    if (o.dist != null || s.dist == null) s.dist = s.distT = clamp(o.dist ?? 70, s.minDist, s.maxDist);
    if (o.pitch != null || s.pitch == null) s.pitch = clamp(o.pitch ?? 0.95, 0.3, 1.5);
    if (o.yaw != null || s.yaw == null) s.yaw = o.yaw ?? 0;
    if (o.ortho != null || s.ortho == null) s.ortho = !!o.ortho;
    if (o.edgePan != null) s.edgePan = !!o.edgePan;
    s.drag = null;
    const r = cc.rig; r.type = s.ortho ? 'orthographic' : 'perspective'; r.fov = o.fov ?? 45; r.near = s.ortho ? 1 : 1; r.far = s.ortho ? 1200 : 900;
  },
  camera(cc, dt) {
    const I = cc.input, s = cc.state, r = cc.rig, mouse = I.mouse;
    const fast = I.down('cam.fast') ? 2.5 : 1;
    let px = I.value('cam.x'), py = I.value('cam.y');
    if (s.edgePan && mouse.inside && !s.drag && document.pointerLockElement == null) {
      const sc = cc.game.ui.screen, m = 14;
      if (mouse.x < m) px -= 1; else if (mouse.x > sc.w - m) px += 1;
      if (mouse.y < m) py += 1; else if (mouse.y > sc.h - m) py -= 1;
    }
    const sy = Math.sin(s.yaw), cy = Math.cos(s.yaw), spd = s.dist * 0.9 * fast;
    s.x += (-sy * py + cy * px) * spd * dt; s.z += (-cy * py - sy * px) * spd * dt;
    s.yaw += I.value('cam.rotate') * 1.5 * dt;
    const zoom = I.value('cam.zoom');
    if (zoom) s.distT = clamp(s.distT * Math.pow(1.12, zoom), s.minDist, s.maxDist);
    s.dist += (s.distT - s.dist) * (1 - Math.exp(-10 * dt));
    const l = Math.hypot(s.x, s.z); if (l > R_MAX - 30) { s.x *= (R_MAX - 30) / l; s.z *= (R_MAX - 30) / l; }
    const cp = Math.cos(s.pitch), sp = Math.sin(s.pitch), D = s.ortho ? 300 : s.dist, gy = ground(s.x, s.z);
    r.position.set(s.x + Math.sin(s.yaw) * cp * D, gy + sp * D, s.z + Math.cos(s.yaw) * cp * D);
    r.lookAt(s.x, gy, s.z);
    if (s.ortho) r.size = s.dist * 1.2;
  },
  pointer(cc, type, e) {
    const s = cc.state;
    if (type === 'down') s.drag = e.button;
    else if (type === 'up') { if (e.button === s.drag) s.drag = null; }
    else if (type === 'move' && s.drag != null) {
      if (s.drag === 2) { s.yaw -= e.movementX * 0.006; s.pitch = clamp(s.pitch + e.movementY * 0.004, 0.3, 1.5); }
      else if (s.drag === 1) {
        const k = s.dist * 0.0018, sy = Math.sin(s.yaw), cy = Math.cos(s.yaw);
        s.x += -cy * e.movementX * k - sy * e.movementY * k; s.z += sy * e.movementX * k - cy * e.movementY * k;
      }
    }
  },
  view(cc) { const s = cc.state; return { x: s.x, z: s.z, shadow: clamp(s.dist * 0.7 + 50, 90, 190), near: null }; },
};

export const FREE = {
  name: 'free', context: 'free', cursor: 'free', player: 'idle', viewmodel: false,
  input: {
    'free.x': { pos: ['KeyD', 'ArrowRight'], neg: ['KeyA', 'ArrowLeft'] },
    'free.y': { pos: ['KeyW', 'ArrowUp'], neg: ['KeyS', 'ArrowDown'] },
    'free.z': { pos: ['KeyE', 'Space'], neg: ['KeyQ', 'KeyC'] },
    'free.fast': { keys: ['ShiftLeft', 'ShiftRight'], type: 'action' },
    'free.speed': { pos: ['WheelUp'], neg: ['WheelDown'] },
  },
  enter(cc) {
    const g = cc.game, s = cc.state, o = cc.opts, P = g.player, c = g.ext.camera;
    const at = o.at ? (typeof o.at === 'string' ? g.city.poi(o.at) : o.at) : null;
    s.x = at?.x ?? o.x ?? c.position.x; s.y = o.y ?? c.position.y; s.z = at?.z ?? o.z ?? c.position.z;
    if (o.yaw != null) s.yaw = o.yaw; else if (s.yaw == null) s.yaw = P.yaw;
    if (o.pitch != null) s.pitch = o.pitch; else if (s.pitch == null) s.pitch = P.pitch;
    s.speed = o.speed ?? s.speed ?? 12; s.drag = false;
    const r = cc.rig; r.type = 'perspective'; r.fov = o.fov ?? 60; r.near = 0.12; r.far = null;
  },
  camera(cc, dt) {
    const I = cc.input, s = cc.state, r = cc.rig;
    s.speed = clamp(s.speed * Math.pow(1.15, I.value('free.speed')), 2, 120);
    const sp = s.speed * (I.down('free.fast') ? 3 : 1) * dt, fx = I.value('free.y'), sx = I.value('free.x'), up = I.value('free.z');
    const cp = Math.cos(s.pitch), fwdx = -Math.sin(s.yaw) * cp, fwdy = Math.sin(s.pitch), fwdz = -Math.cos(s.yaw) * cp;
    s.x += (fwdx * fx + Math.cos(s.yaw) * sx) * sp; s.y += (fwdy * fx + up) * sp; s.z += (fwdz * fx - Math.sin(s.yaw) * sx) * sp;
    s.y = clamp(s.y, 0.6, 400);
    const l = Math.hypot(s.x, s.z); if (l > R_MAX) { s.x *= R_MAX / l; s.z *= R_MAX / l; }
    r.position.set(s.x, s.y, s.z);
    _e.set(s.pitch, s.yaw, 0); r.quaternion.setFromEuler(_e);
  },
  pointer(cc, type, e) {
    const s = cc.state;
    if (type === 'down' && e.button === 2) s.drag = true;
    else if (type === 'up' && e.button === 2) s.drag = false;
    else if (type === 'move' && s.drag) { s.yaw -= e.movementX * 0.0035; s.pitch = clamp(s.pitch - e.movementY * 0.0035, -1.5, 1.5); }
  },
  view(cc) { const s = cc.state; return { x: s.x, z: s.z, shadow: clamp(s.y * 1.2 + 60, 90, 190), near: null }; },
};

// Spielfigur-Controller („ego“): benutzt die Spielerlogik des Spiels. Kamera und Zielen sind in game.js (_player, _egoCamera).
export function egoController(g) {
  return {
    name: 'ego', context: 'ego', cursor: 'locked', player: 'active', viewmodel: true, native: true,
    input: {
      'move.x': { pos: ['KeyD', 'ArrowRight'], neg: ['KeyA', 'ArrowLeft'] },
      'move.y': { pos: ['KeyW', 'ArrowUp'], neg: ['KeyS', 'ArrowDown'] },
      jump: { keys: ['Space'], type: 'action' }, sprint: { keys: ['ShiftLeft', 'ShiftRight'], type: 'action' },
      fire: { keys: ['Mouse0'], type: 'action' }, aim: { keys: ['Mouse2'], type: 'action' },
      reload: { keys: ['KeyR'], type: 'action' }, use: { keys: ['KeyE'], type: 'action' },
      'weapon.last': { keys: ['KeyQ'], type: 'action' }, 'weapon.next': { keys: ['WheelDown'], type: 'action' }, 'weapon.prev': { keys: ['WheelUp'], type: 'action' },
      ...Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => ['weapon.' + i, { keys: ['Digit' + i], type: 'action' }])),
    },
    update(cc, dt) { g._player(dt, g.player); },
    camera(cc, rdt) { g._egoCamera(rdt, g.player); },
    pointer(cc, type, e) {
      if (type !== 'move') return;
      if (!g.locked && !(g.freeLook && (e.buttons & 2))) return;
      const P = g.player, s = 0.0022 * (g.camera.fov / g.fov0);
      P.yaw -= e.movementX * s; P.pitch = clamp(P.pitch - e.movementY * s, -1.5, 1.5);
    },
    view() { const P = g.player; return { x: P.x, z: P.z, shadow: 90, near: 0.12 }; },
  };
}
