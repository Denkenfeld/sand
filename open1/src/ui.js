// Oberfläche: Objektliste, Regler aus den Parameter-Definitionen, Licht/Wetter/Physik, Aktionsleiste.
import { audio } from './core/audio.js';

const $ = (id) => document.getElementById(id);

export function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k === 'class') n.className = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null) n.append(c.nodeType ? c : document.createTextNode(c));
  return n;
}

export function debounce(fn, ms) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}

let uid = 0;
export function slider({ label, min, max, step, value, fmt = (v) => v, onInput }) {
  const id = 'c' + ++uid;
  const out = el('output', { for: id }, fmt(value));
  const input = el('input', { id, type: 'range', min, max, step, value });
  input.addEventListener('input', () => {
    const v = parseFloat(input.value);
    out.textContent = fmt(v);
    onInput(v);
  });
  return { node: el('div', { class: 'ctl' }, el('div', { class: 'ctl-row' }, el('label', { for: id }, label), out), input), input, out, fmt };
}

export function checkbox(label, checked, onChange) {
  const id = 'c' + ++uid;
  const input = el('input', { id, type: 'checkbox' });
  input.checked = checked;
  input.addEventListener('change', () => onChange(input.checked));
  return { node: el('div', { class: 'check' }, input, el('label', { for: id }, label)), input };
}

export function section(title, open, ...kids) {
  const d = el('details', {}, el('summary', {}, title), el('div', { class: 'sec' }, ...kids));
  if (open) d.open = true;
  return d;
}

export const hhmm = (h) => {
  const H = Math.floor(h), M = Math.round((h - H) * 60);
  return `${String(M === 60 ? H + 1 : H).padStart(2, '0')}:${String(M === 60 ? 0 : M).padStart(2, '0')}`;
};

