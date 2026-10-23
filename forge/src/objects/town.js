// Baukasten für die Stadt: abgerundete Lehmblöcke, Bögen, Treppen, Fassadenschmuck, Nachtmaterialien, Schilder.
// Alle Stadtobjekte (townHomes/townCivic/townWall) bauen darauf auf. Maße in Metern, Boden y=0, Vorderseite +Z.
import * as THREE from 'three';
import { M } from '../core/materials.js';
import { projectUV, mk, box, cyl, sph, cloth } from '../core/helpers.js';
import { mulberry32 } from '../core/noise.js';

export const CAT = 'Stadt-Baukasten';
export { mulberry32, box, cyl, sph, cloth, mk, M, THREE };

/* ───────────── Tag/Nacht: leuchtende Materialien (Fenster, Lampen, Schilder) ───────────── */
const nightMats = [];
export function nightMat(emissive, on, { color = 0x14100c, off = 0, rough = 0.5, map = null, side } = {}) {
  const m = new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: off, roughness: rough, metalness: 0.1 });
  if (map) { m.map = map; m.emissiveMap = map; }
  if (side !== undefined) m.side = side;
  m.userData.night = { on, off };
  nightMats.push(m);
  return m;
}
let lastNight = -1;
// k = 0 (Tag) … 1 (Nacht)
export function setNight(k) {
  k = Math.round(k * 50) / 50;
  if (k === lastNight) return;
  lastNight = k;
  for (const m of nightMats) m.emissiveIntensity = m.userData.night.off + (m.userData.night.on - m.userData.night.off) * k;
}
export const WIN = nightMat(0xffb35c, 2.3, { off: 0.03 });
export const WIN_C = nightMat(0x8fd4ff, 1.9, { off: 0.04, color: 0x0d1418 });
export const LAMP = nightMat(0xffe2a8, 3.4, { off: 0.35, color: 0x2a2620 });
export const FIREGLOW = new THREE.MeshStandardMaterial({ color: 0x1a0c05, emissive: 0xff6a1c, emissiveIntensity: 1.6, roughness: 0.6 });
// unsichtbare Hüllkörper (Collider-Stellvertreter): wird nicht gezeichnet, wohl aber von der Physik gesehen
export const HIDDEN = new THREE.MeshBasicMaterial({ visible: false });
HIDDEN.userData.tpm = 1;
export const WIN_OFF = new THREE.MeshStandardMaterial({ color: 0x15110d, roughness: 0.35, metalness: 0.2 });

/* ───────────── Schilder: ein Atlas mit erfundener Schrift (4×4 Felder à 256×64) ───────────── */
let signMaterial = null;
export const SIGN_COUNT = 16;
export function signMat() {
  if (signMaterial) return signMaterial;
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 256;
  const g = c.getContext('2d');
  const rng = mulberry32(4242);
  const bgs = ['#3b1410', '#10303a', '#2e2410', '#1b1a3a', '#34120f', '#12332a', '#3a2a10', '#241224'];
  const fgs = ['#ffb347', '#6fe3ff', '#ff6b4a', '#c8ff7a', '#ffd9f0', '#fff2b0'];
  for (let i = 0; i < SIGN_COUNT; i++) {
    const cx = (i % 4) * 256, cy = Math.floor(i / 4) * 64;
    g.fillStyle = bgs[i % bgs.length];
    g.fillRect(cx, cy, 256, 64);
    const fg = fgs[Math.floor(rng() * fgs.length)];
    g.strokeStyle = fg; g.lineWidth = 3;
    g.strokeRect(cx + 4, cy + 4, 248, 56);
    g.lineWidth = 4; g.lineCap = 'round'; g.lineJoin = 'round';
    const n = 4 + Math.floor(rng() * 4);
    const gw = 210 / n;
    for (let k = 0; k < n; k++) {
      // jedes Zeichen: 3–4 Striche auf einem 3×4-Raster
      const x0 = cx + 23 + k * gw, w = gw * 0.62, y0 = cy + 14, h = 36;
      const strokes = 3 + Math.floor(rng() * 2);
      g.beginPath();
      let px = Math.floor(rng() * 3), py = Math.floor(rng() * 4);
      g.moveTo(x0 + (px / 2) * w, y0 + (py / 3) * h);
      for (let s = 0; s < strokes; s++) {
        let nx = Math.floor(rng() * 3), ny = Math.floor(rng() * 4);
        if (nx === px && ny === py) nx = (nx + 1) % 3;
        g.lineTo(x0 + (nx / 2) * w, y0 + (ny / 3) * h);
        px = nx; py = ny;
      }
      g.stroke();
      if (rng() < 0.35) { g.beginPath(); g.arc(x0 + w / 2, y0 - 2, 2.4, 0, 7); g.fillStyle = fg; g.fill(); }
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  signMaterial = nightMat(0xffffff, 1.5, { color: 0xffffff, off: 0.0, rough: 0.6, map: t });
  signMaterial.userData.tpm = 1;
  return signMaterial;
}
// Schild als Fläche (Breite × Höhe, Vorderseite +Z), idx = Feld im Atlas
export function sign(w, h, idx, o = {}) {
  const geo = new THREE.PlaneGeometry(w, h);
  const uv = geo.attributes.uv;
  const i = ((idx % SIGN_COUNT) + SIGN_COUNT) % SIGN_COUNT;
  const u0 = (i % 4) / 4, v0 = 1 - (Math.floor(i / 4) + 1) / 4;
  for (let k = 0; k < uv.count; k++) uv.setXY(k, u0 + uv.getX(k) * 0.25, v0 + uv.getY(k) * 0.25);
  const m = mk(geo, signMat(), { cast: false, ...o });
  return m;
}

/* ───────────── Formen ───────────── */
function rrShape(w, d, r) {
  const s = new THREE.Shape();
  r = Math.max(0.02, Math.min(r, w / 2 - 0.01, d / 2 - 0.01));
  const x = -w / 2, y = -d / 2, PI = Math.PI;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -PI / 2, 0, false);
  s.lineTo(x + w, y + d - r); s.absarc(x + w - r, y + d - r, r, 0, PI / 2, false);
  s.lineTo(x + r, y + d); s.absarc(x + r, y + d - r, r, PI / 2, PI, false);
  s.lineTo(x, y + r); s.absarc(x + r, y + r, r, PI, PI * 1.5, false);
  return s;
}

function stand(geo, mat, taper, h, tpm) {
  geo.rotateX(-Math.PI / 2); // Extrusion zeigt jetzt nach +Y
  if (taper) {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const k = 1 - taper * (p.getY(i) / h);
      p.setX(i, p.getX(i) * k);
      p.setZ(i, p.getZ(i) * k);
    }
  }
  geo.computeVertexNormals();
  projectUV(geo, tpm ?? mat?.userData?.tpm ?? 1);
  return geo;
}

