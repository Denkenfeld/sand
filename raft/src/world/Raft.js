import * as THREE from 'three';
import { buildRaftModel } from './RaftModel.js';
import { sampleWave, waveState } from '../util/waves.js';
import { waterShared } from '../util/waterMaterial.js';

/**
 * Raft = visual model (RaftModel) + buoyancy physics + collision queries.
 *
 * Physics: a 3-DOF rigid body (heave, pitch, roll) with a spring-damper at each
 * of 4 corner points pulling it towards the Gerstner water surface. That is
 * cheap, stable at any frame rate (fixed 120 Hz substeps) and reacts nicely to
 * the player's weight and to landing impulses.
 *
 * Future hooks: `addPiece()` for crafting (extend model + deck/solids arrays),
 * `drift` for storms/currents.
 */
export class Raft {
  constructor(scene) {
    this.model = buildRaftModel();
    this.root = new THREE.Group();
    this.root.rotation.order = 'YXZ';
    this.root.add(this.model.group);
    scene.add(this.root);

    this.deck = this.model.deck;
    this.solids = this.model.solids;
    this.interactables = this.model.interactables;
    this.deckTop = this.model.deckTop;
    this.spawn = this.model.spawn;
    this.halfX = this.model.halfX;
    this.halfZ = this.model.halfZ;

    // state
    this.yaw = 0;
    this.y = 0; this.vy = 0;
    this.pitch = 0; this.wp = 0;   // +pitch = bow (-z) up
    this.roll = 0; this.wr = 0;    // +roll = +x side up
    this.drift = new THREE.Vector2(0.55, 0.22).normalize().multiplyScalar(0.45); // m/s current
    this.speed = this.drift.length();

    // tuning (lil-gui exposes these)
    this.heaveFreq = 3.2;     // rad/s
    this.damping = 0.38;      // damping ratio
    this.rotRatio = 0.78;     // rot. frequency relative to heave
    this.weight = 0.8;        // player weight in model units
    this.corners = [[-1.8, -1.8], [1.8, -1.8], [-1.8, 1.8], [1.8, 1.8]];
    this._acc = 0;
    this._t = 0;
    this.wave = { height: 0, nx: 0, ny: 1, nz: 0 };
  }

  /** player = { x, z, grounded } in raft-local space (optional) */
  update(dt, t, player) {
    waveState.ox += this.drift.x * dt;
    waveState.oz += this.drift.y * dt;

    this._acc += dt;
    const h = 1 / 120;
    let steps = 0;
    while (this._acc >= h && steps++ < 12) { this._step(h, t - this._acc, player); this._acc -= h; }

    this.root.position.set(0, this.y, 0);
    this.root.rotation.set(this.pitch, this.yaw, this.roll);
    this.root.updateMatrixWorld(true);
    this.model.update(t);
    waterShared.uWRaftY.value = this.y;
  }

  _step(h, t, player) {
    const kc = (this.heaveFreq * this.heaveFreq) / 4;
    const cc = (this.damping * this.heaveFreq) / 2;
    const L = 1.8;
    const wr = this.heaveFreq * this.rotRatio;
    const I = (L * L * this.heaveFreq * this.heaveFreq) / (wr * wr);
    const cyaw = Math.cos(this.yaw), syaw = Math.sin(this.yaw);
    let Fy = 0, Tr = 0, Tp = 0;
    for (const [lx, lz] of this.corners) {
      const wx = lx * cyaw + lz * syaw, wz = -lx * syaw + lz * cyaw;
      const hw = sampleWave(wx, wz, t).height;
      const hc = this.y + lx * this.roll - lz * this.pitch;
      const vc = this.vy + lx * this.wr - lz * this.wp;
      const F = kc * (hw - hc) - cc * vc;
      Fy += F; Tr += lx * F; Tp += -lz * F;
    }
    if (player) { // the boy's weight presses where he stands
      const W = this.weight * (player.grounded ? 1 : 0.35);
      Fy -= W; Tr -= player.x * W; Tp += player.z * W;
    }
    // small extra rotational damping keeps it from ringing
    Tr -= this.wr * 0.9; Tp -= this.wp * 0.9;
    this.vy += Fy * h; this.y += this.vy * h;
    this.wr += (Tr / I) * h; this.roll += this.wr * h;
    this.wp += (Tp / I) * h; this.pitch += this.wp * h;
    // safety clamps (never explode)
    this.roll = THREE.MathUtils.clamp(this.roll, -0.5, 0.5);
    this.pitch = THREE.MathUtils.clamp(this.pitch, -0.5, 0.5);
    this.y = THREE.MathUtils.clamp(this.y, -2, 2);
  }

