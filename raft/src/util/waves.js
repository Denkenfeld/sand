// Gerstner wave field – ONE definition used by the GPU (ocean vertex shader)
// and by the CPU (raft buoyancy, debris, sharks, camera clamp). Because both
// sides evaluate the very same wave table the raft really rides the surface.
//
// Extend: add an entry to WAVE_SET and everything (shader + physics) follows.

const G = 9.81;

export const WAVE_SET = [
  // angle (deg), length (m), amp (m), steepness 0..1 (crest sharpness)
  { angle: 22,  length: 46,  amp: 0.34, steep: 0.55, phase: 0.0 },
  { angle: -34, length: 27,  amp: 0.20, steep: 0.55, phase: 1.7 },
  { angle: 74,  length: 15,  amp: 0.10, steep: 0.50, phase: 3.1 },
  { angle: -82, length: 8.5, amp: 0.05, steep: 0.45, phase: 4.6 },
  { angle: 141, length: 5.2, amp: 0.025, steep: 0.40, phase: 2.2 },
];

const N = WAVE_SET.length;

// Pre-computed per-wave constants.
const W = WAVE_SET.map((w) => {
  const a = (w.angle * Math.PI) / 180;
  const k = (2 * Math.PI) / w.length;
  const c = Math.sqrt(G / k); // deep-water dispersion
  return {
    dx: Math.cos(a), dz: Math.sin(a), k, omega: c * k, A: w.amp,
    Q: w.steep / (k * w.amp * N), phase: w.phase,
  };
});

/** Global tweakables (lil-gui writes here, shader reads the same value). */
export const waveState = {
  ampScale: 0.8,
  // "Virtual world" offset: the raft stays at the scene origin while the ocean
  // pattern slides past (current/drift). Shader gets the same value (uOffset).
  ox: 0, oz: 0,
};

const _out = { height: 0, nx: 0, ny: 1, nz: 0 };

/**
 * Sample water surface at a WORLD xz position.
 * Gerstner waves also move points horizontally, so we find the rest position
 * whose displaced position matches (x,z) with a few fixed-point iterations.
 * Returns a shared object (copy values if you need to keep them).
 */
export function sampleWave(x, z, t, out = _out) {
  const s = waveState.ampScale;
  x += waveState.ox; z += waveState.oz;
  let px = x, pz = z;
  for (let it = 0; it < 3; it++) {
    let dx = 0, dz = 0;
    for (let i = 0; i < N; i++) {
      const w = W[i];
      const f = w.k * (w.dx * px + w.dz * pz) - w.omega * t + w.phase;
      const c = Math.cos(f) * w.Q * w.A * s;
      dx += w.dx * c; dz += w.dz * c;
    }
    px = x - dx; pz = z - dz;
  }
  let h = 0, nx = 0, nz = 0, ny = 1;
  for (let i = 0; i < N; i++) {
    const w = W[i];
    const f = w.k * (w.dx * px + w.dz * pz) - w.omega * t + w.phase;
    const sn = Math.sin(f), cs = Math.cos(f);
    h += w.A * s * sn;
    nx -= w.dx * w.k * w.A * s * cs;
    nz -= w.dz * w.k * w.A * s * cs;
    ny -= w.Q * w.k * w.A * s * sn;
  }
  out.height = h; out.nx = nx; out.ny = ny; out.nz = nz;
  return out;
}

/** Convenience: only the height. */
export function waveHeight(x, z, t) { return sampleWave(x, z, t, _out).height; }

/**
 * GLSL for the same field. Unrolled with literal constants (no uniform arrays).
 * Requires: uniform float uTime, uAmp;
 * gerstner(p, out normal, out foamJacobian) -> displaced position (relative: xyz offset + rest xz)
 */
export function gerstnerGLSL() {
  const f = (v) => v.toFixed(6);
  let body = '';
  W.forEach((w, i) => {
    body += `
  { float ph = ${f(w.k)} * (${f(w.dx)} * p.x + ${f(w.dz)} * p.y) - ${f(w.omega)} * uTime + ${f(w.phase)};
    float s = sin(ph), c = cos(ph);
    float qa = ${f(w.Q * w.A)} * uAmp * fade;
    float a = ${f(w.A)} * uAmp * fade;
    d.x += ${f(w.dx)} * qa * c;  d.z += ${f(w.dz)} * qa * c;  d.y += a * s;
    n.x -= ${f(w.dx * w.k)} * a * c;  n.z -= ${f(w.dz * w.k)} * a * c;
    n.y -= ${f(w.k)} * qa * s;
    float qk = ${f(w.k)} * qa * s;
    sxx += qk * ${f(w.dx * w.dx)};  szz += qk * ${f(w.dz * w.dz)};  sxz += qk * ${f(w.dx * w.dz)}; }`;
  });
  return `
// p = rest position (world xz). fade = distance attenuation of wave amplitude.
vec3 gerstner(vec2 p, float fade, out vec3 n, out float jac) {
  vec3 d = vec3(0.0); n = vec3(0.0, 1.0, 0.0);
  float sxx = 0.0, szz = 0.0, sxz = 0.0;
  ${body}
  jac = (1.0 - sxx) * (1.0 - szz) - sxz * sxz;
  n = normalize(n);
  return d;
}`;
}
