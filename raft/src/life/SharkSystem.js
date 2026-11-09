import * as THREE from 'three';
import { makeSharkGeometry } from './creatureGeometry.js';
import { makeWaterAware } from '../util/waterMaterial.js';
import { sampleWave } from '../util/waves.js';
import { mulberry32 } from '../util/textures.js';

/**
 * Sharks – visual presence only (no attacks yet).
 *
 * Each shark follows a slowly morphing orbit around the raft with a turn-rate
 * limited heading, so motion is smooth and slightly predatory. Every so often one
 * shark makes a "close pass": it shrinks its orbit to a few metres and rides just
 * under the surface so the dorsal fin cuts the water, then drifts back out.
 *
 * Extend: add states 'investigate' / 'attack' that steer to raft.pos, and hook damage
 * through the same `shark.state` machine.
 */
const CONFIGS = [
  { len: 3.4, radius: 24, speed: 1.7, depth: 3.6, phase: 0.0, dir: 1 },
  { len: 4.3, radius: 38, speed: 2.0, depth: 4.6, phase: 2.2, dir: -1 },
  { len: 2.8, radius: 15, speed: 1.5, depth: 2.8, phase: 4.1, dir: 1 },
];

export class SharkSystem {
  constructor(scene) {
    this.scene = scene;
    this.rnd = mulberry32(31337);
    const geo = makeSharkGeometry();
    const wag = { freq: 3.3, wave: 5.2, amp: 0.05, from: 0.28, to: -0.5 };
    this.material = makeWaterAware(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.05, side: THREE.DoubleSide }), { caustics: true, wag });

    this.sharks = CONFIGS.map((c, i) => {
      const mesh = new THREE.Mesh(geo, this.material);
      mesh.scale.setScalar(c.len);
      mesh.castShadow = false; mesh.frustumCulled = false; mesh.renderOrder = 1;
      scene.add(mesh);
      const sh = {
        cfg: c, mesh, state: 'cruise', stateT: 0, nextPass: 25 + i * 22 + this.rnd() * 20,
        pos: new THREE.Vector3(Math.cos(c.phase) * c.radius, -c.depth, Math.sin(c.phase) * c.radius),
        heading: c.phase + (c.dir > 0 ? Math.PI / 2 : -Math.PI / 2), pitch: 0, roll: 0, turn: 0, orbitR: c.radius, orbitA: c.phase, speed: c.speed, depth: c.depth,
        wake: this._makeWake(),
      };
      mesh.position.copy(sh.pos);
      return sh;
    });
  }

  /** a thin translucent V behind the fin while it cuts the surface */
  _makeWake() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, -0.9, 0, -5, 0.9, 0, -5, 0, 0, -0.2], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0.5, 0, 0, 1, 1, 1, 0.5, 0.1], 2));
    g.setIndex([0, 1, 3, 0, 3, 2]);
    const m = new THREE.Mesh(g, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, uniforms: { uA: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'varying vec2 vUv; uniform float uA; void main(){ float e = smoothstep(0.0, 0.25, abs(vUv.x - 0.5) * 2.0 - vUv.y * 0.35) ; float a = (1.0 - vUv.y) * (1.0 - e) * 0.0 + (1.0 - vUv.y) * smoothstep(0.55, 0.0, abs(abs(vUv.x - 0.5) * 2.0 - vUv.y * 0.85)) ; gl_FragColor = vec4(vec3(0.92, 0.98, 1.0), a * uA * 0.55); }',
    }));
    m.renderOrder = 11; m.frustumCulled = false; m.visible = false;
    this.scene.add(m);
    return m;
  }

  update(dt, t, game) {
    const wl = game.raft;
    for (const s of this.sharks) {
      s.stateT += dt;
      const c = s.cfg;
      // --- state machine -------------------------------------------------------
      if (s.state === 'cruise' && s.stateT > s.nextPass) { s.state = 'pass'; s.stateT = 0; }
      else if (s.state === 'pass' && s.stateT > 26) { s.state = 'cruise'; s.stateT = 0; s.nextPass = 55 + this.rnd() * 50; }

      const passK = s.state === 'pass' ? THREE.MathUtils.smoothstep(s.stateT, 0, 6) * (1 - THREE.MathUtils.smoothstep(s.stateT, 19, 26)) : 0;
      const wantR = THREE.MathUtils.lerp(c.radius, 5.6, passK);                 // close in, never touching the raft
      const wantDepth = THREE.MathUtils.lerp(c.depth, 0.32, passK);              // fin above water while passing
      s.orbitR += (wantR - s.orbitR) * Math.min(1, dt * 0.5);
      s.depth += (wantDepth - s.depth) * Math.min(1, dt * 0.6);

      // --- steering: chase a point slightly ahead on the orbit ----------------------
      const ang = Math.atan2(s.pos.z, s.pos.x);
      const lead = ang + c.dir * 0.35;
      const tx = Math.cos(lead) * s.orbitR, tz = Math.sin(lead) * s.orbitR;
      const wantHeading = Math.atan2(tx - s.pos.x, tz - s.pos.z);
      let dh = Math.atan2(Math.sin(wantHeading - s.heading), Math.cos(wantHeading - s.heading));
      const maxTurn = 0.55 * dt;
      dh = THREE.MathUtils.clamp(dh, -maxTurn, maxTurn);
      s.heading += dh;
      s.turn += (dh / Math.max(dt, 1e-4) - s.turn) * Math.min(1, dt * 3);
      const speed = c.speed * (1 + 0.15 * Math.sin(t * 0.4 + c.phase)) * (1 + passK * 0.1);
      s.pos.x += Math.sin(s.heading) * speed * dt;
      s.pos.z += Math.cos(s.heading) * speed * dt;

      // --- depth: under the swell, or riding at the surface for the fin pass -----------
      let targetY;
      if (passK > 0.15) targetY = sampleWave(s.pos.x, s.pos.z, t).height - s.depth;
      else targetY = -s.depth + Math.sin(t * 0.33 + c.phase) * 0.4;
      const dy = targetY - s.pos.y; s.pos.y += dy * Math.min(1, dt * 1.8);
      const targetPitch = THREE.MathUtils.clamp(dy * 0.25, -0.2, 0.2);
      s.pitch += (targetPitch - s.pitch) * Math.min(1, dt * 2);
      s.roll += (-s.turn * 1.4 - s.roll) * Math.min(1, dt * 3);

      // --- pose --------------------------------------------------------------------------------
      const m = s.mesh;
      m.position.copy(s.pos);
      m.rotation.set(-s.pitch, s.heading, THREE.MathUtils.clamp(s.roll, -0.45, 0.45), 'YXZ');

      // wake while the fin is out of the water
      const finOut = s.pos.y > sampleWave(s.pos.x, s.pos.z, t).height - 0.55 && s.state === 'pass';
      s.wake.visible = finOut;
      if (finOut) {
        const w = sampleWave(s.pos.x, s.pos.z, t).height;
        s.wake.position.set(s.pos.x + Math.sin(s.heading) * c.len * 0.1, w + 0.03, s.pos.z + Math.cos(s.heading) * c.len * 0.1);
        s.wake.rotation.set(0, s.heading, 0);
        s.wake.material.uniforms.uA.value = THREE.MathUtils.clamp(passK * 1.6, 0, 1);
      }
    }
  }
}
