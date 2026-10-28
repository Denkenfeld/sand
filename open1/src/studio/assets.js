// Modelle (GLB/glTF 2.0), Animationen und Instancing.
// Vertrag: glTF-Einheiten sind Meter, Blickrichtung des Modells +Z (andere über forward: '-z' | '+x' | '-x' korrigierbar), Ursprung am Boden in der Mitte (origin: 'bottom').
// Geladene Modelle gehören dem Projekt (Cache nach ID), nicht einem Modul; Instanzen gehören dem, der sie erzeugt (Objekt/Modul) und werden mit ihm freigegeben.
// Nicht unterstützt: Draco-/Meshopt-/KTX2-Kompression (für Offline-Export ohne WASM), externe .bin/.png neben einer .gltf (nur eingebettete .glb bzw. data:-URIs;
// das Studio packt .gltf + Nebendateien/.zip beim Import selbst in eine eingebettete Datei, siehe modelio.js).
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as skClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { disposeTree } from './ext.js';

const ID = /^[\w.\-]{1,40}$/;
const ROT = { '+z': 0, '-z': Math.PI, '+x': -Math.PI / 2, '-x': Math.PI / 2 };
const _e = new THREE.Euler(0, 0, 0, 'YXZ'), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _m = new THREE.Matrix4(), _c = new THREE.Color();

// Nur bekannte, gültige Standardwerte behalten (height/scale > 0, forward, origin)
const cleanDef = (d) => {
  const r = {};
  if (!d || typeof d !== 'object') return r;
  if (typeof d.height === 'number' && d.height > 0 && isFinite(d.height)) r.height = d.height;
  if (typeof d.scale === 'number' && d.scale > 0 && isFinite(d.scale)) r.scale = d.scale;
  if (d.forward in ROT) r.forward = d.forward;
  if (['bottom', 'center', 'keep'].includes(d.origin)) r.origin = d.origin;
  return r;
};

export const toBase64 = (buf) => {
  const u = new Uint8Array(buf); let s = '';
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  return btoa(s);
};
export const fromBase64 = (b64) => { const s = atob(b64), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u.buffer; };

export class Assets {
  constructor(g) {
    this.g = g; this.map = new Map(); this.pending = new Map(); this.raw = new Map(); this.live = new Set(); this.inst = [];
    this.loader = new GLTFLoader();
  }

  get instancedCount() { let n = 0; for (const h of this.inst) n += h.count; return n; }
  stats() {
    let bytes = 0, tris = 0;
    for (const a of this.map.values()) { bytes += a.bytes; tris += a.tris; }
    return { models: this.map.size, instances: this.live.size, instancedGroups: this.inst.length, fileBytes: bytes, triangles: tris };
  }

  has(id) { return this.map.has(id); }
  get(id) {
    const a = this.map.get(id);
    return a ? { id, clips: a.clips.map((c) => ({ name: c.name, duration: +c.duration.toFixed(3) })), size: { ...a.size }, triangles: a.tris, meshes: a.meshes, bytes: a.bytes, source: a.source, defaults: { ...a.def } } : null;
  }
  list() { return [...this.map.keys()]; }
  // Standard-Einstellungen eines Modells (height, forward, origin): gelten, wenn ein Aufruf sie nicht selbst angibt. Das Studio füllt sie aus der Vorschau.
  setDefaults(id, def = {}) {
    const a = this.map.get(id);
    if (!a) { this.g.warn('assets.setDefaults: Modell „' + id + '“ ist nicht geladen'); return false; }
    a.def = cleanDef(def);
    return true;
  }

