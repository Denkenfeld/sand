import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import { makeWaterAware } from '../util/waterMaterial.js';
import { mulberry32 } from '../util/textures.js';

/**
 * Stylised 10-year-old castaway, built from primitives (no external assets).
 * A jointed Object3D hierarchy instead of a SkinnedMesh: ~60 draw calls of tiny
 * meshes, trivial to pose procedurally, and every joint is addressable
 * (hand-held items later: `joints.handR.add(tool)`).
 *
 * Model space: feet at y=0, faces +Z, character's left = +X.
 * Joint convention (see Animator): flexion values are anatomical (+ = forward),
 * the mapping to Euler angles lives in applyPose().
 */
const HIP_Y = 0.725;
const SKIN = new THREE.Color('#c98760');   // hex = sRGB (Color(r,g,b) would be linear and look washed out)

export class BoyModel {
  constructor() {
    const noise = createNoise2D(mulberry32(77));
    this.root = new THREE.Group();
    this.root.name = 'boy';
    const S = 0.95; this.root.scale.setScalar(S);
    this.height = 1.47 * S;

    const mk = (o, wa = { wet: true }) => makeWaterAware(new THREE.MeshStandardMaterial(o), wa);
    const skin = mk({ color: SKIN, roughness: 0.62 });
    const shirt = mk({ color: new THREE.Color('#b5412f'), roughness: 0.95, side: THREE.DoubleSide }, { wet: false });
    const shirtLight = mk({ color: new THREE.Color('#e8d6b8'), roughness: 0.95 }, { wet: false });
    const shorts = mk({ color: new THREE.Color('#4d6f8c'), roughness: 0.95, side: THREE.DoubleSide }, { wet: false });
    const rope = mk({ color: 0xc2a56d, roughness: 1 }, { wet: false, caustics: false });
    const hairM = mk({ color: new THREE.Color('#3b2414'), roughness: 0.8 }, { wet: false });
    const hairTip = mk({ color: new THREE.Color('#8a5c32'), roughness: 0.8 }, { wet: false });
    const white = mk({ color: 0xf4f1ea, roughness: 0.35 }, { caustics: false, tint: false });
    const dark = mk({ color: 0x1b1210, roughness: 0.3 }, { caustics: false, tint: false });
    const lip = mk({ color: 0x8a3a30, roughness: 0.6 }, { caustics: false, tint: false });
    const sole = mk({ color: 0x8a6a45, roughness: 1 }, { wet: false });
    const strap = mk({ color: 0x3d2c1e, roughness: 0.9 }, { wet: false });

    const part = (geo, mat, parent, x = 0, y = 0, z = 0) => {
      const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
      parent.add(m); return m;
    };
    const group = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
    const jag = (geo, amp, freq = 9) => { // torn/frayed hems: jitter the lowest vertices
      const p = geo.attributes.position; let minY = Infinity;
      for (let i = 0; i < p.count; i++) minY = Math.min(minY, p.getY(i));
      for (let i = 0; i < p.count; i++) if (p.getY(i) < minY + 1e-4) p.setY(i, p.getY(i) + (noise(p.getX(i) * freq, p.getZ(i) * freq) * 0.5 + 0.5) * amp);
      geo.computeVertexNormals(); return geo;
    };

    // ------------------------------------------------------------------ rig
    this.hips = group(this.root, 0, HIP_Y, 0);
    this.spine = group(this.hips, 0, 0.1, 0);                  // chest pivot
    this.neck = group(this.spine, 0, 0.32, 0);
    this.head = group(this.neck, 0, 0.04, 0);

    // pelvis + shorts + rope belt
    const pelvis = part(new THREE.CylinderGeometry(0.128, 0.122, 0.17, 16), shorts, this.hips, 0, -0.01, 0); pelvis.scale.z = 0.82;
    const belt = part(new THREE.TorusGeometry(0.128, 0.012, 5, 18).rotateX(Math.PI / 2), rope, this.hips, 0, 0.065, 0); belt.scale.z = 0.82;
    const beltEnd = part(new THREE.CylinderGeometry(0.01, 0.006, 0.12, 5), rope, this.hips, 0.07, -0.0, 0.105); beltEnd.rotation.z = 0.2;

    // torso + shirt with ragged hem
    part(new THREE.CapsuleGeometry(0.108, 0.2, 6, 14), shirt, this.spine, 0, 0.13, 0).scale.set(1.12, 1, 0.8);
    const hem = part(jag(new THREE.CylinderGeometry(0.122, 0.13, 0.09, 16, 1, true).translate(0, -0.045, 0), 0.04, 11), shirt, this.spine, 0, 0.0, 0);
    hem.scale.z = 0.84;
    part(new THREE.CylinderGeometry(0.113, 0.113, 0.03, 16, 1, true), shirtLight, this.spine, 0, 0.17, 0).scale.set(1.1, 1, 0.82); // faded stripe
    part(new THREE.SphereGeometry(0.06, 10, 8), skin, this.spine, 0, 0.275, 0).scale.set(1.2, 0.55, 0.9); // collar skin
    part(new THREE.CylinderGeometry(0.043, 0.05, 0.1, 10), skin, this.neck, 0, 0.0, 0);

    // ------------------------------------------------------------------ head
    const cranium = part(new THREE.SphereGeometry(0.128, 28, 20), skin, this.head, 0, 0.14, 0); cranium.scale.set(0.95, 1.08, 1.0);
    for (const s of [-1, 1]) part(new THREE.SphereGeometry(0.028, 10, 8), skin, this.head, s * 0.119, 0.135, -0.005).scale.set(0.5, 1, 0.8); // ears
    // eyes
    this.eyes = [];
    for (const s of [-1, 1]) {
      const eye = group(this.head, s * 0.05, 0.15, 0.109);
      part(new THREE.SphereGeometry(0.021, 12, 10), white, eye).scale.set(1, 1.1, 0.5);
      part(new THREE.SphereGeometry(0.0125, 10, 8), dark, eye, 0, 0, 0.0085);
      const brow = part(new THREE.BoxGeometry(0.04, 0.008, 0.01), hairM, this.head, s * 0.052, 0.19, 0.108); brow.rotation.z = -s * 0.18;
      this.eyes.push(eye);
    }
    part(new THREE.SphereGeometry(0.019, 10, 8), skin, this.head, 0, 0.122, 0.124).scale.set(1, 0.85, 0.9); // nose
    const smile = part(new THREE.TorusGeometry(0.03, 0.0042, 4, 12, Math.PI), lip, this.head, 0, 0.092, 0.112); smile.rotation.z = Math.PI; smile.scale.set(1, 0.7, 1);
    for (const s of [-1, 1]) part(new THREE.SphereGeometry(0.02, 8, 6), mk({ color: new THREE.Color('#e0785f'), roughness: 0.8 }, { caustics: false }), this.head, s * 0.075, 0.108, 0.105).scale.set(1, 0.7, 0.35); // sunburnt cheeks

    // messy sun-bleached hair
    const cap = part(new THREE.SphereGeometry(0.136, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.4), hairM, this.head, 0, 0.158, -0.012); cap.scale.set(0.97, 1.08, 1.04);
    // back/nape hair: only the z<0 half of a sphere, so the face stays clear
    const back = part(new THREE.SphereGeometry(0.134, 20, 12, Math.PI, Math.PI, 0, Math.PI * 0.64), hairM, this.head, 0, 0.152, -0.014); back.scale.set(0.97, 1.08, 1.04);
    back.material = back.material.clone(); back.material.side = THREE.DoubleSide;
    const rnd = mulberry32(9);
    for (let i = 0; i < 16; i++) {
      const a = rnd() * Math.PI * 2, e = 0.15 + rnd() * 1.05;   // elevation from the crown
      const dir = new THREE.Vector3(Math.sin(e) * Math.cos(a), Math.cos(e), Math.sin(e) * Math.sin(a));
      if (dir.z > 0.55 && dir.y < 0.55) continue;               // keep the face clear
      const tuft = part(new THREE.ConeGeometry(0.03 + rnd() * 0.015, 0.075 + rnd() * 0.05, 6), i % 3 ? hairM : hairTip, this.head);
      tuft.position.copy(dir).multiplyScalar(0.138).add(new THREE.Vector3(0, 0.145, -0.008));
      tuft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().add(new THREE.Vector3(0, -0.2, -0.1)).normalize());
    }
    for (let i = 0; i < 4; i++) { // fringe
      const t = part(new THREE.ConeGeometry(0.026, 0.07, 6), i % 2 ? hairM : hairTip, this.head, -0.06 + i * 0.04, 0.228, 0.085);
      t.rotation.x = 1.9; t.rotation.z = (i - 1.5) * 0.18;
    }

