import * as THREE from 'three';
import { Sky } from './world/Sky.js';
import { Ocean } from './world/Ocean.js';
import { Raft } from './world/Raft.js';
import { Player } from './player/Player.js';
import { CameraRig } from './player/CameraRig.js';
import { Input } from './core/Input.js';
import { waterShared } from './util/waterMaterial.js';
import { FishSystem } from './life/FishSystem.js';
import { SharkSystem } from './life/SharkSystem.js';
import { UnderwaterFX } from './life/UnderwaterFX.js';
import { PostFX } from './fx/PostFX.js';
import { AudioSystem } from './audio/AudioSystem.js';
import { Birds } from './life/Birds.js';
import { Debris } from './life/Debris.js';
import { createDebugGUI } from './core/DebugGUI.js';

/**
 * Game = composition root + main loop.
 *
 * Everything that animates is a "system": any object with `update(dt, t, game)`
 * pushed into `game.systems` (fish, sharks, particles, birds, later: weather,
 * crafting, hunger …). Order matters only for physics-before-render.
 */
export class Game {
  constructor() {
    this.canvas = document.getElementById('view');
    this.ui = {
      overlay: document.getElementById('overlay'), hud: document.getElementById('hud'),
      toast: document.getElementById('toast'), fps: document.getElementById('fps'),
      loading: document.getElementById('loading'), go: document.getElementById('goBtn'),
    };

    const r = this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
    r.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    r.setSize(window.innerWidth, window.innerHeight);
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    r.toneMapping = THREE.NoToneMapping;        // tone mapping happens in PostFX (HDR buffer)

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.05, 9000);
    this.camera.position.set(3.4, 2.6, 5.8);

    this.input = new Input(this.canvas);
    this.sky = new Sky(this.scene);
    this.ocean = new Ocean(this.sky);
    this.raft = new Raft(this.scene);
    this.player = new Player(this.raft);
    this.camRig = new CameraRig(this.camera);
    this.player.onMessage = (t) => this.toast(t, 3800);

    this.systems = [];
    // living ocean (order: sharks first so schools can flee from them)
    const q = new URLSearchParams(location.search).get('quality');
    this.quality = q === 'low' ? 0.5 : 1;
    this.sharks = this.add(new SharkSystem(this.scene));
    this.fish = this.add(new FishSystem(this.scene, { quality: this.quality }));
    this.underwater = this.add(new UnderwaterFX(this.scene, this.sky));
    this.birds = this.add(new Birds(this.scene, this.quality < 1 ? 2 : 4));
    this.debris = this.add(new Debris(this.scene, this.raft));
    this.audio = this.add(new AudioSystem());

    this.post = new PostFX(this.renderer, this.scene, this.camera, { quality: this.quality });
    this.gui = createDebugGUI(this);
    if (new URLSearchParams(location.search).has('debug')) { this.gui.show(true); this.gui._hidden = false; }
    this.time = 0;
    this.paused = true;
    this.muted = false;
    this.started = false;
    this._fpsAcc = 0; this._fpsN = 0;

    this._fixedRes = new URLSearchParams(location.search).has('fixedres');
    window.addEventListener('resize', () => this.resize());
    this.input.onLockChange = (locked) => { if (!locked && this.started && !this._dragMode) this.pause(true); };
    this.ui.overlay.addEventListener('click', () => this.begin());

