// Genex adaptive-quality: device-tier detection (mobile-readiness program).
// Boot-conservative by design — on phones you can recover from ugly, you
// cannot recover from a jetsam kill, and boot is exactly when iOS kills. The
// governor (governor.ts) steps quality UP after smooth seconds, so a
// too-cautious start costs moments of softness, never a crash.
//
// Detection honesty: no single signal is trustworthy. iOS masks the WebGL
// renderer string to "Apple GPU" (screen+DPR+OS-version is the real Apple
// signal); Android exposes detailed renderer strings (Adreno/Mali) worth a
// small lookup; the runtime governor measures actual frame times and corrects
// both directions. All heuristics here only pick the STARTING tier.

export type TierName = 'phone-low' | 'phone' | 'desktop-low' | 'desktop' | 'desktop-high';

export interface QualityTier {
  name: TierName;
  /** Cap for renderer.setPixelRatio(Math.min(devicePixelRatio, dprCap)). */
  dprCap: number;
  /** WebGL context antialias (context-creation-FIXED — cannot change live). */
  antialias: boolean;
  /** Directional/spot shadow map size (0 = shadows off). */
  shadowMapSize: number;
  /** 'off' = tone mapping only; 'light' = +FXAA/vignette; 'full' = the named stack. */
  postLevel: 'off' | 'light' | 'full';
  /** Multiplier for particle counts / scatter density. */
  particleScale: number;
  /** Multiplier for draw distance / fog far. */
  drawDistanceScale: number;
  /** Frame target — phones pace to a STABLE 30 over a stuttery 45. */
  frameCap: number;
  /** Max remote players fully animated/drawn (multiplayer); rest billboard. */
  remoteAvatarCap: number;
  /** MSAA samples for the EffectComposer's render target. Context `antialias`
   *  is ~wasted under a composer (it MSAAs a buffer the composer never reads)
   *  — AA under post comes from `new EffectComposer(renderer, new
   *  THREE.WebGLRenderTarget(w, h, { samples: tier.composerSamples }))`.
   *  See rendererAntialias() for the context flag itself. */
  composerSamples: number;
}

export const TIERS: Record<TierName, QualityTier> = {
  'phone-low': {
    name: 'phone-low',
    dprCap: 1,
    antialias: false,
    shadowMapSize: 512,
    postLevel: 'off',
    particleScale: 0.25,
    drawDistanceScale: 0.5,
    frameCap: 30,
    remoteAvatarCap: 4,
    composerSamples: 0,
  },
  phone: {
    name: 'phone',
    dprCap: 1.5,
    antialias: false,
    shadowMapSize: 1024,
    postLevel: 'light',
    particleScale: 0.5,
    drawDistanceScale: 0.75,
    frameCap: 60,
    remoteAvatarCap: 8,
    composerSamples: 0,
  },
  // Weak desktops (Intel iGPU MacBooks, old integrated AMD): the full desktop
  // path — DPR 2 + 4x MSAA + 2048 PCFSoft shadows + full bloom — is a
  // slideshow there, and the governor can't rescue context-locked MSAA. The
  // Quality picker still overrides (a player can force High).
  'desktop-low': {
    name: 'desktop-low',
    dprCap: 1.5,
    antialias: false,
    shadowMapSize: 1024,
    postLevel: 'light',
    particleScale: 0.75,
    drawDistanceScale: 1,
    frameCap: 60,
    remoteAvatarCap: 64,
    composerSamples: 0,
  },
  desktop: {
    name: 'desktop',
    dprCap: 2,
    antialias: true,
    shadowMapSize: 2048,
    postLevel: 'full',
    particleScale: 1,
    drawDistanceScale: 1,
    frameCap: 60,
    remoteAvatarCap: 64,
    composerSamples: 4,
  },
  'desktop-high': {
    name: 'desktop-high',
    dprCap: 2,
    antialias: true,
    shadowMapSize: 2048,
    postLevel: 'full',
    particleScale: 1,
    drawDistanceScale: 1,
    frameCap: 240,
    remoteAvatarCap: 64,
    composerSamples: 4,
  },
};

/**
 * The context `antialias` flag a game should ACTUALLY construct with. Context
 * MSAA only benefits games that render straight to the canvas — under an
 * EffectComposer it multisamples a buffer the composer never reads (pure
 * memory/fill waste, the classic weak-MacBook lag recipe). Post games get
 * their AA from `tier.composerSamples` on the composer's render target
 * instead; a post-waived desktop game keeps real MSAA.
 */
export function rendererAntialias(tier: QualityTier, willRunPost: boolean): boolean {
  return tier.antialias && !willRunPost;
}

