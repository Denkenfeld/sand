// Abfragen an die Spielwelt für Skripte: Strahlen, Sichtlinie, Bodenhöhe, Bauplatz-Prüfung, Blick-Ziel.
import * as THREE from 'three';
import { terrainHeight } from '../core/atmosphere.js';

const R_MAX = 620;
const _o = new THREE.Vector3(), _d = new THREE.Vector3(), _e = new THREE.Euler(0, 0, 0, 'YXZ'), _q = new THREE.Quaternion();
export const rayCyl = (o, d, cx, cz, r, y0, y1, maxT) => { // Strahl gegen senkrechten Zylinder → Abstand oder -1
  const a = d.x * d.x + d.z * d.z; if (a < 1e-9) return -1;
  const bx = o.x - cx, bz = o.z - cz, b = bx * d.x + bz * d.z, c = bx * bx + bz * bz - r * r, disc = b * b - a * c;
  if (disc < 0) return -1;
  let q = (-b - Math.sqrt(disc)) / a; if (q < 0) q = c < 0 ? 0.001 : -1;
  if (q < 0 || q >= maxT) return -1;
  const y = o.y + d.y * q;
  return y < y0 - 0.05 || y > y1 + 0.1 ? -1 : q;
};

export class World {
  constructor(game) { this.g = game; }

  groundY(x, z) { return terrainHeight(x, z); }

  // Strahl von `from` in Richtung `dir` ({x,y,z}, wird normiert). o: { units, things, ignore }
  // → { hit, type: 'world'|'ground'|'unit'|'thing'|'none', dist, x, y, z, unit, thing, head }
  cast(from, dir, maxDist = 200, o = {}) {
    const g = this.g;
    _o.set(from.x, from.y ?? 1.5, from.z);
    _d.set(dir.x, dir.y ?? 0, dir.z);
    if (_d.lengthSq() < 1e-10) return { hit: false, type: 'none', dist: maxDist, x: from.x, y: from.y ?? 1.5, z: from.z, unit: null, thing: null, zone: null, head: false };
    _d.normalize();
    const r = g.trace(_o, _d, maxDist, o.ignore ?? null, o.units !== false);
    let { t, type, unit } = r, thing = null, zone = null;
    if (o.things !== false) {
      for (const th of g.things) {
        if (th.removed || th.dead || (!th.solid && th.hp == null && !th.hits)) continue;
        let q, z = null;
        if (th.hits) { const h = th.rayHit(_o, _d, t); q = h ? h.t : -1; z = h?.zone ?? null; }
        else q = rayCyl(_o, _d, th.x, th.z, th.radius, th.y, th.y + th.height, t);
        if (q >= 0 && q < t) { t = q; type = 'thing'; thing = th; unit = null; zone = z; }
      }
    }
    return { hit: type !== 'none', type, dist: t, x: _o.x + _d.x * t, y: _o.y + _d.y * t, z: _o.z + _d.z * t, unit, thing, zone, head: type === 'unit' ? r.head : false };
  }

  // Strahl von Punkt a zu Punkt b
  raycast(a, b, o = {}) {
    const dx = b.x - a.x, dy = (b.y ?? 1.5) - (a.y ?? 1.5), dz = b.z - a.z, L = Math.hypot(dx, dy, dz);
    return this.cast(a, { x: dx, y: dy, z: dz }, L, o);
  }

  // Freie Sicht zwischen zwei Punkten (nur Gebäude)? y optional (Standard 1.5)
  los(a, b) { return this.g.los(a.x, a.y ?? 1.5, a.z, b.x, b.y ?? 1.5, b.z); }

  // Wo schaut der Spieler hin? (Strahl durchs Fadenkreuz)
  aim(maxDist = 200, o = {}) {
    const P = this.g.player;
    _e.set(P.pitch, P.yaw, 0); _q.setFromEuler(_e);
    const d = _d.set(0, 0, -1).applyQuaternion(_q), dir = { x: d.x, y: d.y, z: d.z };
    const r = this.cast({ x: P.x, y: P.y + 1.65, z: P.z }, dir, maxDist, { ignore: null, ...o });
    return r;
  }

  snap(x, z, grid = 2) { return { x: Math.round(x / grid) * grid, z: Math.round(z / grid) * grid }; }

  // Darf hier gebaut werden? Kreis mit Radius r.
  // o: { units: false (Einheiten ignorieren), keepPath: { from, to, radius } (Weg muss offen bleiben) }
  // → { ok, reason: ''|'outside'|'building'|'object'|'unit'|'player'|'blocks-path', x, z }
  canBuild(x, z, r = 1.5, o = {}) {
    const g = this.g, res = (ok, reason) => ({ ok, reason, x, z });
    if (!Number.isFinite(x) || !Number.isFinite(z)) return res(false, 'outside');
    if (Math.hypot(x, z) > R_MAX - 15) return res(false, 'outside');
    if (g.cm.obstacleAt(x, z, r)) return res(false, 'building');
    for (const t of g.things) if (!t.removed && t.solid > 0 && Math.hypot(t.x - x, t.z - z) < t.solid + r) return res(false, 'object');
    if (o.units !== false) {
      for (const u of g.units) if (!u.dead && !u.removed && Math.hypot(u.x - x, u.z - z) < r + u.radius) return res(false, 'unit');
      if (g.player.alive && Math.hypot(g.player.x - x, g.player.z - z) < r + g.player.radius) return res(false, 'player');
    }
    if (o.keepPath && g.nav) {
      const k = o.keepPath, ghost = { x, z, solid: r, removed: false };
      const v0 = g.nav.version;
      g.things.push(ghost); g.nav.invalidate();
      let ok = false;
      try { ok = g.nav.reachable(k.from, k.to, { radius: k.radius ?? 0.9 }); } finally { g.things.pop(); g.nav.invalidate(); g.nav.version = v0; }
      if (!ok) return res(false, 'blocks-path');
    }
    return res(true, '');
  }
}
