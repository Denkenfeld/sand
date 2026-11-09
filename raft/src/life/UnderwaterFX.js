import * as THREE from 'three';
import { mulberry32 } from '../util/textures.js';

/**
 * Underwater atmosphere around the raft (all GPU-animated, zero CPU per frame):
 *  - bubbles: rise, wobble, respawn at depth (soft discs with a highlight),
 *  - plankton / suspended specks: slow drift, twinkle in the sun shafts,
 *  - light shafts: additive cylindrical billboards tilted along the refracted sun ray.
 * Everything renders before the (transparent) ocean, so it is seen *through* the water.
 */
const BOX = 22;       // size of the wrapped volume around the raft (x/z)
const DEPTH = 9;

const POINT_VERT = /* glsl */ `
  uniform float uTime, uPx, uSpeed, uSway, uBase, uRise;
  attribute vec4 aRnd;
  varying float vA; varying float vDepth;
  void main() {
    vec3 p = position;
    float cyc = fract(aRnd.w + uTime * uSpeed * (0.5 + aRnd.z));
    // vertical: bubbles rise (uRise=1), specks hover (uRise=0)
    float y = mix(-${DEPTH.toFixed(1)}, -0.12, mix(fract(aRnd.w + uTime * 0.01), cyc, uRise));
    p.y = y;
    p.x += sin(uTime * 0.7 + aRnd.x * 40.0 + y * 1.3) * uSway + uTime * 0.08 * (aRnd.z - 0.5);
    p.z += cos(uTime * 0.6 + aRnd.y * 40.0 + y * 1.1) * uSway;
    // wrap around the camera-centred box so the volume follows the player
    p.xz = mod(p.xz - cameraPosition.xz + ${(BOX / 2).toFixed(1)}, ${BOX.toFixed(1)}) - ${(BOX / 2).toFixed(1)} + cameraPosition.xz;
    vec4 mv = viewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float d = -mv.z;
    gl_PointSize = clamp(uPx * (0.4 + aRnd.z) * 90.0 / max(d, 1.0), 1.0, 26.0);
    vDepth = -y;
    vA = smoothstep(${DEPTH.toFixed(1)}, ${(DEPTH * 0.55).toFixed(1)}, -y) * smoothstep(0.0, 0.5, -y) * (1.0 - smoothstep(28.0, ${BOX.toFixed(1)}, d));
  }`;

const POINT_FRAG = /* glsl */ `
  uniform vec3 uColor; uniform float uBubble, uSun;
  varying float vA; varying float vDepth;
  void main() {
    vec2 c = gl_PointCoord - 0.5; float r = length(c) * 2.0;
    if (r > 1.0) discard;
    float a;
    if (uBubble > 0.5) {                     // ring + highlight = bubble
      float ring = smoothstep(0.55, 0.95, r) * (1.0 - smoothstep(0.95, 1.0, r));
      float hl = smoothstep(0.35, 0.0, length(c - vec2(-0.18, 0.18)));
      a = ring * 0.75 + hl * 0.9 + 0.08;
    } else a = smoothstep(1.0, 0.2, r) * 0.55;
    vec3 col = uColor * (0.35 + 0.65 * uSun);
    gl_FragColor = vec4(col, a * vA * (0.4 + 0.6 * uSun));
  }`;

