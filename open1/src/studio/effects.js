// Sichtbare Projektile und Welteffekte für Skripte (game.shoot, game.explode, game.fx.*).
// Partikel laufen über das vorhandene Partikelsystem (src/core/fx.js, feste Puffergröße – kein Wachstum);
// Geschosse, Strahlen und Ringe kommen aus kleinen Pools und werden beim Neustart aufgeräumt.
import * as THREE from 'three';
import { segSeg } from './prefab.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const col = (c) => { const k = new THREE.Color(typeof c === 'number' ? c : c ?? '#ffd890'); return [k.r, k.g, k.b]; };
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);

export class Effects {
  constructor(game) {
    this.g = game;
    this.shots = []; this.beams = []; this.rings = [];
    this.ballGeo = new THREE.SphereGeometry(1, 12, 8);
    this.boltGeo = new THREE.BoxGeometry(1, 1, 1);
    this.ringGeo = new THREE.RingGeometry(0.93, 1, 64);
    this.mats = new Map();
  }

  _mat(color, additive = false) {
    const k = String(color) + additive;
    let m = this.mats.get(k);
    if (!m) { m = new THREE.MeshBasicMaterial({ color, transparent: additive, opacity: additive ? 0.9 : 1, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: false }); this.mats.set(k, m); }
    return m;
  }

  clear() {
    for (const s of this.shots) this.g.scene.remove(s.mesh);
    for (const b of this.beams) this.g.scene.remove(b.mesh);
    for (const r of this.rings) { this.g.scene.remove(r.mesh); r.mesh.material.dispose(); }
    this.shots = []; this.beams = []; this.rings = [];
    this.g.fx.clearOwner?.(this.g);
  }

  /* ───────── Partikel & Blitze ───────── */
  explosion(x, y, z, o = {}) { this.g.fx.explosion(_a.set(x, y, z).clone(), clamp(o.scale ?? 1, 0.2, 3), this.g); }

