// A soft round particle sprite, drawn once at runtime.
//
// A PointsMaterial with no map draws every point as an opaque camera-facing
// SQUARE. At small sizes that reads as noise, but the steam vents use 0.9-unit
// points and they were unmistakably little grey boxes — the one thing in the
// hall that looked authored rather than real. A radial alpha falloff costs one
// canvas and nothing per frame, and it is what makes additive particles read as
// light and vapour instead of confetti.
import * as THREE from "three";

let cached: THREE.Texture | null = null;

export function softDot(): THREE.Texture {
  if (cached) return cached;
  const size = 64;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  // held bright through the middle, then eased out — a linear ramp looks hollow
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.85)");
  g.addColorStop(0.7, "rgba(255,255,255,0.22)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  cached = new THREE.CanvasTexture(c);
  cached.colorSpace = THREE.SRGBColorSpace;
  return cached;
}