// Abgerundeter Lehmblock (Boden bei y=0, mittig), taper = Verjüngung nach oben (Lehmwände neigen sich leicht)
export function rblock(w, h, d, r, mat, o = {}) {
  const geo = new THREE.ExtrudeGeometry(rrShape(w, d, r), { depth: h, bevelEnabled: false, curveSegments: o.cs ?? 2 });
  return mk(stand(geo, mat, o.taper, h, o.tpm), mat, o);
}

// Rahmen (Attika, Mauerkrone): Außenmaß w×d, Wandstärke t, Höhe h
export function frame(w, d, t, h, mat, o = {}) {
  const s = rrShape(w, d, o.r ?? 0.3);
  const hole = rrShape(w - 2 * t, d - 2 * t, Math.max(0.05, (o.r ?? 0.3) - t * 0.5));
  s.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: 2 });
  return mk(stand(geo, mat, 0, h), mat, o);
}

// Bogen (Tür/Fenster): Breite w, Höhe h, Tiefe depth; Vorderseite +Z, Boden y=0
export function arch(w, h, depth, mat, o = {}) {
  const s = new THREE.Shape();
  const r = w / 2;
  s.moveTo(-r, 0); s.lineTo(-r, Math.max(0.01, h - r));
  s.absarc(0, Math.max(0.01, h - r), r, Math.PI, 0, true);
  s.lineTo(r, 0); s.lineTo(-r, 0);
  const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 5 });
  projectUV(geo, mat?.userData?.tpm ?? 1);
  return mk(geo, mat, { cast: false, ...o });
}

// Treppe: Stufenprofil in der Seite, Breite width (X). Läuft von z=0 (unten) nach z=run (oben)
export function stairs(rise, run, width, steps, mat, o = {}) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  const dz = run / steps, dh = rise / steps;
  for (let i = 0; i < steps; i++) { s.lineTo(i * dz, (i + 1) * dh); s.lineTo((i + 1) * dz, (i + 1) * dh); }
  s.lineTo(run, 0); s.lineTo(0, 0);
  const geo = new THREE.ExtrudeGeometry(s, { depth: width, bevelEnabled: false });
  // Profil liegt in XY (x = Lauf, y = Höhe), Extrusion in Z → Lauf auf Z, Breite auf X drehen
  geo.rotateY(-Math.PI / 2);
  geo.translate(width / 2, 0, 0);
  geo.computeVertexNormals();
  projectUV(geo, mat?.userData?.tpm ?? 1);
  return mk(geo, mat, o);
}

