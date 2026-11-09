import * as THREE from 'three';
import { BoyModel } from './BoyModel.js';
import { Animator } from './Animator.js';

const WALK = 1.7, RUN = 3.4, RADIUS = 0.26;
const GRAVITY = 15, JUMP_V = 4.5;
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * The boy. Lives in RAFT-LOCAL space (child of raft.root), so the raft's
 * heave/pitch/roll carries him automatically, and collisions are simple 2-D
 * tests against the plank boxes + solid props.
 *
 * Extend: add `this.carry` / tools on `model.handR`, swimming state, etc.
 */
export class Player {
  constructor(raft) {
    this.raft = raft;
    this.model = new BoyModel();
    this.anim = new Animator(this.model);
    raft.root.add(this.model.root);

    this.pos = raft.spawn.clone();          // feet position, raft-local
    this.vel = new THREE.Vector2();         // horizontal velocity (raft-local x,z)
    this.vy = 0;
    this.grounded = true;
    this.heading = 0;                       // model yaw
    this.coyote = 0; this.jumpBuf = -1;
    this.interactCooldown = 0;
    this.pendingText = null; this.pendingT = 0;
    this.onMessage = () => {};
    this.speed = 0;
    this.firstPerson = false;
    this.lastLand = 0;
    this._tmp = { x: 0, z: 0 };
  }

  /** camYaw: camera yaw (radians, 0 = looking toward -z) */
  update(dt, input, camYaw, camPitch) {
    const raft = this.raft;
    const busy = this.anim.interacting;

    // ---- intent -------------------------------------------------------
    const ax = input.axis();
    let mx = 0, mz = 0;
    if (!busy) {
      const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw), rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
      mx = fx * ax.y + rx * ax.x; mz = fz * ax.y + rz * ax.x;
      const l = Math.hypot(mx, mz); if (l > 1) { mx /= l; mz /= l; }
    }
    const target = input.isDown('ShiftLeft', 'ShiftRight') ? RUN : WALK;
    const accel = this.grounded ? 16 : 3.5;
    const k = 1 - Math.exp(-accel * dt);
    this.vel.x += (mx * target - this.vel.x) * k;
    this.vel.y += (mz * target - this.vel.y) * k;

    // ---- jump (coyote time + input buffer feel good on a bobbing raft) ----
    this.coyote = this.grounded ? 0.12 : this.coyote - dt;
    this.jumpBuf = input.wasPressed('Space') ? 0.12 : Math.max(-1, this.jumpBuf - dt);
    if (this.jumpBuf > 0 && this.coyote > 0 && !busy) {
      this.vy = JUMP_V; this.grounded = false; this.coyote = 0; this.jumpBuf = -1;
      raft.impulse(this.pos.x, this.pos.z, -0.6); // push-off kicks the raft down
    }

    // ---- horizontal move with per-axis collision --------------------------
    const stepUp = this.grounded ? 0.3 : 0.02;
    const t = this._tmp;
    for (const axis of ['x', 'z']) {
      const nx = this.pos.x + (axis === 'x' ? this.vel.x * dt : 0);
      const nz = this.pos.z + (axis === 'z' ? this.vel.y * dt : 0);
      if (raft.isSupported(nx, nz)) { // can't walk (or jump) past the edge of the planks
        t.x = nx; t.z = nz;
        raft.pushOutOfSolids(t, RADIUS, this.pos.y, stepUp);
        if (raft.isSupported(t.x, t.z)) { this.pos.x = t.x; this.pos.z = t.z; }
      } else if (axis === 'x') this.vel.x = 0; else this.vel.y = 0;
    }
    this.speed = Math.hypot(this.vel.x, this.vel.y);

    // ---- vertical -----------------------------------------------------
    const ground = raft.groundAt(this.pos.x, this.pos.z, this.pos.y, this.grounded ? 0.3 : 0.03);
    if (this.grounded) {
      if (ground === null) { this.grounded = false; }
      else this.pos.y += (ground - this.pos.y) * Math.min(1, dt * 30); // smooth micro-steps between planks
    }
    if (!this.grounded) {
      this.vy -= GRAVITY * dt;
      this.pos.y += this.vy * dt;
      if (ground !== null && this.vy <= 0 && this.pos.y <= ground) {
        const impact = -this.vy;
        this.pos.y = ground; this.vy = 0; this.grounded = true;
        this.anim.onLand(impact); this.lastLand = impact;
        raft.impulse(this.pos.x, this.pos.z, impact);
      }
      if (this.pos.y < -3) this.respawn();
    }

    // ---- facing -------------------------------------------------------
    const camHeading = Math.atan2(-Math.sin(camYaw), -Math.cos(camYaw));  // body-yaw that faces away from the camera
    if (this.firstPerson) this.heading += wrapAngle(camHeading - this.heading) * (1 - Math.exp(-18 * dt));
    else if (this.speed > 0.25 && !busy) this.heading += wrapAngle(Math.atan2(this.vel.x, this.vel.y) - this.heading) * (1 - Math.exp(-11 * dt));
    else if (busy && this._faceTo !== undefined) this.heading += wrapAngle(this._faceTo - this.heading) * (1 - Math.exp(-9 * dt));

    // ---- interaction ----------------------------------------------------
    this.interactCooldown -= dt;
    this.nearby = !busy ? raft.nearestInteractable(this.pos.x, this.pos.z) : this.nearby;
    if (input.wasPressed('KeyE') && this.nearby && this.grounded && !busy && this.interactCooldown <= 0) {
      const it = this.nearby;
      this._faceTo = Math.atan2(it.pos.x - this.pos.x, it.pos.z - this.pos.z);
      this.anim.startInteraction(it.name === 'water' ? 'reach' : 'use');
      this.pendingText = it.text; this.pendingT = 0.55; this.interactCooldown = 1.4;
      this.vel.set(0, 0);
    }
    if (this.pendingText && (this.pendingT -= dt) <= 0) { this.onMessage(this.pendingText); this.pendingText = null; }

    // ---- animate + place the model -----------------------------------
    this.model.root.position.copy(this.pos);
    this.model.root.rotation.y = this.heading;
    this.anim.update(dt, {
      speed: this.speed, grounded: this.grounded, vy: this.vy,
      lookYaw: wrapAngle(camHeading - this.heading), lookPitch: -(camPitch ?? 0),
    });
  }

  setFirstPerson(fp) {
    this.firstPerson = fp;
    this.model.head.visible = !fp;
  }

  respawn() { this.pos.copy(this.raft.spawn); this.vy = 0; this.grounded = true; this.vel.set(0, 0); }

  /** World-space position of the head/eyes (for the camera). */
  headWorld(out = new THREE.Vector3(), eye = false) {
    const h = eye ? 1.3 : 1.28;
    const f = this.heading;
    const local = new THREE.Vector3(this.pos.x + Math.sin(f) * (eye ? 0.1 : 0), this.pos.y + h * 0.95 + this.anim.out.hipY * 0.95, this.pos.z + Math.cos(f) * (eye ? 0.1 : 0));
    return this.raft.localToWorld(local, out);
  }
}
