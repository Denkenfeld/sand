// core/radar.js – Radar für die Fahrt mit dem Buggy (gemeinsamer Dienst, jede Zone kann Markierungen setzen).
// Oben ist immer vorne. Alle freigeschalteten Zonen (Zones.register mit at()) erscheinen automatisch.
// Antippen schaltet die Reichweite um. Weitere Markierungen:  Radar.mark('id', { dir: Vector3 | () => Vector3, name, col, shape:'sq'|'dot'|'dia', ring: Meter })
//                                                              Radar.unmark('id')
window.Radar = (() => {
  const RANGES = [300, 800, 2000], SZ = 216, C = SZ / 2, RO = 92;
  let g = null, wrap, cv, cx, lab, on = false, ri = 0, sweep = 0, built = false, lastTxt = '';
  const marks = {}, tmp = {};
  const css = '#radar{position:fixed;left:50%;transform:translateX(-50%);top:max(10px,env(safe-area-inset-top));z-index:5;text-align:center;font-size:11px;color:#ffd9a0;text-shadow:0 1px 8px #000;display:none;pointer-events:none}' +
    '#radar canvas{position:static;display:block;width:108px;height:108px;margin:0 auto 3px;pointer-events:auto;cursor:pointer}#radar .rl{white-space:nowrap;line-height:14px}#radar .ok{color:#7dff9a}';
  function build() {
    if (built) return; built = true;
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    wrap = document.createElement('div'); wrap.id = 'radar';
    cv = document.createElement('canvas'); cv.width = cv.height = SZ; cx = cv.getContext('2d');
    lab = document.createElement('div'); lab.className = 'rl';
    wrap.append(cv, lab); document.body.appendChild(wrap);
    ['pointerdown', 'pointerup', 'touchstart', 'touchend'].forEach(t => cv.addEventListener(t, e => e.stopPropagation(), { passive: true }));
    cv.addEventListener('click', () => { ri = (ri + 1) % RANGES.length; });
  }
  const dirOf = m => typeof m.dir === 'function' ? m.dir() : m.dir;
  function all() {
    const out = [];
    Zones.list().forEach(z => { if (z.at && Save.unlocked(z.id)) out.push({ id: z.id, dir: z.at, name: z.name, col: z.color, shape: 'sq', ring: z.radius }); });
    for (const k in marks) out.push(Object.assign({ id: k }, marks[k]));
    return out;
  }
  const R_ = {
    bind(o) { g = o; },
    mark(id, m) { marks[id] = m; }, unmark(id) { delete marks[id]; },
    show(v) { build(); on = !!v; wrap.style.display = on ? 'block' : 'none'; },
    get visible() { return on; },
    frame(dt, tt) {
      if (!on || !g) return; const { pos, car, R } = g, T = THREE, V3 = T.Vector3;
      const up = tmp.up || (tmp.up = new V3()), f = tmp.f || (tmp.f = new V3()), rt = tmp.rt || (tmp.rt = new V3()), v = tmp.v || (tmp.v = new V3());
      up.copy(pos).normalize(); f.set(0, 0, -1).applyQuaternion(car.quaternion); f.addScaledVector(up, -f.dot(up)).normalize(); rt.crossVectors(f, up);
      const MR = RANGES[ri]; cx.clearRect(0, 0, SZ, SZ); cx.save(); cx.beginPath(); cx.arc(C, C, 104, 0, 6.3); cx.clip();
      cx.fillStyle = 'rgba(22,10,6,.66)'; cx.fillRect(0, 0, SZ, SZ); cx.strokeStyle = 'rgba(255,217,160,.2)'; cx.lineWidth = 1.5;
      [35, 70, 100].forEach(r => { cx.beginPath(); cx.arc(C, C, r, 0, 6.3); cx.stroke(); });
      cx.beginPath(); cx.moveTo(C, 8); cx.lineTo(C, 208); cx.moveTo(8, C); cx.lineTo(208, C); cx.stroke();
      // Radarstrahl
      sweep = (sweep + dt * 1.6) % 6.2832;
      for (let i = 0; i < 16; i++) { const a = sweep - i * .05; cx.strokeStyle = 'rgba(255,170,80,' + (.22 * (1 - i / 16)).toFixed(3) + ')'; cx.lineWidth = 3; cx.beginPath(); cx.moveTo(C, C); cx.lineTo(C + Math.sin(a) * 104, C - Math.cos(a) * 104); cx.stroke(); }
      // Markierungen
      let near = null;
      all().forEach(m => {
        const dr = dirOf(m); if (!dr) return; const cs = Math.min(1, Math.max(-1, up.dot(dr))), d = Math.acos(cs) * R;
        v.copy(dr).addScaledVector(up, -cs); const l = v.length() || 1, x = v.dot(rt) / l, y = v.dot(f) / l, k = Math.min(d / MR, 1) * RO, far = d > MR;
        if (!near || d < near.d) near = { d, m };
        if (m.ring && !far) { const rr = m.ring / MR * RO; cx.strokeStyle = m.col || '#40d0ff'; cx.globalAlpha = .35; cx.setLineDash([4, 4]); cx.lineWidth = 1.5; cx.beginPath(); cx.arc(C + x * k, C - y * k, rr, 0, 6.3); cx.stroke(); cx.setLineDash([]); cx.globalAlpha = 1; }
        const px = C + x * k, py = C - y * k, s = far ? 5 : 8; cx.fillStyle = m.col || '#ffd9a0'; cx.shadowColor = cx.fillStyle; cx.shadowBlur = 12; cx.globalAlpha = far ? .7 : 1;
        if (m.shape === 'dot') { cx.beginPath(); cx.arc(px, py, s, 0, 6.3); cx.fill(); }
        else if (m.shape === 'dia') { cx.beginPath(); cx.moveTo(px, py - s - 2); cx.lineTo(px + s + 2, py); cx.lineTo(px, py + s + 2); cx.lineTo(px - s - 2, py); cx.closePath(); cx.fill(); }
        else cx.fillRect(px - s * .85, py - s * .85, s * 1.7, s * 1.7);
        cx.globalAlpha = 1; cx.shadowBlur = 0;
      });
      cx.restore(); cx.strokeStyle = 'rgba(255,217,160,.7)'; cx.lineWidth = 3; cx.beginPath(); cx.arc(C, C, 104, 0, 6.3); cx.stroke();
      cx.fillStyle = '#ffd9a0'; cx.beginPath(); cx.moveTo(C, 96); cx.lineTo(C + 8, 116); cx.lineTo(C, 111); cx.lineTo(C - 8, 116); cx.closePath(); cx.fill();
      cx.font = '600 20px ui-monospace,Menlo,monospace'; cx.textAlign = 'center'; cx.fillStyle = 'rgba(255,217,160,.75)'; cx.shadowColor = '#000'; cx.shadowBlur = 6; cx.fillText(MR + ' m', C, 176); cx.shadowBlur = 0;   // Reichweite (antippen = umschalten)
      const txt = (near ? near.m.name + ' · ' + Math.round(near.d) + ' m' + (near.m.ring && near.d <= near.m.ring ? ' ✓' : '') : 'keine Ziele');
      if (txt !== lastTxt) { lastTxt = txt; lab.textContent = txt; lab.className = 'rl' + (near && near.m.ring && near.d <= near.m.ring ? ' ok' : ''); }
    },
  };
  return R_;
})();
