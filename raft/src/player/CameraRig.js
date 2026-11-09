import * as THREE from 'three';
import { sampleWave } from '../util/waves.js';

const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));

/**
 * Third-person orbit camera that smoothly zooms into first person.
 *  - follows the boy with a soft (low-pass) pivot so raft heave is felt, not jarring,
 *  - adds a fraction of the raft's roll/pitch to the camera for a gentle "sea legs" sway,
 *  - never dips below the water surface.
 * V toggles; the zoom is continuous (dist -> 0 means first person).
 */
export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.yaw = 0.55;          // 0 = looking toward -z
    this.pitch = -0.22;       // + = looking up
    this.sens = 0.0023;
    this.dist = 3.6; this.distTarget = 3.6; this.thirdDist = 3.6;
    this.first = false;
    this.pivot = new THREE.Vector3();
    this.initialised = false;
    this.fovBase = 62;
    this.bobT = 0;
    this.shoulder = 0.38;
    this._f = new THREE.Vector3(); this._r = new THREE.Vector3(); this._p = new THREE.Vector3();
    this._p2 = new THREE.Vector3(); this._lp = new THREE.Vector3(); this._inv = new THREE.Matrix4();
    this._q = new THREE.Quaternion(); this._e = new THREE.Euler(0, 0, 0, 'YXZ');
  }

  toggle() { this.setFirst(!this.first); }
  setFirst(v) { this.first = v; this.distTarget = v ? 0 : this.thirdDist; }

  update(dt, t, input, player, raft) {
    // ---- look ------------------------------------------------------------
    this.yaw -= input.dx * this.sens;
    this.pitch -= input.dy * this.sens;
    const lo = this.first ? -1.45 : -1.15, hi = this.first ? 1.45 : 0.32;
    this.pitch = THREE.MathUtils.clamp(this.pitch, lo, hi);
    if (input.wheel && !this.first) { this.thirdDist = THREE.MathUtils.clamp(this.thirdDist + input.wheel * 0.5, 1.8, 7.5); this.distTarget = this.thirdDist; }
    this.dist = damp(this.dist, this.distTarget, 9, dt);
    const fpK = 1 - THREE.MathUtils.smoothstep(this.dist, 0.0, 0.9); // 1 = fully first-person
    player.setFirstPerson(this.dist < 0.55);

    // ---- pivot (soft follow) ------------------------------------------------
    const head = player.headWorld(this._p, false);
    if (!this.initialised) { this.pivot.copy(head); this.initialised = true; }
    this.pivot.x = damp(this.pivot.x, head.x, 16, dt);
    this.pivot.z = damp(this.pivot.z, head.z, 16, dt);
    this.pivot.y = damp(this.pivot.y, head.y, 7, dt);

    // ---- orbit position ------------------------------------------------------
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const f = this._f.set(-Math.sin(this.yaw) * cp, sp, -Math.cos(this.yaw) * cp);
    const r = this._r.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const cam = this.camera;
    cam.position.copy(this.pivot).addScaledVector(f, -this.dist).addScaledVector(r, this.shoulder * (1 - fpK));
    cam.position.y += 0.1 * (1 - fpK);

    if (fpK > 0.001) { // blend toward the real eye position (full raft motion, no lag)
      const eye = player.headWorld(new THREE.Vector3(), true);
      this.bobT += dt * player.speed * 2.6;
      const bob = Math.sin(this.bobT) * 0.018 * Math.min(1, player.speed / 1.7) * (player.grounded ? 1 : 0);
      eye.y += bob; eye.addScaledVector(r, Math.cos(this.bobT * 0.5) * 0.006 * Math.min(1, player.speed));
      cam.position.lerp(eye, fpK);
    }

    // keep the third-person camera out of the crate / tent: slide it back towards the pivot until it is clear
    if (fpK < 0.6 && this.dist > 0.6) {
      const inv = this._inv.copy(raft.root.matrixWorld).invert();
      const pivotW = this.pivot, lp = this._lp;
      const inside = (v) => {
        lp.copy(v).applyMatrix4(inv);
        for (const b of raft.solids) if (lp.x > b.minX - 0.08 && lp.x < b.maxX + 0.08 && lp.z > b.minZ - 0.08 && lp.z < b.maxZ + 0.08 && lp.y < b.top + 0.12) return true;
        return false;
      };
      if (inside(cam.position)) {
        const dir = this._p2.copy(cam.position).sub(pivotW);
        for (let k = 0.9; k > 0.15; k -= 0.1) { cam.position.copy(pivotW).addScaledVector(dir, k); if (!inside(cam.position)) break; }
      }
    }

    // never under water / under the deck
    const w = sampleWave(cam.position.x, cam.position.z, t).height;
    cam.position.y = Math.max(cam.position.y, w + 0.35);

    // ---- orientation: look at pivot-ish target + raft sway ----------------------
    const target = this._p.copy(cam.position).addScaledVector(f, 10);
    cam.up.set(0, 1, 0);
    cam.lookAt(target);
    const swayK = THREE.MathUtils.lerp(0.4, 0.85, fpK);
    this._e.set(raft.pitch * 0.25 * swayK * Math.cos(this.yaw), 0, raft.roll * swayK * 0.55, 'YXZ');
    this._q.setFromEuler(this._e);
    cam.quaternion.multiply(this._q);

    // speed-dependent FOV kick
    const fov = this.fovBase + 12 * fpK + Math.min(player.speed, 3.4) * 1.2;
    if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = damp(cam.fov, fov, 6, dt); cam.updateProjectionMatrix(); }
  }
}
