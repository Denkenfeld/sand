// Spiel-Anzeige (DOM über dem Canvas): Fadenkreuz, Leben, Munition, Meldungen, Pause und Ende.
const CSS = `
#gamehud { position: absolute; inset: 0; z-index: 6; pointer-events: none; font: 600 13px/1.3 var(--font-display, sans-serif); color: #f4ead4; letter-spacing: .08em; text-transform: uppercase; user-select: none; }
#gamehud[hidden] { display: none; }
#gamehud .vig { position: absolute; inset: 0; background: radial-gradient(ellipse at center, rgba(160,20,10,0) 45%, rgba(170,16,8,.85) 100%); opacity: 0; }
#gamehud .cross { position: absolute; left: 50%; top: 50%; width: 0; height: 0; --gap: 6px; }
#gamehud .cross i { position: absolute; background: #fff; box-shadow: 0 0 2px #000, 0 0 1px #000; opacity: .92; }
#gamehud .cross i:nth-child(1) { width: 2px; height: 9px; left: -1px; top: calc(-9px - var(--gap)); }
#gamehud .cross i:nth-child(2) { width: 2px; height: 9px; left: -1px; top: var(--gap); }
#gamehud .cross i:nth-child(3) { width: 9px; height: 2px; top: -1px; left: calc(-9px - var(--gap)); }
#gamehud .cross i:nth-child(4) { width: 9px; height: 2px; top: -1px; left: var(--gap); }
#gamehud .cross b { position: absolute; left: -1.5px; top: -1.5px; width: 3px; height: 3px; border-radius: 50%; background: #fff; box-shadow: 0 0 2px #000; }
#gamehud .hitm { position: absolute; left: 50%; top: 50%; width: 0; height: 0; opacity: 0; }
#gamehud .hitm i { position: absolute; width: 2px; height: 9px; background: #fff; left: -1px; top: 8px; transform-origin: 1px -8px; box-shadow: 0 0 2px #000; }
#gamehud .hitm i:nth-child(1) { transform: rotate(45deg); } #gamehud .hitm i:nth-child(2) { transform: rotate(135deg); }
#gamehud .hitm i:nth-child(3) { transform: rotate(225deg); } #gamehud .hitm i:nth-child(4) { transform: rotate(315deg); }
#gamehud .hitm.kill i { background: #ff4a2e; }
#gamehud .tl { position: absolute; left: 18px; top: 58px; text-shadow: 0 1px 4px #000, 0 0 2px #000; }
#gamehud .tl .st { font-size: 14px; }
#gamehud .tl .st em { font-style: normal; color: #e8922e; margin-right: 14px; }
#gamehud .tl .ln { margin-top: 5px; font: 500 12px/1.3 var(--font-mono, monospace); letter-spacing: .04em; text-transform: none; }
#gamehud .msg { position: absolute; left: 50%; top: 22%; transform: translateX(-50%); font: 700 26px/1.2 var(--font-display, sans-serif); letter-spacing: .16em; text-shadow: 0 2px 12px #000, 0 0 3px #000; text-align: center; max-width: 80%; opacity: 0; transition: opacity .25s; }
#gamehud .msg.on { opacity: 1; }
#gamehud .bl { position: absolute; left: 18px; bottom: 18px; width: 240px; text-shadow: 0 1px 4px #000; }
#gamehud .bl .lab { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px; }
#gamehud .bar { height: 10px; background: rgba(0,0,0,.55); border: 1px solid rgba(255,255,255,.25); border-radius: 2px; overflow: hidden; }
#gamehud .bar i { display: block; height: 100%; width: 100%; background: #58e08a; transition: width .12s; }
#gamehud .bar.low i { background: #ff5a3a; }
#gamehud .br { position: absolute; right: 22px; bottom: 18px; text-align: right; text-shadow: 0 1px 4px #000, 0 0 2px #000; }
#gamehud .br .nm { font-size: 12px; opacity: .85; }
#gamehud .br .am { font: 700 38px/1 var(--font-display, sans-serif); letter-spacing: .04em; }
#gamehud .br .am small { font-size: 18px; opacity: .65; margin-left: 4px; }
#gamehud .br .am.empty { color: #ff6a4a; }
#gamehud .slots { display: flex; gap: 6px; justify-content: flex-end; margin-top: 8px; font-size: 11px; }
#gamehud .slots span { padding: 3px 7px; border: 1px solid rgba(255,255,255,.28); background: rgba(0,0,0,.45); border-radius: 2px; }
#gamehud .slots span.cur { background: #e8922e; color: #1b1007; border-color: #e8922e; }
#gamehud .help { position: absolute; left: 50%; bottom: 64px; transform: translateX(-50%); padding: 7px 14px; background: rgba(20,14,9,.72); border: 1px solid rgba(255,255,255,.2); border-radius: 3px; font: 500 11px/1.3 var(--font-mono, monospace); letter-spacing: .05em; text-transform: none; text-align: center; transition: opacity .6s; max-width: 90%; }
#gamehud .ov { position: absolute; inset: 0; display: none; place-content: center; justify-items: center; gap: 14px; background: rgba(12,8,5,.62); pointer-events: auto; text-align: center; padding: 20px; }
#gamehud .ov.on { display: grid; }
#gamehud .ov h2 { margin: 0; font: 700 34px/1.1 var(--font-display, sans-serif); letter-spacing: .2em; }
#gamehud .ov p { margin: 0; font: 400 12px/1.5 var(--font-mono, monospace); text-transform: none; letter-spacing: .03em; color: #cdbd9c; }
#gamehud .ov .row { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
#gamehud .ov button { pointer-events: auto; background: #1c150f; border: 1px solid #3d3022; color: #ecdfc6; padding: 11px 20px; font: 600 12px/1 var(--font-display, sans-serif); letter-spacing: .14em; text-transform: uppercase; border-radius: 3px; cursor: pointer; }
#gamehud .ov button.pri { background: #e8922e; color: #1b1007; border-color: #e8922e; }
#gamehud .ov button:hover { border-color: #e8922e; }
#gamehud .ov .res { display: grid; grid-template-columns: auto auto; gap: 4px 22px; font: 500 13px/1.3 var(--font-mono, monospace); text-transform: none; text-align: left; }
#gamehud .ov .res span:nth-child(odd) { color: #a8977a; }
#gamehud .ov.win h2 { color: #7be08a; } #gamehud .ov.lose h2 { color: #ff6a4a; }
#gamehud.free .cross, #gamehud.free .hitm, #gamehud.free .br, #gamehud.free .bl { display: none; }
body.playing #top, body.playing #cleft, body.playing #cright, body.playing #sright, body.playing #cbar, body.playing #dbanner, body.playing #card, body.playing #hint, body.playing #touchpad, body.playing #labels { display: none !important; }
body.playing #minimap-wrap { left: auto; right: 18px; top: 18px; bottom: auto; width: 150px; height: 150px; opacity: .92; }
@media (max-width: 880px) { body.playing #minimap-wrap { width: 110px; height: 110px; } #gamehud .tl { top: 140px; } }
`;

