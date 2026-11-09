import * as THREE from 'three';
import { waveState, gerstnerGLSL } from '../util/waves.js';
import { SKY_UNIFORMS_GLSL, SKY_FUNCS_GLSL } from '../util/glslSky.js';

/**
 * Endless-looking ocean: a polar mesh (dense near the raft, sparse at the
 * horizon) fixed at the scene origin. The ocean pattern slides past via the
 * uOffset "virtual world" vector, so the raft never leaves the origin and
 * nothing swims or jitters.
 *
 * Shader features: Gerstner displacement, analytic normals + procedural detail
 * normals, Fresnel, sky/cloud reflection (same atmosphere as the dome), sun
 * glitter, subsurface glow in wave crests, crest foam from the Jacobian,
 * foam + ripples around the raft hull, distance-based depth colour, and
 * partial transparency so fish and the raft's underside stay visible.
 */
export class Ocean {
  constructor(sky, { radius = 3500, rings = 170, sectors = 224 } = {}) {
    this.sky = sky;
    this.uniforms = {
      ...sky.uniforms,
      uTime: { value: 0 },
      uAmp: { value: waveState.ampScale },
      uOffset: { value: new THREE.Vector2() },
      uShallow: { value: new THREE.Color('#14c8c0') },
      uDeep: { value: new THREE.Color('#05366a') },
      uClarity: { value: 0.52 },      // alpha near the camera (lower = see deeper)
      uFoamAmount: { value: 0.6 },
      uRaftPos: { value: new THREE.Vector2() },
      uRaftRot: { value: new THREE.Vector2(1, 0) }, // cos, sin of yaw
      uRaftHalf: { value: new THREE.Vector2(2.1, 2.1) },
      uRaftSpeed: { value: 0 },
    };

    const geo = this._buildGeometry(radius, rings, sectors);
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: true,
      fog: false,
      extensions: { derivatives: true },
      vertexShader: this._vertex(),
      fragmentShader: this._fragment(),
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 10; // after opaque + underwater particles
    sky.scene.add(this.mesh);
  }

