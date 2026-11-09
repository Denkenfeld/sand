import * as THREE from 'three';
import { SKY_UNIFORMS_GLSL, SKY_FUNCS_GLSL } from '../util/glslSky.js';

// Palette keyframes indexed by sun elevation (sin of altitude). Interpolated
// piecewise-linearly -> smooth dawn / day / dusk / night without extra code.
const KEYS = [
  { e: -0.30, zen: '#050c1c', hor: '#12224a', sun: '#7f93c8', pow: 0.0, light: 2.3, hemi: 0.95, cover: 0.45 },
  { e: -0.06, zen: '#1a2a5a', hor: '#7a5a86', sun: '#ff9a62', pow: 0.15, light: 1.6, hemi: 1.15, cover: 0.5 },
  { e:  0.04, zen: '#2c4a86', hor: '#ff9b6a', sun: '#ffb27a', pow: 0.55, light: 2.1,  hemi: 0.85, cover: 0.55 },
  { e:  0.20, zen: '#3b78c2', hor: '#ffd1a0', sun: '#ffc27a', pow: 0.85, light: 2.4,  hemi: 0.8,  cover: 0.55 },
  { e:  0.50, zen: '#2a8bdc', hor: '#bfe8f7', sun: '#fff0d4', pow: 1.0,  light: 3.1,  hemi: 1.0,  cover: 0.52 },
  { e:  1.00, zen: '#1d78d2', hor: '#a8ddf3', sun: '#fff6e4', pow: 1.0,  light: 3.3,  hemi: 1.05, cover: 0.5 },
];
const _a = new THREE.Color(), _b = new THREE.Color();

function lerpKey(e, prop, out) {
  let i = 0;
  while (i < KEYS.length - 2 && e > KEYS[i + 1].e) i++;
  const k0 = KEYS[i], k1 = KEYS[i + 1];
  const t = THREE.MathUtils.clamp((e - k0.e) / (k1.e - k0.e), 0, 1);
  if (typeof k0[prop] === 'string') return out.copy(_a.set(k0[prop])).lerp(_b.set(k1[prop]), t);
  return k0[prop] + (k1[prop] - k0[prop]) * t;
}

