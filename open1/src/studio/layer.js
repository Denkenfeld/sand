// UI-Ebene: eine durchsichtige Zeichenfläche über dem Spiel, auf der Skripte beliebige Anzeigen ("Widgets") einblenden.
// Alles läuft über dieselbe öffentliche Schnittstelle (game.ui.widget + Zeichenbefehle `g`); Radar, Balken und Kompass
// (presets.js) benutzen nur genau diese Befehle – sie haben keine Sonderrechte.
//
// Konventionen der Ebene (px = CSS-Pixel, y wächst nach unten):
//   • Winkel: 0 = nach oben, im Uhrzeigersinn positiv, Bogenmaß  (g.polar, g.arc, g.rotate, icon.rotate)
//   • Jedes Widget zeichnet in eigenen Koordinaten: (0,0) = obere linke Ecke des Widgets, g.w × g.h = seine Größe
import * as THREE from 'three';

const TAU = Math.PI * 2;
const EMPTY = Object.freeze({});
const col = (c) => (typeof c === 'number' ? '#' + (c >>> 0).toString(16).padStart(6, '0').slice(-6) : c);

/* ───────────── Zeichenbefehle ───────────── */
export class Painter {
  constructor(ctx) {
    this.ctx = ctx; this.w = 0; this.h = 0; this.dt = 0; this.t = 0; this.screen = { w: 0, h: 0 };
    this._depth = 0;
  }

  // gemeinsame Füll-/Linien-Logik. mode 's' = Standard nur Linie, sonst Standard Füllung
  _do(o, mode) {
    const c = this.ctx; o = o ?? EMPTY;
    const a0 = c.globalAlpha;
    if (o.alpha != null) c.globalAlpha = a0 * o.alpha;
    let f = o.fill, s = o.stroke;
    if (mode === 's') { if (s == null) s = f ?? o.color ?? '#fff'; f = null; }
    else if (f == null && s == null) f = o.color ?? '#fff';
    if (o.glow) { c.shadowBlur = o.glow; c.shadowColor = col(o.glowColor ?? s ?? f ?? '#fff'); }
    if (f != null && f !== false) { c.fillStyle = col(f); c.fill(); }
    if (s != null && s !== false) {
      c.strokeStyle = col(s); c.lineWidth = o.width ?? 1.5; c.lineCap = 'round'; c.lineJoin = 'round';
      if (o.dash) c.setLineDash(o.dash);
      c.stroke();
      if (o.dash) c.setLineDash([]);
    }
    if (o.glow) c.shadowBlur = 0;
    c.globalAlpha = a0;
  }

  /* Zustand */
  push() { this.ctx.save(); this._depth++; return this; }
  pop() { if (this._depth > 0) { this.ctx.restore(); this._depth--; } return this; }
  move(x, y) { this.ctx.translate(x, y); return this; }
  rotate(a) { this.ctx.rotate(a); return this; }
  scale(sx, sy = sx) { this.ctx.scale(sx, sy); return this; }
  alpha(a) { this.ctx.globalAlpha *= a; return this; }
  clipRect(x, y, w, h) { const c = this.ctx; c.beginPath(); c.rect(x, y, w, h); c.clip(); return this; }
  clipCircle(x, y, r) { const c = this.ctx; c.beginPath(); c.arc(x, y, r, 0, TAU); c.clip(); return this; }

  // Punkt im Abstand r vom Mittelpunkt in Richtung a (0 = oben, im Uhrzeigersinn)
  polar(r, a, cx = this.w / 2, cy = this.h / 2) { return { x: cx + Math.sin(a) * r, y: cy - Math.cos(a) * r }; }

