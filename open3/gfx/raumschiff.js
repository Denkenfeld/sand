// objects/raumschiff.js – Raumschiff „Kojote“ (Startschiff des Spiels)
// Rostiger Frachtjäger, zusammengeschraubt wie aus einer Garage: funktional, laut, angeschlagen – und er explodiert.
// Vorn = -Z, oben = +Y, Ursprung = Bodenmitte. Länge ca. 29 m, Spannweite ca. 27 m, Höhe ca. 9 m.
Gallery.add({
  id: 'raumschiff', name: 'Raumschiff „Kojote“', info: 'Rostiger Frachtjäger · 29 m · Kit-Bash-Design · Schäden, Triebwerke, Explosion',
  build(T, GC, opts = {}) {
    const V3 = T.Vector3, PI = Math.PI, R = GC.rng(117), rr = (a, b) => a + (b - a) * R();
    const root = new T.Group(), P = {}, glows = [], dmg = [], blinks = [], sparkAt = [], smokeAt = [], flames = [], lights = [];
    const part = n => { const g = new T.Group(); g.name = n; root.add(g); P[n] = g; return g; };
    const Y0 = 3.6;   // Höhe der Rumpfmitte über dem Boden

    // ---------- Materialien ----------
    const hullM = GC.material(T, 11, { base: [208, 199, 178], accents: [[196, 120, 60], [150, 130, 108], [96, 124, 132]], accentP: .07, burn: 0, pw: [150, 300], ph: [110, 220], tone: .07, seam: .5, bump: 1.0 });
    const darkM = GC.material(T, 12, { base: [78, 82, 90], accents: [[120, 70, 40], [44, 66, 78]], accentP: .08, metal: .7, burn: 2 });
    const rustM = GC.material(T, 13, { base: [152, 86, 48], accents: [[92, 62, 42], [172, 124, 62]], accentP: .2, burn: 2 });
    const oliveM = GC.material(T, 14, { base: [98, 106, 72], accents: [[152, 112, 52], [70, 80, 60]], accentP: .12 });
    const engM = GC.material(T, 15, { base: [98, 110, 124], accents: [[190, 100, 44], [60, 72, 84]], accentP: .06, metal: .68, burn: 3, pw: [120, 260], ph: [90, 200], tone: .08 });
    const trim = new T.MeshStandardMaterial({ color: 0x2a2d33, metalness: .75, roughness: .42 }), chrome = new T.MeshStandardMaterial({ color: 0xc6ccd4, metalness: .95, roughness: .22 });
    const copper = new T.MeshStandardMaterial({ color: 0xb8703c, metalness: .85, roughness: .34 }), rubber = new T.MeshStandardMaterial({ color: 0x15161a, metalness: .2, roughness: .8 });
    const glass = new T.MeshStandardMaterial({ color: 0x9fd4ec, transparent: true, opacity: .34, metalness: .9, roughness: .06, depthWrite: false, side: T.DoubleSide });
    const hazard = new T.MeshStandardMaterial({ map: GC.hazard(T), roughness: .7, metalness: .3 }), grate = new T.MeshStandardMaterial({ map: GC.grate(T), roughness: .6, metalness: .6 });
    grate.map.repeat.set(3, 8);
    const bas = c => new T.MeshBasicMaterial({ color: c });
    const add = (p, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = m.receiveShadow = true; p.add(m); return m; };
    const cylZ = (p, r1, r2, len, mat, x, y, z, seg = 22) => add(p, new T.CylinderGeometry(r1, r2, len, seg), mat, x, y, z, PI / 2);   // r1 = Seite +Z
    const glow = (p, c, size, x, y, z, op = .9) => { const s = GC.sprite(T, c, size, op); s.position.set(x, y, z); p.add(s); glows.push({ o: s, b: op }); return s; };
    const lamp = (p, x, y, z, c, blink) => { const m = add(p, new T.SphereGeometry(.14, 8, 6), bas(c), x, y, z); m.castShadow = false; const s = glow(p, c, 1.6, x, y, z, .9); if (blink) blinks.push({ s, m, ph: rr(0, 6), sp: blink }); return m; };
    const tube = (p, pts, r, mat, seg = 24) => add(p, new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(a => new V3(...a))), seg, r, 7), mat);
    const top = (x, z) => Y0 + GC.topY(x, z);
    const repCache = {}, rep = (m, x, y) => { const q = Math.max(x, y) <= .7 ? [.5, .5] : Math.max(x, y) <= 1.4 ? [1, 1] : [2, 1], k = m.uuid + q; return repCache[k] || (repCache[k] = GC.rep(m, q[0], q[1])); };

    // ---------- Rumpf: keilförmig, kantig, verbeult ----------
    const hull = part('rumpf');
    const keys = [[-13, .7, .5, .35, .7], [-11.6, 1.8, .95, .6, .6], [-9.4, 3.4, 1.55, .95, .5], [-6.2, 5.5, 2.3, 1.2, .42], [-2, 6.9, 2.9, 1.4, .4], [2, 7.1, 3.15, 1.5, .4], [6, 6.5, 3.05, 1.5, .42], [10, 5.3, 2.7, 1.3, .45]];
    add(hull, GC.loft(T, keys, { dent: .08 }), hullM, 0, Y0, 0);
    for (let z = -8.6; z < 7.5; z += 2.6) { const s = (top(0, z + 1.3) - top(0, z - 1.3)) / 2.6; add(hull, new T.BoxGeometry(1.5, .5, 2.7), rep(darkM, .6, .6), 0, top(0, z) + .08, z, -Math.atan(s)); }   // Rückenkamm
    const dm = new T.Object3D(), cc = new T.Color();
    const free = (x, z) => !((x > -4.2 && x < .6 && z < -3.7) || (x > .9 && x < 3.9 && z > 1.6 && z < 5.2) || (x > -4.6 && x < -2.2 && z > .4 && z < 3.6) || (x < -1.4 && x > -4.6 && z > 5.2 && z < 8) || (x > 2.4 && x < 5 && z > -5.2 && z < -2.2) || (x > 2.8 && x < 5.6 && z > 6.2 && z < 8.6) || Math.abs(x) < .9);
    const scatter = (geo, mat, n, size, lo, hi) => { const im = new T.InstancedMesh(geo, mat, n); for (let i = 0, k = 0; i < n && k < 5000; k++) { const x = rr(-6.2, 6.2), z = rr(-9.2, 9.6); if (!free(x, z) || Math.abs(x) > GC.hullAt(z)[0] * .86) continue; const [w, d, h] = size();
      dm.position.set(x, top(x, z) + h / 2 - .05, z); dm.rotation.set(0, R() < .3 ? rr(-.5, .5) : 0, 0); dm.scale.set(w, h, d); dm.updateMatrix(); im.setMatrixAt(i, dm.matrix); im.setColorAt(i, cc.setHSL(.09 + R() * .04, .05 + R() * .12, lo + R() * (hi - lo))); i++; }
      im.castShadow = im.receiveShadow = true; hull.add(im); return im; };
    scatter(new T.BoxGeometry(1, 1, 1), rep(darkM, .5, .5), 55, () => [rr(.5, 1.5), rr(.5, 1.8), rr(.1, .36)], .8, 1.05);
    scatter(new T.BoxGeometry(1, 1, 1), rep(hullM, .5, .5), 75, () => [rr(.6, 2.1), rr(.6, 2.3), rr(.06, .24)], .85, 1.1);
    scatter(new T.CylinderGeometry(1, 1, 1, 8), rep(darkM, .3, .3), 34, () => { const r = rr(.12, .3); return [r, r, rr(.2, .6)]; }, .85, 1.1);
    // Flickbleche (andere Farbe, verschraubt)
    [[rustM, -4, 8.2, 2.6, 2.1, .3], [oliveM, 3.7, -1.4, 2.8, 2, -.2], [rustM, 4.4, 4.8, 2, 1.7, .1], [hullM, -2.4, -7.4, 1.8, 1.6, .5], [oliveM, -4.8, 3.4, 2.2, 1.6, -.4], [rustM, 1.6, 8.9, 1.9, 1.3, .15]].forEach(([m, x, z, w, d, ry]) => { if (Math.abs(x) < GC.hullAt(z)[0] * .9) add(hull, new T.BoxGeometry(w, .07, d), rep(m, .4, .4), x, top(x, z) + .02, z, 0, ry); });
    // Fenster- und Lüftungsbänder an den Flanken
    [-1, 1].forEach(s => { for (let z = -6.4; z <= 6.6; z += .95) { const x = s * (GC.sideX(z, .7) + .03); add(hull, new T.BoxGeometry(.08, .46, .62), trim, x, Y0 + .7, z); const w = add(hull, new T.BoxGeometry(.06, .3, .46), bas(R() < .12 ? 0x3a2a22 : 0xffd98a), x + s * .03, Y0 + .7, z); w.castShadow = false; }
      for (let z = -4; z <= 5; z += 3) add(hull, new T.BoxGeometry(.1, .7, 1.6), trim, s * (GC.sideX(z, -.5) + .03), Y0 - .6, z); });
    // Bug: Kinn mit Sensoren und Suchscheinwerfer
    cylZ(hull, .16, .2, 3.2, chrome, -.7, Y0 - .5, -12.4, 10); cylZ(hull, .16, .2, 3.2, chrome, .7, Y0 - .5, -12.4, 10); add(hull, new T.BoxGeometry(2.6, .5, 2.4), rep(darkM, .5, .5), 0, Y0 - .55, -10.8);
    const sl = add(hull, new T.CylinderGeometry(.35, .3, .5, 12), trim, 0, Y0 - 1.05, -11.2, PI / 2 + .25); glow(hull, 0xfff4d0, 3.4, 0, Y0 - 1.15, -11.9, .9);
    [[-.4, .5], [.4, -.5]].forEach(([x, rx]) => add(hull, new T.CylinderGeometry(.05, .05, 1.8, 6), chrome, x * 4, Y0 + 1.2, -11.1 + rx * .1, -.4));
    // Sensorschaft + Antennen
    [[3.4, 6.5, 3.2], [4.6, 8.2, 2.4], [-5, 3.4, 2.8]].forEach(([x, z, h]) => { if (Math.abs(x) < GC.hullAt(z)[0] * .85) { add(hull, new T.CylinderGeometry(.04, .08, h, 6), chrome, x, top(x, z) + h / 2, z); lamp(hull, x, top(x, z) + h, z, 0xff3a2a, rr(1.2, 2)); } });
    // Auspuff-/Dampfrohre am Rücken
    [[-5.1, -1.4], [5.2, 1.2]].forEach(([x, z]) => { cylZ(hull, .3, .34, 1.6, trim, x, top(x, z) + .25, z, 12); smokeAt.push({ p: new V3(x, top(x, z) + .7, z + .8), w: 1, steam: true }); });
    // freiliegende Leitungen entlang des Rumpfes
    [-1, 1].forEach(s => { tube(hull, [[s * 3.2, top(s * 3.2, -7) + .15, -7], [s * 3.9, top(s * 3.9, -3) + .3, -3.2], [s * 4.8, top(s * 4.8, 1) + .22, 1], [s * 4.4, top(s * 4.4, 5) + .22, 5.2], [s * 3.8, top(s * 3.8, 8.8) + .2, 8.8]], .14, s < 0 ? copper : trim, 40);
      for (let z = -6; z < 9; z += 2.4) { const x = s * (4.2 - Math.abs(z) * .05); add(hull, new T.BoxGeometry(.38, .2, .36), trim, x, top(x, z) + .12, z); } });

    // ---------- Flankenpanzerung, Bugschnabel, Mandibeln, Heck-Kühler ----------
    const hwd = z => GC.hullAt(z + .5)[0] - GC.hullAt(z - .5)[0], plateMats = [rep(hullM, .5, .5), rep(hullM, .5, .5), rep(hullM, .5, .5), rep(rustM, .5, .5), rep(oliveM, .5, .5), rep(darkM, .5, .5)];
    [-1, 1].forEach(s => { let z = -9.2; while (z < 8.4) { const len = rr(2.2, 4.4), zc = z + len / 2, upr = R() < .5, h = rr(.7, 1.15), yy = upr ? rr(1.25, 1.65) : rr(-.75, -.35), x = s * (GC.sideX(zc, yy) + .08), ph = s * Math.atan(hwd(zc));
        if (zc < 8.2) add(hull, new T.BoxGeometry(.14, h, len), plateMats[R() * plateMats.length | 0], x, Y0 + yy, zc, 0, ph, 0);
        if (R() < .55) add(hull, new T.BoxGeometry(.2, h + .15, .16), trim, x + s * .02, Y0 + yy, z, 0, ph, 0);
        z += len + rr(.15, .5); } });
    add(hull, new T.BoxGeometry(2.4, .2, 4.2), rep(darkM, .5, .5), 0, top(0, -10.4) + .16, -10.6, -.13);
    [-1, 1].forEach(s => { add(hull, new T.BoxGeometry(.2, 1.1, 4.6), rep(rustM, .5, .5), s * 1.5, Y0 + .1, -10.8, 0, s * .32, 0); add(hull, new T.BoxGeometry(1.6, .18, 3.4), rep(hullM, .5, .5), s * 1.15, Y0 - .62, -10.9, .06, s * .28, 0);
      const g = new T.Group(); g.position.set(s * 3.3, Y0 - .45, -11.2); g.rotation.y = -s * .1; hull.add(g);
      add(g, new T.BoxGeometry(1.5, 1.1, 7.2), rep(hullM, .5, .5), 0, 0, -1.2); add(g, new T.BoxGeometry(1.2, .22, 6.4), rep(darkM, .5, .5), 0, .65, -1.1); add(g, new T.BoxGeometry(.9, .9, 2.0), rep(rustM, .5, .5), -s * .1, -.05, -5.3, 0, -s * .12, 0);
      add(g, new T.BoxGeometry(1.52, .35, 2.3), hazard, 0, -.35, 1.2); cylZ(g, .17, .2, 3, chrome, s * .35, -.1, -7.2, 10); lamp(g, s * .2, .3, -6.4, s < 0 ? 0xff3030 : 0x30ff60, 0); });
    [-1, 1].forEach(s => { const rx2 = s * 2.9; add(hull, new T.BoxGeometry(2.1, 1.7, .5), rep(darkM, .5, .5), rx2, Y0 + .55, 10.45); for (let i = 0; i < 7; i++) add(hull, new T.BoxGeometry(1.8, .07, .12), chrome, rx2, Y0 - .1 + i * .2, 10.74);
      add(hull, new T.PlaneGeometry(1.7, 1.2), GC.addMat(T, 0xff6a20, .5), rx2, Y0 + .55, 10.2); tube(hull, [[rx2 + s * 1.0, Y0 + .5, 10.5], [rx2 + s * 2, Y0 + .9, 11.2], [s * 5.2, Y0 + 1.1, 10.4]], .1, copper, 16); lamp(hull, rx2, Y0 + 1.5, 10.7, 0xff3a2a, 1.6); });
    add(hull, new T.BoxGeometry(8.4, .5, .6), hazard, 0, Y0 + 1.75, 10.35);

    // ---------- Kanzel (außermittig, Glas mit Rippen, Innenleben) ----------
    const ck = part('kanzel'), cx = -1.8, cz = -6.5, cy = top(cx, cz);
    add(ck, new T.BoxGeometry(4.6, .8, 5.6), rep(darkM, .7, .7), cx, cy + .1, cz, -.11);
    const dome = new T.Group(); dome.position.set(cx, cy + .45, cz); dome.scale.set(2.2, 1.55, 3.0); dome.rotation.x = -.09; ck.add(dome);
    add(dome, new T.SphereGeometry(1, 30, 16, 0, PI * 2, 0, PI / 2), glass).castShadow = false;
    for (let i = 0; i < 6; i++) { const r = new T.Mesh(new T.TorusGeometry(1.005, .022, 6, 28, PI), trim); r.rotation.y = i * PI / 6; dome.add(r); } const rg = new T.Mesh(new T.TorusGeometry(1, .03, 6, 28), trim); rg.rotation.x = PI / 2; dome.add(rg);
    [.3, .62].forEach(h => { const r = new T.Mesh(new T.TorusGeometry(Math.sqrt(1 - h * h) * 1.002, .02, 6, 28), trim); r.rotation.x = PI / 2; r.position.y = h; dome.add(r); });
    add(ck, new T.BoxGeometry(3.4, .5, 1.1), trim, cx, cy + .75, cz - 1.5, .35);   // Armaturenbrett
    [-.9, .9].forEach(dx => { add(ck, new T.BoxGeometry(.9, .8, .9), rep(rustM, .3, .3), cx + dx, cy + 1.05, cz + .2); add(ck, new T.BoxGeometry(.8, 1.0, .2), rubber, cx + dx, cy + 1.45, cz + .75); add(ck, new T.SphereGeometry(.26, 10, 8), rubber, cx + dx, cy + 1.75, cz + .22); });
    const sc = add(ck, new T.PlaneGeometry(2.6, .5), bas(0x5fe6ff), cx, cy + 1.08, cz - 1.62, -.5); sc.castShadow = false; glows.push({ o: { set opacity(v) { sc.material.color.setRGB(.2 + .5 * v, .55 + .4 * v, .6 + .4 * v); } }, b: 1, fn: 1 });
    glow(ck, 0x66e0ff, 4.5, cx, cy + 1.3, cz - 1.2, .55); const cl = new T.PointLight(0x66ccff, 0, 14, 1.6); cl.position.set(cx, cy + 1.6, cz); ck.add(cl); lights.push({ l: cl, k: 2.2 });
    const crack = GC.decal(T, 2.2, 1.6, 256, (x, W, H) => { x.strokeStyle = 'rgba(255,255,255,.85)'; x.lineWidth = 2; for (let i = 0; i < 9; i++) { let px = W * .45, py = H * .5, a = i * .7 + R(); x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 4; k++) { px += Math.cos(a) * (14 + R() * 24); py += Math.sin(a) * (14 + R() * 24); a += (R() - .5) * 1.1; x.lineTo(px, py); } x.stroke(); } });
    crack.position.set(cx + 1.3, cy + 1.1, cz - 1.4); crack.rotation.set(-.9, .5, .3); crack.material.metalness = .9; ck.add(crack); dmg.push(crack);

    // ---------- Geschützturm (Vierling) & Radar ----------
    const tu = part('turm'), tx = 2.4, tz = 3.3, ty = top(tx, tz);
    add(tu, new T.CylinderGeometry(1.45, 1.6, .6, 20), rep(darkM, .5, .5), tx, ty + .1, tz); const tg = new T.Group(); tg.position.set(tx, ty + .45, tz); tu.add(tg);
    add(tg, new T.SphereGeometry(1.1, 20, 10, 0, PI * 2, 0, PI / 2), rep(hullM, .5, .5)).scale.y = .85; add(tg, new T.BoxGeometry(1.8, .6, 1.4), rep(darkM, .5, .5), 0, .35, .15);
    const bar = [-.42, .42].map(x => { const g = new T.Group(); g.position.set(x, .5, -.7); tg.add(g); cylZ(g, .13, .13, 2.8, chrome, 0, 0, -1.3, 10); cylZ(g, .24, .24, 1, trim, 0, 0, -.35, 10); cylZ(g, .2, .2, .35, trim, 0, 0, -2.6, 10); return g; });
    glow(tg, 0xffb060, 1.2, -.42, .5, -3.4, .0); lamp(tg, .6, .95, .6, 0xff3a2a, 2.4);
    const rd = part('radar'), rx = -3.4, rz = 2, ry = top(rx, rz); add(rd, new T.CylinderGeometry(.18, .26, 1.8, 8), chrome, rx, ry + .9, rz); add(rd, new T.CylinderGeometry(.5, .6, .35, 12), trim, rx, ry + .1, rz);
    const dish = new T.Group(); dish.position.set(rx, ry + 1.9, rz); rd.add(dish); const bowl = add(dish, new T.SphereGeometry(1.35, 24, 8, 0, PI * 2, 0, PI / 2.5), new T.MeshStandardMaterial({ color: 0xcfd4da, metalness: .7, roughness: .4, side: T.DoubleSide }), 0, 0, 0, -1.0, .6); add(dish, new T.CylinderGeometry(.03, .03, 1.5, 5), chrome, 0, .8, -.5, -.9, .6); add(dish, new T.SphereGeometry(.12, 8, 6), bas(0xff3a2a), 0, 1.45, -.9);

    // ---------- Triebwerke (zwei ungleiche, links beschädigt) ----------
    const eng = side => {
      const g = part(side < 0 ? 'triebwerkL' : 'triebwerkR'), ex = side * 7.7, ey = Y0 + .25, mat = rep(engM, 1.3, 1);
      cylZ(g, 2.15, 2.15, 9.2, mat, ex, ey, 8.6, 28); add(g, new T.ConeGeometry(2.15, 3.1, 28), rep(engM, 1.3, .6), ex, ey, 2.45, -PI / 2); add(g, new T.CircleGeometry(1.9, 24), bas(0x0a0b0d), ex, ey, 1.2, PI);
      for (let i = 0; i < 4; i++) add(g, new T.TorusGeometry(1.95, .07, 6, 24), trim, ex, ey, 1.3 + i * .5, 0, 0, 0).scale.set(1 - i * .12, 1 - i * .12, 1);
      for (let z = 5.4; z < 13; z += 1.7) add(g, new T.TorusGeometry(2.17, .1, 8, 30), trim, ex, ey, z);
      const hz = new T.MeshStandardMaterial({ map: GC.hazard(T), roughness: .7, metalness: .3 }); hz.map.repeat.set(7, 1); cylZ(g, 2.17, 2.17, .9, hz, ex, ey, 6.1, 28);
      cylZ(g, 1.9, 2.1, 2.2, rep(darkM, 1.2, .5), ex, ey, 13.8, 28);
      const bell = new T.LatheGeometry([[1.45, 0], [1.6, .4], [1.95, 1.2], [2.35, 2.2], [2.25, 2.3], [1.5, .5]].map(a => new T.Vector2(a[0], a[1])), 28); add(g, bell, new T.MeshStandardMaterial({ color: 0x3a3532, metalness: .9, roughness: .5, side: T.DoubleSide }), ex, ey, 14.9, PI / 2);
      const finM = rep(darkM, .2, .2); for (let i = 0; i < 10; i++) { const a = i * PI / 5; add(g, new T.BoxGeometry(.07, .8, 2.4), finM, ex + Math.cos(a) * 2.2, ey + Math.sin(a) * 2.2, 11.8, 0, 0, a - PI / 2); }
      const core = add(g, new T.CircleGeometry(1.5, 26), GC.addMat(T, 0xffcf90, .6), ex, ey, 15.0).material; core.depthWrite = false; glows.push({ o: { set opacity(v) { core.opacity = .25 + .4 * v; } }, b: 1, fn: 1 });
      const fg = new T.Group(); fg.position.set(ex, ey, 15.2); g.add(fg);
      const f1 = add(fg, new T.ConeGeometry(1.35, 1, 24, 1, true), GC.flameMat(T, 0xa8d8ff, 0x3a70ff, .85), 0, 0, .5, PI / 2), f2 = add(fg, new T.ConeGeometry(.8, 1, 20, 1, true), GC.flameMat(T, 0xffffff, 0x9fd0ff, 1), 0, 0, .5, PI / 2), f3 = add(fg, new T.ConeGeometry(1.9, 1, 20, 1, true), GC.flameMat(T, 0xffb060, 0xff4a10, .45), 0, 0, .5, PI / 2); [f1, f2, f3].forEach(f => f.castShadow = false);
      const fs = glow(fg, 0x8fd0ff, 11, 0, 0, 1.2, .6); const el = new T.PointLight(0x7cc4ff, 0, 22, 1.6); el.position.set(ex, ey, 18); g.add(el); lights.push({ l: el, k: 2.6, eng: 1 });
      flames.push({ f1, f2, f3, fs, el, fg, ph: R() * 9, side });
      // Pylon zum Rumpf
      add(g, new T.BoxGeometry(2.7, 1.6, 6.4), rep(darkM, .6, .6), side * 5.5, Y0 + .15, 8.2); add(g, new T.BoxGeometry(2.4, 1.1, 2.4), rep(rustM, .4, .4), side * 5.4, Y0 + .5, 4.4);
      tube(g, [[ex - side * 1.5, ey + 2.1, 4.5], [ex - side * .9, ey + 2.4, 7], [ex, ey + 2.35, 9.5], [ex + side * .8, ey + 2.1, 12.4]], .12, copper, 24);
      lamp(g, ex, ey + 2.35, 3.4, side < 0 ? 0xff3030 : 0x30ff60, 1.4);
      if (side < 0) {   // linkes Triebwerk: Wartungsklappe weg, Spulen glühen, Kabel hängen, qualmt
        const px = ex + .4, pz = 9.6, py = ey + 2.05; add(g, new T.BoxGeometry(2.1, .5, 2.8), new T.MeshStandardMaterial({ color: 0x120d0b, roughness: 1 }), px, py - .1, pz, 0, 0, -.2);
        for (let i = 0; i < 4; i++) { const t = add(g, new T.TorusGeometry(.6, .07, 6, 14), GC.addMat(T, 0xff7a22, .95), px, py + .12, pz - 1 + i * .65, PI / 2, 0, 0); glows.push({ o: { set opacity(v) { t.material.opacity = .7 + .3 * v; } }, b: 1, fn: 1 }); }
        add(g, new T.BoxGeometry(1.8, .06, 1.2), hullM, px - 1.5, py + .9, pz + 1.1, .5, .3, .9); add(g, new T.BoxGeometry(1.4, .06, 1.1), hullM, px + .2, py + .45, pz - 1.7, -.7, .2, -.2); add(g, new T.BoxGeometry(1.1, .06, .9), hullM, px - .6, py + .6, pz + 1.6, .4, -.5, .7);
        tube(g, [[px - .5, py, pz + 1], [px - 1.3, py - 1.2, pz + 1.6], [px - 1.9, py - 2.4, pz + 1.3], [px - 2.2, py - 3.1, pz + 1.1]], .05, rubber, 16); tube(g, [[px + .3, py, pz + .6], [px - .3, py - 1.2, pz + 1.2], [px - .5, py - 2.1, pz + 1]], .04, rubber, 12);
        sparkAt.push({ p: new V3(px, py + .3, pz), r: 2.2 }); smokeAt.push({ p: new V3(px, py + .6, pz), w: 1 });
        const sc2 = GC.decal(T, 4, 8.5, 256, (x, W, H) => { const gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(8,6,5,.9)'); gr.addColorStop(1, 'rgba(8,6,5,0)'); x.fillStyle = gr; x.beginPath(); x.moveTo(W * .3, 0); x.lineTo(W * .7, 0); x.lineTo(W, H); x.lineTo(0, H); x.fill(); }); sc2.position.set(px + .2, py + .02, pz + 5); sc2.rotation.x = -PI / 2; g.add(sc2); dmg.push(sc2);
      } else {
        const st = GC.decal(T, 5.2, 1.6, 512, (x, W, H) => { x.fillStyle = '#e9e2d0'; x.font = 'bold 150px Impact, "Arial Black", sans-serif'; x.textBaseline = 'middle'; x.fillText('KY-117', 20, H / 2); x.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 60; i++) { x.fillStyle = `rgba(0,0,0,${R() * .8})`; x.fillRect(R() * W, R() * H, 2 + R() * 14, 2 + R() * 6); } });
        st.position.set(ex + .8, ey + 2.2, 10.6); st.rotation.set(-PI / 2 + .3, 0, -PI / 2); g.add(st);
        add(g, new T.BoxGeometry(1.9, .08, 2.2), rep(rustM, .4, .4), ex + .2, ey + 2.12, 7.2, 0, .1, -.08);
      }
      return g;
    };
    eng(-1); eng(1);

    // ---------- Flügel (links lang, rechts abgebrochen) ----------
    const wing = (pts, name, mat, th = .55) => { const s = new T.Shape(); pts.forEach((p, i) => i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1])); s.closePath();
      const geo = new T.ExtrudeGeometry(s, { depth: th, bevelEnabled: true, bevelSize: .1, bevelThickness: .1, bevelSegments: 1 }); geo.rotateX(PI / 2); const g = part(name); add(g, geo, mat, 0, Y0 + .1, 0); return g; };
    const wl = wing([[-5.4, -1.6], [-13.1, 3.1], [-13.5, 6.1], [-11.1, 6.7], [-10.3, 5.1], [-8.3, 5.5], [-7.7, 7.1], [-5.6, 7.1]], 'flügelL', rep(hullM, .4, .4));
    const wr = wing([[5.4, -1.6], [11.2, 2.4], [12.4, 3.2], [10.7, 4.3], [11.6, 5.1], [9.3, 5.7], [8.5, 7.1], [5.6, 7.1]], 'flügelR', rep(hullM, .4, .4));
    // Flügelspitze links: Laserkanone; rechts: abgerissen mit Rippen, Kabeln und Funken
    cylZ(wl, .32, .32, 3.4, chrome, -13.2, Y0 - .1, 1.7, 12); add(wl, new T.CylinderGeometry(.55, .55, 1.4, 12), trim, -13.2, Y0 - .1, 3.6, PI / 2); lamp(wl, -13.5, Y0 + .3, 6, 0xff3030, 1.5);
    for (let i = 0; i < 4; i++) add(wr, new T.BoxGeometry(.12, .5, 1.9 + i * .4), trim, 10.8 + i * .45, Y0 - .1, 3.5 + i * .55, 0, -.3 + i * .15, rr(-.2, .2));
    add(wr, new T.BoxGeometry(1.7, .08, 1.3), hullM, 11.8, Y0 + .1, 5.7, .5, .4, .7); tube(wr, [[11.2, Y0, 3.4], [12, Y0 - .9, 3.9], [12.4, Y0 - 2, 3.5], [12.6, Y0 - 2.8, 3.3]], .05, rubber, 14); tube(wr, [[11, Y0, 4.4], [11.4, Y0 - .6, 5.2], [11.6, Y0 - 1.6, 5.1]], .04, rubber, 12);
    sparkAt.push({ p: new V3(11.2, Y0 + .1, 3.6), r: 1.6 }); lamp(wr, 9.8, Y0 + .3, 5.9, 0x30ff60, 1.7);
    [[wl, -1], [wr, 1]].forEach(([w, s]) => { for (let i = 0; i < 5; i++) add(w, new T.BoxGeometry(.9, .06, .5), trim, s * (6.4 + i * 1.3), Y0 + .5, 1 + i * .5); });
    // ---------- Fracht-Kapsel (rechts) und Tankbündel (links) ----------
    const pod = part('kapsel'), pz = 2.4, px = 8.9, py = 2.3; cylZ(pod, 1.15, 1.15, 6.2, rep(oliveM, 2, 1), px, py, pz, 24); [-1, 1].forEach(s => add(pod, new T.SphereGeometry(1.15, 18, 10, 0, PI * 2, 0, PI / 2), rep(oliveM, 1, 1), px, py, pz + s * 3.1, s * PI / 2, 0, 0).scale.set(1, 1, .8));
    [-2, 0, 2].forEach(z => add(pod, new T.TorusGeometry(1.18, .08, 8, 24), rep(rustM, 1, .2), px, py, pz + z, 0, 0, 0)); add(pod, new T.BoxGeometry(.5, 1.0, .9), rubber, px, py + 1.1, pz - 1); [-2.2, .4, 2.6].forEach(z => add(pod, new T.BoxGeometry(.3, 1.3, .4), trim, px - 1.4, py + 1.4, pz + z, 0, 0, -.5));
    const pst = GC.decal(T, 3.2, 1, 512, (x, W, H) => { x.fillStyle = '#e8e0c8'; x.font = 'bold 120px Impact, "Arial Black", sans-serif'; x.textBaseline = 'middle'; x.fillText('FRACHT 7', 10, H / 2); x.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 50; i++) { x.fillStyle = `rgba(0,0,0,${R()})`; x.fillRect(R() * W, R() * H, 3 + R() * 18, 2 + R() * 5); } });
    pst.position.set(px + 1.17, py + .1, pz); pst.rotation.y = PI / 2; pod.add(pst);
    const tk = part('tanks'); [[-7.2, 2.15, 0], [-8.7, 2.05, 0.4], [-10.2, 2.1, .8]].forEach(([x, y, z], i) => { cylZ(tk, .78, .78, 5.4, rep(i === 1 ? rustM : darkM, 1.6, 1), x, y, z + 1.2, 18); [-1.2, 1.2].forEach(dz => add(tk, new T.TorusGeometry(.8, .06, 6, 18), copper, x, y, z + 1.2 + dz)); add(tk, new T.SphereGeometry(.2, 8, 6), chrome, x, y + .8, z + 1.2); });
    tube(tk, [[-7.2, 1.5, 4], [-8.7, 1.4, 4.1], [-10.2, 1.5, 4.4], [-11, 2.4, 5.6]], .13, copper, 20); add(tk, new T.BoxGeometry(5.2, .2, .6), trim, -8.7, 3.0, 1.8, 0, 0, 0);
    // ---------- Fahrwerk ----------
    const gearLeg = (g, x, z, big) => { const hy = Y0 - 1.0, pad = big ? 1.4 : 1.1, dir = Math.sign(x);
      add(g, new T.CylinderGeometry(pad * .85, pad, .4, 14), rep(darkM, .4, .4), x, .18, z); add(g, new T.SphereGeometry(.42, 10, 8), trim, x, .62, z);
      const lo = add(g, new T.CylinderGeometry(.3, .38, 1.9, 10), chrome, x + dir * .15, 1.4, z, 0, 0, dir * -.08); add(g, new T.CylinderGeometry(.46, .46, 1.7, 12), rep(darkM, .3, .5), x + dir * .3, 2.5, z, 0, 0, dir * -.08);
      add(g, new T.BoxGeometry(.8, .7, 1.2), rep(rustM, .3, .3), x + dir * .4, hy + .2, z); add(g, new T.CylinderGeometry(.14, .14, 2.9, 8), trim, x - dir * .9, 1.9, z, 0, 0, dir * .55);
      tube(g, [[x + dir * .5, 1.2, z + .45], [x + dir * 1.1, 1.9, z + .8], [x + dir * .6, 2.8, z + .5]], .06, rubber, 12); lamp(g, x - dir * .2, 3.0, z - .5, 0xffb060, 0); };
    const gf = part('fahrwerkV'), gb = part('fahrwerkH'); [-3.4, 3.4].forEach(x => gearLeg(gf, x, -6.4, false)); [-4.9, 4.9].forEach(x => gearLeg(gb, x, 5.4, true));
    // ---------- Laderampe mit Frachtraum ----------
    const rp = part('rampe'); add(rp, new T.BoxGeometry(4.6, 2.7, .9), new T.MeshStandardMaterial({ color: 0x0e0c0b, roughness: 1 }), 0, Y0 - .15, 9.75); const bay = add(rp, new T.PlaneGeometry(4.0, 2.2), bas(0xffc47a), 0, Y0 - .15, 10.25); bay.castShadow = false; glows.push({ o: { set opacity(v) { bay.material.color.setRGB(.8 + .2 * v, .62 + .1 * v, .38) } }, b: 1, fn: 1 });
    glow(rp, 0xffb060, 8, 0, Y0 - .1, 11.4, .55); const rl = new T.PointLight(0xffb060, 0, 18, 1.6); rl.position.set(0, 3.3, 12.5); rp.add(rl); lights.push({ l: rl, k: 2.4 });
    const ang = Math.atan2(Y0 - 1.3 - .1, 6.6); add(rp, new T.BoxGeometry(3.6, .24, 6.9), grate, 0, (Y0 - 1.3 + .2) / 2, 13.3, ang); [-1.9, 1.9].forEach(x => add(rp, new T.BoxGeometry(.2, .5, 6.9), hazard, x, (Y0 - 1.3 + .45) / 2, 13.3, ang));
    [-1.5, 1.5].forEach(x => add(rp, new T.CylinderGeometry(.1, .1, 4.4, 8), chrome, x, 2.5, 11.6, PI / 2 + ang + .5)); add(rp, new T.BoxGeometry(3.6, .3, .7), trim, 0, .15, 16.6, ang * .3);
    [[-.8, 2.5, 11.0, 1.2], [.8, 2.45, 11.5, 1.05], [-.7, 3.5, 11.0, .9]].forEach(([x, y, z, s]) => { add(rp, new T.BoxGeometry(s, s * .85, s), rep(rustM, .3, .3), x, y, z, 0, rr(-.3, .3)); add(rp, new T.BoxGeometry(s * 1.02, .08, s * 1.02), trim, x, y + s * .3, z); });
    add(rp, new T.CylinderGeometry(.5, .5, 1.2, 14), rep(darkM, .4, .4), 1.2, 1.55, 14.2); add(rp, new T.CylinderGeometry(.45, .45, 1.1, 14), rep(rustM, .6, .6), .5, 1.0, 15.6);
    const fl = GC.decal(T, 8, 7, 128, (x, W, H) => { const g2 = x.createRadialGradient(W / 2, 0, 1, W / 2, 0, W * .7); g2.addColorStop(0, 'rgba(255,190,110,.9)'); g2.addColorStop(1, 'rgba(255,190,110,0)'); x.fillStyle = g2; x.fillRect(0, 0, W, H); }); fl.material.emissive = new T.Color(0xffb060); fl.material.emissiveMap = fl.material.map; fl.material.blending = T.AdditiveBlending; fl.position.set(0, .06, 19.2); fl.rotation.x = -PI / 2; rp.add(fl); glows.push({ o: { set opacity(v) { fl.material.opacity = .25 + .6 * v; } }, b: 1, fn: 1 });
    // ---------- Schäden: Risse im Rumpf, Ruß, Kabel ----------
    const gash = (x, z, ry) => { const y = top(x, z), g = new T.Group(); g.position.set(x, y + .03, z); g.rotation.y = ry; hull.add(g);
      add(g, new T.BoxGeometry(2.6, .5, 2), new T.MeshStandardMaterial({ color: 0x0f0b09, roughness: 1 }), 0, -.15, 0); for (let i = 0; i < 4; i++) add(g, new T.BoxGeometry(.1, .4, 1.8), rep(rustM, .2, .2), -1 + i * .66, 0, 0);
      const st = add(g, new T.PlaneGeometry(2.2, .5), GC.addMat(T, 0xff5a20, .9), 0, .12, 0, -PI / 2); glows.push({ o: { set opacity(v) { st.material.opacity = .7 + .25 * v; } }, b: 1, fn: 1 });
      for (let i = 0; i < 8; i++) { const a = i * PI / 4 + rr(-.2, .2); add(g, new T.BoxGeometry(rr(.5, 1.2), .06, rr(.4, .9)), i % 3 ? hullM : rustM, Math.cos(a) * 1.5, rr(.05, .3), Math.sin(a) * 1.25, rr(-.7, .7), a + rr(-.3, .3), rr(-.7, .7)); }
      tube(g, [[.4, 0, .2], [1.1, .5, .5], [1.9, .15, 1], [2.3, -.3, 1.4]], .05, rubber, 14); sparkAt.push({ p: new V3(x, y + .3, z), r: 1.4 }); smokeAt.push({ p: new V3(x, y + .5, z), w: 0 });
      const sc3 = GC.decal(T, 3.2, 8, 256, (x2, W, H) => { const gr = x2.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(6,5,4,.88)'); gr.addColorStop(1, 'rgba(6,5,4,0)'); x2.fillStyle = gr; x2.beginPath(); x2.moveTo(W * .25, 0); x2.lineTo(W * .75, 0); x2.lineTo(W, H); x2.lineTo(0, H); x2.fill(); }); sc3.position.set(0, .02, 5.1); sc3.rotation.x = -PI / 2; g.add(sc3); dmg.push(sc3); return g; };
    gash(-2.6, 6.8, .3); gash(3.7, -3.7, -.5);
    [[-5.4, 7.6, .3, 4.5], [4.8, 2.4, -.6, 3.5]].forEach(([x, z, ry, s]) => { const d = GC.decal(T, s, s * 1.2, 128, (x2, W, H) => { const g = x2.createRadialGradient(W / 2, H / 2, 1, W / 2, H / 2, W / 2); g.addColorStop(0, 'rgba(8,6,5,.7)'); g.addColorStop(1, 'rgba(8,6,5,0)'); x2.fillStyle = g; x2.fillRect(0, 0, W, H); }); d.position.set(x, top(x, z) + .03, z); d.rotation.set(-PI / 2, 0, ry); hull.add(d); dmg.push(d); });
    // Beschriftungen und Warnzeichen auf dem Rumpf
    const nm = GC.decal(T, 6.4, 2, 512, (x, W, H) => { x.fillStyle = '#d9d2bf'; x.font = 'bold 190px Impact, "Arial Black", sans-serif'; x.textBaseline = 'middle'; x.fillText('KOJOTE', 8, H / 2); x.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 90; i++) { x.fillStyle = `rgba(0,0,0,${R() * .9})`; x.fillRect(R() * W, R() * H, 2 + R() * 16, 1 + R() * 6); } });
    nm.position.set(-0.6, top(-.6, -1.4) + .05, -1.4); nm.rotation.set(-PI / 2, 0, -PI / 2); hull.add(nm);
    [[-5.6, -2.2, 0], [5.8, -.6, PI]].forEach(([x, z, r]) => { const w = GC.decal(T, 1.4, 1.2, 128, (x2, W, H) => { x2.fillStyle = '#e8b020'; x2.beginPath(); x2.moveTo(W / 2, 8); x2.lineTo(W - 8, H - 10); x2.lineTo(8, H - 10); x2.fill(); x2.fillStyle = '#1a1a18'; x2.fillRect(W / 2 - 4, H * .38, 8, H * .28); x2.fillRect(W / 2 - 4, H * .72, 8, 8); }); w.position.set(x, top(x, z) + .04, z); w.rotation.set(-PI / 2, 0, r); hull.add(w); });
    [-1, 1].forEach(s => add(hull, new T.BoxGeometry(.5, .14, 5.2), hazard, s * (GC.sideX(-3, -.1) - .05), Y0 - 1.15, -3));
    // Positionslichter + Landescheinwerfer
    lamp(hull, -5.6, Y0 - .1, -6, 0xff3030, 0); lamp(hull, 5.6, Y0 - .1, -6, 0x30ff60, 0);

    // ---------- Partikel ----------
    const fire = GC.particles(T, 360), glowP = GC.particles(T, 420, { add: true }), smoke = GC.particles(T, 300), sparks = GC.particles(T, 120, { add: true }), steam = GC.particles(T, 80); root.add(smoke.points, steam.points, fire.points, glowP.points, sparks.points);
    smoke.points.renderOrder = steam.points.renderOrder = 1; fire.points.renderOrder = 2; glowP.points.renderOrder = 3; sparks.points.renderOrder = 4;
    const burst = (p, v, life, size, c0, c1) => { fire.emit(p, v, life, size, c0, c1); glowP.emit(p, v, life, size * 1.25, c0, c1); };
    // ---------- Pivot je Bauteil (für die Explosion) ----------
    const pivots = [];
    Object.keys(P).forEach(n => { const g = P[n], box = new T.Box3().setFromObject(g), c = box.getCenter(new V3()), sz = box.getSize(new V3()), pv = new T.Group(); pv.position.copy(c); root.add(pv); pv.add(g); g.position.set(-c.x, -c.y, -c.z); pivots.push({ pv, c0: c.clone(), q0: pv.quaternion.clone(), half: Math.max(.5, sz.y / 2 * .7), v: new V3(), w: new V3(), n }); });
    const wire = new T.Group(); root.add(wire);

    // ---------- Zustand und Steuerung ----------
    let time = 0, throttle = 1, night = 0, damage = 1, exploded = false, tEx = 0, ring = null, flash = null, onFlash = null;
    const apply = () => { glows.forEach(g => { if (g.fn) g.o.opacity = .55 + .45 * night; else if (g.o.material && g.o.material.opacity !== undefined) g.o.material.opacity = g.b * (.45 + .55 * night); }); lights.forEach(l => { l.l.intensity = (l.eng ? throttle * (.4 + .6 * night) : night) * l.k; }); dmg.forEach(d => d.visible = damage > .5); };
    const up = new V3(0, 1, 0);
    const api = {
      root, parts: P, radius: 15, height: 9.5, info: 'Rostiger Frachtjäger', get exploded() { return exploded; },
      setEngines(v) { throttle = v; apply(); }, setNight(n) { night = n; apply(); }, setDamage(v) { damage = v; apply(); },
      explode(cb) { if (exploded) return; exploded = true; tEx = time; onFlash = cb;
        flames.forEach(f => f.fg.visible = false); pivots.forEach(p => { const d = p.c0.clone().sub(new V3(0, 3, 4)); d.y = Math.abs(d.y) * .4 + 2; d.normalize(); p.v.copy(d).multiplyScalar(rr(9, 20)); p.v.y += rr(10, 20); p.w.set(rr(-3, 3), rr(-3, 3), rr(-3, 3)); });
        for (let i = 0; i < 300; i++) burst(new V3(rr(-6, 6), rr(2, 6), rr(-6, 10)), new V3(rr(-1, 1), rr(-.2, 1), rr(-1, 1)).normalize().multiplyScalar(rr(6, 30)).add(new V3(0, rr(2, 10), 0)), rr(.7, 2), rr(4, 10), 0xffc850, 0xb02404);
        for (let i = 0; i < 260; i++) smoke.emit(new V3(rr(-6, 6), rr(2, 5), rr(-6, 10)), new V3(rr(-1, 1), rr(.1, 1), rr(-1, 1)).multiplyScalar(rr(3, 11)).add(new V3(0, rr(3, 9), 0)), rr(3, 6), rr(8, 17), 0x2a2622, 0x111111);
        if (!ring) { ring = new T.Mesh(new T.RingGeometry(.9, 1, 56), GC.addMat(T, 0xffc070, .8)); ring.rotation.x = -PI / 2; ring.position.y = .3; wire.add(ring); flash = GC.sprite(T, 0xffe0a0, 40, 1); flash.position.set(0, 5, 3); wire.add(flash); } ring.visible = flash.visible = true; },
      reset() { exploded = false; pivots.forEach(p => { p.pv.position.copy(p.c0); p.pv.quaternion.copy(p.q0); p.v.set(0, 0, 0); }); flames.forEach(f => f.fg.visible = true); [fire, glowP, smoke, sparks, steam].forEach(s => s.clear()); if (ring) ring.visible = flash.visible = false; },
      update(dt, t) {
        time += dt; const e = time - tEx;
        // Triebwerke: Flackern, links stotternd
        flames.forEach(f => { const dmgL = f.side < 0 && damage > .5, st = dmgL ? (Math.sin(t * 9 + f.ph) > .86 || Math.sin(t * 2.3) > .93 ? .35 : 1) : 1, th = throttle * st, fl = 1 + .12 * Math.sin(t * 31 + f.ph) + .07 * Math.sin(t * 57), len = th * 9 * fl;
          [f.f1, f.f2, f.f3].forEach(m => m.material.uniforms.uT.value = t); f.f1.scale.set(1, len, 1); f.f1.position.z = len * .5; f.f2.scale.set(1, len * .55, 1); f.f2.position.z = len * .275; f.f3.scale.set(1, len * 1.15, 1); f.f3.position.z = len * .575; f.fs.scale.setScalar(3 + th * 4 * fl); f.fs.material.opacity = .1 + .28 * th; f.fg.visible = !exploded && throttle > .02; });
        // Geschützturm und Radar
        tg.rotation.y = exploded ? tg.rotation.y : Math.sin(t * .35) * .9 + Math.sin(t * .9) * .1; dish.rotation.y = t * .9; bar.forEach((b, i) => b.position.z = -.7 + Math.max(0, Math.sin(t * 6 + i * 3.1) - .93) * 3);
        blinks.forEach(b => { const on = Math.sin(t * b.sp * 3 + b.ph) > .35; b.s.visible = on; b.m.visible = on; });
        if (!exploded) {
          if (damage > .5) { if (R() < dt * 7) { const s = sparkAt[R() * sparkAt.length | 0]; for (let i = 0; i < 5; i++) sparks.emit(s.p.clone().add(new V3(rr(-.3, .3), 0, rr(-.3, .3))), new V3(rr(-3, 3), rr(2, 7), rr(-3, 3)), rr(.3, .8), .5, 0xffe9a0, 0xff6a10); }
            smokeAt.forEach(s => { if (!s.steam && R() < dt * 11) smoke.emit(s.p.clone().add(new V3(rr(-.3, .3), 0, rr(-.3, .3))), new V3(rr(-.3, .3) + 1.4, rr(1.8, 3.2), rr(-.3, .3) + .8), rr(2.4, 4.4), rr(1.6, 2.6), 0x4a4540, 0x151515); }); }
          smokeAt.forEach(s => { if (s.steam && R() < dt * 4) steam.emit(s.p.clone(), new V3(rr(-.3, .3), rr(1.5, 2.4), rr(.2, .8)), rr(1.4, 2.4), rr(1, 1.8), 0xd8dde2, 0xaab0b6); });
          if (throttle > .3) for (const f of flames) if (R() < dt * 14) glowP.emit(new V3(f.side * 7.7 + rr(-.6, .6), Y0 + .25 + rr(-.6, .6), 16 + rr(0, 2)), new V3(rr(-1, 1), rr(-1, 1), rr(10, 18) * throttle), rr(.3, .7), rr(1.1, 1.8), 0xbfe4ff, 0x4a7ab0);
        } else {
          pivots.forEach(p => { p.v.y -= 24 * dt; p.pv.position.addScaledVector(p.v, dt); p.pv.rotation.x += p.w.x * dt; p.pv.rotation.y += p.w.y * dt; p.pv.rotation.z += p.w.z * dt;
            if (p.pv.position.y < p.half) { p.pv.position.y = p.half; if (Math.abs(p.v.y) > 2) { p.v.y *= -.28; p.v.x *= .6; p.v.z *= .6; p.w.multiplyScalar(.5); } else { p.v.set(0, 0, 0); p.w.set(0, 0, 0); } }
            else if (R() < dt * 14) { smoke.emit(p.pv.position.clone(), new V3(rr(-1, 1), rr(.5, 2), rr(-1, 1)), rr(1.5, 3), rr(2, 4), 0x2a2622, 0x111111); if (R() < .5) burst(p.pv.position.clone(), new V3(rr(-2, 2), rr(0, 2), rr(-2, 2)), rr(.4, .9), rr(1.5, 3), 0xffbe4a, 0xb82804); } });
          if (e < 40 && R() < dt * 40 * Math.max(0, 1 - e / 40)) { burst(new V3(rr(-5, 5), rr(.4, 3), rr(-4, 9)), new V3(rr(-1, 1), rr(3, 7), rr(-1, 1)), rr(.7, 1.5), rr(2.5, 5), 0xffc860, 0xb02404); smoke.emit(new V3(rr(-5, 5), rr(1, 3), rr(-4, 9)), new V3(rr(-1, 1), rr(3, 6), rr(-1, 1)), rr(3, 6), rr(6, 11), 0x2a2622, 0x121212); }
          if (ring) { ring.scale.setScalar(1 + e * 42); ring.material.opacity = Math.max(0, .85 - e * .55); ring.visible = e < 1.7; flash.material.opacity = Math.max(0, 1 - e * 2.4); flash.scale.setScalar(40 + e * 60); flash.visible = e < .5; }
          if (onFlash && e > 0) { onFlash(e); }
        }
        fire.update(dt, { drag: 1.4, buoy: 5, grow: .5, alpha: .95 }); glowP.update(dt, { drag: 1.4, buoy: 5, grow: .4, alpha: .2 }); smoke.update(dt, { drag: .5, buoy: 2.2, grow: 2.2, alpha: .7 }); sparks.update(dt, { drag: .3, grav: 18, grow: -.4 }); steam.update(dt, { drag: .6, buoy: 1.2, grow: 2.5, alpha: .55 });
      }
    };
    apply(); return api;
  }
});
