// Procedural temple stone — the TEMPORARY rung under #100.
//
// The art target (docs/reference/art-target-temple.png) is sculpted sandstone:
// carved blocks, glyph panels, skull friezes, moss in every joint. The generated
// texture set that replaces this is blocked on the Aug 4 credit refill, so these
// are drawn in code — seamless canvas tiles with a matching height channel, so
// the relief the reference lives on is real (bump-lit) rather than painted flat.
//
// When the generated set lands, swap the `map`/`bumpMap` on the materials in
// complex.ts and delete this file. Nothing else depends on it.
import * as THREE from "three";

/** Two canvases painted in lockstep: albedo, and the height that lights it. */
type Paint = (a: CanvasRenderingContext2D, h: CanvasRenderingContext2D, S: number) => void;

function ctx(size: number): CanvasRenderingContext2D {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  if (!g) throw new Error("2d context unavailable");
  return g;
}

/** A tiny deterministic PRNG, so a wall looks the same every load. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Draw once, land on all nine wrap positions — this is what makes it seamless. */
function wrapped(g: CanvasRenderingContext2D, S: number, draw: () => void): void {
  for (const dx of [-S, 0, S]) {
    for (const dy of [-S, 0, S]) {
      g.save();
      g.translate(dx, dy);
      draw();
      g.restore();
    }
  }
}

export interface StoneMaps { map: THREE.Texture; bumpMap: THREE.Texture }

function bake(size: number, paint: Paint, repeat: number): StoneMaps {
  const a = ctx(size);
  const h = ctx(size);
  paint(a, h, size);
  const map = new THREE.CanvasTexture(a.canvas);
  const bumpMap = new THREE.CanvasTexture(h.canvas);
  for (const t of [map, bumpMap]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat, repeat);
    t.anisotropy = 8;
  }
  map.colorSpace = THREE.SRGBColorSpace;
  return { map, bumpMap };
}

/** Grit, pitting and sun-bleach — the thing that stops flat fills reading as plastic. */
function grain(a: CanvasRenderingContext2D, h: CanvasRenderingContext2D, S: number, r: () => number, n = 5200): void {
  for (let i = 0; i < n; i++) {
    const x = r() * S, y = r() * S, s = 0.6 + r() * 2.4;
    const v = r();
    a.fillStyle = v > 0.5 ? `rgba(255,246,222,${0.05 + r() * 0.10})` : `rgba(58,40,24,${0.05 + r() * 0.12})`;
    a.fillRect(x, y, s, s);
    h.fillStyle = v > 0.5 ? `rgba(255,255,255,${0.10})` : `rgba(0,0,0,${0.12})`;
    h.fillRect(x, y, s, s);
  }
}

/** Moss creeping out of the joints. The reference is never clean stone — but it
 *  is never GREEN stone either: this is a tint in the shade, not a coat. */
function moss(a: CanvasRenderingContext2D, S: number, r: () => number, amount: number): void {
  for (let i = 0; i < amount; i++) {
    const x = r() * S, y = r() * S, rad = S * (0.015 + r() * 0.035);
    const g = a.createRadialGradient(x, y, 0, x, y, rad);
    const dark = r() > 0.5;
    g.addColorStop(0, dark ? "rgba(84,96,62,0.22)" : "rgba(112,116,80,0.16)");
    g.addColorStop(1, "rgba(100,106,70,0)");
    a.fillStyle = g;
    wrapped(a, S, () => { a.beginPath(); a.arc(x, y, rad, 0, Math.PI * 2); a.fill(); });
  }
}

/** Coursed sandstone blocks: the base vocabulary every temple surface is cut from. */
function courses(
  a: CanvasRenderingContext2D, h: CanvasRenderingContext2D, S: number,
  rows: number, cols: number, seed: number,
  face: (g: CanvasRenderingContext2D, hg: CanvasRenderingContext2D, x: number, y: number, w: number, ht: number, r: () => number) => void,
): void {
  const r = rng(seed);
  const bh = S / rows, bw = S / cols;
  a.fillStyle = "#6d5537"; a.fillRect(0, 0, S, S);   // mortar / deep joint
  h.fillStyle = "#3a3a3a"; h.fillRect(0, 0, S, S);   // joints sit low
  const j = Math.max(2, S / 220);                     // joint width

  for (let row = 0; row < rows; row++) {
    const y = row * bh;
    const stagger = (row % 2) * bw * 0.5;
    for (let col = -1; col < cols + 1; col++) {
      const x = col * bw + stagger;
      const shade = 0.86 + r() * 0.28;
      const base = [201, 169, 120].map((c) => Math.min(255, Math.round(c * shade)));
      wrapped(a, S, () => {
        a.fillStyle = `rgb(${base[0]},${base[1]},${base[2]})`;
        a.fillRect(x + j, y + j, bw - j * 2, bh - j * 2);
        // a lit top chamfer and a shaded bottom one — carved edge, not a sticker
        a.fillStyle = "rgba(255,240,206,0.30)";
        a.fillRect(x + j, y + j, bw - j * 2, Math.max(1, bh * 0.06));
        a.fillStyle = "rgba(52,36,20,0.32)";
        a.fillRect(x + j, y + bh - j - Math.max(1, bh * 0.07), bw - j * 2, Math.max(1, bh * 0.07));
      });
      wrapped(h, S, () => {
        h.fillStyle = `rgb(${190 + Math.round(r() * 24)},${190},${190})`;
        h.fillRect(x + j, y + j, bw - j * 2, bh - j * 2);
      });
      wrapped(a, S, () => face(a, h, x + j, y + j, bw - j * 2, bh - j * 2, r));
      wrapped(h, S, () => face(h, h, x + j, y + j, bw - j * 2, bh - j * 2, r));
    }
  }
  grain(a, h, S, r);
  moss(a, S, r, 7);
}

