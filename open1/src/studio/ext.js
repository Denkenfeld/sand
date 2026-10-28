// Erweiterungsschicht: Module mit Lebenszyklus und eigenem Ressourcen-Bereich, Zeit-Vertrag (feste Schritte), Diagnose.
// Ein Modul ist ein benanntes Stück Spiellogik (game.module). Alles, was es über seinen `ctx` anlegt, gehört ihm und wird beim
// Deaktivieren, Entfernen, Neustart und Skriptwechsel wieder aufgeräumt – ohne dass das Modul selbst aufräumen muss.
import * as THREE from 'three';
import { makePresets } from './presets.js';

const clone = (v) => (v === undefined ? undefined : v === null ? null : JSON.parse(JSON.stringify(v)));
const HOOKS = ['init', 'enable', 'update', 'frame', 'disable', 'save', 'load', 'dispose'];
const KEYS = new Set([...HOOKS, 'deps', 'state', 'version', 'auto', 'doc']);

// Geometrien, Materialien und Texturen eines Objektbaums freigeben (userData.shared = true schützt gemeinsam genutzte Ressourcen)
export function disposeTree(obj) {
  obj.parent?.remove(obj);
  obj.traverse((o) => {
    if (o.isInstancedMesh) o.dispose?.();
    if (o.geometry && !o.geometry.userData?.shared) o.geometry.dispose();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of mats) {
      if (m.userData?.shared) continue;
      for (const v of Object.values(m)) if (v && v.isTexture && !v.userData?.shared) v.dispose();
      m.dispose();
    }
  });
}

// Ressourcen-Bereich: Dinge, die einem Modul (oder einer Aktivierung) gehören. Dinge mit Markierung `scope` werden vom Spiel eingesammelt.
export class Scope {
  constructor(g, name) { this.g = g; this.name = name; this.items = []; this.dead = false; }
  own(x, key = x) {
    let fn = null;
    if (typeof x === 'function') fn = x;
    else if (x && x.isObject3D) fn = () => disposeTree(x);
    else if (x && typeof x.dispose === 'function') fn = () => x.dispose();
    else if (x && typeof x.cancel === 'function') fn = () => x.cancel();
    if (!fn) return x;
    if (this.dead) { this._run(fn); return x; }
    this.items.push({ key, fn });
    return x;
  }
  // Ein einzelnes Eigentum sofort freigeben
  release(key) {
    const i = this.items.findIndex((e) => e.key === key);
    if (i < 0) return false;
    const [e] = this.items.splice(i, 1);
    this._run(e.fn);
    return true;
  }
  _run(fn) { try { fn(); } catch (e) { this.g.onError(e, 'Aufräumen (' + this.name + ')'); } }
  dispose() {
    if (this.dead) return;
    this.dead = true;
    const it = this.items; this.items = [];
    for (let i = it.length - 1; i >= 0; i--) this._run(it[i].fn);
    this.g._sweep(this);
  }
}

export class Modules {
  constructor(g) { this.g = g; this.map = new Map(); this.order = []; this.queue = []; this.gen = 0; this.seq = 0; }

  get count() { return this.map.size; }
  get active() { let n = 0; for (const m of this.order) if (m.state === 'active') n++; return n; }

  // Alles aufräumen (Neustart, Stopp, Skriptwechsel): Abhängige zuerst
  reset() {
    this.gen++;
    for (let i = this.order.length - 1; i >= 0; i--) this._dispose(this.order[i]);
    for (const m of this.map.values()) if (m.state !== 'disposed') this._dispose(m);
    this.map.clear(); this.order = []; this.queue = [];
  }