    // ------------------------------------------------------------------ arms
    const makeArm = (side) => {
      const sh = group(this.spine, side * 0.16, 0.285, 0);
      part(new THREE.SphereGeometry(0.06, 10, 8), shirt, sh);
      part(new THREE.CapsuleGeometry(0.043, 0.15, 5, 10), skin, sh, 0, -0.12, 0);
      part(jag(new THREE.CylinderGeometry(0.06, 0.07, 0.12, 12, 1, true), 0.025, 14), shirt, sh, 0, -0.045, 0);
      const el = group(sh, 0, -0.245, 0);
      part(new THREE.SphereGeometry(0.041, 8, 6), skin, el);
      part(new THREE.CapsuleGeometry(0.038, 0.14, 5, 10), skin, el, 0, -0.11, 0);
      const hand = group(el, 0, -0.235, 0);
      part(new THREE.SphereGeometry(0.04, 10, 8), skin, hand, 0, -0.012, 0).scale.set(0.9, 1.1, 0.7);
      part(new THREE.CapsuleGeometry(0.011, 0.03, 3, 6), skin, hand, side * -0.03, -0.012, 0.012).rotation.z = side * 0.5; // thumb
      return { sh, el, hand };
    };
    const aL = makeArm(1), aR = makeArm(-1);
    this.shL = aL.sh; this.elL = aL.el; this.handL = aL.hand;
    this.shR = aR.sh; this.elR = aR.el; this.handR = aR.hand;

