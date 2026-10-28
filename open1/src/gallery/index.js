// Galerie-Adapter: holt Fahrzeuge aus der „Objekt-Galerie“ (Legacy-API: build(T, GC, opts) → api) in die Stadt.
//
//   • T      – eine Kopie von three, deren Punkt-/Spotlichter ihre Helligkeit mit K malnehmen (alte Galerie-Einheiten → r186)
//   • GC     – die gemeinsamen Werkzeuge (gc.js)
//   • world  – { heightAt(x,z), obsAt(x,z), shake }: Gelände und Hindernisse der Stadt
//   • Maßstab: `scale` (Buggy 0,5) – das ganze Modell samt Physik rechnet im alten Maßstab in einer Gruppe mit Skalierung; Zeit läuft
//     mit 1/√scale schneller (Froude-Ähnlichkeit: Geschwindigkeit ∝ √Größe, Beschleunigung und Schwerkraft bleiben gleich)
//   • Probelauf: der Wagen wird kurz mit allen Eingaben gefahren; was sich dabei nie bewegt, wird je Material zu EINEM Netz
//     verschmolzen (aus ~400 Draw-Calls werden ~40). Bewegte Teile (Räder, Federung, Lenkrad, Flamme …) bleiben einzeln.
//
// Neue Modelle: Datei nach src/gallery/ kopieren, `export default ({ … })` statt `Gallery.add({ … })`, hier eintragen.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GC } from './gc.js';
import buggy from './buggy.js';

export const GALLERY = {
  // hw/hl: halbe Breite/Länge des Stellplatzes im Modell-Maßstab (Meter bei scale 1); scale: Größe in der Stadt;
  // camK: Kameraabstand relativ zur Größe (1 = mitskaliert; 1,5 = etwas weiter weg, damit der kleine Wagen nicht den Bildschirm füllt)
  buggy: { def: buggy, name: 'Buggy „Skarab“', kind: 'ground', hw: 1.75, hl: 3.3, scale: 0.5, camK: 1.5 },
};

/* ───── Lichtstärke: alte Galerie-Werte → physikalische Einheiten der Stadt (Sonne 7,2, Laternen ×34) ───── */
export const LIGHT_K = { point: 11, spot: 6 };
// Beim Verkleinern (scale S) rücken Lichter und Oberflächen zusammen: Reichweite × S, Helligkeit × S^decay, damit das Bild gleich bleibt
let CUR_S = 1;
class LPoint extends THREE.PointLight {
  constructor(...a) { super(...a); this._S = CUR_S; this.distance *= CUR_S; }
  get intensity() { return this._i ?? 0; }
  set intensity(v) { this._i = v * LIGHT_K.point * Math.pow(this._S ?? 1, this.decay ?? 2); }
}
class LSpot extends THREE.SpotLight {
  constructor(...a) { super(...a); this._S = CUR_S; this.distance *= CUR_S; }
  get intensity() { return this._i ?? 0; }
  set intensity(v) { this._i = v * LIGHT_K.spot * Math.pow(this._S ?? 1, this.decay ?? 2); }
}
const T = Object.assign({}, THREE, { PointLight: LPoint, SpotLight: LSpot });

/* ───── Probelauf + Verschmelzen ───── */
const sig = (o) => {
  const a = [o.position.x, o.position.y, o.position.z, o.quaternion.x, o.quaternion.y, o.quaternion.z, o.quaternion.w, o.scale.x, o.scale.y, o.scale.z, o.visible ? 1 : 0];
  if (o.isMesh) {
    const m = o.material;
    if (Array.isArray(m)) a.push(NaN);
    else a.push(o.geometry.attributes.position.version, m.opacity ?? 1, m.color ? m.color.r + m.color.g * 3 + m.color.b * 7 : 0, m.map && m.map.offset ? m.map.offset.x + m.map.offset.y : 0, m.visible ? 1 : 0);
  }
  return a;
};

