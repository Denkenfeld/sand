// Wüstenlicht: Himmel, Sonne(n), Dunst, Dünenboden, treibender Staub, Umgebungs-Reflexionen.
import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { surface } from './textures.js';
import { fbm2, smoothstep } from './noise.js';

export const ARENA = 90; // flacher, befahrbarer Bereich der Werkstatt (Meter Radius)
export const terrain = { arena: ARENA }; // aktueller flacher Radius (die Stadt braucht viel mehr)

export function terrainHeight(x, z) {
  const r = Math.hypot(x, z);
  const k = smoothstep(terrain.arena - 5, terrain.arena + 150, r);
  if (k <= 0) return 0;
  const n = fbm2(x * 0.0045 + 10, z * 0.009 - 4, 4, 9);
  const ridge = 1 - Math.abs(2 * n - 1);
  return (ridge * ridge * 30 + (n - 0.5) * 9) * k;
}

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.15, 'rgba(255,240,215,0.85)');
  grad.addColorStop(0.5, 'rgba(255,200,150,0.18)');
  grad.addColorStop(1, 'rgba(255,200,150,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const _UP = new THREE.Vector3(0, 1, 0), _r = new THREE.Vector3(), _u = new THREE.Vector3(), _snap = new THREE.Vector3();

function lerpColor(out, a, b, t) {
  out.r = a[0] + (b[0] - a[0]) * t;
  out.g = a[1] + (b[1] - a[1]) * t;
  out.b = a[2] + (b[2] - a[2]) * t;
  return out;
}

export class Atmosphere {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.state = { hour: 15.2, dust: 0.3, twoSuns: false, exposure: 0.55 };
    this.fogScale = 1;
    this.nightK = 0;
    this.onNight = null;
    this.shadowR = 60;
    this.lightDir = new THREE.Vector3();
    this.moonDir = new THREE.Vector3();
    this.sunDir = new THREE.Vector3();
    this.sun2Dir = new THREE.Vector3();
    this.focusPoint = new THREE.Vector3();
    this._envDirty = true;
    this._envTimer = 0;

    // Himmel
    this.sky = new Sky();
    this.sky.scale.setScalar(3500);
    this.sky.material.depthWrite = false;
    scene.add(this.sky);

    // Licht
    this.sun = new THREE.DirectionalLight(0xfff0dd, 3);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096);
    const sc = this.sun.shadow.camera;
    sc.left = -60; sc.right = 60; sc.top = 60; sc.bottom = -60; sc.near = 1; sc.far = 400;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.05;
    scene.add(this.sun, this.sun.target);
    this.sun2 = new THREE.DirectionalLight(0xff9a6a, 0);
    scene.add(this.sun2);
    this.hemi = new THREE.HemisphereLight(0x9bb8e0, 0xc89a60, 0.5);
    scene.add(this.hemi);
    this.stars = this._buildStars();
    scene.add(this.stars);

    scene.fog = new THREE.FogExp2(0xd8b890, 0.0025);

    // Sonnenscheiben
    const glow = glowTexture();
    const mkGlow = (size, color) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
      s.scale.setScalar(size);
      s.renderOrder = -1;
      scene.add(s);
      return s;
    };
    this.glow1 = mkGlow(520, 0xffe6c0);
    this.glow2 = mkGlow(300, 0xff8a55);
    this.glow2.visible = false;
    this.moonGlow = mkGlow(150, 0xcfdcff);
    this.moonGlow.visible = false;

    // Boden
    this.ground = this._buildGround();
    scene.add(this.ground);

    // Staub
    this.dust = this._buildDust(520, glow);
    scene.add(this.dust);

    // Umgebung für Reflexionen
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.envScene = new THREE.Scene();
    this.envSky = new Sky();
    this.envSky.scale.setScalar(1000);
    this.envScene.add(this.envSky);
    this.envGround = new THREE.Mesh(new THREE.CircleGeometry(80, 32), new THREE.MeshBasicMaterial({ color: 0x806040 }));
    this.envGround.rotation.x = -Math.PI / 2;
    this.envGround.position.y = -1;
    this.envScene.add(this.envGround);
    this._envRT = null;

    this.apply();
  }

  _buildGround() {
    const geo = new THREE.PlaneGeometry(3200, 3200, 400, 400);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, terrainHeight(pos.getX(i), pos.getZ(i)));
    geo.computeVertexNormals();
    const s = surface('sand');
    const rep = 3200 / 5;
    for (const t of [s.map, s.normalMap, s.orm]) t.repeat.set(rep, rep);
    const mat = new THREE.MeshStandardMaterial({ map: s.map, normalMap: s.normalMap, roughnessMap: s.orm, roughness: 1, metalness: 0 });
    mat.normalScale.set(0.9, 0.9);
    this.cityU = { uCity: { value: null }, uCityBox: { value: new THREE.Vector3(0, 0, 1) }, uCityOn: { value: 0 }, uGroundSpec: { value: 0.6 } };
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, this.cityU);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 gWPos;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\ngWPos = (modelMatrix * vec4(position, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
varying vec3 gWPos;
uniform sampler2D uCity;
uniform vec3 uCityBox;
uniform float uCityOn;
uniform float uGroundSpec;
float gh(vec2 p){ p = fract(p * vec2(0.1031, 0.1030)); p += dot(p, p.yx + 33.33); return fract((p.x + p.y) * p.x); }
float gn(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(gh(i), gh(i+vec2(1,0)), f.x), mix(gh(i+vec2(0,1)), gh(i+vec2(1,1)), f.x), f.y); }`
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
float g1 = gn(gWPos.xz * 0.011);
float g2 = gn(gWPos.xz * 0.09 + 7.0);
float g3 = gn(gWPos.xz * 0.6 + 3.0);
diffuseColor.rgb *= (0.8 + 0.4 * g1) * (0.9 + 0.2 * g2) * (0.94 + 0.12 * g3);
diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.05, 0.9, 0.78), smoothstep(0.5, 0.8, g1));
{
  vec2 cuv = (gWPos.xz - uCityBox.xy) / uCityBox.z;
  float inside = step(0.0, cuv.x) * step(cuv.x, 1.0) * step(0.0, cuv.y) * step(cuv.y, 1.0) * uCityOn;
  vec4 cm = texture2D(uCity, clamp(cuv, 0.001, 0.999)) * inside;
  // gestampfte Erde: Höfe und Hausumfelder
  diffuseColor.rgb = mix(diffuseColor.rgb, pow(vec3(0.6, 0.47, 0.34), vec3(2.2)) * (0.86 + 0.28 * g3), cm.b * 0.72);
  // Straßen: festgefahren, dunkler, mit feinen Spurrillen quer zur Rauschrichtung
  float rut = gn(gWPos.xz * vec2(1.7, 0.9) + 40.0) * 0.5 + gn(gWPos.xz * vec2(0.8, 2.1) + 11.0) * 0.5;
  vec3 roadC = pow(vec3(0.5, 0.39, 0.28), vec3(2.2)) * (0.84 + 0.3 * g2) * (0.9 + 0.2 * rut);
  diffuseColor.rgb = mix(diffuseColor.rgb, roadC, cm.r * 0.86);
  // Plätze: Steinplatten mit Fugen
  vec2 pq = gWPos.xz / 1.25;
  pq.x += floor(pq.y) * 0.5;
  vec2 pf = abs(fract(pq) - 0.5);
  float joint = smoothstep(0.43, 0.5, max(pf.x, pf.y));
  vec3 paveC = pow(vec3(0.66, 0.58, 0.47), vec3(2.2)) * (0.8 + 0.32 * g3 + 0.12 * gn(floor(pq) * 1.7));
  paveC *= 1.0 - 0.38 * joint;
  diffuseColor.rgb = mix(diffuseColor.rgb, paveC, cm.g * 0.92);
  // Ruß, Öl, Schmutz
  diffuseColor.rgb *= 1.0 - cm.a * 0.45;
}`
        )
        .replace('#include <lights_fragment_maps>', '#include <lights_fragment_maps>\nradiance *= uGroundSpec;');
    };
    const m = new THREE.Mesh(geo, mat);
    m.receiveShadow = true;
    m.name = 'ground';
    return m;
  }

  _buildDust(n, tex) {
    const geo = new THREE.BufferGeometry();
    const p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      p[i * 3] = (Math.random() - 0.5) * 140;
      p[i * 3 + 1] = Math.random() * 26;
      p[i * 3 + 2] = (Math.random() - 0.5) * 140;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const mat = new THREE.PointsMaterial({ map: tex, size: 3.2, sizeAttenuation: true, transparent: true, opacity: 0.3, depthWrite: false, color: 0xd9b88a });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    return pts;
  }

  setCityMap(tex, box) {
    this.cityU.uCity.value = tex;
    if (box) this.cityU.uCityBox.value.set(box[0], box[1], box[2]);
    this.cityU.uCityOn.value = tex ? 1 : 0;
    // Stadt: Blick oft flach über den Boden → weniger Himmelsspiegelung auf dem Sand, feinerer Staub
    this.cityU.uGroundSpec.value = tex ? 0.16 : 0.6;
    this.dust.material.size = tex ? 1.5 : 3.2;
  }

  // flachen Radius des Bodens ändern (Stadt: groß, Werkstatt: klein) und das Gelände neu berechnen
  setArena(r) {
    if (terrain.arena === r) return;
    terrain.arena = r;
    const pos = this.ground.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, terrainHeight(pos.getX(i), pos.getZ(i)));
    pos.needsUpdate = true;
    this.ground.geometry.computeVertexNormals();
    this.ground.geometry.computeBoundingSphere();
  }

  setShadowRadius(r) {
    r = Math.max(20, Math.min(220, r));
    if (Math.abs(r - this.shadowR) < 0.5) return;
    this.shadowR = r;
    const sc = this.sun.shadow.camera;
    sc.left = -r; sc.right = r; sc.top = r; sc.bottom = -r;
    sc.far = 400 + r * 3;
    sc.updateProjectionMatrix();
  }

  _buildStars() {
    const n = 1800;
    const p = new Float32Array(n * 3);
    let a = 12345;
    const rnd = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
    for (let i = 0; i < n; i++) {
      const u = rnd() * 2 - 1, t = rnd() * Math.PI * 2, s = Math.sqrt(1 - u * u);
      p[i * 3] = s * Math.cos(t) * 3000; p[i * 3 + 1] = Math.abs(u) * 3000 * 0.98 + 40; p[i * 3 + 2] = s * Math.sin(t) * 3000;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const m = new THREE.PointsMaterial({ color: 0xdfe8ff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false });
    const pts = new THREE.Points(g, m);
    pts.frustumCulled = false;
    pts.renderOrder = -2;
    pts.visible = false;
    return pts;
  }

  setHour(h) { this.state.hour = ((h % 24) + 24) % 24; this.apply(); }
  setDust(d) { this.state.dust = d; this.apply(); }
  setTwoSuns(b) { this.state.twoSuns = b; this.apply(); }

  apply() {
    const s = this.state;
    const el = 78 * Math.sin((Math.PI * (s.hour - 6)) / 12); // Grad (negativ = Nacht)
    const az = 180 + (s.hour - 12) * (80 / 6);
    const sph = new THREE.Spherical(1, Math.PI / 2 - THREE.MathUtils.degToRad(el), THREE.MathUtils.degToRad(az));
    this.sunDir.setFromSpherical(sph);
    this.elevation = el;

    const u = this.sky.material.uniforms;
    const low = 1 - smoothstep(0, 30, el);
    u.turbidity.value = 4 + s.dust * 14;
    u.rayleigh.value = 1.1 + low * 1.8 + (1 - s.dust) * 0.6;
    u.mieCoefficient.value = 0.004 + s.dust * 0.022;
    u.mieDirectionalG.value = 0.82;
    u.sunPosition.value.copy(this.sunDir);

    const sunCol = new THREE.Color();
    lerpColor(sunCol, [1.0, 0.58, 0.3], [1.0, 0.95, 0.86], smoothstep(2, 38, el));
    this.sun.color.copy(sunCol);
    this.sun.intensity = 7.2 * smoothstep(-4, 16, el) * (1 - 0.4 * s.dust) + 0.02;

    // Nacht: Mond übernimmt das schattenwerfende Licht
    const night = 1 - smoothstep(-7, 4, el);
    this.nightK = night;
    const hh = (s.hour + 6) % 24; // 0 = 18:00
    const elM = hh < 12 ? 58 * Math.sin((Math.PI * hh) / 12) : -12;
    const azM = 120 + hh * 9;
    this.moonDir.setFromSpherical(new THREE.Spherical(1, Math.PI / 2 - THREE.MathUtils.degToRad(Math.max(elM, 6)), THREE.MathUtils.degToRad(azM)));
    const moonK = smoothstep(-3, -10, el) * smoothstep(-4, 10, elM);
    this.lightDir.copy(this.sunDir);
    if (el < -3) {
      this.lightDir.copy(this.moonDir);
      this.sun.color.setRGB(0.55, 0.68, 1.0);
      this.sun.intensity = 0.55 * (0.25 + 0.75 * moonK) * night;
    } else if (el < 2) {
      this.sun.intensity *= 1; // Dämmerung: Sonne bleibt schwach vorhanden
    }
    this.moonGlow.visible = night > 0.05 && elM > 0;
    this.moonGlow.material.opacity = night;
    this.stars.visible = night > 0.02;
    this.stars.material.opacity = Math.min(1, night * 1.2) * (1 - 0.65 * s.dust);
    if (this.onNight) this.onNight(night);

    const skyC = lerpColor(new THREE.Color(), [0.42, 0.4, 0.56], [0.6, 0.72, 0.9], smoothstep(0, 30, el));
    this.hemi.color.copy(skyC).lerp(new THREE.Color(0.2, 0.3, 0.62), night * 0.85);
    this.hemi.groundColor.setRGB(0.78, 0.58, 0.36).lerp(new THREE.Color(0.1, 0.12, 0.2), night * 0.8);
    this.hemi.intensity = 0.1 + 0.2 * smoothstep(-2, 30, el) + 0.2 * night;

    const fogC = lerpColor(new THREE.Color(), [0.55, 0.34, 0.26], [0.78, 0.58, 0.38], smoothstep(0, 32, el));
    const bright = 0.35 + 0.65 * smoothstep(-4, 22, el);
    this.scene.fog.color.setRGB(fogC.r * bright, fogC.g * bright, fogC.b * bright).lerp(new THREE.Color(0.03, 0.04, 0.08), night * 0.9);
    this.scene.fog.density = (0.0007 + s.dust * 0.0058) * this.fogScale;
    this.renderer.toneMappingExposure = s.exposure * (1 + 1.1 * night);

    this.dust.material.opacity = 0.08 + s.dust * 0.5;

    // zweite Sonne: tiefer, kleiner, röter
    this.glow2.visible = s.twoSuns;
    if (s.twoSuns) {
      const el2 = Math.max(-3, el * 0.55 - 6);
      const az2 = az + 34;
      this.sun2Dir.setFromSpherical(new THREE.Spherical(1, Math.PI / 2 - THREE.MathUtils.degToRad(el2), THREE.MathUtils.degToRad(az2)));
      this.sun2.intensity = 1.6 * smoothstep(-4, 12, el2);
    } else {
      this.sun2.intensity = 0;
    }
    this.sun2.position.copy(this.sun2Dir).multiplyScalar(100);

    this.glow1.material.opacity = smoothstep(-6, 8, el);
    this._envDirty = true;
    this._shadowFollow();
  }

  _shadowFollow() {
    // Schattenkamera folgt dem Fokus, einrastend auf das Texelraster (sonst flimmern die Schattenkanten beim Bewegen)
    const f = this.focusPoint, L = this.lightDir;
    const tex = (2 * this.shadowR) / this.sun.shadow.mapSize.x;
    _r.crossVectors(_UP, L).normalize();
    _u.crossVectors(L, _r);
    const x = f.dot(_r), y = f.dot(_u);
    _snap.copy(f).addScaledVector(_r, Math.round(x / tex) * tex - x).addScaledVector(_u, Math.round(y / tex) * tex - y);
    this.sun.target.position.copy(_snap);
    this.sun.position.copy(_snap).addScaledVector(L, 150 + this.shadowR * 1.5);
    this.sun.target.updateMatrixWorld();
  }

  focus(v) {
    this.focusPoint.copy(v);
    this._shadowFollow();
  }

  _rebuildEnv() {
    const u = this.envSky.material.uniforms, s = this.sky.material.uniforms;
    for (const k of ['turbidity', 'rayleigh', 'mieCoefficient', 'mieDirectionalG']) u[k].value = s[k].value;
    u.sunPosition.value.copy(this.sunDir);
    const f = 0.3 + 0.7 * smoothstep(-2, 30, this.elevation);
    this.envGround.material.color.setRGB(0.5 * f, 0.36 * f, 0.22 * f);
    const rt = this.pmrem.fromScene(this.envScene, 0.02);
    this.scene.environment = rt.texture;
    this.scene.environmentIntensity = 0.3;
    if (this._envRT) this._envRT.dispose();
    this._envRT = rt;
  }

  update(dt, camera) {
    const cp = camera.position;
    this.sky.position.copy(cp);
    this.glow1.position.copy(cp).addScaledVector(this.sunDir, 3000);
    this.glow2.position.copy(cp).addScaledVector(this.sun2Dir, 3000);
    this.moonGlow.position.copy(cp).addScaledVector(this.moonDir, 3000);
    this.stars.position.copy(cp);

    // Staub treibt mit dem Wind und bleibt um den Fokus herum
    const p = this.dust.geometry.attributes.position;
    const wind = 3 + this.state.dust * 14;
    const c = this.focusPoint;
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i) + wind * dt, y = p.getY(i) + Math.sin(i + performance.now() * 0.0004) * 0.02, z = p.getZ(i) + wind * 0.3 * dt;
      if (x - c.x > 70) x -= 140; else if (x - c.x < -70) x += 140;
      if (z - c.z > 70) z -= 140; else if (z - c.z < -70) z += 140;
      p.setXYZ(i, x, y, z);
    }
    p.needsUpdate = true;

    this._envTimer -= dt;
    if (this._envDirty && this._envTimer <= 0) {
      this._rebuildEnv();
      this._envDirty = false;
      this._envTimer = 0.25;
    }
  }
}

export const PRESETS = {
  Morgen: { hour: 7.1, dust: 0.22, twoSuns: false },
  Mittag: { hour: 12, dust: 0.18, twoSuns: false },
  Nachmittag: { hour: 15.2, dust: 0.3, twoSuns: false },
  'Goldene Stunde': { hour: 17.6, dust: 0.38, twoSuns: false },
  'Zwei Sonnen': { hour: 17.2, dust: 0.4, twoSuns: true },
  Sandsturm: { hour: 14, dust: 0.95, twoSuns: false },
  Abenddämmerung: { hour: 18.75, dust: 0.3, twoSuns: false },
  Nacht: { hour: 23.2, dust: 0.1, twoSuns: false },
};
