// Fertige Anzeigen (Presets) für die UI-Ebene: Radar, Balken, Kompass.
// Sie benutzen AUSSCHLIESSLICH die öffentliche Skript-Schnittstelle (game.ui.widget, Zeichenbefehle g, game.player, game.units, game.math).
// Das heißt: alles, was hier passiert, kann ein eigenes Skript genauso – die Presets sind Vorlagen zum Abschauen und Abwandeln.

const hex = (c) => (typeof c === 'number' ? '#' + c.toString(16).padStart(6, '0') : c);
const WIDGET_OPTS = ['id', 'anchor', 'x', 'y', 'w', 'h', 'size', 'margin', 'z', 'alpha', 'visible', 'clip'];
const pickWidget = (o) => { const r = {}; for (const k of WIDGET_OPTS) if (o[k] !== undefined) r[k] = o[k]; return r; };
const val = (v) => (typeof v === 'function' ? v() : v);

export function makePresets(game) {
  const M = game.math;

  /* ───────────── Radar ───────────── */
  // Optionen (auch später änderbar über r.data.<name>):
  //   range      Reichweite in Metern (60)                    rotate  true = Blick nach oben, false = Norden oben
  //   who        'hostile' | 'all' | 'friendly' | Teamname | [Teams] | Funktion(einheit)
  //   by         'distance' (nah grün / mittel gelb / fern rot) | 'team'
  //   colors     { near, mid, far }   near/mid = Anteil der Reichweite (0.33 / 0.66)
  //   edge       'clamp' = Ziele außerhalb am Rand anzeigen | 'hide' = ausblenden
  //   arrow      true = Pfeil am Rand zum nächsten Ziel
  //   markers    zusätzliche Punkte: Liste oder Funktion → [{ x, z, color, icon, size }]
  function radar(o = {}) {
    const w = game.ui.widget({ id: 'radar', anchor: 'right', size: 170, ...pickWidget(o), draw: null });
    Object.assign(w.data, {
      range: 60, rotate: true, who: 'hostile', by: 'distance', edge: 'clamp', arrow: true, sweep: true, markers: null,
      colors: { near: '#58e08a', mid: '#f0c040', far: '#ff5a3a' }, nearAt: 0.33, midAt: 0.66,
    });
    for (const k of Object.keys(w.data)) if (o[k] !== undefined) w.data[k] = k === 'colors' ? { ...w.data.colors, ...o.colors } : o[k];
    const wanted = (u, who) => {
      if (typeof who === 'function') return !!who(u);
      if (who === 'all') return true;
      if (who === 'hostile') return game.isHostile(u.team);
      if (who === 'friendly') return !game.isHostile(u.team);
      return Array.isArray(who) ? who.includes(u.team) : u.team === who;
    };
    w.set({
      draw(g) {
        const d = w.data, R = Math.min(g.w, g.h) / 2 - 3, cx = g.w / 2, cy = g.h / 2;
        const P = game.player, head = P.heading;
        const rot = d.rotate ? head : 0; // Bild-Drehung: Blick nach oben dreht die Welt, Norden-oben dreht den Spieler
        g.circle(cx, cy, R, { fill: 'rgba(8,14,10,.58)' });
        g.ring(cx, cy, R / 3, { stroke: 'rgba(150,220,170,.16)', width: 1 });
        g.ring(cx, cy, (R * 2) / 3, { stroke: 'rgba(150,220,170,.16)', width: 1 });
        g.line(cx - R, cy, cx + R, cy, { stroke: 'rgba(150,220,170,.14)', width: 1 });
        g.line(cx, cy - R, cx, cy + R, { stroke: 'rgba(150,220,170,.14)', width: 1 });
        g.push(); g.clipCircle(cx, cy, R);
        if (d.sweep) { const a = (g.t * 1.4) % (Math.PI * 2); for (let i = 0; i < 6; i++) g.arc(cx, cy, R, a - (i + 1) * 0.07, a - i * 0.07, { fill: 'rgba(120,255,160,' + (0.09 - i * 0.014) + ')' }); }
        // Blickfeld
        const fov = 0.62; g.arc(cx, cy, R, head - rot - fov, head - rot + fov, { fill: 'rgba(255,255,255,.06)' });
        const pts = [];
        for (const u of game.units()) if (wanted(u, d.who)) pts.push({ x: u.x, z: u.z, team: u.team, c: d.by === 'team' ? hex(game.teamColor(u.team)) : null });
        const extra = val(d.markers);
        if (extra) for (const m of extra) pts.push({ x: m.x, z: m.z, c: m.color ?? null, icon: m.icon, size: m.size });
        let best = null, bestD = Infinity;
        for (const p of pts) {
          const L = M.toLocal(p), far = L.dist > d.range;
          if (far && d.edge === 'hide') continue;
          const ang = M.bearing(P, p) - rot; // Winkel im Bild, 0 = oben
          const rr = Math.min(L.dist / d.range, 1) * R * (far ? 0.97 : 1);
          const f = L.dist / d.range;
          const c = p.c ?? (f < d.nearAt ? d.colors.near : f < d.midAt ? d.colors.mid : d.colors.far);
          const q = g.polar(rr, ang, cx, cy);
          g.icon(p.icon ?? 'dot', q.x, q.y, (p.size ?? 8) * (far ? 0.75 : 1), { fill: hex(c), stroke: p.icon ? hex(c) : undefined, alpha: far ? 0.55 : 1 });
          if (!p.icon && L.dist < bestD) { bestD = L.dist; best = { ang, c }; }
        }
        g.pop();
        // Pfeil zum nächsten Ziel am Rand
        if (d.arrow && best) { const q = g.polar(R - 3, best.ang, cx, cy); g.icon('arrow', q.x, q.y, 12, { rotate: best.ang, fill: hex(best.c), stroke: 'rgba(0,0,0,.6)', width: 1 }); }
        g.ring(cx, cy, R, { stroke: 'rgba(170,230,185,.7)', width: 2 });
        // Norden und Spieler in der Mitte
        const qn = g.polar(R - 9, -rot, cx, cy); g.text('N', qn.x, qn.y, { size: 10, align: 'center', baseline: 'middle', color: '#e8922e' });
        g.icon('arrow', cx, cy, 11, { rotate: head - rot, fill: '#fff', stroke: 'rgba(0,0,0,.7)', width: 1 });
      },
    });
    return w;
  }

  /* ───────────── Balken ───────────── */
  // game.ui.bar({ anchor:'bottom', w:300, label:'Boss', value:() => boss.hp, max:500, color:'#ff5a3a' })
  // value/max/label dürfen Zahlen/Text oder Funktionen sein; später änderbar über b.data.value usw.
  function bar(o = {}) {
    const w = game.ui.widget({ id: o.id ?? 'bar' + Math.random().toString(36).slice(2, 6), anchor: 'bottom', w: 300, h: 34, margin: 84, ...pickWidget(o), draw: null });
    Object.assign(w.data, { value: 1, max: 1, label: '', color: '#58e08a', lowColor: '#ff5a3a', low: 0.3, showValue: true, bg: 'rgba(0,0,0,.55)' });
    for (const k of Object.keys(w.data)) if (o[k] !== undefined) w.data[k] = o[k];
    w.set({
      draw(g) {
        const d = w.data, max = Math.max(1e-6, +val(d.max)), v = Math.max(0, +val(d.value)), f = Math.min(1, v / max);
        const label = val(d.label);
        if (label) g.text(label, 0, 0, { size: 12, color: '#f4ead4' });
        if (d.showValue) g.text(Math.ceil(v) + ' / ' + Math.ceil(max), g.w, 0, { size: 12, align: 'right', mono: true, color: '#f4ead4' });
        g.bar(0, g.h - 14, g.w, 12, f, { color: f < d.low ? d.lowColor : d.color, bg: d.bg });
      },
    });
    return w;
  }

  /* ───────────── Kompass ───────────── */
  // Streifen mit Himmelsrichtungen; markers wie beim Radar ([{x,z,color}]) erscheinen als Rauten.
  function compass(o = {}) {
    const w = game.ui.widget({ id: 'compass', anchor: 'top', w: 380, h: 34, margin: 16, ...pickWidget(o), draw: null });
    Object.assign(w.data, { markers: null, span: Math.PI });
    for (const k of Object.keys(w.data)) if (o[k] !== undefined) w.data[k] = o[k];
    const NAMES = { 0: 'N', 45: 'NO', 90: 'O', 135: 'SO', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' };
    w.set({
      draw(g) {
        const d = w.data, P = game.player, head = P.heading, half = d.span / 2, cx = g.w / 2, per = g.w / d.span;
        g.rect(0, 6, g.w, g.h - 12, { fill: 'rgba(8,10,8,.45)', radius: 4 });
        g.push(); g.clipRect(0, 0, g.w, g.h);
        const step = Math.PI / 12; // 15°
        for (let k = Math.floor((head - half) / step); k <= Math.ceil((head + half) / step); k++) {
          const b = k * step, x = cx + M.wrap(b - head) * per, deg = ((Math.round((b * 180) / Math.PI) % 360) + 360) % 360;
          if (Math.abs(M.wrap(b - head)) > half) continue;
          if (deg % 45 === 0) g.text(NAMES[deg], x, g.h / 2, { size: deg % 90 === 0 ? 14 : 10, align: 'center', baseline: 'middle', color: deg === 0 ? '#e8922e' : '#f4ead4' });
          else g.line(x, g.h / 2 - 3, x, g.h / 2 + 3, { stroke: 'rgba(255,255,255,.4)', width: 1 });
        }
        const extra = val(d.markers);
        if (extra) for (const m of extra) { const rel = M.wrap(M.bearing(P, m) - head); if (Math.abs(rel) < half) g.icon('diamond', cx + rel * per, g.h - 7, 8, { fill: hex(m.color ?? '#f0c040') }); }
        g.pop();
        g.icon('triangle', cx, 3, 8, { rotate: Math.PI, fill: '#fff' });
      },
    });
    return w;
  }

  /* ───────────── Button ───────────── */
  // game.ui.button({ label:'Kaufen', anchor:'bottom', onClick(e){…}, disabled: false | () => bool, hint:'zu teuer', color:'#e8922e' })
  // Ein Button ist ein Widget mit Zeiger-Ereignissen; w.hover / w.down / w.disabled / w.focused stehen beim Zeichnen zur Verfügung.
  function button(o = {}) {
    const w = game.ui.widget({ id: o.id ?? 'button' + Math.random().toString(36).slice(2, 6), anchor: 'bottom', w: 180, h: 42, margin: 16, ...pickWidget(o), draw: null });
    Object.assign(w.data, { label: 'Button', hint: '', color: '#e8922e', fontSize: 14 });
    for (const k of Object.keys(w.data)) if (o[k] !== undefined) w.data[k] = o[k];
    w.set({
      pointer: true, focusable: true,
      onClick: (e) => o.onClick?.(e),
      onDisabledClick: (e) => o.onDisabledClick?.(e),
      onKey: (e) => { if (e.code === 'Enter' || e.code === 'Space') { if (!w.disabled) o.onClick?.(e); return true; } return false; },
      draw(g) {
        const d = w.data;
        w.disabled = typeof o.disabled === 'function' ? !!o.disabled() : !!o.disabled;
        const dis = w.disabled, c = hex(d.color), lit = !dis && (w.hover || w.focused);
        g.rect(0.5, 0.5, g.w - 1, g.h - 1, { radius: 6, fill: dis ? 'rgba(30,26,22,.78)' : w.down ? 'rgba(20,14,9,.95)' : lit ? 'rgba(58,42,26,.95)' : 'rgba(30,22,15,.9)', stroke: dis ? 'rgba(255,255,255,.12)' : lit ? c : 'rgba(255,255,255,.28)', width: lit ? 2 : 1 });
        const showHint = dis && w.hover && d.hint;
        g.text(showHint ? val(d.hint) : val(d.label), g.w / 2, g.h / 2 + (w.down ? 1 : 0), { size: showHint ? 12 : d.fontSize, align: 'center', baseline: 'middle', color: showHint ? '#ff7a5a' : dis ? '#7d705e' : '#f4ead4' });
      },
    });
    return w;
  }

  /* ───────────── Menü ───────────── */
  // game.ui.menu({ title:'Bauen', items:[{ label:'Kanone', detail:'50 Gold', disabled: () => gold < 50, reason:'zu teuer', onSelect(item, i){…} }], pause:true })
  // m.open() / m.close(); Tasten ↑↓ Enter Esc und 1–9, Maus: Klick auf eine Zeile. items darf auch eine Funktion sein, die jedes Bild die Liste liefert.
  function menu(o = {}) {
    const ROW = 46, w = game.ui.widget({ id: o.id ?? 'menu', anchor: 'center', w: 360, h: 120, z: 50, ...pickWidget(o), visible: false, draw: null });
    Object.assign(w.data, { title: '', text: '', _tl: 0, items: [], sel: 0, hint: '↑↓ Enter · Esc schließen', pause: true, closeOnSelect: true, onClose: null, _paused: false, _open: false });
    for (const k of ['title', 'text', 'items', 'hint', 'pause', 'closeOnSelect', 'onClose']) if (o[k] !== undefined) w.data[k] = o[k];
    const list = () => { const it = val(w.data.items); return Array.isArray(it) ? it : []; };
    // Fließtext unter dem Titel (o.text, Text oder Funktion): wird an die Breite angepasst umbrochen
    const wrap = (g, str, maxW, size) => { const out = []; for (const para of String(str).split('\n')) { let line = ''; for (const word of para.split(' ')) { const t = line ? line + ' ' + word : word; if (line && g.measure(t, size) > maxW) { out.push(line); line = word; } else line = t; } out.push(line); } return out; };
    const textRows = () => { const d = w.data, t = val(d.text); if (!t) return 0; return d._tl || Math.ceil(String(t).length * 7.6 / Math.max(40, w.w - 40)); };
    const head = () => (w.data.title ? 52 : 14) + (val(w.data.text) ? textRows() * 20 + 10 : 0);
    const height = () => head() + list().length * ROW + (w.data.hint ? 30 : 12);
    const row = (y) => Math.floor((y - head()) / ROW);
    const activate = (i) => {
      const it = list()[i];
      if (!it) return;
      if (val(it.disabled)) { it.onDisabled?.(it, i); return; }
      try { it.onSelect?.(it, i); } catch (e) { game.log?.('Menü: ' + e.message); throw e; }
      if (w.data.closeOnSelect) w.close();
    };
    w.open = () => {
      const d = w.data;
      w.set({ h: height(), visible: true }); w.show(0.12);
      d.sel = Math.max(0, list().findIndex((it) => !val(it.disabled)));
      d._open = true;
      game.ui.focus(w);
      if (d.pause && !game.paused) { game.pause(); d._paused = true; }
      return w;
    };
    w.close = () => {
      const d = w.data;
      if (!d._open) return w;
      d._open = false;
      w.hide(0.1); game.ui.blur();
      if (d._paused) { d._paused = false; game.resume(); }
      d.onClose?.();
      return w;
    };
    Object.defineProperty(w, 'isOpen', { get: () => w.data._open });
    w.set({
      pointer: true, focusable: true,
      onClick: (e) => activate(row(e.y)),
      onDisabledClick: () => {},
      onKey: (e) => {
        const n = list().length, d = w.data;
        if (e.code === 'Escape') { w.close(); return true; }
        if (e.code === 'ArrowDown' || e.code === 'ArrowUp') { // gesperrte Einträge überspringen
          const dir = e.code === 'ArrowDown' ? 1 : -1, items = list();
          for (let k = 1; k <= n; k++) { const j = (((d.sel + dir * k) % n) + n) % n; if (!val(items[j].disabled)) { d.sel = j; break; } }
          return true;
        }
        if (e.code === 'Enter' || e.code === 'Space') { activate(d.sel); return true; }
        const m = /^(Digit|Numpad)([1-9])$/.exec(e.code);
        if (m && +m[2] <= n) { activate(+m[2] - 1); return true; }
        return false;
      },
      draw(g) {
        const d = w.data, items = list(), H = height();
        if (Math.abs(w.h - H) > 0.5) w.h = H;
        g.rect(0.5, 0.5, g.w - 1, g.h - 1, { radius: 8, fill: 'rgba(16,11,7,.94)', stroke: 'rgba(232,146,46,.55)', width: 1.5 });
        if (d.title) g.text(val(d.title), g.w / 2, 26, { size: 17, align: 'center', baseline: 'middle', color: '#f4d9a8' });
        const tv = val(d.text);
        if (tv) { const tl = wrap(g, tv, g.w - 40, 14); d._tl = tl.length; tl.forEach((l, k) => g.text(l, 20, (d.title ? 52 : 14) + k * 20 + 10, { size: 14, baseline: 'middle', color: '#e6d8bc' })); } else d._tl = 0;
        if (w.hover) { const r = row(w.mouse.y); if (r >= 0 && r < items.length) d.sel = r; }
        items.forEach((it, i) => {
          const y = head() + i * ROW, dis = !!val(it.disabled), on = i === d.sel;
          if (on) g.rect(8, y + 2, g.w - 16, ROW - 4, { radius: 5, fill: dis ? 'rgba(255,255,255,.04)' : 'rgba(232,146,46,.22)', stroke: dis ? null : 'rgba(232,146,46,.7)', width: 1 });
          g.text((i < 9 ? i + 1 + '  ' : '') + val(it.label), 20, y + ROW / 2, { size: 15, baseline: 'middle', color: dis ? '#7d705e' : '#f4ead4' });
          const right = dis && it.reason ? val(it.reason) : val(it.detail);
          if (right != null && right !== '') g.text(right, g.w - 20, y + ROW / 2, { size: 13, align: 'right', baseline: 'middle', mono: true, color: dis ? '#ff7a5a' : '#cdbd9c' });
        });
        if (d.hint) g.text(val(d.hint), g.w / 2, g.h - 16, { size: 11, align: 'center', baseline: 'middle', color: '#8d7f68' });
      },
    });
    return w;
  }

  return { radar, bar, compass, button, menu };
}
