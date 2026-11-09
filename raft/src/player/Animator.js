import * as THREE from 'three';

/**
 * Procedural animation with a small blend tree (no clips needed):
 *
 *   Locomotion (1-D blend on speed):  idle <-> walk <-> run   (phase-synced cycle)
 *        |  overridden by
 *   Air layer (weight eased in/out):  jump-rise <-> fall      (blend on vertical velocity)
 *        |  plus additive
 *   Landing crouch (impact driven spring)
 *        |  plus upper-body
 *   Interaction layer (reach / splash / pick up), masked to spine+arms+head
 *
 * Every pose is a plain object of joint values (see BoyModel.applyPose). A
 * blend is a weighted sum, so adding a new state (swim, fish, hammer…) means
 * writing one pose function and one weight.
 */
const KEYS = ['hipY', 'lean', 'roll', 'spineX', 'spineY', 'spineZ', 'headX', 'headY',
  'lThigh', 'lKnee', 'lFoot', 'rThigh', 'rKnee', 'rFoot', 'lSh', 'lAbd', 'lElb', 'rSh', 'rAbd', 'rElb', 'lAbdLeg', 'rAbdLeg'];
const UPPER = new Set(['spineX', 'spineY', 'spineZ', 'headX', 'headY', 'lSh', 'lAbd', 'lElb', 'rSh', 'rAbd', 'rElb']);

const blank = () => Object.fromEntries(KEYS.map((k) => [k, 0]));
const lerp = THREE.MathUtils.lerp;
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
const sstep = THREE.MathUtils.smoothstep;

export class Animator {
  constructor(model) {
    this.m = model;
    this.phase = 0;          // gait phase (radians)
    this.t = 0;
    this.air = 0;            // air layer weight
    this.fall = 0;           // 0 = rising pose, 1 = falling pose
    this.land = 0;           // landing crouch amount (spring)
    this.landV = 0;
    this.interact = 0;       // interaction layer weight
    this.interactT = 0;      // time since interaction started
    this.interactKind = 'reach';
    this.speedS = 0;
    this.out = blank();
    this._p = { idle: blank(), walk: blank(), run: blank(), jump: blank(), fallP: blank(), act: blank() };
  }

  startInteraction(kind = 'reach') { this.interactKind = kind; this.interactT = 0; this.interact = Math.max(this.interact, 0.001); this._interacting = true; }
  /** Called by the player when the interaction finished. */
  get interacting() { return this._interacting; }

  onLand(impact) { this.landV -= THREE.MathUtils.clamp(impact * 1.4, 0.8, 4.5); }