  define(name, def, makeCtx) {
    const g = this.g;
    if (typeof name !== 'string' || !/^[\w.\-]{1,40}$/.test(name)) { g.warn('module: Der erste Parameter ist der Modulname (Text ohne Leerzeichen, bis 40 Zeichen)'); return null; }
    if (typeof def === 'function') def = { enable: def };
    if (!def || typeof def !== 'object') { g.warn('module „' + name + '“: zweiter Parameter ist ein Objekt mit Hooks (init, enable, update, frame, disable, save, load, dispose) oder eine Funktion'); return null; }
    if (this.map.has(name)) { g.warn('module „' + name + '“ ist schon registriert – die zweite Registrierung wurde ignoriert (game.modules.remove("' + name + '") entfernt das erste)'); return this.map.get(name).handle; }
    for (const [k, v] of Object.entries(def)) {
      if (!KEYS.has(k)) g.warn('module „' + name + '“: unbekannte Eigenschaft „' + k + '“ – gültig sind ' + [...KEYS].join(', '));
      else if (HOOKS.includes(k) && typeof v !== 'function') g.warn('module „' + name + '“: „' + k + '“ muss eine Funktion sein');
    }
    if (def.deps != null && !Array.isArray(def.deps)) { g.warn('module „' + name + '“: „deps“ ist eine Liste von Modulnamen'); return null; }
    const m = {
      name, def, seq: this.seq++, state: 'new', want: def.auto !== false, deps: [...(def.deps ?? [])], err: null,
      inst: new Scope(g, name + ' (Modul)'), act: null, state0: def.state ? clone(def.state) : null, ctx: null, root: null,
    };
    m.ctx = makeCtx(m);
    m.handle = {
      name, get state() { return m.state; }, get error() { return m.err ? String(m.err.message ?? m.err) : null; },
      enable: () => this.enable(name), disable: () => this.disable(name), get ctx() { return m.ctx; },
    };
    this.map.set(name, m); this.queue.push(m);
    if (!g._booting) this.flush();
    return m.handle;
  }

  // Alle neu registrierten Module initialisieren: Abhängigkeiten zuerst, sonst in Registrierungsreihenfolge
  flush() {
    const q = this.queue; this.queue = [];
    const done = new Set(), busy = new Set(), sorted = [];
    const visit = (m) => {
      if (done.has(m)) return m.state !== 'failed';
      if (busy.has(m)) { this._fail(m, new Error('Abhängigkeiten bilden einen Kreis (' + [...busy].map((x) => x.name).join(' → ') + ' → ' + m.name + ')'), 'deps'); return false; }
      busy.add(m);
      let ok = true;
      for (const d of m.deps) {
        const dm = this.map.get(d);
        if (!dm) { this._fail(m, new Error('braucht das Modul „' + d + '“, das nicht registriert ist'), 'deps'); ok = false; break; }
        if (dm.state === 'new' && !visit(dm)) { this._fail(m, new Error('braucht das Modul „' + d + '“, das nicht startet'), 'deps'); ok = false; break; }
        if (dm.state === 'failed' || dm.state === 'disposed') { this._fail(m, new Error('braucht das Modul „' + d + '“, das nicht läuft'), 'deps'); ok = false; break; }
      }
      busy.delete(m); done.add(m);
      if (ok) sorted.push(m);
      return ok;
    };
    for (const m of q) if (m.state === 'new') visit(m);
    for (const m of sorted) { this.order.push(m); }
    for (const m of sorted) if (m.state === 'new') this._init(m);
    this._tryEnable();
  }

  _fail(m, e, where) {
    m.state = 'failed'; m.err = e;
    if (m.act) { m.act.dispose(); m.act = null; }
    m.inst.dispose();
    this.g.onError(e instanceof Error ? e : new Error(String(e)), 'Modul „' + m.name + '“ (' + where + ')');
  }

  _init(m) {
    m.state = 'loading';
    const gen = this.gen;
    let r;
    try { r = m.def.init?.(m.ctx); } catch (e) { this._fail(m, e, 'init'); return; }
    if (r && typeof r.then === 'function') {
      r.then(() => { if (gen === this.gen && m.state === 'loading') { m.state = 'ready'; this._tryEnable(); } },
        (e) => { if (gen === this.gen && m.state === 'loading') this._fail(m, e, 'init, asynchron'); });
    } else m.state = 'ready';
  }

  _tryEnable() {
    let changed = true, guard = 0;
    while (changed && guard++ < 50) {
      changed = false;
      for (const m of this.order) {
        if (m.state !== 'ready' || !m.want) continue;
        if (!m.deps.every((d) => this.map.get(d)?.state === 'active')) continue;
        this._enable(m); changed = true;
      }
    }
  }

