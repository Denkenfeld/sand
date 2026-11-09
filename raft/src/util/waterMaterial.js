import * as THREE from 'three';

/**
 * Makes any MeshStandardMaterial "water aware":
 *  - animated caustic light on surfaces close to the waterline (sun-driven),
 *  - underwater tint + depth fade for everything below y = 0 (fish, hull logs),
 *  - wet-look boost near the waterline (darker + glossier).
 *
 * Shared uniforms come from Sky (sun, fog) plus uTime. One patch, used by raft,
 * character, fish and sharks -> consistent look and very little shader cost.
 */
export const waterShared = {
  uWTime: { value: 0 },
  uWSun: { value: 1 },
  uWDeep: { value: new THREE.Color('#06476e') },
  uWCaustic: { value: 1.0 },
  uWRaftY: { value: 0 },        // raft root world-y: wetness is measured relative to the hull
};

const CAUSTIC_GLSL = /* glsl */ `
float wCaustic(vec2 uv, float time) {
  const float TAU = 6.28318530718;
  vec2 p = mod(uv * TAU, TAU) - 250.0;
  vec2 i = p; float c = 1.0; const float inten = 0.005;
  for (int n = 0; n < 4; n++) {
    float t = time * (1.0 - (3.5 / float(n + 1)));
    i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + t) / inten), p.y / (cos(i.y + t) / inten)));
  }
  c /= 4.0; c = 1.17 - pow(c, 1.4);
  return pow(abs(c), 8.0);
}`;

/**
 * @param mat THREE.MeshStandardMaterial / PhysicalMaterial
 * @param opts { caustics: bool, tint: bool, wet: bool }
 */
export function makeWaterAware(mat, opts = {}) {
  const { caustics = true, tint = true, wet = false, wag = null } = opts;
  // wag: swim animation in the vertex shader {freq, wave, amp, from, to} (model z axis, nose = +z)
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, waterShared);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWWorld;\nuniform float uWTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        ${wag ? `
        // swim: lateral body wave growing towards the tail. Phase from instance id / world position so
        // schools and sharks never wiggle in lockstep.
        float wph = float(gl_InstanceID) * 1.713 + (modelMatrix[3].x + modelMatrix[3].z) * 0.45;
        float wk = clamp((position.z - (${wag.from.toFixed(3)})) / (${wag.to.toFixed(3)} - (${wag.from.toFixed(3)})), 0.0, 1.0);
        transformed.x += sin(uWTime * ${wag.freq.toFixed(2)} + wph + position.z * ${wag.wave.toFixed(2)}) * ${wag.amp.toFixed(4)} * wk * wk;` : ''}`)
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
        vec4 wwp = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          wwp = instanceMatrix * wwp;
        #endif
        vWWorld = (modelMatrix * wwp).xyz;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vWWorld;
        uniform float uWTime, uWSun, uWCaustic, uWRaftY;
        uniform vec3 uWDeep;
        ${CAUSTIC_GLSL}`)
      // caustics + wet darkening are applied to the diffuse before lighting
      .replace('#include <color_fragment>', `#include <color_fragment>
        float wDepth = max(-vWWorld.y, 0.0);
        float wRel = vWWorld.y - uWRaftY;                   // height above the hull's waterline
        float wetK = 1.0 - smoothstep(0.0, 0.55, wRel + 0.05);
        ${wet ? 'diffuseColor.rgb *= mix(1.0, 0.6, wetK);' : ''}
      `)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        ${wet ? 'roughnessFactor = mix(roughnessFactor, roughnessFactor * 0.4, wetK);' : ''}
      `)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        ${caustics ? `
        // light dancing up from the water: strong on side/lower faces, subtle on sunny tops
        vec3 wN = inverseTransformDirection(normal, viewMatrix);
        float sideK = mix(1.0, 0.22, smoothstep(0.25, 0.9, wN.y));
        float cLo = smoothstep(1.4, -0.05, wRel);
        float cK = wCaustic(vWWorld.xz * 0.22 + vWWorld.y * 0.05, uWTime * 0.6);
        float cK2 = wCaustic(vWWorld.xz * 0.31 + 3.7, uWTime * 0.45 + 2.0);
        totalEmissiveRadiance += diffuseColor.rgb * (cK + cK2) * cLo * sideK * uWSun * uWCaustic * 0.8;` : ''}
      `)
      .replace('#include <fog_fragment>', `
        ${tint ? `
        // underwater: absorb red first, shift to deep teal with depth
        float uwK = 1.0 - exp(-wDepth * 0.26);
        vec3 uwCol = uWDeep * (0.5 + 0.9 * uWSun);
        if (vWWorld.y < 0.02) gl_FragColor.rgb = mix(gl_FragColor.rgb * vec3(0.55, 0.85, 1.0), uwCol, uwK);` : ''}
        #include <fog_fragment>`);
  };
  mat.customProgramCacheKey = () => `wa${caustics ? 1 : 0}${tint ? 1 : 0}${wet ? 1 : 0}${wag ? JSON.stringify(wag) : ''}`;
  return mat;
}
