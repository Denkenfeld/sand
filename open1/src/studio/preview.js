// Modell-Vorschau (Studio): zeigt ein geladenes Modell genau so, wie das Spiel es einsetzt (gleicher Code: assets.model), mit grünem Pfeil nach „vorn“ (+z),
// grauem 1,8-m-Zylinder als Größenvergleich, Animationen zum Anklicken und Einstellungen für Blickrichtung, Höhe und Ursprung.
// Eigener kleiner WebGL-Renderer, der beim Schließen freigegeben wird; die Instanz taucht nicht in den Spielobjekten auf.
import * as THREE from 'three';
import { el } from '../ui.js';

const CSS = `
.mpv-back { position: fixed; inset: 0; z-index: 30; display: grid; place-items: center; background: rgba(10,7,4,.62); padding: 12px; }
.mpv { width: min(100%, 420px); max-height: 100%; overflow: auto; background: var(--panel-solid, #1c150f); border: 1px solid var(--teal, #62b9a8); border-radius: 4px; padding: 12px 14px; display: grid; gap: 10px; color: var(--fg, #ecdfc6); }
.mpv h3 { margin: 0; font: 700 14px/1.2 var(--font-display); letter-spacing: .1em; text-transform: uppercase; word-break: break-all; }
.mpv canvas { width: 100%; height: 260px; display: block; border-radius: 3px; background: #231a12; touch-action: none; cursor: grab; }
.mpv .row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
.mpv label { display: grid; gap: 3px; font-size: 11.5px; color: var(--muted, #a8977a); }
.mpv select, .mpv input { width: 100%; box-sizing: border-box; background: var(--raise, #281f16); border: 1px solid var(--line, #3d3022); border-radius: 3px; padding: 6px 7px; color: inherit; font: 12px var(--font-mono); min-width: 0; }
.mpv .info { font: 11px/1.4 var(--font-mono); color: var(--muted, #a8977a); margin: 0; }
.mpv .clips { display: flex; flex-wrap: wrap; gap: 6px; }
.mpv .clips:empty { display: none; }
.mpv button[aria-pressed="true"] { border-color: var(--accent, #e8922e); color: var(--accent, #e8922e); }
`;
let cssDone = false, current = null;

const FORWARD = [['+z', '+z (Standard)'], ['-z', '−z (Modell schaut nach hinten)'], ['+x', '+x (schaut nach rechts)'], ['-x', '−x (schaut nach links)']];
const ORIGIN = [['bottom', 'Boden, Mitte'], ['center', 'Mitte'], ['keep', 'wie in der Datei']];

export const currentPreview = () => current;

