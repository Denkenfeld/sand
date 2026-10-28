// Effekte: GPU-Partikel (Rauch, Feuer, Funken, Staub), Explosions-Blitz, Druckwelle, Brandflecken.
import * as THREE from 'three';
import { audio } from './audio.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const C = (hex) => {
  const c = new THREE.Color(hex);
  return [c.r, c.g, c.b];
};

function puffTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(255,255,255,0.55)';
  const base = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  base.addColorStop(0, 'rgba(255,255,255,0.9)');
  base.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = base;
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * Math.PI * 2, r = Math.random() * 28;
    const x = 64 + Math.cos(a) * r, y = 64 + Math.sin(a) * r, s = 14 + Math.random() * 26;
    const gr = g.createRadialGradient(x, y, 0, x, y, s);
    gr.addColorStop(0, 'rgba(255,255,255,0.35)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
  }
  g.globalCompositeOperation = 'destination-in';
  const mask = g.createRadialGradient(64, 64, 0, 64, 64, 62);
  mask.addColorStop(0, 'rgba(0,0,0,1)');
  mask.addColorStop(0.7, 'rgba(0,0,0,0.9)');
  mask.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = mask;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function scorchTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const base = g.createRadialGradient(128, 128, 0, 128, 128, 120);
  base.addColorStop(0, 'rgba(8,6,5,0.9)');
  base.addColorStop(0.45, 'rgba(10,8,6,0.55)');
  base.addColorStop(1, 'rgba(10,8,6,0)');
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 40; i++) {
    const a = Math.random() * Math.PI * 2, r = 30 + Math.random() * 80;
    const x = 128 + Math.cos(a) * r, y = 128 + Math.sin(a) * r, s = 8 + Math.random() * 26;
    const gr = g.createRadialGradient(x, y, 0, x, y, s);
    gr.addColorStop(0, 'rgba(8,6,5,0.35)');
    gr.addColorStop(1, 'rgba(8,6,5,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 256, 256);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

class Layer {
  constructor(max, additive, tex) {
    this.max = max;
    this.n = 0;
    const f = (k) => new Float32Array(max * k);
    this.pos = f(3); this.col = f(4); this.size = f(1);
    this.vel = f(3); this.age = f(1); this.life = f(1);
    this.s0 = f(1); this.s1 = f(1); this.c0 = f(3); this.c1 = f(3);
    this.a0 = f(1); this.a1 = f(1); this.drag = f(1); this.grav = f(1);
    const geo = new THREE.BufferGeometry();
    this.aPos = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
    this.aCol = new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage);
    this.aSize = new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.aPos);
    geo.setAttribute('aColor', this.aCol);
    geo.setAttribute('aSize', this.aSize);
    geo.setDrawRange(0, 0);
    this.uniforms = { uMap: { value: tex }, uScale: { value: 800 } };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      vertexShader: /* glsl */ `
        attribute vec4 aColor; attribute float aSize; uniform float uScale; varying vec4 vColor;
        void main(){ vColor = aColor; vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv; gl_PointSize = aSize * uScale / max(0.1, -mv.z); }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap; varying vec4 vColor;
        void main(){ vec4 t = texture2D(uMap, gl_PointCoord); gl_FragColor = vec4(vColor.rgb, vColor.a * t.a);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = additive ? 6 : 5;
  }

  emit(o) {
    if (this.n >= this.max) return;
    const i = this.n++;
    this.pos.set(o.pos, i * 3);
    this.vel.set(o.vel ?? [0, 0, 0], i * 3);
    this.age[i] = 0;
    this.life[i] = o.life;
    this.s0[i] = o.s0; this.s1[i] = o.s1 ?? o.s0;
    this.c0.set(o.c0, i * 3); this.c1.set(o.c1 ?? o.c0, i * 3);
    this.a0[i] = o.a0 ?? 0.8; this.a1[i] = o.a1 ?? 0;
    this.drag[i] = o.drag ?? 1; this.grav[i] = o.grav ?? 0;
  }

  _move(d, s) {
    const cp = (a, k) => { for (let j = 0; j < k; j++) a[d * k + j] = a[s * k + j]; };
    cp(this.pos, 3); cp(this.vel, 3); cp(this.age, 1); cp(this.life, 1); cp(this.s0, 1); cp(this.s1, 1);
    cp(this.c0, 3); cp(this.c1, 3); cp(this.a0, 1); cp(this.a1, 1); cp(this.drag, 1); cp(this.grav, 1);
  }

  update(dt) {
    for (let i = 0; i < this.n; ) {
      this.age[i] += dt;
      const a = this.age[i], L = this.life[i];
      if (a >= L) {
        const j = --this.n;
        if (i !== j) this._move(i, j);
        continue;
      }
      const t = a / L, k = Math.exp(-this.drag[i] * dt);
      const v = this.vel, p = this.pos, i3 = i * 3;
      v[i3] *= k; v[i3 + 1] = v[i3 + 1] * k + this.grav[i] * dt; v[i3 + 2] *= k;
      p[i3] += v[i3] * dt; p[i3 + 1] += v[i3 + 1] * dt; p[i3 + 2] += v[i3 + 2] * dt;
      this.size[i] = this.s0[i] + (this.s1[i] - this.s0[i]) * t;
      const fade = Math.min(1, t / 0.08);
      const c = this.col, i4 = i * 4;
      c[i4] = this.c0[i3] + (this.c1[i3] - this.c0[i3]) * t;
      c[i4 + 1] = this.c0[i3 + 1] + (this.c1[i3 + 1] - this.c0[i3 + 1]) * t;
      c[i4 + 2] = this.c0[i3 + 2] + (this.c1[i3 + 2] - this.c0[i3 + 2]) * t;
      c[i4 + 3] = (this.a0[i] + (this.a1[i] - this.a0[i]) * t) * fade;
      i++;
    }
    this.points.geometry.setDrawRange(0, this.n);
    this.aPos.needsUpdate = this.aCol.needsUpdate = this.aSize.needsUpdate = true;
  }
}

export class FX {
  constructor(scene) {
    this.scene = scene;
    const tex = puffTexture();
    this.smoke = new Layer(2200, false, tex);
    this.fire = new Layer(1600, true, tex);
    scene.add(this.smoke.points, this.fire.points);
    this.light = new THREE.PointLight(0xffa860, 0, 120, 2);
    scene.add(this.light);
    this.flashT = 99;
    this.flashPower = 0;
    this.rings = [];
    this.decals = [];
    this.emitters = [];
    this.scorch = scorchTexture();
    this.onShake = null;
  }

  setView(heightPx, fovDeg) {
    const s = heightPx / (2 * Math.tan(THREE.MathUtils.degToRad(fovDeg) / 2));
    this.smoke.uniforms.uScale.value = s;
    this.fire.uniforms.uScale.value = s;
  }

  dust(pos, n = 6, size = 1.2, spread = 1.5) {
    for (let i = 0; i < n; i++) {
      this.smoke.emit({
        pos: [pos.x + rnd(-0.5, 0.5), Math.max(0.1, pos.y) + rnd(0, 0.3), pos.z + rnd(-0.5, 0.5)],
        vel: [rnd(-spread, spread), rnd(0.3, 1.4), rnd(-spread, spread)],
        life: rnd(1.1, 2.3), s0: size * 0.5, s1: size * 2.2,
        c0: C(0xc9a678), c1: C(0xa88e6e), a0: 0.42, a1: 0, drag: 1.4, grav: 0.2,
      });
    }
  }

  sparks(pos, n = 12, power = 1) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, e = rnd(0.2, 1.3), s = rnd(3, 11) * power;
      this.fire.emit({
        pos: [pos.x, pos.y, pos.z],
        vel: [Math.cos(a) * Math.cos(e) * s, Math.sin(e) * s, Math.sin(a) * Math.cos(e) * s],
        life: rnd(0.5, 1.3), s0: 0.1, s1: 0.04, c0: C(0xffd890), c1: C(0xc03810), a0: 1, a1: 0, drag: 0.3, grav: -9,
      });
    }
  }

  // Einzelner Schornsteinrauch-Puff (Dauerbetrieb: pro Frame wenige Aufrufe, siehe kit.emit)
  chimney(pos, size = 1, tone = 0x3a3632) {
    this.smoke.emit({
      pos: [pos.x + rnd(-0.1, 0.1) * size, pos.y, pos.z + rnd(-0.1, 0.1) * size],
      vel: [rnd(-0.2, 0.2) + 0.9, rnd(1.2, 2.2), rnd(-0.2, 0.2)],
      life: rnd(2.6, 4.6), s0: 0.5 * size, s1: 3.2 * size, c0: C(tone), c1: C(0x6e665c), a0: 0.34, a1: 0, drag: 0.4, grav: 0.5,
    });
  }

  // Einzelne Flammenzunge (Fackel, Ofen, Triebwerk)
  flame(pos, size = 1) {
    this.fire.emit({
      pos: [pos.x + rnd(-0.08, 0.08) * size, pos.y, pos.z + rnd(-0.08, 0.08) * size],
      vel: [rnd(-0.2, 0.2), rnd(1.4, 2.8), rnd(-0.2, 0.2)],
      life: rnd(0.35, 0.75), s0: 0.75 * size, s1: 0.14 * size, c0: C(0xffd488), c1: C(0xc23a08), a0: 0.7, a1: 0, drag: 0.8, grav: 2,
    });
  }

  explosion(pos, S = 1, owner = null) {
    const P = [pos.x, Math.max(0.4, pos.y), pos.z];
    // Blitz + Licht
    this.flashT = 0;
    this.flashPower = 900 * S;
    this.light.position.set(P[0], P[1] + 1.5 * S, P[2]);
    this.fire.emit({ pos: P, life: 0.22, s0: 5 * S, s1: 9 * S, c0: C(0xfff0d0), c1: C(0xffb860), a0: 0.55, a1: 0, drag: 0 });
    // Feuerball
    for (let i = 0; i < 38 * S; i++) {
      const d = new THREE.Vector3(rnd(-1, 1), rnd(-0.3, 1), rnd(-1, 1)).normalize().multiplyScalar(rnd(2, 9) * S);
      this.fire.emit({
        pos: [P[0] + d.x * 0.05, P[1] + d.y * 0.05, P[2] + d.z * 0.05], vel: [d.x, d.y, d.z],
        life: rnd(0.45, 1.15), s0: 1.6 * S, s1: 4.2 * S, c0: C(0xffd890), c1: C(0xa82804), a0: 0.42, a1: 0, drag: 1.8, grav: 1.6,
      });
    }
    // dunkler Rauch, steigt auf
    for (let i = 0; i < 34 * S; i++) {
      this.smoke.emit({
        pos: [P[0] + rnd(-1, 1) * S, P[1] + rnd(0, 1.5) * S, P[2] + rnd(-1, 1) * S],
        vel: [rnd(-2.5, 2.5) * S, rnd(1.5, 6) * S, rnd(-2.5, 2.5) * S],
        life: rnd(3.5, 7), s0: 1.8 * S, s1: 7 * S, c0: C(0x151311), c1: C(0x4a433b), a0: 0.6, a1: 0, drag: 0.7, grav: 0.9,
      });
    }
    // Staubring am Boden
    for (let i = 0; i < 30 * S; i++) {
      const a = Math.random() * Math.PI * 2, s = rnd(5, 14) * S;
      this.smoke.emit({
        pos: [P[0], 0.4, P[2]], vel: [Math.cos(a) * s, rnd(0.2, 1.2), Math.sin(a) * s],
        life: rnd(1.6, 3.2), s0: 2 * S, s1: 8 * S, c0: C(0xc2a070), c1: C(0x9e8868), a0: 0.5, a1: 0, drag: 1.6, grav: 0.1,
      });
    }
    this.sparks(new THREE.Vector3(P[0], P[1], P[2]), 70 * S, 1.6 * S);

    // Druckwelle
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.88, 1, 64),
      new THREE.MeshBasicMaterial({ color: 0xffd8a0, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(P[0], 0.15, P[2]);
    this.scene.add(ring);
    this.rings.push({ mesh: ring, t: 0, S });

    // Brandfleck
    const decal = new THREE.Mesh(
      new THREE.CircleGeometry(1, 40),
      new THREE.MeshBasicMaterial({ map: this.scorch, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 })
    );
    decal.rotation.x = -Math.PI / 2;
    decal.rotation.z = Math.random() * 6.28;
    decal.position.set(P[0], 0.03, P[2]);
    decal.scale.setScalar(rnd(5.5, 7.5) * S);
    this.scene.add(decal);
    this.decals.push({ mesh: decal, owner });

    audio.boom(S);
    if (this.onShake) this.onShake(Math.min(1.4, 0.35 * S + 0.2));
  }

  // anhaltender Brand mit Rauchsäule
  emitter(pos, duration = 14, S = 1, owner = null) {
    this.emitters.push({ pos: pos.clone(), t: 0, duration, S, acc: 0, owner });
  }

  clearOwner(owner) {
    this.emitters = this.emitters.filter((e) => e.owner !== owner);
    this.decals = this.decals.filter((d) => {
      if (d.owner !== owner) return true;
      this.scene.remove(d.mesh);
      d.mesh.geometry.dispose();
      d.mesh.material.dispose();
      return false;
    });
  }

  update(dt) {
    // Blitzlicht klingt ab
    this.flashT += dt;
    this.light.intensity = this.flashPower * Math.exp(-this.flashT * 7);
    if (this.flashT > 1.5) this.light.intensity = 0;

    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.t += dt;
      const k = r.t / 0.7;
      r.mesh.scale.setScalar(1 + k * 22 * r.S);
      r.mesh.material.opacity = 0.55 * (1 - k);
      if (k >= 1) {
        this.scene.remove(r.mesh);
        r.mesh.geometry.dispose();
        r.mesh.material.dispose();
        this.rings.splice(i, 1);
      }
    }

    for (let i = this.emitters.length - 1; i >= 0; i--) {
      const e = this.emitters[i];
      e.t += dt;
      if (e.t > e.duration) { this.emitters.splice(i, 1); continue; }
      const fade = 1 - e.t / e.duration;
      e.acc += dt * 16 * e.S * (0.3 + 0.7 * fade);
      while (e.acc > 1) {
        e.acc -= 1;
        this.smoke.emit({
          pos: [e.pos.x + rnd(-0.8, 0.8) * e.S, e.pos.y + rnd(0, 0.6), e.pos.z + rnd(-0.8, 0.8) * e.S],
          vel: [rnd(-0.5, 0.5) + 1.2, rnd(1.6, 3.2), rnd(-0.5, 0.5)],
          life: rnd(3, 5.5), s0: 0.9 * e.S, s1: 4.4 * e.S, c0: C(0x1a1816), c1: C(0x4c463f), a0: 0.4 * fade + 0.08, a1: 0, drag: 0.5, grav: 0.8,
        });
        if (Math.random() < 0.45 * fade) {
          this.fire.emit({
            pos: [e.pos.x + rnd(-0.5, 0.5) * e.S, e.pos.y + rnd(0, 0.4), e.pos.z + rnd(-0.5, 0.5) * e.S],
            vel: [rnd(-0.3, 0.3), rnd(1, 2.4), rnd(-0.3, 0.3)], life: rnd(0.4, 0.9), s0: 0.8 * e.S, s1: 0.2 * e.S,
            c0: C(0xffc060), c1: C(0xc02c05), a0: 0.8, a1: 0, drag: 0.8, grav: 1.4,
          });
        }
      }
    }
    this.smoke.update(dt);
    this.fire.update(dt);
  }
}
