import * as THREE from 'three';
import { mulberry32 } from '../util/textures.js';

/**
 * A few seagulls riding thermals around the raft (mostly gliding, sometimes flapping),
 * with an occasional low swoop over the deck. Pure CPU-animated primitives, 4 draw calls each.
 * Calls game.audio.gull() now and then.
 */
export class Birds {
  constructor(scene, count = 4) {
    const rnd = mulberry32(8);
    const white = new THREE.MeshStandardMaterial({ color: new THREE.Color('#f3f1ea'), roughness: 0.85, side: THREE.DoubleSide });
    const grey = new THREE.MeshStandardMaterial({ color: new THREE.Color('#8f9aa3'), roughness: 0.9, side: THREE.DoubleSide });
    const orange = new THREE.MeshStandardMaterial({ color: new THREE.Color('#f0a22a'), roughness: 0.6 });
    const body = new THREE.SphereGeometry(1, 10, 8).scale(0.09, 0.08, 0.3);
    const head = new THREE.SphereGeometry(0.065, 8, 6);
    const beak = new THREE.ConeGeometry(0.02, 0.1, 6).rotateX(Math.PI / 2);
    const tail = new THREE.ConeGeometry(0.07, 0.2, 4).rotateX(-Math.PI / 2).scale(1, 0.15, 1);
    const wingIn = new THREE.PlaneGeometry(0.5, 0.22).rotateX(-Math.PI / 2).translate(0.25, 0, 0);
    const wingOut = new THREE.PlaneGeometry(0.45, 0.14).rotateX(-Math.PI / 2).translate(0.225, 0, 0);

    this.gulls = [];
    for (let i = 0; i < count; i++) {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(body, white));
      const h = new THREE.Mesh(head, white); h.position.set(0, 0.04, 0.3); g.add(h);
      const b = new THREE.Mesh(beak, orange); b.position.set(0, 0.03, 0.4); g.add(b);
      const tl = new THREE.Mesh(tail, white); tl.position.set(0, 0, -0.34); g.add(tl);
      const wings = [1, -1].map((s) => {
        const w1 = new THREE.Group(); w1.position.set(s * 0.06, 0.03, 0.02);
        const a = new THREE.Mesh(wingIn, white); const w2 = new THREE.Group(); w2.position.x = 0.5;
        const o = new THREE.Mesh(wingOut, grey); w2.add(o); w1.add(a, w2);
        if (s < 0) { w1.scale.x = -1; }
        g.add(w1); return { w1, w2, s };
      });
      g.scale.setScalar(1.6);
      g.traverse((m) => { if (m.isMesh) m.castShadow = false; });
      scene.add(g);
      this.gulls.push({
        g, wings, a: rnd() * 6.28, radius: 26 + rnd() * 34, height: 16 + rnd() * 18, speed: 0.17 + rnd() * 0.08, dir: i % 2 ? 1 : -1,
        flap: rnd() * 10, flapOn: 0, nextFlap: 2 + rnd() * 6, swoopT: 20 + rnd() * 50, swoop: 0, cry: 6 + rnd() * 30, ph: rnd() * 6.28,
      });
    }
  }

  update(dt, t, game) {
    for (const b of this.gulls) {
      b.a += b.dir * b.speed * dt * (26 / b.radius);
      // swoop: dive low and close, then climb away
      b.swoopT -= dt;
      if (b.swoopT < 0) { b.swoop = 1; b.swoopT = 70 + Math.random() * 60; }
      b.swoop = Math.max(0, b.swoop - dt / 14);
      const sw = Math.sin(b.swoop * Math.PI);
      const r = b.radius * (1 - 0.7 * sw), y = b.height * (1 - 0.8 * sw) + Math.sin(t * 0.3 + b.ph) * 1.5 + 3;
      const x = Math.cos(b.a) * r, z = Math.sin(b.a) * r;
      const px = b.g.position.x, pz = b.g.position.z;
      b.g.position.set(x, y, z);
      // heading along the motion, bank into the turn
      const hx = x - px, hz = z - pz;
      if (hx * hx + hz * hz > 1e-8) { const h = Math.atan2(hx, hz); b.g.rotation.set(0, h, 0); }
      b.g.rotation.z = -b.dir * 0.35;
      // wings: glide with tiny sway, periodic flap bursts
      b.nextFlap -= dt; if (b.nextFlap < 0) { b.flapOn = 1.8 + Math.random() * 1.6; b.nextFlap = 5 + Math.random() * 9; }
      b.flapOn = Math.max(0, b.flapOn - dt); b.flap += dt * (b.flapOn > 0 ? 9 : 1.2);
      const amp = b.flapOn > 0 ? 0.65 : 0.1;
      for (const w of b.wings) {
        const f = Math.sin(b.flap + 0) * amp;
        w.w1.rotation.z = f + 0.05; w.w2.rotation.z = f * 0.7 - 0.1;   // left wing is mirrored via scale.x, so same sign
      }
      b.cry -= dt; if (b.cry < 0) { b.cry = 18 + Math.random() * 35; game.audio?.gull?.(); }
    }
  }
}
