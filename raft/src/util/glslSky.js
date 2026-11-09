// Shared GLSL snippets so the sky dome AND the ocean reflections use exactly
// the same atmosphere (no cube-camera needed -> cheap and always in sync).

export const SKY_UNIFORMS_GLSL = /* glsl */ `
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform float uSunPower;     // 0 at night .. 1 at noon
uniform float uCloudCover;
uniform float uSkyTime;
`;

export const SKY_FUNCS_GLSL = /* glsl */ `
float skyHash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float skyNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(skyHash(i), skyHash(i + vec2(1, 0)), f.x),
             mix(skyHash(i + vec2(0, 1)), skyHash(i + vec2(1, 1)), f.x), f.y);
}
float skyFbm(vec2 p, int oct) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 5; i++) { if (i >= oct) break; s += a * skyNoise(p); p = p * 2.07 + 11.3; a *= 0.5; }
  return s;
}

// Gradient + sun glow (no clouds, no disc). dir must be normalized, y >= 0 expected.
vec3 skyBase(vec3 dir) {
  float h = clamp(dir.y, 0.0, 1.0);
  vec3 col = mix(uHorizon, uZenith, pow(h, 0.42));
  float sd = max(dot(dir, uSunDir), 0.0);
  // warm Mie-like halo, stronger near the horizon
  float halo = pow(sd, 6.0) * 0.35 + pow(sd, 48.0) * 0.9;
  col += uSunColor * halo * (0.35 + 0.65 * (1.0 - h)) * uSunPower;
  // haze band at the horizon
  col = mix(col, uHorizon * 1.1, pow(1.0 - h, 6.0) * 0.5);
  return col;
}

// Cloud layer, projected on a plane. returns (density, lightTerm)
vec2 skyClouds(vec3 dir, int oct) {
  if (dir.y < 0.015) return vec2(0.0);
  vec2 uv = dir.xz / (dir.y + 0.18) * 1.15 + vec2(uSkyTime * 0.012, uSkyTime * 0.004);
  float n = skyFbm(uv, oct);
  float d = smoothstep(1.0 - uCloudCover, 1.0 - uCloudCover + 0.28, n);
  d *= smoothstep(0.015, 0.18, dir.y);           // fade at the horizon
  // cheap self-shadow: sample slightly toward the sun
  float n2 = skyFbm(uv + uSunDir.xz * 0.12, oct);
  float lit = clamp(0.55 + (n - n2) * 3.2, 0.2, 1.1);
  return vec2(d, lit);
}

vec3 skyWithClouds(vec3 dir, int oct) {
  vec3 col = skyBase(dir);
  vec2 c = skyClouds(dir, oct);
  vec3 cloudCol = mix(uHorizon * 0.8 + vec3(0.15), uSunColor * 1.15, c.y * 0.55 * uSunPower + 0.15);
  cloudCol = mix(cloudCol * 0.35, cloudCol, 0.35 + 0.65 * uSunPower);
  return mix(col, cloudCol, c.x * 0.92);
}
`;
