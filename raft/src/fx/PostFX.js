import * as THREE from 'three';
import {
  EffectComposer, RenderPass, EffectPass, BloomEffect, ToneMappingEffect, ToneMappingMode, VignetteEffect,
  ChromaticAberrationEffect, NoiseEffect, DepthOfFieldEffect, Effect, BlendFunction, SMAAEffect,
} from 'postprocessing';

/** HDR exposure, applied before tone mapping (so it behaves like a camera, not a filter). */
class ExposureEffect extends Effect {
  constructor() {
    super('ExposureEffect', /* glsl */ `
      uniform float uExposure;
      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        outputColor = vec4(inputColor.rgb * uExposure, inputColor.a);
      }`, { blendFunction: BlendFunction.NORMAL, uniforms: new Map([['uExposure', new THREE.Uniform(1)]]) });
  }
  set exposure(v) { this.uniforms.get('uExposure').value = v; }
  get exposure() { return this.uniforms.get('uExposure').value; }
}

/** "Cinematic indie" grade: teal shadows / warm highlights, punchy-but-not-garish saturation, soft S-curve. */
class GradeEffect extends Effect {
  constructor() {
    super('GradeEffect', /* glsl */ `
      uniform vec3 uShadow; uniform vec3 uHigh; uniform float uAmount, uSat, uContrast, uLift;
      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        vec3 c = inputColor.rgb;
        float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
        vec3 tint = mix(uShadow, uHigh, smoothstep(0.05, 0.8, l));
        c = mix(c, c * tint * 2.0, uAmount);                         // split toning
        float g = dot(c, vec3(0.2126, 0.7152, 0.0722));
        c = mix(vec3(g), c, uSat);                                   // saturation
        c = (c - 0.18) * uContrast + 0.18 + uLift;                   // contrast around mid grey
        outputColor = vec4(max(c, 0.0), inputColor.a);
      }`, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map([
        ['uShadow', new THREE.Uniform(new THREE.Color('#9fd8e6'))], ['uHigh', new THREE.Uniform(new THREE.Color('#ffe9c8'))],
        ['uAmount', new THREE.Uniform(0.45)], ['uSat', new THREE.Uniform(1.22)], ['uContrast', new THREE.Uniform(1.1)], ['uLift', new THREE.Uniform(0.0)],
      ]),
    });
  }
  u(name) { return this.uniforms.get(name); }
}

/**
 * Post-processing stack (pmndrs/postprocessing, HalfFloat HDR buffer, MSAA):
 *   scene -> exposure -> bloom -> ACES tone mapping -> [optional DoF] -> grade -> vignette/CA/grain -> screen
 * Tweakables live in `this.params` so lil-gui can bind to them.
 */
export class PostFX {
  constructor(renderer, scene, camera, { quality = 1 } = {}) {
    this.renderer = renderer; this.camera = camera;
    this.composer = new EffectComposer(renderer, {
      frameBufferType: THREE.HalfFloatType,
      multisampling: quality >= 1 ? 4 : 0,
      alpha: false, depthBuffer: true,
    });
    this.composer.addPass(new RenderPass(scene, camera));

    this.exposure = new ExposureEffect();
    this.bloom = new BloomEffect({ intensity: 0.55, luminanceThreshold: 1.6, luminanceSmoothing: 0.3, mipmapBlur: true, radius: 0.72, levels: 7 });
    this.tone = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC });
    this.dof = new DepthOfFieldEffect(camera, { focusDistance: 0.02, focalLength: 0.05, bokehScale: 2.2, resolutionScale: 0.5 });
    this.dof.blendMode.setBlendFunction(BlendFunction.SKIP);               // off by default (G -> Post -> DoF)
    this.grade = new GradeEffect();
    this.vignette = new VignetteEffect({ offset: 0.32, darkness: 0.5 });
    this.ca = new ChromaticAberrationEffect({ offset: new THREE.Vector2(0.0005, 0.0005), radialModulation: true, modulationOffset: 0.2 });
    this.grain = new NoiseEffect({ premultiply: true, blendFunction: BlendFunction.ADD }); this.grain.blendMode.opacity.value = 0.028;

    this.passA = new EffectPass(camera, this.exposure, this.bloom, this.tone);
    this.passDof = new EffectPass(camera, this.dof);
    this.passB = new EffectPass(camera, this.grade, this.vignette, this.ca, this.grain);
    this.composer.addPass(this.passA); this.composer.addPass(this.passDof); this.composer.addPass(this.passB);
    this.passDof.enabled = false;

    this.params = {
      exposure: 0.58, bloom: 0.5, bloomThreshold: 1.6, saturation: 1.22, contrast: 1.1, splitTone: 0.45,
      vignette: 0.5, aberration: 0.0005, grain: 0.028, dof: false, dofFocus: 4.0, dofBokeh: 2.2,
    };
  }

  /** push GUI values to the effects */
  apply() {
    const p = this.params;
    this.exposure.exposure = p.exposure * (this.autoExposure ?? 1);
    this.bloom.intensity = p.bloom; this.bloom.luminanceMaterial.threshold = p.bloomThreshold;
    this.grade.u('uSat').value = p.saturation; this.grade.u('uContrast').value = p.contrast; this.grade.u('uAmount').value = p.splitTone;
    this.vignette.darkness = p.vignette;
    this.ca.offset.set(p.aberration, p.aberration);
    this.grain.blendMode.opacity.value = p.grain;
    this.passDof.enabled = p.dof;
    this.dof.blendMode.setBlendFunction(p.dof ? BlendFunction.NORMAL : BlendFunction.SKIP);
    this.dof.cocMaterial.worldFocusDistance = p.dofFocus; this.dof.bokehScale = p.dofBokeh;
  }

  setSize(w, h) { this.composer.setSize(w, h); }
  render(dt) { this.composer.render(dt); }
}
