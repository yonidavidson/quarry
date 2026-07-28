// Genex adaptive-quality: per-tier asset variant selection (mobile-readiness
// program, Option A+D). Generated assets ship with GUARANTEED downscale rungs
// in R2 — sibling roles like "skybox-equirect@2048" — so phones can load a
// ~11 MB sky instead of the 8192x4096 original (~178 MB decoded). Desktop
// always loads the bare URL: the ladder exists so phones stop dying, never to
// make desktops uglier.
//
// FALLBACK CONTRACT: a rung can be missing (remixed old URLs, an environment
// whose backfill hasn't run). loadTextureWithFallback retries the bare URL on
// a rung failure, so the worst case is today's behavior — never a broken boot.
import type { QualityTier } from './tier.ts';

// Host-agnostic on purpose: each stand serves generated assets from its own
// domain (prod assets.genex.technology, dev assets.auras.cc), and baking one
// host in would silently disable the whole ladder everywhere else — the
// fallback contract makes a false positive harmless (404 rung -> warn ->
// original), so the path shape is the only thing worth matching.
const GENEX_GENERATIONS_RE = /^https:\/\/[^/]+\/generations\/[^/]+\/[^/@]+$/;

/** Rung widths by role family — mirrors the server's ladder (store.ts MOBILE_RUNGS). */
function rungWidthFor(url: string, tier: QualityTier): number | null {
  if (tier.name !== 'phone' && tier.name !== 'phone-low') return null;
  const role = url.split('/').pop() ?? '';
  if (role === 'skybox-equirect') return tier.name === 'phone-low' ? 2048 : 4096;
  if (role === 'texture-basecolor' || role === 'image-main' || /^image-alt-\d+$/.test(role)) {
    return tier.name === 'phone-low' ? 1024 : 2048;
  }
  return null;
}

/**
 * Resolve the URL a THIS-tier device should load. Non-generated URLs and
 * desktop tiers pass through untouched; phone tiers get the rung sibling.
 */
export function pickAsset(url: string, tier: QualityTier): string {
  if (!GENEX_GENERATIONS_RE.test(url)) return url;
  const width = rungWidthFor(url, tier);
  return width ? `${url}@${width}` : url;
}

/**
 * Load an image URL through the ladder with the bare-URL fallback. Use it for
 * generated skyboxes/textures instead of raw TextureLoader.loadAsync:
 *
 *   const texture = await loadTextureWithFallback(
 *     SKYBOX_URL, tier, (u) => new THREE.TextureLoader().loadAsync(u),
 *   );
 *
 * KTX2-capable games (createGltfLoader with a renderer) can pass `ktx2Load` —
 * on phone tiers the `.ktx2` capability sibling is tried FIRST (textures stay
 * compressed on the GPU, ~6x less VRAM), then the browser-decodable rung,
 * then the original. Every fallback warns: silent degradation hides real
 * pipeline gaps.
 */
export async function loadTextureWithFallback<T>(
  url: string,
  tier: QualityTier,
  load: (resolvedUrl: string) => Promise<T>,
  opts?: { ktx2Load?: (resolvedUrl: string) => Promise<T> },
): Promise<T> {
  const picked = pickAsset(url, tier);
  if (picked !== url && opts?.ktx2Load) {
    try {
      return await opts.ktx2Load(`${picked}.ktx2`);
    } catch {
      console.warn(`[genex-quality] ktx2 variant missing for ${picked} — using the browser-decodable rung`);
    }
  }
  if (picked === url) return load(url);
  try {
    return await load(picked);
  } catch {
    // Missing rung (old asset, un-backfilled env) — degrade to the original.
    console.warn(`[genex-quality] rung missing for ${url} — loading the original`);
    return load(url);
  }
}

// ---------------------------------------------------------------------------
// Generated MODELS (mesh-compression lane). GLB rungs use the same numeric
// suffix — `model-glb@1024` = embedded textures ≤1024 + meshopt (+simplify) —
// but unlike images there is NO edge rewrite for old games: selection happens
// ONLY here, in games that wired the decoders (createGltfLoader). EVERY tier
// loads a game-ready rung — provider-raw originals are archival/remix source,
// not game assets (a Tripo prop is ~500k tris + 3x4096² textures; a scene of
// them floored an M4 Max). Desktop gets @2048, phones @1024; the original is
// only ever the fallback of last resort.

/** Per-tier texture budget: desktop tiers @2048, phone tiers @1024. */
function modelBudgetFor(tier: QualityTier): number {
  return tier.name === "phone" || tier.name === "phone-low" ? 1024 : 2048;
}
const MODEL_ROLE_RE = /^(model-glb|character-rigged(-a\d+)?-glb(-r\d+)?)$/;

/** Resolve the model URL a THIS-tier device should load. `ktx2: true` (from
 *  createGltfLoader) upgrades to the GPU-compressed sibling. */
export function pickModel(url: string, tier: QualityTier, opts?: { ktx2?: boolean }): string {
  if (!GENEX_GENERATIONS_RE.test(url)) return url;
  const role = url.split("/").pop() ?? "";
  if (!MODEL_ROLE_RE.test(role)) return url;
  const rung = `${url}@${modelBudgetFor(tier)}`;
  return opts?.ktx2 ? `${rung}.ktx2` : rung;
}

/**
 * Load a generated model through the rung ladder with the full fallback chain
 * (`.ktx2` → the tier's rung → original). Use with the decoder-wired loader:
 *
 *   const gltf = createGltfLoader(renderer);
 *   const model = await loadModelWithFallback(MODEL_URL, tier, (u) => gltf.loader.loadAsync(u), { ktx2: gltf.ktx2 });
 *
 * The worst case is today's behavior (the full original) — never a broken boot.
 */
export async function loadModelWithFallback<T>(
  url: string,
  tier: QualityTier,
  load: (resolvedUrl: string) => Promise<T>,
  opts?: { ktx2?: boolean },
): Promise<T> {
  const withKtx2 = pickModel(url, tier, opts);
  const universal = pickModel(url, tier, { ktx2: false });
  if (withKtx2 !== universal) {
    try {
      return await load(withKtx2);
    } catch {
      console.warn(`[genex-quality] ktx2 model rung missing for ${url} — trying the universal rung`);
    }
  }
  if (universal === url) return load(url);
  try {
    return await load(universal);
  } catch {
    console.warn(`[genex-quality] model rung missing for ${url} — loading the original`);
    return load(url);
  }
}