    // ------------------------------------------------------------------ legs
    const makeLeg = (side) => {
      const hip = group(this.hips, side * 0.075, -0.04, 0);
      part(new THREE.CapsuleGeometry(0.066, 0.22, 5, 12), skin, hip, 0, -0.17, 0);
      const leg = part(jag(new THREE.CylinderGeometry(0.079, 0.087, 0.2, 14, 1, true).translate(0, -0.1, 0), 0.045, 12), shorts, hip, 0, -0.01, 0);
      leg.scale.z = 0.95;
      const knee = group(hip, 0, -0.335, 0);
      part(new THREE.SphereGeometry(0.054, 8, 6), skin, knee);
      part(new THREE.CapsuleGeometry(0.05, 0.21, 5, 10), skin, knee, 0, -0.165, 0);
      const ankle = group(knee, 0, -0.325, 0);
      part(new THREE.SphereGeometry(0.036, 8, 6), skin, ankle);
      part(new THREE.SphereGeometry(1, 10, 8), skin, ankle, 0, -0.028, 0.045).scale.set(0.046, 0.032, 0.095);
      for (let t = 0; t < 4; t++) part(new THREE.SphereGeometry(0.0125, 6, 5), skin, ankle, -side * (t - 1.5) * 0.019, -0.042, 0.135);
      part(new THREE.BoxGeometry(0.1, 0.02, 0.26), sole, ankle, 0, -0.06, 0.055);          // simple rope-soled sandal
      part(new THREE.BoxGeometry(0.1, 0.012, 0.025), strap, ankle, 0, -0.04, 0.05);
      part(new THREE.BoxGeometry(0.012, 0.03, 0.14), strap, ankle, side * -0.028, -0.05, 0.1);
      return { hip, knee, ankle };
    };
    const lL = makeLeg(1), lR = makeLeg(-1);
    this.hipL = lL.hip; this.kneeL = lL.knee; this.ankleL = lL.ankle;
    this.hipR = lR.hip; this.kneeR = lR.knee; this.ankleR = lR.ankle;

    this._blinkT = 2; this._blink = 0;
  }

  /**
   * pose keys (radians / metres), anatomical sign conventions:
   *  hipY (m), lean (hips fwd), roll (hips side tilt), spineX (fwd bend), spineY (twist), spineZ (side bend),
   *  headX (nod down +), headY (turn left +),
   *  lThigh/rThigh flexion (fwd +), lKnee/rKnee flexion (>=0), lFoot/rFoot (toes up +),
   *  lSh/rSh flexion (fwd +), lAbd/rAbd abduction (out +), lElb/rElb flexion (>=0)
   */
  applyPose(p) {
    this.hips.position.y = HIP_Y + p.hipY;
    this.hips.rotation.set(p.lean, 0, p.roll);
    this.spine.rotation.set(p.spineX, p.spineY, p.spineZ);
    this.head.rotation.set(p.headX, p.headY, 0);
    this.hipL.rotation.x = -p.lThigh; this.hipR.rotation.x = -p.rThigh;
    this.hipL.rotation.z = p.lAbdLeg ?? 0; this.hipR.rotation.z = -(p.rAbdLeg ?? 0);
    this.kneeL.rotation.x = p.lKnee; this.kneeR.rotation.x = p.rKnee;
    this.ankleL.rotation.x = -p.lFoot; this.ankleR.rotation.x = -p.rFoot;
    this.shL.rotation.set(-p.lSh, 0, p.lAbd); this.shR.rotation.set(-p.rSh, 0, -p.rAbd);
    this.elL.rotation.x = -p.lElb; this.elR.rotation.x = -p.rElb;
  }

  /** Blinking etc. */
  update(dt) {
    this._blinkT -= dt;
    if (this._blinkT < 0) { this._blink = 1; this._blinkT = 2 + Math.random() * 3.5; }
    this._blink = Math.max(0, this._blink - dt * 7);
    const k = 1 - Math.sin(this._blink * Math.PI) * 0.92;
    for (const e of this.eyes) e.scale.y = k;
  }

  setShadow(on) { this.root.traverse((o) => { if (o.isMesh) o.castShadow = on; }); }
  setVisible(v) { this.root.visible = v; }
}
