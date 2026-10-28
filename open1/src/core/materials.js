// Material-Fabrik. Jedes Material bekommt ein "Wetter"-Shaderstück:
// Sand sammelt sich unten, Schmutzschlieren, Lack platzt ab (Metall) – alles live per Regler.
import * as THREE from 'three';
import { surface } from './textures.js';

export const weather = {
  uDirt: { value: 0.45 },
  uSand: { value: 0.5 },
  uWear: { value: 0.5 },
  uSandColor: { value: new THREE.Color(0.8, 0.64, 0.44) },
};

const GLSL_COMMON = /* glsl */ `
varying vec3 vLPos;
varying vec3 vWPos;
varying vec3 vWNormal;
`;

// Position/Normale für das Wetter-Shaderstück; bei BatchedMesh (Stadt) wirkt zusätzlich die Instanzmatrix
const GLSL_VERTEX = /* glsl */ `
#include <begin_vertex>
vec4 wpB = vec4(position, 1.0);
vec3 wnB = normal;
#ifdef USE_BATCHING
  mat3 bmW = mat3(batchingMatrix);
  wpB = batchingMatrix * wpB;
  wnB = bmW * (wnB / vec3(dot(bmW[0], bmW[0]), dot(bmW[1], bmW[1]), dot(bmW[2], bmW[2])));
  vLPos = position + batchingMatrix[3].xyz * 0.131; // jede Instanz bekommt ein eigenes Schmutzmuster
#else
  vLPos = position;
#endif
vWPos = (modelMatrix * wpB).xyz;
vWNormal = normalize(mat3(modelMatrix) * wnB);
`;

const GLSL_FRAG_COMMON = /* glsl */ `
varying vec3 vLPos;
varying vec3 vWPos;
varying vec3 vWNormal;
uniform float uDirt;
uniform float uSand;
uniform float uWear;
uniform float uSandBias;
uniform float uWearable;
uniform float uWScale;
uniform float uNoSand;
uniform vec3 uSandColor;
float fhash(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float fnoise(vec3 p){
  vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(fhash(i), fhash(i + vec3(1.0,0.0,0.0)), f.x), mix(fhash(i + vec3(0.0,1.0,0.0)), fhash(i + vec3(1.0,1.0,0.0)), f.x), f.y),
    mix(mix(fhash(i + vec3(0.0,0.0,1.0)), fhash(i + vec3(1.0,0.0,1.0)), f.x), mix(fhash(i + vec3(0.0,1.0,1.0)), fhash(i + vec3(1.0,1.0,1.0)), f.x), f.y),
    f.z);
}
float ffbm(vec3 p){ float a = 0.5; float s = 0.0; for (int i = 0; i < 4; i++){ s += a * fnoise(p); p = p * 2.03 + 17.0; a *= 0.5; } return s / 0.9375; }
`;

const GLSL_COLOR = /* glsl */ `
#include <color_fragment>
float wSand = 0.0;
float wGrime = 0.0;
{
  vec3 lp = vLPos * uWScale;
  float nA = ffbm(lp * 2.3);
  float nB = ffbm(lp * 9.0 + 5.0);
  float up = clamp(vWNormal.y, 0.0, 1.0);
  float lowBand = smoothstep(1.0 + uSandBias, -0.1, vWPos.y + (nA - 0.5) * 0.9);
  wSand = clamp(uSand * (lowBand * 0.95 + up * 0.3 * smoothstep(0.45, 0.85, nA + 0.2)), 0.0, 1.0) * (1.0 - uNoSand);
  float streak = ffbm(vec3(lp.x * 6.0, lp.y * 0.7, lp.z * 6.0) + 11.0);
  wGrime = clamp(uDirt * (0.25 + 0.77 * smoothstep(0.35, 0.85, streak) + 0.5 * (1.0 - up) * nA), 0.0, 1.0);
  diffuseColor.rgb *= 1.0 - wGrime * 0.6;
  if (uWearable > 0.5) {
    float wearN = ffbm(lp * 7.0 + 31.0) * 0.7 + nB * 0.3;
    float wearMask = smoothstep(0.66 - uWear * 0.18, 0.72 - uWear * 0.18, wearN);
    float rustMask = wearMask * smoothstep(0.35, 0.65, nA);
    vec3 bare = vec3(0.42, 0.42, 0.44) * (0.8 + 0.4 * nB);
    vec3 rustC = vec3(0.36, 0.17, 0.07) * (0.7 + 0.6 * nB);
    diffuseColor.rgb = mix(diffuseColor.rgb, mix(bare, rustC, rustMask), wearMask * clamp(uWear, 0.0, 1.0) * 0.9);
  }
  diffuseColor.rgb = mix(diffuseColor.rgb, uSandColor * (0.82 + 0.3 * nB), wSand * 0.82);
}
`;