function mergeStatic(root, dyn) {
  const list = [];
  root.traverse((o) => { if (o !== root) list.push(o); });
  const groups = new Map();
  const M = new THREE.Matrix4();
  let before = 0;
  for (const o of list) {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh) continue;
    before++;
    const m = o.material;
    if (dyn.has(o) || Array.isArray(m) || m.transparent || m.isShaderMaterial || !o.visible) continue;
    const g0 = o.geometry;
    if (!g0.attributes.position || (g0.morphAttributes && Object.keys(g0.morphAttributes).length)) continue;
    // Anker = nächster bewegter Vorfahr (oder die Wurzel); unterwegs darf nichts ausgeblendet sein
    let a = o.parent, hidden = false;
    while (a && a !== root && !dyn.has(a)) { if (!a.visible) hidden = true; a = a.parent; }
    if (hidden || !a) continue;
    o.updateMatrix();
    M.copy(o.matrix);
    for (let n = o.parent; n && n !== a; n = n.parent) { n.updateMatrix(); M.premultiply(n.matrix); }
    if (M.determinant() <= 0) continue;
    const key = `${a.uuid}|${m.uuid}|${o.castShadow ? 1 : 0}${o.receiveShadow ? 1 : 0}|${o.renderOrder}`;
    let G = groups.get(key);
    if (!G) groups.set(key, (G = { a, m, cast: o.castShadow, recv: o.receiveShadow, order: o.renderOrder, items: [] }));
    G.items.push({ o, M: M.clone() });
  }
  let merged = 0;
  for (const G of groups.values()) {
    if (G.items.length < 2) continue;
    const geos = G.items.map(({ o, M: mat }) => {
      const g = o.geometry.clone();
      for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
      if (!g.attributes.normal) g.computeVertexNormals();
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      g.clearGroups();
      g.applyMatrix4(mat);
      return g;
    });
    const mixed = geos.some((g) => !!g.index) && geos.some((g) => !g.index);
    const geo = mergeGeometries(mixed ? geos.map((g) => (g.index ? g.toNonIndexed() : g)) : geos, false);
    if (!geo) continue;
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, G.m);
    mesh.castShadow = G.cast;
    mesh.receiveShadow = G.recv;
    mesh.renderOrder = G.order;
    mesh.name = 'merged';
    G.a.add(mesh);
    for (const { o } of G.items) o.parent.remove(o);
    merged += G.items.length;
  }
  let after = 0;
  root.traverse((o) => { if (o.isMesh && !o.isInstancedMesh && o.visible) after++; });
  return { before, merged, after };
}

// Probelauf: `phases` sind Funktionen (check) => …, die das Modell bewegen und nach jedem Bild check() rufen.
// Danach werden alle Netze, die sich nie bewegt haben, je Material (und beweglichem Vorfahren) zu einem Netz verschmolzen.
export function probeAndMerge(root, phases) {
  const nodes = [];
  root.traverse((o) => { if (o !== root) nodes.push(o); });
  const base = nodes.map(sig);
  const dyn = new Set();
  const check = () => nodes.forEach((o, i) => {
    if (dyn.has(o)) return;
    const s = sig(o), b = base[i];
    for (let k = 0; k < s.length; k++) if (!(Math.abs(s[k] - b[k]) <= 1e-6)) { dyn.add(o); break; }
  });
  for (const ph of phases) ph(check);
  let info = { before: 0, merged: 0, after: 0 };
  try { info = mergeStatic(root, dyn); } catch (e) { console.warn('Verschmelzen übersprungen:', e); }
  return { nodes: nodes.length, dynamic: dyn.size, ...info };
}

export class Actor {
  constructor(id, env) {
    const meta = GALLERY[id];
    if (!meta) throw new Error('Unbekanntes Galerie-Modell: ' + id);
    this.id = id;
    this.meta = meta;
    this.env = env;
    const S = (this.S = meta.scale ?? 1);
    this.k = 1 / Math.sqrt(S); // Zeitraffer des Modells
    this.hw = meta.hw * S; // Stellplatz in Metern
    this.hl = meta.hl * S;
    this.margin = 0.45 * S; // Sicherheitsabstand zu Hauswänden
    // Das Modell lebt in seinem eigenen Maßstab; heightAt/obsAt rechnen von dort in Stadt-Meter um
    this.world = { heightAt: (x, z) => env.heightAt(x * S, z * S) / S, obsAt: (x, z) => env.obsAt(x * S, z * S, this.margin), shake: 0 };
    CUR_S = S;
    try { this.api = meta.def.build(T, GC, { world: this.world }); } finally { CUR_S = 1; }
    this.root = this.api.root;
    this.pw = this.api.world;
    this.holder = new THREE.Group();
    this.holder.name = 'actor-' + id;
    this.holder.scale.setScalar(S);
    this.holder.add(this.root, this.pw);
    this.ptSz = { value: 600 }; // Punktgröße der Partikel (Pixel je Meter), mit S malgenommen
    this.holder.traverse((o) => { if (o.isPoints && o.material.uniforms && o.material.uniforms.uSz) o.material.uniforms.uSz = this.ptSz; });
    this._f = new THREE.Vector3();
    this.time = 0;
    this.night = -1;
    this.autoLights = true;
    this.parked = false;
    this.saved = null;
    this.onChange = null;
    this.actions = this.api.actions ?? [];
    this.stats = this._probe();
    env.scene.add(this.holder);
  }