  _enable(m) {
    m.act = new Scope(this.g, m.name);
    m.state = 'active';
    try { m.def.enable?.(m.ctx); } catch (e) { this._fail(m, e, 'enable'); return; }
    this.g.emit('module', { name: m.name, state: 'active' });
  }

  _disable(m) {
    if (m.state !== 'active') return;
    for (let i = this.order.length - 1; i >= 0; i--) { const d = this.order[i]; if (d !== m && d.state === 'active' && d.deps.includes(m.name)) this._disable(d); }
    try { m.def.disable?.(m.ctx); } catch (e) { this.g.onError(e, 'Modul „' + m.name + '“ (disable)'); }
    m.act?.dispose(); m.act = null;
    m.state = 'ready';
    this.g.emit('module', { name: m.name, state: 'ready' });
  }

  _dispose(m) {
    if (m.state === 'disposed') return;
    if (m.state === 'active') this._disable(m);
    if (m.state !== 'failed') { try { m.def.dispose?.(m.ctx); } catch (e) { this.g.onError(e, 'Modul „' + m.name + '“ (dispose)'); } }
    m.act?.dispose(); m.act = null;
    m.inst.dispose();
    m.state = 'disposed';
  }

  get(name) { return this.map.get(name)?.handle ?? null; }
  has(name) { return this.map.has(name); }
  // Aktueller Eigentums-Bereich eines laufenden Moduls (für wiederhergestellte Objekte beim Laden); null, wenn das Modul nicht aktiv ist
  scopeOf(name) { const inst = name.endsWith(' (Modul)'), m = this.map.get(inst ? name.slice(0, -8) : name); if (!m || m.state === 'failed' || m.state === 'disposed') return null; return inst ? m.inst : m.state === 'active' && m.act && !m.act.dead ? m.act : null; }
  list() { return this.order.map((m) => ({ name: m.name, state: m.state, deps: [...m.deps] })); }
  enable(name) {
    const m = this.map.get(name);
    if (!m) { this.g.warn('modules.enable: Modul „' + name + '“ gibt es nicht. Registriert: ' + ([...this.map.keys()].join(', ') || '(keine)')); return false; }
    m.want = true; this._tryEnable(); return m.state === 'active';
  }
  disable(name) {
    const m = this.map.get(name);
    if (!m) { this.g.warn('modules.disable: Modul „' + name + '“ gibt es nicht'); return false; }
    m.want = false; this._disable(m); return true;
  }
  // Modul ganz entfernen (ruft disable und dispose); der Name wird wieder frei
  remove(name) {
    const m = this.map.get(name);
    if (!m) return false;
    for (let i = this.order.length - 1; i >= 0; i--) { const d = this.order[i]; if (d !== m && d.deps.includes(name) && d.state !== 'disposed') this._dispose(d), this.map.delete(d.name); }
    this._dispose(m); this.map.delete(name); this.order = this.order.filter((x) => this.map.has(x.name));
    return true;
  }

  // Simulationsschritt (nur im Spiel, nicht in der Pause)
  update(dt) {
    for (const m of this.order) {
      if (m.state !== 'active' || !m.def.update) continue;
      try { m.def.update(m.ctx, dt); } catch (e) { this.g.onError(e, 'Modul „' + m.name + '“ (update)'); m.def = { ...m.def, update: null }; }
    }
  }
  // Darstellung (jedes Bild, auch in der Pause); rdt = echte Zeit
  frame(rdt) {
    for (const m of this.order) {
      if (m.state !== 'active' || !m.def.frame) continue;
      try { m.def.frame(m.ctx, rdt); } catch (e) { this.g.onError(e, 'Modul „' + m.name + '“ (frame)'); m.def = { ...m.def, frame: null }; }
    }
  }

