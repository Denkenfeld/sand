// objects/flug.js – Flugmodell für das Raumschiff „Kojote“ (wird nach raumschiff.js geladen, raumschiff.js bleibt unverändert)
// Starrkörper mit Federbeinen: Hauptschub, vier senkrechte Hubdüsen (Start/Landung/Schweben), Tragflächen-Wirkung im Flug,
// Stabilisator, Boost, Rolle/Looping/Wende, Fahrwerk und Rampe fahren ein. Absturz = Explosion des Schiffs.
// Achsen am Schiff: Nase = -Z, oben = +Y, rechts = +X. Einheiten: Meter, Sekunden; Schwerkraft 2,4 m/s² wie beim Arbeiter.
(() => {
  const d = Gallery.objects.find(o => o.id === 'raumschiff'); if (!d) return;
  const build0 = d.build;
  d.info = 'Frachtjäger „Kojote“ · fliegbar · Stick lenken · Regler Schub · HOCH/RUNTER Hubdüsen · BOOST · Rolle, Looping, Wende';
  d.cam = { dist: 58, min: 14, max: 160, near: .5, shadow: 30, pitch: .3, yaw: 3.74, auto: true, minY: 1.2 };
  d.build = (T, GC, opts = {}) => { const ship = build0(T, GC, opts); return opts.world ? attach(T, GC, ship, opts) : ship; };

  function attach(T, GC, ship, opts) {
    const V3 = T.Vector3, Q = T.Quaternion, PI = Math.PI, world = opts.world, inner = ship.root, top = new T.Group(), R = GC.rng(77), rr = (a, b) => a + (b - a) * R();
    const cl = (x, a, b) => Math.min(b, Math.max(a, x)), lerp = (a, b, t) => a + (b - a) * t, sm = (a, b, x) => { const t = cl((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }, wrapA = a => a - 2 * PI * Math.floor((a + PI) / (2 * PI));
    const hAt = (x, z) => world.heightAt(x, z), UP = new V3(0, 1, 0), Y0 = 3.6;
    top.add(inner); ship.root = top;
    const o = { update: ship.update, setEngines: ship.setEngines, setNight: ship.setNight, setDamage: ship.setDamage, explode: ship.explode, reset: ship.reset };

    // ---------- Konstanten (Beschleunigungen pro Masse, daher in m/s²) ----------
    const G = 2.4, AMAIN = 20, VZ_UP = 10, VZ_DN = 7, KV = 1.4, POD_MAX = 20, IX = 60, IY = 90, IZ = 75;
    const PADS = [[-3.4, -6.4], [3.4, -6.4], [-4.9, 5.4], [4.9, 5.4]];                                            // Landeteller (Fahrwerk unten)
    const HULL = [[0, 2.1, 0], [0, 2.1, -6], [0, 2.2, 6], [0, 3, -13], [0, 3.3, 10], [-13, 3.7, 0], [13, 3.7, 0], [-7.7, 1.75, 3], [7.7, 1.75, 3], [-7.7, 1.75, 14], [7.7, 1.75, 14], [0, 8, 0], [-5, 5.5, 0], [5, 5.5, 0]];   // Rumpf, Triebwerke, Flügel, Dach

    // ---------- Hubdüsen unter dem Rumpf ----------
    const podM = GC.material(T, 52, { base: [78, 82, 90], accents: [[196, 98, 36], [44, 66, 78]], accentP: .1, metal: .7, burn: 2, pw: [100, 200], ph: [80, 160] });
    const hz = new T.MeshStandardMaterial({ map: GC.hazard(T), roughness: .7, metalness: .3 }), trim = new T.MeshStandardMaterial({ color: 0x2a2d33, metalness: .75, roughness: .42 });
    const bellM = new T.MeshStandardMaterial({ color: 0x3a3532, metalness: .9, roughness: .5, side: T.DoubleSide });
    const pods = [[-2.6, -2.6], [2.6, -2.6], [-2.6, 4.2], [2.6, 4.2]].map(([x, z]) => {
      const g = new T.Group(); g.position.set(x, 1.9, z); inner.add(g); const add = (geo, m, px, py, pz, rx = 0) => { const me = new T.Mesh(geo, m); me.position.set(px, py, pz); me.rotation.x = rx; me.castShadow = me.receiveShadow = true; g.add(me); return me; };
      add(new T.CylinderGeometry(.95, 1.0, 1.1, 20), podM, 0, 0, 0); add(new T.TorusGeometry(.98, .07, 6, 20), trim, 0, .5, 0, PI / 2); add(new T.TorusGeometry(1.0, .07, 6, 20), trim, 0, -.4, 0, PI / 2); add(new T.CylinderGeometry(1.01, 1.01, .22, 20), hz, 0, -.15, 0);
      add(new T.LatheGeometry([[.5, .55], [.62, .3], [.8, 0], [1.0, -.3]].map(a => new T.Vector2(a[0], a[1])), 20), bellM, 0, -.55, 0);
      const core = add(new T.CircleGeometry(.62, 18), GC.addMat(T, 0xffcf90, .0), 0, -.62, 0, PI / 2); core.material.depthWrite = false; core.castShadow = false;
      const fg = new T.Group(); fg.position.set(0, -.85, 0); g.add(fg); const mk = (r, c0, c1, op) => { const m = new T.Mesh(new T.ConeGeometry(r, 1, 18, 1, true), GC.flameMat(T, c0, c1, op)); m.rotation.x = PI; m.castShadow = false; fg.add(m); return m; };
      const f1 = mk(.78, 0xffb060, 0xff5a10, .5), f2 = mk(.46, 0xffffff, 0xffd090, .95), gl = GC.sprite(T, 0xffa060, 4.5, 0); fg.add(gl);
      return { g, fg, f1, f2, gl, core, x, z };
    });
    const podLight = new T.PointLight(0xffa060, 0, 46, 1.4); podLight.position.set(0, .4, .6); inner.add(podLight);

    // ---------- Fahrwerk (schwenkt in den Rumpf), Rampe (fährt ein), Frachtraumtür ----------
    const pivotOf = (name, z) => { const pv = new T.Group(); pv.position.set(0, Y0 - 1.0, z); inner.add(pv); const g = ship.parts[name]; pv.add(g); g.position.set(0, -(Y0 - 1.0), -z); return pv; };
    const gfP = pivotOf('fahrwerkV', -6.4), gbP = pivotOf('fahrwerkH', 5.4);
    const rampP = new T.Group(), cargo = new T.Group(), ang = Math.atan2(Y0 - 1.3 - .1, 6.6); rampP.position.set(0, 2.34, 10.05); rampP.rotation.x = ang; inner.add(rampP, cargo); inner.updateMatrixWorld(true);
    ship.parts.rampe.children.slice().forEach(m => { const gp = m.geometry && m.geometry.parameters, ty = m.geometry && m.geometry.type; if (!gp || m.isSprite) return;
      if (ty === 'BoxGeometry' && (Math.abs(gp.depth - 6.9) < .01 || (Math.abs(gp.width - 3.6) < .01 && Math.abs(gp.height - .3) < .01))) rampP.attach(m);
      else if (ty === 'CylinderGeometry' && Math.abs(gp.radiusTop - .1) < .01 && Math.abs(gp.height - 4.4) < .01) rampP.attach(m);
      else if (m.position.z > 10.6 && ty !== 'PlaneGeometry') cargo.attach(m); else if (ty === 'PlaneGeometry' && m.position.z > 18) cargo.attach(m); });
    const door = new T.Mesh(new T.BoxGeometry(4.2, 2.5, .22), GC.material(T, 61, { base: [196, 186, 166], accents: [[196, 120, 60], [96, 124, 132]], accentP: .1, burn: 1, pw: [100, 200], ph: [80, 160] })); door.castShadow = true; door.visible = false; inner.add(door);

    // ---------- Partikel in Weltkoordinaten (Staub der Düsen, Kondensstreifen) ----------
    const dust = GC.particles(T, 1000), trail = GC.particles(T, 420), spW = GC.particles(T, 160, { add: true }); dust.points.renderOrder = 2; trail.points.renderOrder = 2; top.add(dust.points, trail.points, spW.points);
    const dC0 = new T.Color(0xcaa272), dC1 = new T.Color(0xa88458), tC0 = new T.Color(0xffffff), tC1 = new T.Color(0xdfe8f0), _v = new V3(), _w = new V3(), _p = new V3();
    const innerPts = []; inner.traverse(m => { if (m.isPoints) innerPts.push(m.geometry.attributes.position); });

    // ---------- Zustand ----------
    const S = { p: new V3(), q: new Q(), v: new V3(), w: new V3(), thr: 0, gear: 1, ramp: 1, rampCmd: 1, gearMode: 0, stab: true, inv: false, boostE: 1, boost: 0, man: null, idle: 0, flying: false, hdg: 0, alt: 0, contact: 0, crashed: false, tp: 0, tm: 0, time: 0, why: '', pk: {} };
    let master = 1, night = 0, dmgOn = true;
    const init = () => { S.p.set(0, -.1, 0); S.q.identity(); S.v.set(0, 0, 0); S.w.set(0, 0, 0); S.thr = 0; S.gear = 1; S.ramp = S.rampCmd = 1; S.man = null; S.crashed = false; S.idle = 3; S.flying = false; S.hdg = 0; S.boostE = 1; S.boost = 0; };
    init();
    const f = new V3(), u = new V3(), r = new V3(), a = new V3(), vp = new V3(), tw = new V3(), rw = new V3(), pw = new V3(), vw = new V3(), ww = new V3(), Fc = new V3(), ax = new V3(), qi = new Q(), dq = new Q(), Mo = new T.Matrix4(), Mn = new T.Matrix4(), Mr = new T.Matrix4(), one = new V3(1, 1, 1);
    const WC = new V3(), YW = new V3(), C = { pitch: 0, yaw: 0, roll: 0, up: false, down: false, tau: .22 };

    // ---------- Manöver: Winkel A über Dauer T als Glockenkurve ----------
    const startMan = type => { if (S.man || ship.exploded || S.contact) return; const sx = S.pk.sx || 0, sign = sx < -.2 ? 1 : -1; const spec = { roll: [2 * PI, 1.25, 'z'], loop: [2 * PI, 3.1, 'x'], turn: [PI, 1.0, 'y'] }[type];
      if (type === 'loop') { S.thr = Math.max(S.thr, .9); if (S.v.length() < 55) S.boostE = Math.max(S.boostE, .6); } S.man = { type, A: spec[0], T: spec[1], axis: spec[2], t: 0, sign: type === 'loop' ? 1 : sign }; };

    // ---------- Eingaben -> Steuerbefehle ----------
    const controls = (dt, I) => {
      const K = I.keys || {}, edge = c => { const on = !!K[c], was = !!S.pk[c]; S.pk[c] = on; return on && !was; };
      S.pk.sx = I.sx || 0; if (edge('KeyV')) startMan('roll'); if (edge('KeyB')) startMan('loop'); if (edge('KeyN')) startMan('turn');
      if (I.thr !== null && I.thr !== undefined) S.thr = I.thr; else { if (K.KeyR) S.thr = Math.min(1, S.thr + dt * .5); if (K.KeyF) S.thr = Math.max(0, S.thr - dt * .5); if (K.KeyX) S.thr = 0; }
      const bst = !!I.boost && S.boostE > .04 && master && !S.crashed; S.boostE = cl(S.boostE + (bst ? -dt * .22 : dt * .12), 0, 1); S.boost += ((bst ? 1 : 0) - S.boost) * Math.min(1, dt * 4);
      C.up = !!I.jump; C.down = !!I.down; C.pitch = (S.inv ? 1 : -1) * (I.sy || 0); C.yaw = I.sx || 0; C.roll = (K.KeyQ ? 1 : 0) - (K.KeyE ? 1 : 0);
    };
    // Soll-Drehraten im Körperraum: x = nicken (+ Nase hoch), y = gieren (+ links), z = rollen (+ links)
    const rates = (dt) => {
      f.set(0, 0, -1).applyQuaternion(S.q); u.set(0, 1, 0).applyQuaternion(S.q); r.set(1, 0, 0).applyQuaternion(S.q);
      const spd = S.v.length(), sf = sm(8, 40, spd), lv = 1 - sm(20, 45, spd); let wx = C.pitch * lerp(.8, 1.15, sf), wy = 0, wz = C.roll * 2.6; C.tau = .22;
      { const k = sm(0, .5, u.y), yr = -C.yaw * lerp(.6, .75, sf) * (1 - .4 * sm(60, 140, S.v.length())); YW.set(0, k, 0).addScaledVector(u, 1 - k).normalize().multiplyScalar(yr); YW.applyQuaternion(qi.copy(S.q).invert()); wx += YW.x; wy += YW.y; wz += YW.z; }   // Kurve um die Senkrechte (koordiniert), nicht um die schiefe Schiffsachse
      if (f.x * f.x + f.z * f.z > .08) S.hdg = Math.atan2(-f.x, -f.z);
      if (S.man) { const m = S.man; m.t += dt; const w = m.A * PI / (2 * m.T) * Math.sin(PI * m.t / m.T) * m.sign; C.tau = .08; wx = wy = wz = 0; if (m.axis === 'z') wz = w; else if (m.axis === 'x') wx = w; else wy = w; if (m.t >= m.T) S.man = null; }
      else if (S.stab) {
        if (!C.roll) { const beta = Math.atan2(-r.y, u.y), tgt = C.yaw * .6 * sf, e = wrapA(tgt - beta); wz += -cl(3 * e, -2.6, 2.6); }
        if (!C.pitch) wx += -f.y * (2.2 * lv + 1.4 * (1 - lv)); if (lv > .3) { if (wx > 0 && f.y > .42) wx = 0; if (wx < 0 && f.y < -.42) wx = 0; }
      }
      WC.set(wx, wy, wz);
    };

    // ---------- Physik: ein Teilschritt ----------
    let crashWhy = '';
    const step = h => {
      f.set(0, 0, -1).applyQuaternion(S.q); u.set(0, 1, 0).applyQuaternion(S.q); const spd = S.v.length(), alt = S.alt;
      a.set(0, -G, 0);
      const thrE = master && !S.crashed ? S.thr : 0, tm = Math.pow(thrE, 1.2) * (1 + .8 * S.boost); S.tm = tm; a.addScaledVector(f, AMAIN * tm);                       // Hauptschub
      const vf = S.v.dot(f); a.addScaledVector(S.v, -(.012 + .00115 * spd)); if (u.y > .1) a.addScaledVector(u, G * sm(25, 70, spd) / Math.max(.55, u.y));       // Strömung, Luftwiderstand, Auftrieb der Flügel (trägt das Gewicht, auch in der Kurve)
      let Tp = 0;                                                                                                                                                  // Hubdüsen
      if (master && !S.crashed) { const vtol = 1 - sm(40, 90, spd); let aDes, act;
        if (S.stab) { const vzT = C.up ? VZ_UP : C.down ? -Math.min(VZ_DN, 1.2 + .45 * alt) : 0; act = C.up || alt > 2.2 || (C.down && alt > .4); aDes = cl(G + KV * (vzT - S.v.y), 0, 14); } else { act = C.up; aDes = C.up ? 14 : 0; }
        Tp = act ? cl(aDes / Math.max(.45, u.y), 0, POD_MAX) * vtol : 0; a.addScaledVector(u, Tp); }
      S.tp = Tp / POD_MAX;
      // Bodenkontakt: Federbeine (Landeteller) und harte Rumpfpunkte, Reibung; Drehmomente aus Kraft x Hebel
      tw.set(0, 0, 0); let contact = 0, crash = '';
      if (alt < 24) { ww.copy(S.w).applyQuaternion(S.q); const brake = S.thr < .05 ? 2.4 : 1.1, ext = (1 - S.gear) * 2.6;
        const hit = (lx, ly, lz, pad) => { rw.set(lx, ly, lz).applyQuaternion(S.q); pw.copy(S.p).add(rw); const pen = hAt(pw.x, pw.z) - pw.y; if (pen <= 0) return;
          vw.crossVectors(ww, rw).add(S.v); const vn = vw.y, Fn = pad ? cl(6 * pen - 2.2 * vn, 0, 60) : cl(30 * pen - 6 * vn, 0, 140), sp = Math.hypot(vw.x, vw.z), Ft = Math.min((pad ? brake : .5) * Fn, 8 * sp);
          Fc.set(sp > 1e-4 ? -vw.x / sp * Ft : 0, Fn, sp > 1e-4 ? -vw.z / sp * Ft : 0); a.add(Fc); tw.add(vw.crossVectors(rw, Fc)); contact++;
          if (!crash && -vn > (pad ? 9.5 : 6.5)) crash = pad ? 'Fahrwerk gebrochen' : 'Rumpf aufgeschlagen'; };
        PADS.forEach(([x, z]) => hit(x, ext, z, true)); HULL.forEach(([x, y, z]) => hit(x, y, z, false)); }
      S.contact = contact; if (crash && !S.crashed) { S.crashed = true; crashWhy = crash; }
      // Drehung: Autopilot-Raten (in der Luft), am Boden nur Dämpfung und leichtes Gieren
      const k = 1 - Math.exp(-h / C.tau);
      if (contact) { S.w.multiplyScalar(Math.exp(-2.5 * h)); if (S.thr > .1 && !S.man) S.w.y += (WC.y * .35 - S.w.y) * k; } else if (!S.crashed) { S.w.x += (WC.x - S.w.x) * k; S.w.y += (WC.y - S.w.y) * k; S.w.z += (WC.z - S.w.z) * k; }
      qi.copy(S.q).invert(); tw.applyQuaternion(qi); S.w.x += tw.x / IX * h; S.w.y += tw.y / IY * h; S.w.z += tw.z / IZ * h;
      S.v.addScaledVector(a, h); { const sp0 = S.v.length(); if (sp0 > 3) { const al = Math.min(1, (1.5 * sm(8, 55, sp0) + 2.2 * sm(55, 120, sp0)) * h), ang = Math.acos(cl(S.v.dot(f) / sp0, -1, 1)); vp.copy(f).multiplyScalar(sp0); S.v.lerp(vp, al); S.v.setLength(sp0 * (1 - .12 * ang * al)); } }   // Flugrichtung dreht zur Nase (Tragflächen), Kurven kosten etwas Fahrt
      if (S.v.length() > 260) S.v.setLength(260); S.p.addScaledVector(S.v, h);
      const wl = S.w.length(); if (wl > 1e-6) { dq.setFromAxisAngle(ax.copy(S.w).divideScalar(wl), wl * h); S.q.multiply(dq).normalize(); }
    };

    // ---------- Absturz / Zurücksetzen ----------
    const shakeCb = e => { world.shake = Math.max(0, 1 - e * .7) * Math.exp(-e); };
    const blowUp = cb => { if (ship.exploded) return; S.crashed = true; S.man = null; const g = hAt(S.p.x, S.p.z); S.q.setFromAxisAngle(UP, S.hdg); S.p.y = g; S.v.set(0, 0, 0); S.w.set(0, 0, 0); inner.position.copy(S.p); inner.quaternion.copy(S.q); o.explode(cb || shakeCb); };
    ship.explode = cb => blowUp(cb);
    ship.reset = () => { o.reset(); init(); inner.position.copy(S.p); inner.quaternion.copy(S.q); world.shake = 0; };
    ship.setEngines = v => { master = v > .02 ? 1 : 0; }; ship.setNight = n => { night = n; o.setNight(n); apply(); }; ship.setDamage = v => { dmgOn = v > .5; o.setDamage(v); };
    const apply = () => { const m = night > .5 ? 1 : night > .1 ? .5 : 0; dC0.set(m === 1 ? 0x3a3a4a : m ? 0x9a6a4a : 0xcaa272); dC1.set(m === 1 ? 0x22222e : m ? 0x6a4a36 : 0xa88458); tC0.set(m === 1 ? 0x8890a8 : 0xffffff); tC1.set(m === 1 ? 0x606880 : 0xdfe8f0); };

    // ---------- Bild-Update ----------
    const posP = new V3(), fwd = new V3();
    ship.update = (dt0, t, I = {}) => {
      if (ship.exploded) { o.update(dt0, t); dust.update(dt0, { drag: 1.1, grav: G * .5, grow: 1.8, alpha: .5 }); return; }
      const dt = Math.min(dt0, .05); S.time += dt; Mo.compose(S.p, S.q, one);
      S.alt = Math.max(0, S.p.y - hAt(S.p.x, S.p.z)); controls(dt, I); rates(dt);
      const n = Math.max(1, Math.ceil(dt * 120)), h = dt / n; for (let i = 0; i < n; i++) { S.alt = Math.max(0, S.p.y - hAt(S.p.x, S.p.z)); step(h); if (S.crashed) break; }
      if (S.crashed) { blowUp(); return; }
      const spd = S.v.length(); S.alt = Math.max(0, S.p.y - hAt(S.p.x, S.p.z));
      S.idle = S.contact && spd < 1.2 && S.thr < .03 && !C.up && !S.man ? S.idle + dt : 0; S.flying = !(S.idle > 2.5);
      // Fahrwerk (Auto: unten bei Landung/Tiefflug, oben in der Höhe), Rampe (nur am Boden offen)
      const gt = S.contact && S.alt < 1 ? 1 : S.gearMode === 1 ? 1 : S.gearMode === 2 ? 0 : (S.alt < 30 && spd < 80) || S.alt < 6 ? 1 : (S.alt > 45 || spd > 95) ? 0 : (S.gear > .5 ? 1 : 0);
      S.gear += cl(gt - S.gear, -dt / 1.6, dt / 1.6); const rt = S.alt < 3 && spd < 12 ? S.rampCmd : 0; S.ramp += cl(rt - S.ramp, -dt / 2, dt / 2);
      gfP.rotation.x = (1 - S.gear) * 1.75; gbP.rotation.x = -(1 - S.gear) * 1.75; rampP.scale.z = Math.max(.03, S.ramp); rampP.visible = S.ramp > .04; cargo.visible = S.ramp > .9;
      door.visible = S.ramp < .96; door.scale.y = Math.max(.02, 1 - S.ramp); door.position.set(0, Y0 - .15 + 1.25 - 1.25 * door.scale.y, 10.33);
      // Transform setzen, Partikel der Originalsysteme im Weltraum festhalten (sonst kleben Rauch/Funken am Schiff)
      inner.position.copy(S.p); inner.quaternion.copy(S.q); Mn.compose(S.p, S.q, one); Mr.copy(Mn).invert().multiply(Mo);
      innerPts.forEach(at => { const arr = at.array; for (let i = 0; i < arr.length; i += 3) { _p.set(arr[i], arr[i + 1], arr[i + 2]).applyMatrix4(Mr); arr[i] = _p.x; arr[i + 1] = _p.y; arr[i + 2] = _p.z; } });
      // Hubdüsen: Flammen, Licht, aufgewirbelter Sand
      const tpv = S.tp, flick = .85 + .15 * Math.sin(S.time * 47);
      pods.forEach(p => { p.g.getWorldPosition(posP); const gy = hAt(posP.x, posP.z), hgt = Math.max(.1, posP.y - .85 - gy), len = Math.min(tpv * 9 * flick, hgt * .96), vis = tpv > .03 && len > .15;
        p.fg.visible = vis; if (vis) { p.f1.scale.set(1, len, 1); p.f1.position.y = -len / 2; p.f2.scale.set(1, len * .6, 1); p.f2.position.y = -len * .3; p.f1.material.uniforms.uT.value = p.f2.material.uniforms.uT.value = S.time; p.gl.material.opacity = Math.min(.9, tpv * 1.6) * (.4 + .6 * night); p.gl.scale.setScalar(2.5 + tpv * 5); }
        p.core.material.opacity = Math.min(.8, tpv * 2); const near = 1 - hgt / 26;
        if (tpv > .05 && near > 0) for (let i = 0, nn = R() < dt * 70 * tpv * near ? 1 + (R() < dt * 70 * tpv * near ? 1 : 0) : 0; i < nn; i++) { const an = rr(0, 2 * PI), sp = rr(5, 13) * (.6 + near); dust.emit(_v.set(posP.x + Math.cos(an) * 1.2, gy + .4, posP.z + Math.sin(an) * 1.2), _w.set(Math.cos(an) * sp, rr(.3, 3.2), Math.sin(an) * sp), rr(1.8, 3.4), rr(3, 6.5), dC0, dC1); } });
      podLight.intensity = tpv * 3.2 * (.5 + night) * Math.max(0, 1 - S.alt / 34);
      // Triebwerke blasen auch Sand auf, Kondensstreifen bei hoher Fahrt, Funken beim Schleifen
      fwd.set(0, 0, -1).applyQuaternion(S.q); if (S.alt < 16 && S.tm > .2 && !(S.contact && spd < 1)) [-1, 1].forEach(sd => { _p.set(sd * 7.7, 3.85, 16).applyQuaternion(S.q).add(S.p); const gy = hAt(_p.x, _p.z); if (R() < dt * 60 * S.tm * (1 - S.alt / 16)) dust.emit(_v.set(_p.x + rr(-2, 2), gy + .5, _p.z + rr(-2, 2)), _w.copy(fwd).multiplyScalar(-rr(8, 20) * S.tm).add(_p.set(rr(-5, 5), rr(.5, 3), rr(-5, 5))), rr(1.5, 3), rr(3, 7), dC0, dC1); });
      if (spd > 45) [[-7.7, 3.85, 16.5], [7.7, 3.85, 16.5], [-13.3, 3.5, 2]].forEach(([x, y, z], i) => { if (i === 2 && spd < 70) return; if (R() < dt * 55) { _p.set(x, y, z).applyQuaternion(S.q).add(S.p); trail.emit(_p, _w.set(0, 0, 0), 1.7, 1.1, tC0, tC1); } });
      if (S.contact && spd > 4 && S.alt < 3) HULL.forEach(([x, y, z], i) => { if (i > 10) return; _p.set(x, y, z).applyQuaternion(S.q).add(S.p); if (_p.y < hAt(_p.x, _p.z) + .6 && R() < dt * 30) for (let k = 0; k < 4; k++) spW.emit(_p, _w.set(rr(-6, 6), rr(1, 6), rr(-6, 6)), rr(.3, .8), .35, 0xffe0a0, 0xff6a10); });
      dust.update(dt, { drag: 1.1, grav: G * .5, grow: 2.2, alpha: .5 }); trail.update(dt, { drag: .3, grow: 3.2, alpha: .32 }); spW.update(dt, { drag: .2, grav: G * 2, grow: -.3 });
      world.shake = S.boost * .14;
      o.setEngines(master ? Math.min(1.5, .16 + S.thr * .84 + S.boost * .5) : 0); o.update(dt, t);
    };

    // ---------- Schnittstelle für Galerie/Spiel ----------
    const focus = new V3();
    Object.defineProperties(ship, { focus: { get() { return focus.set(S.p.x, S.p.y + 3.5, S.p.z); } }, heading: { get() { return S.hdg; } }, thr: { get() { return S.thr; } }, flying: { get() { return S.flying; } }, state: { get() { return S; } } });
    ship.controls = true; ship.focusK = [18, 7]; ship.ui = { a: 'HOCH', b: 'RUNTER', boost: 'BOOST', thr: true };
    ship.chase = () => S.flying && !ship.exploded ? { yaw: S.hdg, pitch: .27, dist: 52 + 12 * S.boost + .07 * S.v.length(), fov: 5 * S.boost + 5 * sm(40, 150, S.v.length()), k: 3 } : null;
    ship.shadow = () => { const gy = hAt(S.p.x, S.p.z), sd = world.sunDir, k = Math.max(0, S.p.y + 4 - gy) / Math.max(.3, sd.y); return { x: S.p.x - sd.x * k, z: S.p.z - sd.z * k, y: gy, dist: Math.max(90, k + 60) }; };
    ship.hud = () => { const sp = S.v.length(), wn = S.crashed ? '' : (S.gear < .9 && S.alt < 14 && S.v.y < -1 ? '\n! FAHRWERK' : S.v.y < -10 && S.alt < 45 ? '\n! SINKFLUG' : ''); return S.flying ? 'GESCHW ' + String(Math.round(sp * 3.6)).padStart(4) + ' km/h\nHÖHE   ' + String(Math.round(S.alt)).padStart(4) + ' m   ' + (S.v.y >= 0 ? '↑' : '↓') + String(Math.abs(Math.round(S.v.y))).padStart(2) + ' m/s\nSCHUB  ' + String(Math.round(S.thr * 100)).padStart(4) + ' %   BOOST ' + Math.round(S.boostE * 100) + ' %\nFAHRWERK ' + (S.gear > .97 ? 'unten' : S.gear < .03 ? 'oben' : '···') + wn : ''; };
    ship.actions = [
      { id: 'gear', label: 'Fahrwerk', steps: ['Auto', 'Unten', 'Oben'], i: 0, fn: i => { S.gearMode = i; } },
      { id: 'ramp', label: 'Rampe', on: true, fn: v => { S.rampCmd = v ? 1 : 0; } },
      { id: 'stab', label: 'Stabilisator', on: true, fn: v => { S.stab = v; } },
      { id: 'inv', label: 'Nicken', steps: ['normal', 'invers'], i: 0, fn: i => { S.inv = i === 1; } },
      { id: 'roll', label: 'Rolle', once: true, fn: () => startMan('roll') },
      { id: 'loop', label: 'Looping', once: true, fn: () => startMan('loop') },
      { id: 'turn', label: 'Wende', once: true, fn: () => startMan('turn') }
    ];
    apply(); return ship;
  }
})();