  // Partikelstoß: count, color, color2, speed, life, size, gravity, spread (0 = gerade, 1 = Kugel), dir {x,y,z}, soft (Rauch statt Glut)
  burst(x, y, z, o = {}) {
    const n = clamp(Math.round(o.count ?? 14), 1, 90), c0 = col(o.color ?? '#ffd890'), c1 = col(o.color2 ?? o.color ?? '#c03810');
    const layer = o.soft ? this.g.fx.smoke : this.g.fx.fire, sp = o.spread ?? 1, d = o.dir ? _b.set(o.dir.x, o.dir.y, o.dir.z).normalize() : _b.set(0, 1, 0);
    for (let i = 0; i < n; i++) {
      const v = _a.set(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize().multiplyScalar(sp).addScaledVector(d, 1 - sp * 0.5).normalize().multiplyScalar((o.speed ?? 4) * rnd(0.5, 1));
      layer.emit({ pos: [x, y, z], vel: [v.x, v.y, v.z], life: (o.life ?? 0.6) * rnd(0.7, 1.2), s0: o.size ?? 0.18, s1: (o.size ?? 0.18) * (o.soft ? 4 : 0.3), c0, c1, a0: o.alpha ?? (o.soft ? 0.4 : 0.9), a1: 0, drag: o.drag ?? 0.8, grav: o.gravity ?? (o.soft ? 0.3 : -5) });
    }
  }

  // Mündungsfeuer: kurzer Blitz mit Funken in Schussrichtung (dir)
  muzzle(x, y, z, o = {}) {
    const s = o.size ?? 0.35, c0 = col(o.color ?? '#fff0c0'), c1 = col(o.color2 ?? '#ff9a30');
    this.g.fx.fire.emit({ pos: [x, y, z], life: 0.07, s0: s * 3, s1: s * 1.4, c0, c1, a0: 0.95, a1: 0, drag: 0 });
    const d = o.dir ?? { x: 0, y: 0, z: 1 }, L = Math.hypot(d.x, d.y, d.z) || 1;
    for (let i = 0; i < 4; i++) this.g.fx.fire.emit({ pos: [x, y, z], vel: [(d.x / L) * rnd(4, 9) + rnd(-1.5, 1.5), (d.y / L) * rnd(4, 9) + rnd(-1, 1.5), (d.z / L) * rnd(4, 9) + rnd(-1.5, 1.5)], life: rnd(0.12, 0.3), s0: s * 0.7, s1: s * 0.1, c0, c1, a0: 0.9, a1: 0, drag: 2 });
    if (o.smoke !== false) this.g.fx.smoke.emit({ pos: [x, y, z], vel: [(d.x / L) * 1.2, (d.y / L) * 1.2 + 0.4, (d.z / L) * 1.2], life: rnd(0.5, 0.9), s0: s * 0.8, s1: s * 2.6, c0: col('#9a948a'), c1: col('#cfc8bc'), a0: 0.28, a1: 0, drag: 1.2, grav: 0.3 });
  }

  // Sichtbarer Strahl von a nach b (z. B. Laser); color, width, sec
  beam(a, b, o = {}) {
    const len = Math.hypot(b.x - a.x, (b.y ?? 0) - (a.y ?? 0), b.z - a.z);
    if (len < 0.01) return;
    let t = this.beams.find((q) => q.age >= q.life);
    if (!t) {
      if (this.beams.length >= 80) return;
      const mesh = new THREE.Mesh(this.boltGeo, this._mat(0xffffff, true));
      mesh.frustumCulled = false; this.g.scene.add(mesh);
      t = { mesh, age: 99, life: 0 }; this.beams.push(t);
    }
    t.mesh.material = this._mat(o.color ?? '#7ae8ff', true);
    t.mesh.position.set((a.x + b.x) / 2, ((a.y ?? 0) + (b.y ?? 0)) / 2, (a.z + b.z) / 2);
    t.mesh.lookAt(b.x, b.y ?? 0, b.z);
    const w = o.width ?? 0.07;
    t.mesh.scale.set(w, w, len);
    t.mesh.visible = true; t.age = 0; t.life = o.sec ?? 0.12;
  }

  // Bodenring. Mit sec: einmaliger Puls (wächst und verblasst). Ohne sec: bleibt, bis remove() – set({x,z,r,color,opacity}) ändert ihn.
  ring(x, z, r, o = {}) {
    const m = new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({ color: o.color ?? '#62b9a8', transparent: true, opacity: o.opacity ?? 0.7, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, (o.y ?? 0) + 0.09, z); m.scale.setScalar(Math.max(0.01, r));
    this.g.scene.add(m);
    const h = {
      mesh: m, r, sec: o.sec ?? 0, age: 0, op: o.opacity ?? 0.7, removed: false,
      set: (p = {}) => {
        if (p.x != null) m.position.x = p.x; if (p.z != null) m.position.z = p.z;
        if (p.r != null) { h.r = p.r; m.scale.setScalar(Math.max(0.01, p.r)); }
        if (p.color != null) m.material.color.set(p.color);
        if (p.opacity != null) { h.op = p.opacity; m.material.opacity = p.opacity; }
        if (p.visible != null) m.visible = !!p.visible;
        return h;
      },
      remove: () => { if (h.removed) return; h.removed = true; this.g.scene.remove(m); m.material.dispose(); this.rings = this.rings.filter((q) => q !== h); },
    };
    this.rings.push(h);
    return h;
  }

  /* ───────── Flächenschaden ───────── */
  // Explosion mit Schaden: radius, damage, team (wer schießt: Feinde dieses Teams werden getroffen), owner, scale (nur Optik)
  explodeArea(x, y, z, o = {}) {
    const g = this.g, R = o.radius ?? 5, dmg = o.damage ?? 30, team = o.team ?? o.owner?.team ?? 'player';
    if (o.visual !== false) this.explosion(x, y, z, { scale: o.scale ?? clamp(R / 6, 0.35, 1.8) });
    const by = o.owner ?? { x, z, team };
    for (const u of g.units.slice()) {
      if (u.dead || u.removed || !g.hostile(team, u.team)) continue;
      const d = Math.hypot(u.x - x, (u.y + u.height * 0.5) - y, u.z - z) - u.hitR;
      if (d > R) continue;
      g.damageUnit(u, dmg * (0.25 + 0.75 * (1 - clamp(d / R, 0, 1))), by);
    }
    for (const t of g.things.slice()) {
      if (t.hp == null || t.dead || !t.team || !g.hostile(team, t.team)) continue;
      let d = Math.hypot(t.x - x, t.z - z) - t.radius;
      if (t.hits) { d = Infinity; for (const v of t.hitVolumes()) d = Math.min(d, Math.sqrt(segSeg(x, y, z, x, y, z, v.x, v.y, v.z, v.x2, v.y2, v.z2)) - v.r); }
      if (d <= R) t.damage(dmg * (0.25 + 0.75 * (1 - clamp(d / R, 0, 1))), by);
    }
    const P = g.player;
    if (P.alive && !P.ghost && g.hostile(team, 'player')) {
      const d = Math.hypot(P.x - x, P.y + 0.9 - y, P.z - z);
      if (d < R) g.hurtPlayer(dmg * 0.5 * (1 - d / R), x, z);
    }
    g._noise(x, z, 60);
  }

  /* ───────── Projektile ───────── */
  // from {x,y,z}; to {x,y,z} ODER target (Einheit/Thing/'player'); speed m/s; damage; splash (Radius); team; owner; color; size;
  // shape 'ball' | 'bolt' | 'rocket'; gravity; homing (Lenkrate rad/s); life (s); trail; onHit(info)
  shoot(o = {}) {
    const g = this.g, f = o.from;
    if (!f || f.x == null) { g.warn('shoot: „from“ ({x, y, z}) fehlt'); return null; }
    const tgt = o.target === 'player' ? g.player : o.target ?? null;
    let to = o.to;
    if (!to && tgt) to = { x: tgt.x, y: (tgt.y ?? 0) + (tgt.height ?? 1.6) * 0.55, z: tgt.z };
    if (!to && !o.dir) { g.warn('shoot: „to“, „target“ oder „dir“ fehlt'); return null; }
    const from = { x: f.x, y: f.y ?? 1, z: f.z };
    const dv = o.dir ? _a.set(o.dir.x, o.dir.y, o.dir.z) : _a.set(to.x - from.x, (to.y ?? 1) - from.y, to.z - from.z);
    if (dv.lengthSq() < 1e-8) dv.set(0, 0, 1);
    const speed = o.speed ?? 30, grav = o.gravity ?? 0;
    const vel = dv.clone().normalize().multiplyScalar(speed);
    if (grav && to) { // Flugbahn vorhalten: bei Schwerkraft die Anfangshöhe so wählen, dass das Ziel getroffen wird
      const T = Math.max(0.05, Math.hypot(to.x - from.x, to.z - from.z) / speed);
      const flat = _b.set(to.x - from.x, 0, to.z - from.z).normalize().multiplyScalar(speed);
      vel.set(flat.x, ((to.y ?? 1) - from.y) / T + 0.5 * grav * T, flat.z);
    }
    const shape = o.shape ?? 'ball', size = o.size ?? (shape === 'rocket' ? 0.14 : 0.16), color = o.color ?? (shape === 'rocket' ? '#ffd08a' : '#ffd070');
    const mesh = new THREE.Mesh(shape === 'ball' ? this.ballGeo : this.boltGeo, this._mat(color, shape !== 'rocket'));
    mesh.frustumCulled = false;
    if (shape === 'ball') mesh.scale.setScalar(size); else if (shape === 'bolt') mesh.scale.set(size * 0.5, size * 0.5, size * 5); else mesh.scale.set(size, size, size * 4);
    mesh.position.set(from.x, from.y, from.z);
    g.scene.add(mesh);
    const team = o.team ?? o.owner?.team ?? 'player';
    const s = {
      mesh, pos: new THREE.Vector3(from.x, from.y, from.z), vel, grav, shape, size, color, team, owner: o.owner ?? null,
      damage: o.damage ?? 10, splash: o.splash ?? 0, homing: o.homing ?? 0, target: tgt, life: o.life ?? 6, age: 0, onHit: o.onHit,
      trail: o.trail ?? (shape !== 'ball'), trailColor: col(o.trailColor ?? color), dead: false, origin: from,
      remove() { this.dead = true; },
    };
    this.shots.push(s);
    return s;
  }

  _hitTest(s, p0, p1) {
    const g = this.g;
    let best = null, bt = 1;
    const dx = p1.x - p0.x, dy = p1.y - p0.y, dz = p1.z - p0.z, a = dx * dx + dz * dz;
    const test = (obj, r, y0, y1) => {
      let t = 0;
      if (a > 1e-9) t = clamp(-((p0.x - obj.x) * dx + (p0.z - obj.z) * dz) / a, 0, 1);
      const x = p0.x + dx * t - obj.x, z = p0.z + dz * t - obj.z;
      if (x * x + z * z > (r + s.size) ** 2) return;
      const y = p0.y + dy * t;
      if (y < y0 - 0.15 || y > y1 + 0.15) return;
      if (t < bt) { bt = t; best = obj; }
    };
    for (const u of g.units) { if (u.dead || u.removed || !g.hostile(s.team, u.team) || (u === s.owner)) continue; test(u, u.hitR, u.y, u.y + u.height); }
    let zone = null, zmult = 1;
    for (const t of g.things) {
      if (t.hp == null || t.dead || !t.team || !g.hostile(s.team, t.team) || t === s.owner) continue;
      if (t.hits) { const h = t.segHit(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, s.size); if (h && h.u < bt) { bt = h.u; best = t; zone = h.zone; zmult = h.mult; } }
      else { const b0 = best; test(t, t.radius, t.y, t.y + t.height); if (best !== b0) { zone = null; zmult = 1; } }
    }
    const P = g.player;
    if (P.alive && !P.ghost && g.hostile(s.team, 'player') && s.owner !== 'player') test(P, 0.5, P.y, P.y + 1.8);
    return best ? { obj: best, t: bt, zone, mult: zmult } : null;
  }

  _finish(s, point, obj, type) {
    const g = this.g;
    s.dead = true;
    const by = s.owner ?? { x: s.origin.x, z: s.origin.z, team: s.team };
    if (s.splash > 0) this.explodeArea(point.x, point.y, point.z, { radius: s.splash, damage: s.damage, team: s.team, owner: by });
    else {
      if (obj) { if (obj === g.player) g.hurtPlayer(s.damage, s.origin.x, s.origin.z); else if (obj.isThing) obj.damage(s.damage * (s.zmult ?? 1), by, s.zone ?? null); else g.damageUnit(obj, s.damage, by); }
      g.fx.sparks(_a.set(point.x, point.y, point.z).clone(), 4, 0.4);
    }
    try { s.onHit?.({ zone: s.zone ?? null, x: point.x, y: point.y, z: point.z, unit: obj && !obj.isThing && obj !== g.player ? obj : null, thing: obj?.isThing ? obj : null, player: obj === g.player, type }); } catch (e) { g.onError(e, 'shoot onHit'); }
  }

  update(dt, playing) {
    const g = this.g;
    for (let i = this.beams.length - 1; i >= 0; i--) { const b = this.beams[i]; if (b.age < b.life) { b.age += dt; if (b.age >= b.life) b.mesh.visible = false; } }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      if (!r.sec) continue;
      r.age += dt;
      const k = r.age / r.sec;
      if (k >= 1) { r.remove(); continue; }
      r.mesh.scale.setScalar(Math.max(0.01, r.r * (0.3 + 0.7 * k)));
      r.mesh.material.opacity = r.op * (1 - k);
    }
    if (!playing) return;
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i];
      if (s.dead) { g.scene.remove(s.mesh); this.shots.splice(i, 1); continue; }
      s.age += dt;
      if (s.homing && s.target && !s.target.dead && !s.target.removed) {
        const T = s.target, ty = (T.y ?? 0) + (T.height ?? 1.6) * 0.55;
        const want = _a.set(T.x - s.pos.x, ty - s.pos.y, T.z - s.pos.z).normalize(), sp = s.vel.length(), cur = _b.copy(s.vel).normalize();
        const ang = Math.acos(clamp(cur.dot(want), -1, 1)), k = ang > 1e-4 ? Math.min(1, (s.homing * dt) / ang) : 1;
        cur.lerp(want, k).normalize();
        s.vel.copy(cur.multiplyScalar(sp));
      }
      if (s.grav) s.vel.y -= s.grav * dt;
      const p0 = s.pos.clone(), p1 = p0.clone().addScaledVector(s.vel, dt);
      let hit = null, point = p1, type = '';
      const dir = _a.copy(s.vel).normalize(), step = s.vel.length() * dt;
      const tw = g.cm.raycastWorld(p0.x, p0.y, p0.z, dir.x, dir.y, dir.z, step);
      let tMax = 1;
      if (tw < Infinity) { tMax = tw / Math.max(step, 1e-6); type = 'world'; }
      if (p1.y <= g.world.groundY(p1.x, p1.z) + 0.02) { const tg = (p0.y - g.world.groundY(p0.x, p0.z)) / Math.max(1e-6, p0.y - p1.y); if (tg >= 0 && tg < tMax) { tMax = tg; type = 'ground'; } }
      const h = this._hitTest(s, p0, p1);
      if (h && h.t <= tMax) { hit = h.obj; tMax = h.t; type = hit.isThing ? 'thing' : hit === g.player ? 'player' : 'unit'; s.zone = h.zone; s.zmult = h.mult; }
      if (type) {
        point = p0.clone().lerp(p1, tMax);
        this._finish(s, point, hit, type);
        g.scene.remove(s.mesh); this.shots.splice(i, 1);
        continue;
      }
      s.pos.copy(p1);
      s.mesh.position.copy(p1);
      if (s.shape !== 'ball') s.mesh.quaternion.setFromUnitVectors(_b.set(0, 0, 1), dir);
      if (s.trail) g.fx.fire.emit({ pos: [p1.x, p1.y, p1.z], life: 0.28, s0: s.size * 3.2, s1: 0.02, c0: s.trailColor, c1: s.trailColor, a0: 0.55, a1: 0, drag: 0 });
      if (s.age > s.life || p1.length() > 900) { s.dead = true; if (s.splash > 0 && s.shape === 'rocket') this._finish(s, p1, null, 'timeout'); g.scene.remove(s.mesh); this.shots.splice(i, 1); }
    }
  }
}
