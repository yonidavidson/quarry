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

/** Grade + vignette in one pass: push the image toward the art target's palette
 *  (#100) — jungle-green shade, hot ochre sun — and darken the corners a little
 *  so the eye goes where the light is. */
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

      // shade takes the sky (cool, faintly blue), sun goes ochre. It must NOT
      // take the canopy's green — that turned the whole ruin olive.
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      vec3 shadowTint = vec3(0.95, 0.97, 1.04);
      vec3 highTint   = vec3(1.09, 1.02, 0.88);
      c *= mix(shadowTint, highTint, smoothstep(0.04, 0.55, l));

      // the reference is punchy — more contrast, and saturation the old dark
      // grade could not afford
      c = (c - 0.46) * 1.08 + 0.46;
      float g = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(g), c, 1.10);

      // a light vignette only: a bright exterior scene should not tunnel
      vec2 d = vUv - 0.5;
      c *= 1.0 - smoothstep(0.45, 0.98, dot(d, d) * 2.0) * 0.26;

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

  // Bloom picks out the sun shafts, the braziers, the gold and the tracers.
  // #100 — the threshold is HIGH now: under a midday sun, sunlit sandstone is
  // already near white, and a dark-room threshold smears the entire hall into
  // haze. Only things brighter than lit stone are allowed to glow.
  const full = tier.postLevel === "full";
  composer.addPass(new UnrealBloomPass(size, full ? 0.30 : 0.20, full ? 0.62 : 0.45, 1.15));

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
