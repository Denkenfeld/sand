// Backen: Aus einem fertig gebauten ForgeObject wird eine statische, nach Material gruppierte Geometrie
// (voll + vereinfachte "Fern"-Fassung). Das ist die Grundlage fürs Instancing der ganzen Stadt.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createObject } from '../core/forge.js';
import { buildVariantTable, KIND_ORDER, KINDS } from './catalog.js';

const _box = new THREE.Box3();
const _size = new THREE.Vector3();

function visibleDeep(o, root) {
  for (let n = o; n && n !== root.parent; n = n.parent) if (n.visible === false) return false;
  return true;
}

// Einheitliche Attribute (Position, Normale, UV [+ Farbe]) und Index – Voraussetzung fürs Zusammenfassen und für BatchedMesh
function normalized(src, matrix, withColor) {
  const g = new THREE.BufferGeometry();
  const pos = src.attributes.position;
  const n = pos.count;
  const copyAttr = (name, size) => {
    const a = src.attributes[name];
    const out = new Float32Array(n * size);
    if (a) {
      if (a.isBufferAttribute && !a.isInterleavedBufferAttribute && a.array instanceof Float32Array && a.itemSize === size) out.set(a.array.subarray(0, n * size));
      else for (let i = 0; i < n; i++) { out[i * size] = a.getX(i); if (size > 1) out[i * size + 1] = a.getY(i); if (size > 2) out[i * size + 2] = a.getZ(i); }
    } else if (name === 'color') out.fill(1);
    return new THREE.BufferAttribute(out, size);
  };
  g.setAttribute('position', copyAttr('position', 3));
  if (src.attributes.normal) g.setAttribute('normal', copyAttr('normal', 3));
  g.setAttribute('uv', copyAttr('uv', 2));
  if (withColor) g.setAttribute('color', copyAttr('color', 3));
  let idx;
  if (src.index) idx = Uint32Array.from(src.index.array);
  else { idx = new Uint32Array(n); for (let i = 0; i < n; i++) idx[i] = i; }
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.applyMatrix4(matrix);
  if (!src.attributes.normal) g.computeVertexNormals();
  if (matrix.determinant() < 0) { // gespiegelt → Umlaufsinn drehen
    const ix = g.index.array;
    for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; }
  }
  g.computeBoundingBox();
  return g;
}

function degenerate(withColor) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0]), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(6), 2));
  if (withColor) g.setAttribute('color', new THREE.BufferAttribute(new Float32Array([1, 1, 1, 1, 1, 1, 1, 1, 1]), 3));
  g.setIndex(new THREE.BufferAttribute(new Uint32Array([0, 1, 2]), 1));
  return g;
}