export class Sky {
  constructor(scene) {
    this.scene = scene;
    this.hours = 15.5;
    this.auto = false;
    this.daySeconds = 240;        // real seconds for one full day when auto-cycling
    this.time = 0;

    // Shared uniforms (ocean + sky dome + water-tinted materials read these).
    this.uniforms = {
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uSunColor: { value: new THREE.Color() },
      uZenith: { value: new THREE.Color() },
      uHorizon: { value: new THREE.Color() },
      uSunPower: { value: 1 },
      uCloudCover: { value: 0.52 },
      uSkyTime: { value: 0 },
      uFogColor: { value: new THREE.Color() },
      uFogDensity: { value: 0.00042 },
    };

    // --- Lights ---------------------------------------------------------
    this.sun = new THREE.DirectionalLight(0xffffff, 3);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -9; sc.right = 9; sc.top = 9; sc.bottom = -9; sc.near = 1; sc.far = 60;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.03;
    scene.add(this.sun, this.sun.target);

    this.hemi = new THREE.HemisphereLight(0xbfe6ff, 0x1c6f86, 1.0);
    scene.add(this.hemi);

    scene.fog = new THREE.FogExp2(0xbfe8f7, this.uniforms.uFogDensity.value);

    // --- Sky dome -------------------------------------------------------
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = position;
          vec4 p = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * p;
          gl_Position.z = gl_Position.w; // always at far plane
        }`,
      fragmentShader: /* glsl */ `
        varying vec3 vDir;
        uniform vec3 uFogColor;
        ${SKY_UNIFORMS_GLSL}
        ${SKY_FUNCS_GLSL}
        float starField(vec3 d) {
          vec3 q = d * 140.0; vec3 i = floor(q);
          float h = fract(sin(dot(i, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
          vec3 f = fract(q) - 0.5;
          float m = smoothstep(0.985, 1.0, h) * smoothstep(0.35, 0.0, length(f));
          return m * (0.6 + 0.4 * fract(h * 91.7));
        }
        void main() {
          vec3 dir = normalize(vDir);
          vec3 col;
          if (dir.y < 0.0) {
            col = mix(uFogColor, uFogColor * vec3(0.55, 0.75, 0.9), clamp(-dir.y * 8.0, 0.0, 1.0));
          } else {
            col = skyWithClouds(dir, 5);
            float night = 1.0 - smoothstep(0.0, 0.6, uSunPower);
            col += vec3(0.8, 0.9, 1.0) * starField(dir) * night * (1.0 - skyClouds(dir, 2).x);
            float sd = dot(dir, uSunDir);
            float disc = smoothstep(0.99972, 0.99988, sd);
            col += uSunColor * disc * 28.0 * smoothstep(-0.02, 0.05, dir.y) * (1.0 - skyClouds(dir, 3).x * 0.85);
            // moon opposite to the sun, only visible at night
            float md = dot(dir, -uSunDir);
            col += vec3(0.75, 0.85, 1.0) * smoothstep(0.9996, 0.9998, md) * 3.0 * night;
          }
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(5000, 48, 24), mat);
    this.dome.frustumCulled = false;
    this.dome.renderOrder = -10;
    scene.add(this.dome);

    this.setTime(this.hours);
  }

  setTime(hours) {
    this.hours = ((hours % 24) + 24) % 24;
    const ang = ((this.hours - 6) / 12) * Math.PI;
    const dir = this.uniforms.uSunDir.value.set(Math.cos(ang), Math.sin(ang) * 0.92, -0.38).normalize();
    const e = dir.y;
    const u = this.uniforms;
    lerpKey(e, 'zen', u.uZenith.value);
    lerpKey(e, 'hor', u.uHorizon.value);
    lerpKey(e, 'sun', u.uSunColor.value);
    u.uSunPower.value = lerpKey(e, 'pow');
    u.uCloudCover.value = lerpKey(e, 'cover');
    u.uFogColor.value.copy(u.uHorizon.value).lerp(u.uZenith.value, 0.12);
    this.scene.fog.color.copy(u.uFogColor.value);

    const night = e < -0.02;
    // Directional light = sun by day, moon by night (opposite direction).
    const lightDir = night ? dir.clone().negate() : dir;
    this.lightOffset = lightDir.clone().multiplyScalar(40);
    this.sun.position.copy(this.sun.target.position).add(this.lightOffset);
    this.sun.color.copy(night ? new THREE.Color('#9fb4ff') : u.uSunColor.value);
    // sun <-> moon hand-over: dip the light briefly so the flip of direction/colour is not visible
    const handover = THREE.MathUtils.smoothstep(Math.abs(e + 0.02), 0.0, 0.07);
    this.sun.intensity = lerpKey(e, 'light') * (0.62 + 0.38 * handover);
    this.hemi.color.copy(u.uZenith.value).lerp(u.uHorizon.value, 0.55);
    this.hemi.groundColor.set('#1d7d92').multiplyScalar(0.5 + 0.5 * u.uSunPower.value);
    this.hemi.intensity = lerpKey(e, 'hemi') * 0.7;  // the env-map supplies the rest of the ambient light
    this.sunUp = e;
  }

  /**
   * Bake the procedural sky (incl. clouds, sun glow) into a PMREM environment map so
   * wet/metal materials reflect the actual sky instead of going black. Cheap (one
   * cube render), re-run only when the time of day moved noticeably.
   */
  updateEnvironment(renderer, force = false) {
    if (!force && this._envHours !== undefined && Math.abs(this._envHours - this.hours) < 0.2) return;
    this._envHours = this.hours;
    this.pmrem ??= new THREE.PMREMGenerator(renderer);
    if (!this.envScene) {
      this.envScene = new THREE.Scene();
      this.envDome = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), this.dome.material);
      this.envDome.frustumCulled = false;
      this.envScene.add(this.envDome);
    }
    const target = this.pmrem.fromScene(this.envScene, 0, 0.1, 100);
    this._envTarget?.dispose();
    this._envTarget = target;
    this.scene.environment = target.texture;
    this.scene.environmentIntensity = 1.0 - 0.4 * this.uniforms.uSunPower.value;
  }

  /** Keep the shadow frustum centred on the raft. */
  followShadowTarget(pos) {
    this.sun.target.position.copy(pos);
    this.sun.position.copy(pos).add(this.lightOffset);
    this.sun.target.updateMatrixWorld();
  }

  update(dt, camera) {
    this.time += dt;
    this.uniforms.uSkyTime.value = this.time;
    if (this.auto) this.setTime(this.hours + (dt * 24) / this.daySeconds);
    this.dome.position.copy(camera.position);
  }
}