  /* Formen */
  rect(x, y, w, h, o) {
    const c = this.ctx, r = Math.min(o?.radius ?? 0, w / 2, h / 2);
    c.beginPath();
    if (r > 0) { c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
    else c.rect(x, y, w, h);
    this._do(o, 'f'); return this;
  }
  circle(x, y, r, o) { const c = this.ctx; c.beginPath(); c.arc(x, y, Math.max(0, r), 0, TAU); this._do(o, 'f'); return this; }
  ring(x, y, r, o) { const c = this.ctx; c.beginPath(); c.arc(x, y, Math.max(0, r), 0, TAU); this._do(o, 's'); return this; }
  arc(x, y, r, a0, a1, o) {
    const c = this.ctx; c.beginPath();
    if (o?.fill != null) c.moveTo(x, y);
    c.arc(x, y, Math.max(0, r), a0 - Math.PI / 2, a1 - Math.PI / 2);
    if (o?.fill != null) c.closePath();
    this._do(o, o?.fill != null ? 'f' : 's'); return this;
  }
  line(x1, y1, x2, y2, o) { const c = this.ctx; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); this._do(o, 's'); return this; }
  poly(pts, o) {
    const c = this.ctx, flat = typeof pts[0] === 'number', n = flat ? pts.length / 2 : pts.length;
    if (n < 2) return this;
    c.beginPath();
    for (let i = 0; i < n; i++) { const x = flat ? pts[i * 2] : pts[i][0], y = flat ? pts[i * 2 + 1] : pts[i][1]; if (i) c.lineTo(x, y); else c.moveTo(x, y); }
    const closed = o?.closed ?? true;
    if (closed) c.closePath();
    this._do(o, closed ? 'f' : 's'); return this;
  }
  // Balken: frac 0…1; o: color, bg, border, radius
  bar(x, y, w, h, frac, o = EMPTY) {
    const f = Math.max(0, Math.min(1, frac)), r = o.radius ?? Math.min(3, h / 2);
    this.rect(x, y, w, h, { fill: o.bg ?? 'rgba(0,0,0,.55)', radius: r });
    if (f > 0.001) { this.push(); this.clipRect(x, y, w * f, h); this.rect(x, y, w, h, { fill: o.color ?? '#58e08a', radius: r }); this.pop(); }
    this.rect(x + 0.5, y + 0.5, w - 1, h - 1, { fill: null, stroke: o.border ?? 'rgba(255,255,255,.28)', width: 1, radius: r });
    return this;
  }
  // Text. o: size, color, align ('left'|'center'|'right'), baseline ('top'|'middle'|'bottom'), bold, mono, font, shadow(false)
  text(str, x, y, o = EMPTY) {
    const c = this.ctx, size = o.size ?? 14;
    c.font = o.font ?? `${o.bold === false ? 400 : 600} ${size}px ${o.mono ? 'ui-monospace, Menlo, Consolas, monospace' : 'system-ui, -apple-system, Segoe UI, sans-serif'}`;
    c.textAlign = o.align ?? 'left'; c.textBaseline = o.baseline ?? 'top';
    const a0 = c.globalAlpha; if (o.alpha != null) c.globalAlpha = a0 * o.alpha;
    if (o.shadow !== false) { c.shadowColor = 'rgba(0,0,0,.85)'; c.shadowBlur = 4; c.shadowOffsetY = 1; }
    c.fillStyle = col(o.color ?? o.fill ?? '#fff');
    c.fillText(String(str), x, y);
    c.shadowBlur = 0; c.shadowOffsetY = 0; c.globalAlpha = a0;
    return this;
  }
  measure(str, size = 14, o = EMPTY) {
    const c = this.ctx; c.font = o.font ?? `${o.bold === false ? 400 : 600} ${size}px ${o.mono ? 'ui-monospace, Menlo, Consolas, monospace' : 'system-ui, sans-serif'}`;
    return c.measureText(String(str)).width;
  }
  // Symbole, zentriert auf (x,y), Größe ≈ Durchmesser. o.rotate dreht (Bogenmaß, 0 = nach oben); sonst wie Formen (fill/stroke/...)
  // Namen: arrow, triangle, chevron, dot, ring, diamond, square, cross, plus, star
  icon(name, x, y, size = 12, o = EMPTY) {
    const c = this.ctx, r = size / 2;
    c.save(); c.translate(x, y); if (o.rotate) c.rotate(o.rotate);
    c.beginPath();
    switch (name) {
      case 'arrow': c.moveTo(0, -r); c.lineTo(r * 0.78, r * 0.8); c.lineTo(0, r * 0.38); c.lineTo(-r * 0.78, r * 0.8); c.closePath(); break;
      case 'triangle': c.moveTo(0, -r); c.lineTo(r * 0.9, r * 0.75); c.lineTo(-r * 0.9, r * 0.75); c.closePath(); break;
      case 'chevron': c.moveTo(-r * 0.8, r * 0.4); c.lineTo(0, -r * 0.5); c.lineTo(r * 0.8, r * 0.4); break;
      case 'diamond': c.moveTo(0, -r); c.lineTo(r * 0.75, 0); c.lineTo(0, r); c.lineTo(-r * 0.75, 0); c.closePath(); break;
      case 'square': c.rect(-r * 0.8, -r * 0.8, r * 1.6, r * 1.6); break;
      case 'cross': c.moveTo(-r * 0.8, -r * 0.8); c.lineTo(r * 0.8, r * 0.8); c.moveTo(r * 0.8, -r * 0.8); c.lineTo(-r * 0.8, r * 0.8); break;
      case 'plus': c.moveTo(0, -r); c.lineTo(0, r); c.moveTo(-r, 0); c.lineTo(r, 0); break;
      case 'star': for (let i = 0; i < 10; i++) { const a = (i * Math.PI) / 5, rr = i % 2 ? r * 0.42 : r; const px = Math.sin(a) * rr, py = -Math.cos(a) * rr; if (i) c.lineTo(px, py); else c.moveTo(px, py); } c.closePath(); break;
      case 'ring': c.arc(0, 0, r * 0.8, 0, TAU); break;
      default: c.arc(0, 0, r * 0.7, 0, TAU); // 'dot'
    }
    const line = name === 'cross' || name === 'plus' || name === 'chevron' || name === 'ring';
    this._do(o, line ? 's' : 'f');
    c.restore();
    return this;
  }
}