// → { parts: [{ mat, hi, lo }], fp, tris, triLo, lights }
export function bake(obj) {
  const root = obj.root;
  root.updateMatrixWorld(true);
  const byMat = new Map();
  let diag;
  {
    _box.setFromObject(root);
    _box.getSize(_size);
    diag = Math.max(2, _size.length());
  }
  const thr = Math.min(1.2, Math.max(0.3, diag * 0.05));
  const lowKeep = diag > 7; // sehr kleine Objekte brauchen keine Fern-Fassung
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
    if (!visibleDeep(o, root)) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const groups = Array.isArray(o.material) ? o.geometry.groups : [{ start: 0, count: Infinity, materialIndex: 0 }];
    for (const gr of groups) {
      const mat = mats[gr.materialIndex];
      if (!mat || mat.visible === false) continue;
      let src = o.geometry;
      if (Array.isArray(o.material)) {
        const idx = src.index ? Array.from(src.index.array.subarray(gr.start, gr.start + gr.count)) : null;
        if (!idx) continue;
        src = src.clone();
        src.setIndex(idx);
      }
      const g = normalized(src, o.matrixWorld, !!mat.vertexColors);
      g.boundingBox.getSize(_size);
      const side = Math.max(_size.x, _size.y, _size.z);
      let e = byMat.get(mat);
      if (!e) byMat.set(mat, (e = { all: [], big: [] }));
      e.all.push(g);
      if (side >= thr || !lowKeep) e.big.push(g);
    }
  });

  const parts = [];
  let tris = 0, triLo = 0;
  const fp = { minX: 1e9, maxX: -1e9, minZ: 1e9, maxZ: -1e9, maxY: 0 };
  const mass = { minX: 1e9, maxX: -1e9, minZ: 1e9, maxZ: -1e9 };
  for (const [mat, e] of byMat) {
    const hi = e.all.length === 1 ? e.all[0] : mergeGeometries(e.all, false);
    if (!hi) continue;
    const lo = e.big.length === 0 ? degenerate(!!mat.vertexColors) : e.big.length === e.all.length ? hi : e.big.length === 1 ? e.big[0] : mergeGeometries(e.big, false);
    parts.push({ mat, hi, lo });
    tris += hi.index.count / 3;
    triLo += lo.index.count / 3;
    const p = hi.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      if (y > fp.maxY) fp.maxY = y;
      if (x < fp.minX) fp.minX = x; if (x > fp.maxX) fp.maxX = x;
      if (z < fp.minZ) fp.minZ = z; if (z > fp.maxZ) fp.maxZ = z;
      if (y > 0.5) {
        if (x < mass.minX) mass.minX = x; if (x > mass.maxX) mass.maxX = x;
        if (z < mass.minZ) mass.minZ = z; if (z > mass.maxZ) mass.maxZ = z;
      }
    }
  }
  if (!parts.length) { fp.minX = fp.minZ = -0.5; fp.maxX = fp.maxZ = 0.5; fp.maxY = 1; }
  // Grundfläche = Masse oberhalb von 0,5 m (flache Sandwehen und Schutt zählen nicht), sonst alles
  const m = mass.maxX > mass.minX && mass.maxZ > mass.minZ ? mass : fp;
  const out = {
    cx: (m.minX + m.maxX) / 2, cz: (m.minZ + m.maxZ) / 2, hx: (m.maxX - m.minX) / 2, hz: (m.maxZ - m.minZ) / 2, h: fp.maxY,
    ax: fp.maxX - fp.minX, az: fp.maxZ - fp.minZ, // Gesamtausdehnung inkl. Schutt (für Abstände)
  };
  const lights = obj.lights.map((l) => ({ x: l.light.position.x, y: l.light.position.y, z: l.light.position.z, color: l.light.color.getHex(), k: l.base, d: l.light.distance }));
  return { parts, fp: out, tris, triLo, lights };
}

// Bibliothek aller Bausteine: kind → [variante], jede mit gebackener Geometrie und Grundfläche
export class Library {
  constructor(objects) {
    this.objects = objects;
    this.table = buildVariantTable();
    this.kinds = {};
    this.defs = objects;
    this.stats = { variants: 0, tris: 0, ms: 0 };
  }

  total() {
    let n = 0;
    for (const k of KIND_ORDER) n += (this.table[k] ?? []).length;
    return n;
  }

  // Backt alle Varianten. onProgress(i, n, label) wird zwischendurch aufgerufen; yield gibt dem Browser Luft.
  async bakeAll(onProgress, yieldFn) {
    const t0 = performance.now();
    const total = this.total();
    let i = 0;
    let last = performance.now();
    for (const kind of KIND_ORDER) {
      const def = this.defs[kind];
      const list = this.table[kind];
      if (!def || !list) { console.warn('Stadt: Art ohne Definition', kind); continue; }
      this.kinds[kind] = [];
      for (const v of list) {
        const obj = createObject(def, v.params);
        const b = bake(obj);
        const rec = { kind, params: v.params, tags: v.tags, fp: b.fp, parts: b.parts, tris: b.tris, triLo: b.triLo, lights: b.lights, spare: KINDS[kind].live ? obj : null };
        if (!KINDS[kind].live) disposeObject(obj);
        this.kinds[kind].push(rec);
        this.stats.variants++;
        this.stats.tris += b.tris;
        i++;
        if (onProgress && performance.now() - last > 60) {
          onProgress(i, total, KINDS[kind].label);
          await yieldFn();
          last = performance.now();
        }
      }
    }
    onProgress && onProgress(total, total, '');
    this.stats.ms = performance.now() - t0;
  }

  variants(kind) { return this.kinds[kind] ?? []; }
}

// Nur die Ressourcen freigeben, die wir selbst angelegt haben (Geometrien der Teile); Materialien sind geteilt
export function disposeObject(obj) {
  obj.root.traverse((c) => { if (c.geometry) c.geometry.dispose(); });
}