// o: { onSave(def), onInsert(def), onClose() } – def = { forward, origin, height? }
export function openModelPreview(game, id, o = {}) {
  current?.close();
  const a = game.assets.get(id);
  if (!a) return null;
  if (!cssDone) { const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st); cssDone = true; }

  const S = { forward: a.defaults.forward ?? '+z', origin: a.defaults.origin ?? 'bottom', height: a.defaults.height ?? null, theta: 0.7, auto: true, clip: null };
  const def = () => { const d = { forward: S.forward, origin: S.origin }; if (S.height) d.height = S.height; return d; };

  const canvas = el('canvas', { 'aria-label': 'Modellvorschau, ziehen zum Drehen' });
  const info = el('p', { class: 'info' });
  const clips = el('div', { class: 'clips' });
  const note = el('p', { class: 'info' });
  const selF = el('select', {}, ...FORWARD.map(([v, t]) => el('option', { value: v }, t)));
  const selO = el('select', {}, ...ORIGIN.map(([v, t]) => el('option', { value: v }, t)));
  const inH = el('input', { type: 'number', min: '0.01', step: '0.1', inputmode: 'decimal', placeholder: 'Original: ' + a.size.y.toFixed(2) });
  selF.value = S.forward; selO.value = S.origin; if (S.height) inH.value = String(S.height);

  const close = () => {
    if (!current || current.id !== id || current.closed) return;
    current.closed = true; current = null;
    cancelAnimationFrame(raf); clearTimeout(tm);
    inst?.dispose(); inst = null;
    for (const g of owned) g.dispose();
    for (const m of ownedMat) m.dispose();
    try { renderer?.dispose(); renderer?.forceContextLoss(); } catch (e) { /* schon weg */ }
    back.remove(); document.removeEventListener('keydown', onKey, true);
    o.onClose?.();
  };
  const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };

  const mkBtn = (txt, fn, cls = 'mini') => el('button', { class: cls, type: 'button', onclick: fn }, txt);
  const back = el('div', { class: 'mpv-back', onclick: (e) => { if (e.target === back) close(); } },
    el('div', { class: 'mpv', role: 'dialog', 'aria-label': 'Modellvorschau ' + id },
      el('h3', {}, id), canvas, info, clips,
      el('div', { class: 'row' }, el('label', {}, 'Blickrichtung', selF), el('label', {}, 'Höhe in m', inH), el('label', {}, 'Ursprung', selO)),
      note,
      el('div', { class: 'btn-row' },
        mkBtn('Speichern', () => { o.onSave?.(def()); note.textContent = 'Gespeichert – gilt für dieses Modell, auch im Export.'; }, 'act primary'),
        mkBtn('Ins Skript einfügen', () => { o.onSave?.(def()); o.onInsert?.(def()); close(); }, 'act'),
        mkBtn('Schließen', close, 'act'))));
  document.body.appendChild(back);
  document.addEventListener('keydown', onKey, true);

  /* ── Szene ── */
  let renderer = null, inst = null, raf = 0, tm = 0, last = performance.now();
  const owned = [], ownedMat = [];
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(40, 1, 0.05, 500);
  scene.background = new THREE.Color('#2b2118');
  scene.add(new THREE.HemisphereLight('#fff1d6', '#4a3b2a', 1.4));
  const sun = new THREE.DirectionalLight('#ffe2b0', 2.2); sun.position.set(4, 8, 5); scene.add(sun);
  const mat = (c, extra = {}) => { const m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...extra }); ownedMat.push(m); return m; };
  const geo = (g) => { owned.push(g); return g; };
  const ground = new THREE.Mesh(geo(new THREE.CircleGeometry(1, 48)), mat('#5a4631')); ground.rotation.x = -Math.PI / 2; scene.add(ground);
  const grid = new THREE.GridHelper(2, 20, '#8a7556', '#6b573f'); owned.push(grid.geometry); ownedMat.push(grid.material); scene.add(grid);
  const arrow = new THREE.Group(); // zeigt nach +z
  const shaft = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.03, 0.03, 1, 8)), mat('#62b9a8', { emissive: '#1d5a4e' }));
  const head = new THREE.Mesh(geo(new THREE.ConeGeometry(0.09, 0.22, 12)), mat('#62b9a8', { emissive: '#1d5a4e' }));
  shaft.rotation.x = Math.PI / 2; shaft.position.z = 0.5; head.rotation.x = Math.PI / 2; head.position.z = 1.1; arrow.add(shaft, head); scene.add(arrow);
  const human = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.25, 0.25, 1.8, 14)), mat('#8c8c8c', { transparent: true, opacity: 0.55 })); human.position.y = 0.9; scene.add(human);

  const frame = () => {
    const sz = inst.size, r = Math.max(sz.x, sz.z) / 2, big = Math.max(sz.x, sz.y, sz.z, 1.8);
    ground.scale.setScalar(Math.max(big, 3) * 1.4); grid.scale.setScalar(Math.max(big, 3) * 1.4 / 1);
    arrow.scale.setScalar(Math.max(0.35, big * 0.35)); arrow.position.set(0, 0.02, r + 0.15 * big);
    human.position.x = -(r + 0.7); human.visible = true;
    S.dist = Math.max(big * 2.1, (r + 1.2) * 2.4); S.ty = Math.max(sz.y, 1.8) * 0.45;
  };
  const place = () => {
    inst?.dispose(); inst = null;
    inst = game.assets.model(id, def());
    if (!inst) return;
    game.assets.live.delete(inst); // die Spiel-Uhr soll die Vorschau-Animation nicht zusätzlich weiterschalten
    scene.add(inst.object);
    if (S.clip != null) inst.play(S.clip, { loop: 'repeat' });
    frame(); text();
  };
  const text = () => {
    const sz = inst.size;
    info.textContent = `${sz.x.toFixed(2)} × ${sz.y.toFixed(2)} × ${sz.z.toFixed(2)} m (Breite × Höhe × Tiefe) · ${a.triangles} Dreiecke · Grüner Pfeil = „vorn“ im Spiel, grauer Zylinder = 1,8-m-Mensch`;
  };
  const buildClips = () => {
    clips.replaceChildren(...a.clips.map((c) => mkBtn('▶ ' + c.name, (ev) => {
      S.clip = S.clip === c.name ? null : c.name;
      if (S.clip == null) inst.stop(); else inst.play(S.clip, { loop: 'repeat' });
      for (const b of clips.children) b.setAttribute('aria-pressed', String(b === ev.currentTarget && S.clip != null));
    })));
    for (const b of clips.children) b.setAttribute('aria-pressed', 'false');
  };

  const draw = (dt = 0) => {
    if (!renderer || !inst) return;
    if (S.auto) S.theta += dt * 0.5;
    inst.update(dt);
    const d = S.dist ?? 6;
    cam.position.set(Math.sin(S.theta) * d, S.ty + d * 0.28, Math.cos(S.theta) * d);
    cam.lookAt(0, S.ty, 0);
    const w = canvas.clientWidth || 380, h = canvas.clientHeight || 260;
    if (canvas.width !== w * renderer.getPixelRatio() || canvas.height !== h * renderer.getPixelRatio()) { renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
    renderer.render(scene, cam);
  };
  const loop = (t) => { const dt = Math.min(0.1, (t - last) / 1000); last = t; draw(dt); raf = requestAnimationFrame(loop); };

  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  } catch (e) { note.textContent = 'Die 3D-Vorschau ist hier nicht möglich (' + (e.message ?? e) + '). Die Einstellungen kannst du trotzdem speichern.'; canvas.style.display = 'none'; renderer = null; }

  // Ziehen dreht die Ansicht (Auto-Drehung pausiert 3 s)
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, th: S.theta }; S.auto = false; clearTimeout(tm); try { canvas.setPointerCapture(e.pointerId); } catch (x) { /* synthetische Ereignisse */ } canvas.style.cursor = 'grabbing'; });
  canvas.addEventListener('pointermove', (e) => { if (drag) S.theta = drag.th - (e.clientX - drag.x) * 0.012; });
  const up = () => { if (!drag) return; drag = null; canvas.style.cursor = ''; tm = setTimeout(() => { S.auto = true; }, 3000); };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);

  const changed = () => {
    S.forward = selF.value; S.origin = selO.value;
    const h = parseFloat(inH.value.replace(',', '.')); S.height = h > 0 && isFinite(h) ? h : null;
    note.textContent = ''; place();
  };
  selF.addEventListener('change', changed); selO.addEventListener('change', changed); inH.addEventListener('input', changed);

  const handle = { id, closed: false, close, draw, state: S, canvas, def, get inst() { return inst; }, controls: { forward: selF, origin: selO, height: inH } };
  current = handle;
  place(); buildClips();
  if (renderer) { draw(0); raf = requestAnimationFrame(loop); }
  selF.focus();
  return handle;
}