const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

export class Hud {
  constructor(root) {
    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    const el = (this.el = h('div'));
    el.id = 'gamehud';
    el.hidden = true;
    this.vig = h('div', 'vig');
    this.cross = h('div', 'cross');
    for (let i = 0; i < 4; i++) this.cross.appendChild(h('i'));
    this.cross.appendChild(h('b'));
    this.hitm = h('div', 'hitm');
    for (let i = 0; i < 4; i++) this.hitm.appendChild(h('i'));
    this.stats = h('div', 'st');
    this.lines = h('div');
    const tl = h('div', 'tl');
    tl.append(this.stats, this.lines);
    this.msg = h('div', 'msg');
    this.hpLab = h('span'); this.hpBar = h('div', 'bar'); this.hpFill = h('i'); this.hpBar.appendChild(this.hpFill);
    const bl = h('div', 'bl');
    const lab = h('div', 'lab'); lab.append(h('span', null, 'Leben'), this.hpLab);
    bl.append(lab, this.hpBar);
    this.wName = h('div', 'nm'); this.wAmmo = h('div', 'am'); this.slots = h('div', 'slots');
    const br = h('div', 'br'); br.append(this.wName, this.wAmmo, this.slots);
    this.help = h('div', 'help', 'WASD laufen · Maus zielen · Klick feuern · Rechtsklick zielen · R nachladen · 1–9 Waffe · Shift rennen · Leertaste springen · Esc Pause');
    this.pauseEl = h('div', 'ov');
    this.endEl = h('div', 'ov');
    el.append(this.vig, this.cross, this.hitm, tl, this.msg, bl, br, this.help, this.pauseEl, this.endEl);
    root.appendChild(el);
    this.lineMap = new Map();
    this.dmg = 0; this.hitT = 0; this.msgT = 0; this.helpT = 0; this.mmWas = null;
  }