export class UnderwaterFX {
  constructor(scene, sky) {
    this.sky = sky;
    const rnd = mulberry32(555);
    const mkPoints = (count, { px, speed, sway, bubble, rise, color }) => {
      const pos = new Float32Array(count * 3), rn = new Float32Array(count * 4);
      for (let i = 0; i < count; i++) {
        pos[i * 3] = (rnd() - 0.5) * BOX; pos[i * 3 + 2] = (rnd() - 0.5) * BOX;
        rn[i * 4] = rnd(); rn[i * 4 + 1] = rnd(); rn[i * 4 + 2] = rnd(); rn[i * 4 + 3] = rnd();
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('aRnd', new THREE.BufferAttribute(rn, 4));
      const mat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: bubble ? THREE.NormalBlending : THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 }, uPx: { value: px }, uSpeed: { value: speed }, uSway: { value: sway }, uBase: { value: 0 }, uRise: { value: rise },
          uBubble: { value: bubble ? 1 : 0 }, uColor: { value: new THREE.Color(color) }, uSun: sky.uniforms.uSunPower },
        vertexShader: POINT_VERT, fragmentShader: POINT_FRAG,
      });
      const pts = new THREE.Points(g, mat);
      pts.frustumCulled = false; pts.renderOrder = 5;
      scene.add(pts);
      return pts;
    };
    this.bubbles = mkPoints(260, { px: 0.22, speed: 0.11, sway: 0.25, bubble: true, rise: 1, color: '#e8fbff' });
    this.dust = mkPoints(900, { px: 0.1, speed: 0.01, sway: 0.5, bubble: false, rise: 0, color: '#bdeee8' });

    // ---- light shafts -----------------------------------------------------------
    const N = 18, quad = new THREE.PlaneGeometry(1, 1, 1, 1).translate(0, -0.5, 0); // hangs down from the surface
    const inst = new THREE.InstancedBufferGeometry().copy(quad);
    const off = new Float32Array(N * 4);
    for (let i = 0; i < N; i++) {
      const a = rnd() * 6.283, r = 2 + Math.sqrt(rnd()) * 16;
      off[i * 4] = Math.cos(a) * r; off[i * 4 + 1] = Math.sin(a) * r; off[i * 4 + 2] = 0.8 + rnd() * 1.6; off[i * 4 + 3] = rnd() * 10;
    }
    inst.setAttribute('aOff', new THREE.InstancedBufferAttribute(off, 4));
    inst.instanceCount = N;
    this.shaftMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uTime: { value: 0 }, uSunDir: sky.uniforms.uSunDir, uSun: sky.uniforms.uSunPower, uColor: { value: new THREE.Color('#9ff1e4') } },
      vertexShader: /* glsl */ `
        uniform float uTime; uniform vec3 uSunDir;
        attribute vec4 aOff; varying vec2 vUv; varying float vSeed;
        void main() {
          vUv = uv + vec2(0.0, 0.0); vSeed = aOff.w;
          // refracted sun ray (steeper than the air ray): horizontal run per metre of depth
          vec2 run = -normalize(uSunDir.xz + 1e-4) * (length(uSunDir.xz) / max(uSunDir.y, 0.25)) * 0.75;
          float h = 11.0;
          vec3 base = vec3(aOff.x, -0.05, aOff.y);
          vec3 axis = normalize(vec3(run.x, -1.0, run.y));
          vec3 toCam = normalize(cameraPosition - base);
          vec3 side = normalize(cross(axis, toCam));      // cylindrical billboard around the ray
          float w = aOff.z * (0.5 + 0.5 * position.y * -1.0 + 0.5);
          vec3 p = base + axis * (-position.y * h) + side * position.x * w;
          p.x += sin(uTime * 0.3 + aOff.w) * 0.6;
          gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform float uTime, uSun; uniform vec3 uColor; varying vec2 vUv; varying float vSeed;
        void main() {
          float across = 1.0 - abs(vUv.x - 0.5) * 2.0;
          float len = 1.0 - vUv.y;                            // 1 at the surface -> 0 deep
          float flick = 0.65 + 0.35 * sin(uTime * 0.8 + vSeed * 3.0) * sin(uTime * 0.37 + vSeed);
          float a = pow(across, 1.6) * pow(len, 1.4) * flick * 0.16 * uSun;
          gl_FragColor = vec4(uColor * a, a);
        }`,
    });
    this.shafts = new THREE.Mesh(inst, this.shaftMat);
    this.shafts.frustumCulled = false; this.shafts.renderOrder = 4;
    scene.add(this.shafts);
  }

  update(dt, t) {
    for (const p of [this.bubbles, this.dust]) p.material.uniforms.uTime.value = t;
    this.shaftMat.uniforms.uTime.value = t;
  }
}