/** Plain coursed wall — the temple's default surface. */
export function templeWall(size = 512, repeat = 6): StoneMaps {
  return bake(size, (a, h, S) => {
    courses(a, h, S, 6, 4, 1337, (g, _hg, x, y, w, ht, r) => {
      // a chipped corner on some blocks; ruins are not square
      if (r() > 0.72) {
        const cw = w * (0.12 + r() * 0.18), ch = ht * (0.18 + r() * 0.3);
        g.fillStyle = g === a ? "rgba(74,54,30,0.45)" : "rgba(90,90,90,1)";
        g.fillRect(x + (r() > 0.5 ? w - cw : 0), y + (r() > 0.5 ? ht - ch : 0), cw, ch);
      }
    });
  }, repeat);
}

/** Glyph panels — the carved relief from the reference's top-left frame.
 *
 *  #103 — the first version drew a stroked rectangle with two or three round
 *  marks floating inside it, which is precisely what a power socket looks like,
 *  and the walls read as a substation. Fixed by taking away what made it read
 *  that way: no border rectangle, no bare circles, and the carving now runs
 *  edge-to-edge in bands instead of floating in the middle of a faceplate.
 *  Mesoamerican relief is dense and it touches its own frame. */
export function glyphWall(size = 512, repeat = 4): StoneMaps {
  return bake(size, (a, h, S) => {
    courses(a, h, S, 4, 3, 90210, (g, _hg, x, y, w, ht, r) => {
      if (r() > 0.55) return;                       // not every block is carved
      const carved = g === a ? "rgba(66,46,25,0.62)" : "rgba(64,64,64,1)";
      const lit = g === a ? "rgba(255,240,208,0.32)" : "rgba(255,255,255,0.45)";
      const cut = Math.max(2, w * 0.035);

      /** A step-fret: the interlocking key meander that says Mesoamerica at a
       *  glance and cannot be mistaken for anything electrical. */
      const fret = (fx: number, fy: number, fw: number, fh: number, flip: number): void => {
        g.fillStyle = carved;
        g.fillRect(fx, fy + (flip > 0 ? 0 : fh - cut), fw, cut);          // long rail
        g.fillRect(fx + fw - cut, fy, cut, fh);                            // riser
        g.fillRect(fx + fw * 0.3, fy + fh * 0.35, fw * 0.42, cut);         // inner tongue
        g.fillRect(fx + fw * 0.3, fy + fh * 0.35, cut, fh * 0.4 * flip || cut);
        g.fillStyle = lit;
        g.fillRect(fx, fy + (flip > 0 ? -cut * 0.5 : fh - cut * 1.5), fw, Math.max(1, cut * 0.5));
      };

      /** A stacked cartouche column — glyph cells butted against each other. */
      const column = (cx: number, cy: number, cw: number, chh: number): void => {
        const cells = 2 + Math.floor(r() * 2);
        const cellH = chh / cells;
        for (let i = 0; i < cells; i++) {
          const yy = cy + i * cellH;
          g.fillStyle = carved;
          g.fillRect(cx, yy, cw, cut);                                     // cell divider
          // a blocky profile mark inside the cell: brow, muzzle, jaw
          const bx = cx + cw * 0.18, by = yy + cellH * 0.28;
          g.fillRect(bx, by, cw * 0.5, cut);
          g.fillRect(bx, by, cut, cellH * 0.34);
          g.fillRect(bx + cw * 0.34, by + cellH * 0.16, cw * 0.3, cut);
          g.fillStyle = lit;
          g.fillRect(cx, yy - Math.max(1, cut * 0.5), cw, Math.max(1, cut * 0.5));
        }
      };

      // Bands, edge to edge — the block is the frame, so no border is drawn.
      const bands = 2 + Math.floor(r() * 2);
      const bandH = ht / bands;
      for (let i = 0; i < bands; i++) {
        const by = y + i * bandH;
        if (r() > 0.45) {
          const runs = 2 + Math.floor(r() * 2);
          const runW = w / runs;
          for (let k = 0; k < runs; k++) {
            fret(x + k * runW, by + bandH * 0.12, runW * 0.94, bandH * 0.76, k % 2 ? 1 : -1);
          }
        } else {
          const cols = 2 + Math.floor(r() * 2);
          const colW = w / cols;
          for (let k = 0; k < cols; k++) {
            column(x + k * colW + colW * 0.06, by + bandH * 0.1, colW * 0.88, bandH * 0.8);
          }
        }
      }
    });
  }, repeat);
}