  // Zustände sammeln / wiederherstellen (siehe Game.save/load)
  save() {
    const out = {};
    for (const m of this.order) {
      if (m.state === 'failed' || m.state === 'disposed') continue;
      let d;
      try {
        if (typeof m.def.save === 'function') d = clone(m.def.save(m.ctx));
        else if (m.def.state) d = clone(m.ctx.state);
      } catch (e) { this.g.warn('Modul „' + m.name + '“: Zustand lässt sich nicht speichern (' + e.message + ') – nur Zahlen, Text, Listen, Objekte'); continue; }
      if (d !== undefined) out[m.name] = { v: m.def.version ?? 1, data: d };
    }
    return out;
  }
  load(saved) {
    const names = Object.keys(saved ?? {}), unknown = names.filter((n) => !this.map.has(n));
    if (unknown.length) this.g.warn('Der Spielstand enthält Daten für Module, die es im Skript nicht gibt: ' + unknown.join(', ') + ' (ignoriert)');
    for (const m of this.order) {
      const s = saved?.[m.name];
      if (!s || m.state === 'failed' || m.state === 'disposed') continue;
      const ver = m.def.version ?? 1;
      try {
        if (typeof m.def.load === 'function') m.def.load(m.ctx, clone(s.data), s.v ?? 1);
        else if (m.def.state) {
          if (s.v !== ver) this.g.warn('Modul „' + m.name + '“: Version im Spielstand (' + s.v + ') ≠ aktuelle (' + ver + ') – Zustand wird soweit passend übernommen');
          const st = m.ctx.state;
          for (const k of Object.keys(st)) delete st[k];
          Object.assign(st, clone(m.state0), clone(s.data));
        }
      } catch (e) { this.g.onError(e, 'Modul „' + m.name + '“ (load)'); }
    }
  }
}

// Der `ctx` eines Moduls: die öffentliche Schnittstelle (game) plus Versionen, die Eigentum übernehmen.
export function makeCtx(g, api, m) {
  const scope = () => (m.act && !m.act.dead ? m.act : m.inst);
  const ctx = Object.create(api);
  const widgets = new Set();
  const cui = Object.create(api.ui);
  cui.widget = (o) => { const w = api.ui.widget(o); w.scope = scope(); widgets.add(w); return w; };
  cui.clear = () => { for (const w of [...widgets]) { if (!w.removed) w.remove(); widgets.delete(w); } };
  const capi = Object.create(api); capi.ui = cui;
  Object.assign(cui, makePresets(capi));
  const root = () => {
    if (!m.root) {
      m.root = new THREE.Group(); m.root.name = 'module:' + m.name;
      g.scene.add(m.root);
      m.inst.own(() => { disposeTree(m.root); m.root = null; }, 'root');
    }
    return m.root;
  };
  const tag = (x) => { if (x) x.scope = scope(); return x; };
  Object.assign(ctx, {
    name: m.name, game: api, ui: cui,
    state: m.state0 ? clone(m.state0) : {},
    // Eigentum: alles, was hier angemeldet wird, wird beim Deaktivieren (bzw. am Ende des Moduls) freigegeben
    own: (x, key) => scope().own(x, key),
    track: (x, key) => scope().own(x, key),
    release: (key) => (m.act?.release(key) || m.inst.release(key)),
    add: (obj, parent) => { (parent ?? root()).add(obj); scope().own(obj); return obj; },
    on: (name, fn) => { const w = (ev) => fn(ev); w.scope = scope(); g.on(name, w); return () => g.off(name, w); },
    off: (name, fn) => g.off(name, fn),
    every: (sec, fn) => tag(g.every(sec, fn)),
    after: (sec, fn) => tag(g.after(sec, fn)),
    fixed: (hz, fn) => tag(g.fixed(hz, fn)),
    tween: (target, props, sec, o) => tag(g.tween(target, props, sec, o)),
    place: (name, o) => tag(api.place(name, o)),
    spawn: (kind, o) => tag(api.spawn(kind, o)),
    zone: (o) => tag(api.zone(o)),
    hudSet: (key, text) => { api.hud.set(key, text); scope().own(() => api.hud.clear(key), 'hud:' + key); },
  });
  Object.defineProperty(ctx, 'root', { get: root, enumerable: true });
  Object.defineProperty(ctx, 'alive', { get: () => m.state === 'active', enumerable: true });
  g._extendCtx?.(ctx, m, scope, tag);
  return ctx;
}

/* ───────────── Diagnose ───────────── */
export class Diag {
  constructor(g) {
    this.g = g; this.buf = new Float32Array(120); this.n = 0; this.on = false; this.el = null; this.t = 0;
  }
  rec(rdt) { this.buf[this.n++ % 120] = rdt * 1000; }