export function weatherize(mat, { wearable = 1, sandBias = 0, scale = 1, noSand = 0 } = {}) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uDirt = weather.uDirt;
    shader.uniforms.uSand = weather.uSand;
    shader.uniforms.uWear = weather.uWear;
    shader.uniforms.uSandColor = weather.uSandColor;
    shader.uniforms.uWearable = { value: wearable };
    shader.uniforms.uSandBias = { value: sandBias };
    shader.uniforms.uWScale = { value: scale };
    shader.uniforms.uNoSand = { value: noSand };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n' + GLSL_COMMON)
      .replace('#include <begin_vertex>', GLSL_VERTEX);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + GLSL_FRAG_COMMON)
      .replace('#include <color_fragment>', GLSL_COLOR)
      .replace(
        '#include <roughnessmap_fragment>',
        '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.95, clamp(wSand * 0.8 + wGrime * 0.25, 0.0, 1.0));'
      )
      .replace(
        '#include <metalnessmap_fragment>',
        '#include <metalnessmap_fragment>\nmetalnessFactor *= 1.0 - wSand * 0.9;'
      );
  };
  mat.customProgramCacheKey = () => 'forge-weather';
  return mat;
}

const cache = new Map();
const key = (...a) => a.join('|');

function standard(kind, pal, { map, normalMap, orm }, o, defaults) {
  const mat = new THREE.MeshStandardMaterial({
    map,
    normalMap,
    normalScale: new THREE.Vector2(o.normal ?? defaults.normal ?? 1, o.normal ?? defaults.normal ?? 1),
    roughnessMap: orm,
    metalnessMap: orm,
    roughness: 1,
    metalness: kind === 'metal' ? 1 : 0,
    color: o.tint ?? 0xffffff,
    side: o.side ?? THREE.FrontSide,
  });
  mat.userData.tpm = o.tpm ?? defaults.tpm; // Kacheln pro Meter (für UV-Projektion)
  mat.userData.surface = kind;
  weatherize(mat, { wearable: defaults.wearable, sandBias: o.sandBias ?? 0, noSand: o.noSand ?? 0 });
  return mat;
}

export const M = {
  // Lackiertes Blech, Paletten: sand gray rust blue white olive red black
  metal(pal = 'sand', o = {}) {
    const k = key('metal', pal, o.tint ?? '', o.side ?? '', o.sandBias ?? '', o.noSand ?? '');
    if (!cache.has(k)) cache.set(k, standard('metal', pal, surface('metal', pal), o, { tpm: 0.25, wearable: 1 }));
    return cache.get(k);
  },
  // Lehmputz, Paletten: adobe white dark red
  clay(pal = 'adobe', o = {}) {
    const k = key('clay', pal, o.tint ?? '', o.side ?? '', o.sandBias ?? '');
    if (!cache.has(k)) cache.set(k, standard('clay', pal, surface('clay', pal), o, { tpm: 0.33, wearable: 0, normal: 0.8 }));
    return cache.get(k);
  },
  cloth(color = 0x8a7a5a, o = {}) {
    const k = key('cloth', color, o.side ?? '');
    if (!cache.has(k)) cache.set(k, standard('cloth', 'default', surface('cloth'), { side: THREE.DoubleSide, noSand: 0.7, ...o, tint: color }, { tpm: 1.2, wearable: 0, normal: 0.7 }));
    return cache.get(k);
  },
  wood(color = 0xffffff, o = {}) {
    const k = key('wood', color);
    // Die Textur ist schon braun, die Tönung hellt nur ab oder färbt leicht um (zweimal Braun multipliziert wäre fast schwarz)
    if (!cache.has(k)) cache.set(k, standard('wood', 'default', surface('wood'), { ...o, tint: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.45) }, { tpm: 0.5, wearable: 0 }));
    return cache.get(k);
  },
  // Reifen: nutzt die Original-UVs der Zylinder (u = Umfang, v = Breite)
  tread(o = {}) {
    const k = key('tread');
    if (!cache.has(k)) cache.set(k, standard('tread', 'default', surface('tread'), o, { tpm: 1, wearable: 0, normal: 1.2 }));
    return cache.get(k);
  },
  glow(color = 0xffb060, intensity = 2) {
    const k = key('glow', color, intensity);
    if (!cache.has(k)) cache.set(k, new THREE.MeshStandardMaterial({ color: 0x111111, emissive: color, emissiveIntensity: intensity, roughness: 0.4 }));
    return cache.get(k);
  },
  glass(color = 0x3b4c54, opacity = 0.55) {
    const k = key('glass', color, opacity);
    if (!cache.has(k)) cache.set(k, new THREE.MeshStandardMaterial({ color, roughness: 0.08, metalness: 0.3, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false }));
    return cache.get(k);
  },
  dark(color = 0x1b1a19) {
    const k = key('dark', color);
    if (!cache.has(k)) {
      const m = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.2 });
      m.userData.tpm = 1;
      weatherize(m, { wearable: 0 });
      cache.set(k, m);
    }
    return cache.get(k);
  },
};
