// zones/basis/zone.js – Zone „Notfallbasis“: Kamera hebt ab, Hologramm-Raster, Gebäude platzieren, Einheiten leben, Buggy fahren (mit Radar).
// ANSICHT + EINGABE. Zahlen: data.js · Spiellogik: sim.js · Modelle: models.js. Vertrag der Zone: siehe core/zones.js.
(function () {
let ZN = null;                                                  // Griffe der laufenden Zone (leave/save)
Zones.define({ id: 'basis',
  save() { return ZN ? ZN.save() : null; },
  leave() { if (ZN) { ZN.leave(); ZN = null; } },
  enter(g, o) {
  const { T, scene, camera, renderer, car, pos, H, base, say, msg, chime, dust, hook, mkfx, sun } = g;
  const DATA = window.BASIS_DATA, sim = BasisSim.createSim(DATA), S = sim.S, owned = [], own = ob => { scene.add(ob); owned.push(ob); return ob; };
  Zones.get('basis').radius = DATA.exitRadius;                  // Radar-Ring = Aussteige-Entfernung
  const V3 = T.Vector3, Q = T.Quaternion, Y = new V3(0, 1, 0), $ = id => document.getElementById(id), rnd = Math.random;
  const Lp = (a, b, k) => a + (b - a) * k, cl = (x, a, b) => Math.min(b, Math.max(a, x)), ease = k => k * k * (3 - 2 * k);
  const { NG, OFF, CS } = DATA.grid, RF = H(base), ci = sim.ci, UN = DATA.units, TC = DATA.tech, rv = s => new V3(rnd() - .5, rnd() - .5, rnd() - .5).multiplyScalar(s);
  const u1 = new V3().crossVectors(base, new V3(0, 0, 1)).normalize(), u2 = new V3().crossVectors(base, u1);

  // ---------- Koordinaten: lokale Zellen-Ebene auf der Planetenkugel ----------
  const dirAt = (x, z) => base.clone().multiplyScalar(RF).addScaledVector(u1, x).addScaledVector(u2, z).normalize();
  const pAt = (x, z, y = 0) => dirAt(x, z).multiplyScalar(RF + y);
  const quatAt = (x, z, yaw = 0) => {
    const d = dirAt(x, z), r = u1.clone().addScaledVector(d, -u1.dot(d)).normalize();
    const q = new Q().setFromRotationMatrix(new T.Matrix4().makeBasis(r, d, new V3().crossVectors(r, d)));
    return yaw ? q.multiply(new Q().setFromAxisAngle(Y, yaw)) : q;
  };
  const place = (ob, x, z, yaw = 0, y = 0) => { ob.position.copy(pAt(x, z, y)); ob.quaternion.copy(quatAt(x, z, yaw)); return ob; };
  const GR = sim.grid, cellAt = sim.cellAt;

  // ---------- Texturen & Materialien ----------
  const cv = (w, h, f) => { const c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d')); return new T.CanvasTexture(c); };
  const plateTex = cv(128, 128, x => { x.fillStyle = '#2b2d33'; x.fillRect(0, 0, 128, 128); x.strokeStyle = '#14151a'; x.lineWidth = 3; x.strokeRect(2, 2, 124, 124);
    x.beginPath(); x.moveTo(64, 4); x.lineTo(64, 124); x.moveTo(4, 64); x.lineTo(124, 64); x.stroke(); x.fillStyle = '#555a63';
    [[12, 12], [116, 12], [12, 116], [116, 116]].forEach(([a, b]) => { x.beginPath(); x.arc(a, b, 3, 0, 7); x.fill(); });
    x.fillStyle = '#e8b020'; for (let i = 0; i < 128; i += 16) { x.fillRect(i, 0, 8, 6); x.fillRect(i + 8, 122, 8, 6); } });
  const solarTex = cv(128, 128, x => { x.fillStyle = '#0d2250'; x.fillRect(0, 0, 128, 128); x.strokeStyle = '#5c8fd8'; x.lineWidth = 2;
    for (let i = 0; i <= 128; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 128); x.moveTo(0, i); x.lineTo(128, i); x.stroke(); } });
  const radial = (c0) => cv(64, 64, x => { const g2 = x.createRadialGradient(32, 32, 1, 32, 32, 32); g2.addColorStop(0, c0); g2.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g2; x.fillRect(0, 0, 64, 64); });
  const glowTex = radial('rgba(255,255,255,1)'), shTex = radial('rgba(0,0,0,.8)');
  const MS = (c, p = {}) => new T.MeshStandardMaterial(Object.assign({ color: c, roughness: .5, metalness: .6 }, p));
  const plate = MS(0xffffff, { map: plateTex, roughness: .8, metalness: .3 }), steel = MS(0x4a4e57), dark = MS(0x202329, { roughness: .7 }), orange = MS(0xd9731e, { roughness: .55, metalness: .4 });
  const bas = c => new T.MeshBasicMaterial({ color: c });
  const addM = (c, op) => new T.MeshBasicMaterial({ color: c, transparent: true, opacity: op, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide });
  const spr = (c, s) => { const m = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: c, blending: T.AdditiveBlending, transparent: true, depthWrite: false })); m.scale.setScalar(s); return m; };
  const A = (p, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); p.add(m); return m; };
  const slab = (p, s) => A(p, new T.BoxGeometry(s, .5, s), plate, 0, .25, 0);

  // ---------- Gebäude-Modelle (models.js) und Tabellen (data.js) ----------
  const MC = { T, A, slab, MS, bas, addM, spr, cv, plate, steel, dark, orange, solarTex };
  const MODELS = Object.assign({}, window.BasisModels2 ? BasisModels2(MC) : {}, BasisModels(MC)), D = DATA.buildings, PAL = DATA.palette, QS = DATA.quests.steps;
  const fallbackModel = d => { const g = new T.Group(); slab(g, Math.max(d.w, d.h) * CS * .85); A(g, new T.BoxGeometry(d.w * CS * .7, d.hh, d.h * CS * .7), steel, 0, d.hh / 2 + .5, 0); return { g, upd() {} }; };
  const mkModel = id => (MODELS[id] || (() => fallbackModel(D[id])))();   // fehlt ein Modell (z. B. models2.js nicht geladen), erscheint eine graue Kiste

  // ---------- Zentrale (die Kuppel aus Level 11) ----------
  const bl = sim.bl, cells = sim.cells, cget = sim.cget;
  const zg = new T.Group(); place(zg, 0, 0); own(zg); slab(zg, 8.6);
  const dome = o && o.dome; if (dome) { dome.position.copy(pAt(0, 0, .5)); dome.quaternion.copy(quatAt(0, 0)); dome.scale.setScalar(.72); dome.material.opacity = .85; }
  const dish = new T.Group(); dish.position.set(3, .5, -3); zg.add(dish); A(zg, new T.CylinderGeometry(.14, .2, 2.2, 6), steel, 3, 1.6, -3);
  const bowl = A(dish, new T.SphereGeometry(1.1, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), MS(0xcfd4da, { side: T.DoubleSide, roughness: .3 }), 0, 2.8, 0, -.9);
  A(dish, new T.CylinderGeometry(.04, .04, 1.2, 4), steel, 0, 3.3, 0, -.9);
  [[-3, -3], [-3, 3]].forEach(([x, z]) => { A(zg, new T.CylinderGeometry(.7, .8, 1.4, 10), steel, x, 1.2, z); A(zg, new T.SphereGeometry(.18, 8, 6), bas(0x40d0ff), x, 2.1, z); });
  const hqLamp = A(zg, new T.SphereGeometry(.2, 8, 6), bas(0xff3020), 0, 5.4, 0);
  sim.hq.root = zg;

  // ---------- Einheiten: Arbeiter + Drohne ----------
  const units = [];
  function mkWorker(sold) { if (window.Gfx && Gfx.ok) { const m = Gfx.worker(sold, units.length); return { g: m.g, pose: m.pose }; } return mkWorkerOld(sold); }
  function mkWorkerOld(sold) {
    const g = new T.Group(), jk = MS(sold ? 0x4a5a3a : 0xe0701c, { metalness: .1, roughness: .7 }), skin = MS(0xd9a77a, { metalness: 0, roughness: .8 }), hel = MS(sold ? 0x2f3a2a : 0xf2f2ee, { metalness: .2 }), jn = MS(0x2a3140, { metalness: .1, roughness: .8 });
    const body = new T.Group(); g.add(body); A(body, new T.BoxGeometry(.7, .9, .45), jk, 0, 1.45, 0); A(body, new T.BoxGeometry(.72, .14, .47), MS(0xf0e060, { emissive: 0x555500 }), 0, 1.2, 0);
    A(body, new T.SphereGeometry(.27, 10, 8), skin, 0, 2.1, 0); A(body, new T.SphereGeometry(.31, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), hel, 0, 2.16, 0);
    A(body, new T.BoxGeometry(.42, .12, .2), MS(0x111418, { metalness: .9, roughness: .1 }), 0, 2.1, -.2); A(body, new T.BoxGeometry(.5, .6, .25), jn, 0, 1.5, .33);
    const limb = (x, y, len, mat) => { const p = new T.Group(); p.position.set(x, y, 0); A(p, new T.BoxGeometry(.24, len, .26), mat, 0, -len / 2, 0); g.add(p); return p; };
    const w = { g, body, lL: limb(-.2, 1.0, 1, jn), lR: limb(.2, 1.0, 1, jn), aL: limb(-.48, 1.85, .85, jk), aR: limb(.48, 1.85, .85, jk) };
    if (sold) A(w.aR, new T.BoxGeometry(.1, .1, 1.2), dark, 0, -.75, -.5); g.scale.setScalar(1.5); return w;
  }
  function spawnWorker(sold, at) {
    const m = mkWorker(sold), root = new T.Group(); root.add(m.g); own(root);
    const u = Object.assign(m, { root, x: at ? at.x + (rnd() - .5) * 2 : (rnd() - .5) * 6, z: at ? at.z - at.def.h * CS / 2 - 1.5 : -8, tx: 0, tz: 0, st: 'idle', wait: .5, ph: rnd() * 6, work: null, sold }); place(root, u.x, u.z); units.push(u); return u;
  }
  function pickFree(u) { for (let k = 0; k < 10; k++) { const x = Lp((GR.x0 - 5) * CS, (GR.x1 - 5) * CS, rnd()), z = Lp((GR.y0 - 5) * CS, (GR.y1 - 5) * CS, rnd()), c = cellAt(x, z); if (c && walkable(c, null)) { u.tx = x; u.tz = z; return; } } u.tx = u.x; u.tz = u.z; }
  // Fließbänder sind begehbar; Arbeiter gehen zu einer freien Seite eines Gebäudes (sonst Südseite, notfalls durch die Lücke)
  const walkable = (c, work) => { const o = cget(c[0], c[1]); return !o || o.id === 'belt' || o === work; };
  function approach(u, s) { const hw = s.def.w * CS / 2 + 1.8, hh = s.def.h * CS / 2 + 1.8, sides = [[0, -hh], [0, hh], [-hw, 0], [hw, 0]].sort(() => rnd() - .5);
    for (const [ox, oz] of sides) { const x = s.x + ox + (ox ? 0 : (rnd() - .5) * 3), z = s.z + oz + (oz ? 0 : (rnd() - .5) * 3), c = cellAt(x, z); if (c && walkable(c, s)) { u.tx = x; u.tz = z; return; } }
    u.tx = s.x; u.tz = s.z - hh; u.pass = 3; }
  function wUpd(u, dt, t) {
    let walking = false, working = false;
    if (u.pass > 0) u.pass -= dt;
    if (!u.sold) { const duty = u.sd || u.jd || null; if (duty !== u.job) { u.job = duty; if (duty) { u.work = duty; approach(u, duty); u.st = 'walk'; } else { u.work = null; u.st = 'idle'; u.wait = .3; } } }   // Bau/Abriss vor Stelle
    if (u.st === 'idle') { u.wait -= dt; if (u.wait <= 0) { const s = u.sold ? null : (u.job || bl.find(b => !b.built || b.dying)); if (s) { u.work = s; approach(u, s); } else pickFree(u); u.st = 'walk'; } }
    else if (u.st === 'walk') {
      const dx = u.tx - u.x, dz = u.tz - u.z, d = Math.hypot(dx, dz);
      if (d < .4) { u.st = u.job ? (u.job.built && !u.job.dying ? 'post' : 'work') : u.work && (!u.work.built || u.work.dying) ? 'work' : 'idle'; u.wait = 1 + rnd() * 3; u.blk = 0; }
      else { const s = Math.min(d, 3.6 * dt), nx = u.x + dx / d * s, nz = u.z + dz / d * s, c = cellAt(nx, nz); if (c && !(u.pass > 0) && !walkable(c, u.work)) { u.blk = (u.blk || 0) + 1; if (u.blk > 8) u.pass = 4; u.st = 'idle'; u.wait = .1; } else { u.x = nx; u.z = nz; u.yaw = Math.atan2(-dx, dz); walking = true; u.blk = 0; } }
    } else if (u.st === 'work') { if (!u.work || (u.work.built && !u.work.dying)) { u.st = 'idle'; u.work = null; u.wait = .6; } else working = true; }
    else if (u.st === 'post') working = !!u.job && sim.eff(u.job) > 0;
    if (!u.pose) {
    u.ph += dt * (walking ? 9 : 0); const sw = walking ? .75 : 0;
    u.lL.rotation.x = Math.sin(u.ph) * sw; u.lR.rotation.x = -Math.sin(u.ph) * sw; u.aL.rotation.x = -Math.sin(u.ph) * sw * .8; u.aR.rotation.x = working ? -1.3 + Math.sin(t * 11) * .7 : Math.sin(u.ph) * sw * .8;
    u.body.position.y = walking ? Math.abs(Math.sin(u.ph)) * .06 : 0;
    }
    if (working && u.work && rnd() < dt * (u.st === 'post' ? 1.2 : 6)) dust(pAt(u.work.x + (rnd() - .5) * 4, u.work.z, 1.5), rv(2).addScaledVector(base, 2));
    place(u.root, u.x, u.z, u.yaw || 0);
    if (u.pose) u.pose(dt, t, walking ? 3.6 : 0, working, u.root);
  }
  const drone = new T.Group(); own(drone); A(drone, new T.SphereGeometry(.55, 10, 8), steel); A(drone, new T.TorusGeometry(.6, .06, 6, 14), bas(0x40d0ff), 0, 0, 0, Math.PI / 2);
  const rotors = [[1, 1], [-1, 1], [1, -1], [-1, -1]].map(([a, b]) => { A(drone, new T.CylinderGeometry(.05, .05, .5, 4), dark, a * .55, 0, b * .55, 0, 0, 0); return A(drone, new T.CylinderGeometry(.6, .6, .03, 12), addM(0xcfd8e0, .35), a * .8, .3, b * .8); });
  const dl = spr(0x40d0ff, 3); dl.position.y = -.4; drone.add(dl); drone.scale.setScalar(1.4);
  const cring = new T.Mesh(new T.RingGeometry(3, 3.5, 40), addM(0x40d0ff, .5)); cring.visible = false; own(cring);

  // ---------- Hologramm-Grid ----------
  const occ = new Uint8Array(NG * NG * 4), occT = new T.DataTexture(occ, NG, NG, T.RGBAFormat); occT.magFilter = occT.minFilter = T.NearestFilter; occT.needsUpdate = true;
  const gg = new T.PlaneGeometry(1, 1, 72, 72), gp = gg.attributes.position;
  for (let i = 0; i < gp.count; i++) { const p = pAt(gp.getX(i) * NG * CS, gp.getY(i) * NG * CS, .09); gp.setXYZ(i, p.x, p.y, p.z); }
  const gm = new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, uniforms: { uO: { value: occT }, uT: { value: 0 }, uR: { value: 0 }, uMin: { value: new T.Vector2(OFF, OFF) }, uMax: { value: new T.Vector2(OFF + 10, OFF + 10) }, uS: { value: new V3() } },
    vertexShader: 'varying vec2 vU;void main(){vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec2 vU;uniform sampler2D uO;uniform float uT,uR;uniform vec2 uMin,uMax;uniform vec3 uS;
void main(){vec2 p=vU*18.,c=floor(p),f=abs(fract(p)-.5);vec4 o=texture2D(uO,(c+.5)/18.);
vec2 cen=(uMin+uMax)*.5,lo=uMin-p,hi=p-uMax;float r=length(p-cen)/8.,ln=smoothstep(.465,.5,max(f.x,f.y)),dt=1.-smoothstep(0.,.14,length(.5-f));
float d=max(max(lo.x,hi.x),max(lo.y,hi.y)),act=1.-smoothstep(-.05,.6,d),rev=1.-smoothstep(uR-.3,uR,r),pulse=.5+.5*sin(uT*1.4-r*6.),scan=1.-smoothstep(0.,.08,abs(r-fract(uT*.08)*1.8)),nr=.5+.9*uS.z*exp(-length(p-uS.xy)*.3);
float al=ln*(.15+.09*pulse)*nr+dt*.22*nr+scan*ln*.25+o.a*(ln*.8+.1);
vec3 col=mix(vec3(.3,.8,.95),vec3(1.,.95,.8),o.a),fill=vec3(.3,.8,1.)*o.r*.05+vec3(.2,1.,.4)*o.g*(1.-o.b)*.26+vec3(1.,.2,.2)*o.b*(1.-o.g)*.3+vec3(1.,.82,.15)*o.g*o.b*.3;
gl_FragColor=vec4((col*al+fill)*act*rev,1.);
#include <tonemapping_fragment>
#include <encodings_fragment>
}` });
  const grid = new T.Mesh(gg, gm); grid.frustumCulled = false; grid.renderOrder = 3; grid.visible = false; own(grid);

  // ---------- Zustand, Wirtschaft ----------
  const nScn = scene.children.length, sm = mkfx(160, false), emb = mkfx(140, true), pls = [0, 1, 2].map(() => { const l = new T.PointLight(0xff9040, 0, 36, 1.5); own(l); return l; }); owned.push(...scene.children.slice(nScn)); let sel = null, armed = null, now = 0, lastOre = -1, speed = 1, showB = null, showT = 0, sawDusk = 0, lastQ = -9, lastHud = 0, lastCP = 0, lastNet = -1, pktT = 0, lastInfo = '', sunIc = '';
  const powered = sim.powered;
  // Offline-Anzeige: Gebäude wird dunkel, darüber schwebt das durchgestrichene Symbol dessen, was fehlt
  const darkMat = new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .5, depthWrite: false }), darkGeo = new T.BoxGeometry(1, 1, 1), ICO = { link: '🔗', water: '💧', energy: '⚡', ammo: '🔸' }, icoTex = {};
  const icoOf = k => icoTex[k] || (icoTex[k] = cv(128, 128, x => { x.font = '84px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(ICO[k], 64, 70); x.lineCap = 'round';
    x.strokeStyle = '#fff'; x.lineWidth = 17; x.beginPath(); x.moveTo(18, 112); x.lineTo(110, 20); x.stroke(); x.strokeStyle = '#ff3b30'; x.lineWidth = 10; x.beginPath(); x.moveTo(18, 112); x.lineTo(110, 20); x.stroke(); }));
  function offShow(b, why, tt) {
    if (!why) { if (b.dark) b.dark.visible = b.ico.visible = false; return; }
    if (!b.dark) { const d = b.def; b.dark = new T.Mesh(darkGeo, darkMat); b.dark.scale.set(d.w * CS * .96, d.hh, d.h * CS * .96); b.dark.position.y = d.hh / 2; b.dark.renderOrder = 2; b.root.add(b.dark);
      b.ico = new T.Sprite(new T.SpriteMaterial({ map: icoOf(why), transparent: true, depthTest: false, depthWrite: false })); b.ico.scale.setScalar(5.5); b.ico.renderOrder = 9; b.root.add(b.ico); b.icoK = why; }
    if (b.icoK !== why) { b.icoK = why; b.ico.material.map = icoOf(why); b.ico.material.needsUpdate = true; }
    b.dark.visible = b.ico.visible = true; b.ico.position.set(0, b.def.hh + 3.5 + Math.sin((tt || 0) * 2.2) * .35, 0);
  }
  function recalc() { sim.recalc(); hud(); }
  const f1 = n => Math.round(n * 10) / 10;
  // Chip = Symbol + Wert + Füllbalken; st: 0 = gut, 1 = knapp (gelb), 2 = Ausfall (rot)
  function chip(id, txt, ratio, st) { const el = $(id), c = el.children; c[2].textContent = txt; c[0].style.width = Math.round(Math.min(1, Math.max(0, ratio)) * 100) + '%'; el.classList.toggle('warn', st === 1); el.classList.toggle('bad', st === 2); return el; }
  const rat = (a, b) => b > 0 ? a / b : (a > 0 ? 1 : 0), kfmt = n => n >= 1000 ? (Math.round(n / 100) / 10) + 'k' : String(Math.floor(n));
  function hud() {
    const dl = DATA.economy.dayLen, ph = sim.phase(), nt = ph >= .5, f = (ph % .5) / .5, left = Math.max(0, Math.round((1 - f) * dl * .5)), ok = sim.energyOk();
    chip('c-ore', kfmt(S.ore), S.ore / S.cap, S.ore >= S.cap * .95 || S.ore < 20 ? 1 : 0);
    chip('c-wk', S.wk + '/' + S.wcap, rat(S.wk, S.wcap), S.wk >= S.wcap ? 1 : 0);
    chip('c-st', S.sj + '/' + S.st, rat(S.sj, S.st), S.st > 0 && S.sj === 0 ? 2 : S.sj < S.st ? 1 : 0);
    chip('c-en', Math.round(S.eu) + '/' + Math.round(S.ec), rat(S.eu, S.ec), !ok ? 2 : S.eu >= S.ec * .85 && S.eu > 0 ? 1 : 0);
    chip('c-wa', f1(S.wu) + '/' + S.wc, rat(S.wu, S.wc), S.wu > S.wc ? (S.wc === 0 && S.wu <= S.wk * DATA.economy.workerWater + 1e-9 ? 1 : 2) : S.wu > 0 && S.wu >= S.wc * .85 ? 1 : 0);
    chip('c-am', S.au + '/' + f1(S.ac), rat(S.au, S.ac), S.au > S.ac ? 2 : S.au > 0 && S.au >= S.ac * .85 ? 1 : 0).style.display = S.au || S.ac ? '' : 'none';
    chip('c-bat', kfmt(S.bat), rat(S.bat, S.bcap), S.bcap > 0 && S.bat <= 0 && S.eu > S.ec ? 2 : S.eu > S.ec && S.bat < S.bcap * .25 ? 1 : 0).style.display = S.bcap ? '' : 'none';
    const dc = chip('c-day', Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0'), f, 0); dc.children[1].textContent = (nt ? '🌙' : '☀️') + 'T' + sim.day(); dc.title = nt ? 'Nacht: bis zum Morgen' : 'Tag: bis zum Abend';
  }
  // Klick auf einen Chip: kleines Popup, was gerade gut ist oder fehlt
  const incLog = []; let popId = null;
  const incPerMin = () => { const E = DATA.economy, t = sim.time, win = Math.min(30, Math.max(5, t)); while (incLog.length && incLog[0][0] < t - 30) incLog.shift(); return Math.round(((E.baseIncome + sim.mod.income) / E.tick + incLog.reduce((a, x) => a + x[1], 0) / win) * 60); };
  const names = list => { const m = {}; list.forEach(b => { m[b.def.n] = (m[b.def.n] || 0) + 1; }); return Object.keys(m).map(n => m[n] + '× ' + n).join(', '); };
  function chipInfo(id) {
    const E = DATA.economy, ok = sim.energyOk(), night = sim.phase() >= .5, deficit = S.eu - S.ec, offW = sim.bl.filter(b => b.off === 'water'), offE = sim.bl.filter(b => b.off === 'energy'), offL = sim.bl.filter(b => b.built && !b.dying && b.off === 'link');
    if (id === 'c-ore') return S.ore >= S.cap * .95 ? ['Lager voll (' + Math.floor(S.ore) + '/' + S.cap + ')', 'Neues Erz verfällt. Gib Erz aus oder baue ein Silo (+' + D.silo.cap + ').'] : S.ore < 20 ? ['Erz knapp', 'Du hast kaum Erz. Raffinerien mit vollen Stellen liefern am meisten.'] : ['Erz ' + Math.floor(S.ore) + '/' + S.cap, 'Einnahmen etwa +' + incPerMin() + ' Erz/min. Ein Silo vergrößert das Lager.'];
    if (id === 'c-wk') return S.wk >= S.wcap ? ['Unterkünfte voll (' + S.wk + '/' + S.wcap + ')', 'Mehr Arbeiter brauchen Platz: Forschung „Ausbau“ (+4 Unterkünfte).'] : ['Arbeiter ' + S.wk + '/' + S.wcap, 'Noch ' + (S.wcap - S.wk) + ' Plätze frei. Jeder Arbeiter trinkt ' + E.workerWater + ' Wasser.'];
    if (id === 'c-st') { const open = sim.bl.filter(b => b.built && b.def.st && b.sw < b.def.st); return !S.st ? ['Keine Stellen', 'Raffinerien, Fabriken und Kasernen brauchen Arbeiter. Baue eine Raffinerie.'] : !open.length ? ['Alle Stellen besetzt', S.sj + ' von ' + S.st + ' Posten laufen auf voller Leistung.'] : ['Stellen ' + S.sj + '/' + S.st + ' besetzt', 'Es fehlen Arbeiter bei: ' + names(open) + '. Quartier antippen und Arbeiter ausbilden' + (S.wk >= S.wcap ? ' (Unterkünfte sind voll!)' : '') + '.']; }
    if (id === 'c-en') { const left = deficit > 0 && S.bat > 0 ? Math.round(S.bat / deficit) : 0;
      return !ok ? ['Stromausfall!', 'Verbrauch ' + Math.round(S.eu) + ' ist größer als Erzeugung ' + Math.round(S.ec) + ', die Batterie ist leer. ' + (offE.length ? 'Zuletzt gebaut, daher aus: ' + names(offE) + '. ' : '') + 'Baue Energiefelder' + (night ? ' (nachts liefern sie nichts, daher mehr Batterien)' : '') + '.']
        : deficit > 0 ? ['Batterie trägt die Last', 'Verbrauch ' + Math.round(S.eu) + ' bei Erzeugung ' + Math.round(S.ec) + '. Die Batterie reicht noch etwa ' + left + ' s.' + (night ? ' Am Morgen lädt sie wieder.' : ' Baue ein Energiefeld dazu.')]
        : S.eu >= S.ec * .85 && S.eu > 0 ? ['Energie knapp', 'Verbrauch ' + Math.round(S.eu) + ' von ' + Math.round(S.ec) + '. Ein weiteres Energiefeld schafft Luft.'] : ['Energie gut', 'Erzeugung ' + Math.round(S.ec) + ', Verbrauch ' + Math.round(S.eu) + (night ? '. Nachts liefern Energiefelder nichts.' : '.')]; }
    if (id === 'c-wa') return S.wu > S.wc ? ['Wasser fehlt', 'Verbrauch ' + f1(S.wu) + ' bei Vorrat ' + S.wc + '. ' + (offW.length ? 'Zuletzt gebaut, daher aus: ' + names(offW) + '. ' : '') + 'Baue einen Taufänger (+' + D.dew.wa + ').'] : S.wu > 0 && S.wu >= S.wc * .85 ? ['Wasser knapp', 'Verbrauch ' + f1(S.wu) + ' von ' + S.wc + '. Mit jedem Arbeiter und Gebäude steigt er; ein Taufänger schafft Luft.'] : ['Wasser gut', 'Verbrauch ' + f1(S.wu) + ' von ' + S.wc + '.'];
    if (id === 'c-bat') return S.bat <= 0 && deficit > 0 ? ['Batterie leer', 'Der Strom reicht nicht. Mehr Energiefelder (Tag) und Batterien (Nacht) bauen.'] : ['Batterie ' + Math.floor(S.bat) + '/' + S.bcap, deficit > 0 ? 'Sie entlädt sich gerade (Defizit ' + f1(deficit) + '/s).' : 'Sie lädt mit dem Überschuss von ' + f1(-deficit) + '/s. Nachts trägt sie die Basis.'];
    if (id === 'c-am') return S.au > S.ac ? ['Munition fehlt', 'Türme brauchen ' + S.au + ', die Fabrik liefert ' + f1(S.ac) + '. Baue oder besetze die Fabrik.'] : ['Munition ' + S.au + '/' + f1(S.ac), 'Die Fabrik versorgt deine Türme.'];
    const dl = E.dayLen, ph = sim.phase(), left = Math.round(((ph % .5) / .5 > 0 ? 1 - (ph % .5) / .5 : 1) * dl * .5);
    return [(night ? 'Nacht' : 'Tag') + ' ' + sim.day(), (night ? 'Morgen' : 'Abend') + ' in ' + Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0') + '. ' + (night ? 'Energiefelder liefern nichts, die Batterien tragen die Basis.' : 'Jetzt laden die Batterien, nachts liefern Energiefelder nichts.')];
  }
  function popShow(id) {
    const el = $(id), pop = $('rt-pop'), [h, t] = chipInfo(id), cl = el.classList.contains('bad') ? 'bad' : el.classList.contains('warn') ? 'warn' : 'ok', r = el.getBoundingClientRect();
    pop.className = cl; pop.innerHTML = '<b>' + (cl === 'bad' ? '⛔ ' : cl === 'warn' ? '⚠️ ' : '✔ ') + h + '</b>' + t; pop.style.display = 'block'; popId = id;
    pop.style.left = Math.max(8, Math.min(r.left - 6, window.innerWidth - PW() - pop.offsetWidth - 12)) + 'px'; pop.style.top = (r.bottom + 6) + 'px';
  }
  function hidePop() { popId = null; const p = $('rt-pop'); if (p) p.style.display = 'none'; }
  // Hauptauftrag: Banner (Gold) und Journal
  function questUI() {
    const el = $('rt-q'), c = el.children, q = sim.step(); el.classList.toggle('pulse', sim.hint >= 2);
    if (!q) { c[0].style.width = '100%'; c[1].textContent = DATA.quests.act.toUpperCase(); c[2].textContent = 'Akt 1 geschafft: Die Basis steht. Die Fabrik folgt.'; return; }
    const p = sim.qProg(q); c[0].style.width = Math.round(p.n / p.of * 100) + '%'; c[1].textContent = DATA.quests.act.toUpperCase() + ' · ' + (sim.quest + 1) + '/' + QS.length; c[2].textContent = q.t + ' (' + p.n + '/' + p.of + ')';
  }
  function journal() {
    const q = sim.step(), last = QS[sim.quest - 1], p = q && sim.qProg(q), b = q && sim.questB();
    const list = QS.map((x, i) => '<div class="jr-s ' + (i < sim.quest ? 'd' : i === sim.quest ? 'c' : '') + '">' + (i < sim.quest ? '✔ ' : i === sim.quest ? '▶ ' : '· ') + (i <= sim.quest ? x.n : 'Schritt ' + (i + 1)) + '</div>').join('');
    const where = b ? 'Gebäude „' + D[b].n + '“ (Leiste rechts, erst ein freies Feld antippen)' : q && q.c.some(c => c.k === 'pop' || c.k === 'tech') ? 'Quartier in der Mitte antippen' : 'Im Basisraster';
    $('rt-jr').firstChild.innerHTML = '<h3>' + DATA.quests.act + '</h3><div class="jr-l">' + list + '</div>' + (q ? '<div class="jr-b"><b>' + q.t + '</b> (' + p.n + '/' + p.of + ')</div><p><u>Warum?</u> ' + q.why + '</p><p><u>Wo?</u> ' + where + '</p><p><u>Wie?</u> ' + q.how + '</p><button class="jr-btn" data-j="show">Zeig mir, wie</button>' : '<p>Akt 1 geschafft. Die Basis steht; als Nächstes folgen Fabrik und Wurm.</p>')
      + '<p class="jr-z">' + (last ? 'Zuletzt: ' + last.n + '. ' : '') + (q ? 'Als Nächstes: ' + q.n + '.' : '') + '</p><button class="jr-btn" data-j="close">Schließen</button>';
  }
  const openJr = () => { journal(); $('rt-jr').classList.add('on'); }, closeJr = () => $('rt-jr').classList.remove('on');
  function freeSpot(id, nx = 0, nz = 0) {
    const d = D[id]; let best = null, bd = 1e9; for (let pass = 0; pass < 2 && !best; pass++) for (let i = GR.x0; i < GR.x1; i++) for (let j = GR.y0; j < GR.y1; j++) { const w = sim.whyNot(id, i, j, vehicleBlock); if (w && w !== 'zu wenig Erz') continue; if (!pass && !sim.touches(id, i, j)) continue; const dd = Math.hypot((i + d.w / 2 - 5) * CS - nx, (j + d.h / 2 - 5) * CS - nz); if (dd < bd) { bd = dd; best = [i, j]; } } return best;
  }
  function showHow() {          // „Zeig mir, wie“: wählt ein freies Feld (Gebäude) oder das Quartier (Ausbildung/Forschung) und hebt die Karte hervor
    closeJr(); const id = sim.questB(), q = sim.step(); if (!q) return;
    if (id && D[id]) { arm(id); if (ghost) { fx = (ghost.i + D[id].w / 2 - 5) * CS; fz = (ghost.j + D[id].h / 2 - 5) * CS; } msg('Hier passt ' + D[id].n + ': ✔ Bauen antippen oder Ghost verschieben'); }
    else { sel = { b: sim.hq }; upd(); msg('Quartier gewählt: Karte in der Leiste antippen'); }
  }
  function flt(txt, x, z, y) { const v = pAt(x, z, y).project(camera), d = document.createElement('div'); d.className = 'rt-f'; d.textContent = txt; d.style.left = ((v.x + 1) / 2 * window.innerWidth) + 'px'; d.style.top = ((1 - v.y) / 2 * window.innerHeight) + 'px'; document.body.appendChild(d); setTimeout(() => d.remove(), 1500); }
  let lastH = 0;
  function hammer() { tone(650 + rnd() * 500, 380, .07, .07); g.nz(g.A.wn, 'bandpass', 2400 + rnd() * 1600, 1300, .06, .09); if (rnd() < .35) tone(170, 85, .1, .12); }
  // Platzierung: Regeln in sim.whyNot, hier nur die Sicht-Regel „Fahrzeug steht im Weg“
  const vehicleBlock = (i, j, d) => {
    const c = base.clone().multiplyScalar(RF), r = pos.clone().sub(c), cx = r.dot(u1), cz = r.dot(u2), bx = (i + d.w / 2 - 5) * CS, bz = (j + d.h / 2 - 5) * CS;
    return Math.abs(cx - bx) < d.w * CS / 2 + 2.5 && Math.abs(cz - bz) < d.h * CS / 2 + 3.5 ? 'Fahrzeug steht im Weg' : '';
  };
  const why = (id, i, j) => sim.whyNot(id, i, j, vehicleBlock);
  // Modell zu einem Sim-Gebäude anlegen (neu = Bau-Hologramm, done = fertig, z. B. beim Laden)
  function instantiate(b, done) {
    const d = b.def, root = new T.Group(), m = mkModel(b.id); root.add(m.g);
    const holo = new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(d.w * CS * .95, d.hh, d.h * CS * .95)), new T.LineBasicMaterial({ color: 0x40d0ff, transparent: true, opacity: .9, blending: T.AdditiveBlending, depthWrite: false }));
    holo.position.y = d.hh / 2; A(root, new T.PlaneGeometry(d.w * CS * 1.3, d.h * CS * 1.3), new T.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false, opacity: .5 }), 0, .05, 0, -Math.PI / 2);
    place(root, b.x, b.z, (b.rot || 0) * Math.PI / 2); own(root); Object.assign(b, { root, m, holo, hn: .35 }); if (b.id === 'belt') { root.updateMatrixWorld(true); beltLinks(b); }
    if (done) m.g.scale.y = 1; else root.add(holo);
  }
  function build(id, i, j) {
    const r = sim.build(id, i, j, { blocked: vehicleBlock }); if (r.err) return msg(D[id].n + ': ' + r.err);
    instantiate(r.b, false); hud(); tone(180, 90, .25, .2); g.nz(g.A.wn, 'bandpass', 700, 2400, .7, .07);
  }
  // ---------- Fließbänder: Anschlüsse nach Nachbarn, Pakete auf zwei Spuren ----------
  // Lokale Modellachsen: +x = Raster +x, +z = Raster −z (quatAt). Bit: +x 0 · +z 1 · −x 2 · −z 3. Spur 1 fährt vom Quartier weg (Wasser, Strom), Spur 2 zum Quartier (Erz).
  const LD = [[1, 0, 0], [0, 1, 3], [-1, 0, 2], [0, -1, 1]], gcell = (i, j) => i >= -OFF && j >= -OFF && i < NG - OFF && j < NG - OFF ? cget(i, j) : null;
  function beltLinks(b) {
    let mask = 0; b.arms = [];
    LD.forEach(([di, dj, bit]) => { const o = gcell(b.i + di, b.j + dj); if (!o || !o.built || o.dying) return; mask |= 1 << bit; b.arms.push({ lx: di, lz: -dj, away: o.dist !== b.dist ? o.dist > b.dist : o.i * 31 + o.j > b.i * 31 + b.j }); });
    b.m.setMask(mask);
  }
  const PK = 480, pkM = new T.InstancedMesh(new T.BoxGeometry(.55, .4, .55), new T.MeshBasicMaterial({ color: 0xffffff }), PK), PKC = { w: new T.Color(0x40b8ff), e: new T.Color(0xffe040), o: new T.Color(0xff8a2a) }, mTmp = new T.Matrix4(), mLoc = new T.Matrix4();
  pkM.frustumCulled = false; pkM.count = 0; own(pkM);
  function packets(dts) {
    pktT += dts; let n = 0; const refOn = bl.some(x => x.id === 'ref' && x.on);
    for (const b of bl) { if (b.id !== 'belt' || !b.built || b.dying || !b.link || !b.arms || n > PK - 20) continue;
      b.arms.forEach((a, ai) => { for (let lane = 0; lane < 2; lane++) for (let q = 0; q < 2; q++) {
        const kind = lane === 0 ? (q === 0 ? (S.wc > 0 ? 'w' : 'e') : (S.ec > 0 ? 'e' : null)) : (refOn ? 'o' : null); if (!kind) continue;
        const ph = (pktT * .4 + q * .5 + ai * .17 + b.i * .31 + b.j * .13) % 1, along = lane === 0 ? a.away : !a.away, sp = along ? ph * 2.25 : (1 - ph) * 2.25, fa = a.away ? 1 : -1, off = lane === 0 ? .75 : -.75;
        mLoc.makeTranslation(a.lx * sp - a.lz * fa * off, .5, a.lz * sp + a.lx * fa * off); mTmp.multiplyMatrices(b.root.matrixWorld, mLoc); pkM.setMatrixAt(n, mTmp); pkM.setColorAt(n, PKC[kind]); n++; } }); }
    pkM.count = n; pkM.instanceMatrix.needsUpdate = true; if (pkM.instanceColor) pkM.instanceColor.needsUpdate = true;
  }
  // Explosion/Einsturz: Staub, Glut, Rauch, Knall. Wird beim Abriss genutzt, später auch für zerstörte Gebäude.
  function boom(b) {
    const w = b.def.w * CS * .8, h = b.def.h * CS * .8, p = pAt(b.x, b.z, 2 + b.def.hh * .3);
    for (let k = 0; k < 16; k++) dust(pAt(b.x + (rnd() - .5) * w, b.z + (rnd() - .5) * h, 1 + rnd() * 2), rv(7).addScaledVector(base, 4 + rnd() * 5));
    for (let k = 0; k < 10; k++) emb.e(p, base.clone().multiplyScalar(4 + rnd() * 6).add(rv(7)), 1.4 + rnd() * 1.6, 1.0);
    for (let k = 0; k < 6; k++) sm.e(p, base.clone().multiplyScalar(3 + rnd() * 3).add(rv(3)), 4 + rnd() * 3, 3 + rnd() * 2);
    tone(110, 40, .5, .25); g.nz(g.A.wn, 'lowpass', 900, 120, .8, .22);
  }
  function remove(b) { b.root && b.root.parent && b.root.parent.remove(b.root); sim.remove(b); hud(); }

  // ---------- Ghost: Vorschau beim Platzieren (erst Gebäude wählen, dann Feld antippen, dann ✔) ----------
  const gMat = c => new T.MeshBasicMaterial({ color: c, transparent: true, opacity: .4, depthWrite: false });
  const gRoot = new T.Group(), gPlate = new T.Mesh(new T.BoxGeometry(1, 1, 1), gMat(0x40ff80)), gVol = new T.Mesh(new T.BoxGeometry(1, 1, 1), gMat(0x40ff80));
  gVol.material.opacity = .16; gRoot.add(gPlate, gVol); gRoot.visible = false; own(gRoot);
  let lastPT = '', ghost = null;                                            // { id, i, j } = linke obere Ecke der Grundfläche
  const ghostWhy = () => ghost ? why(ghost.id, ghost.i, ghost.j) : '';
  const ghostLinked = () => !ghost || sim.touches(ghost.id, ghost.i, ghost.j);
  function ghostUpdate() {
    if (!ghost) { gRoot.visible = false; return; }
    const d = D[ghost.id], ok = !ghostWhy(); gRoot.visible = true;
    gPlate.scale.set(d.w * CS * .96, .4, d.h * CS * .96); gPlate.position.y = .2; gVol.scale.set(d.w * CS * .9, d.hh, d.h * CS * .9); gVol.position.y = d.hh / 2 + .4;
    const w = ghostWhy(), multi = d.w * d.h > 1, perCell = w === 'Feld belegt' || w === 'außerhalb des Rasters';      // grün = passt · gelb = Teil passt nicht (Rest) · rot = geht nicht
    [gPlate, gVol].forEach(m => m.material.color.setHex(ok ? (ghostLinked() ? 0x40ff80 : 0xffa030) : multi && perCell ? 0xffc030 : 0xff4a3a)); place(gRoot, (ghost.i + d.w / 2 - 5) * CS, (ghost.j + d.h / 2 - 5) * CS, 0);
  }
  function syncPl() {
    ov.style.cursor = armed ? 'crosshair' : '';
    const on = !!armed && mode === 'rts'; $('rt-pl').style.display = on ? 'flex' : 'none'; if (!on) return; const ok = $('rt-ok');
    if (ghost && lastPT !== 'mouse') { ok.style.display = ''; ok.textContent = '✔ Bauen ◆' + D[armed].c; ok.classList.toggle('off', !!ghostWhy()); } else ok.style.display = 'none';
  }
  function arm(id, at) {                                       // Gebäude wählen: Ghost erscheint am Feld, sonst am nächsten freien Platz zur Kamera
    const d = D[id]; armed = id; showB = null; sel = null; const c = at ? [at[0] - ((d.w - 1) >> 1), at[1] - ((d.h - 1) >> 1)] : freeSpot(id, fx, fz) || [at ? at[0] : 4, at ? at[1] : 4];
    ghost = { id, i: c[0], j: c[1] }; ghostUpdate(); upd(); syncPl(); tone(700, 900, .05, .05);
  }
  function ghostTo(a) { ghost = { id: armed, i: a[0], j: a[1] }; ghostUpdate(); refreshOcc(); syncPl(); info(); }
  const anchorOf = (id, c) => [c[0] - ((D[id].w - 1) >> 1), c[1] - ((D[id].h - 1) >> 1)];
  function disarm() { armed = null; ghost = null; ghostUpdate(); upd(); syncPl(); }
  function confirmBuild() {
    if (!armed || !ghost) return; const w = ghostWhy(); if (w) { msg(D[armed].n + ': ' + w); tone(200, 120, .12, .12); return; }
    const n = bl.length, lk = ghostLinked(); build(armed, ghost.i, ghost.j); if (bl.length > n && !lk) msg('⚠️ Nicht verbunden: bleibt offline, bis ein Gebäude oder Fließband daran grenzt'); if (bl.length > n) { showB = null; disarm(); } else { ghostUpdate(); upd(); syncPl(); }      // gebaut: Maus ist wieder leer
  }

  // ---------- Menü (Mobile First) ----------
  const css = document.createElement('style');
  css.textContent = `#rt-ov{position:fixed;inset:0;z-index:2;display:none}
.rt-lb{position:fixed;left:0;right:0;height:11vh;background:#000;z-index:8;transition:transform 1.4s;pointer-events:none}
#rt-title{position:fixed;left:0;right:0;top:42%;text-align:center;z-index:9;font:400 28px Georgia,serif;letter-spacing:.12em;color:#ffe8c8;opacity:0;transition:opacity 1.2s;text-shadow:0 2px 20px #000;pointer-events:none}
#rt-top{position:fixed;left:0;right:calc(var(--pw) + 4px);top:0;padding:max(8px,env(safe-area-inset-top)) 10px 0;z-index:6;display:flex;flex-direction:column;gap:5px;opacity:0;transition:opacity 1.4s;pointer-events:none}
.chips{display:flex;flex-wrap:wrap;gap:5px}.chip{flex:1 1 28%;display:flex;align-items:center;justify-content:center;height:28px;border-radius:14px;background:#241328d9;border:1.5px solid #6b4a3a;color:#ffe8c8;font:600 11px ui-monospace,Menlo,monospace;white-space:nowrap}
.chip.bad{color:#ff7a6a;border-color:#a04030}
#rt-obj{height:26px;border-radius:13px;background:#241328d9;border:1.5px solid #6b4a3a;color:#ffe8c8;display:grid;place-items:center;font:600 11px ui-monospace,Menlo,monospace;position:relative;overflow:hidden}
#rt-obj i{position:absolute;left:0;top:0;bottom:0;width:0;background:linear-gradient(90deg,#c97b2a,#f0b050);transition:width .6s;opacity:.5}#rt-obj span{position:relative}
#rt-panel{position:fixed;top:0;right:0;bottom:0;width:var(--pw);z-index:6;background:linear-gradient(90deg,#2b1530f2,#1b0d22fa);border-radius:20px 0 0 20px;border-left:2px solid #8a5a3a;padding:max(10px,env(safe-area-inset-top)) 8px max(10px,env(safe-area-inset-bottom)) 8px;transform:translateX(105%);transition:transform 2.6s cubic-bezier(.2,.7,.2,1);color:#ffe8c8;font:11px ui-monospace,Menlo,monospace;display:flex;flex-direction:column;gap:8px;box-sizing:border-box}
#rt-panel.up{transform:none}#rt-info{font-size:10.5px;line-height:1.3;opacity:.92;flex:none}#rt-info h3{margin:0 0 3px;font:700 16px Georgia,serif}
#rt-hp{height:6px;border-radius:3px;background:#0006;overflow:hidden;margin:2px 0 4px}#rt-hp i{display:block;height:100%;width:100%;background:#5fd07a}
#rt-cards{display:flex;flex-direction:column;gap:6px;flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;touch-action:pan-y;scrollbar-width:none}#rt-cards::-webkit-scrollbar{display:none}
.card{flex:none;min-height:40px;border-radius:12px;background:#3a2234;border:1.5px solid #7a5238;color:#ffe8c8;display:grid;grid-template-columns:auto 1fr;align-items:center;column-gap:5px;row-gap:1px;padding:5px 6px;text-align:left;cursor:pointer;overflow:hidden;box-sizing:border-box}
.card em{font-style:normal;font-size:18px;line-height:20px;filter:drop-shadow(0 2px 4px #000a)}.card .cn{font:700 10.5px ui-monospace,Menlo,monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.card small{grid-column:1/-1;font:600 10px ui-monospace,Menlo,monospace;color:#ffc067;line-height:1.3}.card small i{font-style:normal;color:#9fe0ff;white-space:nowrap}
.card.off{opacity:.38;filter:grayscale(.6)}.card.sel{border-color:#ffb85a;box-shadow:0 0 14px #ff9a3c88}
.rt-b{position:fixed;left:max(12px,env(safe-area-inset-left));width:46px;height:46px;border-radius:14px;background:#2b1530e6;border:2px solid #7a5238;color:#ffe8c8;font-size:22px;z-index:6;display:grid;place-items:center;opacity:0;transition:opacity 1.4s;pointer-events:none}
#rt-exit{display:none;left:50%;transform:translateX(-50%);bottom:calc(24px + env(safe-area-inset-bottom));width:auto;height:auto;border-radius:14px;padding:12px 20px;font-size:14px}
.rt-f{position:fixed;z-index:7;pointer-events:none;color:#ffd060;font:700 16px ui-monospace,Menlo,monospace;text-shadow:0 1px 6px #000;animation:rtf 1.4s forwards;transform:translate(-50%,0)}@keyframes rtf{to{transform:translate(-50%,-46px);opacity:0}}
#rt-car{border-color:#3fb8d8;animation:rtp 2.4s infinite}@keyframes rtp{0%,100%{box-shadow:0 0 0 0 #40d0ff00}50%{box-shadow:0 0 16px 2px #40d0ff77}}`;
  const CSS2 = `.chips{flex-wrap:nowrap;gap:3px}.chip{flex:1 1 0;min-width:0;height:38px;flex-direction:column;justify-content:center;gap:0;position:relative;overflow:hidden;padding:0 1px;line-height:1.15;font-size:9.5px}
.chip i{position:absolute;left:0;top:0;bottom:0;width:0;background:#40d0ff;opacity:.2;transition:width .4s}.chip b{position:relative;font-size:11px;font-weight:400}.chip span{position:relative}
.chip.warn{color:#ffd25a;border-color:#c9a02a}.chip.warn i{background:#ffc020;opacity:.3}.chip.bad{color:#ff7a6a;border-color:#c04030}.chip.bad i{background:#ff4030;opacity:.38}
#rt-pl{position:fixed;left:0;right:calc(var(--pw) + 4px);bottom:calc(14px + env(safe-area-inset-bottom));z-index:7;display:none;justify-content:center;gap:10px;pointer-events:none}
#rt-pl button{pointer-events:auto;min-height:48px;border-radius:24px;border:2px solid #4fe07a;background:#17381fee;color:#b8ffc8;font:700 14px ui-monospace,Menlo,monospace;padding:0 18px;cursor:pointer}
#rt-pl button.off{border-color:#e0584a;background:#3a1a16ee;color:#ffb0a4}#rt-pl #rt-no{border-color:#8a7a70;background:#2a2220ee;color:#ffe8c8;padding:0 16px}
.card.on{border-color:#4fe07a;background:#21402a}
.card.pg{background-image:linear-gradient(90deg,rgba(79,224,122,.45) var(--p),rgba(0,0,0,0) var(--p))}
#rt-top.live .chip{pointer-events:auto;cursor:pointer}
#rt-pop{position:fixed;z-index:9;display:none;width:min(250px,calc(100vw - var(--pw) - 24px));padding:8px 10px;border-radius:12px;background:#1b1420f2;border:1.5px solid #4fe07a;color:#ffe8c8;font:11px/1.45 ui-monospace,Menlo,monospace;pointer-events:none;box-sizing:border-box}
#rt-pop b{display:block;margin-bottom:3px;font-size:12px;color:#7aff9a}#rt-pop.warn{border-color:#c9a02a}#rt-pop.warn b{color:#ffd25a}#rt-pop.bad{border-color:#c04030}#rt-pop.bad b{color:#ff8a7a}
#rt-q{position:relative;min-height:38px;border-radius:12px;background:#2b2210eb;border:1.5px solid #d4a72c;color:#ffe9a8;padding:5px 28px 8px 9px;overflow:hidden;pointer-events:none;cursor:pointer;display:flex;flex-direction:column;gap:2px;font:600 11px/1.3 ui-monospace,Menlo,monospace;box-sizing:border-box}
#rt-q i{position:absolute;left:0;bottom:0;height:4px;width:0;background:#ffd23f;transition:width .6s}#rt-q b{font-size:9px;letter-spacing:.07em;color:#ffd23f;opacity:.9}#rt-q u{position:absolute;right:7px;top:7px;text-decoration:none;font-size:14px}
#rt-q.pulse{animation:rtq 1.2s infinite}@keyframes rtq{50%{box-shadow:0 0 14px 2px #ffd23faa}}
.card.hint{border-color:#ffd23f;animation:rtq 1.2s infinite}
#rt-spd.p{border-color:#ffd23f;color:#ffd23f}
#rt-jr{position:fixed;inset:0;z-index:10;display:none;place-items:center;background:#000b;padding:14px;box-sizing:border-box}#rt-jr.on{display:grid}
.jr{width:min(430px,100%);max-height:88vh;overflow-y:auto;border-radius:18px;background:#1d1608f7;border:2px solid #d4a72c;color:#ffe9a8;padding:14px 16px;font:12px/1.5 ui-monospace,Menlo,monospace;box-sizing:border-box}
.jr h3{margin:0 0 8px;font:700 17px Georgia,serif;color:#ffd23f}.jr p{margin:7px 0}.jr u{text-decoration:none;color:#ffd23f;font-weight:700}
.jr-l{display:flex;flex-direction:column;gap:2px;margin-bottom:8px}.jr-s{opacity:.8}.jr-s.d{opacity:.55;text-decoration:line-through}.jr-s.c{color:#ffd23f;opacity:1;font-weight:700}
.jr-b{padding:7px 9px;border-radius:10px;background:#3a2c0c;border:1px solid #d4a72c;margin:6px 0}.jr-z{opacity:.7;font-size:11px}
.jr-btn{display:block;width:100%;margin-top:8px;min-height:40px;border-radius:12px;border:1.5px solid #d4a72c;background:#3a2c0c;color:#ffe9a8;font:700 12px ui-monospace,Menlo,monospace;cursor:pointer}`;
  css.textContent = ':root{--pw:clamp(124px,33vw,160px)}' + css.textContent + CSS2; document.head.appendChild(css);
  const root = document.createElement('div');
  root.innerHTML = `<div id="rt-ov"></div><div class="rt-lb" id="rt-l1" style="top:0;transform:translateY(-100%)"></div><div class="rt-lb" id="rt-l2" style="bottom:0;transform:translateY(100%)"></div>
<div id="rt-title">NOTFALLBASIS ONLINE</div>
<div id="rt-top"><div class="chips"><div class="chip" id="c-ore"><i></i><b>◆</b><span></span></div><div class="chip" id="c-wk"><i></i><b>👷</b><span></span></div><div class="chip" id="c-st"><i></i><b>🔧</b><span></span></div><div class="chip" id="c-en"><i></i><b>⚡</b><span></span></div><div class="chip" id="c-wa"><i></i><b>💧</b><span></span></div><div class="chip" id="c-bat" style="display:none"><i></i><b>🔋</b><span></span></div><div class="chip" id="c-am" style="display:none"><i></i><b>🔸</b><span></span></div><div class="chip" id="c-day"><i></i><b>☀️</b><span></span></div></div><div id="rt-q"><i></i><b></b><span></span><u>📖</u></div></div>
<button class="rt-b" id="rt-spd" style="bottom:calc(184px + env(safe-area-inset-bottom))">▶</button><button class="rt-b" id="rt-sun" style="bottom:calc(128px + env(safe-area-inset-bottom))">🌙</button><button class="rt-b" id="rt-ctr" style="bottom:calc(72px + env(safe-area-inset-bottom))">⌖</button><button class="rt-b" id="rt-car" style="bottom:calc(16px + env(safe-area-inset-bottom))"><svg viewBox="0 0 64 40" width="34" height="21" style="filter:drop-shadow(0 0 5px #40d0ff88)"><defs><linearGradient id="rtcg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffc068"/><stop offset="1" stop-color="#d9531e"/></linearGradient></defs><path d="M4 27 L9 19 L22 18 L27 11 L43 11 L47 18 L58 20 L62 27 Z" fill="url(#rtcg)" stroke="#2a1408" stroke-width="1.6" stroke-linejoin="round"/><path d="M27 18 L31 12.5 L42 12.5 L45 18 Z" fill="#7fe3ff" opacity=".9"/><path d="M25 11 L26 4 L44 4 L47 18" fill="none" stroke="#e8e0d0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M62 24 L64 19 L64 29 Z" fill="#fff6c0" opacity=".85"/><circle cx="60" cy="23" r="2.2" fill="#fff6c0"/><line x1="9" y1="37" x2="56" y2="37" stroke="#40d0ff" stroke-width="2.2" stroke-linecap="round" opacity=".85"/><g fill="#17171b" stroke="#ff9a3c" stroke-width="2.2"><circle cx="15" cy="30" r="7.5"/><circle cx="50" cy="30" r="7.5"/></g><g fill="#ff9a3c"><circle cx="15" cy="30" r="2.6"/><circle cx="50" cy="30" r="2.6"/></g></svg></button>
<div id="rt-jr"><div class="jr"></div></div><div id="rt-pop"></div><div id="rt-pl"><button id="rt-ok"></button><button id="rt-no">✖</button></div><div id="rt-panel"><div id="rt-info"></div><div id="rt-cards"></div></div><button class="btn" id="rt-exit"><svg viewBox="0 0 24 24" width="20" height="20" style="vertical-align:-4px;margin-right:8px"><path d="M10 4H5v16h5M14 8l5 4-5 4M19 12H9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>Aussteigen</button>`;
  document.body.appendChild(root);
  root.querySelector('.chips').addEventListener('pointerdown', e => e.stopPropagation());
  ['rt-panel', 'rt-pl', 'rt-ctr', 'rt-car', 'rt-sun', 'rt-spd', 'rt-q', 'rt-jr', 'rt-exit'].forEach(id => $(id).addEventListener('pointerdown', e => e.stopPropagation()));
  const card = (a, ic, name, cost, top, cls = '') => `<div class="card ${cls}" data-a="${a}"><em>${ic}</em><span class="cn">${name}</span><small>${cost}${top ? ' <i>' + top + '</i>' : ''}</small></div>`;
  const badge = d => (d.w * d.h > 1 ? '▣' + d.w + '×' + d.h + ' ' : '▫1×1 ') + (d.e ? '⚡' + (d.e > 0 ? '+' : '') + d.e + ' ' : '') + (d.wa ? '💧' + (d.wa > 0 ? '+' : '') + d.wa + ' ' : '') + (d.am ? '🔸' + (d.am > 0 ? '+' : '') + d.am + ' ' : '') + (d.st ? '👷' + d.st + ' ' : '') + (d.cap ? '📦+' + d.cap + ' ' : '') + (d.bat ? '🔋+' + d.bat : '');
  // Menükarten aus den Tabellen (data.js → units / tech)
  const unitCard = uid => { const u = UN[uid], cap = u.cap === 'wcap' ? S.wcap : u.cap; return card('u:' + uid, u.ic, u.n, '◆ ' + u.cost, S[u.pop] + '/' + cap, S.ore < u.cost || S[u.pop] >= cap ? 'off' : ''); };
  const techCard = id => { const t = TC[id], r = sim.canResearch(id); return card('t:' + id, t.ic, t.n, '◆ ' + t.cost, t.time ? t.time + ' s' : 'sofort', r ? 'off' : ''); };
  const rsText = () => S.rs ? 'Forschung: ' + TC[S.rs.id].n + ' · ' + Math.ceil(S.rs.left) + ' s' : '';
  const lack = b => b.off === 'link' ? 'Keine Verbindung zum Quartier: Gebäude berühren oder per Fließband anschließen' : b.off === 'water' ? 'Wasser fehlt (zuletzt gebaute Verbraucher schalten zuerst ab)' : b.off === 'energy' ? 'Energie fehlt (zuletzt gebaute Verbraucher schalten zuerst ab)' : b.off === 'ammo' ? 'Munition fehlt' : 'steht still';
  function cardProg() {      // Bau-/Forschungs-/Ausbildungsfortschritt füllt die Karte von links nach rechts
    for (const el of $('rt-cards').children) { const a = el.dataset.a || '', id = a.slice(2); let p = -1;
      if (a.startsWith('b:')) sim.bl.forEach(b => { if (b.id === id && !b.built && !b.dying) p = Math.max(p, sim.progress(b)); });
      else if (a.startsWith('t:') && S.rs && S.rs.id === id && TC[id].time > 0) p = 1 - S.rs.left / TC[id].time;
      else if (a.startsWith('u:')) { const q = sim.q.find(x => x.u === id); if (q && UN[id].time > 0) p = 1 - q.left / UN[id].time; }
      el.style.setProperty('--p', Math.round(Math.max(0, p) * 100) + '%'); el.classList.toggle('pg', p >= 0); }
  }
  function infoHtml() {
    if (armed) { const d = D[armed], w = ghost ? ghostWhy() : ''; return '<h3>' + d.n + ' · ' + d.w + '×' + d.h + (d.w * d.h > 1 ? ' Felder' : ' Feld') + '</h3>' + (ghost ? (w ? '<span style="color:#ff8a7a">' + w + '</span>' : !ghostLinked() ? '<span style="color:#ffc060">Keine Verbindung: neben ein Gebäude oder Fließband setzen, sonst steht es still.</span>' : '<span style="color:#7aff9a">Passt. ' + (lastPT === 'mouse' ? 'Klicken zum Bauen' : '✔ Bauen oder nochmal antippen') + '</span>') : (lastPT === 'mouse' ? 'Maus übers Raster bewegen, Klick baut. Rechtsklick/Esc bricht ab.' : 'Feld im Raster antippen, um zu platzieren.')); }
    if (sel && sel.b) {
      const b = sel.b, d = b.def; let t;
      if (b.dying) t = 'Wird abgerissen …'; else if (!b.built) t = 'Wird gebaut …'; else if (b.id === 'hq') t = 'Zentrale · Lager ' + Math.floor(S.ore) + '/' + S.cap + ' · ⚡+' + Math.round(S.ec) + '<div id="rt-rs"></div>';
      else if (b.id === 'belt' && b.on) t = 'Verbindet Gebäude, Pakete fahren in beide Richtungen. Bonus +' + (DATA.economy.beltBonus + sim.mod.beltBonus) + ' Erz je angrenzender Raffinerie.';
      else if (!b.on) t = 'Außer Betrieb: ' + lack(b); else if (d.cap) t = 'Lager +' + d.cap + ' Erz (gesamt ' + S.cap + ')'; else if (d.bat) t = 'Speicher ' + Math.floor(S.bat) + '/' + S.bcap + ' (alle Batterien)';
      else t = (b.on ? 'In Betrieb' : 'Außer Betrieb: ' + lack(b)) + (d.st ? '<br>Besetzt ' + b.sw + '/' + d.st + (b.sw < d.st ? ' · Arbeiter fehlen' : '') : '');
      return '<h3>' + d.n + '</h3><div id="rt-hp"><i></i></div>' + t;
    }
    const c = sel && sel.c; return c ? 'Feld ' + (c[0] + 1) + '/' + (c[1] + 1) + ' gewählt: Gebäude antippen.' : 'Gebäude wählen, dann Feld im Raster antippen.';
  }
  function info() { const h = infoHtml(); if (h !== lastInfo) { lastInfo = h; $('rt-info').innerHTML = h; } }
  function render() {
    let cs = ''; lastInfo = ''; info();
    if (sel && sel.b) {
      const b = sel.b;
      if (b.id === 'hq') cs = unitCard('worker') + Object.keys(TC).filter(id => !sim.has(id)).map(techCard).join('');
      else { if (b.id === 'bar') cs += unitCard('soldier'); cs += card('demo', '🧰', 'Abriss', '+◆ ' + Math.floor(b.def.c * DATA.economy.refund), ''); }
    } else {
      cs = PAL.filter(sim.unlocked).map(id => { const d = D[id]; return card('b:' + id, d.ic, d.n, '◆ ' + d.c, badge(d), (S.ore < d.c ? 'off' : '') + (armed === id ? ' on' : '') + (showB === id ? ' hint' : '')); }).join('');
    }
    $('rt-cards').innerHTML = cs;
  }
  function refreshOcc() {
    occ.fill(0); for (let k = 0; k < NG * NG; k++) if (cells[k]) occ[k * 4] = 255;
    if (sel && sel.c) occ[ci(sel.c[0], sel.c[1]) * 4 + 3] = 255;
    if (sel && sel.b) for (let k = 0; k < NG * NG; k++) if (cells[k] === sel.b) occ[k * 4 + 3] = 255;
    if (ghost) { const d = D[ghost.id], w = ghostWhy(), perCell = w === 'Feld belegt' || w === 'außerhalb des Rasters';
      for (let a = 0; a < d.w; a++) for (let b = 0; b < d.h; b++) { const i = ghost.i + a, j = ghost.j + b; if (i < -OFF || j < -OFF || i >= NG - OFF || j >= NG - OFF) continue;
        const bad = w && (!perCell || sim.cget(i, j) || i < GR.x0 || j < GR.y0 || i >= GR.x1 || j >= GR.y1), k4 = ci(i, j) * 4;
        if (!w) { occ[k4 + 1] = 255; if (!ghostLinked()) occ[k4 + 2] = 255; } else if (bad) occ[k4 + 2] = 255; else { occ[k4 + 1] = 255; occ[k4 + 2] = 255; } } }      // gelb = grün + rot
    occT.needsUpdate = true;
  }
  const upd = () => { render(); refreshOcc(); };
  function act(a) {
    if (a.startsWith('b:')) { const id = a.slice(2); if (armed === id) disarm(); else arm(id, sel && sel.c); }
    else if (a.startsWith('u:')) { const id = a.slice(2); if (UN[id].at !== 'hq' && !(sel && sel.b && sel.b.id === UN[id].at)) return; const r = sim.train(id); if (r.err) return msg(r.err); chime(id === 'worker' ? [660, 880] : [392, 523], .1); hud(); render(); }
    else if (a.startsWith('t:')) { const id = a.slice(2), r = sim.research(id); if (r.err) return msg(TC[id].n + ': ' + r.err); chime([440, 554], .1); hud(); render(); }
    else if (a === 'rot' && sel && sel.b) { const b = sel.b; sim.rotate(b); place(b.root, b.x, b.z, b.rot * Math.PI / 2); tone(500, 600, .05, .06); }
    else if (a === 'demo' && sel && sel.b) { if (sim.demolish(sel.b)) { sel = null; upd(); } }
  }
  $('rt-cards').addEventListener('click', e => { const c = e.target.closest ? e.target.closest('.card') : null; if (c && c.dataset.a) act(c.dataset.a); });

  // ---------- Kamera & Eingabe ----------
  let mode = 'rts', k = 0, kd = 6, fx = 0, fz = 0, dist = 66, ct = 0, last = '';
  const pitch = .95, rc = new T.Raycaster(), cmat = new T.Matrix4(), qR = new Q();
  function pose(yawOff) {
    const d = dirAt(fx, fz), f = pAt(fx, fz, 0), fw = u2.clone().applyAxisAngle(d, yawOff); fw.addScaledVector(d, -fw.dot(d)).normalize();
    return { f, d, cp: f.clone().addScaledVector(fw, -dist * Math.cos(pitch)).addScaledVector(d, dist * Math.sin(pitch)) };
  }
  const panBy = (dx, dy) => { const s = dist * .0026; fx = cl(fx - dx * s, (GR.x0 - 5) * CS, (GR.x1 - 5) * CS); fz = cl(fz + dy * s * 1.2, (GR.y0 - 5) * CS, (GR.y1 - 5) * CS); };
  function cellFromXY(x, y) {
    rc.setFromCamera(new T.Vector2(x / window.innerWidth * 2 - 1, -(y / window.innerHeight) * 2 + 1), camera);
    const p = rc.ray.intersectSphere(new T.Sphere(new V3(), RF), new V3()); if (!p) return null; const r = p.sub(base.clone().multiplyScalar(RF)); return cellAt(r.dot(u1), r.dot(u2));
  }
  function hover(x, y) {                                       // Maus: Ghost klebt am Zeiger
    const c = cellFromXY(x, y); if (!c) { if (ghost) { ghost = null; ghostUpdate(); refreshOcc(); syncPl(); info(); } return; }
    const a = anchorOf(armed, c); if (!ghost || ghost.i !== a[0] || ghost.j !== a[1]) ghostTo(a);
  }
  function tap(x, y) {
    rc.setFromCamera(new T.Vector2(x / window.innerWidth * 2 - 1, -(y / window.innerHeight) * 2 + 1), camera);
    if (rc.intersectObject(car, true).length) { enterCar(); return; }
    const c = cellFromXY(x, y);
    if (armed) { if (!c) return; const a = anchorOf(armed, c); if (ghost && ghost.i === a[0] && ghost.j === a[1]) confirmBuild(); else { ghostTo(a); tone(900, 700, .05, .05); } return; }   // Klick auf den Ghost = bauen
    if (!c) { sel = null; upd(); return; }
    const b = cget(c[0], c[1]); sel = b ? { b } : { c }; upd(); tone(900, 700, .05, .05);
  }
  const ov = $('rt-ov'), pt = new Map(); let moved = 0;
  ov.addEventListener('pointerdown', e => { e.stopPropagation(); lastPT = e.pointerType; hidePop(); pt.set(e.pointerId, { x: e.clientX, y: e.clientY, t: Date.now() }); moved = 0; });
  ov.addEventListener('pointermove', e => { e.stopPropagation(); if (e.pointerType === 'mouse' && lastPT !== 'mouse') { lastPT = 'mouse'; syncPl(); } if (armed && e.pointerType === 'mouse' && !pt.size) hover(e.clientX, e.clientY);
    const p = pt.get(e.pointerId); if (!p) return;
    if (pt.size === 1) { const dx = e.clientX - p.x, dy = e.clientY - p.y; panBy(dx, dy); moved += Math.abs(dx) + Math.abs(dy); }
    else if (pt.size === 2) { const o2 = [...pt.entries()].find(([id]) => id !== e.pointerId)[1], d0 = Math.hypot(p.x - o2.x, p.y - o2.y), d1 = Math.hypot(e.clientX - o2.x, e.clientY - o2.y); if (d1 > 0) dist = cl(dist * d0 / d1, 26, 150); moved = 99; }
    p.x = e.clientX; p.y = e.clientY; });
  ov.addEventListener('pointerup', e => { e.stopPropagation(); const p = pt.get(e.pointerId); pt.delete(e.pointerId); if (p && moved < 10 && Date.now() - p.t < 450 && !pt.size) tap(e.clientX, e.clientY); });
  ov.addEventListener('pointercancel', e => pt.delete(e.pointerId)); ov.addEventListener('contextmenu', e => { e.preventDefault(); if (armed) disarm(); });
  ov.addEventListener('wheel', e => { e.preventDefault(); dist = cl(dist * (1 + e.deltaY * .001), 26, 150); }, { passive: false });
  const keys = {}, kdn = e => { keys[e.code] = 1; if (e.code === 'Escape') { if (armed) disarm(); hidePop(); } }, kup = e => keys[e.code] = 0; window.addEventListener('keydown', kdn); window.addEventListener('keyup', kup);
  $('rt-ctr').addEventListener('click', () => { fx = fz = 0; });
  root.querySelector('.chips').addEventListener('click', e => { const c = e.target.closest ? e.target.closest('.chip') : null; if (!c) return; if (popId === c.id) hidePop(); else popShow(c.id); });
  $('rt-ok').addEventListener('click', confirmBuild); $('rt-no').addEventListener('click', disarm);
  $('rt-sun').addEventListener('click', () => { const n = sim.skip(); msg(n ? '🌙 Zeit bis zum Abend vorgespult' : '☀️ Zeit bis zum Morgen vorgespult'); sim.recalc(); hud(); });
  const SPD = [['▶', 1], ['▶▶', 2], ['⏸', 0]];
  $('rt-spd').addEventListener('click', () => { const k = (SPD.findIndex(x => x[1] === speed) + 1) % SPD.length; speed = SPD[k][1]; $('rt-spd').textContent = SPD[k][0]; $('rt-spd').classList.toggle('p', speed === 0); msg(speed === 0 ? 'Pause: Bauen und Planen geht weiter' : speed === 2 ? 'Doppeltes Tempo' : 'Normales Tempo'); });
  $('rt-q').addEventListener('click', openJr);
  $('rt-jr').addEventListener('click', e => { const j = e.target.dataset && e.target.dataset.j; if (j === 'show') showHow(); else if (j === 'close' || e.target.id === 'rt-jr') closeJr(); });
  $('rt-car').addEventListener('click', () => enterCar());
  $('rt-exit').addEventListener('click', () => exitCar());
  function enterCar() { if (mode !== 'rts' || k < .95) return; mode = 'drive'; kd = 2.6; g.freeze(false); disarm(); msg('Du sitzt im Explorer'); chime([330, 440], .1); }
  function exitCar() { if (mode !== 'drive') return; if (pos.distanceTo(pAt(0, 0, 0)) > DATA.exitRadius) { msg('Zu weit von der Basis entfernt'); return; } mode = 'rts'; kd = 2.6; g.freeze(true); chime([440, 330], .1); }
  // Die Seitenleiste verdeckt rechts einen Streifen: das Bild wird so verschoben, dass der Fokus in der freien Fläche mittig liegt
  const PW = () => Math.round(cl(window.innerWidth * .33, 124, 160));
  let voX = -1, voW = 0, voH = 0;
  function setVO(px) { const W = window.innerWidth, Hh = window.innerHeight; px = Math.round(px); if (px === voX && W === voW && Hh === voH) return; voX = px; voW = W; voH = Hh; if (px < 1) camera.clearViewOffset(); else camera.setViewOffset(W, Hh, px, 0, W, Hh); }
  function apply(key) {
    const rtsF = mode === 'rts' && k > .97, drv = mode === 'drive' && k < .03, show = mode === 'rts' && k > .6;
    $('rt-panel').classList.toggle('up', rtsF); ov.style.display = mode === 'rts' && k > .95 ? 'block' : 'none';
    ['rt-top', 'rt-ctr', 'rt-car', 'rt-sun', 'rt-spd'].forEach(id => { $(id).style.opacity = show ? 1 : 0; }); $('rt-top').classList.toggle('live', show); if (!show) hidePop(); ['rt-ctr', 'rt-car', 'rt-sun', 'rt-spd', 'rt-q'].forEach(id => { $(id).style.pointerEvents = show ? 'auto' : 'none'; });
    $('rt-exit').style.display = drv ? 'block' : 'none'; g.radar.show(mode === 'drive');
    const rr = mode === 'rts' ? PW() + 12 : 14, tp = mode === 'rts' ? 176 : 96;   // Pause/Ton: im Basisbau neben der Leiste, im Fahrmodus rechts außen
    [['mu', 0], ['pz', 52]].forEach(([id, dx]) => { const el = $(id); if (el) { el.style.right = (rr + dx) + 'px'; el.style.top = 'calc(max(8px,env(safe-area-inset-top)) + ' + tp + 'px)'; } });
    ['bo', 'ju', 's'].forEach(id => { const el = $(id); if (el) el.style.display = mode === 'drive' ? '' : 'none'; });
  }

  // ---------- Start: Kamerafahrt ----------
  const sty = ['m', 's', 'h', 'bo', 'ju', 'mu', 'pz'].map(id => [id, $(id) ? $(id).style.cssText : null]);
  ['m', 's', 'h', 'bo', 'ju'].forEach(id => { const el = $(id); if (el) el.style.display = 'none'; });
  const mu = $('mu'); if (mu) { mu.style.left = 'auto'; mu.style.right = '14px'; mu.style.top = 'calc(max(8px,env(safe-area-inset-top)) + 96px)'; }
  const pz = $('pz'); if (pz) { pz.style.left = 'auto'; pz.style.right = '66px'; pz.style.top = 'calc(max(8px,env(safe-area-inset-top)) + 96px)'; }
  if (g.crater) g.crater.visible = false; if (g.sunk) g.sunk(.01); g.freeze(true);      // die Sonne folgt ab jetzt der Basis-Uhr (sim.clock)
  const saved = Save.zone('basis'); let gainOff = 0;
  if (saved && sim.load(saved)) {                                 // Spielstand: Offline-Fortschritt, Gebäude fertig hinstellen, Einheiten verteilen
    if (saved.at) gainOff = sim.offline((Date.now() - saved.at) / 1000);
    sim.bl.forEach(b => { if (b !== sim.hq) instantiate(b, b.built); });
    for (let k = 0; k < S.wk - sim.queued('worker'); k++) spawnWorker(); for (let k = 0; k < S.sc - sim.queued('soldier'); k++) spawnWorker(true, bl.find(b => b.id === DATA.units.soldier.at && b.built));
    msg(gainOff > 0 ? 'Während du weg warst: +' + gainOff + ' ◆' : 'Spielstand geladen');
  } else spawnWorker();
  recalc(); questUI(); render(); refreshOcc(); hud();
  $('rt-l1').style.transform = 'none'; $('rt-l2').style.transform = 'none'; chime([196, 294, 392, 587], .12);
  { const q0 = sim.step(); say('BASIS', saved && sim.quest > 0 || gainOff ? 'Willkommen zurück.' + (gainOff ? ' Während du weg warst: +' + gainOff + ' Erz.' : '') + (q0 ? ' Als Nächstes: ' + q0.t + '.' : ' Akt 1 ist geschafft.') : q0.say); }

  hook((dt, tt) => {
    const dts = dt * (mode === 'rts' ? speed : 1); now = tt; ct += dt; sim.update(dts);
    if (sun) { const el = sim.sunElev(); sun.copy(base).multiplyScalar(el).addScaledVector(u2, Math.sqrt(Math.max(0, 1 - el * el))).normalize(); }
    sim.events.splice(0).forEach(ev => {
      if (ev.type === 'grew') { msg('Das Raster wächst'); chime([440, 660], .08); }
      else if (ev.type === 'trained') { if (ev.unit === 'worker') spawnWorker(); else spawnWorker(true, bl.find(b => b.id === UN[ev.unit].at && b.built)); hud(); render(); }
      else if (ev.type === 'quest') { const q = ev.step; chime([523, 659, 784, 1047], .12); msg('✔ Auftrag erledigt' + (ev.skipped > 0 ? ' (+' + ev.skipped + ' schon erledigt)' : '')); say('BASIS', q ? q.say : 'Akt 1 geschafft! Die Basis steht. Als Nächstes folgen Fabrik und Wurm.'); showB = null; questUI(); render(); }
      else if (ev.type === 'hint') { if (ev.level === 1) say('BASIS', ev.step.tip); else { showB = sim.questB(); showT = tt + 60; msg('Tipp: ' + ev.step.t); render(); } questUI(); }
      else if (ev.type === 'dusk') { if (!sawDusk) { sawDusk = 1; say('BASIS', 'Die Sonne geht unter. Die Energiefelder fallen aus, jetzt tragen die Batterien die Basis.'); } else msg('🌙 Die Nacht beginnt'); }
      else if (ev.type === 'dawn') msg(ev.ok ? '☀️ Nacht überstanden' : '☀️ Morgen: Die Nacht brachte Stromausfälle');
      else if (ev.type === 'blackout') { msg('⚡ Stromausfall: die Batterien sind leer'); tone(120, 60, .4, .25); }
      else if (ev.type === 'full') msg('◆ Lager voll: Erz verfällt. Ausgeben oder ein Silo bauen');
      else if (ev.type === 'researched') { msg(TC[ev.id].n + ' erforscht'); chime([523, 659, 880], .12); hud(); render(); }
      else if (ev.type === 'income') { incLog.push([sim.time, ev.gain]); flt('+' + ev.gain + ' ◆', ev.b.x, ev.b.z, 10); }
      else if (ev.type === 'demolish') { sel = null; tone(220, 120, .15, .12); render(); refreshOcc(); }
      else if (ev.type === 'removed') { const b = ev.b; if (b.root) { boom(b); b.root.parent && b.root.parent.remove(b.root); } flt('+◆ ' + Math.floor(b.def.c * DATA.economy.refund), b.x, b.z, 8); hud(); upd(); }
      else if (ev.type === 'built') { const b = ev.b; b.root.remove(b.holo); b.m.g.scale.y = 1; hud(); chime([523, 659, 784], .1); tone(110, 40, .35, .28); g.nz(g.A.wn, 'bandpass', 3500, 1200, .6, .1); flt('✔', b.x, b.z, 6); hud(); render(); }
    });
    const rsEl = $('rt-rs'); if (rsEl) rsEl.textContent = rsText();
    if (S.ore !== lastOre) { lastOre = S.ore; hud(); if (!(sel && sel.c)) render(); }
    if (tt - lastHud > .25) { lastHud = tt; hud(); info(); syncPl(); if (popId) popShow(popId); if (ghost) { ghostUpdate(); refreshOcc(); } const ic = sim.phase() >= .5 ? '☀️' : '🌙'; if (ic !== sunIc) { sunIc = ic; $('rt-sun').textContent = ic; } }
    if (tt - lastQ > .4) { lastQ = tt; questUI(); }
    if (tt - lastCP > .1) { lastCP = tt; cardProg(); }
    if (showB && tt > showT) { showB = null; render(); }
    const kt = mode === 'rts' ? 1 : 0; if (k !== kt) k = cl(k + Math.sign(kt - k) * dt / kd, 0, 1); if (kd > 3 && k >= 1) kd = 2.6;
    const e = ease(k); setVO(k > 0 ? PW() / 2 * e : 0);
    if (k > 0) {
      const P = pose((1 - e) * .9); cmat.lookAt(P.cp, P.f, P.d); qR.setFromRotationMatrix(cmat);
      camera.position.lerp(P.cp, e); camera.quaternion.slerp(qR, e); camera.fov = Lp(camera.fov, 38, e); camera.updateProjectionMatrix();
    }
    if (mode === 'rts') { const s = dt * 14; if (keys.KeyA || keys.ArrowLeft) fx -= s; if (keys.KeyD || keys.ArrowRight) fx += s; if (keys.KeyW || keys.ArrowUp) fz += s; if (keys.KeyS || keys.ArrowDown) fz -= s; fx = cl(fx, (GR.x0 - 5) * CS, (GR.x1 - 5) * CS); fz = cl(fz, (GR.y0 - 5) * CS, (GR.y1 - 5) * CS); }
    grid.visible = k > 0; gm.uniforms.uT.value = tt; gm.uniforms.uR.value = cl(ease(cl(k * 1.35 - .2, 0, 1)) * 2.2, 0, 2.2); const gk = Math.min(1, dt * 2.5), mn = gm.uniforms.uMin.value, mx = gm.uniforms.uMax.value; mn.x += (GR.x0 + OFF - mn.x) * gk; mn.y += (GR.y0 + OFF - mn.y) * gk; mx.x += (GR.x1 + OFF - mx.x) * gk; mx.y += (GR.y1 + OFF - mx.y) * gk;
    if (sel && sel.c) gm.uniforms.uS.value.set(sel.c[0] + OFF + .5, sel.c[1] + OFF + .5, 1); else if (sel && sel.b) gm.uniforms.uS.value.set(sel.b.i + sel.b.def.w / 2 + OFF, sel.b.j + sel.b.def.h / 2 + OFF, 1); else gm.uniforms.uS.value.z = 0;
    $('rt-title').style.opacity = ct > 1 && ct < 4.2 ? 1 : 0; if (ct > 5.5) { $('rt-l1').style.transform = 'translateY(-100%)'; $('rt-l2').style.transform = 'translateY(100%)'; }
    const key = mode + (k > .97 ? 'F' : k < .03 ? '0' : k > .6 ? 'H' : 'M'); if (key !== last) { last = key; apply(key); }
    // Gebäude
    const night = 1 - sim.light();      // gleiche Formel wie die Sonne im Himmel
    bl.forEach(b => {
      if (b.id === 'hq') return;
      if (b.dying) { const kk = sim.demoProgress(b); b.m.g.scale.y = Math.max(.02, 1 - ease(kk)); offShow(b, null);       // rückwärts bauen
        if (dts > 0 && rnd() < dts * 30) dust(pAt(b.x + (rnd() - .5) * b.def.w * CS, b.z + (rnd() - .5) * b.def.h * CS, .6 + (1 - kk) * b.def.hh * .5), rv(3).addScaledVector(base, 1 + rnd() * 2));
        b.hn -= dts; if (dts > 0 && b.hn <= 0 && tt > lastH + .12) { b.hn = .2 + rnd() * .3; lastH = tt; hammer(); } return; }
      if (!b.built) { const kk = sim.progress(b); b.m.g.scale.y = Math.max(.02, ease(kk)); b.holo.material.opacity = (1 - kk) * (.7 + .3 * Math.sin(tt * 20));
        if (dts > 0 && rnd() < dts * 26) dust(pAt(b.x + (rnd() - .5) * b.def.w * CS, b.z + (rnd() - .5) * b.def.h * CS, .6), rv(2).addScaledVector(base, 1 + rnd() * 2));
        b.hn -= dts; if (dts > 0 && b.hn <= 0 && tt > lastH + .12) { b.hn = .2 + rnd() * .3; lastH = tt; hammer(); }
      }
      const on = b.built && powered(b); offShow(b, b.built && !b.on ? b.off : null, tt); if (b.id === 'silo') b.m.fill = S.cap ? S.ore / S.cap : 0; else if (b.id === 'battery') b.m.chg = S.bcap ? S.bat / S.bcap : 0;
      b.m.upd(dts, tt, on, night);
      if (on && dts > 0) (b.def.smoke || []).forEach(sv => { if (rnd() < dts * 12) sm.e(b.root.localToWorld(new V3(sv[0], sv[1], sv[2])), base.clone().multiplyScalar(2.5 + rnd() * 2).add(rv(1.2)), 3.5 + rnd() * 2, 3.5 + rnd() * 3); });
    });
    if (sim.netVer !== lastNet) { lastNet = sim.netVer; bl.forEach(b => { if (b.id === 'belt' && b.m) beltLinks(b); }); }
    packets(dts);
    sm.u(dt, .5, 1.5, 2.2, base);
    const ts = bl.filter(b => b.id === 'torch' && b.built && powered(b)), tl = g.planet ? g.planet.uniforms.uTL.value : null;
    for (let i = 0; i < 4; i++) {
      const b = ts[i];
      if (b) { b.root.updateMatrixWorld(true); const p = b.root.localToWorld(new V3(0, 8.6, 0)), fl = .85 + .15 * Math.sin(tt * 13 + i) + .08 * Math.sin(tt * 31 + i * 2);
        if (tl) tl[i].set(p.x, p.y, p.z, 9 * (.12 + .88 * night) * fl); if (i < 3) { pls[i].position.copy(p); pls[i].intensity = (.5 + 2.4 * night) * fl; }
        if (rnd() < dt * 14) emb.e(p, base.clone().multiplyScalar(3 + rnd() * 4).add(rv(3)), 1 + rnd() * 1.2, 1.4); }
      else { if (tl) tl[i].w = 0; if (i < 3) pls[i].intensity = 0; }
    }
    emb.u(dt, 1.2, 4, .3, base);
    // Einheiten
    { const sites = bl.filter(b => !b.built || b.dying); let wi = 0; units.forEach(u => { if (!u.sold) { u.jd = sim.jobs[wi] || null; u.sd = sites.length ? sites[wi % sites.length] : null; wi++; } }); }      // Arbeiter k: Stelle k; alle helfen bei Bau und Abriss
    if (dts > 0) units.forEach(u => wUpd(u, dts, tt)); const a = tt * .35;
    place(drone, Math.cos(a) * 15, Math.sin(a) * 15, -a, 10 + Math.sin(tt * 1.7) * 1.2); drone.rotateX(.12); rotors.forEach(r => r.rotation.y += dt * 40);
    dish.rotation.y += dt * .4; hqLamp.visible = Math.sin(tt * 3) > 0;
    if (dome) dome.material.emissiveIntensity = .6 + .3 * Math.sin(tt * 2);
    cring.visible = mode === 'rts' && k > .9; if (cring.visible) { const cu = pos.clone().normalize(); cring.position.copy(pos).addScaledVector(cu, -.6); cring.quaternion.setFromUnitVectors(new V3(0, 0, 1), cu); cring.scale.setScalar(1 + .12 * Math.sin(tt * 3)); cring.material.opacity = .35 + .25 * Math.sin(tt * 3); }
  });
  // ---------- Vertrag: save / leave ----------
  const dispose = () => { owned.forEach(ob => ob.parent && ob.parent.remove(ob)); units.length = 0; };
  ZN = {
    api: { sim, S, bl, cells, units, get grid() { return [GR.x0, GR.x1, GR.y0, GR.y1]; }, pick(b) { sel = { b }; upd(); }, arm, disarm, confirm: confirmBuild, get ghost() { return ghost; }, get armed() { return armed; }, moveGhost(i, j) { const d = D[armed]; ghost = { id: armed, i: i - ((d.w - 1) >> 1), j: j - ((d.h - 1) >> 1) }; ghostUpdate(); refreshOcc(); syncPl(); info(); }, ghostMesh: gRoot, packets: pkM, occ, get speed() { return speed; }, set speed(v) { speed = v; }, journal: openJr, get mode() { return mode; }, get k() { return k; }, select(i, j) { sel = { c: [i, j] }; upd(); }, act, tap, enterCar, exitCar },
    save() { Save.res.ore = S.ore; return Object.assign(sim.serialize(), { at: Date.now() }); },
    leave() {
      g.hook(null); dispose(); root.remove(); css.remove(); window.removeEventListener('keydown', kdn); window.removeEventListener('keyup', kup);
      g.radar.show(false); camera.clearViewOffset(); g.freeze(false); if (g.sunk) g.sunk(1); sty.forEach(([id, c]) => { const el = $(id); if (el && c != null) el.style.cssText = c; });
    },
  };
  window.__basis = ZN.api;                                       // für Konsole und Tests
} });
})();
