// gfx/bridge.js – verbindet die neuen Modelle (Schiff „Kojote“, Buggy „Skarab“, Arbeiter „Fennek“) mit dem Spiel.
// Das Spiel behält seine Physik, Karte und Level; die Modelle werden nur gezeichnet und animiert.
window.Gfx = (() => {
  const T = THREE, GC = window.GC, G = { ok: false }, models = [], mats = [], seen = new Set();
  let env = null, scene = null, renderer = null, camera = null, lodNear = true, lodMesh = null, lodKids = [], car = null, kojote = null, shipGrp = null, lastDay = -1, wcount = 0, scrT = 0;
  const WS = 1.75;                       // Maßstab Arbeiter (Modell 1,98 m -> ca. 3,5 Einheiten, wie die alten Block-Arbeiter)
  try { const c = JSON.parse(localStorage.getItem('dp_cfg') || '{}'); GC.texSize = (c.gq == null ? 2 : c.gq) >= 2 ? 512 : 256; } catch (e) { GC.texSize = 512; }   // Texturgröße nach Grafikqualität
  const find = id => (window.Gallery ? Gallery.objects.find(o => o.id === id) : null);
  // ---------- Optimierung: statische Teile je Material zusammenfassen (weniger Draw-Calls) ----------
  // Ein Probelauf mit wechselnden Zuständen findet heraus, welche Objekte sich bewegen, einblenden oder ihre Form ändern; nur der Rest wird verschmolzen.
  const sample = a => { const o = [], st = Math.max(1, Math.floor(a.length / 24)); for (let i = 0; i < a.length; i += st) o.push(a[i]); return o; };
  const snap = root => { const m = new Map(); root.traverse(o => { if (o === root) return; o.updateMatrix(); m.set(o, { mat: o.matrix.elements.slice(), vis: o.visible, pos: o.isMesh && o.geometry.attributes.position ? sample(o.geometry.attributes.position.array) : null, msig: o.isMesh && !Array.isArray(o.material) ? [o.material.color ? o.material.color.getHex() : 0, o.material.emissive ? o.material.emissive.getHex() : 0, o.material.emissiveIntensity, o.material.opacity].join() : '' }); }); return m; };
  const VCM = { metal: new T.MeshStandardMaterial({ vertexColors: true, metalness: .85, roughness: .3 }), matte: new T.MeshStandardMaterial({ vertexColors: true, metalness: .15, roughness: .75 }), basic: new T.MeshBasicMaterial({ vertexColors: true }) };
  const bakeGroup = g => { g.updateMatrixWorld(true); const inv = new T.Matrix4().copy(g.matrixWorld).invert(), by = new Map(), dead = [];
    const walk = o => o.children.forEach(c => { if (c.userData.joint) return; const ga = c.geometry && c.geometry.attributes;
      if (c.isMesh && !c.userData.keep && !c.isInstancedMesh && !Array.isArray(c.material) && c.geometry.index && ga.normal && !ga.color && !c.material.transparent) {
        const m = c.material, plain = !m.map && !m.bumpMap && !m.emissiveMap && m.side === T.FrontSide && (m.isMeshBasicMaterial || (m.isMeshStandardMaterial && (!m.emissive || m.emissive.getHex() === 0 || !m.emissiveIntensity)));
        if (!plain && !ga.uv) return;
        const ge = c.geometry.clone(); ge.applyMatrix4(new T.Matrix4().multiplyMatrices(inv, c.matrixWorld)); let key = m.uuid, mat = m;
        if (plain) { const col = GC.avg(m), n = ge.attributes.position.count, ca = new Float32Array(n * 3); for (let i = 0; i < n; i++) { ca[i * 3] = col[0]; ca[i * 3 + 1] = col[1]; ca[i * 3 + 2] = col[2]; } ge.setAttribute('color', new T.BufferAttribute(ca, 3)); const k2 = m.isMeshBasicMaterial ? 'basic' : (m.metalness > .5 ? 'metal' : 'matte'); key = 'vc_' + k2; mat = VCM[k2]; }
        if (!by.has(key)) by.set(key, { m: mat, gs: [], vc: plain }); by.get(key).gs.push(ge); dead.push(c); }
      else if (!c.isMesh && !c.isPoints) walk(c); });
    walk(g); dead.forEach(c => c.parent.remove(c));
    by.forEach(({ m, gs, vc }) => { let nv = 0, ni = 0; gs.forEach(x => { nv += x.attributes.position.count; ni += x.index.count; }); const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), U = new Float32Array(vc ? 0 : nv * 2), Cc = new Float32Array(vc ? nv * 3 : 0), I = new Uint32Array(ni); let vo = 0, io = 0;
      gs.forEach(x => { P.set(x.attributes.position.array, vo * 3); N.set(x.attributes.normal.array, vo * 3); if (vc) Cc.set(x.attributes.color.array, vo * 3); else U.set(x.attributes.uv.array, vo * 2); const ix = x.index.array; for (let i = 0; i < ix.length; i++) I[io + i] = ix[i] + vo; vo += x.attributes.position.count; io += ix.length; });
      const ge = new T.BufferGeometry(); ge.setAttribute('position', new T.BufferAttribute(P, 3)); ge.setAttribute('normal', new T.BufferAttribute(N, 3)); if (vc) ge.setAttribute('color', new T.BufferAttribute(Cc, 3)); else ge.setAttribute('uv', new T.BufferAttribute(U, 2)); ge.setIndex(new T.BufferAttribute(I, 1)); g.add(new T.Mesh(ge, m)); }); };
  // variants: Liste von Funktionen, die das Modell in verschiedene Zustände bringen; restore setzt zurück
  const autoMerge = (model, variants, restore, staticGroups) => {
    const root = model.root; root.updateMatrixWorld(true); const s0 = snap(root), dyn = new Set(); let tt = 0;
    variants.forEach(v => { v(tt += .23); const s1 = snap(root); s1.forEach((a, o) => { const b = s0.get(o); if (b && (a.vis !== b.vis || a.mat.some((x, i) => Math.abs(x - b.mat[i]) > 1e-6) || (a.pos && b.pos && a.pos.some((x, i) => x !== b.pos[i])) || a.msig !== b.msig)) dyn.add(o); }); });
    restore && restore(); const before = (() => { let n = 0; root.traverse(o => { if (o.isMesh) n++; }); return n; })();
    dyn.forEach(o => { if (o.isMesh) o.userData.keep = true; else o.userData.joint = true; }); (staticGroups || []).forEach(g => { g.userData.joint = true; });
    const groups = [root]; root.traverse(o => { if (o.userData.joint) groups.push(o); }); groups.forEach(bakeGroup);
    let after = 0; root.traverse(o => { if (o.isMesh) after++; }); return { before, after, dynamic: dyn.size };
  };
  // Fernansicht (Vertexfarben): alle opaken Meshes in wenige Meshes, Farbe = Durchschnitt des Materials
  const snapshotVC = root => { root.updateMatrixWorld(true); const inv = new T.Matrix4().copy(root.matrixWorld).invert(), gs = [];
    root.traverse(o => { if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material)) return; const m = o.material; if (!(m.isMeshStandardMaterial || m.isMeshBasicMaterial) || m.transparent || !o.geometry.index || !o.geometry.attributes.normal) return;
      const ge = o.geometry.clone(); ge.applyMatrix4(new T.Matrix4().multiplyMatrices(inv, o.matrixWorld)); const col = GC.avg(m), n = ge.attributes.position.count, ca = new Float32Array(n * 3); for (let i = 0; i < n; i++) { ca[i * 3] = col[0]; ca[i * 3 + 1] = col[1]; ca[i * 3 + 2] = col[2]; } ge.setAttribute('color', new T.BufferAttribute(ca, 3)); gs.push(ge); });
    let nv = 0, ni = 0; gs.forEach(x => { nv += x.attributes.position.count; ni += x.index.count; }); const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), Cc = new Float32Array(nv * 3), I = new Uint32Array(ni); let vo = 0, io = 0;
    gs.forEach(x => { P.set(x.attributes.position.array, vo * 3); N.set(x.attributes.normal.array, vo * 3); Cc.set(x.attributes.color.array, vo * 3); const ix = x.index.array; for (let i = 0; i < ix.length; i++) I[io + i] = ix[i] + vo; vo += x.attributes.position.count; io += ix.length; });
    const ge = new T.BufferGeometry(); ge.setAttribute('position', new T.BufferAttribute(P, 3)); ge.setAttribute('normal', new T.BufferAttribute(N, 3)); ge.setAttribute('color', new T.BufferAttribute(Cc, 3)); ge.setIndex(new T.BufferAttribute(I, 1));
    const me = new T.Mesh(ge, new T.MeshStandardMaterial({ vertexColors: true, roughness: .7, metalness: .25 })); me.userData.lod = true; return me; };
  // Umgebungslicht (Reflexionen) für die Modelle: einmal aus einem Himmel erzeugen; Stärke folgt dem Tageslicht
  const register = root => root.traverse(o => { if (!o.isMesh) return; [].concat(o.material).forEach(m => { if (m && m.isMeshStandardMaterial && !seen.has(m)) { seen.add(m); m.userData.eiB = m.envMapIntensity; if (env) m.envMap = env; mats.push(m); } }); });
  G.init = o => {
    renderer = o.renderer; scene = o.scene; camera = o.camera;
    if (!window.GFX_NOENV) { try { env = GC.env(T, renderer, { top: 0x5a90d0, hor: 0xf0dcc0, gnd: 0xb08850, sun: [.6, .75, .5], sunCol: 0xfff0d8 }); } catch (e) { env = null; } }
    G.ok = !!(find('buggy') && find('raumschiff') && find('arbeiter'));
  };
  // ---------- Auto -> Buggy „Skarab“ (Physik bleibt im Spiel: Position, Lenkung, Radfederung kommen von dort) ----------
  G.makeCar = (carGrp, o) => {
    car = carGrp; const SC = .85, cRef = .23, b = find('buggy').build(T, GC, { env, external: { scale: SC, cRef } });
    b.root.scale.setScalar(SC); b.root.position.y = -(o.S0 - cRef); carGrp.add(b.root); if (b.world) scene.add(b.world);
    b.setDamage(1); b.setNight(0); b.setLights(0);
    const E = (spd, vf, st, boost, comp) => ({ spd, vf, st, boost, comp });
    G.carStats = autoMerge(b, [t => { b.setNight(1); b.setLights(1); b.update(.016, t, E(12, 12, .8, true, [.1, .35, .2, .4])); }, t => { b.setNight(0); b.setLights(0); b.setDamage(0); b.update(.016, t, E(3, -3, -.8, false, [.4, .1, .35, .15])); }, t => { b.setDamage(1); b.update(.3, t + 1, E(20, 20, 0, true, [.2, .2, .3, .3])); }], () => { b.setNight(0); b.setLights(0); b.setDamage(1); b.update(.016, 0, E(0, 0, 0, false, [.23, .23, .23, .23])); });
    register(b.root); models.push(b); G.car = b; return b;
  };
  // ---------- Rakete -> Raumschiff „Kojote“ (Landung an der Basis, explodiert in der Story) ----------
  G.makeShip = (grp, blobTex) => {
    shipGrp = grp; const s = find('raumschiff').build(T, GC, { env }); s.root.scale.setScalar(.6); grp.add(s.root); s.setEngines(0); s.setDamage(1); s.setNight(0);
    const blob = new T.Mesh(new T.PlaneGeometry(26, 28), new T.MeshBasicMaterial({ map: blobTex, transparent: true, opacity: .75, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    blob.rotation.x = -Math.PI / 2; blob.position.y = .1; grp.add(blob); G.blob = blob;
    s.root.updateMatrixWorld(true); const lights = []; s.root.traverse(o => { if (o.isLight) lights.push(o); }); lights.forEach(l => s.root.attach(l));   // Lichter bleiben immer aktiv (sonst würden Shader beim Umschalten neu kompiliert)
    lodKids = s.root.children.filter(c => c.isGroup);
    G.shipStats = autoMerge(s, [t => { s.setEngines(1); s.setNight(1); s.setDamage(0); s.update(.2, t); }, t => { s.setEngines(0); s.setNight(0); s.setDamage(1); s.update(.7, t * 3); }, t => { s.setEngines(1); s.update(.9, t * 5); }], () => { s.setEngines(0); s.setNight(0); s.setDamage(1); }, lodKids);
    lodMesh = snapshotVC(s.root); lodMesh.visible = false; s.root.add(lodMesh); G.lod = lodMesh;
    register(s.root); models.push(s); kojote = s; G.ship = s; return s;
  };
  const setNear = n => { if (n === lodNear || !lodMesh) return; lodNear = n; lodKids.forEach(c => { c.visible = n; }); lodMesh.visible = !n; };
  G.shipBoom = () => { setNear(true); if (kojote && !kojote.exploded) kojote.explode(() => {}); if (G.blob) G.blob.visible = false; };
  G.shipHide = () => { if (shipGrp) shipGrp.visible = false; };
  // ---------- Arbeiter (RTS): n = Anzahl bisheriger Einheiten; ab der dritten abgespeckte Variante (Draw-Calls) ----------
  G.worker = (sold, n) => {
    const s = find('arbeiter').build(T, GC, { embedded: true, lite: n >= 2, variant: sold ? 'soldat' : 'arbeiter', gravity: 9.8 });
    s.root.scale.setScalar(WS); s.setEngines(1); s.setDamage(1); s.setNight(lastDay < 0 ? 0 : 1 - lastDay); register(s.root); models.push(s); wcount++;
    return { g: s.root, pose(dt, t, spd, work, parent) { if (parent) parent.updateMatrixWorld(true); s.pose(dt, t, { speed: spd / WS, work }); } };
  };
  // ---------- pro Frame: Tageszeit, Modelle aktualisieren ----------
  G.frame = (dt, tt, dayF, shipDist, E) => {
    if (Math.abs(dayF - lastDay) > .02) {
      lastDay = dayF; const n = 1 - dayF, k = .15 + .85 * dayF;
      models.forEach(m => m.setNight(n)); mats.forEach(m => { m.envMapIntensity = (m.userData.eiB == null ? 1 : m.userData.eiB) * k; });
      if (G.car) G.car.setLights(n > .45 ? 1 : 0);
    }
    if (G.car) G.car.update(dt, tt, E);
    if (kojote && shipGrp && shipGrp.visible && shipDist < 450) { if (camera && !kojote.exploded) { const d = camera.position.distanceTo(shipGrp.position); setNear(G.forceLod != null ? G.forceLod : (lodNear ? d < 105 : d < 80)); } kojote.update(dt, tt); }
    if (wcount && (scrT -= dt) <= 0 && window.__ARB && __ARB.tick) { scrT = .12; __ARB.tick(tt, false); }
  };
  return G;
})();