// Giebelfläche unter einem Gewölbe (gleiche Krümmung wie vault): Breite w, Bogenhöhe rise, Dicke depth; Boden y=0
export function gable(w, rise, depth, mat, o = {}) {
  const r = (w * w / 4 + rise * rise) / (2 * rise);
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const x = w / 2 - (w * i) / n;
    s.lineTo(x, Math.sqrt(Math.max(0, r * r - x * x)) - (r - rise));
  }
  s.lineTo(-w / 2, 0);
  const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
  geo.translate(0, 0, -depth / 2);
  projectUV(geo, mat?.userData?.tpm ?? 1);
  return mk(geo, mat, o);
}

// Halbtonne (Gewölbedach), Achse entlang Z, Breite w, Länge len, Bogenhöhe rise
export function vault(w, len, rise, mat, o = {}) {
  const r = (w * w / 4 + rise * rise) / (2 * rise);
  const half = Math.atan2(w / 2, r - rise); // auch für Bögen höher als ein Halbkreis
  const geo = new THREE.CylinderGeometry(r, r, len, o.radial ?? 14, 1, true, -half, half * 2);
  geo.rotateX(Math.PI / 2); // Achse auf Z
  geo.rotateZ(Math.PI);     // Wölbung nach oben
  geo.translate(0, -(r - rise), 0);
  const t = mat?.userData?.tpm ?? 1;
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * r * half * 2 * t, uv.getY(i) * len * t);
  return mk(geo, mat, { ...o });
}

/* ───────────── Fassaden ───────────── */
// Gruppe an einer Gebäudeseite: lokal +Z zeigt nach außen, u läuft entlang der Wand.
export function facade(side, w, d, x0 = 0, z0 = 0) {
  const g = new THREE.Group();
  const S = { '+z': [0, d / 2, 0], '-z': [0, -d / 2, Math.PI], '+x': [w / 2, 0, Math.PI / 2], '-x': [-w / 2, 0, -Math.PI / 2] }[side];
  g.position.set(x0 + S[0], 0, z0 + S[1]);
  g.rotation.y = S[2];
  return g;
}

// Fenster (b×h), Mittelpunkt (u, y), lit = leuchtet nachts; shut = Fensterladen (Farbe) oder null
export function addWindow(g, u, y, b, h, mats, { lit = false, cool = false, shut = null, lintel = true, round = false } = {}) {
  const glass = lit ? (cool ? WIN_C : WIN) : WIN_OFF;
  const win = round
    ? cyl(b / 2, b / 2, 0.06, glass, { rx: Math.PI / 2, x: u, y, z: 0.02, radial: 10, cast: false })
    : box(b, h, 0.06, glass, { x: u, y, z: 0.02, cast: false });
  g.add(win);
  g.add(box(b + 0.28, 0.1, 0.2, mats.trim, { x: u, y: y - h / 2 - 0.05, z: 0.08, cast: false }));
  if (lintel && !round) g.add(box(b + 0.2, 0.12, 0.14, mats.trim, { x: u, y: y + h / 2 + 0.06, z: 0.06, cast: false }));
  if (shut) {
    for (const s of [-1, 1]) g.add(box(b * 0.5, h, 0.04, shut, { x: u + s * (b / 2 + b * 0.18), y, z: 0.06, ry: s * 0.55, cast: false }));
  }
}

// Tür mit Bogen: Mittelpunkt u, Breite b, Höhe h. Dunkle Öffnung, Rahmen, Schwelle, optional halb offene Tür
export function addDoor(g, u, b, h, mats, { door = null, open = false } = {}) {
  g.add(arch(b + 0.5, h + 0.28, 0.14, mats.trim, { x: u, z: 0.0 }));
  g.add(arch(b, h, 0.18, WIN_OFF, { x: u, z: 0.02 }));
  if (door) {
    const leaf = box(b * 0.48, h * 0.9, 0.06, door, { cast: false });
    if (open) { leaf.position.set(u - b * 0.5 + b * 0.12, h * 0.45, 0.35); leaf.rotation.y = 1.0; }
    else leaf.position.set(u, h * 0.45, 0.14);
    g.add(leaf);
  }
  g.add(box(b + 0.7, 0.14, 0.6, mats.trim, { x: u, y: 0.07, z: 0.3, cast: false }));
}

/* ───────────── Kleinteile ───────────── */
export function pole(h, r, mat, o = {}) { return cyl(r, r * 1.15, h, mat, { y: h / 2, radial: 6, ...o }); }

