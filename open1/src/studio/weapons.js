// Waffentabelle und Ego-Waffenmodell (eigene kleine Szene, wird nach der Stadt darüber gerendert).
import * as THREE from 'three';

// kind: 'hit' = Treffer sofort (Strahl), 'proj' = Geschoss (Rakete)
// Werte: dmg = Schaden pro Treffer/Schrot, rate = Sekunden zwischen Schüssen, spread = Streuung (Bogenmaß),
// bloom = Streuungszuwachs pro Schuss, mag = Magazin, reserve = max. Reserve, reload = Nachladezeit (s), zoom = Vergrößerung (rechte Maustaste)
export const WEAPONS = {
  pistol: { name: 'Pistole', kind: 'hit', dmg: 24, rate: 0.26, auto: false, mag: 12, reserve: 84, reload: 1.1, spread: 0.004, bloom: 0, range: 140, pellets: 1, kick: 0.5, zoom: 1.5, snd: 'pistol', model: 'pistol' },
  rifle: { name: 'Sturmgewehr', kind: 'hit', dmg: 12, rate: 0.09, auto: true, mag: 30, reserve: 240, reload: 1.8, spread: 0.008, bloom: 0.0016, range: 180, pellets: 1, kick: 0.3, zoom: 2.2, snd: 'rifle', model: 'rifle' },
  shotgun: { name: 'Schrotflinte', kind: 'hit', dmg: 10, rate: 0.85, auto: false, mag: 6, reserve: 36, reload: 2.3, spread: 0.055, bloom: 0, range: 45, pellets: 9, kick: 1, zoom: 1.2, snd: 'shotgun', model: 'shotgun' },
  launcher: { name: 'Raketenwerfer', kind: 'proj', dmg: 140, radius: 7, speed: 46, rate: 1, auto: false, mag: 1, reserve: 8, reload: 1.9, spread: 0, bloom: 0, range: 200, pellets: 1, kick: 1.2, zoom: 1.3, snd: 'rocket', model: 'launcher' },
};

export function makeWeapon(spec, base = 'pistol') {
  const b = WEAPONS[spec.base ?? base] ?? WEAPONS.pistol;
  return { ...b, ...spec };
}

const MATS = () => ({
  dark: new THREE.MeshStandardMaterial({ color: 0x25272b, roughness: 0.5, metalness: 0.5 }),
  steel: new THREE.MeshStandardMaterial({ color: 0x6a6f78, roughness: 0.4, metalness: 0.7 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x6a4a2e, roughness: 0.7, metalness: 0.05 }),
  accent: new THREE.MeshStandardMaterial({ color: 0xe8922e, roughness: 0.5, metalness: 0.3 }),
  glow: new THREE.MeshBasicMaterial({ color: 0xffb060 }),
});

function build(model, m) {
  const g = new THREE.Group();
  const bx = (w, h, d, mat, x, y, z, rx = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); o.position.set(x, y, z); o.rotation.x = rx; g.add(o); return o; };
  const cy = (r, l, mat, x, y, z) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, l, 12), mat); o.rotation.x = Math.PI / 2; o.position.set(x, y, z); g.add(o); return o; };
  let muzzle = -0.4;
  if (model === 'pistol') {
    bx(0.045, 0.06, 0.24, m.steel, 0, 0.02, -0.1);
    bx(0.04, 0.03, 0.2, m.dark, 0, -0.015, -0.1);
    bx(0.04, 0.12, 0.055, m.dark, 0, -0.07, 0.0, 0.25);
    bx(0.01, 0.015, 0.01, m.accent, 0, 0.06, -0.2);
    muzzle = -0.23;
  } else if (model === 'rifle') {
    bx(0.055, 0.085, 0.42, m.dark, 0, 0, -0.1);
    bx(0.05, 0.05, 0.2, m.steel, 0, 0.0, -0.4);
    cy(0.012, 0.3, m.steel, 0, 0.01, -0.62);
    bx(0.04, 0.14, 0.07, m.dark, 0, -0.1, -0.08, 0.15);
    bx(0.04, 0.1, 0.06, m.dark, 0, -0.08, 0.06, 0.3);
    bx(0.05, 0.09, 0.22, m.wood, 0, -0.01, 0.22);
    bx(0.02, 0.03, 0.12, m.accent, 0, 0.065, -0.12);
    muzzle = -0.78;
  } else if (model === 'shotgun') {
    cy(0.017, 0.62, m.steel, -0.022, 0.012, -0.4);
    cy(0.017, 0.62, m.steel, 0.022, 0.012, -0.4);
    bx(0.07, 0.09, 0.3, m.dark, 0, -0.005, -0.02);
    bx(0.06, 0.055, 0.2, m.wood, 0, -0.04, -0.34);
    bx(0.05, 0.12, 0.24, m.wood, 0, -0.04, 0.2, -0.12);
    muzzle = -0.72;
  } else if (model === 'launcher') {
    cy(0.055, 0.85, m.dark, 0, 0.02, -0.3);
    cy(0.068, 0.12, m.steel, 0, 0.02, -0.76);
    cy(0.075, 0.1, m.steel, 0, 0.02, 0.1);
    bx(0.04, 0.12, 0.06, m.dark, 0, -0.08, -0.15, 0.2);
    bx(0.03, 0.05, 0.14, m.accent, 0, 0.09, -0.3);
    muzzle = -0.9;
  }
  g.userData.muzzle = muzzle;
  return g;
}

