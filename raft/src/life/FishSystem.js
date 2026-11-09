import * as THREE from 'three';
import { makeFishGeometry } from './creatureGeometry.js';
import { makeWaterAware } from '../util/waterMaterial.js';
import { mulberry32 } from '../util/textures.js';

/**
 * Fish schools: instanced meshes + classic boids (separation / alignment / cohesion)
 * steered towards a wandering school "anchor" that circles the raft, plus:
 *  - hull avoidance (they love shade but don't clip through the planks),
 *  - depth band so nobody breaches the surface,
 *  - panic when a shark comes close.
 *
 * Performance: one InstancedMesh pair per school (near/far LOD geometry), per-school
 * frustum culling, boids stepped at reduced rate when off-screen, O(n²) only within
 * a school (<= ~60 fish), all math on typed arrays (no per-frame allocations).
 */
const SPECIES = [
  { name: 'Anthias',   n: 58, size: 0.2,  color: '#ff9a3c', speed: 1.5, radius: 7,  rz: 9,  depth: 2.6, w: 0.11 },
  { name: 'Sardinen',  n: 64, size: 0.17, color: '#a9c7e8', speed: 1.9, radius: 13, rz: 10, depth: 3.6, w: 0.08 },
  { name: 'Doktorfisch', n: 28, size: 0.26, color: '#2e6bff', speed: 1.3, radius: 5, rz: 6, depth: 2.0, w: 0.14 },
  { name: 'Falterfisch', n: 22, size: 0.24, color: '#ffe44a', speed: 1.2, radius: 4.2, rz: 4.8, depth: 1.7, w: 0.16 },
  { name: 'Thunfisch', n: 16, size: 0.55, color: '#7d93ab', speed: 3.2, radius: 24, rz: 18, depth: 5.0, w: 0.06 },
  { name: 'Riffbarsch', n: 40, size: 0.15, color: '#6fe0d2', speed: 1.7, radius: 17, rz: 12, depth: 4.2, w: 0.1 },
];