export function buildUI(forge) {
  /* ── Linke Liste ── */
  const left = $('left');
  const cats = {};
  for (const [id, def] of Object.entries(forge.objects)) (cats[def.category] ??= []).push([id, def]);
  const buttons = {};
  const MODE_TAG = { vehicle: 'fahrbar', hover: 'fliegt', character: 'läuft', rigid: 'beweglich', static: '' };
  // Kategorien sind einklappbar (bei 37 Objekten sonst eine lange Liste); die Kategorie des gewählten Objekts klappt automatisch auf
  const groups = {};
  let closed = { 'Kulisse & Beispiele': true };
  try { const s = localStorage.getItem('forge-closed-cats'); if (s) closed = JSON.parse(s); } catch (e) { /* ohne Speicher */ }
  const saveClosed = () => { try { localStorage.setItem('forge-closed-cats', JSON.stringify(closed)); } catch (e) { /* ignorieren */ } };
  const setOpen = (cat, open) => {
    const g = groups[cat];
    g.head.setAttribute('aria-expanded', String(open));
    g.body.hidden = !open;
  };
  for (const [cat, list] of Object.entries(cats)) {
    const head = el('button', { class: 'cat', 'aria-expanded': 'true' }, el('span', {}, cat), el('span', { class: 'cnt' }, String(list.length)));
    const body = el('div', { class: 'cat-body' });
    groups[cat] = { head, body };
    head.onclick = () => {
      const open = head.getAttribute('aria-expanded') !== 'true';
      closed[cat] = !open;
      saveClosed();
      setOpen(cat, open);
    };
    left.append(head, body);
    for (const [id, def] of list) {
      const b = el('button', { class: 'obj-btn', 'aria-pressed': 'false', onclick: () => { forge.select(id); closeDrawers(); } }, el('span', {}, def.label), el('span', { class: 'tag' }, def.tag ?? ''));
      buttons[id] = b;
      body.append(b);
    }
    setOpen(cat, !closed[cat]);
  }

  /* ── Rechte Regler ── */
  const right = $('right');
  const paramBox = el('div', { class: 'sec' });
  const paramSec = el('details', { open: true }, el('summary', {}, 'Objekt'), paramBox);

  const weatherSec = section(
    'Schmutz & Verschleiß',
    true,
    slider({ label: 'Schmutz', min: 0, max: 1, step: 0.01, value: forge.weather.uDirt.value, fmt: (v) => Math.round(v * 100) + ' %', onInput: (v) => (forge.weather.uDirt.value = v) }).node,
    slider({ label: 'Sandablagerung', min: 0, max: 1, step: 0.01, value: forge.weather.uSand.value, fmt: (v) => Math.round(v * 100) + ' %', onInput: (v) => (forge.weather.uSand.value = v) }).node,
    slider({ label: 'Lack ab / Rost', min: 0, max: 1, step: 0.01, value: forge.weather.uWear.value, fmt: (v) => Math.round(v * 100) + ' %', onInput: (v) => (forge.weather.uWear.value = v) }).node
  );

  const atm = forge.atmosphere;
  const hourS = slider({ label: 'Uhrzeit', min: 5.6, max: 18.4, step: 0.05, value: atm.state.hour, fmt: hhmm, onInput: (v) => atm.setHour(v) });
  const dustS = slider({ label: 'Staub in der Luft', min: 0, max: 1, step: 0.01, value: atm.state.dust, fmt: (v) => Math.round(v * 100) + ' %', onInput: (v) => atm.setDust(v) });
  const sunsC = checkbox('Zwei Sonnen', atm.state.twoSuns, (b) => atm.setTwoSuns(b));
  const presets = el('div', { class: 'chips' });
  for (const [name, p] of Object.entries(forge.PRESETS)) {
    presets.append(
      el('button', {
        class: 'chip',
        onclick: () => {
          Object.assign(atm.state, p);
          atm.apply();
          hourS.input.value = p.hour; hourS.out.textContent = hhmm(p.hour);
          dustS.input.value = p.dust; dustS.out.textContent = Math.round(p.dust * 100) + ' %';
          sunsC.input.checked = p.twoSuns;
        },
      }, name)
    );
  }
  const lightSec = section('Licht', true, presets, hourS.node, dustS.node, sunsC.node,
    slider({ label: 'Belichtung', min: 0.25, max: 1.2, step: 0.01, value: atm.state.exposure, fmt: (v) => v.toFixed(2), onInput: (v) => { atm.state.exposure = v; atm.apply(); } }).node);

  const gravityS = slider({ label: 'Schwerkraft', min: 1, max: 20, step: 0.1, value: forge.physics.gravity, fmt: (v) => v.toFixed(1) + ' m/s²', onInput: (v) => forge.physics.setGravity(v) });
  const slowS = slider({ label: 'Zeitlupe', min: 0.1, max: 1.5, step: 0.05, value: 1, fmt: (v) => '×' + v.toFixed(2), onInput: (v) => (forge.physics.timeScale = v) });
  const pauseC = checkbox('Physik anhalten', false, (b) => (forge.physics.paused = b));
  const colC = checkbox('Collider anzeigen', false, (b) => (forge.debug.visible = b));
  const soundC = checkbox('Ton', true, (b) => { audio.enabled = b; if (b) audio.init(); });
  const physSec = section('Physik', false, colC.node, pauseC.node, gravityS.node, slowS.node,
    el('div', { class: 'btn-row' },
      el('button', { class: 'mini', onclick: () => forge.addObstacles() }, 'Hindernisse stellen'),
      el('button', { class: 'mini', onclick: () => { forge.clearExtras(); forge.emit(); } }, 'Entfernen')),
    el('p', { class: 'note' }, 'Hindernisse: Wand, Rampe und ein Kistenstapel zum Testen von Kollisionen.'),
    soundC.node);

  const copyBtn = el('button', { class: 'mini' }, 'Rezept kopieren');
  copyBtn.addEventListener('click', async () => {
    const txt = forge.recipe();
    try { await navigator.clipboard.writeText(txt); copyBtn.textContent = 'Kopiert'; }
    catch { copyBtn.textContent = 'Kopieren nicht möglich'; }
    setTimeout(() => (copyBtn.textContent = 'Rezept kopieren'), 1600);
  });
  const exportSec = section('Export', false,
    el('div', { class: 'btn-row' }, el('button', { class: 'mini', onclick: () => forge.exportGLB() }, 'Als GLB speichern'), copyBtn),
    el('p', { class: 'note' }, 'Das Rezept enthält Objekt, Parameter, Wetter und Licht. Einfügen in den Chat reicht, damit ich genau diesen Stand weiterbaue. Der GLB-Download funktioniert nur in der lokal geöffneten Datei.'));

  right.append(paramSec, weatherSec, lightSec, physSec, exportSec);

  /* ── Parameter-Regler je Objekt ── */
  function renderParams() {
    paramBox.replaceChildren();
    const def = forge.def;
    if (!def) return;
    paramSec.querySelector('summary').textContent = def.label;
    for (const p of def.params) {
      const v = forge.params[p.key];
      if (p.type === 'select') {
        const id = 'c' + ++uid;
        const sel = el('select', { id }, p.options.map(([val, lab]) => el('option', { value: val }, lab)));
        sel.value = v;
        sel.addEventListener('change', () => forge.setParam(p.key, sel.value));
        paramBox.append(el('div', { class: 'ctl' }, el('label', { for: id }, p.label), sel));
      } else if (p.type === 'bool') {
        paramBox.append(checkbox(p.label, !!v, (b) => forge.setParam(p.key, b)).node);
      } else if (p.type === 'seed') {
        const id = 'c' + ++uid;
        const inp = el('input', { id, type: 'number', min: 0, max: 99999, step: 1, value: v });
        inp.addEventListener('change', () => forge.setParam(p.key, parseInt(inp.value || '0', 10)));
        paramBox.append(el('div', { class: 'ctl' }, el('label', { for: id }, p.label),
          el('div', { class: 'btn-row' }, inp, el('button', { class: 'mini', onclick: () => forge.randomize() }, 'Würfeln'))));
      } else {
        const fmt = p.fmt ?? ((x) => (p.step < 1 ? x.toFixed(p.step < 0.1 ? 2 : 1) : String(x)) + (p.unit ? ' ' + p.unit : ''));
        const apply = debounce((x) => forge.setParam(p.key, x), 90);
        paramBox.append(slider({ label: p.label, min: p.min, max: p.max, step: p.step, value: v, fmt, onInput: apply }).node);
      }
    }
    paramBox.append(el('button', { class: 'mini', onclick: () => forge.resetParams() }, 'Standardwerte'));
  }

  /* ── Aktionsleiste ── */
  const bBuild = $('a-build'), bBoom = $('a-boom'), bReset = $('a-reset'), bTest = $('a-test'), sStyle = $('a-style');
  bBuild.addEventListener('click', () => forge.build(sStyle.value));
  sStyle.addEventListener('change', () => { forge.buildStyle = sStyle.value; forge.build(sStyle.value); });
  bBoom.addEventListener('click', () => forge.explode());
  bReset.addEventListener('click', () => forge.reset());
  bTest.addEventListener('click', () => forge.setTest(!forge.testing));

  const hint = $('hint');
  const hud = $('hud');
  const HINTS = {
    vehicle: 'W/S Gas und Rückwärts · A/D Lenken · Leertaste Bremse · Shift Boost · Esc beenden',
    hover: 'W/S Schub · A/D Drehen · Shift Boost · Esc beenden',
    character: 'W/A/S/D Laufen (relativ zur Kamera) · Shift Rennen · Leertaste Springen · Esc beenden',
  };
  const STATE = { idle: 'bereit', building: 'baut auf', active: 'aktiv', exploded: 'zerstört' };

  let lastId = null;
  forge.on(() => {
    const d = forge.def;
    if (!d) return;
    for (const [id, b] of Object.entries(buttons)) b.setAttribute('aria-pressed', String(id === forge.id));
    const cur = forge.objects[forge.id]?.category;
    if (cur && groups[cur] && groups[cur].body.hidden) setOpen(cur, true);
    if (forge.id !== lastId) {
      lastId = forge.id;
      renderParams();
      sStyle.value = forge.buildStyle;
      $('brand-sub').textContent = d.hint ?? '';
    }
    const o = forge.obj;
    const testable = o && ['vehicle', 'hover', 'character'].includes(o.mode);
    bTest.disabled = !testable;
    bTest.title = testable ? '' : 'Nur Fahrzeuge und Figuren lassen sich steuern';
    bTest.setAttribute('aria-pressed', String(forge.testing));
    bTest.textContent = forge.testing ? 'Beenden' : o && o.mode === 'character' ? 'Steuern' : 'Testfahrt';
    hint.hidden = !forge.testing;
    if (forge.testing && o) hint.textContent = HINTS[o.mode];
    const s = forge.stats;
    if (s) {
      hud.innerHTML = `<b>${d.label}</b><br>Teile <b>${s.parts}</b> · Trümmer <b>${s.debris}</b><br>Dreiecke <b>${(s.tris / 1000).toFixed(0)}k</b> · Bodies <b>${s.bodies}</b><br>Zustand <b>${STATE[s.state] ?? s.state}</b>`;
    }
  });

  /* ── Schubladen auf schmalen Bildschirmen ── */
  const tl = $('tg-left'), tr = $('tg-right');
  function closeDrawers() {
    document.body.classList.remove('p-left', 'p-right');
    tl.setAttribute('aria-pressed', 'false');
    tr.setAttribute('aria-pressed', 'false');
  }
  tl.addEventListener('click', () => {
    const on = !document.body.classList.contains('p-left');
    closeDrawers();
    if (on) { document.body.classList.add('p-left'); tl.setAttribute('aria-pressed', 'true'); }
  });
  tr.addEventListener('click', () => {
    const on = !document.body.classList.contains('p-right');
    closeDrawers();
    if (on) { document.body.classList.add('p-right'); tr.setAttribute('aria-pressed', 'true'); }
  });
}