export class ViewModel {
  constructor() {
    this.scene = new THREE.Scene();
    this.cam = new THREE.PerspectiveCamera(52, 1, 0.02, 8);
    this.hemi = new THREE.HemisphereLight(0xfff1d8, 0x4a3a28, 1.6);
    this.sun = new THREE.DirectionalLight(0xffffff, 1.8);
    this.sun.position.set(1.2, 2, 1);
    this.scene.add(this.hemi, this.sun);
    this.rig = new THREE.Group();
    this.scene.add(this.rig);
    this.mats = MATS();
    this.models = {};
    this.flash = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.22), new THREE.MeshBasicMaterial({ color: 0xffd890, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    this.flash.visible = false;
    this.cur = null;
    this.flashT = 0;
    this.kick = 0;
    this.bob = 0;
  }

  setModel(key) {
    if (this.cur) this.rig.remove(this.cur);
    this.cur = this.models[key] ??= build(key, this.mats);
    this.rig.add(this.cur);
    this.flash.position.set(0, 0.015, this.cur.userData.muzzle);
    this.cur.add(this.flash);
  }

  fire(kick) {
    this.kick = Math.min(1.6, this.kick + kick * 0.7);
    this.flashT = 0.045;
  }

  // k = { bob, move (0–1), aim (0–1), swap (0–1 ausgetaucht), reload (0–1 Fortschritt oder -1), light (0–1 Helligkeit) }
  update(dt, k) {
    this.kick *= Math.exp(-dt * 14);
    this.flashT -= dt;
    this.flash.visible = this.flashT > 0;
    if (this.flash.visible) this.flash.rotation.z = Math.random() * 6.28;
    const r = this.rig, a = k.aim;
    const sway = k.move * (1 - a * 0.8);
    r.position.set(
      0.2 * (1 - a) + Math.sin(k.bob) * 0.012 * sway,
      -0.2 + 0.07 * a - Math.abs(Math.cos(k.bob)) * 0.012 * sway - k.swap * 0.3,
      -0.42 + 0.1 * a + this.kick * 0.05
    );
    let rx = this.kick * 0.18 - k.swap * 0.6;
    if (k.reload >= 0) { const s = Math.sin(Math.PI * k.reload); rx -= s * 0.55; r.position.y -= s * 0.07; r.rotation.z = s * 0.35; } else r.rotation.z = 0;
    r.rotation.x = rx;
    r.rotation.y = -0.03 * (1 - a);
    this.hemi.intensity = 0.5 + 1.2 * k.light;
    this.sun.intensity = 0.25 + 1.6 * k.light;
  }

  render(renderer, aspect) {
    if (!this.cur) return;
    this.cam.aspect = aspect;
    this.cam.updateProjectionMatrix();
    const ac = renderer.autoClear;
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(this.scene, this.cam);
    renderer.autoClear = ac;
  }
}