// Wasserbehälter (Dachtank): Zylinder auf Beinen
export function tank(r, h, mat, matLeg, o = {}) {
  const g = new THREE.Group();
  g.add(cyl(r, r, h, mat, { y: 0.7 + h / 2, radial: 14 }));
  g.add(sph(r, mat, { y: 0.7 + h, thetaLength: Math.PI / 2, ws: 14, hs: 4, sy: 0.4 }));
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    g.add(cyl(0.05, 0.05, 0.75, matLeg, { x: Math.cos(a) * r * 0.75, y: 0.37, z: Math.sin(a) * r * 0.75, radial: 5 }));
  }
  g.position.set(o.x ?? 0, o.y ?? 0, o.z ?? 0);
  return g;
}

// Antenne mit Querstreben und optionaler Schüssel
export function antenna(h, mat, { dish = false, light = false } = {}) {
  const g = new THREE.Group();
  g.add(cyl(0.03, 0.045, h, mat, { y: h / 2, radial: 5 }));
  for (const t of [0.55, 0.8]) g.add(box(0.9 * (1.1 - t * 0.5), 0.03, 0.03, mat, { y: h * t }));
  if (dish) g.add(sph(0.45, M.metal('gray', { side: THREE.DoubleSide }), { thetaLength: 1.2, ws: 12, hs: 5, y: h * 0.9, rx: -2.2, ry: 0.5, cast: false }));
  if (light) g.add(sph(0.07, LAMP, { y: h + 0.05, ws: 6, hs: 4, cast: false }));
  return g;
}

// Sonnensegel/Plane über zwei Pfosten: Breite w, Tiefe dep, Höhe vorne/hinten
export function awning(w, dep, hFront, hBack, color, o = {}) {
  const g = new THREE.Group();
  const c = cloth(w, Math.hypot(dep, hBack - hFront), M.cloth(color), { sag: 0.14, ripple: 0.06, seed: o.seed ?? 3, segX: 8, segY: 4 });
  c.rotation.x = -Math.PI / 2 + Math.atan2(hBack - hFront, dep);
  c.position.set(0, (hFront + hBack) / 2, dep / 2);
  c.castShadow = true;
  g.add(c);
  const wood = M.wood(0xb59a78);
  for (const s of [-1, 1]) {
    g.add(cyl(0.045, 0.05, hFront, wood, { x: s * (w / 2 - 0.08), y: hFront / 2, z: dep, radial: 6 }));
  }
  return g;
}

export const CLOTH_COLORS = [0xc9a46a, 0xb3502f, 0x3f5f8a, 0x6f8040, 0xd9c8a0, 0x8a3a2a, 0x6b4f8a, 0xcfb070];
export const SHUTTER_PALS = ['rust', 'blue', 'olive', 'red', 'gray', 'white'];

export const pick = (rng, a) => a[Math.floor(rng() * a.length)];
export const between = (rng, a, b) => a + rng() * (b - a);

// Gekalkt wirkt im Wüstenlicht bläulich-grau, deshalb leicht warm getönt
export const clayM = (pal) => (pal === 'white' ? M.clay('white', { tint: 0xffe8c8 }) : M.clay(pal));

// Standard-Materialsatz eines Lehmhauses
export function clayMats(palette) {
  return {
    wall: clayM(palette),
    trim: clayM(palette === 'sand' ? 'white' : 'sand'),
    dark: M.clay('dark'),
    sand: M.clay('sand', { sandBias: 3 }),
  };
}

// Sandverwehung am Fuß, Schutthaufen
export function sandDrift(x, z, s, ry = 0) {
  return sph(1, M.clay('sand', { sandBias: 3 }), { x, y: 0.0, z, sx: s * 1.5, sy: 0.3, sz: s * 0.8, ry, ws: 12, hs: 6, cast: false });
}
export function rubble(rng, n, spread, mat) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const s = 0.18 + rng() * 0.42;
    g.add(box(s * (0.8 + rng() * 0.8), s * 0.7, s * (0.8 + rng() * 0.8), mat, { x: (rng() - 0.5) * spread, y: s * 0.3, z: (rng() - 0.5) * spread, ry: rng() * 3, rx: (rng() - 0.5) * 0.5, rz: (rng() - 0.5) * 0.4 }));
  }
  return g;
}

// Teil mit passender Physik-Oberfläche/Masse hinzufügen (für Explosion/Aufbau in der Werkstatt)
export function mass(w, h, d, k = 120) { return Math.max(4, Math.min(500, w * h * d * k)); }

export const parts = {
  // tragende Wand/Block: bricht in Brocken
  solid(obj, mesh, w, h, d, surf = 'clay', fr = [2, 2, 2]) { return obj.add(mesh, { fracture: fr, mass: mass(w, h, d), surf }); },
  deco(obj, mesh, surf = 'clay', m = 8) { return obj.add(mesh, { collider: 'none', mass: m, surf }); },
};
