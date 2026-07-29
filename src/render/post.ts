// The image pipeline. Without this the hall is correctly lit and still looks
// flat, because nothing in the scene is allowed to glow: the sodium lamps, the
// beast's eye, the energy cells and the blaster tracers are all emissive and all
// rendered as plain bright pixels.
//
// Tier-aware by construction — phones get the composer's cheapest useful form or
// none at all, and the MSAA sample count comes from the tier rather than from the
// WebGL context (a context `antialias` flag is wasted under a composer, since it
// anti-aliases a buffer the composer never reads).
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import type { QualityTier } from "../controllers/quality/tier.ts";

/** Grade + vignette in one pass: push the image toward the key art's palette —
 *  cold shadows, warm sodium highlights — and darken the corners so the eye goes
 *  where the light is. */
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    amount: { value: 1.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float amount;
    varying vec2 vUv;
    void main() {
      vec4 src = texture2D(tDiffuse, vUv);
      vec3 c = src.rgb;

      // lift the shadows toward blue, carry the highlights toward sodium
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      vec3 shadowTint = vec3(0.84, 0.92, 1.10);
      vec3 highTint   = vec3(1.02, 0.99, 0.94);
      c *= mix(shadowTint, highTint, smoothstep(0.05, 0.6, l));

      // a little more contrast than the raw render, pivoted at mid grey
      c = (c - 0.5) * 1.07 + 0.5;

      // vignette
      vec2 d = vUv - 0.5;
      c *= 1.0 - smoothstep(0.40, 0.92, dot(d, d) * 2.0) * 0.42;

      gl_FragColor = vec4(mix(src.rgb, max(c, 0.0), amount), src.a);
    }
  `,
};

export interface Post {
  render(delta: number): void;
  setSize(w: number, h: number): void;
  /** The governor calls this when it needs the frame cheaper. */
  setEnabled(on: boolean): void;
  readonly active: boolean;
}

export function createPost(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  tier: QualityTier,
): Post {
  // 'off' means render straight to the screen — no composer allocated at all,
  // which is the point on a phone that cannot afford the extra targets.
  if (tier.postLevel === "off") {
    return {
      render: () => renderer.render(scene, camera),
      setSize: (w, h) => renderer.setSize(w, h),
      setEnabled: () => {},
      active: false,
    };
  }

  const size = new THREE.Vector2(window.innerWidth, window.innerHeight);
  const phone = tier.name === "phone" || tier.name === "phone-low";
  const target = new THREE.WebGLRenderTarget(size.x, size.y, {
    samples: tier.composerSamples,
    // Half-float buffers cost twice the memory of 8-bit ones. Desktop keeps them
    // because bloom wants headroom above white; the light post tier does not run
    // enough passes for banding to show, and on a phone the memory is the thing
    // that decides whether the page survives at all.
    type: phone ? THREE.UnsignedByteType : THREE.HalfFloatType,
  });
  const composer = new EffectComposer(renderer, target);
  // The composer allocates its OWN render targets and does not inherit the
  // renderer's cap — a phone at DPR 3 was getting full-resolution half-float
  // buffers no matter what the renderer was set to. This is most of the
  // difference between fitting the phone GPU budget and being killed by it.
  composer.setPixelRatio(Math.min(window.devicePixelRatio, tier.dprCap));
  composer.addPass(new RenderPass(scene, camera));

  // Bloom carries the whole mood: it is what turns the lamps into light sources
  // and the beast's eye into a thing you notice across a dark hall. Threshold
  // above the lit floor so surfaces do not smear — only genuine emitters bloom.
  const full = tier.postLevel === "full";
  composer.addPass(new UnrealBloomPass(size, full ? 0.38 : 0.24, full ? 0.5 : 0.4, 0.95));

  const grade = new ShaderPass(GradeShader);
  grade.uniforms.amount.value = full ? 1.0 : 0.6;
  composer.addPass(grade);

  composer.addPass(new OutputPass());

  let enabled = true;
  return {
    render: (delta) => (enabled ? composer.render(delta) : renderer.render(scene, camera)),
    setSize: (w, h) => {
      renderer.setSize(w, h);
      composer.setPixelRatio(Math.min(window.devicePixelRatio, tier.dprCap));
      composer.setSize(w, h);
    },
    setEnabled: (on) => { enabled = on; },
    get active() { return enabled; },
  };
}