  /**
   * @param dt seconds
   * @param s  { speed (m/s), grounded, vy, lookYaw (head target rel. to body), lookPitch }
   */
  update(dt, s) {
    this.t += dt;
    this.speedS = damp(this.speedS, s.speed, 10, dt);
    const sp = this.speedS;

    // gait phase advances with distance travelled -> feet don't slide
    const stride = sp < 2.2 ? 1.35 : 1.7;                  // metres per half-cycle-ish
    this.phase += (sp / stride) * Math.PI * dt * 1.15;
    if (this.phase > 1e4) this.phase -= 1e4;

    // air / fall weights
    this.air = damp(this.air, s.grounded ? 0 : 1, s.grounded ? 18 : 30, dt);
    this.fall = damp(this.fall, sstep(-s.vy, -1.0, 2.2), 12, dt);
    // landing crouch: damped spring driven by landV impulses
    this.landV += (-this.land * 260 - this.landV * 24) * dt;
    this.land = Math.max(-0.1, this.land + this.landV * dt);
    // interaction layer
    if (this._interacting) {
      this.interactT += dt;
      this.interact = damp(this.interact, 1, 12, dt);
      if (this.interactT > 1.25) this._interacting = false;
    } else this.interact = damp(this.interact, 0, 8, dt);

    // ---- poses -------------------------------------------------------
    const P = this._p;
    this._idle(P.idle, this.t, s);
    this._cycle(P.walk, this.phase, 0.55, 0.0, 0.5);
    this._cycle(P.run, this.phase, 1.0, 1.0, 1.0);
    this._jump(P.jump);
    this._fall(P.fallP, this.t);
    this._act(P.act, this.interactT, this.interactKind);

    // ---- blend tree --------------------------------------------------
    const wWalk = sstep(sp, 0.15, 1.2) * (1 - sstep(sp, 1.9, 3.0));
    const wRun = sstep(sp, 1.9, 3.1);
    const wIdle = Math.max(0, 1 - sstep(sp, 0.05, 0.9));
    const sum = wWalk + wRun + wIdle || 1;
    const out = this.out;
    for (const k of KEYS) {
      const loco = (P.idle[k] * wIdle + P.walk[k] * wWalk + P.run[k] * wRun) / sum;
      const air = lerp(P.jump[k], P.fallP[k], this.fall);
      let v = lerp(loco, air, this.air);
      if (UPPER.has(k)) v = lerp(v, P.act[k], this.interact);
      out[k] = v;
    }
    // additive landing crouch (fades with grounded weight)
    const lc = THREE.MathUtils.clamp(this.land, -0.1, 1.2) * (1 - this.air);
    out.hipY -= 0.12 * lc; out.lThigh += 0.8 * lc; out.rThigh += 0.8 * lc;
    out.lKnee += 1.35 * lc; out.rKnee += 1.35 * lc; out.spineX += 0.28 * lc; out.lFoot -= 0.4 * lc; out.rFoot -= 0.4 * lc;
    out.lSh += 0.35 * lc; out.rSh += 0.35 * lc;
    // gaze follows the camera a bit (not while reaching)
    out.headY += THREE.MathUtils.clamp(s.lookYaw ?? 0, -0.8, 0.8) * 0.65 * (1 - this.interact);
    out.headX += THREE.MathUtils.clamp(s.lookPitch ?? 0, -0.5, 0.5) * 0.6 * (1 - this.interact);

    this.m.applyPose(out);
    this.m.update(dt);
  }

  // ------------------------------------------------------------ pose funcs
  _idle(p, t) {
    const br = Math.sin(t * 1.9), sway = Math.sin(t * 0.55), look = Math.sin(t * 0.37) * Math.sin(t * 0.91);
    p.hipY = -0.004 + br * 0.003; p.roll = sway * 0.025; p.spineX = 0.04 + br * 0.012; p.spineZ = -sway * 0.03; p.spineY = look * 0.1;
    p.headY = look * 0.45; p.headX = 0.04 + Math.sin(t * 0.8) * 0.03;
    p.lThigh = 0.03 + (sway > 0 ? sway * 0.05 : 0); p.rThigh = 0.03 + (sway < 0 ? -sway * 0.05 : 0);
    p.lKnee = 0.05; p.rKnee = 0.05;
    p.lSh = 0.05 + br * 0.015; p.rSh = 0.05 - br * 0.015;
    p.lAbd = 0.12 + br * 0.01; p.rAbd = 0.12 + br * 0.01;
    p.lElb = 0.22; p.rElb = 0.22;
  }