/* ───────────── Widgets ───────────── */
const ANCHORS = 'top-left, top (oder top-center), top-right, left, center, right, bottom-left, bottom (oder bottom-center), bottom-right';
function parseAnchor(a) {
  a = String(a ?? 'top-left').toLowerCase();
  return { h: a.includes('left') ? 0 : a.includes('right') ? 1 : 0.5, v: a.includes('top') ? 0 : a.includes('bottom') ? 1 : 0.5 };
}
const size = (v, total, dflt) => (v == null ? dflt : typeof v === 'string' && v.endsWith('%') ? (parseFloat(v) / 100) * total : +v);

const WIDGET_KEYS = new Set(['id', 'anchor', 'x', 'y', 'w', 'h', 'size', 'margin', 'z', 'visible', 'alpha', 'clip', 'draw', 'data',
  'pointer', 'cursor', 'disabled', 'focusable', 'onClick', 'onDown', 'onUp', 'onEnter', 'onLeave', 'onKey', 'onDisabledClick']);

export class Widget {
  constructor(layer, o) {
    this.layer = layer; this.removed = false;
    this.id = o.id; this.anchor = 'top-left'; this.x = 0; this.y = 0; this.w = 100; this.h = 100; this.margin = 16;
    this.z = 0; this.visible = true; this.alpha = 1; this.clip = true; this.draw = null; this.data = {};
    this.pointer = false; this.cursor = 'pointer'; this.disabled = false; this.focusable = false;
    this.hover = false; this.down = false; this.focused = false; this.mouse = { x: 0, y: 0 };
    this.onClick = this.onDown = this.onUp = this.onEnter = this.onLeave = this.onKey = this.onDisabledClick = null;
    this._f = 1; this._ft = 1; this._fs = 0.25; this._err = false; this.rect = { x: 0, y: 0, w: 0, h: 0 };
    this.set(o);
  }
  // Eigenschaften ändern: w.set({ anchor:'top', y: 40, alpha: .8 })
  set(o = {}) {
    for (const k of Object.keys(o)) {
      if (!WIDGET_KEYS.has(k)) { this.layer.warn('Widget: unbekannte Eigenschaft „' + k + '“ – gültig sind ' + [...WIDGET_KEYS].join(', ')); continue; }
      if (k === 'size') { this.w = o.size; this.h = o.size; continue; }
      if (k === 'anchor') {
        const a = String(o.anchor).toLowerCase();
        if (!/^(top|bottom|left|right|center|middle)([- ](left|right|center|top|bottom))?$/.test(a)) this.layer.warn('Widget: Anker „' + o.anchor + '“ unbekannt. Gültig: ' + ANCHORS);
      }
      this[k] = o[k];
    }
    if (o.draw) this._err = false;
    if (o.pointer === undefined && (o.onClick || o.onDown || o.onUp || o.onEnter || o.onLeave)) this.pointer = true;
    if (o.z != null) this.layer.dirty = true;
    return this;
  }
  move(x, y) { this.x = x; this.y = y; return this; }
  show(sec = 0.25) { this.visible = true; this._ft = 1; this._fs = Math.max(0.001, sec); if (sec <= 0) this._f = 1; return this; }
  hide(sec = 0.25) { this._ft = 0; this._fs = Math.max(0.001, sec); if (sec <= 0) this._f = 0; return this; }
  remove() { this.removed = true; this.layer._drop(this); }
  focus() { this.layer.focus(this); return this; }
  get shown() { return this.visible && this._ft > 0; }
}

