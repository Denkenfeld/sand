// Oberfläche des Stadt-Modus: Orte-Liste, Minimap, Licht- und Anzeigeregler, Infokarte, Beschriftungen, Statistik.
import * as THREE from 'three';
import { el, slider, checkbox, section, hhmm } from '../ui.js';
import { DISTRICTS, DISTRICT_IDS } from './layout.js';
import { KINDS, GROUPS } from './catalog.js';
import { CAM_MODES } from './index.js';
import { audio } from '../core/audio.js';

const $ = (id) => document.getElementById(id);
const MM_EXT = 300; // Meter vom Mittelpunkt, die die Minimap zeigt

export function buildCityUI(forge, cm) {
  const atm = forge.atmosphere;
  const left = $('cleft'), right = $('cright');
  let city = null;

  /* ───────────── Orte-Liste ───────────── */
  const centroid = {};
  function computeCentroids() {
    const g = city.districtGrid, { n, cell, extent } = city.districtGridInfo;
    const acc = {};
    for (let iz = 0; iz < n; iz++) for (let ix = 0; ix < n; ix++) {
      const v = g[iz * n + ix];
      if (!v) continue;
      const id = DISTRICT_IDS[v - 1];
      const a = (acc[id] ??= { x: 0, z: 0, n: 0 });
      a.x += (ix + 0.5) * cell - extent; a.z += (iz + 0.5) * cell - extent; a.n++;
    }
    for (const id of Object.keys(acc)) centroid[id] = { x: acc[id].x / acc[id].n, z: acc[id].z / acc[id].n };
    centroid.core = { x: 0, z: 0 };
  }

  const heightOfPoi = (poi) => {
    let best = null, bd = 6;
    for (const p of city.placements) {
      if (p.kind !== poi.kind) continue;
      const d = Math.hypot(p.x - poi.x, p.z - poi.z);
      if (d < bd) { bd = d; best = p; }
    }
    return best ? Math.max(4, best.ob.h) : 8;
  };

  function buildList() {
    left.replaceChildren();
    const groups = [...DISTRICT_IDS, 'out'];
    for (const id of groups) {
      const pois = city.pois.filter((p) => p.d === id);
      const info = id === 'out' ? { name: 'Vor den Mauern', color: '#a89878', blurb: 'Karawanenlager, Solarfelder, Mine, Festung und Wurmgrube' } : DISTRICTS[id];
      const cnt = id === 'out' ? city.stats.byDistrict.out ?? 0 : city.stats.byDistrict[id] ?? 0;
      const head = el('button', { class: 'dl-head', 'aria-expanded': String(id === 'core'), title: info.blurb },
        el('span', { class: 'sw', style: `background:${info.color}` }), el('span', { class: 'nm' }, info.name), el('span', { class: 'cnt' }, String(cnt)), el('span', { class: 'chev' }, '▾'));
      const body = el('div', { class: 'dl-body' });
      body.hidden = id !== 'core';
      head.addEventListener('click', () => {
        const open = head.getAttribute('aria-expanded') !== 'true';
        head.setAttribute('aria-expanded', String(open));
        body.hidden = !open;
      });
      const c = id === 'out' ? { x: 0, z: city.wallR + 90 } : centroid[id];
      if (c) {
        body.append(el('button', { class: 'dl-row dist', onclick: () => { cm.flyTo(c.x, c.z, { height: 30, dist: id === 'out' ? 190 : 140 }); closeDrawers(); } }, el('span', {}, 'Viertel ansehen'), el('span', { class: 'k' }, '→')));
      }
      for (const p of pois) {
        body.append(el('button', { class: 'dl-row', onclick: () => { cm.flyTo(p.x, p.z, { height: heightOfPoi(p) }); closeDrawers(); } }, el('span', {}, p.name), el('span', { class: 'k' }, '')));
      }
      left.append(head, body);
    }
  }

  /* ───────────── Rechte Regler ───────────── */
  const stat = (label) => { const v = el('span', {}, '–'); return { v, row: [el('span', {}, label), v] }; };
  const sObj = stat('Objekte'), sBld = stat('Gebäude'), sRoad = stat('Straßennetz'), sCalls = stat('Draw-Calls'), sTris = stat('Dreiecke'), sFps = stat('Bilder/s');
  const statGrid = el('div', { class: 'stat-grid' }, ...[sObj, sBld, sRoad, sCalls, sTris, sFps].flatMap((s) => s.row));

  const seedIn = el('input', { type: 'number', min: 1, max: 99999, step: 1, value: cm.seed, 'aria-label': 'Seed' });
  const regen = (seed) => forge.regenerateCity(seed);
  seedIn.addEventListener('change', () => regen(clampSeed(seedIn.value)));
  const clampSeed = (v) => Math.max(1, Math.min(99999, parseInt(v || '1', 10) || 1));
  const citySec = section('Stadt', true, statGrid,
    el('div', { class: 'ctl' }, el('label', {}, 'Stadtplan-Seed'),
      el('div', { class: 'btn-row' }, seedIn, el('button', { class: 'mini', onclick: () => regen(1 + Math.floor(Math.random() * 9998)) }, 'Neue Stadt'))),
    el('p', { class: 'note' }, 'Jeder Seed erzeugt eine andere, aber stimmige Stadt aus denselben Bausteinen: gleiche Zahl = gleiche Stadt.'));

  const compBox = el('div', { class: 'bars' });
  const compSec = section('Zusammensetzung', false, compBox);

  const hourS = slider({ label: 'Uhrzeit', min: 0, max: 24, step: 0.05, value: atm.state.hour, fmt: hhmm, onInput: (v) => atm.setHour(v) });
  const dustS = slider({ label: 'Staub in der Luft', min: 0, max: 1, step: 0.01, value: atm.state.dust, fmt: (v) => Math.round(v * 100) + ' %', onInput: (v) => atm.setDust(v) });
  const sunsC = checkbox('Zwei Sonnen', atm.state.twoSuns, (b) => atm.setTwoSuns(b));
  const cycleC = checkbox('Tag-Nacht-Zyklus laufen lassen', false, (b) => cm.setOption('cycle', b));
  const cycleS = slider({ label: 'Tempo', min: 0.05, max: 1.5, step: 0.05, value: cm.opt.cycleSpeed, fmt: (v) => `${(v * 60).toFixed(0)} min/Std.`, onInput: (v) => cm.setOption('cycleSpeed', v) });
  const syncLight = () => {
    hourS.input.value = atm.state.hour; hourS.out.textContent = hhmm(atm.state.hour);
    dustS.input.value = atm.state.dust; dustS.out.textContent = Math.round(atm.state.dust * 100) + ' %';
    sunsC.input.checked = atm.state.twoSuns;
  };
  const presets = el('div', { class: 'chips' });
  for (const [name, p] of Object.entries(forge.PRESETS)) {
    presets.append(el('button', { class: 'chip', onclick: () => { Object.assign(atm.state, p); atm.apply(); syncLight(); } }, name));
  }
  const lightSec = section('Licht', true, presets, hourS.node, cycleC.node, cycleS.node, dustS.node, sunsC.node,
    slider({ label: 'Belichtung', min: 0.25, max: 1.2, step: 0.01, value: atm.state.exposure, fmt: (v) => v.toFixed(2), onInput: (v) => { atm.state.exposure = v; atm.apply(); } }).node);

  const weatherSec = section('Schmutz & Verschleiß', false,
    slider({ label: 'Schmutz', min: 0, max: 1, step: 0.01, value: forge.weather.uDirt.value, fmt: (v) => Math.round(v * 100) + ' %', onInput: (v) => (forge.weather.uDirt.value = v) }).node,
    slider({ label: 'Sandablagerung', min: 0, max: 1, step: 0.01, value: forge.weather.uSand.value, fmt: (v) => Math.round(v * 100) + ' %', onInput: (v) => (forge.weather.uSand.value = v) }).node,
    slider({ label: 'Lack ab / Rost', min: 0, max: 1, step: 0.01, value: forge.weather.uWear.value, fmt: (v) => Math.round(v * 100) + ' %', onInput: (v) => (forge.weather.uWear.value = v) }).node);

  const labelsC = checkbox('Viertel beschriften', true, (b) => { showLabels = b; });
  let showLabels = true;
  const dispSec = section('Anzeige', false, labelsC.node,
    checkbox('Feuer und Flammen', cm.opt.fires, (b) => cm.setOption('fires', b)).node,
    checkbox('Nachtlicht der Laternen', cm.opt.lights, (b) => cm.setOption('lights', b)).node,
    checkbox('Animierte Gebäude in der Nähe', cm.opt.live, (b) => cm.setOption('live', b)).node,
    checkbox('Schatten', cm.opt.shadows, (b) => cm.setOption('shadows', b)).node,
    checkbox('Collider-Boxen anzeigen', cm.opt.colliders, (b) => cm.setOption('colliders', b)).node,
    slider({ label: 'Detailstufen-Distanz', min: 0.4, max: 2.5, step: 0.05, value: cm.opt.lodScale, fmt: (v) => '×' + v.toFixed(2), onInput: (v) => cm.setOption('lodScale', v) }).node,
    checkbox('Ton', true, (b) => { audio.enabled = b; if (b) audio.init(); }).node,
    el('p', { class: 'note' }, 'Collider-Boxen sind die Kollisionsflächen aller festen Gebäude – die Grundlage für das spätere Spiel (Laufen, Fahren, Zielen).'));

  right.append(citySec, lightSec, weatherSec, dispSec, compSec);

  function buildComposition() {
    compBox.replaceChildren();
    const by = city.stats.byGroup;
    const max = Math.max(...Object.values(by));
    for (const [k, v] of Object.entries(by).sort((a, b) => b[1] - a[1])) {
      compBox.append(el('div', { class: 'b' }, el('span', {}, GROUPS[k] ?? k), el('i', { style: `width:${Math.max(4, (v / max) * 100)}%` }), el('em', {}, String(v))));
    }
  }

  /* ───────────── Kamera-Leiste ───────────── */
  const modeBtn = { orbit: $('c-orbit'), fly: $('c-fly'), walk: $('c-walk'), drive: $('c-drive'), tour: $('c-tour') };
  for (const [m, b] of Object.entries(modeBtn)) b.addEventListener('click', () => { cm.setMode(m); closeDrawers(); });
  $('c-home').addEventListener('click', () => { if (cm.camMode !== 'orbit') cm.setMode('orbit'); cm.overview(); });

  /* ───────────── Fahrzeug: Anzeige und Schalter ───────────── */
  const vhud = $('vhud'), vact = $('vact');
  const SHORT = { lights: 'Licht', boost: 'Boost', demo: 'Rundfahrt', g: 'Schwerkraft' };
  const actLabel = (a) => { const n = SHORT[a.id] ?? a.label; return a.steps ? `${n}: ${a.steps[a.i ?? 0]}` : n; };
  const actBtns = [];
  function buildActions() {
    vact.replaceChildren();
    actBtns.length = 0;
    const ac = cm.actor;
    if (!ac) return;
    ac.actions.forEach((a, i) => {
      const b = el('button', { class: 'act sm', 'aria-pressed': 'false' }, actLabel(a));
      b.addEventListener('click', () => { ac.toggle(i); syncActions(); });
      vact.append(b);
      actBtns.push(b);
    });
    syncActions();
  }
  function syncActions() {
    const ac = cm.actor;
    if (!ac) return;
    ac.actions.forEach((a, i) => {
      if (!actBtns[i]) return;
      actBtns[i].textContent = actLabel(a);
      actBtns[i].setAttribute('aria-pressed', String(!a.steps && !!a.on));
    });
  }

  /* ───────────── Hinweis, Banner, Karte ───────────── */
  const hint = $('hint');
  let hintT = 0;
  const showHint = (txt) => { hint.textContent = txt; hint.hidden = false; clearTimeout(hintT); hintT = setTimeout(() => { if (forge.mode === 'city') hint.hidden = true; }, 8000); };
  const banner = $('dbanner');
  function setBanner(id) {
    const info = id === 'out' || !id ? { name: 'Vor den Mauern', color: '#a89878', blurb: 'Die offene Wüste – Karawanenwege, Solarfelder und Gefahren' } : DISTRICTS[id];
    banner.replaceChildren(el('span', { class: 'dot', style: `background:${info.color}` }), info.name, el('small', {}, info.blurb));
  }

  const card = $('card');
  function setCard(p) {
    card.classList.toggle('show', !!p);
    if (!p) return;
    const d = cm.describe(p);
    card.replaceChildren(
      el('h3', {}, d.name),
      el('div', { class: 'sub' }, d.district),
      el('dl', {}, el('dt', {}, 'Variante'), el('dd', {}, d.variant), el('dt', {}, 'Maße'), el('dd', {}, d.size), el('dt', {}, 'Dreiecke'), el('dd', {}, String(d.tris)), el('dt', {}, 'Art'), el('dd', {}, d.live ? 'animiert in der Nähe' : d.type === 'building' ? 'Gebäude' : d.type === 'vehicle' ? 'Fahrzeug' : d.type === 'figure' ? 'Figur' : d.type === 'wall' ? 'Mauer' : 'Objekt')),
      el('div', { class: 'btn-row' },
        el('button', { class: 'mini', onclick: () => cm.flyTo(p.ob.x, p.ob.z, { height: p.ob.h }) }, 'Hinfliegen'),
        el('button', { class: 'mini', onclick: () => cm.select(null) }, 'Schließen')));
  }

  /* Minimap */
  const mm = $('minimap');
  const mctx = mm.getContext('2d');
  let mmStatic = null, mmSize = 0;
  const S = () => mmSize / (2 * MM_EXT);
  const MX = (x) => (x + MM_EXT) * S();

  function drawStatic() {
    mmSize = Math.max(100, Math.round((mm.clientWidth || 200) * Math.min(window.devicePixelRatio || 1, 2)));
    mm.width = mm.height = mmSize;
    const c = document.createElement('canvas');
    c.width = c.height = mmSize;
    const g = c.getContext('2d');
    const s = S();
    // Boden + Distrikte (pro Pixel aus dem Raster)
    const img = g.createImageData(mmSize, mmSize);
    const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    const cols = DISTRICT_IDS.map((id) => hex(DISTRICTS[id].color));
    const gr = city.districtGrid, { n, cell, extent } = city.districtGridInfo;
    for (let py = 0; py < mmSize; py++) for (let px = 0; px < mmSize; px++) {
      const x = px / s - MM_EXT, z = py / s - MM_EXT;
      const ix = Math.floor((x + extent) / cell), iz = Math.floor((z + extent) / cell);
      const v = ix >= 0 && iz >= 0 && ix < n && iz < n ? gr[iz * n + ix] : 0;
      const o = (py * mmSize + px) * 4;
      if (v) { const k = cols[v - 1]; img.data[o] = 120 + k[0] * 0.38; img.data[o + 1] = 98 + k[1] * 0.38; img.data[o + 2] = 70 + k[2] * 0.38; }
      else { img.data[o] = 150; img.data[o + 1] = 118; img.data[o + 2] = 80; }
      img.data[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    g.lineCap = g.lineJoin = 'round';
    // Straßen
    g.strokeStyle = 'rgba(244,228,190,0.9)';
    for (const r of city.roads) {
      g.lineWidth = Math.max(1, r.hw * 2 * s * 0.9);
      g.beginPath();
      r.pts.forEach(([x, z], i) => (i ? g.lineTo(MX(x), MX(z)) : g.moveTo(MX(x), MX(z))));
      if (r.closed) g.closePath();
      g.stroke();
    }
    // Plätze
    g.fillStyle = 'rgba(255,244,214,0.95)';
    for (const p of city.plazas) {
      g.beginPath();
      if (p.type === 'circle' || p.r) g.arc(MX(p.x), MX(p.z), (p.r ?? 8) * s, 0, Math.PI * 2);
      else { g.save(); g.translate(MX(p.x), MX(p.z)); g.rotate(-p.rot); g.rect(-p.w * s / 2, -p.d * s / 2, p.w * s, p.d * s); g.restore(); }
      g.fill();
    }
    // Gebäude
    for (const p of city.placements) {
      const info = KINDS[p.kind];
      if (info.type !== 'building' || p.kind === 'ruin') continue;
      const o = p.ob;
      g.fillStyle = info.color;
      g.globalAlpha = 0.95;
      g.save();
      g.translate(MX(o.x), MX(o.z));
      g.rotate(-Math.atan2(o.s, o.c));
      g.fillRect(-o.hx * s, -o.hz * s, o.hx * 2 * s, o.hz * 2 * s);
      g.strokeStyle = 'rgba(20,12,6,0.65)';
      g.lineWidth = 0.6;
      g.strokeRect(-o.hx * s, -o.hz * s, o.hx * 2 * s, o.hz * 2 * s);
      g.restore();
    }
    g.globalAlpha = 1;
    // Mauer
    g.strokeStyle = '#2a1e14';
    g.lineWidth = Math.max(1.6, 3.4 * s);
    g.beginPath();
    city.wallPts.forEach(([x, z], i) => (i ? g.lineTo(MX(x), MX(z)) : g.moveTo(MX(x), MX(z))));
    g.closePath();
    g.stroke();
    g.strokeStyle = '#d8c8a8';
    g.lineWidth = Math.max(0.8, 1.6 * s);
    g.stroke();
    // Tore
    g.fillStyle = '#62d9c0';
    for (const p of city.placements) if (p.kind === 'gate') { g.beginPath(); g.arc(MX(p.x), MX(p.z), Math.max(2.4, 5 * s), 0, Math.PI * 2); g.fill(); }
    // Sehenswürdigkeiten
    g.fillStyle = '#fff';
    g.strokeStyle = '#1b1007';
    g.lineWidth = 1;
    for (const p of city.pois) {
      if (Math.hypot(p.x, p.z) > MM_EXT - 4) continue;
      g.beginPath(); g.arc(MX(p.x), MX(p.z), 2.2, 0, Math.PI * 2); g.fill(); g.stroke();
    }
    mmStatic = c;
  }

  const _d = new THREE.Vector3();
  function drawMinimap() {
    if (!mmStatic) return;
    mctx.drawImage(mmStatic, 0, 0);
    const cam = forge.camera, s = S();
    const orbit = cm.camMode === 'orbit';
    const cx = MX(cam.position.x), cz = MX(cam.position.z);
    cam.getWorldDirection(_d);
    const ang = Math.atan2(_d.z, _d.x);
    if (orbit) { // Blickpunkt am Boden + Sichtlinie
      const t = forge.controls.target;
      mctx.strokeStyle = 'rgba(98,217,192,0.9)';
      mctx.lineWidth = 1.5;
      mctx.beginPath(); mctx.moveTo(cx, cz); mctx.lineTo(MX(t.x), MX(t.z)); mctx.stroke();
      mctx.beginPath(); mctx.arc(MX(t.x), MX(t.z), 5, 0, Math.PI * 2); mctx.stroke();
    }
    if (cm.selected) {
      mctx.strokeStyle = '#62d9c0';
      mctx.lineWidth = 2;
      mctx.beginPath(); mctx.arc(MX(cm.selected.ob.x), MX(cm.selected.ob.z), 7, 0, Math.PI * 2); mctx.stroke();
    }
    // Buggy: türkisfarbener Pfeil (auch geparkt – so findet man ihn wieder)
    const ac = cm.actor;
    if (ac && !ac.parked) {
      mctx.save();
      mctx.translate(MX(ac.x), MX(ac.z));
      mctx.rotate(Math.atan2(-Math.cos(ac.ry), -Math.sin(ac.ry)));
      mctx.fillStyle = '#62d9c0';
      mctx.strokeStyle = '#06201b';
      mctx.lineWidth = 1.5;
      mctx.beginPath(); mctx.moveTo(7, 0); mctx.lineTo(-5, -5); mctx.lineTo(-2.5, 0); mctx.lineTo(-5, 5); mctx.closePath(); mctx.fill(); mctx.stroke();
      mctx.restore();
    }
    // Studio-Spiel: Zonen, Pickups, Einheiten
    if (cm.game && cm.game.running) {
      const gd = cm.game.mapData(), k = MX(1) - MX(0);
      mctx.lineWidth = 1.5;
      for (const z of gd.zones) { mctx.strokeStyle = z.c; mctx.beginPath(); mctx.arc(MX(z.x), MX(z.z), Math.max(4, z.r * k), 0, Math.PI * 2); mctx.stroke(); }
      for (const p of gd.pickups) { mctx.fillStyle = p.c; mctx.fillRect(MX(p.x) - 2.5, MX(p.z) - 2.5, 5, 5); }
      for (const u of gd.units) { mctx.fillStyle = u.c; mctx.beginPath(); mctx.arc(MX(u.x), MX(u.z), u.h ? 3 : 2.2, 0, Math.PI * 2); mctx.fill(); }
    }
    // Kamera als Pfeil mit Sichtkegel
    mctx.save();
    mctx.translate(cx, cz);
    mctx.rotate(ang);
    mctx.fillStyle = 'rgba(255,255,255,0.16)';
    const L = Math.max(30, 70 * s * (orbit ? 1.6 : 1));
    mctx.beginPath(); mctx.moveTo(0, 0); mctx.lineTo(L, -L * 0.55); mctx.lineTo(L, L * 0.55); mctx.closePath(); mctx.fill();
    mctx.fillStyle = '#e8922e';
    mctx.strokeStyle = '#1b1007';
    mctx.lineWidth = 1.5;
    mctx.beginPath(); mctx.moveTo(8, 0); mctx.lineTo(-5, -5.5); mctx.lineTo(-2, 0); mctx.lineTo(-5, 5.5); mctx.closePath(); mctx.fill(); mctx.stroke();
    mctx.restore();
  }

  let mmDown = false;
  const mmPos = (e) => {
    const r = mm.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * 2 * MM_EXT - MM_EXT, ((e.clientY - r.top) / r.height) * 2 * MM_EXT - MM_EXT];
  };
  mm.addEventListener('pointerdown', (e) => { if (cm.camMode === 'play') return; mmDown = true; mm.setPointerCapture(e.pointerId); const [x, z] = mmPos(e); cm.teleport(x, z); });
  mm.addEventListener('pointermove', (e) => { if (mmDown && cm.camMode !== 'walk' && cm.camMode !== 'drive') { const [x, z] = mmPos(e); cm.teleport(x, z); } });
  mm.addEventListener('pointerup', () => { mmDown = false; });
  mm.addEventListener('pointercancel', () => { mmDown = false; });

  /* Viertel-Beschriftung über der Stadt */
  const labelBox = $('labels');
  const labels = {};
  function buildLabels() {
    labelBox.replaceChildren();
    for (const id of DISTRICT_IDS) {
      const c = centroid[id];
      if (!c) continue;
      const n = el('span', {}, DISTRICTS[id].name);
      labelBox.append(n);
      labels[id] = { n, x: c.x, z: c.z };
    }
  }
  const _p = new THREE.Vector3();
  function updateLabels() {
    const cam = forge.camera, w = forge.renderer.domElement.clientWidth, h = forge.renderer.domElement.clientHeight;
    const hgt = cam.position.y;
    for (const l of Object.values(labels)) {
      const d = Math.hypot(l.x - cam.position.x, l.z - cam.position.z);
      const vis = showLabels && cm.camMode !== 'walk' && hgt > 22 && d > 45;
      if (!vis) { l.n.style.opacity = '0'; continue; }
      _p.set(l.x, 6, l.z).project(cam);
      if (_p.z > 1 || Math.abs(_p.x) > 1.05 || Math.abs(_p.y) > 1.05) { l.n.style.opacity = '0'; continue; }
      l.n.style.opacity = String(Math.min(1, (hgt - 22) / 30) * Math.min(1, (d - 45) / 40));
      l.n.style.transform = `translate(${((_p.x * 0.5 + 0.5) * w).toFixed(1)}px, ${((-_p.y * 0.5 + 0.5) * h).toFixed(1)}px) translate(-50%, -50%)`;
    }
  }

  /* Touch-Steuerkreuz */
  const pad = $('touchpad');
  const coarse = matchMedia('(pointer: coarse)').matches;
  for (const b of pad.querySelectorAll('button')) {
    const k = b.dataset.k;
    const down = (e) => { e.preventDefault(); forge.keys.add(k); };
    const up = () => forge.keys.delete(k);
    b.addEventListener('pointerdown', down);
    b.addEventListener('pointerup', up);
    b.addEventListener('pointerleave', up);
    b.addEventListener('pointercancel', up);
  }

  /* Schubladen auf schmalen Bildschirmen */
  const tl = $('tg-left'), tr = $('tg-right');
  function closeDrawers() {
    document.body.classList.remove('p-left', 'p-right');
    tl.setAttribute('aria-pressed', 'false');
    tr.setAttribute('aria-pressed', 'false');
  }

  /* ───────────── Ereignisse ───────────── */
  let statT = 0, mmT = 0;
  cm.on((ev, data) => {
    if (ev === 'city') {
      city = data;
      computeCentroids();
      buildList();
      buildComposition();
      buildLabels();
      drawStatic();
      if (!actBtns.length) buildActions();
      seedIn.value = cm.seed;
      sObj.v.textContent = String(city.stats.total);
      sBld.v.textContent = String(city.stats.buildings);
      sRoad.v.textContent = `${(city.stats.roadLength / 1000).toFixed(1)} km`;
    } else if (ev === 'mode') {
      for (const [m, b] of Object.entries(modeBtn)) b.setAttribute('aria-pressed', String(m === data));
      pad.classList.toggle('on', coarse && (data === 'fly' || data === 'walk' || data === 'drive'));
      document.body.classList.toggle('drive', data === 'drive');
      if (data === 'drive') syncActions();
      showHint(CAM_MODES[data].hint);
    } else if (ev === 'actor') syncActions();
    else if (ev === 'district') setBanner(data);
    else if (ev === 'select') setCard(data);
    else if (ev === 'hour') { hourS.input.value = data; hourS.out.textContent = hhmm(data); }
    else if (ev === 'enter') {
      syncLight();
      setBanner(cm.district);
      tl.textContent = 'Orte';
      tr.textContent = 'Regler';
      mmStatic = null;
      if (city) drawStatic();
    }
  });
  cm.onFrame = (dt) => {
    statT -= dt; mmT -= dt;
    if (mmT <= 0) {
      mmT = 0.1;
      drawMinimap();
      const t = cm.camMode === 'drive' && cm.actor ? cm.actor.hud().split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean).join('   ·   ') : '';
      if (vhud.textContent !== t) vhud.textContent = t;
      vhud.hidden = !t;
    }
    updateLabels();
    if (statT <= 0) {
      statT = 0.5;
      const i = cm.info;
      sCalls.v.textContent = String(i.calls ?? 0);
      sTris.v.textContent = `${((i.tris ?? 0) / 1000).toFixed(0)}k`;
      sFps.v.textContent = String(i.fps ?? 0);
    }
  };
  window.addEventListener('resize', () => { if (city && forge.mode === 'city') drawStatic(); });

  return { syncLight, closeDrawers };
}