  /** Landing / stomp: j>0 pushes the raft down at local (x,z). */
  impulse(lx, lz, j) {
    this.vy -= j * 0.35;
    this.wr -= lx * j * 0.12;
    this.wp += lz * j * 0.12;
  }

  /** Shared footprint for the ocean shader (foam + ripples). */
  get footprint() {
    return { x: 0, z: 0, yaw: this.yaw, halfX: this.halfX, halfZ: this.halfZ, speed: this.speed };
  }

  // ---------------------------------------------------------------- collisions
  /** Is there something to stand on (deck plank or solid top) at local x,z? */
  isSupported(x, z) {
    const m = 0.065; // bridges the gaps between planks (up to ~0.11 m) so the boy never snags
    for (const b of this.deck) if (x >= b.minX - m && x <= b.maxX + m && z >= b.minZ - m && z <= b.maxZ + m) return true;
    return false;
  }

  /** Highest walkable surface at (x,z) that is at most stepUp above feetY; null if none. */
  groundAt(x, z, feetY, stepUp = 0.3) {
    const m = 0.065; // bridges the gaps between planks (up to ~0.11 m) so the boy never snags
    let best = null;
    for (const b of this.deck) {
      if (x < b.minX - m || x > b.maxX + m || z < b.minZ - m || z > b.maxZ + m) continue;
      if (b.top <= feetY + stepUp && (best === null || b.top > best)) best = b.top;
    }
    for (const b of this.solids) {
      if (x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ) continue;
      if (b.top <= feetY + stepUp && (best === null || b.top > best)) best = b.top;
    }
    return best;
  }

  /** Push a circle (x,z,r) out of every solid whose top is above feetY+stepUp. Mutates pos {x,z}. */
  pushOutOfSolids(pos, r, feetY, stepUp = 0.3) {
    for (const b of this.solids) {
      if (b.top <= feetY + stepUp) continue;
      const cx = THREE.MathUtils.clamp(pos.x, b.minX, b.maxX), cz = THREE.MathUtils.clamp(pos.z, b.minZ, b.maxZ);
      let dx = pos.x - cx, dz = pos.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-8) { const d = Math.sqrt(d2), s = (r - d) / d; pos.x += dx * s; pos.z += dz * s; }
      else { // centre inside the box: exit through the nearest face
        const l = pos.x - b.minX, rr = b.maxX - pos.x, f = pos.z - b.minZ, bk = b.maxZ - pos.z, mn = Math.min(l, rr, f, bk);
        if (mn === l) pos.x = b.minX - r; else if (mn === rr) pos.x = b.maxX + r; else if (mn === f) pos.z = b.minZ - r; else pos.z = b.maxZ + r;
      }
    }
  }

  nearestInteractable(x, z) {
    let best = null, bd = Infinity;
    for (const it of this.interactables) {
      const d = Math.hypot(it.pos.x - x, it.pos.z - z);
      if (d < it.radius && d < bd) { best = it; bd = d; }
    }
    return best;
  }

  localToWorld(v, out = new THREE.Vector3()) { return out.copy(v).applyMatrix4(this.root.matrixWorld); }
  worldToLocal(v, out = new THREE.Vector3()) { return out.copy(v).applyMatrix4(this.root.matrixWorld.clone().invert()); }
}