  // Laden: src = URL (https:, data:, blob:, relativ), ArrayBuffer/Uint8Array, Blob/File oder { base64 }. Gibt ein Promise mit get(id) zurück.
  // Gleiche ID nochmal laden liefert das vorhandene Modell (o.replace = true ersetzt es). o.persist = für Export/Browserspeicher merken.
  load(id, src, o = {}) {
    if (typeof id !== 'string' || !ID.test(id)) { const m = 'assets.load(id, quelle): Die ID ist ein kurzer Text aus Buchstaben, Ziffern, _ . -'; this.g.warn(m); return Promise.reject(new Error(m)); }
    if (this.map.has(id) && !o.replace) return Promise.resolve(this.get(id));
    if (this.pending.has(id)) return this.pending.get(id);
    const p = (async () => {
      let buf, source = 'daten';
      if (typeof src === 'string') {
        source = src.startsWith('data:') ? 'data-URI' : src;
        let r;
        try { r = await fetch(src); } catch (e) { throw new Error('Modell „' + id + '“: Laden von ' + (src.length > 80 ? src.slice(0, 80) + '…' : src) + ' fehlgeschlagen (' + e.message + '). Im Offline-Export nur eingebettete Modelle verwenden (Studio → Modelle).'); }
        if (!r.ok) throw new Error('Modell „' + id + '“: ' + src + ' antwortet mit ' + r.status);
        buf = await r.arrayBuffer();
      } else if (src && src.base64) buf = fromBase64(src.base64);
      else if (src instanceof ArrayBuffer) buf = src;
      else if (ArrayBuffer.isView(src)) buf = src.buffer.slice(src.byteOffset, src.byteOffset + src.byteLength);
      else if (src && typeof src.arrayBuffer === 'function') { buf = await src.arrayBuffer(); source = src.name ?? 'Datei'; }
      else throw new Error('Modell „' + id + '“: Quelle muss eine URL, ein ArrayBuffer, eine Datei oder { base64 } sein');
      const gltf = await new Promise((res, rej) => this.loader.parse(buf, '', res, (e) => rej(e)))
        .catch((e) => {
          const msg = String(e?.message ?? e);
          const hint = /draco|DRACOLoader/i.test(msg) ? ' – Draco-Kompression wird nicht unterstützt (ohne Kompression als .glb exportieren)' : /basisu|ktx2|meshopt/i.test(msg) ? ' – KTX2/Meshopt-Kompression wird nicht unterstützt' : '';
          throw new Error('Modell „' + id + '“ lässt sich nicht lesen: ' + msg + hint);
        });
      if (this.map.has(id)) this._free(this.map.get(id));
      const a = this._prepare(id, gltf, buf.byteLength, source);
      a.def = cleanDef(o.defaults);
      this.map.set(id, a);
      if (o.persist) this.raw.set(id, { buf, name: o.name ?? id });
      return this.get(id);
    })();
    this.pending.set(id, p);
    p.then(() => this.pending.delete(id), () => this.pending.delete(id));
    return p;
  }