export class UiLayer {
  constructor(root) {
    const cv = (this.canvas = document.createElement('canvas'));
    cv.id = 'gamelayer';
    cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
    root.insertBefore(cv, root.firstChild);
    this.ctx = cv.getContext('2d', { willReadFrequently: !!window.__forgeLayerCpu }); // Testschalter: CPU-Canvas, damit sich Pixel ohne GPU-Wartezeit lesen lassen
    this.g = new Painter(this.ctx);
    this.list = []; this.byId = new Map(); this.dirty = false; this.seq = 0;
    this.cw = 0; this.ch = 0; this.dpr = 1;
    this.onError = (e) => console.error(e); this.onWarn = (m) => console.warn(m);
    this.camera = null; this._v = new THREE.Vector3();
    this.warned = new Set();
    this._empty = true;
    this.hovered = null; this.pressed = null; this.focused = null; this.blocked = () => false; this._bound = false;
  }

  warn(msg) { if (this.warned.has(msg)) return; this.warned.add(msg); this.onWarn(msg); }

  get screen() { return { w: this.cw, h: this.ch }; }

  widget(o = {}) {
    if (typeof o === 'function') o = { draw: o };
    const id = o.id ?? 'widget' + this.seq;
    const old = this.byId.get(id);
    if (old) old.remove();
    const w = new Widget(this, { ...o, id });
    w.order = this.seq++;
    this.list.push(w); this.byId.set(id, w); this.dirty = true;
    return w;
  }
  get(id) { return this.byId.get(id) ?? null; }
  _drop(w) {
    this.list = this.list.filter((x) => x !== w); if (this.byId.get(w.id) === w) this.byId.delete(w.id);
    if (this.hovered === w) { this.hovered = null; this._cursor(null); }
    if (this.pressed === w) this.pressed = null;
    if (this.focused === w) this.focused = null;
  }
  remove(id) { this.byId.get(id)?.remove(); }
  clear() {
    this.list = []; this.byId.clear(); this.warned.clear();
    this.hovered = this.pressed = this.focused = null; this._cursor(null);
    if (!this._empty) { this.ctx.setTransform(1, 0, 0, 1, 0, 0); this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); this._empty = true; }
  }


  /* ───────────── Eingabe (Zeiger, Tastatur) ───────────── */
  bind() {
    if (this._bound) return;
    this._bound = true;
    this._h = { down: (e) => this._down(e), move: (e) => this._move(e), up: (e) => this._up(e), key: (e) => this._key(e), cancel: () => this._release() };
    const h = this._h;
    window.addEventListener('pointerdown', h.down, true);
    window.addEventListener('pointermove', h.move, true);
    window.addEventListener('pointerup', h.up, true);
    window.addEventListener('pointercancel', h.cancel, true);
    window.addEventListener('keydown', h.key, true);
  }
  unbind() {
    if (!this._bound) return;
    const h = this._h;
    window.removeEventListener('pointerdown', h.down, true);
    window.removeEventListener('pointermove', h.move, true);
    window.removeEventListener('pointerup', h.up, true);
    window.removeEventListener('pointercancel', h.cancel, true);
    window.removeEventListener('keydown', h.key, true);
    this._bound = false;
    this._release(); this._cursor(null);
  }
  _cursor(c) { try { document.body.style.cursor = c || ''; } catch (e) { /* egal */ } }
  _release() { if (this.pressed) this.pressed.down = false; this.pressed = null; if (this.hovered) { this.hovered.hover = false; this.hovered = null; } this._cursor(null); }
  _canHit(w) { return w.pointer && w.visible && !w.removed && w._f * w.alpha > 0.05 && w.draw; }
  _pt(e) {
    if (document.pointerLockElement || this.blocked()) return null;
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  _hit(x, y) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const w = this.list[i];
      if (!this._canHit(w)) continue;
      const r = w.rect;
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return w;
    }
    return null;
  }
  _call(w, name, e, extra = {}) {
    const f = w[name];
    if (!f) return undefined;
    try { return f.call(w, { widget: w, x: w.mouse.x, y: w.mouse.y, button: e?.button ?? 0, pointerType: e?.pointerType ?? 'mouse', shift: !!e?.shiftKey, ctrl: !!e?.ctrlKey, ...extra }); }
    catch (err) { this.onError(err, 'UI-Widget „' + w.id + '“ ' + name); }
    return undefined;
  }
  _move(e) {
    const pt = this._pt(e), w = pt ? this._hit(pt.x, pt.y) : null;
    if (this.hovered && this.hovered !== w) { const o = this.hovered; o.hover = false; this.hovered = null; this._call(o, 'onLeave', e); }
    if (w) {
      w.mouse.x = pt.x - w.rect.x; w.mouse.y = pt.y - w.rect.y;
      if (this.hovered !== w) { this.hovered = w; w.hover = true; this._call(w, 'onEnter', e); }
    }
    this._cursor(w && !w.disabled ? w.cursor : null);
  }
  _down(e) {
    const pt = this._pt(e);
    if (!pt) return;
    this._move(e);
    const w = this._hit(pt.x, pt.y);
    if (!w) { if (this.focused) { this.focused.focused = false; this.focused = null; } return; }
    w.mouse.x = pt.x - w.rect.x; w.mouse.y = pt.y - w.rect.y;
    e.preventDefault(); e.stopImmediatePropagation();
    if (w.disabled) { this._call(w, 'onDisabledClick', e); return; }
    this.pressed = w; w.down = true;
    if (w.focusable) this.focus(w);
    this._call(w, 'onDown', e);
  }
  _up(e) {
    const w = this.pressed;
    if (!w) return;
    this.pressed = null; w.down = false;
    const pt = this._pt(e), inside = pt && this._hit(pt.x, pt.y) === w;
    if (pt) { w.mouse.x = pt.x - w.rect.x; w.mouse.y = pt.y - w.rect.y; }
    e.preventDefault(); e.stopImmediatePropagation();
    this._call(w, 'onUp', e);
    if (inside && !w.disabled && !w.removed) this._call(w, 'onClick', e);
  }
  _key(e) {
    const f = this.focused;
    if (!f || f.removed || !f.onKey || this.blocked()) return;
    const r = this._call(f, 'onKey', e, { key: e.key, code: e.code, repeat: e.repeat, text: e.key && e.key.length === 1 ? e.key : '' });
    if (r === true) { e.preventDefault(); e.stopImmediatePropagation(); }
  }
  focus(w) {
    if (typeof w === 'string') w = this.byId.get(w);
    if (this.focused && this.focused !== w) this.focused.focused = false;
    this.focused = w ?? null;
    if (w) w.focused = true;
    return w ?? null;
  }
  blur() { if (this.focused) this.focused.focused = false; this.focused = null; }

  // Weltpunkt → Bildschirm (px). onScreen: im Bild; behind: hinter der Kamera (x/y dann nicht brauchbar)
  project(x, y, z) {
    const cam = this.camera, v = this._v;
    if (!cam) return { x: 0, y: 0, onScreen: false, behind: true, dist: 0 };
    v.set(x, y, z).applyMatrix4(cam.matrixWorldInverse);
    const dist = Math.hypot(v.x, v.y, v.z), behind = v.z > -0.05;
    v.applyMatrix4(cam.projectionMatrix);
    const px = (v.x * 0.5 + 0.5) * this.cw, py = (-v.y * 0.5 + 0.5) * this.ch;
    return { x: px, y: py, behind, dist, onScreen: !behind && px >= 0 && px <= this.cw && py >= 0 && py <= this.ch };
  }

  render(dt, t, camera) {
    const cv = this.canvas;
    this.camera = camera ?? this.camera;
    const dpr = Math.min(window.devicePixelRatio || 1, 2), cw = cv.clientWidth, ch = cv.clientHeight;
    if (cw !== this.cw || ch !== this.ch || dpr !== this.dpr) { this.cw = cw; this.ch = ch; this.dpr = dpr; cv.width = Math.max(1, Math.round(cw * dpr)); cv.height = Math.max(1, Math.round(ch * dpr)); this._empty = false; }
    if (!this.list.length) { if (!this._empty) { this.ctx.setTransform(1, 0, 0, 1, 0, 0); this.ctx.clearRect(0, 0, cv.width, cv.height); this._empty = true; } return; }
    if (this.dirty) { this.list.sort((a, b) => a.z - b.z || a.order - b.order); this.dirty = false; }
    const c = this.ctx, g = this.g;
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, cw, ch); this._empty = false;
    g.dt = dt; g.t = t; g.now = performance.now() / 1000; g.screen.w = cw; g.screen.h = ch;
    if (this.hovered && !this._canHit(this.hovered)) { this.hovered.hover = false; this.hovered = null; this._cursor(null); }
    for (const w of this.list.slice()) {
      // Ein-/Ausblenden
      if (w._f !== w._ft) { const d = dt / w._fs; w._f = w._f < w._ft ? Math.min(w._ft, w._f + d) : Math.max(w._ft, w._f - d); }
      const a = (w.visible ? w.alpha : 0) * w._f;
      if (a < 0.01 || !w.draw || w._err) continue;
      const m = w.margin ?? 0, an = parseAnchor(w.anchor);
      const ww = size(w.w, cw, 100), hh = size(w.h, ch, 100);
      const mx = an.h === 0 ? m : an.h === 1 ? -m : 0, my = an.v === 0 ? m : an.v === 1 ? -m : 0;
      const left = an.h * (cw - ww) + mx + (+w.x || 0), top = an.v * (ch - hh) + my + (+w.y || 0);
      w.rect.x = left; w.rect.y = top; w.rect.w = ww; w.rect.h = hh;
      c.save();
      c.translate(left, top);
      if (w.clip) { c.beginPath(); c.rect(0, 0, ww, hh); c.clip(); }
      c.globalAlpha = a;
      g.w = ww; g.h = hh; g._depth = 0;
      try { w.draw(g, w); }
      catch (e) { w._err = true; this.onError(e, 'UI-Widget „' + w.id + '“'); }
      while (g._depth > 0) { c.restore(); g._depth--; }
      c.restore();
    }
  }
}