  frames() {
    const k = Math.min(this.n, 120);
    if (!k) return { avg: 0, p95: 0, max: 0, fps: 0, n: 0 };
    const a = Array.from(this.buf.subarray(0, k)).sort((x, y) => x - y), avg = a.reduce((s, v) => s + v, 0) / k;
    return { avg, p95: a[Math.min(k - 1, Math.floor(k * 0.95))], max: a[k - 1], fps: 1000 / Math.max(avg, 0.01), n: k };
  }

  // Messwerte. o.scene = true zählt zusätzlich alle Objekte der Szene (teurer, nur auf Anfrage)
  stats(o = {}) {
    const g = this.g, fr = this.frames(), info = g.renderer.info, r = info.render, mem = info.memory;
    const out = {
      fps: +fr.fps.toFixed(1), frameMs: { avg: +fr.avg.toFixed(2), p95: +fr.p95.toFixed(2), max: +fr.max.toFixed(2), samples: fr.n },
      sim: { t: +g.t.toFixed(2), real: +g.rt.toFixed(2), scale: g.timeScale, state: g.state },
      objects: {
        units: g.units.filter((u) => !u.dead).length, things: g.things.length, ghosts: g.ghosts.length, pickups: g.pickups.length, zones: g.zones.length,
        projectiles: g.projs.length + g.fx3d.shots.length, beams: g.fx3d.beams.length, rings: g.fx3d.rings.length, tracers: g.tracers.filter((t) => t.live).length,
        instanced: g.assets?.instancedCount ?? 0,
      },
      systems: {
        modules: g.modules.count, modulesActive: g.modules.active,
        handlers: Object.values(g.handlers).reduce((s, l) => s + l.length, 0), timers: g.timers.filter((t) => !t.dead).length, fixed: g.fixeds.filter((f) => !f.dead).length, tweens: g.tweens.filter((t) => !t.done).length,
        widgets: g.ui?.list?.length ?? 0, inputBindings: g.input?.count ?? 0, cameras: g.cams?.count ?? 0,
      },
      render: { drawCalls: r.calls, triangles: r.triangles, geometries: mem.geometries, textures: mem.textures, programs: info.programs?.length ?? null },
      assets: g.assets ? g.assets.stats() : { models: 0 },
      limits: { units: g.opts?.maxUnits ?? 70, tracers: 60, particles: 'feste Ringpuffer – älteste werden überschrieben', shots: 'unbegrenzt, Lebensdauer 6 s', instances: 'je Instanzgruppe fest bei Anlage' },
    };
    if (o.scene) { let n = 0, meshes = 0; g.scene.traverse((x) => { n++; if (x.isMesh) meshes++; }); out.scene = { objects: n, meshes }; }
    return out;
  }

  show(on = true) {
    this.on = !!on;
    if (this.on && !this.el) {
      const el = document.createElement('div');
      el.id = 'forge-diag';
      el.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:50;pointer-events:none;font:11px/1.35 ui-monospace,Menlo,monospace;color:#cfe;background:rgba(0,0,0,.62);padding:5px 8px;border-radius:4px;white-space:pre';
      document.body.appendChild(el); this.el = el;
    }
    if (this.el) this.el.style.display = this.on ? 'block' : 'none';
    if (this.on) this.t = 0;
  }

  tick(rdt) {
    this.rec(rdt);
    if (!this.on) return;
    this.t -= rdt;
    if (this.t > 0) return;
    this.t = 0.5;
    const s = this.stats();
    this.el.textContent =
      `${s.fps} fps  ${s.frameMs.avg} ms (p95 ${s.frameMs.p95}, max ${s.frameMs.max})\n` +
      `Aufrufe ${s.render.drawCalls}  Dreiecke ${s.render.triangles}  Geo ${s.render.geometries}  Tex ${s.render.textures}\n` +
      `Einheiten ${s.objects.units}  Objekte ${s.objects.things}  Geschosse ${s.objects.projectiles}  Instanzen ${s.objects.instanced}\n` +
      `Module ${s.systems.modulesActive}/${s.systems.modules}  Handler ${s.systems.handlers}  Zeitgeber ${s.systems.timers}  Tweens ${s.systems.tweens}  UI ${s.systems.widgets}`;
  }

  dispose() { if (this.el) { this.el.remove(); this.el = null; } this.on = false; }
}