  /** Walk/run cycle. amp: stride amplitude, runK: 0 walk .. 1 run, armK: arm swing weight */
  _cycle(p, ph, amp, runK, armK) {
    const s = Math.sin(ph), c = Math.cos(ph);
    const thighA = lerp(0.5, 0.95, runK);
    p.lThigh = s * thighA;
    p.rThigh = -s * thighA;
    // knee: flexes while the leg swings forward (positive half) - classic gait curve
    const kneeAmp = lerp(0.75, 1.55, runK);
    p.lKnee = Math.max(0, -c) * kneeAmp * 0.9 + Math.max(0, s) * 0.12 + lerp(0.05, 0.25, runK);
    p.rKnee = Math.max(0, c) * kneeAmp * 0.9 + Math.max(0, -s) * 0.12 + lerp(0.05, 0.25, runK);
    p.lFoot = -Math.max(0, -s) * 0.45 + Math.max(0, c) * 0.15; p.rFoot = -Math.max(0, s) * 0.45 + Math.max(0, -c) * 0.15;
    p.hipY = -Math.abs(c) * lerp(0.025, 0.07, runK) - lerp(0, 0.03, runK);
    p.lean = lerp(0.04, 0.2, runK); p.roll = s * lerp(0.03, 0.05, runK);
    p.spineX = lerp(0.03, 0.1, runK); p.spineY = -s * lerp(0.1, 0.24, runK); p.spineZ = s * 0.03;
    p.lSh = -s * lerp(0.5, 0.95, runK) * armK + 0.05; p.rSh = s * lerp(0.5, 0.95, runK) * armK + 0.05;
    p.lAbd = lerp(0.1, 0.22, runK); p.rAbd = lerp(0.1, 0.22, runK);
    p.lElb = lerp(0.3, 1.25, runK) + Math.max(0, s) * lerp(0.1, 0.25, runK);
    p.rElb = lerp(0.3, 1.25, runK) + Math.max(0, -s) * lerp(0.1, 0.25, runK);
    p.headX = -lerp(0.02, 0.1, runK); p.headY = 0;
  }

  _jump(p) { // rising: knees tucked, arms thrown up
    p.hipY = 0.02; p.lean = 0.05; p.spineX = -0.08;
    p.lThigh = 0.65; p.rThigh = 0.1; p.lKnee = 1.2; p.rKnee = 0.6; p.lFoot = -0.3; p.rFoot = -0.5;
    p.lSh = 2.3; p.rSh = 2.0; p.lAbd = 0.35; p.rAbd = 0.35; p.lElb = 0.25; p.rElb = 0.3;
    p.headX = -0.15;
  }

  _fall(p, t) { // falling: legs reach for the deck, arms out for balance
    const fl = Math.sin(t * 14) * 0.04;
    p.hipY = 0; p.lean = 0.02; p.spineX = 0.05;
    p.lThigh = 0.3 + fl; p.rThigh = 0.12 - fl; p.lKnee = 0.25; p.rKnee = 0.4; p.lFoot = 0.2; p.rFoot = 0.1;
    p.lSh = 0.5; p.rSh = 0.5; p.lAbd = 1.15 + fl; p.rAbd = 1.15 - fl; p.lElb = 0.35; p.rElb = 0.35;
    p.headX = 0.0;
  }

  /** Upper-body interaction: bend, reach out, splash/pick, return. t = seconds since start. */
  _act(p, t, kind) {
    const inK = sstep(t, 0, 0.3), outK = 1 - sstep(t, 0.95, 1.25);
    const k = Math.min(inK, outK);
    const work = Math.sin(Math.max(0, t - 0.25) * 11) * sstep(t, 0.25, 0.4) * (1 - sstep(t, 0.85, 1.0));
    if (kind === 'reach') {            // dip a hand into the water / grab something low
      p.spineX = 0.75 * k; p.headX = 0.35 * k;
      p.rSh = 1.05 * k + work * 0.18; p.rElb = 0.35 * k; p.rAbd = 0.2 * k;
      p.lSh = 0.3 * k; p.lElb = 0.6 * k; p.lAbd = 0.25 * k;
    } else {                           // 'use': both hands forward at chest height (open crate, craft…)
      p.spineX = 0.18 * k; p.headX = 0.25 * k;
      p.rSh = 1.1 * k + work * 0.12; p.lSh = 1.1 * k - work * 0.12; p.rElb = 1.0 * k; p.lElb = 1.0 * k; p.rAbd = 0.1; p.lAbd = 0.1;
    }
  }
}