    // let the first frames render (and compile shaders) behind the menu
    this.camRig.update(0.016, 0, this.input, this.player, this.raft);
  }

  /** Register an extra system and return it. */
  add(system) { this.systems.push(system); return system; }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.post?.setSize(w, h);
  }

  begin() {
    this.started = true;
    this.input.enabled = true;
    this.input.requestLock();
    this._dragMode = false;
    setTimeout(() => { if (!this.input.locked) this._dragMode = true; }, 400); // lock refused -> drag-look
    this.pause(false);
    this.audio?.resume?.();
  }

  pause(p) {
    this.paused = p;
    this.ui.overlay.classList.toggle('hidden', !p);
    this.ui.go.textContent = this.started ? 'Klicken zum Fortsetzen' : 'Klicken zum Starten';
    if (p) this.input.releaseLock();
  }

  toast(text, ms = 2600) {
    const t = this.ui.toast;
    t.textContent = text; t.classList.add('show');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => t.classList.remove('show'), ms);
  }

  handleKeys() {
    const i = this.input;
    if (i.wasPressed('KeyV')) { this.camRig.toggle(); this.toast(this.camRig.first ? 'Ego-Perspektive' : 'Third-Person'); }
    if (i.wasPressed('KeyT')) {
      this.sky.auto = !this.sky.auto;
      if (!this.sky.auto) this.sky.setTime(this.sky.hours + 3.0 > 24 ? 6.5 : this.sky.hours + 3.0);
      this.toast(this.sky.auto ? 'Tag-/Nacht-Zyklus an' : `Tageszeit ${this.sky.hours.toFixed(1)} Uhr`);
    }
    if (i.wasPressed('KeyM')) { this.muted = !this.muted; this.audio?.setMuted?.(this.muted); this.toast(this.muted ? 'Ton aus' : 'Ton an'); }
    if (i.wasPressed('KeyG')) this.gui?.show(this.gui._hidden = !this.gui._hidden) ;
    if (i.wasPressed('KeyP')) this.pause(true);
  }

  update(dt) {
    this.time += dt;
    const t = this.time;
    if (!this.paused) this.handleKeys();

    const live = !this.paused;
    const inp = live ? this.input : { ...this.input, dx: 0, dy: 0, wheel: 0, axis: () => ({ x: 0, y: 0 }), isDown: () => false, wasPressed: () => false };

    this.sky.update(dt, this.camera);
    this.sky.updateEnvironment(this.renderer);
    waterShared.uWTime.value = t;
    waterShared.uWSun.value = this.sky.uniforms.uSunPower.value;

    this.raft.update(dt, t, { x: this.player.pos.x, z: this.player.pos.z, grounded: this.player.grounded });
    this.camRig.update(dt, t, inp, this.player, this.raft); // yaw first so the player can face it
    this.player.update(dt, inp, this.camRig.yaw, this.camRig.pitch);
    this.sky.followShadowTarget(this.raft.root.position);
    this.ocean.update(t, this.raft.footprint);
    for (const s of this.systems) s.update(dt, t, this);

    this.post.autoExposure = 1.7 - 0.7 * this.sky.uniforms.uSunPower.value;   // night: open the aperture, day: pull back
    this.post.apply();
    this.updateHud(dt);
    this.input.endFrame();
  }

  updateHud(dt) {
    this._fpsAcc += dt; this._fpsN++;
    if (this._fpsAcc > 0.5) {
      this.fps = Math.round(this._fpsN / this._fpsAcc);
      this.ui.fps.textContent = `${this.fps} fps`;
      this._governResolution();
      this._fpsAcc = 0; this._fpsN = 0;
    }
    const n = this.player.nearby;
    this.ui.hud.innerHTML = n && !this.paused ? `<b>E</b> &nbsp;${n.name === 'water' ? 'Wasser berühren' : n.name === 'crate' ? 'Kiste öffnen' : n.name === 'tent' ? 'Schlafplatz ansehen' : 'Ansehen'}` : '';
  }

  /**
   * Adaptive resolution: keeps mid-range laptops smooth by trading pixel ratio for frame rate
   * (and recovering when there is headroom). Off for automated browsers and ?fixedres.
   */
  _governResolution() {
    if (this.paused || navigator.webdriver || this._fixedRes) return;
    const max = Math.min(window.devicePixelRatio, 1.75), cur = this.renderer.getPixelRatio();
    this._lowN = this.fps < 40 ? (this._lowN ?? 0) + 1 : 0;
    this._highN = this.fps > 57 ? (this._highN ?? 0) + 1 : 0;
    let next = cur;
    if (this._lowN >= 3 && cur > 0.65) next = Math.max(0.65, cur - 0.15);
    else if (this._highN >= 8 && cur < max) next = Math.min(max, cur + 0.1);
    if (next !== cur) { this.renderer.setPixelRatio(next); this.resize(); this._lowN = this._highN = 0; }
  }

  render() {
    this.post.render(this._dt);
  }

  start() {
    let last = performance.now();
    const loop = (now) => {
      const dt = THREE.MathUtils.clamp((now - last) / 1000, 0, 0.05); last = now; this._dt = dt;  // rAF stamp can precede performance.now() on frame 1
      this.update(dt);
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}
