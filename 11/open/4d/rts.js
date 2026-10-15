// rts.js – Basisbau: Kamera hebt ab, Hologramm-Raster erscheint, Gebäude platzieren, Einheiten leben.
window.RTS = { start(g, o) {
  if (window.RTS.on) return; window.RTS.on = true;
  const { T, scene, camera, renderer, car, pos, H, base, say, msg, chime, dust, hook, mkfx, sun } = g;
  const V3 = T.Vector3, Q = T.Quaternion, Y = new V3(0, 1, 0), $ = id => document.getElementById(id), rnd = Math.random;
  const Lp = (a, b, k) => a + (b - a) * k, cl = (x, a, b) => Math.min(b, Math.max(a, x)), ease = k => k * k * (3 - 2 * k);
  const NG = 18, OFF = 4, CS = 4.5, RF = H(base), ci = (i, j) => (j + OFF) * NG + i + OFF, rv = s => new V3(rnd() - .5, rnd() - .5, rnd() - .5).multiplyScalar(s);
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
  let ax0 = 0, ax1 = 10, ay0 = 0, ay1 = 10;
  const cellAt = (x, z) => { const i = Math.floor(x / CS + 5), j = Math.floor(z / CS + 5); return i < ax0 || j < ay0 || i >= ax1 || j >= ay1 ? null : [i, j]; };

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

  // ---------- Gebäude-Modelle ----------
  function mkTorch() {
    const g = new T.Group(); slab(g, 3.7);
    A(g, new T.CylinderGeometry(.8, 1.1, 1, 10), steel, 0, 1, 0); A(g, new T.CylinderGeometry(.16, .3, 6.2, 8), steel, 0, 4.1, 0);
    A(g, new T.CylinderGeometry(1.25, .45, 1.1, 14, 1, true), MS(0x7a4a2a, { side: T.DoubleSide }), 0, 7.45, 0); A(g, new T.TorusGeometry(1.2, .08, 6, 16), orange, 0, 8, 0, Math.PI / 2);
    A(g, new T.CylinderGeometry(.9, .6, .3, 12), bas(0xff5a10), 0, 7.2, 0);
    const f = new T.Group(); f.position.y = 7.9; g.add(f);
    const c1 = A(f, new T.ConeGeometry(.6, 3.2, 12), addM(0xffe070, .95), 0, 1.6, 0), c2 = A(f, new T.ConeGeometry(1, 4.8, 12), addM(0xff5a10, .6), 0, 2.4, 0), c3 = A(f, new T.ConeGeometry(.5, 5.6, 8), addM(0xff3a08, .25), .15, 3.2, 0), h = spr(0xff8a30, 13);
    h.position.y = 2; f.add(h); const shaft = A(g, new T.ConeGeometry(10, 7.4, 28, 1, true), addM(0xff9a40, .05), 0, 4.2, 0);
    return { g, upd(dt, t, on, night) { const k = on ? 1 : .2, fl = 1 + .18 * Math.sin(t * 17) + .12 * Math.sin(t * 29 + 1); c1.scale.set(1, k * fl, 1); c2.scale.set(1 + .08 * Math.sin(t * 23), k * (fl + .1), 1); c3.scale.set(1, k * (fl + .25), 1); c3.rotation.y = t * 3;
      h.scale.setScalar(13 * (.4 + .6 * k) * (.9 + .1 * fl)); shaft.material.opacity = on ? .02 + .07 * night * fl : 0; } };
  }
  function mkDew() {
    const g = new T.Group(); slab(g, 3.7); A(g, new T.CylinderGeometry(1.1, 1.4, .8, 12), steel, 0, .9, 0);
    for (let i = 0; i < 3; i++) { const a = i * 2.094; A(g, new T.CylinderGeometry(.1, .14, 3.4, 6), dark, Math.sin(a) * 1, 2.4, Math.cos(a) * 1); }
    A(g, new T.CylinderGeometry(2.1, .7, 2.6, 18, 1, true), MS(0x8a949f, { side: T.DoubleSide, roughness: .3 }), 0, 4.9, 0); A(g, new T.CylinderGeometry(.2, .2, 4.2, 8), steel, 0, 5.2, 0);
    const core = A(g, new T.CylinderGeometry(.35, .35, 2, 10), bas(0x40d0ff), 0, 4.7, 0); A(g, new T.SphereGeometry(.45, 12, 8), bas(0x80f0ff), 0, 7.4, 0);
    const h = spr(0x40d0ff, 5); h.position.y = 7.4; g.add(h); A(g, new T.CylinderGeometry(.7, .7, 2.2, 12), MS(0x2b6f8f, { metalness: .3, roughness: .3 }), 1.3, 1.5, 1.2);
    const dr = [0, 1, 2].map(() => A(g, new T.SphereGeometry(.13, 6, 6), bas(0x9ae6ff)));
    return { g, upd(dt, t, on) { const p = on ? .7 + .3 * Math.sin(t * 3) : .15; core.material.color.setRGB(.2 * p, .8 * p, p); h.material.opacity = p; h.scale.setScalar(4 + p * 2);
      dr.forEach((d, i) => { const k = (t * (on ? 1.1 : .2) + i / 3) % 1; d.position.set(Math.sin(i * 2.1) * .5, 5.8 - k * 4.6, Math.cos(i * 2.1) * .5); d.visible = on; }); } };
  }
  function mkSolar() {
    const g = new T.Group(); slab(g, 8.6); const pm = MS(0xffffff, { map: solarTex, metalness: .8, roughness: .2, emissive: 0x0a1a40 }), pv = [];
    [-2.7, 0, 2.7].forEach(x => [-2.5, 2.5].forEach(z => { const p = new T.Group(); p.position.set(x, 1.9, z); g.add(p); A(g, new T.CylinderGeometry(.12, .16, 1.5, 6), dark, x, 1.2, z); A(p, new T.BoxGeometry(2.5, .12, 3.2), pm); A(p, new T.BoxGeometry(2.6, .14, .12), steel, 0, .02, 1.6); pv.push(p); }));
    A(g, new T.BoxGeometry(1.5, 1.7, 1.2), steel, 0, 1.3, 0); const lamp = A(g, new T.SphereGeometry(.2, 8, 6), bas(0x40d0ff), 0, 2.3, .4);
    return { g, upd(dt, t, on) { pv.forEach((p, i) => p.rotation.x = -.45 + Math.sin(t * .25) * .18 + Math.sin(t * .9 + i) * .015); pm.emissiveIntensity = .6 + .4 * Math.sin(t * 1.3); lamp.visible = on || Math.sin(t * 8) > 0; } };
  }
  function mkRef() {
    const g = new T.Group(); slab(g, 8.6);
    A(g, new T.BoxGeometry(5.4, 3.6, 4.2), steel, -1.2, 2.3, -1.4); A(g, new T.BoxGeometry(5.6, .45, 4.4), orange, -1.2, 4.2, -1.4);
    for (let i = 0; i < 4; i++) A(g, new T.BoxGeometry(.9, .5, .1), bas(0xffa040), -3 + i * 1.25, 2.9, .72);
    [[2.6, 1.9], [2.6, -1.3]].forEach(([x, z]) => { A(g, new T.CylinderGeometry(1.3, 1.3, 4.2, 16), MS(0x8a5a30, { metalness: .5, roughness: .45 }), x, 2.6, z);
      [3.6, 1.8].forEach(y => A(g, new T.TorusGeometry(1.32, .1, 6, 16), orange, x, y, z, Math.PI / 2)); A(g, new T.SphereGeometry(1.3, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), steel, x, 4.7, z); });
    A(g, new T.CylinderGeometry(.22, .22, 3.4, 8), dark, 2.6, 3.9, .3, Math.PI / 2); A(g, new T.CylinderGeometry(.5, .7, 7.5, 10), MS(0x6a6f78), -3.3, 4.2, -3); A(g, new T.TorusGeometry(.55, .08, 6, 12), orange, -3.3, 7.9, -3, Math.PI / 2);
    const f = new T.Group(); f.position.set(-3.3, 8.1, -3); g.add(f);
    const c1 = A(f, new T.ConeGeometry(.3, 1.6, 8), addM(0xffe070, .95), 0, .8, 0), c2 = A(f, new T.ConeGeometry(.55, 2.4, 8), addM(0xff5a10, .6), 0, 1.1, 0), h = spr(0xff8a30, 5); h.position.y = 1; f.add(h);
    A(g, new T.CylinderGeometry(.9, .9, .5, 12), dark, 0, 4.7, -1.4); const fan = new T.Group(); fan.position.set(0, 5, -1.4); g.add(fan);
    for (let i = 0; i < 4; i++) A(fan, new T.BoxGeometry(1.5, .06, .3), steel, 0, 0, 0, 0, i * Math.PI / 2);
    const lamp = A(g, new T.SphereGeometry(.2, 8, 6), bas(0xff3020), 1.3, 4.7, .5);
    return { g, upd(dt, t, on) { const k = on ? 1 : .2, fl = 1 + .2 * Math.sin(t * 15) + .1 * Math.sin(t * 27); c1.scale.set(1, k * fl, 1); c2.scale.set(1, k * (fl + .1), 1); h.scale.setScalar(5 * (.4 + .6 * k)); fan.rotation.y += dt * (on ? 7 : .5); lamp.visible = Math.sin(t * 4) > 0; } };
  }
  const beltTex = cv(64, 64, x => { x.fillStyle = '#1b1d22'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#e8b020'; for (let i = 0; i < 2; i++) { x.beginPath(); x.moveTo(8 + i * 32, 12); x.lineTo(28 + i * 32, 32); x.lineTo(8 + i * 32, 52); x.lineTo(14 + i * 32, 52); x.lineTo(34 + i * 32, 32); x.lineTo(14 + i * 32, 12); x.fill(); } });
  beltTex.wrapS = beltTex.wrapT = T.RepeatWrapping;
  function mkBelt() {
    const g = new T.Group(), mat = MS(0xffffff, { map: beltTex, roughness: .8, metalness: .2 });
    A(g, new T.BoxGeometry(4.5, .25, 3), dark, 0, .12, 0); A(g, new T.BoxGeometry(4.4, .2, 2), mat, 0, .32, 0);
    [-1.32, 1.32].forEach(z => A(g, new T.BoxGeometry(4.5, .45, .25), orange, 0, .4, z)); [-2.2, 2.2].forEach(x => A(g, new T.CylinderGeometry(.28, .28, 2.1, 10), steel, x, .45, 0, Math.PI / 2));
    const ore = [0, 1].map(() => A(g, new T.DodecahedronGeometry(.32), MS(0xff8a2a, { emissive: 0x883300, roughness: .6 }), 0, .7, 0));
    return { g, upd(dt, t) { beltTex.offset.x = (-t * .5) % 1; ore.forEach((o, i) => { o.position.x = (((t * .6 + i * .5) % 1) - .5) * 4; o.rotation.y = t * 2; }); } };
  }
  function mkBar() {
    const g = new T.Group(); slab(g, 8.6); A(g, new T.BoxGeometry(6.4, 2.4, 4.4), MS(0x6b6f58, { metalness: .3, roughness: .7 }), 0, 1.7, -.8);
    [-1, 1].forEach(s => A(g, new T.BoxGeometry(3.6, .25, 5), steel, s * 1.55, 3.3, -.8, 0, 0, -s * .38));
    A(g, new T.BoxGeometry(2, 1.8, .15), bas(0xffa040), 0, 1.4, 1.35); A(g, new T.BoxGeometry(2.2, .2, .3), dark, 0, 2.4, 1.4); A(g, new T.CylinderGeometry(.08, .1, 6.5, 6), steel, 3.3, 3.8, 2.8);
    const flag = new T.Mesh(new T.PlaneGeometry(2, 1.2, 8, 3), MS(0x5a2f7a, { side: T.DoubleSide, metalness: 0, roughness: .8, emissive: 0x1a0830 })); flag.position.set(4.3, 6.2, 2.8); g.add(flag);
    A(g, new T.SphereGeometry(.8, 10, 8), MS(0xefe4c4, { metalness: 0, roughness: .9 }), 4.3, 6.2, 2.85).scale.set(.6, .6, .1);
    for (let i = 0; i < 6; i++) A(g, new T.CylinderGeometry(.45, .45, .5, 8), MS(0x9a8660, { metalness: 0, roughness: 1 }), -3 + i * .75, .75, 3.4, 0, 0, Math.PI / 2);
    const lamp = spr(0xffe9b0, 4); lamp.position.set(-3, 3.4, 2); g.add(lamp); const fp = flag.geometry.attributes.position, b0 = Array.from(fp.array);
    return { g, upd(dt, t) { for (let i = 0; i < fp.count; i++) { const x0 = b0[i * 3]; fp.setZ(i, Math.sin(x0 * 3 - t * 5) * .18 * (x0 + 1)); } fp.needsUpdate = true; lamp.material.opacity = .6 + .3 * Math.sin(t * 2); } };
  }
  function mkFac() {
    const g = new T.Group(); slab(g, 8.6); A(g, new T.BoxGeometry(6.6, 3, 4.6), MS(0x3d4048), -.4, 2, -1.2);
    [-2.2, 0, 2.2].forEach(x => { A(g, new T.BoxGeometry(2.1, .2, 4.8), MS(0x5a5e68), x - .4, 3.8, -1.2, 0, 0, -.5); A(g, new T.BoxGeometry(1.9, 1, .1), bas(0x60c8ff), x - .4, 3.1, 1.08); });
    A(g, new T.BoxGeometry(5.6, .7, .1), bas(0xff8a30), -.4, 2, 1.12); const fl = spr(0xff8a30, 7); fl.position.set(-.4, 2.2, 1.5); g.add(fl);
    [[3.1, -2.6, 8], [3.1, -.4, 6.7]].forEach(([x, z, h]) => { A(g, new T.CylinderGeometry(.5, .7, h, 10), MS(0x6a6f78), x, h / 2 + .4, z); A(g, new T.TorusGeometry(.55, .08, 6, 12), orange, x, h + .2, z, Math.PI / 2); });
    A(g, new T.CylinderGeometry(.25, .3, 5, 8), steel, -3.8, 2.9, 2.5); const arm = new T.Group(); arm.position.set(-3.8, 5.3, 2.5); g.add(arm);
    A(arm, new T.BoxGeometry(4.4, .3, .3), orange, 2, 0, 0); const hook = A(arm, new T.CylinderGeometry(.05, .05, 1.6, 4), dark, 3.6, -.8, 0); A(arm, new T.BoxGeometry(.5, .4, .5), steel, 3.6, -1.7, 0);
    [[3.2, 2.8], [3.2, 1.7], [2.2, 2.8]].forEach(([x, z], i) => A(g, new T.BoxGeometry(1, .9, 1), MS(0x8a7a3a, { metalness: .2 }), x, .95 + (i === 2 ? .9 : 0) * 0, z + (i === 2 ? .2 : 0)));
    return { g, upd(dt, t, on) { arm.rotation.y = on ? Math.sin(t * .4) * 1.1 : arm.rotation.y; hook.scale.y = 1 + .15 * Math.sin(t * 1.3); fl.material.opacity = on ? .7 + .3 * Math.sin(t * 9) : .15; } };
  }
  function mkTur() {
    const g = new T.Group(); slab(g, 3.7); A(g, new T.CylinderGeometry(1.5, 1.8, 1.2, 14), steel, 0, 1.1, 0); A(g, new T.TorusGeometry(1.5, .12, 6, 18), orange, 0, 1.75, 0, Math.PI / 2);
    const head = new T.Group(); head.position.y = 2.1; g.add(head); A(head, new T.BoxGeometry(1.7, .9, 1.9), MS(0x5a5f69), 0, .35, 0); A(head, new T.SphereGeometry(.75, 12, 8), steel, 0, .85, .1);
    const bar = [-.4, .4].map(x => { const b = new T.Group(); b.position.set(x, .5, -.8); head.add(b); A(b, new T.CylinderGeometry(.14, .17, 2.8, 8), dark, 0, 0, -1.2, Math.PI / 2); A(b, new T.CylinderGeometry(.22, .22, .5, 8), steel, 0, 0, -2.4, Math.PI / 2); return b; });
    const mz = spr(0xffc060, 3); mz.position.set(0, .5, -3.4); head.add(mz); A(head, new T.CylinderGeometry(.35, .1, .15, 10), steel, .7, 1.3, .4); const led = A(head, new T.SphereGeometry(.1, 6, 6), bas(0xff3020), -.7, .95, .5);
    return { g, upd(dt, t, on) { head.rotation.y = on ? Math.sin(t * .5) * 1.3 : 0; const fl = on && (t + 3) % 9 < .15 ? 1 : 0; mz.material.opacity = fl; bar.forEach(b => b.position.z = -.8 + (fl ? .25 : 0)); led.visible = on ? Math.sin(t * 6) > 0 : false; } };
  }
  const D = {
    dew: { n: 'Taufänger', w: 1, h: 1, c: 35, e: -1, wa: 4, ic: '💧', mk: mkDew, hh: 8.2 },
    solar: { n: 'Energiefeld', w: 2, h: 2, c: 25, e: 6, wa: -1, ic: '☀️', mk: mkSolar, hh: 4.5 },
    ref: { n: 'Raffinerie', w: 2, h: 2, c: 30, e: -2, wa: -1, ic: '🏭', mk: mkRef, hh: 9.5, smoke: new V3(-3.3, 9.2, -3) },
    torch: { n: 'Fackelturm', w: 1, h: 1, c: 28, e: -2, wa: 0, ic: '🔥', mk: mkTorch, hh: 9 },
    belt: { n: 'Fließband', w: 1, h: 1, c: 3, e: 0, wa: 0, ic: '➡️', mk: mkBelt, hh: 1.2 },
    bar: { n: 'Kaserne', w: 2, h: 2, c: 40, e: -1, wa: -1, ic: '🏠', mk: mkBar, hh: 7.5 },
    fac: { n: 'Fabrik', w: 2, h: 2, c: 60, e: -2, wa: -1, am: 4, ic: '⚙️', mk: mkFac, hh: 9, smoke: [new V3(3.1, 8.8, -2.6), new V3(3.1, 7.5, -.4)] },
    tur: { n: 'Geschützturm', w: 1, h: 1, c: 45, e: -2, wa: -1, am: -2, ic: '🎯', mk: mkTur, hh: 5 }
  };
  const PAL = ['belt', 'ref', 'bar', 'dew', 'tur', 'solar', 'fac', 'torch'];

  // ---------- Zentrale (die Kuppel aus Level 11) ----------
  const bl = [], cells = new Array(NG * NG).fill(null), cget = (i, j) => cells[ci(i, j)];
  const zg = new T.Group(); place(zg, 0, 0); scene.add(zg); slab(zg, 8.6);
  const dome = o && o.dome; if (dome) { dome.position.copy(pAt(0, 0, .5)); dome.quaternion.copy(quatAt(0, 0)); dome.scale.setScalar(.72); dome.material.opacity = .85; }
  const dish = new T.Group(); dish.position.set(3, .5, -3); zg.add(dish); A(zg, new T.CylinderGeometry(.14, .2, 2.2, 6), steel, 3, 1.6, -3);
  const bowl = A(dish, new T.SphereGeometry(1.1, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), MS(0xcfd4da, { side: T.DoubleSide, roughness: .3 }), 0, 2.8, 0, -.9);
  A(dish, new T.CylinderGeometry(.04, .04, 1.2, 4), steel, 0, 3.3, 0, -.9);
  [[-3, -3], [-3, 3]].forEach(([x, z]) => { A(zg, new T.CylinderGeometry(.7, .8, 1.4, 10), steel, x, 1.2, z); A(zg, new T.SphereGeometry(.18, 8, 6), bas(0x40d0ff), x, 2.1, z); });
  const hqLamp = A(zg, new T.SphereGeometry(.2, 8, 6), bas(0xff3020), 0, 5.4, 0);
  const hq = { id: 'hq', def: { n: 'Quartier', w: 2, h: 2, e: 4, wa: 0 }, i: 4, j: 4, x: 0, z: 0, built: true, root: zg };
  bl.push(hq); [[4, 4], [5, 4], [4, 5], [5, 5]].forEach(([i, j]) => cells[ci(i, j)] = hq);

  // ---------- Einheiten: Arbeiter + Drohne ----------
  const units = [];
  function mkWorker(sold) {
    const g = new T.Group(), jk = MS(sold ? 0x4a5a3a : 0xe0701c, { metalness: .1, roughness: .7 }), skin = MS(0xd9a77a, { metalness: 0, roughness: .8 }), hel = MS(sold ? 0x2f3a2a : 0xf2f2ee, { metalness: .2 }), jn = MS(0x2a3140, { metalness: .1, roughness: .8 });
    const body = new T.Group(); g.add(body); A(body, new T.BoxGeometry(.7, .9, .45), jk, 0, 1.45, 0); A(body, new T.BoxGeometry(.72, .14, .47), MS(0xf0e060, { emissive: 0x555500 }), 0, 1.2, 0);
    A(body, new T.SphereGeometry(.27, 10, 8), skin, 0, 2.1, 0); A(body, new T.SphereGeometry(.31, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), hel, 0, 2.16, 0);
    A(body, new T.BoxGeometry(.42, .12, .2), MS(0x111418, { metalness: .9, roughness: .1 }), 0, 2.1, -.2); A(body, new T.BoxGeometry(.5, .6, .25), jn, 0, 1.5, .33);
    const limb = (x, y, len, mat) => { const p = new T.Group(); p.position.set(x, y, 0); A(p, new T.BoxGeometry(.24, len, .26), mat, 0, -len / 2, 0); g.add(p); return p; };
    const w = { g, body, lL: limb(-.2, 1.0, 1, jn), lR: limb(.2, 1.0, 1, jn), aL: limb(-.48, 1.85, .85, jk), aR: limb(.48, 1.85, .85, jk) };
    if (sold) A(w.aR, new T.BoxGeometry(.1, .1, 1.2), dark, 0, -.75, -.5); g.scale.setScalar(1.5); return w;
  }
  function spawnWorker(sold, at) {
    const m = mkWorker(sold), root = new T.Group(); root.add(m.g); scene.add(root);
    const u = Object.assign(m, { root, x: at ? at.x + (rnd() - .5) * 2 : (rnd() - .5) * 6, z: at ? at.z - at.def.h * CS / 2 - 1.5 : -8, tx: 0, tz: 0, st: 'idle', wait: .5, ph: rnd() * 6, work: null, sold }); place(root, u.x, u.z); units.push(u); return u;
  }
  function pickFree(u) { for (let k = 0; k < 10; k++) { const x = Lp((ax0 - 5) * CS, (ax1 - 5) * CS, rnd()), z = Lp((ay0 - 5) * CS, (ay1 - 5) * CS, rnd()), c = cellAt(x, z); if (c && !cget(c[0], c[1])) { u.tx = x; u.tz = z; return; } } u.tx = u.x; u.tz = u.z; }
  function wUpd(u, dt, t) {
    let walking = false, working = false;
    if (u.st === 'idle') { u.wait -= dt; if (u.wait <= 0) { const s = u.sold ? null : bl.find(b => !b.built); if (s) { u.work = s; u.tx = s.x + (rnd() - .5) * 3; u.tz = s.z - s.def.h * CS / 2 - 1.8; } else pickFree(u); u.st = 'walk'; } }
    else if (u.st === 'walk') {
      const dx = u.tx - u.x, dz = u.tz - u.z, d = Math.hypot(dx, dz);
      if (d < .4) { u.st = u.work && !u.work.built ? 'work' : 'idle'; u.wait = 1 + rnd() * 3; }
      else { const s = Math.min(d, 3.6 * dt), nx = u.x + dx / d * s, nz = u.z + dz / d * s, c = cellAt(nx, nz); if (c && cget(c[0], c[1]) && !(u.work && cget(c[0], c[1]) === u.work)) { u.st = 'idle'; u.wait = .1; } else { u.x = nx; u.z = nz; u.yaw = Math.atan2(-dx, dz); walking = true; } }
    } else if (u.st === 'work') { if (!u.work || u.work.built) { u.st = 'idle'; u.work = null; u.wait = .6; } else working = true; }
    u.ph += dt * (walking ? 9 : 0); const sw = walking ? .75 : 0;
    u.lL.rotation.x = Math.sin(u.ph) * sw; u.lR.rotation.x = -Math.sin(u.ph) * sw; u.aL.rotation.x = -Math.sin(u.ph) * sw * .8; u.aR.rotation.x = working ? -1.3 + Math.sin(t * 11) * .7 : Math.sin(u.ph) * sw * .8;
    u.body.position.y = walking ? Math.abs(Math.sin(u.ph)) * .06 : 0;
    if (working && rnd() < dt * 6) dust(pAt(u.work.x + (rnd() - .5) * 4, u.work.z, 1.5), rv(2).addScaledVector(base, 2));
    place(u.root, u.x, u.z, u.yaw || 0);
  }
  const drone = new T.Group(); scene.add(drone); A(drone, new T.SphereGeometry(.55, 10, 8), steel); A(drone, new T.TorusGeometry(.6, .06, 6, 14), bas(0x40d0ff), 0, 0, 0, Math.PI / 2);
  const rotors = [[1, 1], [-1, 1], [1, -1], [-1, -1]].map(([a, b]) => { A(drone, new T.CylinderGeometry(.05, .05, .5, 4), dark, a * .55, 0, b * .55, 0, 0, 0); return A(drone, new T.CylinderGeometry(.6, .6, .03, 12), addM(0xcfd8e0, .35), a * .8, .3, b * .8); });
  const dl = spr(0x40d0ff, 3); dl.position.y = -.4; drone.add(dl); drone.scale.setScalar(1.4);
  const cring = new T.Mesh(new T.RingGeometry(3, 3.5, 40), addM(0x40d0ff, .5)); cring.visible = false; scene.add(cring);

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
vec3 col=mix(vec3(.3,.8,.95),vec3(1.,.95,.8),o.a),fill=vec3(.3,.8,1.)*o.r*.05+vec3(.2,1.,.4)*o.g*.22+vec3(1.,.2,.2)*o.b*.24;
gl_FragColor=vec4((col*al+fill)*act*rev,1.);
#include <tonemapping_fragment>
#include <encodings_fragment>
}` });
  const grid = new T.Mesh(gg, gm); grid.frustumCulled = false; grid.renderOrder = 3; grid.visible = false; scene.add(grid);

  // ---------- Zustand, Wirtschaft ----------
  const S = { ore: 400, wk: 1, wcap: 6, sc: 0, eu: 0, ec: 4, wu: 0, wc: 0, au: 0, ac: 0, lvl2: false };
  const sm = mkfx(160, false), emb = mkfx(140, true), pls = [0, 1, 2].map(() => { const l = new T.PointLight(0xff9040, 0, 36, 1.5); scene.add(l); return l; }); let sel = null, armed = null, now = 0, acc = 0, doneM = 0;
  const powered = b => S.eu <= S.ec && (b.def.wa >= 0 || S.wu <= S.wc) && (!(b.def.am < 0) || S.au <= S.ac);
  function recalc() { S.ec = S.lvl2 ? 2 : 0; S.eu = S.wc = S.wu = S.ac = S.au = 0; bl.forEach(b => { if (!b.built) return; const d = b.def; if (d.e > 0) S.ec += d.e; else S.eu -= d.e; if (d.wa > 0) S.wc += d.wa; else S.wu -= d.wa; if (d.am > 0) S.ac += d.am; else if (d.am < 0) S.au -= d.am; }); hud(); }
  function hud() {
    $('c-ore').textContent = '◆ ' + Math.floor(S.ore); $('c-wk').textContent = '👷 ' + S.wk + '/' + S.wcap; $('c-en').textContent = '⚡ ' + S.eu + '/' + S.ec; $('c-wa').textContent = '💧 ' + S.wu + '/' + S.wc;
    $('c-en').classList.toggle('bad', S.eu > S.ec); $('c-wa').classList.toggle('bad', S.wu > S.wc); $('c-am').textContent = '🔸 ' + S.au + '/' + S.ac; $('c-am').classList.toggle('bad', S.au > S.ac);
  }
  function objective() {
    const n = ['dew', 'solar', 'ref'].filter(id => bl.some(b => b.id === id && b.built)).length, ob = $('rt-obj');
    ob.children[0].style.width = n / 3 * 100 + '%'; ob.children[1].textContent = n < 3 ? 'Ziel: Wasser · Energie · Erz (' + n + '/3)' : 'Basis läuft! Weitere Gebäude folgen';
    if (n === 3 && !doneM) { doneM = 1; say('BASIS', 'Die Raffinerie läuft! Das ist erst der Anfang. Der Wurm kommt wieder, bald brauchen wir Türme.'); }
  }
  function flt(txt, x, z, y) { const v = pAt(x, z, y).project(camera), d = document.createElement('div'); d.className = 'rt-f'; d.textContent = txt; d.style.left = ((v.x + 1) / 2 * window.innerWidth) + 'px'; d.style.top = ((1 - v.y) / 2 * window.innerHeight) + 'px'; document.body.appendChild(d); setTimeout(() => d.remove(), 1500); }
  let lastH = 0;
  function hammer() { tone(650 + rnd() * 500, 380, .07, .07); g.nz(g.A.wn, 'bandpass', 2400 + rnd() * 1600, 1300, .06, .09); if (rnd() < .35) tone(170, 85, .1, .12); }
  function why(id, i, j) {
    const d = D[id]; if (i < ax0 || j < ay0 || i + d.w > ax1 || j + d.h > ay1) return 'außerhalb des Rasters';
    for (let a = 0; a < d.w; a++) for (let b = 0; b < d.h; b++) if (cget(i + a, j + b)) return 'Feld belegt';
    const c = base.clone().multiplyScalar(RF), r = pos.clone().sub(c), cx = r.dot(u1), cz = r.dot(u2), bx = (i + d.w / 2 - 5) * CS, bz = (j + d.h / 2 - 5) * CS;
    if (Math.abs(cx - bx) < d.w * CS / 2 + 2.5 && Math.abs(cz - bz) < d.h * CS / 2 + 3.5) return 'Fahrzeug steht im Weg';
    if (S.ore < d.c) return 'zu wenig Erz'; return '';
  }
  function grow(i, j, w, h) {
    let gr = 0;
    if (i <= ax0 && ax0 > -OFF) { ax0 = Math.max(-OFF, ax0 - 2); gr = 1; } if (i + w >= ax1 && ax1 < NG - OFF) { ax1 = Math.min(NG - OFF, ax1 + 2); gr = 1; }
    if (j <= ay0 && ay0 > -OFF) { ay0 = Math.max(-OFF, ay0 - 2); gr = 1; } if (j + h >= ay1 && ay1 < NG - OFF) { ay1 = Math.min(NG - OFF, ay1 + 2); gr = 1; }
    if (gr) { msg('Das Raster wächst'); chime([440, 660], .08); }
  }
  function build(id, i, j) {
    const d = D[id], x = (i + d.w / 2 - 5) * CS, z = (j + d.h / 2 - 5) * CS, root = new T.Group(), m = d.mk(); root.add(m.g);
    const holo = new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(d.w * CS * .95, d.hh, d.h * CS * .95)), new T.LineBasicMaterial({ color: 0x40d0ff, transparent: true, opacity: .9, blending: T.AdditiveBlending, depthWrite: false }));
    holo.position.y = d.hh / 2; root.add(holo); A(root, new T.PlaneGeometry(d.w * CS * 1.3, d.h * CS * 1.3), new T.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false, opacity: .5 }), 0, .05, 0, -Math.PI / 2);
    place(root, x, z); scene.add(root); const b = { id, def: d, i, j, x, z, root, m, holo, built: false, t0: now };
    for (let a = 0; a < d.w; a++) for (let c = 0; c < d.h; c++) cells[ci(i + a, j + c)] = b;
    bl.push(b); b.hn = .35; S.ore -= d.c; hud(); tone(180, 90, .25, .2); g.nz(g.A.wn, 'bandpass', 700, 2400, .7, .07); grow(i, j, d.w, d.h);
  }
  function remove(b) { b.root.parent && b.root.parent.remove(b.root); for (let k = 0; k < NG * NG; k++) if (cells[k] === b) cells[k] = null; bl.splice(bl.indexOf(b), 1); S.ore += Math.floor(b.def.c / 2); recalc(); }

  // ---------- Menü (Mobile First) ----------
  const css = document.createElement('style');
  css.textContent = `#rt-ov{position:fixed;inset:0;z-index:2;display:none}
.rt-lb{position:fixed;left:0;right:0;height:11vh;background:#000;z-index:8;transition:transform 1.4s;pointer-events:none}
#rt-title{position:fixed;left:0;right:0;top:42%;text-align:center;z-index:9;font:400 28px Georgia,serif;letter-spacing:.12em;color:#ffe8c8;opacity:0;transition:opacity 1.2s;text-shadow:0 2px 20px #000;pointer-events:none}
#rt-top{position:fixed;left:0;right:0;top:0;padding:max(8px,env(safe-area-inset-top)) 10px 0;z-index:6;display:flex;flex-direction:column;gap:8px;opacity:0;transition:opacity 1.4s;pointer-events:none}
.chips{display:flex;gap:6px}.chip{flex:1;display:flex;align-items:center;justify-content:center;height:38px;border-radius:19px;background:#241328d9;border:1.5px solid #6b4a3a;color:#ffe8c8;font:600 13px ui-monospace,Menlo,monospace;white-space:nowrap}
.chip.bad{color:#ff7a6a;border-color:#a04030}
#rt-obj{height:34px;border-radius:17px;background:#241328d9;border:1.5px solid #6b4a3a;color:#ffe8c8;display:grid;place-items:center;font:600 13px ui-monospace,Menlo,monospace;position:relative;overflow:hidden}
#rt-obj i{position:absolute;left:0;top:0;bottom:0;width:0;background:linear-gradient(90deg,#c97b2a,#f0b050);transition:width .6s;opacity:.5}#rt-obj span{position:relative}
#rt-panel{position:fixed;left:0;right:0;bottom:0;height:300px;z-index:6;background:linear-gradient(#2b1530f2,#1b0d22fa);border-radius:28px 28px 0 0;border-top:2px solid #8a5a3a;padding:14px 14px max(14px,env(safe-area-inset-bottom));transform:translateY(105%);transition:transform 2.6s cubic-bezier(.2,.7,.2,1);color:#ffe8c8;font:14px ui-monospace,Menlo,monospace;display:flex;flex-direction:column;gap:10px}
#rt-panel.up{transform:none}#rt-info{min-height:44px;font-size:13px;line-height:1.35;opacity:.92}#rt-info h3{margin:0 0 4px;font:700 22px Georgia,serif}
#rt-hp{height:8px;border-radius:4px;background:#0006;overflow:hidden;margin:2px 0}#rt-hp i{display:block;height:100%;width:100%;background:#5fd07a}
#rt-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;flex:1;min-height:0}
.card{position:relative;border-radius:16px;background:#3a2234;border:2px solid #7a5238;color:#ffe8c8;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:2px;padding:20px 2px 6px;font:700 12px ui-monospace,Menlo,monospace;text-align:center;cursor:pointer}
.card em{font-style:normal;font-size:30px;line-height:32px;filter:drop-shadow(0 2px 6px #000a)}.card small{font:600 12px ui-monospace,Menlo,monospace;color:#ffc067}
.card b{position:absolute;top:4px;left:2px;right:2px;font:600 10px ui-monospace,Menlo,monospace;color:#9fe0ff;white-space:nowrap}
.card.off{opacity:.38;filter:grayscale(.6)}.card.sel{border-color:#ffb85a;box-shadow:0 0 14px #ff9a3c88}
.rt-b{position:fixed;right:max(14px,env(safe-area-inset-right));width:56px;height:56px;border-radius:16px;background:#2b1530e6;border:2px solid #7a5238;color:#ffe8c8;font-size:26px;z-index:6;display:grid;place-items:center;opacity:0;transition:opacity 1.4s;pointer-events:none}
#rt-exit{display:none;left:50%;transform:translateX(-50%);bottom:calc(150px + env(safe-area-inset-bottom));width:auto;height:auto;border-radius:14px;padding:12px 20px;font-size:14px}
.rt-f{position:fixed;z-index:7;pointer-events:none;color:#ffd060;font:700 16px ui-monospace,Menlo,monospace;text-shadow:0 1px 6px #000;animation:rtf 1.4s forwards;transform:translate(-50%,0)}@keyframes rtf{to{transform:translate(-50%,-46px);opacity:0}}
#rt-car{border-color:#3fb8d8;animation:rtp 2.4s infinite}@keyframes rtp{0%,100%{box-shadow:0 0 0 0 #40d0ff00}50%{box-shadow:0 0 16px 2px #40d0ff77}}`;
  document.head.appendChild(css);
  const root = document.createElement('div');
  root.innerHTML = `<div id="rt-ov"></div><div class="rt-lb" id="rt-l1" style="top:0;transform:translateY(-100%)"></div><div class="rt-lb" id="rt-l2" style="bottom:0;transform:translateY(100%)"></div>
<div id="rt-title">NOTFALLBASIS ONLINE</div>
<div id="rt-top"><div class="chips"><div class="chip" id="c-ore"></div><div class="chip" id="c-wk"></div><div class="chip" id="c-en"></div><div class="chip" id="c-wa"></div><div class="chip" id="c-am"></div></div><div id="rt-obj"><i></i><span></span></div></div>
<button class="rt-b" id="rt-sun" style="bottom:458px">🌙</button><button class="rt-b" id="rt-ctr" style="bottom:392px">⌖</button><button class="rt-b" id="rt-car" style="bottom:326px"><svg viewBox="0 0 64 40" width="46" height="29" style="filter:drop-shadow(0 0 5px #40d0ff88)"><defs><linearGradient id="rtcg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffc068"/><stop offset="1" stop-color="#d9531e"/></linearGradient></defs><path d="M4 27 L9 19 L22 18 L27 11 L43 11 L47 18 L58 20 L62 27 Z" fill="url(#rtcg)" stroke="#2a1408" stroke-width="1.6" stroke-linejoin="round"/><path d="M27 18 L31 12.5 L42 12.5 L45 18 Z" fill="#7fe3ff" opacity=".9"/><path d="M25 11 L26 4 L44 4 L47 18" fill="none" stroke="#e8e0d0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M62 24 L64 19 L64 29 Z" fill="#fff6c0" opacity=".85"/><circle cx="60" cy="23" r="2.2" fill="#fff6c0"/><line x1="9" y1="37" x2="56" y2="37" stroke="#40d0ff" stroke-width="2.2" stroke-linecap="round" opacity=".85"/><g fill="#17171b" stroke="#ff9a3c" stroke-width="2.2"><circle cx="15" cy="30" r="7.5"/><circle cx="50" cy="30" r="7.5"/></g><g fill="#ff9a3c"><circle cx="15" cy="30" r="2.6"/><circle cx="50" cy="30" r="2.6"/></g></svg></button>
<div id="rt-panel"><div id="rt-info"></div><div id="rt-cards"></div></div><button class="btn" id="rt-exit"><svg viewBox="0 0 24 24" width="20" height="20" style="vertical-align:-4px;margin-right:8px"><path d="M10 4H5v16h5M14 8l5 4-5 4M19 12H9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>Aussteigen</button>`;
  document.body.appendChild(root);
  ['rt-panel', 'rt-ctr', 'rt-car', 'rt-sun', 'rt-exit'].forEach(id => $(id).addEventListener('pointerdown', e => e.stopPropagation()));
  const card = (a, ic, name, cost, top, cls = '') => `<div class="card ${cls}" data-a="${a}"><b>${top || ''}</b><em>${ic}</em>${name}<small>${cost}</small></div>`;
  const badge = d => (d.e ? '⚡' + (d.e > 0 ? '+' : '') + d.e + ' ' : '') + (d.wa ? '💧' + (d.wa > 0 ? '+' : '') + d.wa + ' ' : '') + (d.am ? '🔸' + (d.am > 0 ? '+' : '') + d.am : '');
  function render() {
    const inf = $('rt-info'); let cs = '';
    if (sel && sel.b) {
      const b = sel.b; inf.innerHTML = `<h3>${b.def.n}</h3><div id="rt-hp"><i></i></div>${b.built ? (b.id === 'hq' ? 'Zentrale · ⚡+' + S.ec + ' Kapazität' : b.id === 'belt' ? 'Liefert +1 Erz an angrenzende Raffinerien' : powered(b) ? 'In Betrieb' : 'Außer Betrieb: ' + (S.eu > S.ec ? 'Energie fehlt' : S.wu > S.wc ? 'Wasser fehlt' : 'Munition fehlt')) : 'Wird gebaut …'}`;
      if (b.id === 'hq') cs = card('worker', '👷', 'Arbeiter', '◆ 18', S.wk + '/' + S.wcap, S.ore < 18 || S.wk >= S.wcap ? 'off' : '') + card('lvl2', '⬆️', S.lvl2 ? 'Stufe 2 ✓' : 'Ausbau', '◆ 84', 'Stufe 2', S.lvl2 || S.ore < 84 ? 'off' : '');
      else { if (b.id === 'bar') cs += card('sold', '🪖', 'Soldat', '◆ 25', S.sc + '/6', S.sc >= 6 || S.ore < 25 ? 'off' : ''); if (b.id === 'belt') cs += card('rot', '🔄', 'Drehen', '', ''); cs += card('demo', '🧰', 'Abriss', '+◆ ' + Math.floor(b.def.c / 2), ''); }
    } else {
      const c = sel && sel.c; inf.textContent = c ? 'Feld ' + (c[0] + 1) + '/' + (c[1] + 1) + ' gewählt. Gebäude antippen = sofort bauen.' : 'Tippe auf ein Feld im Raster, dann auf ein Gebäude.';
      cs = PAL.map(id => { const d = D[id], w = c ? why(id, c[0], c[1]) : (S.ore < d.c ? 'zu wenig Erz' : ''); return card('b:' + id, d.ic, d.n, '◆ ' + d.c, badge(d), w ? 'off' : ''); }).join('');
    }
    $('rt-cards').innerHTML = cs;
  }
  function refreshOcc() {
    occ.fill(0); for (let k = 0; k < NG * NG; k++) if (cells[k]) occ[k * 4] = 255;
    if (sel && sel.c) occ[ci(sel.c[0], sel.c[1]) * 4 + 3] = 255;
    if (sel && sel.b) for (let k = 0; k < NG * NG; k++) if (cells[k] === sel.b) occ[k * 4 + 3] = 255;
    occT.needsUpdate = true;
  }
  const upd = () => { render(); refreshOcc(); };
  function act(a) {
    if (a.startsWith('b:')) { const id = a.slice(2); if (!sel || !sel.c) { msg('Erst ein Feld im Raster antippen'); return; }
      const w = why(id, sel.c[0], sel.c[1]); if (w) { msg(D[id].n + ': ' + w); return; } build(id, sel.c[0], sel.c[1]); sel = null; upd(); }
    else if (a === 'worker') { if (S.wk >= S.wcap) return msg('Keine freien Unterkünfte'); if (S.ore < 18) return msg('Zu wenig Erz'); S.ore -= 18; S.wk++; spawnWorker(); chime([660, 880], .1); hud(); render(); }
    else if (a === 'sold' && sel && sel.b) { if (S.sc >= 6) return msg('Kaserne voll'); if (S.ore < 25) return msg('Zu wenig Erz'); S.ore -= 25; S.sc++; spawnWorker(true, sel.b); chime([392, 523], .1); hud(); render(); }
    else if (a === 'lvl2') { if (S.lvl2 || S.ore < 84) return; S.ore -= 84; S.lvl2 = true; S.wcap = 10; recalc(); chime([440, 554, 659, 880], .12); render(); }
    else if (a === 'rot' && sel && sel.b) { const b = sel.b; b.rot = ((b.rot || 0) + 1) % 4; place(b.root, b.x, b.z, b.rot * Math.PI / 2); tone(500, 600, .05, .06); }
    else if (a === 'demo' && sel && sel.b) { remove(sel.b); sel = null; upd(); }
  }
  $('rt-cards').addEventListener('click', e => { const c = e.target.closest ? e.target.closest('.card') : null; if (c && c.dataset.a) act(c.dataset.a); });

  // ---------- Kamera & Eingabe ----------
  let mode = 'rts', k = 0, kd = 6, fx = 0, fz = 0, dist = 66, ct = 0, last = '';
  const pitch = .95, rc = new T.Raycaster(), cmat = new T.Matrix4(), qR = new Q();
  function pose(yawOff) {
    const d = dirAt(fx, fz), f = pAt(fx, fz, 0), fw = u2.clone().applyAxisAngle(d, yawOff); fw.addScaledVector(d, -fw.dot(d)).normalize();
    return { f, d, cp: f.clone().addScaledVector(fw, -dist * Math.cos(pitch)).addScaledVector(d, dist * Math.sin(pitch)) };
  }
  const panBy = (dx, dy) => { const s = dist * .0026; fx = cl(fx - dx * s, (ax0 - 5) * CS, (ax1 - 5) * CS); fz = cl(fz + dy * s * 1.2, (ay0 - 5) * CS, (ay1 - 5) * CS); };
  function tap(x, y) {
    rc.setFromCamera(new T.Vector2(x / window.innerWidth * 2 - 1, -(y / window.innerHeight) * 2 + 1), camera);
    if (rc.intersectObject(car, true).length) { enterCar(); return; }
    const p = rc.ray.intersectSphere(new T.Sphere(new V3(), RF), new V3()); if (!p) return;
    const r = p.sub(base.clone().multiplyScalar(RF)), c = cellAt(r.dot(u1), r.dot(u2));
    if (!c) { sel = null; armed = null; upd(); return; }
    const b = cget(c[0], c[1]); sel = b ? { b } : { c }; upd(); tone(900, 700, .05, .05);
  }
  const ov = $('rt-ov'), pt = new Map(); let moved = 0;
  ov.addEventListener('pointerdown', e => { e.stopPropagation(); pt.set(e.pointerId, { x: e.clientX, y: e.clientY, t: Date.now() }); moved = 0; });
  ov.addEventListener('pointermove', e => { e.stopPropagation(); const p = pt.get(e.pointerId); if (!p) return;
    if (pt.size === 1) { const dx = e.clientX - p.x, dy = e.clientY - p.y; panBy(dx, dy); moved += Math.abs(dx) + Math.abs(dy); }
    else if (pt.size === 2) { const o2 = [...pt.entries()].find(([id]) => id !== e.pointerId)[1], d0 = Math.hypot(p.x - o2.x, p.y - o2.y), d1 = Math.hypot(e.clientX - o2.x, e.clientY - o2.y); if (d1 > 0) dist = cl(dist * d0 / d1, 26, 150); moved = 99; }
    p.x = e.clientX; p.y = e.clientY; });
  ov.addEventListener('pointerup', e => { e.stopPropagation(); const p = pt.get(e.pointerId); pt.delete(e.pointerId); if (p && moved < 10 && Date.now() - p.t < 450 && !pt.size) tap(e.clientX, e.clientY); });
  ov.addEventListener('pointercancel', e => pt.delete(e.pointerId));
  ov.addEventListener('wheel', e => { e.preventDefault(); dist = cl(dist * (1 + e.deltaY * .001), 26, 150); }, { passive: false });
  const keys = {}; window.addEventListener('keydown', e => keys[e.code] = 1); window.addEventListener('keyup', e => keys[e.code] = 0);
  $('rt-ctr').addEventListener('click', () => { fx = fz = 0; });
  $('rt-sun').addEventListener('click', () => { if (!sun) return; if (base.dot(sun) > .2) sun.copy(base).multiplyScalar(-.5).addScaledVector(u2, .866).normalize(); else sun.copy(base).multiplyScalar(.75).addScaledVector(u2, .66).normalize(); $('rt-sun').textContent = base.dot(sun) > .2 ? '🌙' : '☀️'; });
  $('rt-car').addEventListener('click', () => enterCar());
  $('rt-exit').addEventListener('click', () => exitCar());
  function enterCar() { if (mode !== 'rts' || k < .95) return; mode = 'drive'; kd = 2.6; g.freeze(false); armed = null; msg('Du sitzt im Explorer'); chime([330, 440], .1); }
  function exitCar() { if (mode !== 'drive') return; if (pos.distanceTo(pAt(0, 0, 0)) > 90) { msg('Zu weit von der Basis entfernt'); return; } mode = 'rts'; kd = 2.6; g.freeze(true); chime([440, 330], .1); }
  function apply(key) {
    const rtsF = mode === 'rts' && k > .97, drv = mode === 'drive' && k < .03, show = mode === 'rts' && k > .6;
    $('rt-panel').classList.toggle('up', rtsF); ov.style.display = mode === 'rts' && k > .95 ? 'block' : 'none';
    ['rt-top', 'rt-ctr', 'rt-car', 'rt-sun'].forEach(id => { $(id).style.opacity = show ? 1 : 0; }); ['rt-ctr', 'rt-car', 'rt-sun'].forEach(id => { $(id).style.pointerEvents = show ? 'auto' : 'none'; });
    $('rt-exit').style.display = drv ? 'block' : 'none';
    ['bo', 'ju', 's'].forEach(id => { const el = $(id); if (el) el.style.display = mode === 'drive' ? '' : 'none'; });
  }

  // ---------- Start: Kamerafahrt ----------
  ['m', 's', 'h', 'bo', 'ju'].forEach(id => { const el = $(id); if (el) el.style.display = 'none'; });
  const mu = $('mu'); if (mu) { mu.style.left = 'auto'; mu.style.right = '14px'; mu.style.top = 'calc(max(8px,env(safe-area-inset-top)) + 96px)'; }
  if (g.crater) g.crater.visible = false; if (g.sunk) g.sunk(.3); g.freeze(true);
  spawnWorker(); recalc(); objective(); render(); refreshOcc();
  $('rt-l1').style.transform = 'none'; $('rt-l2').style.transform = 'none'; chime([196, 294, 392, 587], .12);
  say('BASIS', 'Kamera online. Tippt auf ein Feld im Hologramm-Raster und baut: erst Wasser, dann Energie, dann die Raffinerie.');

  hook((dt, tt) => {
    now = tt; ct += dt;
    const kt = mode === 'rts' ? 1 : 0; if (k !== kt) k = cl(k + Math.sign(kt - k) * dt / kd, 0, 1); if (kd > 3 && k >= 1) kd = 2.6;
    const e = ease(k);
    if (k > 0) {
      const P = pose((1 - e) * .9); cmat.lookAt(P.cp, P.f, P.d); qR.setFromRotationMatrix(cmat);
      camera.position.lerp(P.cp, e); camera.quaternion.slerp(qR, e); camera.fov = Lp(camera.fov, 38, e); camera.updateProjectionMatrix();
    }
    if (mode === 'rts') { const s = dt * 14; if (keys.KeyA || keys.ArrowLeft) fx -= s; if (keys.KeyD || keys.ArrowRight) fx += s; if (keys.KeyW || keys.ArrowUp) fz += s; if (keys.KeyS || keys.ArrowDown) fz -= s; fx = cl(fx, (ax0 - 5) * CS, (ax1 - 5) * CS); fz = cl(fz, (ay0 - 5) * CS, (ay1 - 5) * CS); }
    grid.visible = k > 0; gm.uniforms.uT.value = tt; gm.uniforms.uR.value = cl(ease(cl(k * 1.35 - .2, 0, 1)) * 2.2, 0, 2.2); const gk = Math.min(1, dt * 2.5), mn = gm.uniforms.uMin.value, mx = gm.uniforms.uMax.value; mn.x += (ax0 + OFF - mn.x) * gk; mn.y += (ay0 + OFF - mn.y) * gk; mx.x += (ax1 + OFF - mx.x) * gk; mx.y += (ay1 + OFF - mx.y) * gk;
    if (sel && sel.c) gm.uniforms.uS.value.set(sel.c[0] + OFF + .5, sel.c[1] + OFF + .5, 1); else if (sel && sel.b) gm.uniforms.uS.value.set(sel.b.i + sel.b.def.w / 2 + OFF, sel.b.j + sel.b.def.h / 2 + OFF, 1); else gm.uniforms.uS.value.z = 0;
    $('rt-title').style.opacity = ct > 1 && ct < 4.2 ? 1 : 0; if (ct > 5.5) { $('rt-l1').style.transform = 'translateY(-100%)'; $('rt-l2').style.transform = 'translateY(100%)'; }
    const key = mode + (k > .97 ? 'F' : k < .03 ? '0' : k > .6 ? 'H' : 'M'); if (key !== last) { last = key; apply(key); }
    // Gebäude
    const night = 1 - ease(cl((base.dot(sun) + .12) / .5, 0, 1));
    bl.forEach(b => {
      if (b.id === 'hq') return;
      if (!b.built) { const kk = cl((tt - b.t0) / 2.4, 0, 1); b.m.g.scale.y = Math.max(.02, ease(kk)); b.holo.material.opacity = (1 - kk) * (.7 + .3 * Math.sin(tt * 20));
        if (rnd() < dt * 26) dust(pAt(b.x + (rnd() - .5) * b.def.w * CS, b.z + (rnd() - .5) * b.def.h * CS, .6), rv(2).addScaledVector(base, 1 + rnd() * 2));
        b.hn -= dt; if (b.hn <= 0 && tt > lastH + .12) { b.hn = .2 + rnd() * .3; lastH = tt; hammer(); }
        if (kk >= 1) { b.built = true; b.root.remove(b.holo); b.m.g.scale.y = 1; recalc(); chime([523, 659, 784], .1); tone(110, 40, .35, .28); g.nz(g.A.wn, 'bandpass', 3500, 1200, .6, .1); flt('✔', b.x, b.z, 6); objective(); render(); } }
      const on = b.built && powered(b); b.m.upd(dt, tt, on, night);
      if (on) [].concat(b.def.smoke || []).forEach(sv => { if (rnd() < dt * 12) sm.e(b.root.localToWorld(sv.clone()), base.clone().multiplyScalar(2.5 + rnd() * 2).add(rv(1.2)), 3.5 + rnd() * 2, 3.5 + rnd() * 3); });
    });
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
    // Wirtschaft: Raffinerien liefern Erz
    acc += dt; if (acc > 1.5) { acc = 0; S.ore += 1; bl.forEach(b => { if (b.id === 'ref' && b.built && powered(b)) { const nb = bl.filter(x => x.id === 'belt' && x.built && Math.abs(x.x - b.x) <= b.def.w * CS / 2 + CS / 2 + .1 && Math.abs(x.z - b.z) <= b.def.h * CS / 2 + CS / 2 + .1).length, gain = 4 + nb; S.ore += gain; flt('+' + gain + ' ◆', b.x, b.z, 10); } }); hud(); if (sel && !sel.c) render(); }
    // Einheiten
    units.forEach(u => wUpd(u, dt, tt)); const a = tt * .35;
    place(drone, Math.cos(a) * 15, Math.sin(a) * 15, -a, 10 + Math.sin(tt * 1.7) * 1.2); drone.rotateX(.12); rotors.forEach(r => r.rotation.y += dt * 40);
    dish.rotation.y += dt * .4; hqLamp.visible = Math.sin(tt * 3) > 0;
    if (dome) dome.material.emissiveIntensity = .6 + .3 * Math.sin(tt * 2);
    cring.visible = mode === 'rts' && k > .9; if (cring.visible) { const cu = pos.clone().normalize(); cring.position.copy(pos).addScaledVector(cu, -.6); cring.quaternion.setFromUnitVectors(new V3(0, 0, 1), cu); cring.scale.setScalar(1 + .12 * Math.sin(tt * 3)); cring.material.opacity = .35 + .25 * Math.sin(tt * 3); }
  });
  window.RTS.api = { S, bl, cells, get grid() { return [ax0, ax1, ay0, ay1]; }, pick(b) { sel = { b }; upd(); }, get mode() { return mode; }, get k() { return k; }, select(i, j) { sel = { c: [i, j] }; upd(); }, act, tap, units, enterCar, exitCar };
} };
