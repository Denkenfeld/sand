// common.js – gemeinsame Werkzeuge für alle Objekte der Galerie (und später für das Spiel)
window.GC = (() => {
  const GC = { pointSz: { value: 600 } };
  GC.rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  GC.cv = (w, h, f) => { const c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d'), w, h); return c; };
  const rgb = (c, k = 1, a = 1) => `rgba(${Math.min(255, c[0] * k) | 0},${Math.min(255, c[1] * k) | 0},${Math.min(255, c[2] * k) | 0},${a})`;

  // ---------- Blech-Texturen: Farbe + Bump + Rauheit, deckungsgleich ----------
  // Paneele, Nähte, Nieten, Kratzer, Rostfahnen, Ruß, abgeplatzter Lack, Reparaturbleche
  GC.plating = (T, seed, o = {}) => {
    const R = GC.rng(seed), S = o.size || 512, base = o.base || [200, 190, 170], acc = o.accents || [[196, 98, 36]], accP = o.accentP ?? .12;
    const panels = [], scr = [], blot = [], chips = [], streak = [];
    for (let y = 0; y < S;) { const pw = o.pw || [90, 230], ph = o.ph || [70, 170]; let h = ph[0] + R() * (ph[1] - ph[0]) | 0; if (y + h > S - ph[0] * .6) h = S - y; for (let x = 0; x < S;) { let w = pw[0] + R() * (pw[1] - pw[0]) | 0; if (x + w > S - pw[0] * .6) w = S - x;
      const a = R() < accP; panels.push({ x, y, w, h, tone: 1 - (o.tone ?? .14) + R() * (o.tone ?? .14) * 2, c: a ? acc[R() * acc.length | 0] : base, a, hgt: R() }); x += w; } y += h; }
    for (let i = 0; i < 70; i++) scr.push([R() * S, R() * S, R() * 6.28, 12 + R() * 60, R() < .5]);
    for (let i = 0; i < 38; i++) blot.push([R() * S, R() * S, 22 + R() * 70, .08 + R() * .22]);
    for (let i = 0; i < 90; i++) { const p = panels[R() * panels.length | 0], e = R() * 4 | 0; chips.push([e < 2 ? p.x + R() * p.w : (e === 2 ? p.x : p.x + p.w) + (R() - .5) * 6, e < 2 ? (e ? p.y + p.h : p.y) + (R() - .5) * 6 : p.y + R() * p.h, 2 + R() * 5]); }
    panels.forEach(p => { for (let k = 0; k < 2; k++) if (R() < .7) streak.push([p.x + R() * p.w, p.y + p.h, 24 + R() * 70, R()]); });
    const burns = o.burn || 0, bl = []; for (let i = 0; i < burns; i++) bl.push([R() * S, R() * S, 50 + R() * 90]);
    const wrap = (ctx, f) => { f(ctx, 0, 0); };
    const col = GC.cv(S, S, (x) => {
      panels.forEach(p => { x.fillStyle = rgb(p.c, p.tone * (p.a ? 1 : 1)); x.fillRect(p.x, p.y, p.w, p.h);
        const g = x.createLinearGradient(p.x, p.y, p.x, p.y + p.h); g.addColorStop(0, 'rgba(255,255,255,.07)'); g.addColorStop(1, 'rgba(0,0,0,.09)'); x.fillStyle = g; x.fillRect(p.x, p.y, p.w, p.h);
        x.strokeStyle = `rgba(20,16,12,${o.seam ?? .6})`; x.lineWidth = 2; x.strokeRect(p.x + 1, p.y + 1, p.w - 2, p.h - 2); x.strokeStyle = 'rgba(255,255,255,.18)'; x.lineWidth = 1; x.beginPath(); x.moveTo(p.x + 3, p.y + p.h - 3); x.lineTo(p.x + 3, p.y + 3); x.lineTo(p.x + p.w - 3, p.y + 3); x.stroke();
        for (let i = 10; i < p.w - 8; i += 15) for (const yy of [8, p.h - 8]) { x.fillStyle = 'rgba(30,26,22,.8)'; x.beginPath(); x.arc(p.x + i, p.y + yy, 1.9, 0, 7); x.fill(); x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.arc(p.x + i - .5, p.y + yy - .6, .8, 0, 7); x.fill(); } });
      streak.forEach(s => { const g = x.createLinearGradient(0, s[1], 0, s[1] + s[2]); g.addColorStop(0, `rgba(110,60,28,${.25 + s[3] * .2})`); g.addColorStop(1, 'rgba(110,60,28,0)'); x.fillStyle = g; x.fillRect(s[0], s[1], 2 + s[3] * 3, s[2]); });
      blot.forEach(b => { const g = x.createRadialGradient(b[0], b[1], 1, b[0], b[1], b[2]); g.addColorStop(0, `rgba(40,28,18,${b[3]})`); g.addColorStop(1, 'rgba(40,28,18,0)'); x.fillStyle = g; x.fillRect(b[0] - b[2], b[1] - b[2], b[2] * 2, b[2] * 2); });
      bl.forEach(b => { const g = x.createRadialGradient(b[0], b[1], 1, b[0], b[1], b[2]); g.addColorStop(0, 'rgba(8,6,5,.75)'); g.addColorStop(1, 'rgba(8,6,5,0)'); x.fillStyle = g; x.fillRect(b[0] - b[2], b[1] - b[2], b[2] * 2, b[2] * 2); });
      chips.forEach(c => { x.fillStyle = 'rgba(168,168,172,.9)'; x.beginPath(); x.ellipse(c[0], c[1], c[2], c[2] * .55, c[0], 0, 7); x.fill(); });
      scr.forEach(s => { x.strokeStyle = s[4] ? 'rgba(235,235,235,.28)' : 'rgba(10,8,6,.3)'; x.lineWidth = .8; x.beginPath(); x.moveTo(s[0], s[1]); x.lineTo(s[0] + Math.cos(s[2]) * s[3], s[1] + Math.sin(s[2]) * s[3]); x.stroke(); }); });
    const bmp = GC.cv(S / 2, S / 2, x => { x.scale(.5, .5); x.fillStyle = '#808080'; x.fillRect(0, 0, S, S);
      panels.forEach(p => { x.fillStyle = `rgba(${p.hgt > .5 ? '255,255,255' : '0,0,0'},.07)`; x.fillRect(p.x, p.y, p.w, p.h); x.strokeStyle = '#3c3c3c'; x.lineWidth = 3; x.strokeRect(p.x + 1, p.y + 1, p.w - 2, p.h - 2);
        for (let i = 10; i < p.w - 8; i += 15) for (const yy of [8, p.h - 8]) { x.fillStyle = '#d8d8d8'; x.beginPath(); x.arc(p.x + i, p.y + yy, 2, 0, 7); x.fill(); } });
      chips.forEach(c => { x.fillStyle = '#5a5a5a'; x.beginPath(); x.ellipse(c[0], c[1], c[2], c[2] * .55, c[0], 0, 7); x.fill(); });
      scr.forEach(s => { x.strokeStyle = 'rgba(40,40,40,.55)'; x.lineWidth = .8; x.beginPath(); x.moveTo(s[0], s[1]); x.lineTo(s[0] + Math.cos(s[2]) * s[3], s[1] + Math.sin(s[2]) * s[3]); x.stroke(); }); });
    const rgh = GC.cv(S / 2, S / 2, x => { x.scale(.5, .5); x.fillStyle = 'rgb(140,140,140)'; x.fillRect(0, 0, S, S);
      panels.forEach(p => { const v = p.a ? 175 : 120 + p.tone * 40; x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(p.x, p.y, p.w, p.h); });
      blot.forEach(b => { const g = x.createRadialGradient(b[0], b[1], 1, b[0], b[1], b[2]); g.addColorStop(0, `rgba(235,235,235,${b[3] * 2})`); g.addColorStop(1, 'rgba(235,235,235,0)'); x.fillStyle = g; x.fillRect(b[0] - b[2], b[1] - b[2], b[2] * 2, b[2] * 2); });
      chips.forEach(c => { x.fillStyle = 'rgb(70,70,70)'; x.beginPath(); x.ellipse(c[0], c[1], c[2], c[2] * .55, c[0], 0, 7); x.fill(); }); });
    const mk = (c, srgb) => { const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4; if (srgb) t.encoding = T.sRGBEncoding; return t; };
    return { map: mk(col, true), bump: mk(bmp), rough: mk(rgh) };
  };
  GC.material = (T, seed, o = {}) => { const t = GC.plating(T, seed, o); return new T.MeshStandardMaterial({ map: t.map, bumpMap: t.bump, bumpScale: o.bump ?? 1.4, roughnessMap: t.rough, roughness: 1, metalness: o.metal ?? .55, side: o.side || T.FrontSide }); };
  // Material mit anderer Texturwiederholung (Zylinder, Kisten …)
  GC.rep = (m, x, y) => { const c = m.clone(); ['map', 'bumpMap', 'roughnessMap'].forEach(k => { if (m[k]) { c[k] = m[k].clone(); c[k].repeat.set(x, y); c[k].needsUpdate = true; } }); return c; };
  GC.hazard = (T, vert) => { const t = new T.CanvasTexture(GC.cv(64, 64, x => { x.fillStyle = '#d9a418'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#1b1a18'; for (let i = -64; i < 128; i += 22) { x.beginPath(); x.moveTo(i, 64); x.lineTo(i + 11, 64); x.lineTo(i + 75, 0); x.lineTo(i + 64, 0); x.fill(); } x.fillStyle = 'rgba(0,0,0,.2)'; x.fillRect(0, 0, 64, 64); })); t.wrapS = t.wrapT = T.RepeatWrapping; t.encoding = T.sRGBEncoding; return t; };
  GC.grate = T => { const t = new T.CanvasTexture(GC.cv(64, 64, x => { x.fillStyle = '#25272c'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#5b606a'; for (let i = 0; i < 64; i += 8) x.fillRect(0, i + 1, 64, 4); x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(0, 0, 64, 64); })); t.wrapS = t.wrapT = T.RepeatWrapping; t.encoding = T.sRGBEncoding; return t; };

  // ---------- Glühen, Sprites ----------
  GC.glowTex = T => GC._g || (GC._g = new T.CanvasTexture(GC.cv(64, 64, x => { const g = x.createRadialGradient(32, 32, 1, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.35, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); })));
  GC.sprite = (T, color, size, op = 1) => { const s = new T.Sprite(new T.SpriteMaterial({ map: GC.glowTex(T), color, blending: T.AdditiveBlending, transparent: true, depthWrite: false, opacity: op })); s.scale.setScalar(size); return s; };
  GC.flameMat = (T, hot, cool, op = 1) => new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, uniforms: { uH: { value: new T.Color(hot) }, uC: { value: new T.Color(cool) }, uO: { value: op }, uT: { value: 0 } },
    vertexShader: 'varying vec3 vN;varying vec3 vV;varying float vY;void main(){vY=position.y;vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
    fragmentShader: 'varying vec3 vN;varying vec3 vV;varying float vY;uniform vec3 uH,uC;uniform float uO,uT;void main(){float t=clamp(.5-vY,0.,1.);float rim=pow(abs(dot(normalize(vN),normalize(vV))),1.6);float flick=.88+.12*sin(vY*14.-uT*40.);vec3 c=mix(uC,uH,pow(1.-t,2.5));float a=uO*rim*pow(1.-t,1.3)*flick;gl_FragColor=vec4(c,a);\n#include <tonemapping_fragment>\n#include <encodings_fragment>\n}' });
  GC.addMat = (T, c, o = .5) => new T.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide });
  // Decal: bedruckte, transparente Fläche (Schrift, Warnstreifen, Ruß, Risse …)
  GC.decal = (T, w, h, px, draw, o = {}) => { const c = GC.cv(px, Math.round(px * h / w), (x, W, H) => draw(x, W, H)), t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4;
    t.minFilter = T.LinearFilter; t.generateMipmaps = false; t.wrapS = t.wrapT = T.ClampToEdgeWrapping;
    const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshStandardMaterial({ map: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, roughness: o.rough ?? .8, metalness: o.metal ?? .2, emissive: o.emissive || 0x000000, emissiveMap: o.emissive ? t : null })); return m; };

  // ---------- Partikel (Feuer, Rauch, Funken) ----------
  GC.particles = (T, n, o = {}) => {
    const P = new Float32Array(n * 3), AA = new Float32Array(n), SS = new Float32Array(n), CC = new Float32Array(n * 3), L = new Float32Array(n), M = new Float32Array(n), S0 = new Float32Array(n), C0 = new Float32Array(n * 3), C1 = new Float32Array(n * 3), V = Array.from({ length: n }, () => new T.Vector3()), g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(P, 3)); g.setAttribute('aA', new T.BufferAttribute(AA, 1)); g.setAttribute('aS', new T.BufferAttribute(SS, 1)); g.setAttribute('aC', new T.BufferAttribute(CC, 3));
    const m = new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: o.add ? T.AdditiveBlending : T.NormalBlending, uniforms: { uSz: GC.pointSz },
      vertexShader: 'attribute float aA,aS;attribute vec3 aC;varying float vA;varying vec3 vC;uniform float uSz;void main(){vA=aA;vC=aC;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=aS*uSz/-mv.z;gl_Position=projectionMatrix*mv;}',
      fragmentShader: 'varying float vA;varying vec3 vC;void main(){float a=1.-smoothstep(.05,.5,length(gl_PointCoord-.5));gl_FragColor=vec4(vC,a*vA);\n#include <tonemapping_fragment>\n#include <encodings_fragment>\n}' });
    const pts = new T.Points(g, m); pts.frustumCulled = false; let i = 0; const c3 = new T.Color();
    const setC = (arr, k, c) => { c3.set(c); arr[k * 3] = c3.r; arr[k * 3 + 1] = c3.g; arr[k * 3 + 2] = c3.b; };
    return { points: pts, emit(p, v, life, size, c0, c1) { P[i * 3] = p.x; P[i * 3 + 1] = p.y; P[i * 3 + 2] = p.z; V[i].copy(v); L[i] = M[i] = life; S0[i] = size; setC(C0, i, c0); setC(C1, i, c1 ?? c0); i = (i + 1) % n; },
      update(dt, q = {}) { const drag = q.drag ?? 1, grow = q.grow ?? 1, buoy = q.buoy || 0, gr = q.grav || 0;
        for (let k = 0; k < n; k++) { if (L[k] > 0) { L[k] -= dt; const v = V[k]; P[k * 3] += v.x * dt; P[k * 3 + 1] += v.y * dt; P[k * 3 + 2] += v.z * dt; v.multiplyScalar(Math.max(0, 1 - drag * dt)); v.y += (buoy - gr) * dt;
          const a = Math.max(0, L[k] / M[k]), f = 1 - a; AA[k] = a * Math.min(1, f * 12) * (q.alpha ?? 1); SS[k] = S0[k] * (1 + f * grow); for (let c = 0; c < 3; c++) CC[k * 3 + c] = C0[k * 3 + c] + (C1[k * 3 + c] - C0[k * 3 + c]) * f; } else AA[k] = 0; }
        g.attributes.position.needsUpdate = g.attributes.aA.needsUpdate = g.attributes.aS.needsUpdate = g.attributes.aC.needsUpdate = true; },
      clear() { L.fill(0); AA.fill(0); } };
  };

  // ---------- Loft: Rumpf aus Querschnitten (Superellipsen) ----------
  // keys: [z, halbe Breite, Höhe oben, Höhe unten, Eckigkeit p]; Naht liegt unten in der Mitte
  GC.loft = (T, keys, o = {}) => {
    const seg = o.seg || 44, nz = o.nz || 60, ps = o.panel || 2.6, ring = [], z0 = keys[0][0], z1 = keys[keys.length - 1][0];
    const at = z => { let i = 0; while (i < keys.length - 2 && z > keys[i + 1][0]) i++; const a = keys[i], b = keys[i + 1], t0 = Math.min(1, Math.max(0, (z - a[0]) / (b[0] - a[0]))), t = t0 * t0 * (3 - 2 * t0); return [1, 2, 3, 4].map(k => a[k] + (b[k] - a[k]) * t); };
    GC.hullAt = at;
    const pos = [], uv = [], idx = [];
    for (let j = 0; j <= nz; j++) { const z = z0 + (z1 - z0) * j / nz, [hw, tp, bt, p] = at(z); let acc = 0, prev = null;
      for (let k = 0; k <= seg; k++) { const th = -Math.PI / 2 + 2 * Math.PI * k / seg, c = Math.cos(th), s = Math.sin(th), x = hw * Math.sign(c) * Math.pow(Math.abs(c), p), y = s > 0 ? tp * Math.pow(s, p) : -bt * Math.pow(-s, p);
        if (prev) acc += Math.hypot(x - prev[0], y - prev[1]); prev = [x, y]; pos.push(x, y, z); uv.push(acc / ps, (z - z0) / ps); } }
    for (let j = 0; j < nz; j++) for (let k = 0; k < seg; k++) { const a = j * (seg + 1) + k, b = a + 1, c = a + seg + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
    // Kappen vorn / hinten
    const cap = (j, flip) => { const base = pos.length / 3 | 0; let cx = 0, cy = 0; const zc = z0 + (z1 - z0) * j / nz; for (let k = 0; k < seg; k++) { cx += pos[(j * (seg + 1) + k) * 3]; cy += pos[(j * (seg + 1) + k) * 3 + 1]; } pos.push(cx / seg, cy / seg, zc); uv.push(cx / seg / ps, cy / seg / ps);
      for (let k = 0; k <= seg; k++) { const x = pos[(j * (seg + 1) + k) * 3], y = pos[(j * (seg + 1) + k) * 3 + 1]; pos.push(x, y, zc); uv.push(x / ps, y / ps); }
      for (let k = 0; k < seg; k++) { const a = base + 1 + k, b = a + 1; flip ? idx.push(base, a, b) : idx.push(base, b, a); } };
    cap(0, false); cap(nz, true);
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    if (o.dent) { const P = g.attributes.position; g.computeVertexNormals(); const N = g.attributes.normal; for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i), d = (Math.sin(x * 1.3 + z * .8) * Math.sin(z * 1.1 - x * .7) + Math.sin(x * 3.1 + y * 2.3 + z * 1.7) * .4) * o.dent; P.setXYZ(i, x + N.getX(i) * d, y + N.getY(i) * d, z + N.getZ(i) * d); } }
    g.computeVertexNormals(); return g;
  };
  GC.topY = (x, z) => { const [hw, tp, , p] = GC.hullAt(z), r = Math.min(1, Math.abs(x) / hw); return tp * Math.pow(Math.max(0, 1 - Math.pow(r, 2 / p)), p / 2); };
  GC.sideX = (z, y) => { const [hw, tp, bt, p] = GC.hullAt(z), h = y >= 0 ? tp : bt, r = Math.min(1, Math.abs(y) / h); return hw * Math.pow(Math.max(0, 1 - Math.pow(r, 2 / p)), p / 2); };

  // ---------- Umgebungslicht für Metallreflexe (Himmel als Cubemap) ----------
  GC.env = (T, renderer, c) => {
    try { const pm = new T.PMREMGenerator(renderer), sc = new T.Scene();
      sc.add(new T.Mesh(new T.SphereGeometry(50, 32, 16), new T.ShaderMaterial({ side: T.BackSide, uniforms: { uT: { value: new T.Color(c.top) }, uH: { value: new T.Color(c.hor) }, uG: { value: new T.Color(c.gnd) }, uS: { value: new T.Vector3(...c.sun).normalize() }, uC: { value: new T.Color(c.sunCol) } },
        vertexShader: 'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader: 'varying vec3 vP;uniform vec3 uT,uH,uG,uC,uS;void main(){vec3 d=normalize(vP);float h=d.y;vec3 c=h>0.?mix(uH,uT,smoothstep(0.,.7,h)):mix(uH,uG,smoothstep(0.,-.3,h));float s=max(dot(d,uS),0.);c+=uC*(pow(s,48.)*4.+pow(s,6.)*.5);gl_FragColor=vec4(c,1.);}' })));
      const rt = pm.fromScene(sc, 0, .1, 200); pm.dispose(); return rt.texture; } catch (e) { return null; }
  };
  return GC;
})();
