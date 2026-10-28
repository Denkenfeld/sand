// Die Schnittstelle, die Skripte als `game` sehen. Alles hier ist dokumentiert im Skript-Handbuch.
import { KINDS } from './units.js';
import { makeWeapon } from './weapons.js';
import { audio } from '../core/audio.js';
import { makePresets } from './presets.js';
import * as THREE from 'three';
import { makeCtx } from './ext.js';
import { API_LEVEL, CAPS, PLANNED } from './spec.js';

const hexOf = (c) => (typeof c === 'string' ? parseInt(c.replace('#', ''), 16) : c);
const TAU = Math.PI * 2;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const wrap = (a) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };

export function makeApi(g) {
  const cm = g.cm;
  const P = () => g.player;
  const pt = (v) => (typeof v === 'string' ? cityApi.poi(v) : v);

  const cityApi = {
    get center() { return { x: 0, z: 0 }; },
    pois() { return (cm.city?.pois ?? []).map((p) => p.name); },
    poi(name) {
      const list = cm.city?.pois ?? [], q = String(name).toLowerCase();
      const p = list.find((x) => x.name.toLowerCase() === q) ?? list.find((x) => x.name.toLowerCase().includes(q));
      if (!p) { g.warn('Ort „' + name + '“ nicht gefunden. Orte: ' + list.slice(0, 12).map((x) => x.name).join(', ') + ' …'); return null; }
      return { x: p.x, z: p.z, name: p.name };
    },
    randomOpenPoint(o = {}) {
      const c = o.near ? pt(o.near) : o.near === undefined ? { x: P().x, z: P().z } : { x: 0, z: 0 };
      const r = g.openPoint(c.x, c.z, o.min ?? 0, o.max ?? 60);
      return r;
    },
    districtAt(x, z) { return cm.city?.districtAt?.(x, z) ?? null; },
  };

  const player = {
    get x() { return P().x; }, get z() { return P().z; }, get y() { return P().y; },
    get yaw() { return P().yaw; }, get alive() { return P().alive; }, get team() { return P().team; },
    get heading() { return -P().yaw; }, // Blickrichtung als Kompasswinkel: 0 = Norden, Uhrzeigersinn, Bogenmaß
    get forward() { const h = -P().yaw; return { x: Math.sin(h), z: -Math.cos(h) }; }, // Einheitsvektor nach vorn
    get hp() { return P().hp; }, set hp(v) { P().hp = Math.min(P().maxHp, v); g.hud.setHp(P().hp, P().maxHp); if (P().hp <= 0 && P().alive) g._playerDie(); },
    get maxHp() { return P().maxHp; }, set maxHp(v) { P().maxHp = v; g.hud.setHp(P().hp, v); },
    get weapon() { return P().weapons[P().cur]?.id ?? null; },
    get weapons() { return P().weapons.map((w) => w.id); },
    get kills() { return g.kills; },
    get eye() { const P = g.player; return { x: P.x, y: P.y + 1.65, z: P.z }; },
    aim(maxDist = 200, o) { return g.world.aim(maxDist, o); }, // Treffer-Abfrage durchs Fadenkreuz (siehe game.world.cast)
    heal(n = 50) { g.healPlayer(n); },
    damage(n = 10) { g.hurtPlayer(n, P().x, P().z); },
    teleport(x, z, yaw) { const p = pt(x); if (p && typeof p === 'object') { z = p.z; x = p.x; } const s = g.openPoint(x, z, 0, 12) ?? { x, z }; P().x = s.x; P().z = s.z; if (yaw != null) P().yaw = yaw; g.spawnPoint = { x: s.x, z: s.z, yaw: P().yaw }; },
    loadout(ids) { g.loadout(ids); },
    give(id) { g.giveWeapon(id); },
    giveAmmo(frac = 0.5) { g.giveAmmo(frac); },
    upgrade(stat, factor = 1.25) { g.upgrade(stat, factor); },
    respawn(at) { g.respawnPlayer(at ? pt(at) : null); },
    ammo(id) { const w = P().weapons.find((x) => x.id === (id ?? P().weapons[P().cur]?.id)); return w ? { mag: w.ammo, reserve: w.reserve } : null; },
  };

  // Mathe-Helfer. Konvention überall: Kompasswinkel (heading/bearing) = 0 Norden (−z), Osten (+x) = +90°, Uhrzeigersinn, Bogenmaß
  const math = {
    TAU, PI: Math.PI, clamp, wrap,
    lerp: (a, b, t) => a + (b - a) * t,
    dist: (a, b) => Math.hypot(b.x - a.x, b.z - a.z),
    bearing: (a, b) => Math.atan2(b.x - a.x, -(b.z - a.z)),
    forward: (heading) => ({ x: Math.sin(heading), z: -Math.cos(heading) }),
    // Ziel aus Sicht von `from` (Standard: Spieler): forward = Meter nach vorn, right = Meter nach rechts, angle = 0 geradeaus, + nach rechts
    rad: (d) => (d * Math.PI) / 180, deg: (r) => (r * 180) / Math.PI,
    toLocal(t, from = player) {
      const h = from.heading ?? 0, dx = t.x - from.x, dz = t.z - from.z, fw = dx * Math.sin(h) - dz * Math.cos(h), rt = dx * Math.cos(h) + dz * Math.sin(h);
      return { forward: fw, right: rt, dist: Math.hypot(dx, dz), angle: Math.atan2(rt, fw) };
    },
  };

  const ui = {
    widget: (o) => g.ui.widget(o),
    get: (id) => g.ui.get(id),
    remove: (id) => g.ui.remove(id),
    clear: () => g.ui.clear(),
    get screen() { return g.ui.screen; },
    project: (x, y, z) => g.ui.project(x, y, z),
    cursor: (on = true) => g.setCursor(!!on),            // Maus für Widgets freigeben (Spiel läuft weiter) bzw. wieder fangen
    focus: (w) => g.ui.focus(w), blur: () => g.ui.blur(),
    get focused() { return g.ui.focused; },
  };

  const world = {
    cast: (from, dir, max, o) => g.world.cast(from, dir, max, o),
    raycast: (a, b, o) => g.world.raycast(a, b, o),
    los: (a, b) => g.world.los(a, b),
    groundY: (x, z) => g.world.groundY(x, z),
    canBuild: (x, z, r, o) => g.world.canBuild(x, z, r, o),
    snap: (x, z, grid) => g.world.snap(x, z, grid),
    aim: (max, o) => g.world.aim(max, o),
  };
  const nav = {
    path: (a, b, o) => g.nav.path(a, b, o),
    reachable: (a, b, o) => g.nav.reachable(a, b, o),
    free: (x, z, r) => g.nav.free(x, z, r),
    get stats() { return { ...g.nav.stats }; },
  };
  const fx = {
    explosion: (x, y, z, o) => g.fx3d.explosion(x, y, z, o),
    burst: (x, y, z, o) => g.fx3d.burst(x, y, z, o),
    muzzle: (x, y, z, o) => g.fx3d.muzzle(x, y, z, o),
    beam: (a, b, o) => g.fx3d.beam(a, b, o),
    ring: (x, z, r, o) => g.fx3d.ring(x, z, r, o),
  };

  const capabilities = { ...CAPS };

  // Expertenzugang (Vertrag Stufe 1): rendererabhängig, siehe Handbuch „Expertenreferenz“. Szene, Lichter, Himmel und Renderer-Einstellungen gehören der Engine,
  // die Hauptkamera dem aktiven Controller. Eigene Objekte gehören in ctx.root bzw. ctx.add(...) eines Moduls.
  const ext = {
    contract: 1,
    versions: { engine: g.apiVersion, three: THREE.REVISION, renderer: 'WebGLRenderer' },
    THREE,
    get scene() { return g.scene; },
    get renderer() { return g.renderer; },
    get camera() { return g.camera; },
    collide: (x, z, r) => { const o = g.cm.collide(x, z, r, { x: 0, z: 0, hit: false }); return { x: o.x, z: o.z, hit: !!o.hit }; },
    obstacleAt: (x, z, margin) => !!g.cm.obstacleAt(x, z, margin),
  };

  const input = {
    action: (n, o) => g.input.define(n, 'action', o),
    axis: (n, o) => g.input.define(n, 'axis', o),
    bind: (n, src, o) => g.input.bind(n, src, o), bindings: (n) => g.input.bindings(n), list: () => g.input.list(),
    down: (n) => g.input.down(n), pressed: (n) => g.input.pressed(n), released: (n) => g.input.released(n), value: (n) => g.input.value(n),
    push: (c) => g.input.push(c), pop: (c) => g.input.pop(c),
    get context() { return g.input.activeContext(); },
    set: (n, v) => g.input.set(n, v), virtual: (n, v) => g.input.set(n, v),
    reset: () => g.input.reset(),
    get mouse() { const m = g.input.mouse; return { x: m.x, y: m.y, dx: m.dx, dy: m.dy, inside: m.inside }; },
  };
  const assets = {
    load: (id, src, o) => g.assets.load(id, src, o), has: (id) => g.assets.has(id), get: (id) => g.assets.get(id), list: () => g.assets.list(),
    model: (id, o) => g.assets.model(id, o), release: (id, o) => g.assets.release(id, o), setDefaults: (id, def) => g.assets.setDefaults(id, def),
  };
  const camera = {
    create: (n, o) => g.createRig(n, o), get: (n) => (n === 'ego' ? g.egoRig : g.rigs.get(n) ?? null), list: () => ['ego', ...g.rigs.keys()],
    use: (c) => g.useCamera(c),
    get active() { return g.camOverride ?? g.ctl.cc.rig; },
    project: (x, y, z) => g.ui.project(x, y, z),
    ray: (sx, sy) => g.rayAt(sx, sy), pick: (sx, sy, o) => g.pick(sx, sy, o),
  };
  const controller = {
    define: (n, def) => g._regCtl({ ...def, name: n }, null),
    use: (n, o) => g._setCtl(n, o), has: (n) => g.ctls.has(n), list: () => [...g.ctls.keys()],
    get active() { return g.ctl.name; },
    toggle: (a, b, o) => g._setCtl(g.ctl.name === a ? b : a, o),
  };

  const api = {
    version: g.apiVersion, apiLevel: API_LEVEL, capabilities, planned: PLANNED, ext,
    has: (name) => name in capabilities,
    player, math, ui, world, nav, fx, input, camera, controller, assets,
    instanced: (o) => g.assets.instanced(o),
    pause: () => g.pause(), resume: () => g.resume(),
    get paused() { return g.state === 'paused'; },
    tween: (target, props, sec, o) => g.tween(target, props, sec, o),
    prefab: (name, def) => { g.prefabs.define(name, def); return name; },
    place: (name, o = {}) => { o = { ...o }; if (o.at != null) { const p = pt(o.at); if (p) { o.x = p.x; o.z = p.z; } delete o.at; } return g.prefabs.place(name, o); },
    things: (name) => g.things.filter((t) => !t.removed && (!name || t.prefab === name)),
    defineKind: (id, spec) => !!g.defineKind(id, spec),
    shoot: (o) => g.fx3d.shoot(o),
    explode: (x, y, z, o) => g.fx3d.explodeArea(x, y, z, o),
    save: (slot, extra) => g.save(slot, extra), load: (src) => g.load(src), byId: (id) => g.byId(id),
    hasSave: (slot) => g.hasSave(slot), deleteSave: (slot) => g.deleteSave(slot),
    city: cityApi,
    get score() { return g.score; }, set score(v) { g.score = v; g._refreshHud(); },
    get kills() { return g.kills; },
    addScore(n) { g.score += n; g._refreshHud(); },

    spawn(kind, o = {}) {
      o = { ...o };
      if (o.at != null) { const p = pt(o.at); if (p) { o.x = p.x; o.z = p.z; } delete o.at; }
      if (o.near) o.near = pt(o.near) ?? undefined;
      return g.spawn(kind, o);
    },
    spawnWave(kind, n, o = {}) { o = { ...o }; if (o.near) o.near = pt(o.near) ?? undefined; return g.spawnWave(kind, n, o); },
    units(team) { return g.units.filter((u) => u.alive && (!team || u.team === team)); },
    count(team) { return g.units.filter((u) => u.alive && (!team || u.team === team)).length; },
    kinds() { return Object.keys(g.kinds); },

    pickup(type, x, z, o = {}) { const p = pt(x); if (p && typeof p === 'object') { o = z ?? {}; z = p.z; x = p.x; } return g.addPickup(type, x, z, o); },
    zone(o) { const p = o.at ? pt(o.at) : null; return g.addZone(p ? { ...o, x: p.x, z: p.z } : o); },
    weapons: {
      define(id, spec) { g.weaponDefs[id] = makeWeapon(spec, spec.base ?? 'rifle'); },
      list() { return Object.keys(g.weaponDefs); },
    },

    on(name, fn) { g.on(name, fn); },
    off(name, fn) { g.off(name, fn); },
    emit(name, ev) { g.emit(name, ev ?? {}); },
    fixed: (hz, fn) => g.fixed(hz, fn),
    module: (name, def) => g.modules.define(name, def, (m) => makeCtx(g, api, m)),
    modules: {
      get: (n) => g.modules.get(n), has: (n) => g.modules.has(n), list: () => g.modules.list(),
      enable: (n) => g.modules.enable(n), disable: (n) => g.modules.disable(n), remove: (n) => g.modules.remove(n),
    },
    get time() { return g.t; },
    get clock() { return { sim: g.t, real: g.rt, dt: g.dt, rdt: g.rdt, scale: g.timeScale, frame: g.frameNo, paused: g.state === 'paused' }; },
    get timeScale() { return g.timeScale; }, set timeScale(v) { g.timeScale = Math.min(4, Math.max(0, +v || 0)); },
    stats: (o) => g.diag.stats(o), diag: (on = true) => g.diag.show(on),
    every(sec, fn) { return g.every(sec, fn); },
    after(sec, fn) { return g.after(sec, fn); },

    hud: {
      set(key, text) { g.hud.line(key, text); },
      clear(key) { g.hud.line(key, null); },
      message(text, sec = 3) { g.hud.message(text, sec); },
    },

    win(text) { g.win(text); },
    lose(text) { g.lose(text); },
    restart() { g.restart(); },

    setHostile(a, b, v = true) { g.setHostile(a, b, v); },
    teamColor(team, color) { if (color === undefined) return team === 'npc' ? 0xd8c8a0 : g.teamColors[team] ?? 0xff4040; g.teamColors[team] = hexOf(color); },
    isHostile(a, b = 'player') { return g.hostile(a, b); },
    hour(h) { g.forge.atmosphere.setHour(h); },
    sound(name, vol = 1) { audio.play(name, vol); },
    random(a = 0, b = 1) { return a + Math.random() * (b - a); },
    log(...a) { g.onLog?.(a.map((x) => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(' ')); },
  };
  Object.assign(ui, makePresets(api));
  return api;
}