  _prepare(id, gltf, bytes, source) {
    const scene = gltf.scene ?? gltf.scenes?.[0];
    if (!scene) throw new Error('Modell „' + id + '“ enthält keine Szene');
    let tris = 0, meshes = 0;
    scene.traverse((o) => {
      if (o.userData) o.userData.shared = true;
      if (o.isMesh) {
        meshes++; o.castShadow = true; o.receiveShadow = true; o.frustumCulled = !o.isSkinnedMesh;
        const idx = o.geometry.index; tris += (idx ? idx.count : o.geometry.attributes.position.count) / 3;
        o.geometry.userData.shared = true;
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) { m.userData.shared = true; for (const v of Object.values(m)) if (v && v.isTexture) v.userData.shared = true; }
      }
    });
    scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.isEmpty() ? { x: 1, y: 1, z: 1 } : { x: box.max.x - box.min.x, y: box.max.y - box.min.y, z: box.max.z - box.min.z };
    return { id, scene, clips: gltf.animations ?? [], size, box, tris: Math.round(tris), meshes, bytes, source, def: {} };
  }

  // Ein Modell als Instanz (sync, das Modell muss geladen sein). o: { height | scale, forward, origin ('bottom'|'center'|'keep'), ownMaterials, shadows }
  model(id, o = {}) {
    const a = this.map.get(id);
    if (!a) { this.g.warn('assets.model: Modell „' + id + '“ ist nicht geladen. Geladen: ' + (this.list().join(', ') || '(keine)') + ' – in einem Modul mit „await game.assets.load(id, quelle)“ in init, im Studio über das Feld „Modelle“'); return null; }
    o = { ...o }; for (const k of ['height', 'scale', 'forward', 'origin']) if (o[k] == null && a.def[k] != null) o[k] = a.def[k]; // Studio-Vorschau-Einstellungen als Standard
    if (o.forward != null && !(o.forward in ROT)) this.g.warn('assets.model: forward ist "+z", "-z", "+x" oder "-x"');
    if (o.origin != null && !['bottom', 'center', 'keep'].includes(o.origin)) this.g.warn('assets.model: origin ist "bottom", "center" oder "keep"');
    const root = new THREE.Group(), fix = new THREE.Group(), pivot = new THREE.Group(), inner = skClone(a.scene);
    const k = (o.height ? o.height / Math.max(1e-4, a.size.y) : 1) * (o.scale ?? 1);
    pivot.rotation.y = ROT[o.forward ?? '+z'] ?? 0; pivot.scale.setScalar(k);
    pivot.add(inner); fix.add(pivot); root.add(fix);
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root), org = o.origin ?? 'bottom';
    if (!box.isEmpty() && org !== 'keep') {
      const cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2;
      fix.position.set(-cx, org === 'bottom' ? -box.min.y : -(box.min.y + box.max.y) / 2, -cz);
    }
    const own = [];
    if (o.ownMaterials) inner.traverse((m) => { if (m.isMesh) { const clone = (x) => { const c = x.clone(); c.userData = { ...x.userData, shared: false }; own.push(c); return c; }; m.material = Array.isArray(m.material) ? m.material.map(clone) : clone(m.material); } });
    if (o.shadows === false) inner.traverse((m) => { if (m.isMesh) { m.castShadow = false; m.receiveShadow = false; } });
    root.userData.modelId = id;
    const names = a.clips.map((c) => c.name);
    const inst = {
      id, object: root, clips: names, mixer: a.clips.length ? new THREE.AnimationMixer(inner) : null, actions: new Map(), disposed: false,
      size: { x: a.size.x * k, y: a.size.y * k, z: a.size.z * k },
      // Clip abspielen: o { loop: 'repeat'|'once'|'pingpong', speed, fade (s), weight }
      play: (name, po = {}) => {
        if (!inst.mixer) { this.g.warn('Modell „' + id + '“ hat keine Animationen'); return null; }
        const clip = typeof name === 'number' ? a.clips[name] : a.clips.find((c) => c.name === name);
        if (!clip) { this.g.warn('Modell „' + id + '“ hat keinen Clip „' + name + '“. Clips: ' + names.join(', ')); return null; }
        let act = inst.actions.get(clip.name);
        if (!act) { act = inst.mixer.clipAction(clip); inst.actions.set(clip.name, act); }
        act.setLoop(po.loop === 'once' ? THREE.LoopOnce : po.loop === 'pingpong' ? THREE.LoopPingPong : THREE.LoopRepeat, Infinity);
        act.clampWhenFinished = po.loop === 'once';
        act.timeScale = po.speed ?? 1; act.setEffectiveWeight(po.weight ?? 1);
        act.reset(); if (po.fade) act.fadeIn(po.fade);
        act.play();
        return act;
      },
      stop: (name) => {
        if (!inst.mixer) return;
        if (name == null) { inst.mixer.stopAllAction(); return; }
        inst.actions.get(typeof name === 'number' ? names[name] : name)?.stop();
      },
      update: (dt) => { inst.mixer?.update(dt); },
      dispose: () => {
        if (inst.disposed) return; inst.disposed = true;
        if (inst.mixer) { inst.mixer.stopAllAction(); inst.mixer.uncacheRoot(inner); }
        for (const m of own) m.dispose();
        root.parent?.remove(root);
        this.live.delete(inst);
      },
    };
    this.live.add(inst);
    return inst;
  }

  // Alle Animationen weiterschalten (Spielzeit)
  update(dt) { for (const i of this.live) i.mixer?.update(dt); }

  _free(a) { a.scene.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); for (const m of Array.isArray(o.material) ? o.material : [o.material]) { for (const v of Object.values(m)) if (v && v.isTexture) v.dispose(); m.dispose(); } } }); }
  // Modell aus dem Speicher nehmen (nur ohne lebende Instanzen, sonst o.force)
  release(id, o = {}) {
    const a = this.map.get(id);
    if (!a) return false;
    const used = [...this.live].filter((i) => i.id === id && !i.disposed);
    if (used.length && !o.force) { this.g.warn('assets.release: Modell „' + id + '“ wird noch von ' + used.length + ' Objekt(en) benutzt – erst entfernen (oder { force: true })'); return false; }
    for (const i of used) i.dispose();
    this._free(a); this.map.delete(id); this.raw.delete(id);
    return true;
  }
  clearAll() { for (const i of [...this.live]) i.dispose(); for (const a of this.map.values()) this._free(a); this.map.clear(); }

  /* ───────── Instancing: viele gleiche Objekte, ein Zeichenaufruf ───────── */
  // o: { geometry, material } (THREE, Expertenweg) ODER { shape: 'box'|'sphere'|'cylinder'|'cone', size, color }; max (Anzahl Plätze), castShadow
  instanced(o = {}, scope = null) {
    const g = this.g, max = Math.max(1, Math.min(20000, Math.floor(o.max ?? 100)));
    let geo = o.geometry, mat = o.material, ownGeo = false, ownMat = false;
    if (!geo) {
      const sz = typeof o.size === 'number' ? [o.size, o.size, o.size] : o.size ?? [1, 1, 1];
      const sh = o.shape ?? 'box';
      geo = sh === 'sphere' ? new THREE.SphereGeometry(0.5, 12, 8) : sh === 'cylinder' ? new THREE.CylinderGeometry(0.5, 0.5, 1, 12) : sh === 'cone' ? new THREE.ConeGeometry(0.5, 1, 12) : new THREE.BoxGeometry(1, 1, 1);
      geo.scale(sz[0], sz[1], sz[2]); ownGeo = true;
      if (!['box', 'sphere', 'cylinder', 'cone'].includes(sh)) g.warn('instanced: shape ist box, sphere, cylinder oder cone');
    }
    if (!mat) { mat = new THREE.MeshStandardMaterial({ color: o.color ?? '#b0a58c', roughness: 0.8, metalness: 0.1 }); ownMat = true; }
    const mesh = new THREE.InstancedMesh(geo, mat, max);
    mesh.frustumCulled = false; mesh.count = 0; mesh.castShadow = !!o.castShadow; mesh.receiveShadow = o.receiveShadow !== false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    g.scene.add(mesh);
    const h = {
      mesh, max, scope, removed: false,
      get count() { return mesh.count; }, set count(n) { mesh.count = Math.max(0, Math.min(max, Math.floor(n))); mesh.instanceMatrix.needsUpdate = true; },
      // Platz i setzen: { x, y, z, yaw, pitch, roll, scale | sx, sy, sz, color }. Erhöht count bei Bedarf.
      set(i, v = {}) {
        if (!(i >= 0 && i < max)) { g.warn('instanced.set: Platz ' + i + ' liegt außerhalb 0…' + (max - 1)); return h; }
        _e.set(v.pitch ?? 0, v.yaw ?? 0, v.roll ?? 0); _q.setFromEuler(_e);
        _s.set(v.sx ?? v.scale ?? 1, v.sy ?? v.scale ?? 1, v.sz ?? v.scale ?? 1); _p.set(v.x ?? 0, v.y ?? 0, v.z ?? 0);
        _m.compose(_p, _q, _s); mesh.setMatrixAt(i, _m);
        if (v.color != null) { mesh.setColorAt(i, _c.set(v.color)); if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; }
        if (i >= mesh.count) mesh.count = i + 1;
        mesh.instanceMatrix.needsUpdate = true;
        return h;
      },
      remove() {
        if (h.removed) return; h.removed = true;
        mesh.parent?.remove(mesh); mesh.dispose();
        if (ownGeo) geo.dispose(); if (ownMat) mat.dispose();
        const i = this.inst.indexOf(h); if (i >= 0) this.inst.splice(i, 1);
      },
    };
    h.remove = h.remove.bind({ inst: this.inst });
    this.inst.push(h);
    return h;
  }
  clearInstances() { for (const h of [...this.inst]) h.remove(); }
}
