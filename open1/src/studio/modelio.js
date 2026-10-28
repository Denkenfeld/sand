// Modelle einlesen: .glb, .gltf mit .bin/Bildern (gemeinsam gewählt) und .zip daraus werden zu EINER Datei (GLB bzw. eingebettete glTF),
// damit Browserspeicher und Offline-Export nur eine Datei pro Modell kennen. Fremdformate (FBX, OBJ …) werden mit Hinweis abgelehnt.
import { unzipSync } from 'three/examples/jsm/libs/fflate.module.js';

const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', bin: 'application/octet-stream' };
const FOREIGN = /\.(fbx|obj|dae|stl|3ds|blend|usdz?|ply|vrm|x3d|abc|max|ma|mb)$/i;
const SIDE = /\.(bin|png|jpe?g|webp|gif|ktx2?|mtl)$/i;
export const MODEL_ACCEPT = '.glb,.gltf,.bin,.png,.jpg,.jpeg,.webp,.zip,model/gltf-binary,model/gltf+json';
const MAX_ZIP = 300 * 1024 * 1024; // entpackte Gesamtgröße, Schutz vor Zip-Bomben

const base = (p) => p.replace(/\\/g, '/').split('/').pop();
const ext = (p) => (p.match(/\.([^.\/]+)$/)?.[1] ?? '').toLowerCase();
const norm = (p) => { const out = []; for (const s of p.replace(/\\/g, '/').split('/')) { if (s === '..') out.pop(); else if (s && s !== '.') out.push(s); } return out.join('/'); };
const dirOf = (p) => { const i = p.replace(/\\/g, '/').lastIndexOf('/'); return i < 0 ? '' : p.slice(0, i + 1); };
export const foreignHint = (name) => '„' + name + '“: Dieses Format wird nicht gelesen. Bitte als .glb (glTF 2.0) exportieren – in Blender: Datei → Exportieren → glTF 2.0 (.glb) –, dann hier laden.';

function b64(u8) {
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(s);
}

// .gltf-Text + Nebendateien (Pfad → Uint8Array) → eine in sich geschlossene .gltf (Daten als data:-URI)
function packGltf(name, text, dir, files) {
  let j;
  try { j = JSON.parse(text); } catch (e) { throw new Error('„' + name + '“ ist keine gültige glTF-Datei (' + e.message + ')'); }
  const find = (uri) => {
    let k; try { k = decodeURIComponent(uri); } catch (e) { k = uri; }
    const full = norm(dir + k);
    return files.get(full) ?? files.get(full.toLowerCase()) ?? files.get(base(full)) ?? files.get(base(full).toLowerCase());
  };
  const missing = [];
  const embed = (o, kind) => {
    if (!o || typeof o.uri !== 'string' || o.uri.startsWith('data:')) return;
    const f = find(o.uri);
    if (!f) { let n = base(o.uri); try { n = decodeURIComponent(n); } catch (e) { /* so lassen */ } missing.push(n); return; }
    o.uri = 'data:' + (MIME[ext(o.uri)] ?? (kind === 'image' ? 'image/png' : 'application/octet-stream')) + ';base64,' + b64(f);
  };
  for (const b of j.buffers ?? []) embed(b, 'buffer');
  for (const im of j.images ?? []) embed(im, 'image');
  if (missing.length) throw new Error('„' + name + '“: Es fehlen Dateien: ' + [...new Set(missing)].join(', ') + '. Wähle die .gltf zusammen mit allen zugehörigen Dateien (.bin, Bilder) aus – oder die ganze .zip.');
  const buf = new TextEncoder().encode(JSON.stringify(j));
  return { name: name.replace(/\.gltf$/i, '') + '.gltf', buf: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) };
}

const toBuf = (u8) => u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);

// files: Array<File | { name, arrayBuffer() }>  →  { models: [{ name, buf }], problems: [text] }
export async function readModelFiles(files) {
  const models = [], problems = [], side = new Map(), gltfs = [];
  for (const f of files) {
    const n = f.name ?? 'datei', e = ext(n);
    try {
      if (e === 'glb') models.push({ name: base(n), buf: await f.arrayBuffer() });
      else if (e === 'gltf') gltfs.push({ name: base(n), dir: '', text: await f.text() });
      else if (e === 'zip') {
        const u8 = new Uint8Array(await f.arrayBuffer());
        let total = 0;
        const all = unzipSync(u8, { filter: (en) => { total += en.originalSize; if (total > MAX_ZIP) throw new Error('Das Archiv ist entpackt größer als ' + (MAX_ZIP >> 20) + ' MB'); return !/(^|\/)__MACOSX\//.test(en.name) && !en.name.endsWith('/'); } });
        const sm = new Map();
        for (const [p, d] of Object.entries(all)) { const k = norm(p); sm.set(k, d); sm.set(k.toLowerCase(), d); sm.set(base(k), d); sm.set(base(k).toLowerCase(), d); }
        let any = false;
        for (const [p, d] of Object.entries(all)) {
          const pe = ext(p);
          if (pe === 'glb') { models.push({ name: base(p), buf: toBuf(d) }); any = true; }
          else if (pe === 'gltf') { try { models.push(packGltf(base(p), new TextDecoder().decode(d), dirOf(norm(p)), sm)); any = true; } catch (x) { problems.push(x.message); } }
          else if (FOREIGN.test(p)) problems.push(foreignHint(base(p)));
        }
        if (!any && !problems.length) problems.push('„' + n + '“: Im Archiv liegt keine .glb oder .gltf.');
      } else if (FOREIGN.test(n)) problems.push(foreignHint(n));
      else if (SIDE.test(n)) side.set(n, new Uint8Array(await f.arrayBuffer())), side.set(n.toLowerCase(), side.get(n));
      else problems.push('„' + n + '“: unbekanntes Dateiformat. Erwartet: .glb, .gltf (mit .bin und Bildern) oder .zip.');
    } catch (x) { problems.push('„' + n + '“: ' + (x?.message ?? x)); }
  }
  for (const g of gltfs) { try { models.push(packGltf(g.name, g.text, g.dir, side)); } catch (x) { problems.push(x.message); } }
  if (!models.length && !problems.length && side.size) problems.push('Nebendateien (.bin, Bilder) allein reichen nicht – wähle die .gltf dazu.');
  return { models, problems };
}
