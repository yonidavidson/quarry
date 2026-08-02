// The sky over the ruins — the TEMPORARY rung under #100, same deal as stone.ts.
//
// The generated skybox (jungle canopy, distant step pyramids, midday sun) is
// blocked on the Aug 4 credit refill. Until it lands this paints an equirect
// panorama in code and runs it through PMREM, which matters for more than the
// backdrop: it is the environment map, and it is what gives sunlit sandstone and
// gold a real image-based response instead of the dead metal #86 complains about.
import * as THREE from "three";

/** Where the sun sits in the sky — the directional key is aimed to match. */
export const SUN_DIR = new THREE.Vector3(0.46, 0.68, 0.32).normalize();

function uvOf(dir: THREE.Vector3, w: number, h: number): [number, number] {
  const u = 0.5 + Math.atan2(dir.x, -dir.z) / (Math.PI * 2);
  const v = 0.5 - Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1)) / Math.PI;
  return [u * w, v * h];
}

/** A ragged canopy/ruin skyline across the horizon band. */
function skyline(g: CanvasRenderingContext2D, W: number, H: number): void {
  const horizon = H * 0.5;
  let s = 20250802;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);

  // distant step pyramids, hazed back so they read as far away
  g.fillStyle = "rgba(126,138,120,0.55)";
  for (let i = 0; i < 7; i++) {
    const cx = rnd() * W, base = horizon + H * 0.012;
    const bw = W * (0.045 + rnd() * 0.05), ph = H * (0.045 + rnd() * 0.055);
    const tiers = 4;
    for (let t = 0; t < tiers; t++) {
      const f = 1 - t / tiers;
      g.fillRect(cx - (bw * f) / 2, base - (ph * (t + 1)) / tiers, bw * f, ph / tiers + 1);
    }
  }

  // the canopy itself — overlapping crowns, near ones darker and greener
  for (const [layer, alpha, tint, lift] of [
    [0, 0.55, "90,118,74", 0.055],
    [1, 0.8, "58,88,46", 0.032],
    [2, 1.0, "36,62,32", 0.0],
  ] as Array<[number, number, string, number]>) {
    g.fillStyle = `rgba(${tint},${alpha})`;
    const crowns = 90 + layer * 60;
    for (let i = 0; i < crowns; i++) {
      const x = rnd() * W;
      const y = horizon + H * lift + rnd() * H * 0.02;
      const r = H * (0.014 + rnd() * 0.030) * (1 + layer * 0.35);
      g.beginPath();
      g.ellipse(x, y, r * 1.5, r, 0, 0, Math.PI * 2);
      g.fill();
    }
  }

  // Ground below the canopy — out of sight, but NOT irrelevant: it is half the
  // environment map, so a saturated jungle green here tints every downward stone
  // face olive. Kept deliberately desaturated and warm-leaning.
  const below = g.createLinearGradient(0, horizon + H * 0.08, 0, H);
  below.addColorStop(0, "#4a4a38");
  below.addColorStop(1, "#3a3628");
  g.fillStyle = below;
  g.fillRect(0, horizon + H * 0.06, W, H);
}

export interface SkyResult { background: THREE.Texture; environment: THREE.Texture }

/** Paint the panorama and prefilter it. Call once, at world build. */
export function buildSky(renderer: THREE.WebGLRenderer): SkyResult {
  const W = 2048, H = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const g = canvas.getContext("2d");
  if (!g) throw new Error("2d context unavailable");

  // zenith → horizon: deep tropical blue burning out to white haze at the rim
  const sky = g.createLinearGradient(0, 0, 0, H * 0.5);
  sky.addColorStop(0.0, "#2f7ad4");
  sky.addColorStop(0.55, "#78b6e8");
  sky.addColorStop(1.0, "#dfe6dd");
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H * 0.5 + 2);

  // the sun, and the wide bloom around it that sells midday
  const [sx, sy] = uvOf(SUN_DIR, W, H);
  const halo = g.createRadialGradient(sx, sy, 0, sx, sy, W * 0.22);
  halo.addColorStop(0.0, "rgba(255,250,226,1)");
  halo.addColorStop(0.06, "rgba(255,236,186,0.85)");
  halo.addColorStop(0.35, "rgba(255,222,168,0.20)");
  halo.addColorStop(1.0, "rgba(255,220,170,0)");
  g.fillStyle = halo;
  g.fillRect(0, 0, W, H);
  g.fillStyle = "#fffdf2";
  g.beginPath(); g.arc(sx, sy, W * 0.012, 0, Math.PI * 2); g.fill();

  // a few soft cumulus, so the sky is not a flat wash under the roof holes
  let s = 7;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 26; i++) {
    const x = rnd() * W, y = rnd() * H * 0.42, r = H * (0.02 + rnd() * 0.05);
    const c = g.createRadialGradient(x, y, 0, x, y, r);
    c.addColorStop(0, "rgba(255,255,255,0.75)");
    c.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = c;
    g.beginPath(); g.ellipse(x, y, r * 2.0, r, 0, 0, Math.PI * 2); g.fill();
  }

  skyline(g, W, H);

  const tex = new THREE.CanvasTexture(canvas);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const env = pmrem.fromEquirectangular(tex).texture;
  pmrem.dispose();

  return { background: tex, environment: env };
}