  _buildGeometry(R, N, S) {
    const r0 = 0.35;
    const pos = new Float32Array((N * S + 1) * 3);
    let o = 3; // vertex 0 = centre (0,0,0)
    for (let i = 0; i < N; i++) {
      const r = r0 * Math.pow(R / r0, i / (N - 1));
      for (let j = 0; j < S; j++) {
        const a = (j / S) * Math.PI * 2;
        pos[o++] = Math.cos(a) * r; pos[o++] = 0; pos[o++] = Math.sin(a) * r;
      }
    }
    const idx = [];
    const v = (i, j) => 1 + i * S + (j % S);
    for (let j = 0; j < S; j++) idx.push(0, v(0, j + 1), v(0, j));
    for (let i = 0; i < N - 1; i++) {
      for (let j = 0; j < S; j++) {
        idx.push(v(i, j), v(i, j + 1), v(i + 1, j));
        idx.push(v(i, j + 1), v(i + 1, j + 1), v(i + 1, j));
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setIndex(idx);
    return g;
  }

  _vertex() {
    return /* glsl */ `
      uniform float uTime, uAmp;
      uniform vec2 uOffset;
      varying vec3 vWorld;
      varying vec3 vN;
      varying float vJac;
      varying float vDist;
      varying vec2 vVirt;
      ${gerstnerGLSL()}
      void main() {
        vec2 rest = position.xz;
        float dist = length(rest - cameraPosition.xz);
        float fade = 1.0 - smoothstep(500.0, 2600.0, dist);  // calm horizon, no aliasing
        vec2 p = rest + uOffset;
        vec3 n; float jac;
        vec3 d = gerstner(p, fade, n, jac);
        vec3 w = vec3(rest.x + d.x, d.y, rest.y + d.z);
        vWorld = w; vN = n; vJac = jac; vDist = dist; vVirt = p;
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
      }`;
  }

  _fragment() {
    return /* glsl */ `
      precision highp float;
      uniform float uTime, uClarity, uFoamAmount, uRaftSpeed;
      uniform vec3 uShallow, uDeep, uFogColor;
      uniform vec2 uRaftPos, uRaftRot, uRaftHalf, uOffset;
      varying vec3 vWorld;
      varying vec3 vN;
      varying float vJac;
      varying float vDist;
      varying vec2 vVirt;
      ${SKY_UNIFORMS_GLSL}
      ${SKY_FUNCS_GLSL}

      // Signed distance to the raft footprint (rounded box) in world xz.
      float raftSDF(vec2 w) {
        vec2 q = w - uRaftPos;
        vec2 l = vec2(uRaftRot.x * q.x + uRaftRot.y * q.y, -uRaftRot.y * q.x + uRaftRot.x * q.y);
        vec2 b = abs(l) - uRaftHalf;
        return length(max(b, 0.0)) + min(max(b.x, b.y), 0.0) - 0.25;
      }

      // Small animated height field for micro ripples (finite-difference normal).
      float ripple(vec2 p) {
        float t = uTime;
        return skyNoise(p * 1.7 + vec2(t * 0.35, t * 0.2)) * 0.55
             + skyNoise(p * 3.9 - vec2(t * 0.5, -t * 0.3)) * 0.3
             + skyNoise(p * 8.3 + vec2(-t * 0.8, t * 0.6)) * 0.15;
      }

      void main() {
        vec3 V = normalize(cameraPosition - vWorld);
        float dist = vDist;

        // --- Normal: analytic Gerstner + procedural detail (fades with distance)
        vec3 N = normalize(vN);
        float detail = 1.0 - smoothstep(12.0, 120.0, dist);  // fewer shimmering micro-normals far away
        if (detail > 0.01) {
          const float e = 0.07;
          float h0 = ripple(vVirt);
          float hx = ripple(vVirt + vec2(e, 0.0));
          float hz = ripple(vVirt + vec2(0.0, e));
          vec2 g = vec2(hx - h0, hz - h0) / e;
          N = normalize(N + vec3(-g.x, 0.0, -g.y) * 0.09 * detail);
        }

        // --- Raft interaction: ripples + foam skirt around the hull
        float sdf = raftSDF(vWorld.xz);
        float near = 1.0 - smoothstep(0.0, 2.4, sdf);
        if (near > 0.0) {
          float rp = sin(sdf * 11.0 - uTime * 2.6) * near * 0.12 * (0.4 + uRaftSpeed);
          N = normalize(N + vec3(rp, 0.0, rp * 0.6));
        }

        float ndv = max(dot(N, V), 0.0);
        float fres = 0.02 + 0.98 * pow(1.0 - ndv, 5.0);
        fres = clamp(fres * 1.15, 0.0, 1.0);

        // --- Reflection of the shared sky (clouds included)
        vec3 R = reflect(-V, N);
        R.y = abs(R.y) + 0.02;
        R = normalize(R);
        vec3 refl = skyWithClouds(R, 3);

        // sun glitter: tight highlight + broad sparkle modulated by noise
        float sd = max(dot(R, uSunDir), 0.0);
        float spec = pow(sd, 900.0) * 14.0 + pow(sd, 140.0) * 0.5;
        float sparkle = (0.55 + 0.9 * skyNoise(vVirt * 5.0 + uTime * 0.7)) * (1.0 - smoothstep(60.0, 500.0, dist) * 0.7);
        vec3 specular = uSunColor * spec * sparkle * uSunPower;
        // moon glitter (the sky dome draws the moon opposite the sun)
        vec3 moonDir = -uSunDir;
        float md = max(dot(R, moonDir), 0.0);
        float moonUp = smoothstep(0.0, 0.15, moonDir.y) * (1.0 - smoothstep(0.0, 0.4, uSunPower));
        specular += vec3(0.62, 0.78, 1.0) * (pow(md, 700.0) * 7.0 + pow(md, 90.0) * 0.3) * (0.5 + 0.8 * sparkle) * moonUp;

        // --- Body colour: depth gradient (shallow turquoise near -> deep blue far)
        float depthMix = smoothstep(3.0, 170.0, dist);
        vec3 body = mix(uShallow, uDeep, pow(depthMix, 0.6));
        // light penetration: darker in wave troughs, brighter on crests
        float hN = clamp(vWorld.y * 1.6 + 0.5, 0.0, 1.0);
        body *= 0.55 + 0.7 * hN;
        // subsurface scattering: light through thin crests when sun is behind them
        vec3 sunRef = normalize(uSunDir * vec3(1.0, 0.35, 1.0));
        float sss = pow(max(dot(V, -sunRef), 0.0), 3.0) * smoothstep(0.0, 0.85, hN) * (1.0 - depthMix * 0.6);
        body += vec3(0.05, 0.75, 0.55) * sss * 0.65 * uSunPower;
        body *= 0.1 + 0.9 * clamp(uSunPower * 1.15 + 0.03, 0.0, 1.0); // night dimming

        // --- Foam: crests (Jacobian) + wave-top height + around the raft
        float fn = skyFbm(vVirt * 0.85 + vec2(uTime * 0.05, -uTime * 0.03), 3);
        float fn2 = skyNoise(vVirt * 4.2 - uTime * 0.25);
        float lace = smoothstep(0.38, 0.72, fn * 0.75 + fn2 * 0.35);
        float crest = smoothstep(0.6, 0.34, vJac) + smoothstep(0.85, 1.0, hN) * 0.1;
        float foam = crest * lace * uFoamAmount * (1.0 - smoothstep(20.0, 140.0, dist));
        // hull foam: a ring hugging the edge, calmer inside the footprint (hidden by planks anyway)
        // broken lace that thins out away from the hull + a bright thin lip right at the logs
        float ring = smoothstep(-0.5, 0.05, sdf) * (1.0 - smoothstep(0.05, 0.75, sdf));
        float lace2 = smoothstep(0.42, 0.75, fn * 0.7 + fn2 * 0.55 + (0.5 - sdf) * 0.15);
        float hullFoam = ring * lace2 * 0.7;
        hullFoam += smoothstep(-0.3, 0.0, sdf) * (1.0 - smoothstep(0.0, 0.22, sdf)) * (0.5 + 0.5 * fn2);
        foam = clamp(foam + hullFoam * 0.8, 0.0, 1.0);

        // --- Compose
        vec3 col = mix(body, refl, fres);
        col += specular;
        vec3 foamCol = mix(vec3(0.85, 0.95, 1.0), uSunColor, 0.15) * (0.14 + 0.86 * clamp(uSunPower * 1.15 + 0.08, 0.0, 1.0));
        col = mix(col, foamCol, foam * 0.92);

        // --- Fog to horizon colour
        float f = 1.0 - exp(-pow(dist / 1500.0, 1.6));
        col = mix(col, uFogColor, f);

        // --- Transparency: see fish / hull close up, opaque far away & at grazing angles
        float alpha = mix(uClarity, 1.0, clamp(fres * 1.3 + smoothstep(10.0, 140.0, dist) * 0.9, 0.0, 1.0));
        alpha = max(alpha, foam);
        gl_FragColor = vec4(col, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`;
  }

  /** Called once per frame. raft = { x, z, yaw, halfX, halfZ, speed } */
  update(t, raft) {
    const u = this.uniforms;
    u.uTime.value = t;
    u.uAmp.value = waveState.ampScale;
    u.uOffset.value.set(waveState.ox, waveState.oz);
    if (raft) {
      u.uRaftPos.value.set(raft.x, raft.z);
      u.uRaftRot.value.set(Math.cos(raft.yaw), Math.sin(raft.yaw));
      u.uRaftHalf.value.set(raft.halfX, raft.halfZ);
      u.uRaftSpeed.value = raft.speed;
    }
  }
}