/** Quality setting persisted PER DEVICE (localStorage) — quality is a property
 *  of the phone, not the player, so it deliberately does not ride account
 *  state. 'auto' = heuristics + governor. */
const SETTING_KEY = 'genex:quality';
export type QualitySetting = 'auto' | 'low' | 'medium' | 'high';

export function getQualitySetting(): QualitySetting {
  try {
    const v = localStorage.getItem(SETTING_KEY);
    if (v === 'low' || v === 'medium' || v === 'high') return v;
  } catch {
    /* storage blocked */
  }
  return 'auto';
}

export function setQualitySetting(v: QualitySetting): void {
  try {
    localStorage.setItem(SETTING_KEY, v);
  } catch {
    /* storage blocked */
  }
}

function isTouchDevice(): boolean {
  try {
    const coarse = matchMedia('(pointer: coarse)').matches;
    const touch = navigator.maxTouchPoints > 1;
    const nav = navigator as Navigator & { userAgentData?: { mobile?: boolean } };
    const mobileUA = nav.userAgentData
      ? !!nav.userAgentData.mobile
      : /Mobi|Android/i.test(navigator.userAgent);
    return (touch && coarse) || mobileUA;
  } catch {
    return false;
  }
}

/** Android GPU model → strong-enough-for-'phone' (vs 'phone-low'). Tiny,
 *  vendored on purpose (no detect-gpu dependency): renderer strings are only
 *  meaningful on Android/desktop anyway, and the governor corrects mistakes. */
const STRONG_ANDROID_GPU = /Adreno \(TM\) [67]\d\d|Adreno \(TM\) 8|Mali-G7[18]|Mali-G[89]\d|Immortalis|Xclipse/i;

/** Weak DESKTOP GPUs (unmasked on desktop, unlike iOS): Intel HD/UHD/pre-Xe
 *  Iris iGPUs and old integrated AMD — the machines the full desktop path
 *  (DPR 2 + MSAA + 2048 shadows + full bloom) turns into a slideshow.
 *  Trademark tokens vary by driver era — "Iris(R) Xe" / "Iris Xe" and
 *  "Radeon(TM)" / "Radeon (TM)" all occur in real renderer strings — so the
 *  Xe exclusion and the AMD prefix both tolerate them. */
const WEAK_DESKTOP_GPU = /Intel(\(R\))? (HD|UHD|Iris(?! ?(\((R|TM)\) ?)?Xe))|GMA |Radeon ?(\(TM\))? (R[2-5]|Vega [23]) Graphics|SwiftShader|llvmpipe|Software/i;

/** One boot-time probe context, freed immediately — never at play time. */
function probeGpuRenderer(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return '';
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
    const ext = gl.getExtension('WEBGL_lose_context');
    if (ext) ext.loseContext(); // free the probe context immediately
    return renderer;
  } catch {
    return '';
  }
}

function androidGpuLooksStrong(): boolean {
  return STRONG_ANDROID_GPU.test(probeGpuRenderer());
}

/**
 * Pick the STARTING tier. Manual setting wins; 'auto' uses heuristics:
 * - non-touch → desktop
 * - touch: old OS or small memory signals → phone-low; strong/new → phone
 * The kit may have clamped devicePixelRatio — prefer its pristine stash.
 */
export function detectTier(): QualityTier {
  const setting = getQualitySetting();
  if (setting === 'low') return TIERS['phone-low'];
  if (setting === 'medium') return TIERS.phone;
  if (setting === 'high') return TIERS.desktop;

  if (!isTouchDevice()) {
    // Weak-desktop demotion: a 2015 Intel Air and an M3 Max are not the same
    // machine. Desktop renderer strings are unmasked (unlike iOS), so one
    // boot probe separates them; the Quality picker still overrides either way.
    return WEAK_DESKTOP_GPU.test(probeGpuRenderer()) ? TIERS['desktop-low'] : TIERS.desktop;
  }

  const ua = navigator.userAgent;
  const kit = (window as Window & { __GENEX_KIT__?: { realDpr?: number } }).__GENEX_KIT__;
  const dpr = kit?.realDpr ?? window.devicePixelRatio;
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.maxTouchPoints > 1 && /Mac/.test(ua));

  if (isIOS) {
    // iOS version floors device age (iOS 17 ⇒ XS/2018+; screen+DPR refine).
    const m = ua.match(/OS (\d+)_/);
    const major = m ? Number(m[1]) : 0;
    if (major >= 17) return TIERS.phone;
    return TIERS['phone-low'];
  }
  const am = ua.match(/Android (\d+)/);
  const androidMajor = am ? Number(am[1]) : 0;
  if (androidMajor >= 13 && (dpr >= 2.5 || androidGpuLooksStrong())) return TIERS.phone;
  return TIERS['phone-low'];
}
