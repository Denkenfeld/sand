// Die Schnittstelle, die Skripte als `game` sehen. Alles hier ist dokumentiert im Skript-Handbuch.
import { KINDS } from './units.js';
import { makeWeapon } from './weapons.js';
import { audio } from '../core/audio.js';

const hexOf = (c) => (typeof c === 'string' ? parseInt(c.replace('#', ''), 16) : c);

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
    get hp() { return P().hp; }, set hp(v) { P().hp = Math.min(P().maxHp, v); g.hud.setHp(P().hp, P().maxHp); if (P().hp <= 0 && P().alive) g._playerDie(); },
    get maxHp() { return P().maxHp; }, set maxHp(v) { P().maxHp = v; g.hud.setHp(P().hp, v); },
    get weapon() { return P().weapons[P().cur]?.id ?? null; },
    get weapons() { return P().weapons.map((w) => w.id); },
    get kills() { return g.kills; },
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

  const api = {
    player,
    city: cityApi,
    get score() { return g.score; }, set score(v) { g.score = v; g._refreshHud(); },
    get kills() { return g.kills; },
    get time() { return g.t; },
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
    kinds() { return Object.keys(KINDS); },

    pickup(type, x, z, o = {}) { const p = pt(x); if (p && typeof p === 'object') { o = z ?? {}; z = p.z; x = p.x; } return g.addPickup(type, x, z, o); },
    zone(o) { const p = o.at ? pt(o.at) : null; return g.addZone(p ? { ...o, x: p.x, z: p.z } : o); },
    weapons: {
      define(id, spec) { g.weaponDefs[id] = makeWeapon(spec, spec.base ?? 'rifle'); },
      list() { return Object.keys(g.weaponDefs); },
    },

    on(name, fn) { g.on(name, fn); },
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
    teamColor(team, color) { g.teamColors[team] = hexOf(color); },
    hour(h) { g.forge.atmosphere.setHour(h); },
    sound(name, vol = 1) { audio.play(name, vol); },
    random(a = 0, b = 1) { return a + Math.random() * (b - a); },
    log(...a) { g.onLog?.(a.map((x) => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(' ')); },
  };
  return api;
}