  show() {
    this.el.hidden = false;
    document.body.classList.add('playing');
    this.lineMap.clear(); this.lines.replaceChildren();
    this.msg.classList.remove('on'); this.pauseEl.classList.remove('on'); this.endEl.classList.remove('on');
    this.help.style.opacity = 1; this.helpT = 9;
    window.dispatchEvent(new Event('resize'));
  }
  hide() {
    this.el.hidden = true;
    document.body.classList.remove('playing');
    window.dispatchEvent(new Event('resize'));
  }

  setHp(hp, max) {
    this.hpFill.style.width = Math.max(0, (hp / max) * 100) + '%';
    this.hpBar.classList.toggle('low', hp / max < 0.3);
    this.hpLab.textContent = Math.ceil(hp) + ' / ' + max;
  }
  setAmmo(mag, reserve, name) {
    this.wName.textContent = name;
    this.wAmmo.innerHTML = '';
    this.wAmmo.classList.toggle('empty', mag <= 0);
    this.wAmmo.append(String(mag));
    this.wAmmo.appendChild(h('small', null, '/ ' + reserve));
  }
  setSlots(names, cur) {
    this.slots.replaceChildren(...names.map((n, i) => h('span', i === cur ? 'cur' : '', (i + 1) + ' ' + n)));
  }
  setStats(score, kills, enemies) {
    this._s = this._s ?? {};
    if (enemies != null) this._s.e = enemies;
    this._s.score = score; this._s.kills = kills;
    this.stats.replaceChildren();
    const add = (k, v) => { const e = h('em', null, k + ' ' + v); this.stats.appendChild(e); };
    add('Punkte', score); add('Abschüsse', kills); if (this._s.e != null) add('Gegner', this._s.e);
  }
  line(key, text) {
    let e = this.lineMap.get(key);
    if (text == null) { if (e) { e.remove(); this.lineMap.delete(key); } return; }
    if (!e) { e = h('div', 'ln'); this.lineMap.set(key, e); this.lines.appendChild(e); }
    e.textContent = String(text);
  }
  message(text, sec = 3) {
    this.msg.textContent = String(text);
    this.msg.classList.add('on');
    this.msgT = sec;
  }
  hitmarker(kill = false, head = false) {
    this.hitm.classList.toggle('kill', kill || head);
    this.hitm.style.opacity = 1; this.hitT = kill ? 0.3 : 0.14;
  }
  damage(k = 0.5) { this.dmg = Math.max(this.dmg, k); }

  update(dt, { spread, aim, hp, hurt }) {
    this.cross.style.setProperty('--gap', (5 + spread * 0.9) + 'px');
    this.cross.style.opacity = 1 - aim * 0.4;
    this.dmg = Math.max(0, this.dmg - dt * 1.6);
    const low = hp < 0.3 && hp > 0 ? (0.25 + 0.15 * Math.sin(performance.now() / 260)) : 0;
    this.vig.style.opacity = Math.max(this.dmg * 0.9, low);
    if (this.hitT > 0) { this.hitT -= dt; if (this.hitT <= 0) this.hitm.style.opacity = 0; }
    if (this.msgT > 0) { this.msgT -= dt; if (this.msgT <= 0) this.msg.classList.remove('on'); }
    if (this.helpT > 0) { this.helpT -= dt; if (this.helpT <= 0) this.help.style.opacity = 0; }
  }

  setFree(on) { this.el.classList.toggle('free', !!on); }

  pause(on, h2) {
    this.pauseEl.classList.toggle('on', on);
    if (!on) return;
    this.pauseEl.replaceChildren(h('h2', null, 'Pause'), h('p', null, 'Klick ins Bild, um weiterzuspielen'));
    const row = h('div', 'row'), a = h('button', 'pri', 'Weiter'), b = h('button', null, 'Spiel beenden');
    a.onclick = (e) => { e.stopPropagation(); h2.resume(); };
    b.onclick = (e) => { e.stopPropagation(); h2.quit(); };
    row.append(a, b);
    this.pauseEl.appendChild(row);
    this.pauseEl.onclick = () => h2.resume();
  }

  end(won, text, stats, h2) {
    this.endEl.className = 'ov on ' + (won ? 'win' : 'lose');
    const res = h('div', 'res');
    for (const [k, v] of Object.entries(stats)) res.append(h('span', null, k), h('span', null, String(v)));
    const row = h('div', 'row'), a = h('button', 'pri', 'Nochmal'), b = h('button', null, 'Beenden');
    a.onclick = h2.again; b.onclick = h2.quit;
    row.append(a, b);
    this.endEl.replaceChildren(h('h2', null, text), res, row);
  }
  hideEnd() { this.endEl.className = 'ov'; }
}
