// zones/basis/models.js – 3D-Modelle der Gebäude. Ein neues Gebäude = Zeile in data.js + eine mk-Funktion hier + Eintrag unten.
// Jede mk-Funktion liefert { g: THREE.Group, upd(dt, t, on, night) }.  on = in Betrieb, night = 0 (Tag) … 1 (Nacht).
// H = Hilfswerkzeuge aus zone.js: T (THREE), A (Mesh anfügen), slab, MS (Material), bas, addM, spr, cv, plate, steel, dark, orange, solarTex
window.BasisModels = function (H) {
  const { T, A, slab, MS, bas, addM, spr, cv, plate, steel, dark, orange, solarTex } = H;
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
  // Fließband: passt sich den Nachbarn an (Gerade, Kurve, T, Kreuzung, Ende), zweispurig. Maske: Bit0 = +x, Bit1 = +z, Bit2 = −x, Bit3 = −z (lokale Achsen = Rasterachsen).
  // Die Pakete (Wasser, Strom, Erz) fährt zone.js als InstancedMesh über die Spuren.
  const beltGeos = {}, beltMat = new T.MeshStandardMaterial({ vertexColors: true, roughness: .8, metalness: .25 });
  function beltGeo(mask) {
    if (beltGeos[mask]) return beltGeos[mask]; const parts = [], H = 2.25, W = 3, hub = 1.5, c = x => new T.Color(x);
    const box = (sx, sy, sz, x, y, z, col) => { const g = new T.BoxGeometry(sx, sy, sz); g.translate(x, y, z); parts.push([g, c(col)]); };
    box(W, .22, W, 0, .11, 0, 0x1b1d22);
    [[1, 0], [0, 1], [-1, 0], [0, -1]].forEach(([dx, dz], k) => {
      if (mask & (1 << k)) {
        const ax = dx !== 0; box(ax ? H : W, .22, ax ? W : H, dx * H / 2, .11, dz * H / 2, 0x1b1d22);                       // Spur
        box(ax ? H : .06, .05, ax ? .06 : H, dx * H / 2, .24, dz * H / 2, 0x7a808c);                                         // Mittellinie zwischen den Spuren
        [-1, 1].forEach(sd => box(ax ? .75 : .18, .42, ax ? .18 : .75, ax ? dx * (hub + .375) : sd * 1.41, .21, ax ? sd * 1.41 : dz * (hub + .375), 0xe8a020));   // Randleisten am Zellrand
      } else { const ax = dx !== 0; box(ax ? .18 : W + .18, .42, ax ? W + .18 : .18, dx * 1.41, .21, dz * 1.41, 0xe8a020); }   // Hub-Seite ohne Anschluss: Randleiste schließt
    });
    let n = 0; parts.forEach(([g]) => { n += g.attributes.position.count; }); const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3), idx = []; let o = 0;
    parts.forEach(([g, cl]) => { const p = g.attributes.position, q = g.attributes.normal; for (let i = 0; i < p.count; i++) { pos.set([p.getX(i), p.getY(i), p.getZ(i)], (o + i) * 3); nor.set([q.getX(i), q.getY(i), q.getZ(i)], (o + i) * 3); col.set([cl.r, cl.g, cl.b], (o + i) * 3); } Array.from(g.index.array).forEach(v => idx.push(v + o)); o += p.count; });
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.BufferAttribute(nor, 3)); geo.setAttribute('color', new T.BufferAttribute(col, 3)); geo.setIndex(idx); return (beltGeos[mask] = geo);
  }
  function mkBelt() {
    const g = new T.Group(), mesh = new T.Mesh(beltGeo(0), beltMat); g.add(mesh);
    const m = { g, mask: 0, setMask(k) { if (k !== m.mask) { m.mask = k; mesh.geometry = beltGeo(k); } }, upd() {} };
    return m;
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
  function mkSilo() {
    const g = new T.Group(); slab(g, 8.4);
    A(g, new T.CylinderGeometry(2.7, 2.9, 6, 18), steel, 0, 3.5, 0); A(g, new T.ConeGeometry(2.8, 1.5, 18), orange, 0, 7.25, 0);
    [1.8, 4.2].forEach(y => A(g, new T.CylinderGeometry(2.95, 2.95, .25, 18), dark, 0, y + .5, 0));
    A(g, new T.BoxGeometry(.35, 6, .12), dark, 0, 3.5, 2.85); A(g, new T.CylinderGeometry(.12, .12, 1.2, 6), steel, 0, 8.5, 0);
    const sg = new T.BoxGeometry(.3, 1, .3); sg.translate(0, .5, 0); const strip = A(g, sg, bas(0x40d0ff), 2.55, .8, -1.6); strip.scale.y = .1;
    const lamp = A(g, new T.SphereGeometry(.22, 8, 6), bas(0xffb030), 0, 9.2, 0), glow = spr(0xffb030, 2.2); glow.position.set(0, 9.2, 0); g.add(glow);
    const m = { g, fill: 0, upd(dt, t, on, night) { strip.scale.y = Math.max(.05, 5.2 * m.fill); lamp.visible = glow.visible = Math.sin(t * 2.2) > -.3; glow.material.opacity = .4 + .5 * night; } };   // fill = Füllstand 0..1 (setzt zone.js)
    return m;
  }
  function mkBattery() {
    const g = new T.Group(); slab(g, 3.8);
    A(g, new T.BoxGeometry(3, 2.6, 2.6), steel, 0, 1.8, 0); A(g, new T.BoxGeometry(3.2, .3, 2.8), dark, 0, 3.25, 0);
    const cells = [-1, 0, 1].map(x => { const gg = new T.BoxGeometry(.6, 1, .12); gg.translate(0, .5, 0); const c = A(g, gg, bas(0x5fe07a), x * .95, .7, 1.36); c.scale.y = .1; return c; });
    A(g, new T.CylinderGeometry(.25, .25, .5, 8), orange, -.8, 3.6, 0); A(g, new T.CylinderGeometry(.25, .25, .5, 8), orange, .8, 3.6, 0);
    const m = { g, chg: 0, upd() { cells.forEach((c, i) => { const k = Math.min(1, Math.max(0, m.chg * 3 - i)); c.scale.y = Math.max(.08, 2.1 * k); c.material.color.setHex(m.chg < .2 ? 0xff6040 : 0x5fe07a); }); } };   // chg = Ladung 0..1
    return m;
  }
  return { silo: mkSilo, battery: mkBattery, torch: mkTorch, dew: mkDew, solar: mkSolar, ref: mkRef, belt: mkBelt, bar: mkBar, fac: mkFac, tur: mkTur };
};
