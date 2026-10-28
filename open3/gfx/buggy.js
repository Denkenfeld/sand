// objects/buggy.js – Explorer-Buggy „Skarab“
// Wüsten-Explorer im selben Garagen-Stil wie das Raumschiff: Überrollkäfig, Einzelradaufhängung, offener Motor,
// Fahrer, Winde, Gepäckträger, Boost-Düse. Nase = -Z, oben = +Y, Ursprung = Bodenmitte (Räder stehen auf y = 0).
Gallery.add({
  id: 'buggy', name: 'Explorer-Buggy „Skarab“', info: 'Wüsten-Explorer · 5,5 m · fahrbar: Stick/WASD lenken & Gas · Bremse/Leertaste Handbremse (driften) · Boost/Shift',
  cam: { ty: 1.2, tz: 0, dist: 13, min: 4.5, max: 70, shadow: 26, near: .3, minY: .6, pitch: .26, yaw: 3.74, auto: true },
  labels: { eng: 'Motor' }, compare: true,
  build(T, GC, opts = {}) {
    const V3 = T.Vector3, PI = Math.PI, R = GC.rng(404), rr = (a, b) => a + (b - a) * R(), Z = new V3(0, 0, 1);
    const root = new T.Group(), world = new T.Group(), pivot = new T.Group(), body = new T.Group();
    pivot.position.set(0, 1.1, 0); body.position.set(0, -.9, 0); root.add(pivot); pivot.add(body);
    const glows = [], dmg = [], intact = [], lights = [], head = [], sparkAt = [], smokeAt = [];

    // ---------- Materialien ----------
    const hullM = GC.material(T, 31, { base: [214, 204, 182], accents: [[200, 122, 60], [150, 132, 110], [96, 124, 132]], accentP: .08, burn: 0, pw: [120, 260], ph: [90, 200], tone: .07, seam: .5, bump: 1.0 });
    const darkM = GC.material(T, 32, { base: [74, 78, 86], accents: [[120, 70, 40], [44, 66, 78]], accentP: .08, metal: .7, burn: 1 });
    const rustM = GC.material(T, 33, { base: [152, 86, 48], accents: [[92, 62, 42], [172, 124, 62]], accentP: .2, burn: 1 });
    const oliveM = GC.material(T, 34, { base: [98, 106, 72], accents: [[152, 112, 52], [70, 80, 60]], accentP: .12 });
    const orangeM = GC.material(T, 35, { base: [214, 108, 36], accents: [[236, 150, 60], [150, 70, 30]], accentP: .1, pw: [130, 260], ph: [100, 200], tone: .08, seam: .5, bump: 1.0 });
    const trim = new T.MeshStandardMaterial({ color: 0x2a2d33, metalness: .75, roughness: .42 }), chrome = new T.MeshStandardMaterial({ color: 0xc6ccd4, metalness: .95, roughness: .22 });
    const copper = new T.MeshStandardMaterial({ color: 0xb8703c, metalness: .85, roughness: .34 }), rubber = new T.MeshStandardMaterial({ color: 0x15161a, metalness: .2, roughness: .8 });
    const tire = new T.MeshStandardMaterial({ color: 0x17181b, metalness: .05, roughness: .95 }), cage = new T.MeshStandardMaterial({ color: 0xd2d6da, metalness: .85, roughness: .3 });
    const seatM = new T.MeshStandardMaterial({ color: 0x6a2e22, roughness: 1, metalness: 0 }), skin = new T.MeshStandardMaterial({ color: 0xd9a77a, roughness: .8, metalness: 0 });
    const glass = new T.MeshStandardMaterial({ color: 0x9fd4ec, transparent: true, opacity: .3, metalness: .9, roughness: .06, depthWrite: false, side: T.DoubleSide });
    const repCache = {}, rep = (m, x, y) => { const q = Math.max(x, y) <= .7 ? [.5, .5] : Math.max(x, y) <= 1.4 ? [1, 1] : [2, 1], k = m.uuid + q; return repCache[k] || (repCache[k] = GC.rep(m, q[0], q[1])); };
    const fendM = rep(hullM, 1, 1).clone(); fendM.side = T.DoubleSide;
    const bas = c => new T.MeshBasicMaterial({ color: c });
    const add = (p, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = m.receiveShadow = true; p.add(m); return m; };
    const cylZ = (p, r1, r2, len, mat, x, y, z, seg = 18) => add(p, new T.CylinderGeometry(r1, r2, len, seg), mat, x, y, z, PI / 2);
    const cylX = (p, r1, r2, len, mat, x, y, z, seg = 18) => add(p, new T.CylinderGeometry(r1, r2, len, seg), mat, x, y, z, 0, 0, PI / 2);
    const tube = (p, pts, r, mat, seg = 32, tens = .12) => add(p, new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(a => new V3(...a)), false, 'catmullrom', tens), seg, r, 8), mat);
    const glow = (p, c, size, x, y, z, op = .9, list = glows) => { const s = GC.sprite(T, c, size, op); s.position.set(x, y, z); p.add(s); list.push({ o: s, b: op }); return s; };
    const link = (m, a, b) => { const d = b.clone().sub(a), l = d.length(); m.position.copy(a).add(b).multiplyScalar(.5); m.scale.z = l; m.quaternion.setFromUnitVectors(Z, d.divideScalar(l)); };
    const prism = (p, prof, width, mat, x = 0, y = 0, z = 0) => { const s = new T.Shape(); prof.forEach((q, i) => i ? s.lineTo(q[0], q[1]) : s.moveTo(q[0], q[1])); s.closePath();
      const geo = new T.ExtrudeGeometry(s, { depth: width, bevelEnabled: true, bevelSize: .035, bevelThickness: .035, bevelSegments: 2 }); geo.rotateY(-PI / 2); geo.translate(width / 2, 0, 0); return add(p, geo, mat, x, y, z); };
    const limb = (p, a, b, w, mat) => { const m = add(p, new T.BoxGeometry(w, w, 1), mat); link(m, new V3(...a), new V3(...b)); return m; };
    const stencil = (txt, w, h, px, col, font) => GC.decal(T, w, h, px, (x, W, H) => { x.fillStyle = col; x.font = font; x.textBaseline = 'middle'; x.textAlign = 'center'; x.fillText(txt, W / 2, H / 2); x.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(0,0,0,${R() * .9})`; x.fillRect(R() * W, R() * H, 2 + R() * 10, 1 + R() * 4); } });
    const FZ = -1.55, RZ = 1.5, HX = [-1.36, 1.36, -1.34, 1.34], HZ = [FZ, FZ, RZ, RZ], RW = .66, WW = .56;

    // ---------- Rahmen, Boden, Kufe ----------
    [-1, 1].forEach(s => cylZ(body, .08, .08, 4.6, trim, s * .62, .58, .05));
    [-2.1, -.9, .5, 1.8, 2.4].forEach(z => cylX(body, .06, .06, 1.3, trim, 0, .58, z));
    add(body, new T.BoxGeometry(1.35, .07, 3.6), rep(darkM, .5, .5), 0, .5, .15); add(body, new T.BoxGeometry(1.1, .05, 1.5), rep(darkM, .5, .5), 0, .42, -1.7);
    // ---------- Karosserie: Haube, Kühlergrill, Türen, Heckwanne ----------
    prism(body, [[-2.62, .74], [-2.52, 1.02], [-1.4, 1.26], [-.82, 1.32], [-.82, .62], [-2.5, .62]], 1.5, rep(hullM, .5, .5));
    add(body, new T.BoxGeometry(.55, .13, .75), rep(darkM, .5, .5), 0, 1.4, -1.35, -.16); [-1, 1].forEach(s => add(body, new T.BoxGeometry(.14, .06, .12), trim, s * .5, 1.18, -2.05));
    add(body, new T.BoxGeometry(1.45, .52, .1), rep(darkM, .5, .5), 0, .9, -2.63); for (let i = 0; i < 5; i++) add(body, new T.BoxGeometry(1.2, .035, .04), chrome, 0, .74 + i * .09, -2.7);
    const stripe = GC.decal(T, .5, 1.9, 128, (x, W, H) => { x.fillStyle = '#d9731e'; x.fillRect(W * .15, 0, W * .7, H); x.fillStyle = '#e8e0cc'; x.fillRect(W * .06, 0, W * .06, H); x.fillRect(W * .88, 0, W * .06, H); x.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 60; i++) { x.fillStyle = `rgba(0,0,0,${R() * .8})`; x.fillRect(R() * W, R() * H, 2 + R() * 8, 2 + R() * 10); } });
    stripe.position.set(0, 1.285, -1.68); stripe.rotation.x = -PI / 2 - .17; body.add(stripe);
    [-1, 1].forEach(s => { const door = add(body, new T.BoxGeometry(.1, .62, 1.6), rep(hullM, .5, .5), s * .83, .98, -.12); if (s > 0) intact.push(door); add(body, new T.BoxGeometry(.14, .08, 1.62), trim, s * .83, 1.3, -.12); add(body, new T.BoxGeometry(.2, .28, 1.5), (() => { const m = new T.MeshStandardMaterial({ map: GC.hazard(T), roughness: .7, metalness: .3 }); m.map.repeat.set(1, 3); return m; })(), s * 1.0, .62, 0);
      const num = GC.decal(T, .8, .8, 128, (x, W, H) => { x.fillStyle = '#e8e0cc'; x.beginPath(); x.arc(W / 2, H / 2, W * .44, 0, 7); x.fill(); x.fillStyle = '#1a1a18'; x.font = 'bold 84px Impact, "Arial Black", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('9', W / 2, H / 2 + 4); }); num.position.set(s * .885, .98, -.15); num.rotation.y = s * PI / 2; body.add(num); if (s > 0) intact.push(num); });
    // Rechte Tür fehlt im beschädigten Zustand: Rohrstreben statt Blech
    [[.98, .8], [.98, 1.05], [.98, 1.3]].forEach(([x, y]) => { const b = cylZ(body, .035, .035, 1.5, cage, x, y, -.12, 8); dmg.push(b); });
    add(body, new T.BoxGeometry(1.7, .68, .1), rep(hullM, .5, .5), 0, .98, .84); [-1, 1].forEach(s => { add(body, new T.BoxGeometry(.52, .08, 1.7), rep(hullM, .5, .5), s * .62, 1.04, 1.78); add(body, new T.BoxGeometry(.08, .5, 1.7), rep(darkM, .5, .5), s * .36, .98, 1.78); });
    const nm = stencil('SKARAB', 1.5, .36, 256, '#d9d2bf', 'bold 100px Impact, "Arial Black", sans-serif'); nm.position.set(.62, 1.09, 1.78); nm.rotation.set(-PI / 2, 0, PI / 2); body.add(nm);
    // Spritzschutz / Kotflügel über den Rädern
    HX.forEach((x, i) => { const z = HZ[i], s = Math.sign(x); add(body, new T.CylinderGeometry(.92, .92, 1.12, 30, 1, true, .09 * PI, .82 * PI).rotateZ(PI / 2), fendM, x + s * .02, .66, z); add(body, new T.TorusGeometry(.92, .035, 6, 28, PI), trim, x + s * .58, .66, z, 0, PI / 2, 0); });
    // ---------- Armaturenbrett, Windschutz, Lenkrad ----------
    add(body, new T.BoxGeometry(1.5, .34, .46), rep(darkM, .5, .5), 0, 1.24, -.72, -.2);
    [-.62, -.46, -.3].forEach(x => { const g = add(body, new T.CylinderGeometry(.07, .07, .03, 14), bas(0x7fe8ff), x, 1.4, -.62, -.9); g.castShadow = false; });
    const scr = add(body, new T.PlaneGeometry(.52, .22), bas(0x5fe6ff), .12, 1.4, -.63, -.95); scr.castShadow = false; glows.push({ o: { set opacity(v) { scr.material.color.setRGB(.15 + .5 * v, .55 + .4 * v, .62 + .38 * v); } }, b: 1, fn: 1 });
    tube(body, [[-.78, 1.3, -.95], [-.72, 1.7, -1.1], [.72, 1.7, -1.1], [.78, 1.3, -.95]], .035, cage, 24); add(body, new T.PlaneGeometry(1.45, .46), glass, 0, 1.5, -1.03, -.56);
    const sw = new T.Group(); sw.position.set(-.42, 1.4, -.5); sw.rotation.x = -.95; body.add(sw); const swi = new T.Group(); sw.add(swi); add(swi, new T.TorusGeometry(.17, .022, 8, 22), rubber); [0, PI / 2].forEach(r => add(swi, new T.BoxGeometry(.32, .02, .02), trim, 0, 0, 0, 0, 0, r)); cylZ(sw, .03, .03, .35, trim, 0, 0, .18, 8);
    limb(body, [-.42, 1.38, -.55], [-.42, 1.2, -.78], .05, trim);
    // ---------- Sitze und Fahrer ----------
    [-.42, .42].forEach((x, i) => { add(body, new T.BoxGeometry(.52, .12, .56), seatM, x, .8, .02); add(body, new T.BoxGeometry(.52, .66, .12), seatM, x, 1.14, .34, -.14); add(body, new T.BoxGeometry(.3, .22, .1), seatM, x, 1.58, .4, -.14); [-1, 1].forEach(s => add(body, new T.BoxGeometry(.06, .5, .14), seatM, x + s * .27, 1.08, .28, -.14));
      [-1, 1].forEach(s => add(body, new T.BoxGeometry(.06, .6, .015), rep(orangeM, .3, .3), x + s * .14, 1.2, .26, -.14, 0, -s * .2)); });
    { const dx = -.42, jk = rep(orangeM, .5, .5), hel = new T.MeshStandardMaterial({ color: 0xf0eee8, metalness: .3, roughness: .4 }), pants = new T.MeshStandardMaterial({ color: 0x2a3140, roughness: .9, metalness: 0 });
      add(body, new T.BoxGeometry(.5, .64, .34), jk, dx, 1.3, .2); add(body, new T.BoxGeometry(.52, .1, .36), rubber, dx, 1.02, .2); add(body, new T.SphereGeometry(.17, 14, 10), skin, dx, 1.8, .16);
      add(body, new T.SphereGeometry(.215, 16, 10, 0, PI * 2, 0, PI * .6), hel, dx, 1.82, .16); add(body, new T.BoxGeometry(.3, .1, .1), new T.MeshStandardMaterial({ color: 0x0c1014, metalness: .9, roughness: .1 }), dx, 1.82, -.02); add(body, new T.TorusGeometry(.19, .018, 6, 14), rubber, dx, 1.82, .16, PI / 2);
      [-1, 1].forEach(s => { limb(body, [dx + s * .27, 1.5, .2], [dx + s * .17, 1.46, -.5], .1, jk); limb(body, [dx + s * .13, .95, .3], [dx + s * .14, .98, -.3], .17, pants); limb(body, [dx + s * .14, .98, -.3], [dx + s * .14, .78, -.8], .15, pants); add(body, new T.BoxGeometry(.14, .1, .26), rubber, dx + s * .14, .72, -.84); add(body, new T.SphereGeometry(.06, 8, 6), rubber, dx + s * .17, 1.46, -.5); }); }
    // ---------- Überrollkäfig ----------
    const cg = (pts, r = .042) => tube(body, pts, r, cage, 48, .08);
    cg([[-.95, .62, .35], [-.95, 1.9, .35], [-.8, 2.3, .35], [.8, 2.3, .35], [.95, 1.9, .35], [.95, .62, .35]]); cg([[-.92, 1.1, -.9], [-.8, 2.0, -1.0], [-.62, 2.28, -1.04], [.62, 2.28, -1.04], [.8, 2.0, -1.0], [.92, 1.1, -.9]]);
    [-1, 1].forEach(s => { cg([[s * .8, 2.3, .35], [s * .66, 2.28, -1.04]]); cg([[s * .95, 1.4, .35], [s * .93, 1.42, -.9]]); cg([[s * .85, 2.2, .35], [s * .88, 1.25, 1.05], [s * .9, 1.06, 2.3]], .036); cg([[s * .95, 1.0, .35], [s * .93, 1.05, -.9]], .035); cg([[s * .93, 1.5, .35], [s * .8, 2.2, -1.0]], .03); });
    cg([[-.93, 1.95, .35], [.93, 1.0, .35]], .03); cg([[.93, 1.95, .35], [-.93, 1.0, .35]], .03);
    [[-1, 1.95], [1, 1.95]].forEach(([s]) => add(body, new T.CylinderGeometry(.062, .062, .5, 10), rep(orangeM, .3, .3), s * .8, 2.0, -1.0, 0, 0, s * -.35));
    [-1, 1].forEach(s => { add(body, new T.CylinderGeometry(.062, .062, .55, 10), rep(orangeM, .3, .3), s * .64, 2.28, -.35, PI / 2 - .01, 0, 0); });
    // Rückspiegel, Dachlichter, Antenne, Parabolspiegel
    [-1, 1].forEach(s => { limb(body, [s * .85, 1.55, -.95], [s * 1.12, 1.58, -.8], .025, trim); add(body, new T.BoxGeometry(.05, .16, .22), trim, s * 1.15, 1.58, -.8); });
    add(body, new T.BoxGeometry(1.4, .1, .12), trim, 0, 2.4, -1.0); for (let i = 0; i < 5; i++) { const x = -.56 + i * .28; cylZ(body, .06, .06, .06, bas(0xfff0c0), x, 2.4, -1.08, 12).castShadow = false; glow(body, 0xfff0c8, 1.1, x, 2.4, -1.12, 0, head); }
    cylZ(body, .014, .02, 2.2, trim, .9, 2.2, 1.1, 6).rotation.set(0, 0, 0); body.children[body.children.length - 1].rotation.x = 0; body.children[body.children.length - 1].rotation.set(0, 0, 0);
    const flag = new T.Mesh(new T.PlaneGeometry(.55, .3, 8, 2), rep(orangeM, .3, .3).clone()); flag.material.side = T.DoubleSide; flag.position.set(1.17, 3.15, 1.1); body.add(flag); flag.castShadow = true;
    const fp = flag.geometry.attributes.position, f0 = Array.from(fp.array); lampFix(.9, 3.32, 1.1);
    function lampFix(x, y, z) { const m = add(body, new T.SphereGeometry(.035, 8, 6), bas(0xff3a2a), x, y, z); m.castShadow = false; glow(body, 0xff3a2a, .5, x, y, z, .9); }
    const dish = new T.Group(); dish.position.set(-.55, 2.5, .2); body.add(dish); add(body, new T.CylinderGeometry(.05, .07, .22, 8), trim, -.55, 2.38, .2); add(dish, new T.SphereGeometry(.34, 18, 8, 0, PI * 2, 0, PI / 2.6), new T.MeshStandardMaterial({ color: 0xcfd4da, metalness: .7, roughness: .4, side: T.DoubleSide }), 0, .1, 0, -.9); add(dish, new T.CylinderGeometry(.012, .012, .4, 5), chrome, 0, .3, -.15, -.9);
    // ---------- Gepäckträger, Kanister, Kiste ----------
    [-1, 1].forEach(s => tube(body, [[s * .85, 1.05, 1.0], [s * .85, 1.5, 1.0], [s * .85, 1.5, 2.5], [s * .85, 1.05, 2.5]], .028, cage, 20, .05)); tube(body, [[-.85, 1.5, 2.5], [.85, 1.5, 2.5]], .028, cage, 10, 0);
    [[.62, 1.5], [.62, 1.95]].forEach(([x, z], i) => { add(body, new T.BoxGeometry(.4, .52, .2), i ? rep(oliveM, .5, .5) : rep(rustM, .5, .5), x, 1.34, z, 0, i * .05 - .03); add(body, new T.CylinderGeometry(.045, .045, .08, 8), chrome, x - .1, 1.64, z); add(body, new T.TorusGeometry(.07, .014, 6, 12, PI), trim, x + .08, 1.62, z, 0, 0, 0); });
    add(body, new T.BoxGeometry(.5, .4, .7), rep(rustM, .5, .5), -.62, 1.28, 1.62, 0, .06); add(body, new T.BoxGeometry(.52, .05, .08), trim, -.62, 1.4, 1.5, 0, .06); add(body, new T.BoxGeometry(.52, .05, .08), trim, -.62, 1.4, 1.78, 0, .06);
    // ---------- Motor, Auspuff, Boost-Düse ----------
    add(body, new T.BoxGeometry(.85, .5, .95), rep(darkM, .5, .5), 0, .92, 1.5);
    [[-.2, 1.24], [.2, 1.24], [-.2, 1.72], [.2, 1.72]].forEach(([x, z]) => { cylZ(body, .13, .13, .34, rep(darkM, .3, .3), x, 1.28, z, 12).rotation.set(0, 0, 0); add(body, new T.CylinderGeometry(.12, .1, .12, 12), chrome, x, 1.52, z); });
    add(body, new T.CylinderGeometry(.2, .2, .26, 14), rep(rustM, .5, .5), 0, 1.6, 1.5); tube(body, [[-.2, 1.5, 1.24], [-.1, 1.6, 1.4], [.1, 1.6, 1.6], [.2, 1.5, 1.72]], .05, copper, 18);
    const fan = new T.Group(); fan.position.set(0, .95, 2.04); body.add(fan); for (let i = 0; i < 5; i++) add(fan, new T.BoxGeometry(.5, .08, .02), trim, 0, 0, 0, 0, 0, i * PI * 2 / 5).position.set(Math.cos(i * 1.2566) * .05, Math.sin(i * 1.2566) * .05, 0); cylZ(body, .27, .27, .04, rubber, 0, .95, 2.0, 14);
    [-1, 1].forEach(s => { tube(body, [[s * .32, .95, 1.2], [s * .5, .78, 1.8], [s * .66, .66, 2.4], [s * .7, .62, 2.62]], .06, copper, 22); cylZ(body, .075, .075, .12, trim, s * .7, .62, 2.64, 10); smokeAt.push({ p: new V3(s * .7, .62, 2.72), steam: 1 }); glow(body, 0xff8a3a, .6, s * .7, .62, 2.66, .5); });
    const bell = new T.LatheGeometry([[.22, 0], [.28, .2], [.4, .5], [.46, .62], [.42, .64], [.24, .1]].map(a => new T.Vector2(a[0], a[1])), 20); add(body, bell, new T.MeshStandardMaterial({ color: 0x3a3532, metalness: .9, roughness: .5, side: T.DoubleSide }), 0, 1.0, 2.45, PI / 2);
    const core = add(body, new T.CircleGeometry(.24, 18), GC.addMat(T, 0xffcf90, .5), 0, 1.0, 2.5).material; glows.push({ o: { set opacity(v) { core.opacity = .2 + .4 * v + boostS * .15; } }, b: 1, fn: 1 });
    const fg = new T.Group(); fg.position.set(0, 1.0, 3.1); body.add(fg); let boost = 0;
    const f1 = add(fg, new T.ConeGeometry(.3, 1, 20, 1, true), GC.flameMat(T, 0xa8d8ff, 0x3a70ff, .6), 0, 0, .5, PI / 2), f2 = add(fg, new T.ConeGeometry(.17, 1, 16, 1, true), GC.flameMat(T, 0xe8f6ff, 0x9fd0ff, .65), 0, 0, .5, PI / 2), f3 = add(fg, new T.ConeGeometry(.44, 1, 16, 1, true), GC.flameMat(T, 0xffb060, 0xff4a10, .45), 0, 0, .5, PI / 2); [f1, f2, f3].forEach(f => f.castShadow = false);
    const fs = glow(fg, 0x8fd0ff, 2.5, 0, 0, .6, .5), bl = new T.PointLight(0x7cc4ff, 0, 10, 1.6); bl.position.set(0, 1, 3.4); body.add(bl);
    [-1, 1].forEach(s => { const t = add(body, new T.BoxGeometry(.22, .12, .06), bas(0xff2a20), s * .78, 1.0, 2.62); t.castShadow = false; glow(body, 0xff3020, .7, s * .78, 1.0, 2.66, .8); });
    const plate = stencil('KY-9', .55, .2, 128, '#222', 'bold 70px Impact, "Arial Black", sans-serif'); plate.position.set(0, .8, 2.64); body.add(plate); add(body, new T.BoxGeometry(.6, .25, .03), chrome, 0, .8, 2.62);
    // ---------- Front: Stoßstange, Winde, Scheinwerfer ----------
    tube(body, [[-.95, .6, -2.4], [-.98, .62, -2.78], [-.5, .62, -2.92], [.5, .62, -2.92], [.98, .62, -2.78], [.95, .6, -2.4]], .06, cage, 40, .05); add(body, new T.BoxGeometry(1.0, .22, .08), rep(rustM, .5, .5), 0, .62, -2.94);
    cylX(body, .11, .11, .55, trim, 0, .64, -2.84, 14); tube(body, [[.2, .56, -2.95], [.32, .46, -3.0], [.46, .36, -2.98]], .018, rubber, 12); add(body, new T.TorusGeometry(.05, .014, 6, 12), chrome, .46, .32, -2.98);
    const lens = [];
    [-1, 1].forEach(s => { cylZ(body, .2, .2, .18, chrome, s * .58, .98, -2.66, 18); const lm = bas(0x8a8a86); lens.push(lm); cylZ(body, .155, .155, .04, lm, s * .58, .98, -2.76, 16).castShadow = false; glow(body, 0xfff0c8, 2.2, s * .58, .98, -2.82, 0, head);
      const fl = bas(0x8a8a86); lens.push(fl); cylZ(body, .09, .09, .1, chrome, s * .86, .66, -2.6, 12); cylZ(body, .07, .07, .04, fl, s * .86, .66, -2.67, 12).castShadow = false;
      const bm = new T.Mesh(new T.ConeGeometry(2.1, 13, 22, 1, true), GC.addMat(T, 0xfff2d0, 0)); bm.rotation.x = PI / 2; bm.position.set(s * .58, .98, -2.8 - 6.5); body.add(bm); head.push({ o: bm, b: 1, beam: 1 }); });
    const sls = [-1, 1].map(s => { const l = new T.SpotLight(0xfff0d0, 0, 50, .42, .6, 1.15); l.position.set(s * .58, 1.0, -2.8); l.target.position.set(s * 1.1, -.25, -20); body.add(l, l.target); return l; });
    // ---------- Beschädigungen ----------
    const crack = GC.decal(T, .5, .5, 128, (x, W, H) => { x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = 2; for (let i = 0; i < 8; i++) { let px = W / 2, py = H / 2, a = i * .8 + R(); x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 3; k++) { px += Math.cos(a) * (8 + R() * 14); py += Math.sin(a) * (8 + R() * 14); a += (R() - .5); x.lineTo(px, py); } x.stroke(); } }); crack.position.set(.58, .98, -2.79); body.add(crack); dmg.push(crack);
    const holes = GC.decal(T, 1, .6, 128, (x, W, H) => { for (let i = 0; i < 6; i++) { const px = 12 + R() * (W - 24), py = 10 + R() * (H - 20); x.fillStyle = '#16120f'; x.beginPath(); x.arc(px, py, 3 + R() * 2.5, 0, 7); x.fill(); x.strokeStyle = 'rgba(230,230,230,.75)'; x.lineWidth = 1.4; x.beginPath(); x.arc(px, py, 5 + R() * 3, 0, 7); x.stroke(); } }); holes.position.set(-.885, 1.02, .3); holes.rotation.y = -PI / 2; body.add(holes); dmg.push(holes);
    const soot = GC.decal(T, 1.2, 1.4, 128, (x, W, H) => { const g = x.createRadialGradient(W / 2, H * .8, 2, W / 2, H * .8, W * .6); g.addColorStop(0, 'rgba(10,8,6,.7)'); g.addColorStop(1, 'rgba(10,8,6,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H); }); soot.position.set(.15, 1.31, -1.9); soot.rotation.x = -PI / 2 - .17; body.add(soot); dmg.push(soot);
    const bump = add(body, new T.BoxGeometry(.5, .2, .1), rep(rustM, .5, .5), -.78, .62, -2.99, 0, .5, 0); dmg.push(bump); tube(body, [[.7, 1.0, -2.74], [.9, .7, -2.8], [1.0, .45, -2.7], [1.04, .32, -2.5]], .018, rubber, 14); dmg.push(body.children[body.children.length - 1]);
    sparkAt.push({ p: new V3(.58, .98, -2.8) }); smokeAt.push({ p: new V3(0, 1.45, 1.5), steam: 0 });
    // Staub am unteren Karosserierand
    [[-.86, PI / 2], [.86, -PI / 2]].forEach(([x, r]) => { const d = GC.decal(T, 1.55, .5, 256, (c, W, H) => { const g = c.createLinearGradient(0, H, 0, 0); g.addColorStop(0, 'rgba(206,164,108,.85)'); g.addColorStop(1, 'rgba(206,164,108,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H); }); d.position.set(x * 1.035, .88, -.12); d.rotation.y = r; body.add(d); });

    // ---------- Räder (Lauffläche, Seitenwand, Felge, Bremse) ----------
    const rimM = new T.MeshStandardMaterial({ color: 0x585e68, metalness: .85, roughness: .38 }), dm = new T.Object3D();
    const wheels = HX.map((x, i) => {
      const s = Math.sign(x), piv = new T.Group(), spin = new T.Group(); piv.position.set(x, RW, HZ[i]); root.add(piv); piv.add(spin);
      add(spin, new T.CylinderGeometry(RW, RW, WW * .92, 32, 1, true), tire, 0, 0, 0, 0, 0, PI / 2); [-1, 1].forEach(k => add(spin, new T.TorusGeometry(RW - .1, .12, 10, 32), tire, k * WW * .42, 0, 0, 0, PI / 2, 0));
      const tr = new T.InstancedMesh(new T.BoxGeometry(WW * .94, .1, .17), tire, 26); for (let k = 0; k < 26; k++) { const a = k / 26 * PI * 2; dm.position.set(0, Math.cos(a) * (RW + .03), Math.sin(a) * (RW + .03)); dm.rotation.set(a, 0, 0); dm.scale.set(1, 1, 1); dm.updateMatrix(); tr.setMatrixAt(k, dm.matrix); } tr.castShadow = tr.receiveShadow = true; spin.add(tr);
      cylX(spin, RW * .64, RW * .64, WW * .66, rimM, 0, 0, 0, 24); [-1, 1].forEach(k => add(spin, new T.TorusGeometry(RW * .64, .04, 8, 24), chrome, k * WW * .33, 0, 0, 0, PI / 2, 0)); cylX(spin, RW * .3, RW * .3, WW * .5, trim, 0, 0, 0, 16);
      for (let k = 0; k < 4; k++) add(spin, new T.BoxGeometry(.05, .09, RW * 1.22), chrome, s * WW * .36, 0, 0, k * PI / 4);
      cylX(spin, .12, .12, .1, rep(orangeM, .3, .3), s * WW * .4, 0, 0, 14); for (let k = 0; k < 5; k++) { const a = k / 5 * PI * 2; cylX(spin, .022, .022, .06, chrome, s * WW * .44, Math.cos(a) * .16, Math.sin(a) * .16, 6); }
      cylX(spin, .3, .3, .035, chrome, -s * .17, 0, 0, 22); add(piv, new T.BoxGeometry(.12, .18, .3), rep(orangeM, .3, .3), -s * .17, .24, .1);
      return { piv, spin, s, front: i < 2, wo: 0 };
    });
    // Aufhängung: Querlenker, Dämpfer, Feder
    const arm = () => add(root, new T.BoxGeometry(.07, .07, 1), trim), springGeo = (() => { const pts = []; for (let k = 0; k <= 70; k++) { const a = k / 70 * PI * 2 * 7; pts.push(new V3(Math.cos(a) * .1, Math.sin(a) * .1, k / 70 - .5)); } return new T.TubeGeometry(new T.CatmullRomCurve3(pts), 220, .014, 5); })();
    const sus = wheels.map((w, i) => ({ a: [arm(), arm(), arm(), arm()], tb: add(root, new T.CylinderGeometry(.075, .075, 1, 10), rep(darkM, .3, .3)), rod: add(root, new T.CylinderGeometry(.045, .045, 1, 8), chrome), sp: add(root, springGeo, new T.MeshStandardMaterial({ color: 0xd9731e, metalness: .6, roughness: .4 })) }));
    sus.forEach(s => { s.tb.geometry = s.tb.geometry.clone().rotateX(PI / 2); s.rod.geometry = s.rod.geometry.clone().rotateX(PI / 2); });
    const M = new T.Matrix4(), tmp = new V3(), P3 = (x, y, z) => new V3(x, y, z).applyMatrix4(M);
    function updateSus() { pivot.updateMatrix(); body.updateMatrix(); M.multiplyMatrices(pivot.matrix, body.matrix);
      wheels.forEach((w, i) => { const s = w.s, z = HZ[i], hx = HX[i], S = sus[i], hub = [new V3(hx - s * .3, RW + .3 + w.wo, z), new V3(hx - s * .3, RW - .26 + w.wo, z)];
        link(S.a[0], P3(s * .55, .95, z - .32), hub[0]); link(S.a[1], P3(s * .55, .95, z + .32), hub[0]); link(S.a[2], P3(s * .55, .5, z - .32), hub[1]); link(S.a[3], P3(s * .55, .5, z + .32), hub[1]);
        const top = P3(s * .72, 1.2, z), low = new V3(hx - s * .45, .5 + w.wo, z), mid = top.clone().lerp(low, .55); link(S.tb, top, mid); link(S.rod, mid, low); S.tb.scale.set(1, 1, top.distanceTo(mid)); S.rod.scale.set(1, 1, mid.distanceTo(low)); link(S.sp, top.clone().lerp(low, .12), top.clone().lerp(low, .9)); }); }
    // ---------- Partikel (in Weltkoordinaten) ----------
    const dust = GC.particles(T, 260), smoke = GC.particles(T, 120), sparks = GC.particles(T, 80, { add: true }), glowP = GC.particles(T, 160, { add: true }); world.add(dust.points, smoke.points, glowP.points, sparks.points); dust.points.renderOrder = 1; smoke.points.renderOrder = 1; glowP.points.renderOrder = 3; sparks.points.renderOrder = 4;
    // ---------- Zustand & Steuerung ----------
    let night = 0, lightsOn = 0, damage = 1, driveOn = false, speed = 0, phi = 0, wr = 0, steer = 0, time = 0;
    let ph = 0, bncS = 0, boostS = 0, accA = 0; const sb = { bob: 0, bobV: 0, pit: 0, pitV: 0, rol: 0, rolV: 0 };
    const Rc = 14, cl = new T.PointLight(0x66ccff, 0, 10, 1.6), ug = new T.PointLight(0x40d0ff, 0, 7, 1.8); cl.position.set(0, 1.9, -.4); body.add(cl); ug.position.set(0, .3, 0); body.add(ug); lights.push({ l: cl, k: .8 }, { l: ug, k: 1.1 });
    const ugl = add(body, new T.PlaneGeometry(1.5, 3.2), GC.addMat(T, 0x40d0ff, .5), 0, .3, .1, -PI / 2); ugl.castShadow = false; glows.push({ o: { set opacity(v) { ugl.material.opacity = .08 + .5 * v; } }, b: 1, fn: 1 });
    const apply = () => { glows.forEach(g => { if (g.fn) g.o.opacity = night; else g.o.material.opacity = g.b * (.4 + .6 * night); }); lights.forEach(l => l.l.intensity = (l.l === cl ? night : night * .9 + .1) * l.k);
      head.forEach(h => { if (h.beam) h.o.material.opacity = lightsOn * (.025 + .035 * night); else h.o.material.opacity = lightsOn * .9; }); lens.forEach(m => m.color.setRGB(.54 + lightsOn * .46, .54 + lightsOn * .44, .52 + lightsOn * .3)); sls.forEach(l => l.intensity = lightsOn * (2.4 + night * 6)); dmg.forEach(d => d.visible = damage > .5); intact.forEach(d => d.visible = damage <= .5); };
    // ---------- Fahrphysik: Reifenhaftung auf Sand, Hangabtrieb, Sprünge unter Planeten-Schwerkraft, Kollision mit Felsen, Reifenspuren ----------
    const EXT = opts.external ? { scale: opts.external.scale || 1, cRef: opts.external.cRef ?? .23 } : null;   // externer Modus: das Spiel liefert die Physik
    const WLD = opts.world, hAt = (x, z) => WLD ? WLD.heightAt(x, z) : 0, WBASE = RZ - FZ, TRK = 2.7; let GR = 6;   // Fahrschwerkraft: Planet 2,4 m/s² wäre bei jeder Dünenkuppe ein Mondsprung; Federung/Anpressdruck erhöhen sie auf 6 (umschaltbar)
    const st = { x: 0, z: 0, ry: 0, vx: 0, vz: 0, vy: 0, y: 0, gp: 0, air: false, vl: 0, vf: 0, om: 0, pit: 0, rol: 0, idle: 3, bump: 0, trk: 0 };
    let engineOn = true, boostE = 1, demo = false, mBoost = 0, sv = 0; st.ca = 0; st.cb = 0; root.rotation.order = 'YXZ';
    const clp = (x, a, b) => Math.min(b, Math.max(a, x)), smo = (a, b, x) => { const q = clp((x - a) / (b - a), 0, 1); return q * q * (3 - 2 * q); };
    const wheelH = (x, z, ry) => { const sn = Math.sin(ry), cs = Math.cos(ry); return HX.map((lx, i) => hAt(x + lx * cs + HZ[i] * sn, z - lx * sn + HZ[i] * cs)); };
    const PROBES = [[-.95, -2.7], [.95, -2.7], [0, -3.05], [-1.3, 0], [1.3, 0], [-.95, 2.7], [.95, 2.7], [0, 3.05]];
    { const h = wheelH(0, 0, 0); st.gp = st.y = (h[0] + h[1] + h[2] + h[3]) / 4; }
    const TN = 480, tkGeo = new T.PlaneGeometry(.42, .62); tkGeo.rotateX(-PI / 2);
    const tkTex = new T.CanvasTexture(GC.cv(32, 64, (x, w, h) => { x.fillStyle = '#fff'; x.fillRect(2, 0, w - 4, h); x.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 6; i++) x.fillRect(0, 4 + i * 10, w, 3); }));
    const tracks = new T.InstancedMesh(tkGeo, new T.MeshStandardMaterial({ color: 0x4a3420, map: tkTex, transparent: true, opacity: .5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, roughness: 1 }), TN);
    tracks.count = 0; tracks.frustumCulled = false; tracks.receiveShadow = true; world.add(tracks);
    let tkN = 0; const tm4 = new T.Matrix4(), tq = new T.Quaternion(), tq2 = new T.Quaternion(), tv = new V3(), tn = new V3(), tsc = new V3(1, 1, 1), UPV = new V3(0, 1, 0);
    const track = (x, z, ry) => { const e = .25; tn.set(hAt(x - e, z) - hAt(x + e, z), 2 * e, hAt(x, z - e) - hAt(x, z + e)).normalize(); tq.setFromUnitVectors(UPV, tn); tq.multiply(tq2.setFromAxisAngle(UPV, ry)); tv.set(x, hAt(x, z) + .02, z); tm4.compose(tv, tq, tsc); tracks.setMatrixAt(tkN % TN, tm4); tkN++; tracks.count = Math.min(tkN, TN); tracks.instanceMatrix.needsUpdate = true; };
    const puffs = (x, y, z, n, spd, up, size) => { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, q = (.3 + Math.random() * .7) * spd; dust.emit(new V3(x + Math.cos(a) * .3, y + .1, z + Math.sin(a) * .3), new V3(Math.cos(a) * q, (.2 + Math.random()) * up, Math.sin(a) * q), 1.1 + Math.random() * 1.2, size * (.7 + Math.random() * .7), 0xcfa670, 0xe2c394); } };
    const driveStep = (dt, I) => {
      if (demo) I = { sy: .7, sx: -.5, jump: false, boost: false };
      const ry = st.ry, sn = Math.sin(ry), cs = Math.cos(ry), fx = -sn, fz = -cs, rx = cs, rz = -sn, grounded = !st.air;
      const vf = st.vx * fx + st.vz * fz, vl = st.vx * rx + st.vz * rz, th = engineOn ? clp(I.sy || 0, -1, 1) : 0, sxi = clp(I.sx || 0, -1, 1), hand = I.jump && engineOn ? 1 : 0;
      const bOn = engineOn && !!I.boost && boostE > .04; boostE = clp(boostE + (bOn ? -dt * .3 : dt * .12), 0, 1); boost = (bOn || mBoost) ? 1 : 0;
      const h0 = wheelH(st.x, st.z, ry), hF = (h0[0] + h0[1]) / 2, hR = (h0[2] + h0[3]) / 2, hL = (h0[0] + h0[2]) / 2, hRt = (h0[1] + h0[3]) / 2, aMaxL = 9 * (1 - .45 * hand);
      let aL = 0, aT = 0;
      if (grounded) {
        const vmax = 25 * (1 + .55 * boostS);
        if (th > .05) { aL += th * 11 * (1 + .9 * boostS) * clp(1 - Math.max(0, vf) / vmax, 0, 1.2); if (vf < -.5) aL += 12 * th; }          // Gas (aus Rückwärtsfahrt kräftig bremsen)
        else if (th < -.05) { if (vf > .8) aL += th * 12; else aL += th * 5 * clp(1 + vf / 8, 0, 1.2); }                                          // Bremsen, danach rückwärts
        aL -= (.05 + .0016 * Math.abs(vf)) * vf + .5 * Math.sign(vf) * smo(0, 1, Math.abs(vf));                                                    // Luft- und Rollwiderstand
        if (hand) aL -= Math.sign(vf) * 3.2 * smo(0, 2, Math.abs(vf));
        aL -= 4.2 * (hF - hR) / WBASE; aT -= 4.2 * (hRt - hL) / TRK;                                                                                // Hangabtrieb
        aT += clp(-vl * (7.5 - 6.1 * hand), -aMaxL, aMaxL);                                                                                         // Seitenführung (Handbremse = Driften)
      }
      const sp = Math.abs(vf); steer += (sxi * .55 * (1 - .7 * smo(3, 24, sp)) - steer) * Math.min(1, dt * 7);                                      // Lenkausschlag nimmt mit dem Tempo ab; links = negativ
      if (grounded) { const k = 1 + .9 * hand, lim = Math.min(2.6, aMaxL * 1.1 / Math.max(sp, 1.5) * k); st.om += (clp(vf / WBASE * Math.tan(-steer * .8) * k, -lim, lim) - st.om) * Math.min(1, dt * 9); }
      st.ry += st.om * dt;
      st.vx += (fx * aL + rx * aT) * dt; st.vz += (fz * aL + rz * aT) * dt;
      // Bewegung mit Hindernissen: Felsen/Rampe höher als 0,55 m und Decken (Rumpf) blockieren, sonst seitlich entlanggleiten
      const blocked = (x, z) => { const s2 = Math.sin(st.ry), c2 = Math.cos(st.ry); for (const [lx, lz] of PROBES) { const px = x + lx * c2 + lz * s2, pz = z - lx * s2 + lz * c2; if (hAt(px, pz) > st.y + (st.air ? 0 : st.ca * lx + st.cb * lz) + .55) return true; if (WLD && WLD.ceilAt && WLD.ceilAt(px, pz) < st.y + 2.5) return true; } return false; };
      const nx = st.x + st.vx * dt, nz = st.z + st.vz * dt, spA = Math.hypot(st.vx, st.vz);
      if (!blocked(nx, nz)) { st.x = nx; st.z = nz; } else if (!blocked(nx, st.z)) { st.x = nx; st.vz *= .4; } else if (!blocked(st.x, nz)) { st.z = nz; st.vx *= .4; } else { st.vx *= -.2; st.vz *= -.2; }
      const spB = Math.hypot(st.vx, st.vz);   // Aufprall: abrupter Tempoverlust -> Funken, Rütteln, Sandwolke
      if (spA > 4 && spB < spA - 2.5) { st.bump = Math.max(st.bump, Math.min(1, (spA - spB) * .08)); sb.bobV -= (spA - spB) * .25; for (let k = 0; k < 3; k++) sparks.emit(root.localToWorld(new V3(rnd() * 1.6, .7 + Math.random() * .4, -3)), new V3(rnd() * 4, 1 + Math.random() * 3, rnd() * 4), .3 + Math.random() * .4, .25, 0xffe9a0, 0xff6a10); }
      // Gelände unter den Rädern: Ebene durch alle vier Auflagepunkte -> Höhe, Nicken, Rollen; Abweichung je Rad = Radhub. Terrain wird zur Rampe (Sprung)
      const h1 = wheelH(st.x, st.z, st.ry), gF = (h1[0] + h1[1]) / 2, gR = (h1[2] + h1[3]) / 2, gL = (h1[0] + h1[2]) / 2, gRt = (h1[1] + h1[3]) / 2, gp = (h1[0] + h1[1] + h1[2] + h1[3]) / 4, ca = (gRt - gL) / TRK, cb = -(gF - gR) / WBASE;
      const yPrev = st.y, vyPrev = st.vy, gpPrev = st.gp, yb = yPrev + vyPrev * dt - .5 * GR * dt * dt; st.gp = gp;
      if (yb > gp + .04) { st.air = true; st.y = yb; st.vy = vyPrev - GR * dt; }
      else { if (st.air) { const imp = Math.max(0, -vyPrev); sb.bobV -= imp * .9; st.bump = Math.max(st.bump, Math.min(1, imp * .1)); if (imp > .8) HX.forEach((lx, i) => { const q = Math.sin(st.ry), c = Math.cos(st.ry); puffs(st.x + lx * c + HZ[i] * q, gp, st.z - lx * q + HZ[i] * c, Math.min(14, 3 + imp * 2 | 0), 1 + imp * .3, .5 + imp * .12, .9); }); } st.air = false; st.y = gp; st.vy = clp((gp - gpPrev) / Math.max(dt, 1e-3) * .75, -9, 8); }   // Federung schluckt einen Teil des Hangimpulses
      const pitT = st.air ? Math.atan2(st.vy, Math.max(2, Math.hypot(st.vx, st.vz))) * .7 : Math.atan(-cb), rolT = st.air ? 0 : Math.atan(ca), kk = st.air ? 2.2 : 16;
      st.ca = ca; st.cb = cb; st.pit += (pitT - st.pit) * Math.min(1, dt * kk); st.rol += (rolT - st.rol) * Math.min(1, dt * kk);
      root.position.set(st.x, st.y, st.z); root.rotation.set(st.pit, st.ry, st.rol);
      wheels.forEach((w, i) => { const tg = st.air ? -.2 : clp(h1[i] - (gp + ca * HX[i] + cb * HZ[i]), -.32, .32); w.wo += (tg - w.wo) * Math.min(1, dt * (st.air ? 4 : 30)); });
      speed = Math.hypot(st.vx, st.vz); sv = vf; accA = aL; st.vf = vf; st.vl = vl;
      // Reifenspuren (alle .6 m), Ruhe-Erkennung für die Kamera
      st.trk += speed * dt; if (st.trk > .6 && !st.air && speed > 2) { st.trk = 0; HX.forEach((lx, i) => { const q = Math.sin(st.ry), c = Math.cos(st.ry); track(st.x + lx * c + HZ[i] * q, st.z - lx * q + HZ[i] * c, st.ry); }); }
      st.idle = speed < .3 && Math.abs(th) < .05 && Math.abs(sxi) < .05 && !hand && !st.air && !demo ? st.idle + dt : 0; st.bump = Math.max(0, st.bump - dt * 3);
      if (WLD) WLD.shake = Math.max(boostS * .1, st.bump * .5);
    };
    // Externer Modus (Spiel): E = { spd, vf, st (Lenkung -1..1, rechts +), boost, comp[4] (Radfederung), air }; Werte in Spiel-Einheiten, Modell skaliert mit EXT.scale
    const extStep = (dt, E) => { const sc = EXT.scale, vfm = (E.vf || 0) / sc; speed = (E.spd || 0) / sc; accA += ((vfm - sv) / Math.max(dt, 1e-3) - accA) * Math.min(1, dt * 8); sv = vfm; steer = (E.st || 0) * .55; boost = E.boost ? 1 : 0; st.air = !!E.air; st.vl = 0;
      wheels.forEach((w, i) => { const tg = clp(((E.comp ? E.comp[i] : EXT.cRef) - EXT.cRef) / sc, -.32, .32); w.wo += (tg - w.wo) * Math.min(1, dt * 30); }); };
    const rnd = () => Math.random() - .5;
    const api = { root, world, follow: true, radius: 3.6, height: 2.4, wheelRadius: RW, hardpoints: HX.map((x, i) => [x, RW, HZ[i]]), info: 'Explorer-Buggy',
      setNight(n) { night = n; apply(); }, setLights(v) { lightsOn = v; apply(); }, setDamage(v) { damage = v; apply(); }, setBoost(v) { boost = v; apply(); }, setDrive(v) { driveOn = v; }, setSteer(v) { steer = v; }, setSpeed(v) { speed = v; },
      update(dt, t, I = {}) {
        time += dt; boostS += (boost - boostS) * Math.min(1, dt * 3.5); const bs = boostS;
        // Fahrphysik (Eingabe I): Position, Ausrichtung am Gelände, Radhub, Tempo
        if (EXT) extStep(dt, I); else driveStep(dt, I); wr += sv / RW * dt; ph += (4 + speed * .9) * dt; bncS += (Math.min(1, speed / 8.5) - bncS) * Math.min(1, dt * 3);
        const c = [0, 1, 2, 3].map(i => Math.sin(ph + i * 1.9 + (i >> 1) * .7) * bncS), vib = .003 + bs * .004;
        const bobT = (c[0] + c[1] + c[2] + c[3]) * .022, pitT = Math.max(-.04, Math.min(.04, accA * .006)) + ((c[0] + c[1]) - (c[2] + c[3])) * .016, rolT = (steer < 0 ? -1 : 1) * Math.min(.06, Math.abs(steer) * speed * speed * .0009) + ((c[1] + c[3]) - (c[0] + c[2])) * .018;
        const sd = (k, tg, w, z, h) => { sb[k + 'V'] += (w * w * (tg - sb[k]) - 2 * z * w * sb[k + 'V']) * h; sb[k] += sb[k + 'V'] * h; };
        for (let q = 0; q < 2; q++) { sd('bob', bobT, 10, .75, dt / 2); sd('pit', pitT, 6.5, .85, dt / 2); sd('rol', rolT, 6.5, .85, dt / 2); }   // gedämpfte Federn
        pivot.position.y = 1.1 + sb.bob + Math.sin(t * 47) * vib; pivot.rotation.x = sb.pit + Math.sin(t * 39) * vib; pivot.rotation.z = sb.rol;

        wheels.forEach(w => { w.spin.rotation.x = -wr; if (w.front) w.piv.rotation.y = -steer * .8; w.piv.position.y = RW + w.wo; }); swi.rotation.z = steer * 2.2 + Math.sin(t * 1.3) * .03;
        updateSus(); fan.rotation.z += dt * (14 + speed * 3); dish.rotation.y = t * .7;
        for (let i = 0; i < fp.count; i++) { const x0 = f0[i * 3]; fp.setZ(i, Math.sin(x0 * 9 - t * 8 - speed * .6) * .06 * (x0 + .28) * (1 + speed * .15)); } fp.needsUpdate = true;
        const L = (1.6 + bs * 2.6) * (1 + .12 * Math.sin(t * 33) + .08 * Math.sin(t * 61)), b = Math.max(0, bs); fg.visible = b > .02; [f1, f2, f3].forEach(f => f.material.uniforms.uT.value = t); f1.scale.set(1, L * b, 1); f1.position.z = L * b * .5; f2.scale.set(1, L * b * .55, 1); f2.position.z = L * b * .275; f3.scale.set(1, L * b * 1.15, 1); f3.position.z = L * b * .575; fs.scale.setScalar(1.4 + b * 1.8); fs.material.opacity = b * .35; bl.intensity = b * (.5 + night * 2);
        // Partikel: Staub, Auspuff, Funken, Boost-Glut
        root.updateMatrixWorld(true); body.updateMatrixWorld(true);
        if (speed > 1 && !st.air && !EXT) wheels.forEach((w, i) => { if (Math.random() < dt * speed * (2.6 + Math.abs(st.vl) * .6)) { const p = root.localToWorld(new V3(HX[i], .05, HZ[i])), back = new V3(0, 0, 1).transformDirection(root.matrixWorld).multiplyScalar(speed * .25); dust.emit(p, new V3(rnd() * 1.6, 1 + Math.random() * 1.8, rnd() * 1.6).add(back), 1 + Math.random() * 1.2, .9 + Math.random() * .8, 0xcfa670, 0xe2c394); } });
        smokeAt.forEach(s => { const wp = body.localToWorld(s.p.clone()); if (s.steam) { if (Math.random() < dt * (3 + speed * .8 + bs * 8)) smoke.emit(wp, new V3(rnd() * .4, .5 + Math.random() * .6, rnd() * .4 + .5), 1.2 + Math.random(), .25 + Math.random() * .25, 0x9a9a9a, 0x666666); }
          else if (damage > .5 && Math.random() < dt * 9) smoke.emit(wp, new V3(rnd() * .5, 1.2 + Math.random(), rnd() * .5), 1.6 + Math.random() * 1.2, .22 + Math.random() * .25, 0x58524c, 0x2a2826); });
        if (damage > .5 && Math.random() < dt * 5) { const wp = body.localToWorld(sparkAt[0].p.clone()); for (let k = 0; k < 4; k++) sparks.emit(wp, new V3(rnd() * 3, 1 + Math.random() * 3, rnd() * 3 - 1), .3 + Math.random() * .4, .25, 0xffe9a0, 0xff6a10); }
        if (b > .1 && Math.random() < dt * 40 * b) { const wp = body.localToWorld(new V3(rnd() * .2, 1.0 + rnd() * .2, 3 + Math.random())); glowP.emit(wp, new V3(rnd(), rnd(), 4 + Math.random() * 6 * b).transformDirection(root.matrixWorld).multiplyScalar(2 + b * 5), .3 + Math.random() * .3, .5 + Math.random() * .4, 0xbfe4ff, 0x4a7ab0); }
        dust.update(dt, { drag: 1.2, buoy: .6, grow: 2.2, alpha: .55 }); smoke.update(dt, { drag: .5, buoy: 1.2, grow: 2.2, alpha: .45 }); sparks.update(dt, { drag: .3, grav: 14, grow: -.4 }); glowP.update(dt, { drag: 1, grow: .3, alpha: .7 });
      } };
    const focus = new V3();
    Object.assign(api, { controls: true, ui: { a: 'BREMSE', boost: 'BOOST' }, focusK: [12, 8], state: st,
      setEngines(v) { engineOn = v > .02; }, setBoost(v) { mBoost = v ? 1 : 0; },
      teleport(x, z, ry = 0) { st.x = x; st.z = z; st.ry = ry; st.vx = st.vz = st.vy = st.om = 0; st.air = false; const h = wheelH(x, z, ry); st.gp = st.y = (h[0] + h[1] + h[2] + h[3]) / 4; st.idle = 0; root.position.set(x, st.y, z); root.rotation.set(0, ry, 0); },
      chase: () => engineOn && st.idle < 2.5 ? { yaw: st.ry, pitch: .22, dist: 12 + .12 * speed + 3 * boostS, fov: 4 * boostS + 3 * smo(12, 32, speed), k: 3.2 } : null,
      hud: () => st.idle < 2.5 ? 'GESCHW ' + String(Math.round(speed * 3.6)).padStart(4) + ' km/h\nBOOST  ' + String(Math.round(boostE * 100)).padStart(4) + ' %' + (st.air ? '\nIN DER LUFT' : '') : '',
      actions: [
        { id: 'lights', label: 'Scheinwerfer', on: false, fn: v => api.setLights(v ? 1 : 0) },
        { id: 'boost', label: 'Boost-Düse', on: false, fn: v => api.setBoost(v ? 1 : 0) },
        { id: 'demo', label: 'Rundfahrt', on: false, fn: v => { demo = v; } },
        { id: 'g', label: 'Schwerkraft', steps: ['Buggy 6,0', 'Planet 2,4', 'Mond 1,6', 'Erde 9,8'], i: 0, fn: i => { GR = [6, 2.4, 1.62, 9.81][i]; } }
      ] });
    Object.defineProperties(api, { focus: { get() { return focus.set(st.x, st.y + 1.2, st.z); } }, heading: { get() { return st.ry; } } });
    apply(); updateSus(); return api;
  }
});
