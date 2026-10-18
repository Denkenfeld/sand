// gallery.js – Objekt-Galerie: Welt, Licht, Kamera, Bedienung.
// Neue Objekte: Datei in /objects anlegen, per Gallery.add({id,name,build(T,GC,opts)}) registrieren und in index.html einbinden.
window.Gallery = (() => {
  const G = { objects: [] };
  G.add = d => G.objects.push(d);
  // Tageszeiten: Sonne/Mond, Himmel, Nebel, Belichtung
  G.TIMES = {
    tag: { el: 42, az: 40, sun: 0xfff0dc, si: 2.7, hs: 0xbcd4ff, hg: 0xc89a60, hi: .75, fog: 0xe0c6a0, fd: .0034, ex: 1.0, night: 0, top: 0x4a86c8, hor: 0xe8d2b0, env: { top: 0x5a90d0, hor: 0xf0dcc0, gnd: 0xb08850, sun: [.6, .75, .5], sunCol: 0xfff0d8 } },
    abend: { el: 7, az: 72, sun: 0xff9a50, si: 3.0, hs: 0x7088c0, hg: 0x7a4a30, hi: .5, fog: 0xd88c5c, fd: .0045, ex: 1.05, night: .3, top: 0x35508a, hor: 0xf0905a, env: { top: 0x35508a, hor: 0xf09a60, gnd: 0x6a4028, sun: [.95, .12, .3], sunCol: 0xff9040 } },
    nacht: { el: 38, az: -40, sun: 0x9ab8ff, si: .6, hs: 0x1c2c54, hg: 0x151210, hi: .45, fog: 0x0b1020, fd: .007, ex: 1.2, night: 1, top: 0x050a1c, hor: 0x16203c, env: { top: 0x0a1230, hor: 0x1c2a4c, gnd: 0x0c0c10, sun: [-.5, .6, -.6], sunCol: 0x7a98ff } }
  };
  G.createWorld = (T, renderer, GC) => {
    const scene = new T.Scene(), camera = new T.PerspectiveCamera(38, 1, .5, 3000), W = { scene, camera, shake: 0 };
    renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    const R = GC.rng(5), nz = (x, z) => Math.sin(x * .045 + z * .02) * 3.2 + Math.sin(z * .06 - x * .03) * 2.4 + Math.sin((x + z) * .11) * .9 + Math.sin(x * .17 - z * .13) * .35;
    // Himmel
    const sky = new T.Mesh(new T.SphereGeometry(1, 32, 16), new T.ShaderMaterial({ side: T.BackSide, depthWrite: false, fog: false, uniforms: { uT: { value: new T.Color() }, uH: { value: new T.Color() }, uS: { value: new T.Vector3(0, 1, 0) }, uC: { value: new T.Color() }, uN: { value: 0 } },
      vertexShader: 'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `varying vec3 vP;uniform vec3 uT,uH,uS,uC;uniform float uN;float hs(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453);}
void main(){vec3 d=normalize(vP);float h=d.y;vec3 c=mix(uH,uT,pow(clamp(h,0.,1.),.38));if(h<0.)c=uH*(1.+h*.4);float s=max(dot(d,uS),0.);c+=uC*(pow(s,700.)*10.+pow(s,8.)*.35*(1.-uN*.8)+pow(s,2.)*.08);
vec3 q=d*140.,id=floor(q);float r=hs(id),st=step(.992,r)*(1.-smoothstep(0.,.4,length(fract(q)-.5)*2.))*smoothstep(.02,.3,h);c+=vec3(.8,.9,1.)*st*uN*1.6;gl_FragColor=vec4(c,1.);
#include <tonemapping_fragment>
#include <encodings_fragment>
}` })); sky.scale.setScalar(1500); sky.renderOrder = -1; sky.frustumCulled = false; scene.add(sky);
    // Sand: Textur + Bump mit Windrippeln
    const sandC = GC.cv(512, 512, x => { x.fillStyle = '#c99a62'; x.fillRect(0, 0, 512, 512); for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(${R() < .5 ? '255,235,200' : '110,70,40'},${R() * .16})`; x.fillRect(R() * 512, R() * 512, 1 + R() * 2, 1 + R() * 2); }
      for (let i = 0; i < 70; i++) { x.strokeStyle = `rgba(${R() < .5 ? '255,230,190' : '120,80,45'},${.025 + R() * .045})`; x.lineWidth = 1 + R() * 2; x.beginPath(); const y0 = R() * 512, a = 4 + R() * 8, f = .02 + R() * .03, ph = R() * 6; for (let xx = 0; xx <= 512; xx += 8) x.lineTo(xx, y0 + Math.sin(xx * f + ph) * a); x.stroke(); } });
    const sandB = GC.cv(512, 512, x => { x.fillStyle = '#808080'; x.fillRect(0, 0, 512, 512); for (let i = 0; i < 90; i++) { x.strokeStyle = `rgba(${R() < .5 ? '255,255,255' : '0,0,0'},${.05 + R() * .1})`; x.lineWidth = 2 + R() * 3; x.beginPath(); const y0 = R() * 512, a = 4 + R() * 8, f = .02 + R() * .03, ph = R() * 6; for (let xx = 0; xx <= 512; xx += 8) x.lineTo(xx, y0 + Math.sin(xx * f + ph) * a); x.stroke(); } for (let i = 0; i < 4000; i++) { x.fillStyle = `rgba(128,128,128,${R() * .4})`; x.fillRect(R() * 512, R() * 512, 2, 2); } });
    const tm = (c, srgb) => { const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(26, 26); t.anisotropy = 8; if (srgb) t.encoding = T.sRGBEncoding; return t; };
    const hAt0 = (x, z) => { const r = Math.hypot(x, z), k = Math.min(1, Math.max(0, (r - 38) / 60)); return nz(x, z) * k * k * (3 - 2 * k); };
    const gg = new T.PlaneGeometry(900, 900, 220, 220); gg.rotateX(-Math.PI / 2); const gp = gg.attributes.position;
    for (let i = 0; i < gp.count; i++) { const x = gp.getX(i), z = gp.getZ(i), r = Math.hypot(x, z), k = Math.min(1, Math.max(0, (r - 38) / 60)); gp.setY(i, nz(x, z) * k * k * (3 - 2 * k)); }
    gg.computeVertexNormals(); const sandMap = tm(sandC, true), sandBump = tm(sandB), ground = new T.Mesh(gg, new T.MeshStandardMaterial({ map: sandMap, bumpMap: sandBump, bumpScale: 1.1, roughness: 1, metalness: 0 })); ground.receiveShadow = true; ground.frustumCulled = false; scene.add(ground);
    // Landeabdruck und Felsen
    const burn = GC.decal(T, 36, 36, 256, (x, w, h) => { const g = x.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2); g.addColorStop(0, 'rgba(40,24,14,.5)'); g.addColorStop(.6, 'rgba(60,36,20,.25)'); g.addColorStop(1, 'rgba(60,36,20,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); }); burn.rotation.x = -Math.PI / 2; burn.position.set(0, .03, 4); scene.add(burn);
    const rockList = [], rocks = new T.InstancedMesh(new T.DodecahedronGeometry(1, 1), new T.MeshStandardMaterial({ color: 0x8a6a4c, roughness: 1, flatShading: true }), 46), dm = new T.Object3D();
    for (let i = 0; i < 46; i++) { const a = R() * 6.28, r = 22 + R() * 90, s = .3 + Math.pow(R(), 2.2) * 2.4, x = Math.cos(a) * r, z = Math.sin(a) * r; dm.position.set(x, nz(x, z) * Math.pow(Math.min(1, Math.max(0, (r - 38) / 60)), 2) + s * .2, z); dm.rotation.set(R() * 3, R() * 3, R() * 3); dm.scale.set(s * (1 + R() * .5), s * .7, s * (1 + R() * .5)); dm.updateMatrix(); rocks.setMatrixAt(i, dm.matrix); if (s > .5) rockList.push({ x, z, r: s * 1.6 + .2, inv: dm.matrix.clone().invert() }); }
    rocks.castShadow = rocks.receiveShadow = true; scene.add(rocks);
    // Licht
    const sun = new T.DirectionalLight(0xffffff, 2), hemi = new T.HemisphereLight(0xffffff, 0x886644, .7), fill = new T.DirectionalLight(0x8aa8ff, .35);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); const sc = sun.shadow.camera; sc.left = -30; sc.right = 30; sc.top = 30; sc.bottom = -30; sc.near = 1; sc.far = 160; sun.shadow.bias = -.0004; sun.shadow.normalBias = .04;
    fill.position.set(-30, 12, -20); scene.add(sun, sun.target, hemi, fill); scene.fog = new T.FogExp2(0xe0c6a0, .0034);
    const envs = {}, sunDir = new T.Vector3(0, 1, 0), sunC = new T.Vector3(0, 0, 3); let sunDist = 90; const place = () => { sun.position.copy(sunDir).multiplyScalar(sunDist).add(sunC); sun.target.position.copy(sunC); }; W.time = 'tag'; W.sunDir = sunDir;
    // Schattenbereich folgt dem Objekt (x, z) mit Halbbreite size
    W.follow = (x, z, size, y = 0, dist = 90) => { let up = false; if (size && size !== sc.right) { sc.left = -size; sc.right = size; sc.top = size; sc.bottom = -size; up = true; } if (Math.abs(sc.far - (dist + 70)) > 1) { sc.far = dist + 70; up = true; } if (up) sc.updateProjectionMatrix(); sunDist = dist; sunC.set(x, y, z); place(); };
    // Begehbare Oberfläche: Gelände, Felsen (Ellipsoide) und zusätzliche Flächen; Decken (z. B. Rumpf)
    W.surfaces = new Map(); W.ceilings = new Map();
    const rockTop = (k, x, z) => { const m = k.inv.elements, ox = m[0] * x + m[8] * z + m[12], oy = m[1] * x + m[9] * z + m[13], oz = m[2] * x + m[10] * z + m[14], dx = m[4], dy = m[5], dz = m[6], a = dx * dx + dy * dy + dz * dz, b = 2 * (ox * dx + oy * dy + oz * dz), c = ox * ox + oy * oy + oz * oz - .95, q = b * b - 4 * a * c; return q < 0 ? -Infinity : (-b + Math.sqrt(q)) / (2 * a); };
    // Endloser Boden: Das Gelände wandert mit dem Objekt. Höhen werden nur an den neuen Rändern berechnet, Normalen aus den Höhen.
    const NG = 220, NV = NG + 1, CELL = 900 / NG, HH = new Float32Array(NV * NV), HH2 = new Float32Array(NV * NV), gn = gg.attributes.normal; let cxs = 0, czs = 0;
    for (let iy = 0; iy < NV; iy++) for (let ix = 0; ix < NV; ix++) HH[iy * NV + ix] = hAt0(ix * CELL - 450, iy * CELL - 450);
    const farRocks = new T.InstancedMesh(rocks.geometry, rocks.material, 230); farRocks.frustumCulled = false; farRocks.receiveShadow = true; scene.add(farRocks);
    const hs = (a, b, k) => { let h = Math.imul((a * 73856093) ^ (b * 19349663) ^ (k * 83492791), 2654435761); h ^= h >>> 15; h = Math.imul(h, 2246822519); h ^= h >>> 13; return (h >>> 0) % 100000 / 100000; };
    const scatter = (ox, oz) => { const c0 = Math.round(ox / 64), c1 = Math.round(oz / 64); let n = 0;
      for (let gx = c0 - 5; gx <= c0 + 5; gx++) for (let gz = c1 - 5; gz <= c1 + 5; gz++) for (let k = 0; k < 2; k++) { if (hs(gx, gz, k * 7) > .62 || n >= 230) continue;
        const x = (gx + hs(gx, gz, k * 7 + 1)) * 64, z = (gz + hs(gx, gz, k * 7 + 2)) * 64; if (Math.hypot(x, z) < 125) continue; const s = .35 + Math.pow(hs(gx, gz, k * 7 + 3), 2.2) * 2.6;
        dm.position.set(x, hAt0(x, z) + s * .2, z); dm.rotation.set(hs(gx, gz, k * 7 + 4) * 3, hs(gx, gz, k * 7 + 5) * 3, hs(gx, gz, k * 7 + 6) * 3); dm.scale.set(s * 1.3, s * .7, s * 1.2); dm.updateMatrix(); farRocks.setMatrixAt(n++, dm.matrix); }
      farRocks.count = n; farRocks.instanceMatrix.needsUpdate = true; };
    scatter(0, 0);
    W.recenter = (x, z) => { const nx = Math.round(x / CELL), nz2 = Math.round(z / CELL), sx = nx - cxs, sz = nz2 - czs; if (Math.abs(sx) < 30 && Math.abs(sz) < 30) return;
      for (let iy = 0; iy < NV; iy++) for (let ix = 0; ix < NV; ix++) { const jx = ix + sx, jy = iy + sz; HH2[iy * NV + ix] = jx >= 0 && jx <= NG && jy >= 0 && jy <= NG ? HH[jy * NV + jx] : hAt0((ix + nx) * CELL - 450, (iy + nz2) * CELL - 450); }
      HH.set(HH2); cxs = nx; czs = nz2; const gpp = gp.array, gnn = gn.array;
      for (let iy = 0; iy < NV; iy++) for (let ix = 0; ix < NV; ix++) { const i = iy * NV + ix, i3 = i * 3, il = Math.max(ix - 1, 0), ir = Math.min(ix + 1, NG), iu = Math.max(iy - 1, 0), id = Math.min(iy + 1, NG);
        gpp[i3 + 1] = HH[i]; const ax = -(HH[iy * NV + ir] - HH[iy * NV + il]) / ((ir - il) * CELL), az = -(HH[id * NV + ix] - HH[iu * NV + ix]) / ((id - iu) * CELL), l = Math.sqrt(ax * ax + 1 + az * az); gnn[i3] = ax / l; gnn[i3 + 1] = 1 / l; gnn[i3 + 2] = az / l; }
      gp.needsUpdate = true; gn.needsUpdate = true; ground.position.set(nx * CELL, 0, nz2 * CELL); const ox = nx * CELL, oz = nz2 * CELL;
      sandMap.offset.set(ox / 900 * 26, -oz / 900 * 26); sandBump.offset.copy(sandMap.offset); scatter(ox, oz); };
    W.heightAt = (x, z) => { let h = hAt0(x, z); for (const k of rockList) if ((x - k.x) * (x - k.x) + (z - k.z) * (z - k.z) < k.r * k.r) h = Math.max(h, rockTop(k, x, z)); for (const f of W.surfaces.values()) h = Math.max(h, f(x, z)); return h; };
    W.ceilAt = (x, z) => { let c = Infinity; for (const f of W.ceilings.values()) c = Math.min(c, f(x, z)); return c; };
    W.setTime = (name, ship) => { const t = G.TIMES[name]; W.time = name; const e = t.el * Math.PI / 180, a = t.az * Math.PI / 180, d = new T.Vector3(Math.cos(e) * Math.sin(a), Math.sin(e), Math.cos(e) * Math.cos(a));
      sunDir.copy(d); place(); sun.color.set(t.sun); sun.intensity = t.si; hemi.color.set(t.hs); hemi.groundColor.set(t.hg); hemi.intensity = t.hi; fill.intensity = name === 'nacht' ? .15 : .35;
      scene.fog.color.set(t.fog); scene.fog.density = t.fd; renderer.toneMappingExposure = t.ex; const u = sky.material.uniforms; u.uT.value.set(t.top); u.uH.value.set(t.hor); u.uS.value.copy(d); u.uC.value.set(t.sun); u.uN.value = t.night;
      if (!(name in envs)) envs[name] = GC.env(T, renderer, t.env); scene.environment = envs[name]; if (ship) ship.setNight(t.night); };
    W.update = (dt) => { sky.position.copy(camera.position); };
    return W;
  };

  // ---------- Raumschiff als Größenvergleich: begehbare Flächen (Landebeine, Rampe, Rumpfunterseite) ----------
  G.shipSurfaces = world => {
    const HW = [[-13, .7], [-11.6, 1.8], [-9.4, 3.4], [-6.2, 5.5], [-2, 6.9], [2, 7.1], [6, 6.5], [10, 5.3]], BT = [[-13, .35], [-11.6, .6], [-9.4, .95], [-6.2, 1.2], [-2, 1.4], [2, 1.5], [6, 1.5], [10, 1.3]];
    const ip = (tb, z) => { if (z < tb[0][0] || z > tb[tb.length - 1][0]) return null; let i = 0; while (i < tb.length - 2 && z > tb[i + 1][0]) i++; const a = tb[i], b = tb[i + 1]; return a[1] + (b[1] - a[1]) * (z - a[0]) / (b[0] - a[0]); };
    const gears = [[-3.4, -6.4, 1.1], [3.4, -6.4, 1.1], [-4.9, 5.4, 1.4], [4.9, 5.4, 1.4]];
    world.surfaces.set('ref', (x, z) => { let h = -Infinity;
      for (const [px, pz, pr] of gears) { const d = Math.hypot(x - px, z - pz); if (d < .5) h = Math.max(h, 3); else if (d < pr) h = Math.max(h, .4); }
      if (Math.abs(x) < 1.8 && z > 10.05 && z < 16.6) h = Math.max(h, 1.364 - (z - 13.3) / 3);   // Laderampe
      if (Math.abs(x) < 2.4 && z > 8.6 && z <= 10.05) h = Math.max(h, 6);                          // Frachtraumwand
      return h; });
    world.ceilings.set('ref', (x, z) => { const hw = ip(HW, z), bt = ip(BT, z); return hw !== null && Math.abs(x) < hw ? 3.6 - bt : Infinity; });
  };

  // ---------- Bedienung ----------
  // Eingabe für begehbare Objekte (wird jede Frame gesetzt): mag 0..1, (dx,dz) = Richtung in Weltkoordinaten, jump
  G.input = { mag: 0, dx: 0, dz: 0, jump: false, sx: 0, sy: 0, down: false, boost: false, thr: null, keys: {} };
  G.start = () => {
    const T = THREE, GC = window.GC, $ = id => document.getElementById(id), canvas = $('c');
    const renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    const world = G.createWorld(T, renderer, GC), camera = world.camera; G.dbg = { renderer, world, set: (y, p, d) => { yaw = y; pitch = p; dist = d; view = null; auto = false; }, get ship() { return ship; } };
    const CAM0 = { ty: 4.6, tz: 1.5, dist: 58, min: 14, max: 150, near: .5, shadow: 30, pitch: .3, yaw: 3.74, auto: true, minY: 1.2 };
    let cur = null, ship = null, ref = null, C = CAM0, auto = true, engines = true, damage = true, t = 0, last = 0, yaw = 3.74, pitch = .3, dist = 58, view = null;
    const tgt = new T.Vector3(0, 4.6, 1.5), I = G.input, keys = {}, stick = { on: false, id: -1, x: 0, y: 0, m: 0 };
    let lastHud = '', jumpHeld = false, downHeld = false, boostHeld = false, baseFov = 38; I.keys = keys;
    const wrapA = a => a - 2 * Math.PI * Math.floor((a + Math.PI) / (2 * Math.PI));
    const sel = $('obj'); G.objects.forEach((o, i) => { const op = document.createElement('option'); op.value = i; op.textContent = o.name; sel.appendChild(op); });
    const chip = (id, f) => $(id).addEventListener('click', f), setOn = (id, v) => $(id).classList.toggle('on', v);
    // Objekt-spezifische Knöpfe (Aktionen), Größenvergleich, Menü ein-/ausklappen
    function buildActs() { const row = $('act'); row.innerHTML = '';
      const mk = (txt, f) => { const b = document.createElement('button'); b.textContent = txt; b.addEventListener('click', () => f(b)); row.appendChild(b); return b; };
      (ship.actions || []).forEach(a => { const lab = () => a.steps ? a.label + ': ' + a.steps[a.i] : a.label; const b = mk(lab(), b => { if (a.once) { a.fn(); } else if (a.steps) { a.i = (a.i + 1) % a.steps.length; a.fn(a.i); } else { a.on = !a.on; a.fn(a.on); b.classList.toggle('on', a.on); } b.textContent = lab(); }); if (a.on) b.classList.add('on'); });
      if (cur.compare) mk('Mit Raumschiff', b => { setRef(!ref); b.classList.toggle('on', !!ref); });
      mk('Menü', () => $('panel').classList.toggle('fold')); }
    function setRef(on) {
      if (ref) { world.scene.remove(ref.root); world.surfaces.delete('ref'); world.ceilings.delete('ref'); ref = null; }
      if (!on) return; const d = G.objects.find(o => o.id === 'raumschiff'); if (!d) return;
      ref = d.build(T, GC, { env: world.scene.environment }); ref.setEngines(0); ref.setDamage(damage ? 1 : 0); ref.setNight(G.TIMES[world.time].night); world.scene.add(ref.root); G.shipSurfaces(world);
      if (ship.teleport) { ship.teleport(0, 23, 0); tgt.copy(ship.focus); dist = 15; yaw = .6; pitch = .2; view = null; } }
    function load(i) {
      setRef(false); if (ship) { world.scene.remove(ship.root); ship = null; }
      cur = G.objects[i]; sel.value = i; ship = cur.build(T, GC, { env: world.scene.environment, world, input: I }); world.scene.add(ship.root);
      C = Object.assign({}, CAM0, cur.cam || {}); dist = C.dist; pitch = C.pitch; yaw = C.yaw; auto = C.auto; view = null; setOn('auto', auto); camera.near = C.near; camera.updateProjectionMatrix();
      ship.setEngines(engines ? 1 : 0); ship.setDamage(damage ? 1 : 0); world.setTime(world.time, ship); $('info').textContent = cur.info || '';
      $('eng').textContent = (cur.labels && cur.labels.eng) || 'Triebwerke'; $('boom').style.display = ship.explode ? '' : 'none'; $('boom').textContent = 'Explodieren';
      ship.root.traverse(o => { if (o.isMesh && !o.material.transparent) { o.castShadow = o.castShadow !== false; } });
      if (ship.focus) tgt.copy(ship.focus); else tgt.set(0, C.ty, C.tz);
      if (!ship.focus) world.follow(0, 3, C.shadow);
      $('ctl').classList.toggle('show', !!ship.controls); const ui = ship.ui || {}; $('jmp').textContent = ui.a || 'SPRUNG'; $('bb').textContent = ui.b || ''; $('bb').style.display = ui.b ? 'flex' : 'none'; $('bst').textContent = ui.boost || ''; $('bst').style.display = ui.boost ? 'flex' : 'none'; $('thrw').style.display = ui.thr ? 'block' : 'none'; $('hud').textContent = ''; document.body.classList.toggle('air', !!ui.thr); $('panel').classList.toggle('fold', !!ship.controls && (innerHeight < 720 || innerWidth < 520));
      buildActs(); fitPanel(); }
    // Kamera: Orbit mit Maus, Touch, Pinch, Mausrad
    const ptr = new Map(); let pinch0 = 0, moved = 0, lastTap = 0;
    canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); ptr.set(e.pointerId, [e.clientX, e.clientY]); moved = 0; view = null; if (ptr.size === 2) { const [a, b] = [...ptr.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); } });
    canvas.addEventListener('pointermove', e => { const p = ptr.get(e.pointerId); if (!p) return; const dx = e.clientX - p[0], dy = e.clientY - p[1]; p[0] = e.clientX; p[1] = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
      if (ptr.size === 1) { yaw -= dx * .006; pitch = Math.min(1.45, Math.max(.03, pitch + dy * .005)); } else if (ptr.size === 2) { const [a, b] = [...ptr.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch0) dist = Math.min(C.max, Math.max(C.min, dist * pinch0 / d)); pinch0 = d; } });
    const up = e => { ptr.delete(e.pointerId); if (ptr.size < 2) pinch0 = 0; if (!ptr.size && moved < 8) { const n = Date.now(); if (n - lastTap < 320) setView('front'); lastTap = n; } };
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', e => { e.preventDefault(); dist = Math.min(C.max, Math.max(C.min, dist * (1 + e.deltaY * .001))); }, { passive: false });
    const VIEWS = { front: [3.74, .3, 56], side: [-1.5708, .1, 54], back: [-.55, .3, 56], top: [3.3, 1.3, 60] };
    function setView(k) { const v = VIEWS[k]; view = [v[0] + (ship.heading || 0), v[1], v[2] * C.dist / 58]; auto = false; $('auto').classList.remove('on'); }
    // Joystick und Sprungknopf (Touch und Maus), Tastatur: WASD / Pfeile, Leertaste, Shift
    const pad = $('pad'), knob = $('knob'), RS = 46;
    function stickMove(e) { const r = pad.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2), l = Math.hypot(dx, dy), k = l > RS ? RS / l : 1, m = Math.min(1, l / RS);
      knob.style.transform = `translate(${dx * k}px,${dy * k}px)`; stick.m = m < .14 ? 0 : (m - .14) / .86; stick.x = l ? dx / l : 0; stick.y = l ? -dy / l : 0; stick.on = stick.m > 0; }
    pad.addEventListener('pointerdown', e => { pad.setPointerCapture(e.pointerId); stick.id = e.pointerId; stickMove(e); e.preventDefault(); });
    pad.addEventListener('pointermove', e => { if (e.pointerId === stick.id) stickMove(e); });
    const stickEnd = e => { if (e.pointerId !== stick.id) return; stick.id = -1; stick.on = false; stick.m = 0; knob.style.transform = ''; };
    pad.addEventListener('pointerup', stickEnd); pad.addEventListener('pointercancel', stickEnd);
    const jb = $('jmp'); jb.addEventListener('pointerdown', e => { jumpHeld = true; jb.classList.add('on'); jb.setPointerCapture(e.pointerId); e.preventDefault(); });
    const jEnd = () => { jumpHeld = false; jb.classList.remove('on'); }; jb.addEventListener('pointerup', jEnd); jb.addEventListener('pointercancel', jEnd);
    const hold = (id, set) => { const el = $(id); el.addEventListener('pointerdown', e => { set(true); el.classList.add('on'); el.setPointerCapture(e.pointerId); e.preventDefault(); }); const end = () => { set(false); el.classList.remove('on'); }; el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end); };
    hold('bb', v => downHeld = v); hold('bst', v => boostHeld = v);
    const thw = $('thrw'); let thId = -1; const thSet = e => { const r = thw.getBoundingClientRect(); I.thr = Math.min(1, Math.max(0, 1 - (e.clientY - r.top) / r.height)); };
    thw.addEventListener('pointerdown', e => { thw.setPointerCapture(e.pointerId); thId = e.pointerId; thSet(e); e.preventDefault(); }); thw.addEventListener('pointermove', e => { if (e.pointerId === thId) thSet(e); });
    const thEnd = e => { if (e.pointerId === thId) { thId = -1; I.thr = null; } }; thw.addEventListener('pointerup', thEnd); thw.addEventListener('pointercancel', thEnd);
    addEventListener('keydown', e => { if (e.target.tagName === 'SELECT') return; if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) { e.preventDefault(); if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } keys[e.code] = true; });
    addEventListener('keyup', e => { keys[e.code] = false; }); addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
    // Knöpfe
    function applyTime(name) { world.setTime(name, ship); if (ref) ref.setNight(G.TIMES[name].night); document.querySelectorAll('[data-time]').forEach(x => x.classList.toggle('on', x.dataset.time === name)); }
    document.querySelectorAll('[data-time]').forEach(b => b.addEventListener('click', () => applyTime(b.dataset.time)));
    document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));
    chip('eng', () => { engines = !engines; ship.setEngines(engines ? 1 : 0); setOn('eng', engines); }); chip('dmg', () => { damage = !damage; ship.setDamage(damage ? 1 : 0); if (ref) ref.setDamage(damage ? 1 : 0); setOn('dmg', damage); });
    chip('auto', () => { auto = !auto; setOn('auto', auto); view = null; });
    chip('boom', () => { if (!ship.explode) return; if (ship.exploded) { ship.reset(); world.shake = 0; $('boom').textContent = 'Explodieren'; } else { ship.explode(e => { world.shake = Math.max(0, 1 - e * .7) * Math.exp(-e); }); $('boom').textContent = 'Zurücksetzen'; } });
    chip('shot', () => { renderer.render(world.scene, camera); canvas.toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = (cur.id || 'objekt') + '.png'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }); });
    sel.addEventListener('change', () => { load(+sel.value); sel.blur(); });
    // Steuerelemente über dem Bedienfeld positionieren
    function fitPanel() { document.documentElement.style.setProperty('--ph', $('panel').offsetHeight + 'px'); }
    if (window.ResizeObserver) new ResizeObserver(fitPanel).observe($('panel'));
    function resize() { const pr = Math.min(devicePixelRatio, innerWidth < 900 ? 1.75 : 2); renderer.setPixelRatio(pr); renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; baseFov = camera.aspect < .8 ? 52 : 38; camera.fov = baseFov; camera.updateProjectionMatrix(); GC.pointSz.value = innerHeight * pr * 1.4; fitPanel(); }
    addEventListener('resize', resize); resize(); world.setTime('tag', null); load(0); world.setTime('tag', ship);
    (function frame(now) { requestAnimationFrame(frame); const dt = Math.min((now - last) / 1000 || .016, .05); last = now; t += dt;
      // Eingabe -> Bewegungsrichtung relativ zur Kamera
      if (ship.controls) { let ix = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0), iy = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0), m = 0;
        if (stick.on) { ix = stick.x; iy = stick.y; m = stick.m; } else if (ix || iy) { const l = Math.hypot(ix, iy); ix /= l; iy /= l; m = keys.ShiftLeft || keys.ShiftRight ? 1 : .5; }
        const sy = Math.sin(yaw), cy = Math.cos(yaw), wx = -sy * iy + cy * ix, wz = -cy * iy - sy * ix, l = Math.hypot(wx, wz) || 1;
        I.mag = m; I.dx = wx / l; I.dz = wz / l; I.jump = !!(keys.Space || jumpHeld);
        I.sx = stick.on ? stick.x * stick.m : ((keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0)); I.sy = stick.on ? stick.y * stick.m : ((keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0));
        I.down = !!(keys.KeyC || keys.ControlLeft || keys.ControlRight || downHeld); I.boost = !!(keys.ShiftLeft || keys.ShiftRight || boostHeld); }
      if (view) { yaw += (((view[0] - yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * Math.min(1, dt * 3.5); pitch += (view[1] - pitch) * Math.min(1, dt * 3.5); dist += (view[2] - dist) * Math.min(1, dt * 3.5); } else if (auto && !ptr.size) yaw += dt * .13;
      ship.update(dt, t, I); if (ref) ref.update(dt, t); world.update(dt);
      const f = ship.focus, ch = ship.chase ? ship.chase() : null;
      if (ch && !ptr.size && !view) { const kk = Math.min(1, dt * ch.k); yaw += wrapA(ch.yaw - yaw) * kk; pitch += (ch.pitch - pitch) * kk; dist += (ch.dist - dist) * kk; if (auto) { auto = false; setOn('auto', false); } }
      const fovT = baseFov + (ch ? ch.fov : 0); if (Math.abs(camera.fov - fovT) > .02) { camera.fov += (fovT - camera.fov) * Math.min(1, dt * 4); camera.updateProjectionMatrix(); }
      if (f) { const fk = ship.focusK || [9, 3.5], k = Math.min(1, dt * fk[0]); tgt.x += (f.x - tgt.x) * k; tgt.z += (f.z - tgt.z) * k; tgt.y += (f.y - tgt.y) * Math.min(1, dt * fk[1]); world.recenter(f.x, f.z);
        const sh = ship.shadow ? ship.shadow() : null; if (sh) world.follow(sh.x, sh.z, ref ? 34 : C.shadow, sh.y, sh.dist); else { const q = 1.5; world.follow(Math.round(f.x / q) * q, Math.round(f.z / q) * q, ref ? 34 : C.shadow); } } else tgt.set(0, C.ty, C.tz);
      if (ship.hud) { const h = ship.hud(); if (h !== lastHud) { $('hud').textContent = h; lastHud = h; } }
      if (ship.thr !== undefined) $('thrf').style.height = (ship.thr * 100) + '%';
      const cp = Math.cos(pitch), sh = world.shake * 1.1; camera.position.set(tgt.x + Math.sin(yaw) * cp * dist + (Math.random() - .5) * sh, tgt.y + Math.sin(pitch) * dist + (Math.random() - .5) * sh, tgt.z + Math.cos(yaw) * cp * dist); camera.lookAt(tgt);
      const gmin = ship.controls ? world.heightAt(camera.position.x, camera.position.z) + C.minY : C.minY; if (camera.position.y < gmin) camera.position.y = gmin;
      renderer.render(world.scene, camera); })(0);
  };
  return G;
})();
