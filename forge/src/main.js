// Desert Forge – Einstieg: Renderer, Szene, Kamera, Eingabe, Objektverwaltung.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { Atmosphere, PRESETS } from './core/atmosphere.js';
import { Physics, ColliderDebug } from './core/physics.js';
import { FX } from './core/fx.js';
import { env, createObject, defaultParams } from './core/forge.js';
import { weather } from './core/materials.js';
import { PREBAKE, surface } from './core/textures.js';
import { audio } from './core/audio.js';
import { OBJECTS, TEST_OBJECTS } from './objects/index.js';
import { buildUI } from './ui.js';
import * as CANNON from 'cannon-es';
import { CityMode } from './city/index.js';
import { buildCityUI } from './city/ui.js';
import { Game } from './studio/game.js';
import { Hud } from './studio/hud.js';
import { buildStudioUI } from './studio/ui.js';

const stage = document.getElementById('stage');
const loading = document.getElementById('loading');
const loadingBar = document.getElementById('loading-bar');
const loadingText = document.getElementById('loading-text');
const tick = () => new Promise((r) => setTimeout(r, 0));

async function boot() {
  /* ── Renderer / Szene ── */
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.tabIndex = 0;
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 8000);
  camera.position.set(9, 5, 13);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.minDistance = 1.5;
  controls.maxDistance = 140;
  controls.target.set(0, 1.5, 0);

  /* ── Texturen vorbacken (mit Fortschrittsanzeige) ── */
  for (let i = 0; i < PREBAKE.length; i++) {
    loadingText.textContent = `Oberflächen werden gebacken ${i + 1}/${PREBAKE.length}`;
    loadingBar.style.width = `${((i + 1) / PREBAKE.length) * 100}%`;
    await tick();
    surface(...PREBAKE[i]);
  }
  loadingText.textContent = 'Wüste wird aufgebaut';
  await tick();

  const physics = new Physics();
  const atmosphere = new Atmosphere(scene, renderer);
  const fx = new FX(scene);
  const debug = new ColliderDebug(scene, physics);
  env.scene = scene;
  env.physics = physics;
  env.fx = fx;

  let shake = 0;
  fx.onShake = (a) => { shake = Math.max(shake, a); };

  /* ── Größe ── */
  function resize() {
    const w = stage.clientWidth || 800, h = stage.clientHeight || 600;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const buf = renderer.getDrawingBufferSize(new THREE.Vector2());
    fx.setView(buf.y, camera.fov);
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  /* ── Eingabe ── */
  const keys = new Set();
  const UPV = new THREE.Vector3(0, 1, 0);
  const typing = (e) => /^(INPUT|SELECT|TEXTAREA)$/.test(e.target?.tagName ?? '') && e.target.type !== 'range' && e.target.type !== 'checkbox';
  window.addEventListener('keydown', (e) => {
    audio.init();
    const nav = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code);
    if (forge.city && forge.city.game && forge.city.game.running) { // Spiel läuft: Tasten gehören dem Spiel
      if (nav || e.code === 'Tab') e.preventDefault();
      keys.add(e.code);
      return;
    }
    if (forge.mode === 'city') {
      if (typing(e)) return;
      if (nav && forge.city.camMode !== 'orbit') e.preventDefault();
      if (e.code === 'Escape') forge.city.select(null);
      else if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const m = { Digit1: 'orbit', Digit2: 'fly', Digit3: 'walk', Digit4: 'drive', Digit5: 'tour' }[e.code];
        if (m) forge.city.setMode(m);
        else if (e.code === 'KeyH') { if (forge.city.camMode !== 'orbit') forge.city.setMode('orbit'); forge.city.overview(); }
      }
      if (forge.city.camMode === 'tour' && ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) forge.city.setMode('fly');
      keys.add(e.code);
      return;
    }
    if (forge.testing && nav) e.preventDefault();
    if (e.code === 'Escape' && forge.testing) forge.setTest(false);
    keys.add(e.code);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());
  renderer.domElement.addEventListener('pointerdown', () => { audio.init(); renderer.domElement.focus(); });

  const fwdV = new THREE.Vector3(), rightV = new THREE.Vector3();
  function readInput() {
    const k = keys;
    const thr = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    const steer = (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0) - (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0);
    camera.getWorldDirection(fwdV);
    fwdV.y = 0;
    fwdV.normalize();
    rightV.crossVectors(fwdV, UPV);
    let mx = fwdV.x * thr - rightV.x * steer, mz = fwdV.z * thr - rightV.z * steer;
    const l = Math.hypot(mx, mz);
    if (l > 1) { mx /= l; mz /= l; }
    return {
      throttle: thr, steer, brake: k.has('Space'), boost: k.has('ShiftLeft') || k.has('ShiftRight'),
      moveX: mx, moveZ: mz, jump: k.has('Space'), run: k.has('ShiftLeft') || k.has('ShiftRight'),
    };
  }

  /* ── Forge-Zustand ── */
  const listeners = new Set();
  const store = {};
  const forge = {
    objects: OBJECTS,
    mode: 'workshop',
    keys,
    id: null,
    def: null,
    obj: null,
    params: {},
    extras: [],
    testing: false,
    buildStyle: 'assemble',
    buildTime: 4,
    scene, camera, controls, renderer, atmosphere, physics, fx, debug, weather,
    PRESETS,
    on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    emit() { for (const fn of listeners) fn(forge); },

    select(id, { animate = true } = {}) {
      if (forge.testing) forge.setTest(false);
      forge.clearExtras();
      const def = OBJECTS[id];
      forge.id = id;
      forge.def = def;
      forge.buildStyle = def.buildStyle ?? 'assemble';
      store[id] = store[id] ?? defaultParams(def);
      forge.params = store[id];
      forge._make();
      forge.frame();
      if (animate) forge.build();
      forge.emit();
    },

    _make() {
      if (forge.obj) forge.obj.dispose();
      forge.obj = createObject(forge.def, forge.params);
      forge.obj.place(0, 0, 0);
      forge.obj.spawn();
    },

    setParam(key, value) {
      forge.params[key] = value;
      if (forge.testing) forge.setTest(false);
      const wasBuilt = forge.obj && forge.obj.state !== 'building';
      forge._make();
      if (!wasBuilt) forge.build();
      forge.emit();
    },

    randomize() {
      const sd = forge.def.params.find((p) => p.type === 'seed');
      if (sd) forge.setParam(sd.key, Math.floor(Math.random() * 9999));
    },

    resetParams() {
      store[forge.id] = defaultParams(forge.def);
      forge.params = store[forge.id];
      forge._make();
      forge.emit();
    },

    build(style = forge.buildStyle) {
      if (forge.testing) forge.setTest(false);
      forge.obj.playBuild({ duration: forge.buildTime, style });
      forge.emit();
    },
    explode(strength = 1) {
      if (forge.testing) forge.setTest(false);
      audio.init();
      forge.obj.explode({ strength });
      forge.emit();
    },
    reset() {
      if (forge.testing) forge.setTest(false);
      forge.obj.reset();
      forge.emit();
    },

    setTest(on) {
      const o = forge.obj;
      if (on && !(o && ['vehicle', 'hover', 'character'].includes(o.mode))) return;
      if (on && o.state !== 'active') o.reset();
      forge.testing = on;
      o.controlled = on;
      controls.enabled = !on || o.mode === 'character';
      if (on) {
        renderer.domElement.focus();
        audio.init();
      } else {
        controls.target.copy(o.root.position).add(new THREE.Vector3(0, 1.2, 0));
      }
      forge.emit();
    },

    // Hindernisse zum Testen der Physik: Wand, Rampe, Kistenstapel
    addObstacles() {
      forge.clearExtras();
      const specs = [
        ['supplyPile', { x: 0, z: 14 }],
        ['testCourse', { x: 0, z: 0 }],
      ];
      for (const [id, pos] of specs) {
        const def = OBJECTS[id] ?? TEST_OBJECTS[id];
        const o = createObject(def);
        o.place(pos.x, pos.z, 0);
        o.spawn();
        forge.extras.push(o);
      }
      forge.emit();
    },
    clearExtras() {
      for (const o of forge.extras) o.dispose();
      forge.extras = [];
    },

    frame() {
      const o = forge.obj;
      if (!o) return;
      const b = o.bounds();
      const c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3());
      const r = Math.max(s.x, s.y, s.z, 2) * 0.5;
      const dist = r / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.15;
      controls.target.set(c.x, Math.min(c.y, s.y * 0.45 + 0.3), c.z);
      camera.position.set(c.x + dist * 0.62, c.y + dist * 0.34, c.z + dist * 0.8);
      controls.update();
    },

    exportGLB() {
      const o = forge.obj;
      if (!o) return;
      if (o.state !== 'active' && o.state !== 'idle') o.reset();
      const exporter = new GLTFExporter();
      exporter.parse(
        o.root,
        (buf) => {
          const blob = new Blob([buf], { type: 'model/gltf-binary' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `${forge.id}.glb`;
          a.click();
        },
        (err) => console.error(err),
        { binary: true, onlyVisible: true }
      );
    },

    recipe() {
      return JSON.stringify({ object: forge.id, params: forge.params, weather: { dirt: weather.uDirt.value, sand: weather.uSand.value, wear: weather.uWear.value }, light: atmosphere.state }, null, 1);
    },

    // Für Tests: Physik/Objekt ohne Rendern vorspulen
    simulate(seconds, input = null) {
      const n = Math.round(seconds * 60);
      for (let i = 0; i < n; i++) {
        physics.step(1 / 60);
        for (const o of [forge.obj, ...forge.extras]) if (o) o.update(1 / 60, o === forge.obj ? input : null);
        fx.update(1 / 60);
      }
    },
  };
  forge.CANNON = CANNON;
  window.__forge = forge;

  /* ── Stadt-Modus ── */
  const cityMode = new CityMode(forge);
  forge.city = cityMode;
  const progress = (f, text) => {
    loadingBar.style.width = `${Math.round(f * 100)}%`;
    loadingText.textContent = text;
  };
  const loadingSub = document.getElementById('loading-sub');
  forge.regenerateCity = async (seed) => {
    loading.classList.remove('done');
    loadingSub.textContent = 'Neue Stadt wird gebaut';
    progress(0.6, 'Stadtplan wird entworfen');
    await tick();
    await cityMode.generate(seed, progress);
    loading.classList.add('done');
  };
  const modeBtns = { city: document.getElementById('m-city'), studio: document.getElementById('m-studio'), workshop: document.getElementById('m-work') };
  let switching = false;
  forge.setMode = async (mode, seed) => {
    const studio = mode === 'studio';
    if (studio) mode = 'city';
    if (switching || (mode === forge.mode && !seed && studio === document.body.classList.contains('studio'))) return;
    switching = true;
    try {
      if (mode === 'city') {
        if (!cityMode.city) {
          loading.classList.remove('done');
          loadingSub.textContent = 'Die Stadt wird aus allen Modellen gebaut – das dauert beim ersten Mal ein paar Sekunden.';
          progress(0.02, 'Bausteine werden gebacken');
          await tick();
          await cityMode.load(seed, progress);
        }
        forge.mode = 'city';
        document.body.classList.add('mode-city');
        cityMode.enter();
        document.getElementById('brand-sub').textContent = '';
        document.getElementById('hint').hidden = false;
      } else {
        cityMode.exit();
        forge.mode = 'workshop';
        document.body.classList.remove('mode-city');
        document.getElementById('tg-left').textContent = 'Objekte';
        document.getElementById('tg-right').textContent = 'Regler';
        document.getElementById('hint').hidden = true;
        forge.select(forge.id ?? Object.keys(OBJECTS)[0], { animate: false });
      }
      document.body.classList.remove('p-left', 'p-right');
      for (const b of [document.getElementById('tg-left'), document.getElementById('tg-right')]) b.setAttribute('aria-pressed', 'false');
      document.body.classList.toggle('studio', studio && mode === 'city');
      if (studio && mode === 'city') forge.game.prewarm();
      for (const [m, b] of Object.entries(modeBtns)) b.setAttribute('aria-pressed', String(m === 'studio' ? studio : m === 'city' ? mode === 'city' && !studio : mode === 'workshop'));
      try { history.replaceState(null, '', studio ? '#studio' : mode === 'city' ? '#stadt' : '#werkstatt'); } catch (e) { /* in eingebetteten Fenstern nicht erlaubt */ }
      resize();
    } finally {
      loading.classList.add('done');
      switching = false;
    }
  };
  modeBtns.city.addEventListener('click', () => forge.setMode('city'));
  modeBtns.workshop.addEventListener('click', () => forge.setMode('workshop'));
  modeBtns.studio.addEventListener('click', () => forge.setMode('studio'));

  buildUI(forge);
  buildCityUI(forge, cityMode);
  const hud = new Hud(document.getElementById('app'));
  const game = new Game({ forge, cm: cityMode, scene, camera, renderer, fx, hud });
  forge.game = game;
  const studioUI = buildStudioUI(forge, game, cityMode);
  forge.studio = studioUI;

  /* ── Hauptschleife ── */
  const clock = new THREE.Timer();
  const camOffset = new THREE.Vector3();
  const chasePos = new THREE.Vector3(), chaseLook = new THREE.Vector3();
  let statTimer = 0;
  function frame() {
    requestAnimationFrame(frame);
    clock.update();
    const rawDt = clock.getDelta();
    const dt = Math.min(0.05, rawDt);
    const input = readInput();
    const city = forge.mode === 'city';
    if (!city) physics.step(dt);
    const o = forge.obj;
    if (o) o.update(dt, input);
    for (const e of forge.extras) e.update(dt, null);
    fx.update(dt);
    if (city) cityMode.update(dt, rawDt);

    if (forge.testing && o) {
      if (o.mode === 'character') {
        // Orbit-Kamera folgt der Figur
        const t = o.root.position;
        camOffset.copy(controls.target);
        controls.target.set(t.x, t.y + 1.1, t.z);
        camera.position.add(controls.target.clone().sub(camOffset));
      } else {
        // Verfolgerkamera hinter dem Fahrzeug
        const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(o.root.quaternion);
        fwd.y = 0;
        fwd.normalize();
        chasePos.copy(o.root.position).addScaledVector(fwd, -9.5).add(new THREE.Vector3(0, 3.8, 0));
        camera.position.lerp(chasePos, 1 - Math.exp(-dt * 3.2));
        chaseLook.copy(o.root.position).addScaledVector(fwd, 4).add(new THREE.Vector3(0, 1.1, 0));
        controls.target.lerp(chaseLook, 1 - Math.exp(-dt * 6));
        camera.lookAt(controls.target);
      }
    }
    if (city) { if (cityMode.camMode === 'orbit') controls.update(); }
    else if (!forge.testing || (o && o.mode === 'character')) controls.update();

    if (!city) atmosphere.focus(controls.target);
    atmosphere.update(dt, camera);
    debug.update();

    let ox = 0, oy = 0;
    if (shake > 0.001) {
      ox = (Math.random() - 0.5) * shake * 0.6;
      oy = (Math.random() - 0.5) * shake * 0.6;
      camera.position.x += ox;
      camera.position.y += oy;
      shake *= Math.exp(-dt * 5);
    }
    renderer.render(scene, camera);
    camera.position.x -= ox;
    camera.position.y -= oy;
    if (city && cityMode.game) cityMode.game.renderOverlay(renderer);
    if (city) cityMode.afterRender(renderer.info);

    statTimer += dt;
    if (!city && o && statTimer > 0.5) {
      statTimer = 0;
      forge.stats = {
        tris: renderer.info.render.triangles,
        calls: renderer.info.render.calls,
        bodies: physics.world.bodies.length - 2,
        parts: o ? o.parts.length : 0,
        debris: o ? o.debris.length : 0,
        state: o ? o.state : '-',
      };
      forge.emit();
    }
  }

  frame();
  if (document.readyState === 'loading') await new Promise((r) => document.addEventListener('DOMContentLoaded', r, { once: true }));
  try { const n = document.getElementById('game-data'); if (n) forge.exported = JSON.parse(n.textContent); } catch (e) { console.error('Spieldaten unlesbar', e); }
  const startCity = !/werkstatt/i.test(location.hash);
  if (forge.exported) {
    document.body.classList.add('player-only');
    await forge.setMode('city', forge.exported.seed || 1);
    forge.game.prewarm();
    studioUI.startScreen();
  } else if (startCity) {
    const m = location.hash.match(/(\d{1,5})/);
    await forge.setMode(/studio/i.test(location.hash) ? 'studio' : 'city', m ? Math.max(1, parseInt(m[1], 10)) : 1);
  } else {
    loading.classList.add('done');
    forge.select(Object.keys(OBJECTS)[0], { animate: false });
    modeBtns.city.setAttribute('aria-pressed', 'false');
    modeBtns.workshop.setAttribute('aria-pressed', 'true');
  }
  forge.ready = true;
}

boot().catch((e) => {
  console.error(e);
  const t = document.getElementById('loading-text');
  if (t) t.textContent = 'Fehler beim Start: ' + (e && e.message ? e.message : e);
});