  _probe() {
    const { api, root } = this;
    let t = 0;
    const run = (n, I, check, dt = 0.05) => { for (let i = 0; i < n; i++) { t += dt; api.update(dt, t, I); check(); } };
    const act = (on) => this.actions.forEach((a) => (a.steps ? a.fn(on ? 1 : a.i ?? 0) : a.fn(on ? true : !!a.on)));
    const info = probeAndMerge(root, [
      (c) => run(20, {}, c),
      (c) => run(30, { sy: 1, sx: -0.7 }, c),
      (c) => { api.setNight?.(1); api.setLights?.(1); act(true); run(30, { sy: 1, sx: 0.7, boost: true }, c); },
      (c) => run(16, { sy: -1, jump: true, sx: 0.4 }, c),
      (c) => run(10, {}, c),
      () => { api.setNight?.(0); api.setLights?.(0); act(false); run(40, {}, () => {}, 0.1); }, // Partikel auslaufen lassen, Wagen zur Ruhe kommen lassen
    ]);
    api.teleport?.(0, 0, 0);
    api.update(0.05, t, {});
    return info;
  }

  // Stadt-Meter
  get x() { return this.parked && this.saved ? this.saved.x : this.api.state.x * this.S; }
  get z() { return this.parked && this.saved ? this.saved.z : this.api.state.z * this.S; }
  get ry() { return this.parked && this.saved ? this.saved.ry : this.api.state.ry; }
  get speed() { return Math.hypot(this.api.state.vx, this.api.state.vz) * this.S * this.k; } // m/s in der Stadt
  get focus() { return this._f.copy(this.api.focus).multiplyScalar(this.S); }

  place(x, z, ry = this.ry) {
    if (this.parked) { this.saved = { x, z, ry }; return; }
    this.api.teleport(x / this.S, z / this.S, ry);
  }

  // Verfolgerkamera-Wunsch des Modells (Abstand in Stadt-Metern) oder null
  chase() {
    const c = this.api.chase ? this.api.chase() : null;
    return c ? { ...c, dist: c.dist * this.S * (this.meta.camK ?? 1) } : null;
  }

  hud() {
    const t = this.api.hud ? this.api.hud() : '';
    return t.replace(/GESCHW\s+\d+/, 'GESCHW ' + Math.round(this.speed * 3.6));
  }

  // Pixel je Meter in 1 m Entfernung (Höhe des Zeichenpuffers / (2·tan(fov/2)))
  setPointScale(pxPerM) { this.ptSz.value = pxPerM * this.S; }

  // Aktionsknöpfe: Umschalter (on) oder Stufen (steps)
  toggle(i) {
    const a = this.actions[i];
    if (!a) return;
    if (a.id === 'lights') this.autoLights = false;
    if (a.steps) { a.i = ((a.i ?? 0) + 1) % a.steps.length; a.fn(a.i); } else { a.on = !a.on; a.fn(a.on); }
    this.onChange && this.onChange();
  }

  _lights(on) {
    const a = this.actions.find((q) => q.id === 'lights');
    if (a && a.on === on) return;
    this.api.setLights(on ? 1 : 0);
    if (a) a.on = on;
    this.onChange && this.onChange();
  }

  // Ein Schritt: Eingabe I = { sx, sy, jump, boost }; nightK 0…1
  update(dt, I, nightK) {
    if (Math.abs(nightK - this.night) > 0.015) {
      this.night = nightK;
      this.api.setNight(nightK);
      if (this.autoLights) this._lights(nightK > 0.3);
    }
    const dm = dt * this.k, n = Math.max(1, Math.ceil(dm / 0.05)); // Modellzeit; große Schritte teilen
    for (let i = 0; i < n; i++) { this.time += dm / n; this.api.update(dm / n, this.time, I); }
    return this.world.shake * this.S;
  }

  // In der Werkstatt: weit unter dem Boden parken (die Lichter bleiben in der Szene, damit sich nichts neu übersetzt)
  park() {
    if (this.parked) return;
    this.parked = true;
    const s = this.api.state;
    this.api.setNight(0);
    this.api.setLights(0);
    this.night = -1;
    this.saved = { x: s.x * this.S, z: s.z * this.S, ry: s.ry };
    this.holder.position.y = -900;
    this.pw.visible = false;
  }

  unpark() {
    if (!this.parked) return;
    this.parked = false;
    const s = this.saved;
    this.holder.position.y = 0;
    this.pw.visible = true;
    if (s) this.api.teleport(s.x / this.S, s.z / this.S, s.ry);
  }
}