/** The skull frieze — straight off the reference's bottom-right panel. */
export function skullFrieze(size = 512, repeat = 3): StoneMaps {
  return bake(size, (a, h, S) => {
    courses(a, h, S, 4, 4, 4242, (g, _hg, x, y, w, ht, r) => {
      const cx = x + w / 2, cy = y + ht * 0.52;
      const rw = w * 0.30, rh = ht * 0.30;
      const bone = g === a ? "rgba(226,205,166,0.95)" : "rgba(236,236,236,1)";
      const hole = g === a ? "rgba(44,30,16,0.88)" : "rgba(26,26,26,1)";
      // cranium
      g.fillStyle = bone;
      g.beginPath(); g.ellipse(cx, cy - rh * 0.18, rw, rh, 0, 0, Math.PI * 2); g.fill();
      // jaw
      g.beginPath(); g.ellipse(cx, cy + rh * 0.72, rw * 0.62, rh * 0.42, 0, 0, Math.PI * 2); g.fill();
      // sockets + nose
      g.fillStyle = hole;
      g.beginPath(); g.ellipse(cx - rw * 0.42, cy - rh * 0.24, rw * 0.28, rh * 0.30, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(cx + rw * 0.42, cy - rh * 0.24, rw * 0.28, rh * 0.30, 0, 0, Math.PI * 2); g.fill();
      g.beginPath();
      g.moveTo(cx, cy + rh * 0.06); g.lineTo(cx - rw * 0.16, cy + rh * 0.40); g.lineTo(cx + rw * 0.16, cy + rh * 0.40);
      g.closePath(); g.fill();
      // teeth
      for (let i = -2; i <= 2; i++) g.fillRect(cx + i * rw * 0.20 - rw * 0.05, cy + rh * 0.56, rw * 0.10, rh * 0.30);
      void r;
    });
  }, repeat);
}

/** Broken flagstones underfoot — irregular slabs, moss in the cracks. */
export function templeFloor(size = 512, repeat = 26): StoneMaps {
  return bake(size, (a, h, S) => {
    const r = rng(777);
    a.fillStyle = "#5f4c31"; a.fillRect(0, 0, S, S);
    h.fillStyle = "#3c3c3c"; h.fillRect(0, 0, S, S);
    const n = 5, cell = S / n, j = S / 180;
    for (let gy = 0; gy < n; gy++) {
      for (let gx = 0; gx < n; gx++) {
        // jittered quad — flagstones are cut by hand, not by a grid
        const p = (dx: number, dy: number): [number, number] => [
          (gx + dx) * cell + (r() - 0.5) * cell * 0.16,
          (gy + dy) * cell + (r() - 0.5) * cell * 0.16,
        ];
        const pts = [p(0, 0), p(1, 0), p(1, 1), p(0, 1)];
        const shade = 0.84 + r() * 0.3;
        const c = [186, 160, 118].map((v) => Math.min(255, Math.round(v * shade)));
        const path = (g: CanvasRenderingContext2D) => {
          g.beginPath();
          g.moveTo(pts[0][0] + j, pts[0][1] + j);
          for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0] - j, pts[i][1] - j);
          g.closePath(); g.fill();
        };
        wrapped(a, S, () => { a.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`; path(a); });
        wrapped(h, S, () => { h.fillStyle = `rgb(${186 + Math.round(r() * 30)},190,190)`; path(h); });
      }
    }
    grain(a, h, S, r, 7000);
    moss(a, S, r, 20);
  }, repeat);
}

/** Cut step / ledge stone — cleaner, for stairs, ledges and altar faces. */
export function stepStone(size = 512, repeat = 4): StoneMaps {
  return bake(size, (a, h, S) => {
    courses(a, h, S, 3, 2, 5150, (g, _hg, x, y, w, ht, r) => {
      if (r() > 0.6) return;
      g.fillStyle = g === a ? "rgba(255,242,210,0.18)" : "rgba(255,255,255,0.22)";
      g.fillRect(x, y, w, ht * 0.22);
    });
  }, repeat);
}
