// Level 11 – Notfallbasis aufbauen
// Ziel: 3 Versorgungskisten (orange Lichtstrahlen) einsammeln und zur Basis im Krater bringen.
// Danach lädt rts.js den Basisbau-Modus (Kamera hebt ab, Hologramm-Raster, Gebäude).
// Ein Sandwurm jagt dich: Er gräbt sich unter dem Sand an dich heran. Nicht stehen bleiben!
// Zone „level11“ (Vertrag: core/zones.js). Nach dem Sieg wird die Zone „basis“ betreten und diese Zone verlassen.
let LZ = null;
Zones.define({ id: 'level11',
  leave() { if (LZ) { LZ(); LZ = null; } },
  enter(g) {
    const { T, scene, car, pos, H, R, base, say, msg, chime, dust, sfx, hook } = g;
    const V3 = T.Vector3, Y = new V3(0, 1, 0), rnd = Math.random, Lp = (a, b, k) => a + (b - a) * k;
    const up = p => p.clone().normalize();
    const bp = base.clone().multiplyScalar(H(base));
    const glowMat = (c, o) => new T.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide });

    // Basis-Kuppel (im Aufbau)
    const dome = new T.Mesh(new T.SphereGeometry(6, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      new T.MeshStandardMaterial({ color: 0x88c8ff, transparent: true, opacity: .25, roughness: .1, metalness: .3, emissive: 0x103050 }));
    dome.position.copy(bp); dome.quaternion.setFromUnitVectors(Y, base); scene.add(dome);

    // Kisten rund um die Basis
    const e1 = new V3().crossVectors(base, new V3(0, 0, 1)).normalize(), e2 = new V3().crossVectors(base, e1);
    const spot = (ang, d) => { const a = d / R; return base.clone().multiplyScalar(Math.cos(a)).addScaledVector(e1.clone().multiplyScalar(Math.cos(ang)).addScaledVector(e2, Math.sin(ang)), Math.sin(a)).normalize(); };
    const crates = [[.3, 100], [2.4, 150], [4.4, 190]].map(([a, d]) => {
      const dir = spot(a, d), gr = new T.Group();
      gr.position.copy(dir).multiplyScalar(H(dir)); gr.quaternion.setFromUnitVectors(Y, dir); scene.add(gr);
      const bx = new T.Mesh(new T.BoxGeometry(1.8, 1.4, 1.8), new T.MeshStandardMaterial({ color: 0xff8a2a, emissive: 0xaa4400, roughness: .5 }));
      bx.position.y = 1; gr.add(bx);
      const bm = new T.Mesh(new T.CylinderGeometry(.5, .5, 40, 10, 1, true), glowMat(0xffa040, .22)); bm.position.y = 20; gr.add(bm);
      return { gr, bx, bm, c: dir.clone().multiplyScalar(H(dir) + 1), got: false };
    });

    // Sandwurm: Kopf mit Maul und Zähnen + 12 Körpersegmente
    const wm = new T.MeshStandardMaterial({ color: 0x7a4228, roughness: .95 }), segs = [];
    for (let i = 0; i < 13; i++) { const m = new T.Mesh(new T.SphereGeometry(i ? 3 - i * .13 : 3.2, 14, 10), wm); scene.add(m); segs.push(m); }
    const head = segs[0], mouth = new T.Mesh(new T.CircleGeometry(2.5, 20), new T.MeshBasicMaterial({ color: 0x1a0806, side: T.DoubleSide }));
    mouth.position.z = 1.95; head.add(mouth);
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2, th = new T.Mesh(new T.ConeGeometry(.3, 1.5, 6).rotateX(Math.PI / 2), new T.MeshBasicMaterial({ color: 0xf2e6cf }));
      th.position.set(Math.cos(a) * 2.35, Math.sin(a) * 2.35, 2.5); head.add(th);
    }
    let wd = spot(1.2, 260), em = 0, over = false, t = 0, got = 0, nextR = 0, warned = 0, close = 0;
    const hist = [wd.clone().multiplyScalar(H(wd))];

    // Anzeige: Pfeil zum Ziel + Text
    const hud = document.createElement('div');
    hud.style.cssText = 'position:fixed;left:50%;top:max(10px,env(safe-area-inset-top));transform:translateX(-50%);text-align:center;color:#ffd9a0;font:12px ui-monospace,Menlo,monospace;text-shadow:0 1px 8px #000;pointer-events:none;z-index:5';
    const ticks = Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6; return '<line x1="' + (50 + Math.sin(a) * 40).toFixed(1) + '" y1="' + (50 - Math.cos(a) * 40).toFixed(1) + '" x2="' + (50 + Math.sin(a) * 45).toFixed(1) + '" y2="' + (50 - Math.cos(a) * 45).toFixed(1) + '"/>'; }).join('');
    hud.innerHTML = '<svg viewBox="0 0 100 100" width="88" height="88" style="display:block;margin:0 auto 2px;filter:drop-shadow(0 2px 6px #000)">' +
      '<circle cx="50" cy="50" r="47" fill="#140a06b8" stroke="#ffd9a066" stroke-width="2"/><g stroke="#ffd9a055" stroke-width="2">' + ticks + '</g>' +
      '<path d="M50 1 L55 10 L45 10 Z" fill="#fff3d0"/>' +
      '<g id="l1a"><path d="M50 8 L61 72 L50 61 L39 72 Z" fill="#ffb35a" stroke="#2a1408" stroke-width="2" stroke-linejoin="round"/><path d="M50 8 L50 61" stroke="#fff3d0" stroke-width="1.6"/></g></svg><div></div>';
    document.body.appendChild(hud);
    const arrow = hud.querySelector('#l1a'), tip = arrow.firstChild, info = hud.lastChild;

    function end(title, sub) {
      over = true;
      const d = document.createElement('div');
      d.style.cssText = 'position:fixed;inset:0;display:grid;place-items:center;background:#0b0710cc;color:#ffd9a0;text-align:center;z-index:9';
      d.innerHTML = '<div><h2 style="font:400 34px Georgia,serif;margin:0 0 8px">' + title + '</h2><p style="margin:0 0 20px;font:16px ui-monospace,monospace">' + sub +
        '</p><button class="btn" style="position:static;width:auto;height:auto;border-radius:12px;padding:12px 22px;font-size:14px" onclick="location.reload()">Nochmal fahren</button></div>';
      document.body.appendChild(d);
    }

    LZ = () => { over = true; hud.remove(); crates.forEach(c => scene.remove(c.gr)); segs.forEach(m => scene.remove(m)); };   // die Kuppel bleibt: sie gehört jetzt der Basis
    say('BASIS', 'Notfallbasis im Aufbau. Wir brauchen drei Versorgungskisten, orange Lichtstrahlen. Aber ein Sandwurm hat euch gewittert. Nicht stehen bleiben!');

    hook((dt, tt) => {
      if (over) return;
      t += dt;
      const pu = up(pos);

      // Wurm: jagt den Spieler über die Kugel, taucht erst in der Nähe auf
      const tg = pu.clone().addScaledVector(wd, -wd.dot(pu)), dl = Math.acos(Math.min(1, wd.dot(pu))) * R;
      if (tg.lengthSq() > 1e-8) { tg.normalize(); wd.addScaledVector(tg, Math.min(15 + t * .06, 26) * dt / R).normalize(); }
      em += ((dl < 60 ? 1 : 0) - em) * Math.min(1, dt * 1.5);
      const hp = wd.clone().multiplyScalar(H(wd) + Lp(-3.4, .3, em));
      if (hp.distanceTo(hist[hist.length - 1]) > 1) { hist.push(hp.clone()); if (hist.length > 60) hist.shift(); }
      segs.forEach((m, i) => {
        const q = i ? hist[Math.max(0, hist.length - 1 - i * 3)] : hp, d = up(q);
        m.position.copy(d).multiplyScalar(H(d) + Lp(-3.4, .3 + Math.sin(i * .8 - tt * 4) * .7, em));
      });
      head.up.copy(wd); if (tg.lengthSq() > 0) head.lookAt(head.position.clone().addScaledVector(tg, 10));
      if (dust && rnd() < dt * 40) dust(wd.clone().multiplyScalar(H(wd) + .3), new V3(rnd() - .5, rnd() - .5, rnd() - .5).multiplyScalar(3).addScaledVector(wd, 2 + rnd() * 3));
      if (t > nextR && dl < 110) { nextR = t + 5; sfx.rumble(); }
      if (!warned && dl < 60) { warned = 1; sfx.rumble(); say('SPÄHER', 'Der Wurm bricht durch! Fahr weg, fahr weg!'); }
      if (!close && dl < 20) { close = 1; say('BASIS', 'Er ist direkt hinter euch! Boost, jetzt!'); }
      if (em > .5 && t > 8 && hp.distanceTo(pos) < 6.5) { sfx.boom(); end('Verschlungen!', 'Der Sandwurm hat euch erwischt.'); return; }

      // Kisten einsammeln
      crates.forEach((c, i) => {
        if (c.got) return;
        c.bx.rotation.y += dt; c.bm.material.opacity = .2 + .08 * Math.sin(tt * 3 + i);
        if (pos.distanceToSquared(c.c) < 16) {
          c.got = true; c.gr.visible = false; got++;
          chime([440, 554, 659], .15);
          msg(got < 3 ? 'Kiste ' + got + ' von 3 gesichert' : 'Alle Kisten! Zurück zur Basis');
          say('BASIS', got < 3 ? 'Kiste ' + got + ' gesichert. Weiter so!' : 'Alle drei Kisten an Bord! Bringt sie zur Kuppel, schnell!');
        }
      });

      // Sieg: Kisten zur Basis bringen -> Basisbau (rts.js) wird geladen, Kamera hebt ab
      if (got === 3 && pos.distanceTo(bp) < 12) {
        over = true; sfx.drums(); chime([392, 494, 587, 784, 988], .18);
        dome.material.opacity = .85; dome.material.emissive.set(0x2a80c0);
        segs.forEach(sg => sg.visible = false); hud.remove();
        g.zones.enter('basis', { dome, time: t }).then(() => g.zones.leave('level11')).catch(e => end('Basis online!', 'Level 11 geschafft · ' + e.message));
        return;
      }

      // Pfeil und Text
      const nx = crates.find(c => !c.got), tp = nx ? nx.c : bp, td = up(tp);
      const f = new V3(0, 0, -1).applyQuaternion(car.quaternion); f.addScaledVector(pu, -f.dot(pu)).normalize();
      const rt = new V3().crossVectors(f, pu), v = td.clone().addScaledVector(pu, -pu.dot(td));
      const ang = Math.atan2(v.dot(rt), v.dot(f)); arrow.setAttribute('transform', 'rotate(' + (ang * 180 / Math.PI).toFixed(1) + ' 50 50)'); tip.setAttribute('fill', Math.abs(ang) < .14 ? '#7dff9a' : '#ffb35a');
      info.textContent = (nx ? 'Kisten ' + got + '/3' : 'Zurück zur Basis') + ' · ' + Math.round(Math.acos(Math.min(1, pu.dot(td))) * R) + ' m · Wurm ' + Math.round(dl) + ' m';
    });
  }
});
