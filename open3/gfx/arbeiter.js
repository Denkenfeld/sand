// objects/arbeiter.js – Arbeiter „Fennek“ (Rigger der Kojote-Crew)
// Druckanzug im Science-Fiction-Look: Helm mit HUD-Visier, Lebenserhaltung mit Schläuchen, Handgelenk-Computer, Schneidbrenner,
// Antennen – alt, verkratzt, notdürftig geflickt. Läuft mit eigener Physik (Schwerkraft wählbar: Planet / Mond / Mars / Erde).
// Vorn = -Z, oben = +Y, Ursprung = Boden unter dem Arbeiter. Größe 1,98 m (Raumschiff „Kojote“: 9,5 m hoch).
Gallery.add({
  id: 'arbeiter', name: 'Arbeiter „Fennek“', labels: { eng: 'Systeme' }, controls: true, compare: true,
  info: 'Wüstenarbeiter im Druckanzug · 1,98 m · Stick/WASD laufen · Sprung/Leertaste · Shift rennen · ziehen = Kamera',
  cam: { dist: 7, min: 2.2, max: 80, near: .15, shadow: 15, pitch: .2, yaw: 3.74, auto: false, minY: .35 },
  build(T, GC, opts = {}) {
    const EMB = !!opts.embedded, LITE = !!opts.lite, VAR = opts.variant || 'arbeiter';   // EMB: Spielmodus (Physik kommt vom Spiel), LITE: abgespeckt für viele Einheiten
    const A = (window.__ARB = window.__ARB || {}), memo = (k, f) => A[k] || (A[k] = f());   // Materialien/Texturen werden von allen Instanzen geteilt
    const V3 = T.Vector3, Q = T.Quaternion, V2 = T.Vector2, PI = Math.PI, R = GC.rng(2049), rr = (a, b) => a + (b - a) * R(), cl = (x, a, b) => Math.min(b, Math.max(a, x)), lerp = (a, b, t) => a + (b - a) * t;
    const sm = (a, b, x) => { const t = cl((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }, fr = x => x - Math.floor(x), wrapA = a => a - 2 * PI * Math.floor((a + PI) / (2 * PI));
    const world = opts.world, inp = opts.input || {}, hAt = (x, z) => world ? world.heightAt(x, z) : 0;
    const root = new T.Group(), body = new T.Group(); root.add(body);
    const glows = [], blinks = [], dmg = [], bakeList = [], headLamps = [];

    // ---------- Materialien: Stoff, Panzerplatten, Orange (Warnfarbe), Helm, Handschuh – alle verschmutzt und zerkratzt ----------
    const MK = memo('mats_' + VAR, () => {
    const suitM = GC.material(T, 31, { base: [184, 176, 154], accents: [[196, 104, 40], [104, 112, 84], [64, 68, 74]], accentP: .1, pw: [110, 240], ph: [80, 170], tone: .1, seam: .42, burn: 5, metal: .12, bump: .8 });
    const armorM = GC.material(T, 32, { base: [62, 66, 74], accents: [[196, 98, 36], [38, 54, 64], [110, 76, 44]], accentP: .09, pw: [120, 260], ph: [100, 200], metal: .66, burn: 5, bump: 1.1 });
    const orangeM = GC.material(T, 33, { base: VAR === 'soldat' ? [92, 106, 64] : [206, 108, 36], accents: VAR === 'soldat' ? [[150, 160, 90], [60, 74, 50], [50, 52, 50]] : [[238, 178, 62], [150, 70, 28], [60, 60, 62]], accentP: .14, pw: [120, 260], ph: [100, 190], metal: .4, burn: 4 });
    const helmM = GC.material(T, 34, { base: [216, 210, 196], accents: [[196, 104, 40], [150, 140, 120]], accentP: .05, pw: [220, 420], ph: [160, 300], tone: .06, burn: 3, metal: .3, bump: .9 });
    const gloveM = GC.material(T, 35, { size: 256, base: [58, 54, 50], accents: [[96, 70, 40], [30, 30, 32]], accentP: .15, pw: [26, 70], ph: [24, 60], metal: .08, burn: 2, bump: .6 });
    const oliveM = GC.material(T, 36, { size: 256, base: [92, 100, 70], accents: [[152, 112, 52], [70, 80, 60]], accentP: .12, pw: [40, 100], ph: [30, 80], metal: .2, burn: 3 });
    const rubber = new T.MeshStandardMaterial({ color: 0x17181b, metalness: .15, roughness: .88 }), trim = new T.MeshStandardMaterial({ color: 0x2a2d33, metalness: .75, roughness: .42 });
    const chrome = new T.MeshStandardMaterial({ color: 0xc6ccd4, metalness: .95, roughness: .24 }), copper = new T.MeshStandardMaterial({ color: 0xb8703c, metalness: .85, roughness: .36 });
    const hazard = new T.MeshStandardMaterial({ map: GC.hazard(T), roughness: .7, metalness: .3 });
    const dishM = helmM.clone(); dishM.side = T.DoubleSide;
    const rc = {}, rp = (m, x = 1, y = 1) => rc[m.uuid + x + '_' + y] || (rc[m.uuid + x + '_' + y] = GC.rep(m, x, y));
      return { suitM, armorM, orangeM, helmM, gloveM, oliveM, rubber, trim, chrome, copper, hazard, dishM, rp };
    });
    const { suitM, armorM, orangeM, helmM, gloveM, oliveM, rubber, trim, chrome, copper, hazard, dishM, rp } = MK;
    const bas = c => memo('bas' + c, () => new T.MeshBasicMaterial({ color: c }));

    // ---------- Hilfsfunktionen ----------
    const add = (p, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = m.receiveShadow = true; p.add(m); return m; };
    const box = (p, w, h, d, mat, x, y, z, rx, ry, rz) => add(p, new T.BoxGeometry(w, h, d), mat, x, y, z, rx, ry, rz);
    const cyl = (p, r1, r2, len, mat, x, y, z, rx, ry, rz, seg = 14) => add(p, new T.CylinderGeometry(r1, r2, len, seg), mat, x, y, z, rx, ry, rz);
    const lathe = (pts, seg = 14) => new T.LatheGeometry(pts.map(q => new V2(q[0], q[1])), seg);
    // Gliedmaße: Stumpf von y=-L (Radius r1) bis y=0 (Radius r0), optional mit Wulstringen, oben und unten geschlossen
    const limb = (r0, r1, L, ribs = 0, seg = 14) => { const p = [[0, -L]]; for (let i = 0; i <= 14; i++) { const t = i / 14; p.push([lerp(r1, r0, t) * (1 + (ribs ? Math.sin(t * ribs * PI * 2) * .07 : 0)), -L + L * t]); } p.push([0, 0]); return lathe(p, seg); };
    const pill = (r, len, seg = 12) => { const p = []; for (let i = 0; i <= 5; i++) { const a = -PI / 2 + i * PI / 10; p.push([r * Math.cos(a), -len / 2 + r * Math.sin(a)]); } for (let i = 0; i <= 5; i++) { const a = i * PI / 10; p.push([r * Math.cos(a), len / 2 + r * Math.sin(a)]); } return lathe(p, seg); };
    const ring = (p, r, tube, mat, x, y, z, rx = PI / 2, ry = 0, rz = 0) => add(p, new T.TorusGeometry(r, tube, 6, 18), mat, x, y, z, rx, ry, rz);
    const lamp = (p, x, y, z, c, blink = 0, sz = .14, r = .012) => { const m = add(p, new T.SphereGeometry(r, 8, 6), bas(c), x, y, z); m.castShadow = false; if (LITE) { m.userData.glow = { visible: true }; return m; } m.userData.keep = true; const s = GC.sprite(T, c, sz, .9); s.position.set(x, y, z); p.add(s); glows.push({ o: s, b: .9 }); m.userData.glow = s; if (blink) blinks.push({ s, m, ph: rr(0, 6), sp: blink }); return m; };
    const node = (p, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = new T.Object3D(); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); p.add(o); return o; };
    const joint = g => { g.userData.joint = true; return g; };
    // Starre Teile zu wenigen Meshes pro Material verschmelzen (Leistung auf dem Handy); bewegte Teile sind mit userData.keep / .joint markiert
    const bake = g => { g.updateMatrixWorld(true); const inv = new T.Matrix4().copy(g.matrixWorld).invert(), by = new Map(), dead = [];
      const walk = o => o.children.forEach(c => { if (c.userData.joint) return; if (c.isMesh && !c.userData.keep && c.geometry.index && c.geometry.attributes.uv && !c.material.transparent) { const ge = c.geometry.clone(); ge.applyMatrix4(new T.Matrix4().multiplyMatrices(inv, c.matrixWorld)); const k = c.material.uuid; if (!by.has(k)) by.set(k, { m: c.material, gs: [] }); by.get(k).gs.push(ge); dead.push(c); } else if (!c.isMesh) walk(c); });
      walk(g); dead.forEach(c => c.parent.remove(c));
      by.forEach(({ m, gs }) => { let nv = 0, ni = 0; gs.forEach(x => { nv += x.attributes.position.count; ni += x.index.count; }); const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), U = new Float32Array(nv * 2), I = new Uint32Array(ni); let vo = 0, io = 0;
        gs.forEach(x => { P.set(x.attributes.position.array, vo * 3); N.set(x.attributes.normal.array, vo * 3); U.set(x.attributes.uv.array, vo * 2); const ix = x.index.array; for (let i = 0; i < ix.length; i++) I[io + i] = ix[i] + vo; vo += x.attributes.position.count; io += ix.length; });
        const ge = new T.BufferGeometry(); ge.setAttribute('position', new T.BufferAttribute(P, 3)); ge.setAttribute('normal', new T.BufferAttribute(N, 3)); ge.setAttribute('uv', new T.BufferAttribute(U, 2)); ge.setIndex(new T.BufferAttribute(I, 1));
        const me = new T.Mesh(ge, m); me.castShadow = me.receiveShadow = true; g.add(me); }); };
    // Vertexfarben-Variante (LITE): alle starren Teile eines Gelenks zu EINEM Mesh mit Vertexfarben (Durchschnittsfarbe der Materialien) – 1 Draw-Call je Gelenk, keine Texturen
    const lcM = memo('lcM', () => new T.MeshStandardMaterial({ vertexColors: true, roughness: .7, metalness: .08 })), lcB = memo('lcB', () => new T.MeshBasicMaterial({ vertexColors: true }));
    const bakeVC = g => { g.updateMatrixWorld(true); const inv = new T.Matrix4().copy(g.matrixWorld).invert(), by = { s: [], b: [] }, dead = [];
      const walk = o => o.children.forEach(c => { if (c.userData.joint) return; if (c.isMesh && !c.userData.keep && c.geometry.index && c.geometry.attributes.normal && !Array.isArray(c.material)) { if (c.material.transparent || !c.visible) { return; } const ge = c.geometry.clone(); ge.applyMatrix4(new T.Matrix4().multiplyMatrices(inv, c.matrixWorld)); const col = GC.avg(c.material), k = c.material.isMeshBasicMaterial ? 1 : 1.55, n = ge.attributes.position.count, ca = new Float32Array(n * 3); for (let i = 0; i < n; i++) { ca[i * 3] = col[0] * k; ca[i * 3 + 1] = col[1] * k; ca[i * 3 + 2] = col[2] * k; } ge.setAttribute('color', new T.BufferAttribute(ca, 3)); (c.material.isMeshBasicMaterial ? by.b : by.s).push(ge); dead.push(c); } else if (!c.isMesh) walk(c); });
      walk(g); dead.forEach(c => c.parent.remove(c));
      [[by.s, lcM], [by.b, lcB]].forEach(([gs, m]) => { if (!gs.length) return; let nv = 0, ni = 0; gs.forEach(x => { nv += x.attributes.position.count; ni += x.index.count; }); const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), Cc = new Float32Array(nv * 3), I = new Uint32Array(ni); let vo = 0, io = 0;
        gs.forEach(x => { P.set(x.attributes.position.array, vo * 3); N.set(x.attributes.normal.array, vo * 3); Cc.set(x.attributes.color.array, vo * 3); const ix = x.index.array; for (let i = 0; i < ix.length; i++) I[io + i] = ix[i] + vo; vo += x.attributes.position.count; io += ix.length; });
        const ge = new T.BufferGeometry(); ge.setAttribute('position', new T.BufferAttribute(P, 3)); ge.setAttribute('normal', new T.BufferAttribute(N, 3)); ge.setAttribute('color', new T.BufferAttribute(Cc, 3)); ge.setIndex(new T.BufferAttribute(I, 1)); const me = new T.Mesh(ge, m); g.add(me); }); };
    // Biegsame Antenne aus mehreren Segmenten; bend(ax, az) verteilt die Auslenkung auf alle Segmente
    const antenna = (p, x, y, z, len, segs, r, mat, lampCol) => { const base = new T.Group(); base.position.set(x, y, z); p.add(base); const gs = []; let par = base;
      for (let i = 0; i < segs; i++) { const g = new T.Group(); g.position.y = i ? len / segs : 0; par.add(g); const m = cyl(g, r * (1 - i * .16), r * (1 - (i + 1) * .16), len / segs, mat, 0, len / segs / 2, 0, 0, 0, 0, 6); m.userData.keep = !LITE; gs.push(g); par = g; }
      const tip = lamp(par, 0, len / segs + .005, 0, lampCol, 1.6, .22, r * 1.9); return { base, bend(ax, az) { gs.forEach((g, i) => { g.rotation.x = ax / segs * (1 + i * .5); g.rotation.z = az / segs * (1 + i * .5); }); } }; };

    // ---------- Bildschirme (Canvas-Texturen, werden live gezeichnet) ----------
    const mkScr = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'), tx = new T.CanvasTexture(c); tx.encoding = T.sRGBEncoding; tx.minFilter = T.LinearFilter; tx.generateMipmaps = false;
      return { c, tx, mat: new T.MeshBasicMaterial({ map: tx, toneMapped: false, fog: false }), upd(...a) { draw(x, w, h, ...a); tx.needsUpdate = true; } }; };
    const chestScr = memo('x_chestScr', () => mkScr(128, 72, (x, w, h, t, on, bad) => { x.fillStyle = '#031512'; x.fillRect(0, 0, w, h); if (!on) return; x.strokeStyle = '#38ffb0'; x.lineWidth = 1.6; x.beginPath();
      for (let px = 0; px < w; px++) { const tt = t - (w - px) / 46, ph = fr(tt * .95); let y = h * .66; if (ph > .1 && ph < .14) y -= 17 * Math.sin((ph - .1) / .04 * PI); else if (ph > .14 && ph < .17) y += 7 * Math.sin((ph - .14) / .03 * PI); else if (ph > .3 && ph < .4) y -= 4 * Math.sin((ph - .3) / .1 * PI); px ? x.lineTo(px, y) : x.moveTo(px, y); } x.stroke();
      x.font = 'bold 15px monospace'; x.fillStyle = '#7dffd0'; x.fillText('O2 ' + (84 + (Math.sin(t * .3) * 2 | 0)) + '%', 6, 16); x.fillStyle = bad && Math.sin(t * 9) > 0 ? '#ff5a3a' : '#5ad6ff'; x.fillText(bad ? 'LECK!' : 'TEMP 21', 66, 16);
      x.fillStyle = '#0b3a30'; x.fillRect(6, 24, 116, 6); x.fillStyle = '#38ffb0'; x.fillRect(6, 24, 98 + Math.sin(t) * 4, 6); }));
    const wristScr = memo('x_wristScr', () => mkScr(144, 104, (x, w, h, t, on, bad, hd, px, pz) => { x.fillStyle = '#021417'; x.fillRect(0, 0, w, h); if (!on) return; const cx = 50, cy = 52;
      x.strokeStyle = '#1a8a8a'; x.lineWidth = 1; [14, 28, 42].forEach(r => { x.beginPath(); x.arc(cx, cy, r, 0, 7); x.stroke(); }); x.beginPath(); x.moveTo(cx - 44, cy); x.lineTo(cx + 44, cy); x.moveTo(cx, cy - 44); x.lineTo(cx, cy + 44); x.stroke();
      const a = t * 1.7; for (let i = 0; i < 14; i++) { x.strokeStyle = `rgba(80,255,230,${.55 * (1 - i / 14)})`; x.lineWidth = 3; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a - i * .06) * 42, cy + Math.sin(a - i * .06) * 42); x.stroke(); }
      const dx = -px, dz = -pz, d = Math.hypot(dx, dz), ang = Math.atan2(dx, -dz) + hd, rd = Math.min(1, d / 90) * 40; x.fillStyle = '#ffb347'; x.beginPath(); x.arc(cx + Math.sin(ang) * rd, cy - Math.cos(ang) * rd, 3.2, 0, 7); x.fill();
      x.fillStyle = '#7dffe8'; x.beginPath(); x.moveTo(cx, cy - 5); x.lineTo(cx + 4, cy + 4); x.lineTo(cx - 4, cy + 4); x.fill();
      x.font = 'bold 13px monospace'; x.fillStyle = '#7dffe8'; x.fillText('HDG', 102, 16); x.fillText(String(Math.round(((-hd * 180 / PI) % 360 + 360) % 360)).padStart(3, '0'), 102, 32);
      x.font = '11px monospace'; x.fillStyle = '#ffb347'; x.fillText('SHIP', 102, 54); x.fillText(String(Math.round(d)) + 'm', 102, 67); x.fillStyle = '#5ad6ff'; x.fillText('X' + (px < 0 ? '-' : '+') + String(Math.abs(px | 0)).padStart(3, '0'), 100, 88); x.fillText('Z' + (pz < 0 ? '-' : '+') + String(Math.abs(pz | 0)).padStart(3, '0'), 100, 100);
      if (bad) { x.fillStyle = 'rgba(120,255,240,.5)'; for (let i = 0; i < 4; i++) { const y = (Math.sin(t * 7 + i * 2.3) * .5 + .5) * h; x.fillRect(0, y, w, 1 + i % 2); } x.strokeStyle = 'rgba(230,240,240,.8)'; x.lineWidth = 1; x.beginPath(); x.moveTo(110, 0); x.lineTo(92, 46); x.lineTo(98, 66); x.lineTo(70, h); x.moveTo(92, 46); x.lineTo(130, 56); x.stroke(); } }));
    const toolScr = memo('x_toolScr', () => mkScr(96, 40, (x, w, h, t, on, act) => { x.fillStyle = '#04141a'; x.fillRect(0, 0, w, h); if (!on) return; x.font = 'bold 13px monospace'; x.fillStyle = act ? '#9fe8ff' : '#3a7a88'; x.fillText(act ? 'ARC 4.2kA' : 'STBY', 6, 15);
      x.fillStyle = '#0b3340'; x.fillRect(6, 24, 84, 8); x.fillStyle = act ? '#7be4ff' : '#2a5a66'; x.fillRect(6, 24, act ? 40 + 34 * Math.abs(Math.sin(t * 13)) : 14, 8); }));
    // HUD im Visier (nur Symbole, damit nichts spiegelverkehrt wirkt)
    const hudTex = memo('x_hud', () => (() => { const c = GC.cv(256, 128, (x, w, h) => { x.fillStyle = '#000'; x.fillRect(0, 0, w, h); x.strokeStyle = '#5ae6ff'; x.fillStyle = '#5ae6ff'; x.lineWidth = 2;
      [[10, 10, 1, 1], [w - 10, 10, -1, 1], [10, h - 10, 1, -1], [w - 10, h - 10, -1, -1]].forEach(([a, b, sx, sy]) => { x.beginPath(); x.moveTo(a, b + sy * 22); x.lineTo(a, b); x.lineTo(a + sx * 22, b); x.stroke(); });
      x.lineWidth = 1.5; x.beginPath(); x.arc(w / 2, h / 2, 30, .3, 2.6); x.stroke(); x.beginPath(); x.arc(w / 2, h / 2, 30, 3.5, 5.8); x.stroke(); for (let i = 0; i < 9; i++) { x.fillRect(24 + i * 6, h - 34, 3, 8 + (i % 3) * 5); x.fillRect(w - 80 + i * 6, h - 34, 3, 20 - (i % 4) * 4); }
      x.globalAlpha = .55; for (let i = 0; i < 5; i++) x.fillRect(20, 24 + i * 8, 30 + (i * 17) % 26, 2); x.globalAlpha = .8; x.beginPath(); x.moveTo(w / 2 - 6, 26); x.lineTo(w / 2, 20); x.lineTo(w / 2 + 6, 26); x.stroke(); });
      const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return t; })());
    const visorM = memo('x_visor', () => new T.MeshStandardMaterial({ color: 0x0a1a22, metalness: 1, roughness: .05, emissive: 0xffffff, emissiveMap: hudTex, emissiveIntensity: .5, envMapIntensity: 1.7 }));
    const scrPlane = (p, scr, w, h, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = add(p, new T.PlaneGeometry(w, h), scr.mat, x, y, z, rx, ry, rz); m.castShadow = false; m.userData.keep = !LITE; return m; };

    // ---------- Skelett: Becken -> Taille -> Hals/Kopf, Schultern, Hüften (Maße in Metern) ----------
    const LH = .45, ANK = .11, HS = .99;                      // Länge Ober-/Unterschenkel, Knöchelhöhe, Hüfthöhe im Stand
    const hips = new T.Group(); body.add(hips); bakeList.push(hips);
    const waist = joint(new T.Group()); waist.position.set(0, .09, 0); hips.add(waist); bakeList.push(waist);
    const neck = new T.Group(); neck.position.set(0, .60, -.01); waist.add(neck);
    const head = joint(new T.Group()); neck.add(head); bakeList.push(head);

    // ---------- Beine: Oberschenkel, Knie, Unterschenkel, Stiefel ----------
    const makeLeg = s => {
      const th = joint(new T.Group()); th.position.set(s * .115, -.04, 0); hips.add(th);
      add(th, limb(.115, .092, LH, 2.5), rp(suitM, 1, 1)); add(th, new T.SphereGeometry(.105, 12, 8), rubber);
      box(th, .15, .27, .05, rp(armorM, .6, .6), 0, -.2, -.098, .08); box(th, .035, .24, .13, rp(orangeM, .5, .5), s * .108, -.17, 0);
      box(th, .075, .17, .14, rp(oliveM, .6, .6), s * .122, -.25, .03); box(th, .08, .03, .145, trim, s * .122, -.17, .03);
      const sh = joint(new T.Group()); sh.position.y = -LH; th.add(sh);
      add(sh, limb(.092, .07, LH, 2), rp(suitM, 1, 1)); add(sh, new T.SphereGeometry(.088, 12, 8), rubber);
      box(sh, .15, .13, .07, rp(armorM, .5, .5), 0, .01, -.1, -.15); box(sh, .12, .025, .075, rp(orangeM, .5, .5), 0, .075, -.098, -.15);
      box(sh, .12, .3, .04, rp(armorM, .6, .6), 0, -.24, -.078); box(sh, .11, .22, .06, rp(armorM, .5, .5), 0, -.2, .085);
      const ft = joint(new T.Group()); ft.position.y = -LH; sh.add(ft);
      add(ft, limb(.082, .082, .07, 3, 12), rubber, 0, .04, 0); cyl(ft, .085, .092, .13, rp(armorM, .5, .5), 0, -.035, 0, 0, 0, 0, 12);
      box(ft, .16, .075, .22, rp(armorM, .5, .5), 0, -.065, -.05); const toe = add(ft, new T.SphereGeometry(.085, 12, 8), rp(orangeM, .5, .5), 0, -.07, -.165); toe.scale.set(.95, .62, 1.35);
      box(ft, .15, .1, .11, rp(armorM, .4, .4), 0, -.06, .075); box(ft, .18, .04, .4, rubber, 0, -.09, -.06); for (let i = 0; i < 5; i++) box(ft, .185, .014, .022, rubber, 0, -.113, -.2 + i * .085);
      box(ft, .17, .025, .09, hazard, 0, -.02, -.045); box(ft, .04, .03, .02, chrome, s * .05, -.02, -.1);
      bakeList.push(th, sh, ft); return { th, sh, ft, s };
    };
    const legL = makeLeg(-1), legR = makeLeg(1);

    // ---------- Becken, Gürtel, Holster ----------
    box(hips, .36, .17, .23, rp(suitM, 1, .5), 0, -.01, 0); [-1, 1].forEach(s => box(hips, .04, .14, .2, rp(armorM, .5, .5), s * .19, 0, 0)); box(hips, .16, .12, .05, rp(armorM, .5, .5), 0, -.06, -.12, .2);
    ring(hips, .19, .028, trim, 0, .07, 0).scale.set(1, .74, 1); box(hips, .075, .06, .03, chrome, 0, .07, -.145); lamp(hips, .0, .07, -.162, 0x40ff80, 0, .1, .008);
    box(hips, .1, .12, .07, rp(oliveM, .5, .5), -.13, .03, -.13, 0, .3); box(hips, .09, .1, .07, rp(orangeM, .4, .4), .1, .03, .15, 0, .2); box(hips, .09, .1, .07, rp(oliveM, .4, .4), -.1, .03, .15, 0, -.2);
    box(hips, .065, .21, .11, rubber, .205, -.03, -.01); cyl(hips, .026, .026, .17, rp(orangeM, .4, .4), .205, .06, -.01, 0, 0, 0, 10); cyl(hips, .013, .013, .06, chrome, .205, .18, -.01, 0, 0, 0, 8);   // Ersatzwerkzeug im Holster

    // ---------- Rumpf: Bauchwulst, Brustpanzer, Schulterjoch, Gurte, Anzeige ----------
    add(waist, limb(.16, .16, .22, 5, 16), rubber, 0, .22, 0).scale.set(1.05, 1, .72);
    cyl(waist, .215, .19, .4, rp(suitM, 1, 1), 0, .4, 0, 0, 0, 0, 20).scale.set(1.08, 1, .64);
    box(waist, .31, .27, .045, rp(armorM, .6, .6), 0, .41, -.145, .06); [-1, 1].forEach(s => box(waist, .04, .3, .2, rp(orangeM, .4, .4), s * .215, .4, .02));
    box(waist, .58, .09, .24, rp(armorM, .8, .5), 0, .55, 0); ring(waist, .12, .035, trim, 0, .605, 0).scale.set(1, .85, 1);
    [-1, 1].forEach(s => { box(waist, .045, .4, .02, rubber, s * .115, .4, -.172, .05, 0, -s * .12); box(waist, .05, .035, .025, chrome, s * .1, .3, -.175); });
    box(waist, .17, .1, .02, trim, -.04, .45, -.172); scrPlane(waist, chestScr, .15, .085, -.04, .45, -.1835, 0, PI, 0);
    lamp(waist, .095, .49, -.176, 0x40ff80, 0, .1, .008); lamp(waist, .095, .45, -.176, 0xffb030, 0, .1, .008); lamp(waist, .095, .41, -.176, 0xff3a2a, 1.4, .12, .008); lamp(waist, -.14, .39, -.176, 0x5ad6ff, 0, .1, .008);
    const tape = GC.decal(T, .11, .034, 256, (x, W, H) => { x.fillStyle = '#1b1c1f'; x.fillRect(0, 0, W, H); x.fillStyle = '#e8e2d0'; x.font = 'bold 66px Impact, "Arial Black", sans-serif'; x.textBaseline = 'middle'; x.fillText('FENNEK', 14, H * .5); x.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(0,0,0,${R() * .8})`; x.fillRect(R() * W, R() * H, 2 + R() * 10, 1 + R() * 3); } });
    tape.position.set(.085, .325, -.1685); tape.rotation.y = PI; waist.add(tape);
    [-1, 1].forEach(s => box(waist, .05, .05, .05, rp(armorM, .3, .3), s * .182, .5, -.115)); const chestL = node(waist, -.182, .53, -.135), chestR = node(waist, .182, .53, -.135), chestPort = node(waist, -.17, .3, -.125, 0, 0, PI / 2);

    // ---------- Schulterpanzer ----------
    [[-1, rp(orangeM, 1, 1), .135], [1, rp(armorM, 1, 1), .115]].forEach(([s, m, r]) => { const p = add(waist, new T.SphereGeometry(r, 14, 8, 0, PI * 2, 0, PI * .55), m, s * .31, .5, 0, 0, 0, -s * .35); p.scale.set(1.2, .85, 1.1); box(waist, .035, .035, .2, hazard, s * .33, .565, 0, 0, 0, -s * .35); });
    box(waist, .07, .05, .09, trim, .32, .595, -.05); headLamps.push(lamp(waist, .32, .595, -.098, 0xfff0d0, 0, .34, .016));
    const num = GC.decal(T, .075, .06, 128, (x, W, H) => { x.fillStyle = '#10100f'; x.fillRect(0, 0, W, H); x.fillStyle = '#ffb347'; x.font = 'bold 76px Impact, sans-serif'; x.textBaseline = 'middle'; x.fillText('07', 24, H / 2); });
    num.position.set(-.085, .325, -.1685); num.rotation.y = PI; waist.add(num);

    // ---------- Helm: Schale, Rahmen, Visier mit HUD, Lampen, Kamera, Anschlüsse, Antenne ----------
    ring(neck, .125, .035, armorM, 0, 0, 0).scale.set(1, .9, 1); for (let i = 0; i < 4; i++) { const a = i * PI / 2 + .6; box(neck, .03, .04, .03, chrome, Math.sin(a) * .13, .0, Math.cos(a) * .12); }
    const hs = new T.Group(); hs.position.set(0, .155, -.005); hs.scale.set(.205, .215, .23); head.add(hs);
    add(hs, new T.SphereGeometry(1, 24, 16), rp(helmM, 2, 1)); add(hs, new T.SphereGeometry(1.012, 24, 14, 3 * PI / 2 - 1.02, 2.04, .85, 1.35), rp(orangeM, 1, 1)); add(hs, new T.SphereGeometry(1.03, 24, 14, 3 * PI / 2 - .92, 1.84, .95, 1.0), visorM);
    box(head, .04, .035, .3, rp(armorM, .5, .5), 0, .37, -.01); box(head, .2, .05, .08, rp(armorM, .5, .5), 0, .045, -.19, .5);
    [-1, 1].forEach(s => { box(head, .07, .05, .08, trim, s * .105, .335, -.115, -.5); headLamps.push(lamp(head, s * .105, .325, -.158, 0xfff2d0, 0, .3, .016)); cyl(head, .05, .05, .035, rp(armorM, .5, .5), s * .215, .16, .03, 0, 0, PI / 2); cyl(head, .03, .03, .06, chrome, s * .17, .045, -.125, 0, 0, 0, 10); });
    cyl(head, .028, .028, .07, trim, .205, .21, -.07, 0, 0, PI / 2); cyl(head, .018, .018, .02, bas(0x0a1a30), .245, .21, -.07, 0, 0, PI / 2, 10);
    box(head, .17, .075, .06, rp(armorM, .5, .5), 0, .07, .2, -.25); for (let i = 0; i < 3; i++) box(head, .15, .008, .01, rubber, 0, .05 + i * .02, .23, -.25);
    const hpL = node(head, -.17, .015, -.125, 3.44), hpR = node(head, .17, .015, -.125, 3.44);
    const antH = antenna(head, -.11, .33, .11, .34, 3, .007, trim, 0xff4030);
    const crack = GC.decal(T, .27, .15, 256, (x, W, H) => { x.strokeStyle = 'rgba(235,245,250,.85)'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(W * .78, 0); x.lineTo(W * .62, H * .35); x.lineTo(W * .66, H * .55); x.lineTo(W * .5, H * .9); x.moveTo(W * .62, H * .35); x.lineTo(W * .4, H * .3); x.moveTo(W * .66, H * .55); x.lineTo(W * .9, H * .62); x.moveTo(W * .5, H * .9); x.lineTo(W * .58, H); x.stroke(); x.strokeStyle = 'rgba(235,245,250,.35)'; x.lineWidth = 1; x.beginPath(); x.moveTo(W * .62, H * .35); x.lineTo(W * .55, H * .12); x.moveTo(W * .4, H * .3); x.lineTo(W * .22, H * .4); x.stroke(); });
    crack.position.set(.02, .185, -.247); crack.rotation.y = PI; head.add(crack); dmg.push(crack);

    // ---------- Lebenserhaltung (Rucksack): Gehäuse, Tanks, Lüfter, Funkschüssel, Antenne, Anschlüsse, Hammer ----------
    const bp = new T.Group(); bp.position.set(0, .30, .265); waist.add(bp);
    box(bp, .44, .56, .2, rp(armorM, .9, .9), 0, 0, 0); box(bp, .4, .07, .21, rp(orangeM, .6, .3), 0, .315, 0); box(bp, .44, .05, .21, rubber, 0, -.305, 0);
    [-1, 1].forEach(s => { add(bp, pill(.075, .46, 14), s < 0 ? rp(orangeM, 1, 1) : rp(oliveM, 1, 1), s * .15, 0, .165); [-.13, .13].forEach(y => ring(bp, .078, .011, trim, s * .15, y, .165)); cyl(bp, .018, .018, .05, chrome, s * .15, .335, .165, 0, 0, 0, 8); add(bp, new T.SphereGeometry(.022, 8, 6), chrome, s * .15 + s * .03, .33, .165); });
    ring(bp, .068, .008, trim, 0, -.08, .104, 0); for (let i = 0; i < 3; i++) box(bp, .14, .008, .006, trim, 0, -.08 + (i - 1) * .032, .108);
    const fan = LITE ? new T.Group() : joint(new T.Group()); fan.position.set(0, -.08, .1); bp.add(fan); for (let i = 0; i < 5; i++) { const bl = new T.Group(); bl.rotation.z = i * 2 * PI / 5; fan.add(bl); box(bl, .02, .055, .005, rubber, 0, .032, 0, .5).userData.keep = !LITE; } cyl(fan, .012, .012, .012, chrome, 0, 0, 0, PI / 2, 0, 0, 8).userData.keep = !LITE;
    box(bp, .17, .06, .12, trim, -.06, .38, 0); cyl(bp, .015, .02, .08, trim, -.06, .42, 0, 0, 0, 0, 8);
    const dish = LITE ? new T.Group() : joint(new T.Group()); dish.position.set(-.06, .46, 0); bp.add(dish); add(dish, new T.SphereGeometry(.095, 14, 8, 0, PI * 2, 0, PI * .5), dishM, 0, 0, 0, 2.5).userData.keep = !LITE; cyl(dish, .006, .006, .1, chrome, 0, .048, -.036, -.6435, 0, 0, 6).userData.keep = !LITE;
    const antB = antenna(bp, .15, .35, .04, .85, 4, .009, trim, 0xff3a2a);
    const bpTopL = node(bp, -.12, .32, 0, -.35), bpTopR = node(bp, .12, .32, 0, -.35), bpLowR = node(bp, .225, -.17, 0, 0, 0, -PI / 2), bpLowL = node(bp, -.225, -.2, .04, 0, 0, PI / 2);
    [bpTopL, bpTopR].forEach(n => cyl(bp, .03, .03, .045, chrome, n.position.x, .325, 0, 0, 0, 0, 10)); cyl(bp, .026, .026, .05, chrome, .225, -.17, 0, 0, 0, PI / 2, 10); cyl(bp, .022, .022, .05, copper, -.225, -.2, .04, 0, 0, PI / 2, 8);
    cyl(bp, .011, .011, .46, rubber, -.245, 0, .09, 0, 0, .12, 8); box(bp, .13, .035, .035, chrome, -.265, .235, .09, 0, 0, .12); box(bp, .05, .018, .018, chrome, -.33, .232, .09, 0, 0, -.3); [.1, -.1].forEach(y => box(bp, .03, .035, .13, rubber, -.235, y, .09));
    [-1, 1].forEach(s => { add(bp, pill(.03, .12, 8), rp(orangeM, .3, .3), s * .1, -.375, .04); box(bp, .03, .035, .03, rubber, s * .1, -.32, .04); });
    const leakN = node(bp, -.15, .36, .165), ventN = node(bp, .08, -.08, .12);
    const warn = GC.decal(T, .13, .2, 128, (x, W, H) => { x.fillStyle = '#e8b020'; x.beginPath(); x.moveTo(W / 2, 8); x.lineTo(W - 8, H * .62); x.lineTo(8, H * .62); x.fill(); x.fillStyle = '#1a1a18'; x.fillRect(W / 2 - 4, H * .2, 8, H * .22); x.fillRect(W / 2 - 4, H * .46, 8, 8); x.fillStyle = '#d9d2bf'; x.font = 'bold 20px Impact, sans-serif'; x.fillText('KOJOTE', 14, H * .85); x.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(0,0,0,${R() * .85})`; x.fillRect(R() * W, R() * H, 2 + R() * 9, 1 + R() * 4); } });
    warn.position.set(0, .12, .1015); bp.add(warn);
    const soot = GC.decal(T, .5, .6, 128, (x, W, H) => { const g = x.createRadialGradient(W * .3, H * .2, 2, W * .3, H * .2, W * .7); g.addColorStop(0, 'rgba(6,5,4,.85)'); g.addColorStop(1, 'rgba(6,5,4,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H); }); soot.position.set(-.1, .1, .1025); bp.add(soot); dmg.push(soot);

    // ---------- Arme: Schulter, Oberarm, Ellbogen, Unterarm, Handschuh mit Fingern ----------
    const makeArm = s => {
      const sg = joint(new T.Group()); sg.position.set(s * .275, .47, 0); waist.add(sg); add(sg, new T.SphereGeometry(.072, 12, 8), rubber);
      add(sg, limb(.064, .052, .3, 2.5), rp(suitM, 1, 1)); add(sg, limb(.069, .069, .055), s > 0 ? rp(orangeM, .5, .5) : rp(armorM, .5, .5), 0, -.1, 0);
      const eb = joint(new T.Group()); eb.position.y = -.3; sg.add(eb); add(eb, new T.SphereGeometry(.056, 10, 8), rubber); box(eb, .085, .075, .06, rp(armorM, .4, .4), 0, 0, .055, .3);
      add(eb, limb(.052, .043, .25, 2), rp(suitM, 1, 1)); add(eb, limb(.05, .05, .04), rubber, 0, -.205, 0);
      const hd = joint(new T.Group()); hd.position.y = -.25; eb.add(hd);
      box(hd, .045, .09, .09, rp(gloveM, .6, .6), 0, -.05, 0); box(hd, .014, .07, .075, rp(armorM, .3, .3), s * .03, -.05, 0); box(hd, .05, .02, .09, rubber, 0, -.095, 0);
      const fin = [], fm = rp(gloveM, .25, .25);
      (LITE ? [] : [[-.033, .04, .034], [-.011, .044, .036], [.011, .04, .032], [.033, .032, .028]]).forEach(([z, l1, l2]) => { const f1 = joint(new T.Group()); f1.position.set(-s * .012, -.098, z); hd.add(f1); box(f1, .022, l1, .022, fm, 0, -l1 / 2, 0).userData.keep = true; const f2 = joint(new T.Group()); f2.position.y = -l1; f1.add(f2); box(f2, .02, l2, .02, fm, 0, -l2 / 2, 0).userData.keep = true; fin.push([f1, f2]); });
      const t1 = joint(new T.Group()), t2 = joint(new T.Group()); if (LITE) box(hd, .05, .05, .085, fm, -s * .01, -.125, 0); else { t1.position.set(-s * .014, -.03, -.05); t1.rotation.x = .55; hd.add(t1); box(t1, .024, .038, .024, fm, 0, -.019, 0).userData.keep = true; t2.position.y = -.038; t1.add(t2); box(t2, .022, .032, .022, fm, 0, -.016, 0).userData.keep = true; }
      const curl = c => { fin.forEach(([a, b], i) => { a.rotation.z = -s * (.2 + c * 1.3 + i * .03 * c); b.rotation.z = -s * (.15 + c * 1.35); }); t1.rotation.z = -s * (.15 + c * .7); t2.rotation.z = -s * (.1 + c * .6); }; curl(.25);
      bakeList.push(sg, eb, hd); return { sg, eb, hd, s, curl };
    };
    const armL = makeArm(-1), armR = makeArm(1);
    // Handgelenk-Computer am linken Unterarm (Anzeige zeigt nach vorn / oben, wenn der Arm angewinkelt wird)
    box(armL.eb, .1, .17, .045, rp(armorM, .5, .5), 0, -.13, -.056); box(armL.eb, .085, .13, .012, trim, 0, -.13, -.082); scrPlane(armL.eb, wristScr, .075, .11, 0, -.13, -.0885, 0, PI, 0);
    [-.03, 0, .03].forEach(x => box(armL.eb, .014, .014, .014, rp(orangeM, .2, .2), x, -.205, -.07)); const wristCable = node(armL.eb, .03, -.19, -.075, 0, 0, -PI / 2);
    // Schneidbrenner in der rechten Hand (Griff quer durch die Faust, Lauf nach vorn)
    const tg = new T.Group(); tg.position.set(-.012, -.055, 0); tg.rotation.x = -.38; armR.hd.add(tg);
    cyl(tg, .021, .021, .13, rubber, 0, 0, 0, PI / 2, 0, 0, 10); box(tg, .075, .085, .25, rp(orangeM, .5, .5), 0, .04, -.16); box(tg, .078, .022, .2, hazard, 0, .0, -.16);
    scrPlane(tg, toolScr, .056, .024, 0, .0835, -.14, -PI / 2); cyl(tg, .022, .015, .09, chrome, 0, .04, -.33, PI / 2, 0, 0, 10); box(tg, .06, .05, .1, trim, 0, -.045, -.12); box(tg, .015, .04, .02, chrome, 0, -.03, -.06); cyl(tg, .018, .018, .05, trim, 0, .04, .0, PI / 2, 0, 0, 8);
    const toolTip = node(tg, 0, .04, -.385), toolTail = node(tg, 0, .04, .03, PI / 2, 0, 0);

    // ---------- Schläuche und Kabel: Verlet-Seile mit eigener Rohrgeometrie, Kollision mit Rumpf/Kopf/Rucksack und Boden ----------
    const ribC = GC.cv(8, 32, (x, w, h) => { x.fillStyle = '#2a2c30'; x.fillRect(0, 0, w, h); x.fillStyle = '#70747c'; x.fillRect(0, 0, w, 12); });
    const rt = srgb => { const t = new T.CanvasTexture(ribC); t.wrapS = t.wrapT = T.RepeatWrapping; if (srgb) t.encoding = T.sRGBEncoding; return t; };
    const hoseM = new T.MeshStandardMaterial({ map: rt(true), bumpMap: rt(false), bumpScale: 2.5, metalness: .35, roughness: .55 }), cableM = new T.MeshStandardMaterial({ color: 0xc26a2c, metalness: .2, roughness: .7 }), wireM = new T.MeshStandardMaterial({ color: 0x1b1c20, metalness: .2, roughness: .8 });
    let GR = opts.gravity || 2.4, JV = 2.9;
    const _t = new V3(), _N = new V3(), _B = new V3(), _tmp = new V3(), _l = new V3();
    const S = { x: 0, z: 0, py: HS, vx: 0, vz: 0, vy: 0, ry: 0, om: 0, gy: 0, grounded: true, jumping: false, ant: 0, cr: 0, crv: 0, phi: 0, lean: 0, aF: 0, roll: 0, airW: 0, air: 0, pu0: 0, pu1: 0, pj: false, idle: 0, hv: 0 };
    // Kollisionskörper relativ zum Arbeiter (x rechts, y über Stand-Boden, z hinten), damit Schläuche nicht durch den Körper fallen
    const BOXES = [[0, 1.38, .265, .235, .31, .125], [0, 1.4, -.015, .25, .25, .155], [0, 1.0, 0, .22, .14, .17], [.17, .72, 0, .13, .26, .13]];
    const ropeCollide = (p, rad) => { const sy = Math.sin(S.ry), cy = Math.cos(S.ry), dx = p.x - S.x, dz = p.z - S.z, ly = p.y - (S.py - HS); let lx = dx * cy - dz * sy, lz = dx * sy + dz * cy, mx = 0, mz = 0, my = 0;
      for (const [cx, cyy, cz, hx, hy, hz] of BOXES) { const ax = lx - cx, ay = ly - cyy, az = lz - cz, px = hx + rad - Math.abs(ax), py = hy + rad - Math.abs(ay), pz = hz + rad - Math.abs(az); if (px > 0 && py > 0 && pz > 0) { if (px <= py && px <= pz) mx += Math.sign(ax || 1) * px; else if (pz <= py) mz += Math.sign(az || 1) * pz; else my += Math.sign(ay || 1) * py; } }
      const ax = lx, ay = ly - 1.835, az = lz + .005, d = Math.hypot(ax, ay, az), R0 = .225 + rad; if (d < R0 && d > 1e-4) { const k = (R0 - d) / d; mx += ax * k; my += ay * k; mz += az * k; }
      p.x += mx * cy + mz * sy; p.z += -mx * sy + mz * cy; p.y += my; };
    const makeRope = (n, rad, mat, total, o = {}) => {
      const rs = 8, seg = total / (n - 1), P = Array.from({ length: n }, () => new V3()), Pq = P.map(() => new V3()), pos = new Float32Array(n * rs * 3), nor = new Float32Array(n * rs * 3), uv = new Float32Array(n * rs * 2), idx = [];
      for (let i = 0; i < n - 1; i++) for (let k = 0; k < rs; k++) { const a = i * rs + k, b = i * rs + (k + 1) % rs, c = a + rs, d = b + rs; idx.push(a, b, c, b, d, c); }
      for (let i = 0; i < n; i++) for (let k = 0; k <= rs - 1; k++) { uv[(i * rs + k) * 2] = k / rs; uv[(i * rs + k) * 2 + 1] = i * seg / (rad * 5); }
      const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.BufferAttribute(nor, 3)); geo.setAttribute('uv', new T.BufferAttribute(uv, 2)); geo.setIndex(idx);
      const mesh = new T.Mesh(geo, mat); mesh.frustumCulled = false; mesh.castShadow = true; root.add(mesh);
      return { mesh, P, free: !!o.free,
        shift(M) { for (let i = 0; i < n; i++) { P[i].applyMatrix4(M); Pq[i].applyMatrix4(M); } },
        reset(a, b) { for (let i = 0; i < n; i++) { P[i].copy(a).lerp(b || a, i / (n - 1)); P[i].y -= Math.sin(PI * i / (n - 1)) * seg * n * .12; Pq[i].copy(P[i]); } },
        step(dt, a, da, b, db, gy) { const sub = 2, h = dt / sub, g = Math.min(GR, 4) * (o.sag ?? 1), stf = o.stiff ?? .05;
          for (let s = 0; s < sub; s++) {
            for (let i = 1; i < n; i++) { if (b && i === n - 1) continue; const p = P[i], q = Pq[i]; _tmp.copy(p).sub(q).multiplyScalar(.985); q.copy(p); p.add(_tmp); p.y -= g * h * h; }
            P[0].copy(a); if (b) P[n - 1].copy(b);
            for (let it = 0; it < 6; it++) {
              for (let i = 0; i < n - 1; i++) { const p = P[i], q = P[i + 1]; _tmp.copy(q).sub(p); const l = _tmp.length() || 1e-6, df = (l - seg) / l, wa = i === 0 ? 0 : 1, wb = (b && i + 1 === n - 1) ? 0 : 1, sm2 = wa + wb; if (!sm2) continue; p.addScaledVector(_tmp, df * wa / sm2); q.addScaledVector(_tmp, -df * wb / sm2); }
              for (let i = 1; i < n - 1; i++) { if (b && i === n - 1) continue; _tmp.copy(P[i - 1]).add(P[i + 1]).multiplyScalar(.5); P[i].lerp(_tmp, stf); }
              if (da) P[1].lerp(_l.copy(a).addScaledVector(da, seg), .5); if (db && b) P[n - 2].lerp(_l.copy(b).addScaledVector(db, seg), .5);
              for (let i = 1; i < n; i++) { if (b && i === n - 1) continue; ropeCollide(P[i], rad + .005); if (P[i].y < gy + .03) P[i].y = gy + .03; } } } },
        build() { for (let i = 0; i < n; i++) { _t.copy(P[Math.min(i + 1, n - 1)]).sub(P[Math.max(i - 1, 0)]).normalize();
            if (i === 0) { _N.set(0, 1, 0).cross(_t); if (_N.lengthSq() < .05) _N.set(1, 0, 0).cross(_t); _N.normalize(); } else { _N.addScaledVector(_t, -_N.dot(_t)).normalize(); } _B.copy(_t).cross(_N);
            for (let k = 0; k < rs; k++) { const a = k / rs * 2 * PI, cx = Math.cos(a), sx = Math.sin(a), j = (i * rs + k) * 3, nx = _N.x * cx + _B.x * sx, ny = _N.y * cx + _B.y * sx, nz = _N.z * cx + _B.z * sx; nor[j] = nx; nor[j + 1] = ny; nor[j + 2] = nz; pos[j] = P[i].x + nx * rad; pos[j + 1] = P[i].y + ny * rad; pos[j + 2] = P[i].z + nz * rad; } }
          geo.attributes.position.needsUpdate = geo.attributes.normal.needsUpdate = true; } };
    };
    const ropes = LITE ? [] : [
      { r: makeRope(8, .021, hoseM, .34, { stiff: .06 }), a: hpL, b: chestL },
      { r: makeRope(8, .021, hoseM, .34, { stiff: .06 }), a: hpR, b: chestR },
      { r: makeRope(11, .013, cableM, 1.15, { stiff: .02, sag: 1.2 }), a: bpLowR, b: toolTail },
      { r: makeRope(8, .012, wireM, .55, { free: true, stiff: .006, sag: 1.4 }), a: bpLowL, b: null },
      { r: makeRope(8, .011, wireM, .9, { stiff: .015, sag: 1.2 }), a: chestPort, b: wristCable }
    ];
    const brokenRope = ropes[3] ? ropes[3].r : null; if (brokenRope) dmg.push(brokenRope.mesh);
    let needReset = true; const _a = new V3(), _b = new V3(), _da = new V3(), _db = new V3();
    const eMo = new T.Matrix4(), eMn = new T.Matrix4(), eMr = new T.Matrix4(), eInv = new T.Matrix4(); let hasMo = false;
    const dirOf = (n, out) => { out.set(0, 1, 0).transformDirection(n.matrixWorld); if (EMB) out.transformDirection(eInv); return out; };

    // ---------- Partikel (Staub, Dampf, Funken), Fußspuren, Lichter ----------
    const nop = () => ({ points: new T.Object3D(), emit() {}, update() {} }); const dust = EMB ? nop() : GC.particles(T, 380), steam = EMB ? nop() : GC.particles(T, 120), sparks = EMB ? nop() : GC.particles(T, 220, { add: true });
    dust.points.renderOrder = 1; steam.points.renderOrder = 1; sparks.points.renderOrder = 4; root.add(dust.points, steam.points, sparks.points);
    const dC0 = new T.Color(0xcaa272), dC1 = new T.Color(0xa88458), _v = new V3(), _w = new V3();
    const puff = (x, y, z, n, spd, up, size) => { for (let i = 0; i < n; i++) { const a = rr(0, 2 * PI), sp = rr(.3, 1) * spd; dust.emit(_v.set(x + Math.cos(a) * .12, y + .04, z + Math.sin(a) * .12), _w.set(Math.cos(a) * sp, rr(.2, 1) * up, Math.sin(a) * sp), rr(1.3, 2.6), size * rr(.6, 1.25), dC0, dC1); } };
    const FP = 90, fpGeo = new T.PlaneGeometry(.13, .32); fpGeo.rotateX(-PI / 2);
    const fpTex = new T.CanvasTexture(GC.cv(64, 128, (x, w, h) => { x.fillStyle = '#fff'; x.beginPath(); x.ellipse(w / 2, h * .34, w * .42, h * .32, 0, 0, 7); x.fill(); x.beginPath(); x.ellipse(w / 2, h * .82, w * .32, h * .13, 0, 0, 7); x.fill(); x.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 7; i++) x.fillRect(6, 12 + i * 15, w - 12, 3); }));
    const fps = EMB ? Object.assign(new T.Object3D(), { setMatrixAt() {}, instanceMatrix: {} }) : new T.InstancedMesh(fpGeo, new T.MeshStandardMaterial({ color: 0x4a3420, map: fpTex, transparent: true, opacity: .62, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, roughness: 1 }), FP);
    fps.count = 0; fps.frustumCulled = false; fps.receiveShadow = true; root.add(fps);
    let fpN = 0; const fm = new T.Matrix4(), fq = new Q(), fq2 = new Q(), fs = new V3(1, 1, 1), fpv = new V3(), fn = new V3(), UP = new V3(0, 1, 0);
    const print = (x, z, ry) => { const e = .2; fn.set(hAt(x - e, z) - hAt(x + e, z), 2 * e, hAt(x, z - e) - hAt(x, z + e)).normalize(); fq.setFromUnitVectors(UP, fn); fq.multiply(fq2.setFromAxisAngle(UP, ry)); fpv.set(x, hAt(x, z) + .02, z); fm.compose(fpv, fq, fs); fps.setMatrixAt(fpN % FP, fm); fpN++; fps.count = Math.min(fpN, FP); fps.instanceMatrix.needsUpdate = true; };
    const spot = EMB ? new T.Object3D() : new T.SpotLight(0xfff0d8, 0, 44, .5, .7, 1.4); spot.position.set(0, .17, -.2); head.add(spot); const spT = new T.Object3D(); spT.position.set(0, .0, -6); head.add(spT); spot.target = spT;
    const toolLight = EMB ? new T.Object3D() : new T.PointLight(0x9fe8ff, 0, 9, 1.8); toolTip.add(toolLight);
    const toolGlow = GC.sprite(T, 0xbfeaff, .5, 0); toolTip.add(toolGlow); const jet = new T.Mesh(new T.ConeGeometry(.02, .3, 10), GC.addMat(T, 0xbfeaff, .0)); jet.rotation.x = -PI / 2; jet.position.z = -.15; toolTip.add(jet);
    const brokenGlow = GC.sprite(T, 0xffd890, .35, 0);

    // ---------- Zustand, Hilfswerte ----------
    let time = 0, night = 0, power = 1, damage = 1, lampOn = 1, toolOn = 0, scanOn = 0, toolT = 0, scanT = 0, scrT = 0, fanA = 0, fanW = 0;
    S.gy = hAt(0, 0); S.py = S.gy + HS;
    const focus = new V3(0, S.gy + 1, 0), antSt = [{ x: 0, vx: 0, z: 0, vz: 0 }, { x: 0, vx: 0, z: 0, vz: 0 }];
    const spr = (st, ux, uz, w, z, dt) => { st.vx += (-w * w * st.x - 2 * z * w * st.vx + ux) * dt; st.x = cl(st.x + st.vx * dt, -.9, .9); st.vz += (-w * w * st.z - 2 * z * w * st.vz + uz) * dt; st.z = cl(st.z + st.vz * dt, -.9, .9); };
    const _d = new V3(), _k = new V3(), _dir = new V3(), _pole = new V3(), _v1 = new V3(), _v2 = new V3(), DOWN = new V3(0, -1, 0), AX = new V3(1, 0, 0), _q1 = new Q(), _q2 = new Q(), _qf = new Q(), _qx = new Q(), _qh = new Q();
    // Zwei-Knochen-Beinsteuerung (Knie knickt nach vorn); Ziel im Hüftraum
    const ik = (lg, tgt, pit, rf) => { const p0 = lg.th.position; _d.copy(tgt).sub(p0); const L = _d.length() || 1e-4, Lc = cl(L, .3, 2 * LH * rf); _d.multiplyScalar(Lc / L); _dir.copy(_d).divideScalar(Lc);
      const a = Lc / 2, h = Math.sqrt(Math.max(0, LH * LH - a * a)); _pole.set(0, 0, -1); _pole.addScaledVector(_dir, -_pole.dot(_dir)); if (_pole.lengthSq() < 1e-4) _pole.set(0, 0, -1); _pole.normalize();
      _k.copy(p0).addScaledVector(_dir, a).addScaledVector(_pole, h); _v1.copy(_k).sub(p0).normalize(); _v2.copy(p0).add(_d).sub(_k).normalize();
      _q1.setFromUnitVectors(DOWN, _v1); lg.th.quaternion.copy(_q1); _q2.setFromUnitVectors(DOWN, _v2); lg.sh.quaternion.copy(_q1).invert().multiply(_q2);
      _qh.copy(hips.quaternion).invert(); _qx.setFromAxisAngle(AX, pit); _qf.copy(_qh).multiply(_qx); lg.ft.quaternion.copy(_q2).invert().multiply(_qf); };
    const apply = () => { const dm = damage > .5, k = .07 + .93 * night; glows.forEach(g => { g.o.material.opacity = g.b * k; }); headLamps.forEach(m => { m.visible = !!lampOn; m.userData.glow.visible = !!lampOn; });
      dmg.forEach(d => d.visible = dm); const bright = .78 + .22 * night; [chestScr, wristScr, toolScr].forEach(s => s.mat.color.setScalar(bright)); visorM.emissiveIntensity = (.35 + .9 * night) * (power ? 1 : .15);
      const mix = night > .5 ? 1 : night > .1 ? .5 : 0; dC0.set(mix === 1 ? 0x3a3a4a : mix ? 0x9a6a4a : 0xcaa272); dC1.set(mix === 1 ? 0x22222e : mix ? 0x6a4a36 : 0xa88458); };
    const onLand = (imp, x, z) => { if (imp > 1.1) { puff(x, S.gy, z, Math.min(46, 8 + imp * 9 | 0), 1 + imp * .55, .5 + imp * .2, .55); print(x - .12 * Math.cos(S.ry), z + .12 * Math.sin(S.ry), S.ry); print(x + .12 * Math.cos(S.ry), z - .12 * Math.sin(S.ry), S.ry); } };
    const qa = new V3(), tipW = new V3(), tipD = new V3(), lkW = new V3(), pvx = { x: 0, z: 0, y: 0 }, fw = [{ x: 0, z: 0 }, { x: 0, z: 0 }], zfs = [0, 0], tAir = new V3(), tG = new V3();

    root.add(brokenGlow);
    // ---------- Hauptschleife: Physik -> Pose -> Schläuche -> Effekte ----------
    const SPD = 2;   // Geschwindigkeitsfaktor (Gehen 3 m/s, Rennen 7,6 m/s)
    const update = (dt0, t, I = inp) => {
      const dt = Math.min(dt0, .05); time += dt;
      const mag = I.mag || 0, dxI = I.dx || 0, dzI = I.dz || 0, vT = I.vT !== undefined ? I.vT : SPD * (mag < .02 ? 0 : mag <= .5 ? mag / .5 * 1.5 : 1.5 + (mag - .5) / .5 * 2.3);
      pvx.x = S.vx; pvx.z = S.vz; pvx.y = S.vy;
      // Richtung: der Arbeiter dreht sich in Laufrichtung (in der Luft kaum noch)
      let diff = 0; if (vT > 0) diff = wrapA(Math.atan2(-dxI, -dzI) - S.ry);
      const hv0 = Math.hypot(S.vx, S.vz), rate = S.grounded ? lerp(10, 4.5, cl(hv0 / 7.6, 0, 1)) : 1.4, dstep = vT > 0 ? cl(diff, -rate * dt, rate * dt) : 0;
      S.ry = wrapA(S.ry + dstep); S.om += (dstep / dt - S.om) * Math.min(1, dt * 10);
      // Beschleunigung: Haftung auf Sand wächst mit der Schwerkraft, in der Luft bleibt der Schwung erhalten
      const al = S.grounded ? cl(Math.cos(diff) * 1.6, 0, 1) : 1, tx = dxI * vT * al, tz = dzI * vT * al, want = Math.hypot(tx, tz), aMax = S.grounded ? (want > hv0 ? 3.2 + .35 * GR : 4 + .45 * GR) * 1.6 : .9;
      const ex = tx - S.vx, ez = tz - S.vz, el = Math.hypot(ex, ez), st = Math.min(el, aMax * dt); if (el > 1e-5) { S.vx += ex / el * st; S.vz += ez / el * st; }
      let hv = Math.hypot(S.vx, S.vz); if (S.grounded && vT === 0 && hv < .03) { S.vx = S.vz = 0; hv = 0; }
      // Bewegung mit Hindernissen: Felsen, Landebeine, Rampe (Stufenhöhe 0,4 m, sonst seitlich entlanggleiten)
      if (hv > 0) { const nx = S.x + S.vx * dt, nz = S.z + S.vz * dt, ux = S.vx / hv, uz = S.vz / hv, feet = S.grounded ? S.gy : S.py - .95, bl = (x, z) => hAt(x, z) - feet > .4 || hAt(x + ux * .22, z + uz * .22) - feet > .4;
        if (!bl(nx, nz)) { S.x = nx; S.z = nz; } else if (!bl(nx, S.z)) { S.x = nx; S.vz *= .4; } else if (!bl(S.x, nz)) { S.z = nz; S.vx *= .4; } else { S.vx *= .2; S.vz *= .2; }
        const r0 = Math.hypot(S.x, S.z); if (r0 > 420) { S.x *= 420 / r0; S.z *= 420 / r0; S.vx *= .5; S.vz *= .5; } hv = Math.hypot(S.vx, S.vz); }
      // Gangart aus der Froude-Zahl: langsam gehen, schneller in weiten Mondsprüngen (Flugzeit aus der Schwerkraft)
      const Fr = hv * hv / (GR * .95), b = sm(.5, 1.4, Fr), bp = cl(b * 5, 0, 1), vyp = Math.min(b * (.45 + .26 * Math.max(0, hv - 1)), .38 * GR), tf = 2 * vyp / GR, ts = lerp(.46, .3, b);
      const ve = Math.max(hv, Math.min(.8, Math.abs(S.om) * .2)), Tw = (.9 + .3 * ve) / Math.max(.3, ve) * Math.pow(9.81 / GR, .25), Tc = lerp(Tw, 2 * (ts + tf), bp), sf = lerp(.6, ts / Tc, bp), A = cl(ve * Tc * sf / 2, 0, .95);
      if (!S.jumping && ve > .08) S.phi = fr(S.phi + dt / Tc);
      let u0 = fr(S.phi), u1 = fr(S.phi + .5), launch = false; const stepEv = [false, false];
      if (S.grounded) { if ((S.pu0 < sf && u0 >= sf) || (S.pu1 < sf && u1 >= sf)) launch = true; if (u0 < S.pu0) stepEv[0] = true; if (u1 < S.pu1) stepEv[1] = true; }
      S.pu0 = u0; S.pu1 = u1;
      // Senkrecht: Federbein (Landung/Absprung), Sprung mit Anlauf, freier Flug unter Schwerkraft
      const gT = hAt(S.x, S.z); let landStep = -1;
      S.crv += (-225 * S.cr - 13.5 * S.crv) * dt; S.cr = cl(S.cr + S.crv * dt, -.04, .3);
      const jp = !!I.jump && !S.pj; S.pj = !!I.jump;
      if (jp && S.grounded && S.ant <= 0 && !S.jumping) { S.ant = .1; S.crv += 1.6; }
      if (S.ant > 0) { S.ant -= dt; if (S.ant <= 0 && S.grounded) { S.vy = JV + hv * .05; S.grounded = false; S.jumping = true; puff(S.x, S.gy, S.z, 7, 1, .5, .4); } }
      if (S.grounded && !S.jumping && S.ant <= 0 && launch && b > .03 && vyp > .15) { S.vy = vyp; S.grounded = false; }
      if (S.jumping && !I.jump && S.vy > 1) S.vy -= S.vy * 7 * dt;
      if (S.grounded) {
        if (S.gy - gT > .35) { S.grounded = false; S.vy = 0; }
        else { S.gy += (gT - S.gy) * Math.min(1, dt * 16); const sp0 = u0 < sf ? u0 / sf : u1 < sf ? u1 / sf : .5, k = cl(ve / .5, 0, 1), bobW = (.5 - .5 * Math.cos(4 * PI * S.phi)) * lerp(.025, .04, cl(ve / 2, 0, 1)) * k, bobL = Math.sin(PI * sp0) * .09 * k;
          S.py = S.gy + HS - lerp(bobW, bobL, bp) - S.cr + Math.sin(time * 1.7) * .004; } }
      if (!S.grounded) { S.vy -= GR * dt; S.py += S.vy * dt; S.gy = gT; const ce = world ? world.ceilAt(S.x, S.z) : Infinity; if (S.py + .98 > ce) { S.py = ce - .98; if (S.vy > 0) S.vy = 0; }
        if (S.vy <= 0 && S.py <= gT + HS - .02) { const imp = -S.vy; S.py = gT + HS - .02; S.grounded = true; S.gy = gT; S.vy = 0; S.crv += imp * 1.5; S.cr = 0; S.jumping = false; S.phi = fr(Math.round(S.phi * 2) / 2); u0 = fr(S.phi); u1 = fr(S.phi + .5); S.pu0 = u0; S.pu1 = u1; onLand(imp, S.x, S.z); if (imp <= 1.1 && bp > .5) landStep = u0 < .25 ? 0 : 1; } }
      // Lage: Vorlehnen bei Beschleunigung, Schräglage in Kurven
      S.aF += (((S.vx - pvx.x) * -Math.sin(S.ry) + (S.vz - pvx.z) * -Math.cos(S.ry)) / dt - S.aF) * Math.min(1, dt * 8);
      const vf = -S.vx * Math.sin(S.ry) - S.vz * Math.cos(S.ry); S.lean += (cl(.022 * vf + .02 * S.aF, -.18, .5) - S.lean) * Math.min(1, dt * 7); S.roll += (cl(S.om * hv * .018, -.25, .25) - S.roll) * Math.min(1, dt * 6);
      S.airW += ((S.jumping && !S.grounded ? 1 : 0) - S.airW) * Math.min(1, dt * 9); S.air += ((S.grounded ? 0 : 1) - S.air) * Math.min(1, dt * 8);
      const sp = cl(ve / 2.2, 0, 1), zfOf = u => u < sf ? A * (1 - 2 * u / sf) : -A + 2 * A * sm(0, 1, (u - sf) / (1 - sf)), zN = A > .02 ? zfOf(u0) / A : 0, aw = S.airW;
      S.idle = hv < .05 && !toolOn && !scanOn && S.grounded ? S.idle + dt : 0;
      const scanE = scanOn || (S.idle > 6 && S.idle % 16 > 6 && S.idle % 16 < 10.5) ? 1 : 0; scanT += (scanE - scanT) * Math.min(1, dt * 3.5); toolT += (toolOn - toolT) * Math.min(1, dt * 4);
      // Pose: Körper, Becken, Taille
      const sinR = Math.sin(S.ry), cosR = Math.cos(S.ry), breath = Math.sin(time * 1.7) * .012;
      body.position.set(S.x, 0, S.z); body.rotation.y = S.ry; hips.position.y = S.py; hips.rotation.set(-S.lean - .1 * aw, -.07 * sp * zN, S.roll);
      waist.rotation.set(.5 * S.lean - .03 + breath, .17 * sp * zN, -.6 * S.roll);
      body.updateMatrix(); body.matrixWorld.copy(body.matrix); hips.updateMatrix(); hips.matrixWorld.multiplyMatrices(body.matrixWorld, hips.matrix);
      // Beine: Fußbahn (Stand / Schwung) auf dem Gelände, in der Luft eingezogen
      const LF = lerp(.06, .2, b) * cl(ve / .6, 0, 1), rf = lerp(.995, .93, S.air);
      [legL, legR].forEach((lg, i) => { const s = lg.s, u = i ? u1 : u0; let zf, lift = 0, pit;
        if (u < sf) { const q = u / sf; zf = A * (1 - 2 * q); pit = .3 * (1 - sm(0, .35, q)) - .5 * sm(.65, 1, q); } else { const q = (u - sf) / (1 - sf); zf = -A + 2 * A * sm(0, 1, q); lift = LF * Math.pow(Math.sin(PI * q), .9); pit = lerp(-.5, .3, sm(0, .8, q)); }
        const lx = s * (.125 + (u >= sf ? .02 * Math.sin(PI * (u - sf) / (1 - sf)) : 0)), lz = -zf, wx = S.x + lx * cosR + lz * sinR, wz = S.z - lx * sinR + lz * cosR;
        fw[i].x = wx; fw[i].z = wz; zfs[i] = zf; tG.set(wx, hAt(wx, wz) + ANK - .012 + lift, wz); hips.worldToLocal(tG);
        const fz = s * (.12 + .03 * hv) * (1 + .3 * Math.sin(time * 3 + i * 3)); tAir.set(s * .14, -(.78 + cl(-S.vy * .08, 0, .12)), -fz * .9 + .02); tG.lerp(tAir, aw); ik(lg, tG, lerp(pit, -.15 + s * .1 * Math.sin(time * 3), aw), rf); });
      // Arme: Pendeln gegen die Beine, Balance in der Luft, Display lesen (links), Brenner halten (rechts)
      const amp = .35 * sp + .5 * b, sc = scanT * (1 - aw), tl = toolT * (1 - aw * .5);
      let sw = lerp(-zN * amp + .06, .95 + .25 * Math.sin(time * 3.1), aw), ab = lerp(.07 + .25 * b, .65 + .1 * Math.sin(time * 2.3), aw), el2 = lerp(.22 + .75 * b + .1 * sp, .45, aw);
      sw = lerp(sw, .7, sc); ab = lerp(ab, -.25, sc); el2 = lerp(el2, 1.45, sc); armL.sg.rotation.set(sw, 0, -ab); armL.eb.rotation.set(el2, 0, 0); armL.hd.rotation.x = -(sw + el2) * .3; armL.curl(lerp(.25, .08, sc));
      let sw2 = lerp(.22 + zN * amp * .35, .95 + .25 * Math.sin(time * 2.7 + 1), aw), ab2 = lerp(.07 + .15 * b, .65 + .1 * Math.sin(time * 2.1), aw), el3 = lerp(.5 + .45 * b, .45, aw);
      sw2 = lerp(sw2, .98, tl); el3 = lerp(el3, .35, tl); ab2 = lerp(ab2, .1, tl); armR.sg.rotation.set(sw2, 0, ab2); armR.eb.rotation.set(el3, 0, 0); armR.hd.rotation.x = -(sw2 + el3) * .8; armR.curl(.78);
      // Kopf: bleibt ruhig, schaut sich um, folgt Kurven, blickt aufs Display
      const idleF = cl(S.idle / 2, 0, 1), look = Math.sin(time * .45) * .5 * Math.sin(time * .19 + 1) * idleF;
      head.rotation.set(.45 * S.lean - .38 * sc + .1 * Math.sin(time * .3) * idleF - .08 * aw, cl(.3 * sc + look * (1 - sc) - S.om * .08, -.9, .9), 0);
      // Antennen schwingen als gedämpfte Federn (Beschleunigung im Körperraum)
      const ax = (S.vx - pvx.x) / dt, az = (S.vz - pvx.z) / dt, lax = ax * cosR - az * sinR, laz = ax * sinR + az * cosR, vib = sp * Math.sin(S.phi * 4 * PI) * 3;
      spr(antSt[0], -laz * 9 + vib, lax * 9, 13, .14, dt); spr(antSt[1], -laz * 5 + vib * .6, lax * 5, 8.5, .1, dt); antH.bend(antSt[0].x, antSt[0].z); antB.bend(antSt[1].x, antSt[1].z);
      fanW += ((power ? 30 : 0) - fanW) * Math.min(1, dt * 1.5); fanA += fanW * dt; fan.rotation.z = fanA; if (power) dish.rotation.y = time * .9;
      blinks.forEach(bk => { const on = Math.sin(time * bk.sp * 3 + bk.ph) > .3; bk.s.visible = on; bk.m.visible = on; });
      body.updateMatrixWorld(true);
      // Fußspuren und Staub
      const plant = i => { const x = fw[i].x, z = fw[i].z, big = bp > .5 ? 1 : 0; print(x, z, S.ry); puff(x, hAt(x, z), z, 2 + big * 6 + (hv * 1.2 | 0), .5 + hv * .25, .35 + hv * .1, .3 + big * .15); };
      if (landStep >= 0) plant(landStep); else if (S.grounded) { if (stepEv[0]) plant(0); if (stepEv[1]) plant(1); }
      if (S.grounded && hv > 1.2) { const acc = Math.hypot(S.vx - pvx.x, S.vz - pvx.z) / dt; if (acc > 5 && R() < dt * 40) puff(S.x, S.gy, S.z, 2, .8, .4, .4); }
      // Schläuche und Kabel
      if (EMB && ropes.length) { eMn.copy(root.matrixWorld); eInv.copy(eMn).invert(); if (hasMo) { eMr.copy(eInv).multiply(eMo); ropes.forEach(({ r }) => r.shift(eMr)); } eMo.copy(eMn); hasMo = true; }
      const loc = v => EMB ? root.worldToLocal(v) : v;
      if (needReset) { ropes.forEach(({ r, a, b: bb }) => { loc(a.getWorldPosition(_a)); if (bb) loc(bb.getWorldPosition(_b)); r.reset(_a, bb ? _b : _a); }); needReset = false; }
      ropes.forEach(({ r, a, b: bb }) => { loc(a.getWorldPosition(_a)); dirOf(a, _da); if (bb) { loc(bb.getWorldPosition(_b)); dirOf(bb, _db); } r.step(dt, _a, _da, bb ? _b : null, bb ? _db : null, S.gy); r.build(); });
      // Schneidbrenner: Lichtbogen, Funken, Licht
      const act = toolT > .7; toolTip.getWorldPosition(tipW); tipD.set(0, 0, -1).transformDirection(toolTip.matrixWorld); const fl = .75 + .25 * Math.sin(time * 61) * Math.sin(time * 37 + 1);
      jet.material.opacity = act ? .55 * fl : 0; toolGlow.material.opacity = act ? .9 * fl : 0; toolGlow.scale.setScalar(.35 + .25 * fl); toolLight.intensity = act ? (2.2 + night * 6) * fl : 0; toolLight.position.set(0, .05, -.1);
      if (act) for (let i = 0, n = R() < dt * 120 ? 2 : 0; i < n; i++) sparks.emit(tipW, _w.set(tipD.x * 2.5 + rr(-2, 2), tipD.y * 2.5 + rr(.5, 3), tipD.z * 2.5 + rr(-2, 2)), rr(.3, .9), .06, 0xfff4c8, 0xff7a20);
      // Leitungsbruch: Funken am losen Ende, Dampfleck am Rucksack
      if (damage > .5 && brokenRope) { const tip = brokenRope.P[brokenRope.P.length - 1]; brokenGlow.position.copy(tip); brokenGlow.material.opacity = Math.max(0, brokenGlow.material.opacity - dt * 6);
        if (R() < dt * 2.4) { brokenGlow.material.opacity = .9; for (let i = 0; i < 7; i++) sparks.emit(tip, _w.set(rr(-1.6, 1.6), rr(.5, 2.5), rr(-1.6, 1.6)), rr(.3, .8), .05, 0xffe9a0, 0xff6a10); }
        if (R() < dt * 9) { leakN.getWorldPosition(lkW); steam.emit(lkW, _w.set(rr(-.2, .2), rr(.7, 1.3), rr(-.2, .2)).addScaledVector(tipD.set(sinR, 0, cosR), .4), rr(1.2, 2.2), rr(.15, .3), 0xe4e8ec, 0xaab0b6); } } else brokenGlow.material.opacity = 0;
      if (power && R() < dt * 3) { ventN.getWorldPosition(lkW); steam.emit(lkW, _w.set(rr(-.15, .15), rr(.2, .5), rr(.2, .5)), rr(.9, 1.6), rr(.1, .2), 0xe4e8ec, 0xaab0b6); }
      dust.update(dt, { drag: 1.2, grav: GR * .6, grow: 2, alpha: .55 }); steam.update(dt, { drag: .7, buoy: .8, grow: 2.4, alpha: .5 }); sparks.update(dt, { drag: .2, grav: GR, grow: -.3 });
      // Licht (Helmlampen flackern, wenn beschädigt), Anzeigen (10 Bilder pro Sekunde)
      const flick = damage > .5 && Math.sin(time * 23) * Math.sin(time * 7.3) > .86 ? 0 : 1; spot.intensity = lampOn * flick * (.6 + night * 22); headLamps.forEach(m => { m.visible = !!lampOn && flick > 0; m.userData.glow.visible = m.visible; });
      scrT -= dt; if (scrT <= 0 && !EMB) { scrT = .1; const pw = power > 0, bad = damage > .5; chestScr.upd(time, pw, bad); wristScr.upd(time, pw, bad, S.ry, S.x, S.z); toolScr.upd(time, pw, act); }
      focus.set(S.x, S.gy + 1, S.z);
    };

    // ---------- Schnittstelle (wie beim Raumschiff) ----------
    bakeList.forEach(LITE ? bakeVC : bake);
    if (LITE) root.traverse(o => { if (o.isMesh && o.material.transparent && o.geometry.type === 'PlaneGeometry') o.visible = false; });   // Decals im Lite-Modus aus
    const api = { root, radius: 1, height: 1.98, controls: true, focus, state: S, get heading() { return S.ry; }, update,
      // Spielmodus: E = { speed (Modell-Meter/s), work } – der Arbeiter läuft im lokalen System geradeaus, das Spiel setzt und dreht die Gruppe
      pose(dt, t, E) { update(dt, t, { vT: E.speed || 0, mag: (E.speed || 0) > .05 ? 1 : 0, dx: 0, dz: -1, sx: 0, sy: 0, keys: {} }); S.x = S.z = 0; S.ry = 0; S.om = 0; toolOn = E.work ? 1 : 0; },
      setEngines(v) { power = v > .02 ? 1 : 0; apply(); }, setNight(n) { night = n; apply(); }, setDamage(v) { damage = v; apply(); },
      teleport(x, z, ry = 0) { Object.assign(S, { x, z, ry, vx: 0, vz: 0, vy: 0, om: 0, grounded: true, jumping: false, ant: 0, cr: 0, crv: 0, lean: 0, roll: 0, gy: hAt(x, z) }); S.py = S.gy + HS; focus.set(x, S.gy + 1, z); needReset = true; },
      actions: [
        { id: 'lamp', label: 'Licht', on: true, fn: v => { lampOn = v ? 1 : 0; apply(); } },
        { id: 'tool', label: 'Werkzeug', on: false, fn: v => { toolOn = v ? 1 : 0; } },
        { id: 'scan', label: 'Display', on: false, fn: v => { scanOn = v ? 1 : 0; } },
        { id: 'g', label: 'Schwerkraft', steps: ['Planet 2,4', 'Mond 1,6', 'Mars 3,7', 'Erde 9,8'], i: 0, fn: i => { GR = [2.4, 1.62, 3.72, 9.81][i]; } }
      ] };
    A.tick = (tt, st) => { chestScr.upd(tt, true, true); wristScr.upd(tt, true, true, 0, 0, 0); toolScr.upd(tt, true, !!st); };
    A.tick(0, false); apply(); return api;
  }
});