export class FishSystem {
  constructor(scene, { quality = 1 } = {}) {
    this.scene = scene;
    this.frustum = new THREE.Frustum();
    this._pv = new THREE.Matrix4();
    this._sph = new THREE.Sphere();
    this.frame = 0;
    const rnd = mulberry32(2024);

    const near = makeFishGeometry(1), far = makeFishGeometry(0);
    const wag = { freq: 11, wave: 7, amp: 0.2, from: 0.05, to: -0.6 };
    const mat = makeWaterAware(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.38, metalness: 0.15, side: THREE.DoubleSide }), { caustics: true, wag });
    const matFar = makeWaterAware(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, side: THREE.DoubleSide }), { caustics: false, wag: { ...wag, amp: 0.15 } });

    this.schools = SPECIES.map((sp, si) => {
      const n = Math.max(6, Math.round(sp.n * quality));
      const s = {
        sp, n, size: sp.size, pos: new Float32Array(n * 3), vel: new Float32Array(n * 3), rnd: new Float32Array(n),
        anchor: new THREE.Vector3(), ph: [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28], dir: rnd() < 0.5 ? 1 : -1,
        lod0: new THREE.InstancedMesh(near, mat, n), lod1: new THREE.InstancedMesh(far, matFar, n),
        radius: sp.radius, spread: 3 + n * 0.04, frozen: 0, acc: 0,
      };
      const c = new THREE.Color(sp.color);
      for (let i = 0; i < n; i++) {
        const v = 0.8 + rnd() * 0.35; // per-fish brightness
        s.lod0.setColorAt(i, new THREE.Color(c.r * v, c.g * v, c.b * v)); s.lod1.setColorAt(i, new THREE.Color(c.r * v, c.g * v, c.b * v));
        s.rnd[i] = 0.75 + rnd() * 0.5;
        const a = rnd() * 6.28, rr = sp.radius * (0.6 + rnd() * 0.5);
        s.pos[i * 3] = Math.cos(a) * rr; s.pos[i * 3 + 1] = -1.5 - rnd() * sp.depth * 0.6; s.pos[i * 3 + 2] = Math.sin(a) * rr;
        s.vel[i * 3] = (rnd() - 0.5); s.vel[i * 3 + 1] = 0; s.vel[i * 3 + 2] = (rnd() - 0.5);
      }
      for (const m of [s.lod0, s.lod1]) { m.frustumCulled = false; m.castShadow = false; m.receiveShadow = false; m.renderOrder = 1; scene.add(m); }
      s.lod1.visible = false;
      return s;
    });
  }

  _anchor(s, t) {
    const sp = s.sp, k = s.dir * t * sp.w;
    s.anchor.set(
      Math.cos(k + s.ph[0]) * s.radius + Math.sin(k * 2.3 + s.ph[1]) * 2.5,
      -1.7 - sp.depth * (0.5 + 0.35 * Math.sin(k * 1.7 + s.ph[2])),
      Math.sin(k * 0.93 + s.ph[0]) * sp.rz + Math.cos(k * 1.9 + s.ph[1]) * 2.0,
    );
  }

  update(dt, t, game) {
    this.frame++;
    const cam = game.camera;
    this._pv.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this._pv);
    const sharks = game.sharks?.sharks;

    for (const s of this.schools) {
      this._anchor(s, t);
      this._sph.center.copy(s.anchor); this._sph.radius = s.spread + 5;
      const visible = this.frustum.intersectsSphere(this._sph);
      // off-screen schools: simulate at ~1/4 rate with a larger step (cheap, keeps them alive)
      s.acc += dt;
      if (!visible && (this.frame & 3) !== (s.sp.n & 3)) { s.lod0.visible = s.lod1.visible = false; continue; }
      const step = Math.min(s.acc, visible ? 0.05 : 0.2); s.acc = 0;
      this._boids(s, step, t, sharks);
      if (!visible) { s.lod0.visible = s.lod1.visible = false; continue; }
      const d = cam.position.distanceTo(s.anchor);
      const useNear = d < 38;
      s.lod0.visible = useNear; s.lod1.visible = !useNear;
      this._writeMatrices(s, useNear ? s.lod0 : s.lod1);
    }
  }

  _boids(s, dt, t, sharks) {
    const { pos, vel, n } = s, sp = s.sp;
    const maxV = sp.speed * 1.25, minV = sp.speed * 0.55;
    const sepR2 = (s.size * 2.2) ** 2, neighR2 = 2.6 * 2.6;
    const ax = s.anchor.x, ay = s.anchor.y, az = s.anchor.z;
    for (let i = 0; i < n; i++) {
      const i3 = i * 3;
      const px = pos[i3], py = pos[i3 + 1], pz = pos[i3 + 2];
      let vx = vel[i3], vy = vel[i3 + 1], vz = vel[i3 + 2];
      let sx = 0, sy = 0, sz = 0, cx = 0, cy = 0, cz = 0, mx = 0, my = 0, mz = 0, cnt = 0;
      // only look at a stride of neighbours -> O(n * 14) instead of O(n²)
      const stride = n > 28 ? 3 : 1;
      for (let j = (i + 1) % stride; j < n; j += stride) {
        if (j === i) continue;
        const j3 = j * 3, dx = pos[j3] - px, dy = pos[j3 + 1] - py, dz = pos[j3 + 2] - pz, d2 = dx * dx + dy * dy + dz * dz;
        if (d2 > neighR2) continue;
        cnt++; cx += dx; cy += dy; cz += dz; mx += vel[j3]; my += vel[j3 + 1]; mz += vel[j3 + 2];
        if (d2 < sepR2 && d2 > 1e-6) { const inv = 1 / d2; sx -= dx * inv; sy -= dy * inv; sz -= dz * inv; }
      }
      let fx = 0, fy = 0, fz = 0;
      if (cnt) {
        fx += (cx / cnt) * 0.9 + (mx / cnt - vx) * 1.2 + sx * s.size * 1.6;
        fy += (cy / cnt) * 0.9 + (my / cnt - vy) * 1.2 + sy * s.size * 1.6;
        fz += (cz / cnt) * 0.9 + (mz / cnt - vz) * 1.2 + sz * s.size * 1.6;
      }
      // pull to the school's wandering anchor (stronger the further away)
      const adx = ax - px, ady = ay - py, adz = az - pz, ad = Math.hypot(adx, ady, adz) + 1e-4;
      const pull = 0.5 + Math.min(ad, 12) * 0.12;
      fx += (adx / ad) * pull; fy += (ady / ad) * pull * 0.6; fz += (adz / ad) * pull;
      // raft hull avoidance: soft box (+-2.7, y > -1.3) -> push out sideways/down
      if (py > -1.5 && Math.abs(px) < 3.3 && Math.abs(pz) < 3.3) {
        const k = (1.5 + py) * 2.2; fx += Math.sign(px || 1) * 3.2 * (3.3 - Math.abs(px)) * 0.5; fz += Math.sign(pz || 1) * 3.2 * (3.3 - Math.abs(pz)) * 0.5; fy -= k;
      }
      // keep inside the depth band (never breach, never sink to the abyss)
      if (py > -1.0) fy -= (py + 1.0) * 6; if (py < -2.2 - sp.depth * 1.5) fy += (-2.2 - sp.depth * 1.5 - py) * 2;
      // flee sharks
      if (sharks) for (const sh of sharks) {
        const dx = px - sh.pos.x, dy = py - sh.pos.y, dz = pz - sh.pos.z, d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < 100) { const d = Math.sqrt(d2) + 1e-3, f = (10 - d) * 1.1 / d; fx += dx * f; fy += dy * f * 0.4; fz += dz * f; }
      }
      // gentle per-fish wobble so the school looks organic
      fx += Math.sin(t * 1.3 + i) * 0.25; fz += Math.cos(t * 1.1 + i * 1.7) * 0.25; fy += Math.sin(t * 0.9 + i * 0.6) * 0.1;

      vx += fx * dt * 2.2; vy += fy * dt * 2.2; vz += fz * dt * 2.2;
      const sp2 = Math.hypot(vx, vy, vz) + 1e-5, target = THREE.MathUtils.clamp(sp2, minV * s.rnd[i], maxV * s.rnd[i]), k = target / sp2;
      vx *= k; vy *= k * 0.9; vz *= k;
      vel[i3] = vx; vel[i3 + 1] = vy; vel[i3 + 2] = vz;
      pos[i3] = px + vx * dt; pos[i3 + 1] = py + vy * dt; pos[i3 + 2] = pz + vz * dt;
    }
  }

  _writeMatrices(s, mesh) {
    const { pos, vel, n } = s, a = mesh.instanceMatrix.array;
    for (let i = 0; i < n; i++) {
      const i3 = i * 3, o = i * 16;
      let zx = vel[i3], zy = vel[i3 + 1], zz = vel[i3 + 2];
      const zl = Math.hypot(zx, zy, zz) || 1; zx /= zl; zy /= zl; zz /= zl;
      // x = up × z, y = z × x  (fish keeps its belly down)
      let xx = zz, xz = -zx; const xl = Math.hypot(xx, xz) || 1; xx /= xl; xz /= xl;
      const yx = zy * xz, yy = zz * xx - zx * xz, yz = -zy * xx;
      const sc = s.size * s.rnd[i];
      a[o] = xx * sc; a[o + 1] = 0; a[o + 2] = xz * sc; a[o + 3] = 0;
      a[o + 4] = yx * sc; a[o + 5] = yy * sc; a[o + 6] = yz * sc; a[o + 7] = 0;
      a[o + 8] = zx * sc * 1.0; a[o + 9] = zy * sc; a[o + 10] = zz * sc; a[o + 11] = 0;
      a[o + 12] = pos[i3]; a[o + 13] = pos[i3 + 1]; a[o + 14] = pos[i3 + 2]; a[o + 15] = 1;
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
}
