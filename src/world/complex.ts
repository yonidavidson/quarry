// One floor of the ruin: the great hall, the ledge ring, the burial chamber and
// the gate. Every solid here is both a mesh and a static Rapier collider, built
// from one list, so the walkable shape and the visible shape can never drift.
//
// #100 — this was an industrial machine hall until the art target moved to the
// temple reference (docs/reference/art-target-temple.png). The FOOTPRINTS are
// deliberately unchanged: the machine blocks became stepped altars in the same
// places, the catwalk ring became a stone ledge at the same height, so every
// sightline, patrol path and cling surface the hunt was tuned around survives
// the reskin. What changed is what the room is made of and how it is lit.
import * as THREE from "three";
import type { PhysicsWorld } from "../controllers/shared/physics-world.ts";
import { cuboidCollider } from "../controllers/shared/colliders.ts";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { templeWall, glyphWall, skullFrieze, templeFloor, stepStone } from "./stone.ts";
import { buildSky, SUN_DIR } from "./sky.ts";
import { detectTier } from "../controllers/quality/tier.ts";

/** Interior bounds, metres. Matches DESIGN.md → World & scale. */
// wallH was 14 and the walls read as low — a hall you could see over rather than
// a ruin you are inside. At 21 the perimeter is a real climb (Jack goes up a face
// at ~0.9 m/s, so a full ascent is a commitment), and the beams overhead are far
// enough up that the beast crossing them is genuinely "above you".
export const HALL = { w: 140, d: 90, wallH: 21 } as const;

/** The roof is a 7x5 grid of stone panels, and most of it came down centuries
 *  ago. These are the cells that are STILL THERE — a broken ring around the
 *  edges with the middle open to the sky, which is what puts sun on the floor
 *  and keeps deep shade in the bays. The Stalker still has the stone beams
 *  under the whole span to cross, so the ceiling route survives the collapse. */
const ROOF_GRID = { cols: 7, rows: 5 } as const;
const ROOF_KEEP: Array<[number, number]> = [
  [0, 0], [0, 1], [0, 2], [1, 0], [2, 0],
  [6, 4], [6, 3], [6, 2], [5, 4], [4, 4],
  [0, 4], [6, 0], [3, 0], [1, 4],
];
/** Cells whose light shaft is worth drawing: open, but with roof beside them,
 *  so the beam has an edge to be cut by. */
const SHAFT_CELLS: Array<[number, number]> = [[1, 1], [5, 3], [3, 4], [2, 2]];

/** Climbable chains — the authored way UP for a human who cannot cling to bare
 *  stone. Each hangs from a roof beam to just above head height, and every one
 *  is placed where climbing it puts you on the ledge ring or a hanging platform,
 *  so the route is a route and not a rope in a field. `x/z` is the line, `top`
 *  and `foot` bound it. Consumed by the world builder AND by traversal, so what
 *  you can see is exactly what you can hold. */
export const CHAINS: Array<{ x: number; z: number; top: number; foot: number }> = (() => {
  // `foot` is a REACH, not a step: 2.05 m is above Jack's head, so a rope is
  // caught by jumping for it and can never be strolled onto. `top` runs to the
  // beams. Every one is placed where climbing it puts you on the ledge ring, a
  // hanging platform, or the beam run — a rope is a route, never scenery.
  const TOP = 21 - 2.2, FOOT = 2.05;
  const spots: Array<[number, number]> = [
    [-44, 26], [42, -26], [-6, -34], [12, 34], [-22, 20], [24, -22],
    [-62, 8], [62, -8], [-30, -30], [30, 30], [0, -12], [-12, 40],
    [52, 14], [-52, -14], [8, -40], [-38, 38],
  ];
  return spots.map(([x, z]) => ({ x, z, top: TOP, foot: FOOT }));
})();

/** Swingable vines. The decorative scatter in `dressing()` stays scatter; these
 *  are the ones the game means — they hang from the beam runs into open floor
 *  between the altars, so a swing carries you across a gap rather than along a
 *  wall. Their free end sits at 3.2 m: the top of a jump puts Jack's fingertips
 *  at ~3.25 m, so catching one is exactly a full stretch and never a walk-up. */
/** The scene objects for {@link VINES}, index-aligned — traversal rotates the
 *  one you are holding so the vine on screen IS the vine you swing on. */
export const VINE_PIVOTS: THREE.Object3D[] = [];

export const VINES: Array<{ x: number; z: number; anchorY: number; length: number }> = (() => {
  const ANCHOR = 21 - 2.6;              // just under the beam run
  const FREE_END = 3.2;
  const spots: Array<[number, number]> = [
    [-34, -37], [-16, -24.7], [2, -12.3], [20, 0], [38, 12.3],
    [-38, 12.3], [-20, 24.7], [-2, 37], [16, 24.7], [34, -24.7],
    [56, 0], [-56, 0],
  ];
  return spots.map(([x, z]) => ({ x, z, anchorY: ANCHOR, length: ANCHOR - FREE_END }));
})();

/** World-space centres of the shafts, so the dust motes in ambience.ts land in
 *  the beams rather than near them. */
export const SHAFT_POINTS: Array<[number, number]> = SHAFT_CELLS.map(([c, r]) => [
  -HALL.w / 2 + (HALL.w / ROOF_GRID.cols) * (c + 0.5),
  -HALL.d / 2 + (HALL.d / ROOF_GRID.rows) * (r + 0.5),
]);

type Mat = "floor" | "wall" | "glyph" | "frieze" | "step" | "gold" | "timber";

type Box = {
  /** centre */ p: [number, number, number];
  /** full size */ s: [number, number, number];
  mat: Mat;
  /** yaw, radians — applied to the mesh AND the body, so they agree */
  yaw?: number;
  /** full euler XYZ, for rubble that came to rest tipped. Wins over `yaw`. */
  rot?: [number, number, number];
  /** decoration the player can walk through (vines, distant canopy) */
  ghost?: true;
};

/** A carved facade rather than a flat slab: base course, glyph panels at eye
 *  height, a skull-frieze band above them, and pilasters breaking the run. This
 *  is the single biggest difference between the reference and a textured box. */
function facade(out: Box[], axis: "x" | "z", side: 1 | -1): void {
  const { w, d, wallH } = HALL;
  const t = 1;
  const len = axis === "x" ? w : d;
  const at = (axis === "x" ? d : w) / 2 * side;
  // place([along, up, out-of-wall]) → world, so one description serves all four walls
  const place = (a: number, y: number, o: number): [number, number, number] =>
    axis === "x" ? [a, y, at - o * side] : [at - o * side, y, a];
  const size = (a: number, y: number, o: number): [number, number, number] =>
    axis === "x" ? [a, y, o] : [o, y, a];

  out.push({ p: place(0, wallH / 2, 0), s: size(len, wallH, t), mat: "wall" });
  // the frieze band — the skull course from the reference, running the whole
  // wall. Positioned OFF the wall height, not at a magic number, so raising the
  // hall does not leave the ornament stranded halfway up.
  out.push({ p: place(0, wallH - 3.4, -0.45), s: size(len, 2.3, 0.9), mat: "frieze" });
  // a moulding under it, so the band sits on something
  out.push({ p: place(0, wallH - 4.8, -0.6), s: size(len, 0.55, 1.2), mat: "step" });
  // a second, lower course — a 21m wall with one band near the top reads as a
  // blank slab for its bottom two thirds
  out.push({ p: place(0, 9.4, -0.4), s: size(len, 1.1, 0.8), mat: "step" });

  const bays = Math.round(len / 15);
  for (let i = 0; i < bays; i++) {
    const a = -len / 2 + (len / bays) * (i + 0.5);
    // carved glyph panel at eye height
    out.push({ p: place(a, 5.0, -0.35), s: size(len / bays - 5, 7.2, 0.7), mat: "glyph" });
    // pilaster between bays, base and capital
    const pa = -len / 2 + (len / bays) * i;
    out.push({ p: place(pa, wallH / 2, -0.8), s: size(2.6, wallH, 1.6), mat: "wall" });
    out.push({ p: place(pa, 0.7, -1.1), s: size(3.4, 1.4, 2.2), mat: "step" });
    out.push({ p: place(pa, wallH - 1.4, -1.0), s: size(3.4, 1.1, 2.0), mat: "step" });
  }
}

/** A stepped altar mass — the cover the hunt is built around, in temple form.
 *  Same 12x9 footprint and 6m height as the machine block it replaces. */
function altar(out: Box[], x: number, z: number): void {
  out.push({ p: [x, 1.2, z], s: [12, 2.4, 9], mat: "step" });
  out.push({ p: [x, 3.4, z], s: [10.2, 2.0, 7.4], mat: "wall" });
  out.push({ p: [x, 5.2, z], s: [7.8, 1.6, 5.4], mat: "glyph" });
  // a carved marker on top — a silhouette to read the room by
  out.push({ p: [x, 6.9, z], s: [1.6, 1.8, 1.6], mat: "frieze" });
}

/** The static solids. One list, so the mesh pass and the collider pass agree.
 *  `rubble` is tier-scaled: it is the one part of the ruin that is pure dressing,
 *  so a phone gets a handful instead of the full scatter (#79). */
function layout(rubbleCount: number): Box[] {
  const { w, d, wallH } = HALL;
  const boxes: Box[] = [{ p: [0, -0.5, 0], s: [w, 1, d], mat: "floor" }];

  facade(boxes, "x", 1); facade(boxes, "x", -1);
  facade(boxes, "z", 1); facade(boxes, "z", -1);

  // the altars, on the machine blocks' exact centres
  for (let i = 0; i < 6; i++) altar(boxes, -50 + i * 20, i % 2 === 0 ? -14 : 12);

  // Ledge ring: cut stone where the catwalk was, 6m up, with a low parapet on
  // the outside so it reads as architecture and you cannot walk off backwards.
  const ch = 6, cwWidth = 4, inset = 10;
  const ring: Array<[number, number, number, number]> = [
    [0, -d / 2 + inset, w - inset * 2, cwWidth],
    [0, d / 2 - inset, w - inset * 2, cwWidth],
    [-w / 2 + inset, 0, cwWidth, d - inset * 2],
    [w / 2 - inset, 0, cwWidth, d - inset * 2],
  ];
  for (const [x, z, sx, sz] of ring) {
    boxes.push({ p: [x, ch, z], s: [sx, 0.8, sz], mat: "step" });
    const outward = sx > sz ? [0, Math.sign(z) * (sz / 2 - 0.25)] : [Math.sign(x) * (sx / 2 - 0.25), 0];
    // #102 — parapets take plain cut stone. The skull course is ceremonial and
    // belongs on the wall band at its carved size; on a 0.5m-thick rail it
    // shrank into a dotted trim strip.
    boxes.push({
      p: [x + outward[0], ch + 0.85, z + outward[1]],
      s: sx > sz ? [sx, 0.9, 0.5] : [0.5, 0.9, sz],
      mat: "step",
    });
  }

  // pyramid stairs up to the ring
  for (let i = 0; i < 8; i++) {
    const y = 0.75 * (i + 1);
    boxes.push({ p: [-56 + i * 2.2, y - 0.2, 34], s: [2.2, 0.5, 4.4], mat: "step" });
    boxes.push({ p: [56 - i * 2.2, y - 0.2, -34], s: [2.2, 0.5, 4.4], mat: "step" });
  }

  // Two chain-hung platforms over the middle of the hall — the reference's
  // bottom-left panel, and a route across open air for both hunters.
  for (const [x, z] of [[-22, 26], [24, -28]] as Array<[number, number]>) {
    boxes.push({ p: [x, 6, z], s: [6, 0.7, 6], mat: "step" });
  }

  // Burial chamber — the dark annex, one way in, where the braziers are.
  boxes.push(
    { p: [-52, 4, -32], s: [26, 8, 1], mat: "glyph" },
    { p: [-39, 4, -38], s: [1, 8, 12], mat: "glyph" },
  );

  // The gate platform at the far end, and the great arch over it.
  boxes.push({ p: [58, 1, 0], s: [18, 2, 26], mat: "step" });
  boxes.push(
    { p: [64, 7, -9], s: [3, 12, 3], mat: "wall" },
    { p: [64, 7, 9], s: [3, 12, 3], mat: "wall" },
    { p: [64, 13.4, 0], s: [3.4, 2.4, 21], mat: "frieze" },
  );

  // Roof: panels with cells missing. Without a roof the hall reads as a floor
  // floating in nothing; without holes there is no sun, and the sun IS the look.
  const pw = w / ROOF_GRID.cols, pd = d / ROOF_GRID.rows;
  for (let c = 0; c < ROOF_GRID.cols; c++) {
    for (let r = 0; r < ROOF_GRID.rows; r++) {
      if (!ROOF_KEEP.some(([kc, kr]) => kc === c && kr === r)) continue;
      const x = -w / 2 + pw * (c + 0.5), z = -d / 2 + pd * (r + 0.5);
      boxes.push({ p: [x, wallH + 0.5, z], s: [pw, 1, pd], mat: "step" });
    }
  }
  // stone beams under it — structure overhead to read against, and the surface
  // the Stalker actually crosses (#80)
  for (let i = 0; i < 7; i++) {
    const z = -d / 2 + 8 + i * ((d - 16) / 6);
    boxes.push({ p: [0, wallH - 1.4, z], s: [w - 4, 1.0, 1.4], mat: "step" });
    boxes.push({ p: [0, wallH - 2.4, z + 1.8], s: [w - 4, 0.5, 0.7], mat: "timber" });
  }

  // columns — vertical anchors that give the space depth
  for (const x of [-46, -16, 16, 46]) {
    for (const z of [-30, 30]) {
      boxes.push({ p: [x, 0.6, z], s: [3.6, 1.2, 3.6], mat: "step" });
      boxes.push({ p: [x, wallH / 2, z], s: [2.4, wallH, 2.4], mat: "wall" });
      boxes.push({ p: [x, wallH - 1.4, z], s: [3.4, 1.2, 3.4], mat: "frieze" });
    }
  }

  // Rubble — fallen blocks from the collapsed roof. Ruins are not tidy, and the
  // reference has broken stone in every frame.
  let s = 20260802;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < rubbleCount; i++) {
    const x = (rnd() - 0.5) * (w - 14), z = (rnd() - 0.5) * (d - 14);
    if (Math.abs(x) < 12 && Math.abs(z) < 12) continue;      // keep spawn clear
    // #102 — never the frieze. A 1m lump of fallen masonry with four tiny
    // skulls carved into every face reads as a die, not as debris. And a broken
    // block is not a cube: the sides are unequal and it came to rest tipped.
    const sz = 0.9 + rnd() * 2.2;
    boxes.push({
      p: [x, sz * 0.34, z],
      s: [sz * (0.7 + rnd() * 0.7), sz * (0.45 + rnd() * 0.5), sz * (0.7 + rnd() * 0.7)],
      mat: rnd() > 0.5 ? "step" : "wall",
      rot: [(rnd() - 0.5) * 0.5, rnd() * Math.PI, (rnd() - 0.5) * 0.5],
    });
  }

  return boxes;
}

/** Chains, vines and the canopy past the walls — decoration with no collider,
 *  added straight to the scene so it never enters the solids list. */
function dressing(scene: THREE.Scene, mats: Record<Mat, THREE.Material>, phone: boolean): void {
  const { w, d, wallH } = HALL;
  // VINE_COUNT, not VINES — the exported VINES are the swingable ones
  const VINE_COUNT = phone ? 40 : 110, LEAVES = phone ? 90 : 260, TREES = phone ? 70 : 150;
  let s = 991;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);

  // chains holding the two hanging platforms
  const chainMat = new THREE.MeshStandardMaterial({ color: 0x6b6257, roughness: 0.55, metalness: 0.85 });
  const link = new THREE.CylinderGeometry(0.09, 0.09, wallH - 6.4, 6);
  for (const [px, pz] of [[-22, 26], [24, -28]] as Array<[number, number]>) {
    for (const [ox, oz] of [[-2.6, -2.6], [2.6, -2.6], [-2.6, 2.6], [2.6, 2.6]]) {
      const c = new THREE.Mesh(link, chainMat);
      c.position.set(px + ox, 6 + (wallH - 6.4) / 2, pz + oz);
      c.castShadow = true;
      scene.add(c);
    }
  }

  // The swingable vines — thicker and browner than the decorative scatter, and
  // they reach down into the room. Same readability rule as the chains: the
  // player must never have to guess which green thread takes weight.
  const vineRope = new THREE.MeshStandardMaterial({ color: 0x4a6b2c, roughness: 0.95 });
  const leafBig = new THREE.MeshStandardMaterial({ color: 0x3d5f26, roughness: 0.95, side: THREE.DoubleSide });
  VINE_PIVOTS.length = 0;
  for (const vn of VINES) {
    // Built as a GROUP pivoted at the anchor, with everything hanging below it,
    // so swinging is one rotation of the pivot and the vine the player sees is
    // literally the vine they are hanging from.
    const pivot = new THREE.Group();
    pivot.position.set(vn.x, vn.anchorY, vn.z);
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.10, vn.length, 6), vineRope);
    rope.position.y = -vn.length / 2;
    rope.castShadow = true;
    pivot.add(rope);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 6), leafBig);
    tip.position.y = -vn.length;
    tip.scale.set(1, 0.7, 1);
    pivot.add(tip);
    for (let k = 0; k < 5; k++) {
      const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.44), leafBig);
      leaf.position.set((k - 2) * 0.16, -vn.length + 0.3 + k * 0.55, 0);
      leaf.rotation.set(k * 0.7, k * 1.3, k * 0.4);
      pivot.add(leaf);
    }
    scene.add(pivot);
    VINE_PIVOTS.push(pivot);
  }

  // The climbable chains. Deliberately FATTER than the decorative ones — if the
  // player has to guess which rope takes weight, the route is not readable.
  const climbMat = new THREE.MeshStandardMaterial({ color: 0x8a7c66, roughness: 0.5, metalness: 0.9 });
  for (const ch of CHAINS) {
    const len = ch.top - ch.foot;
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, len, 7), climbMat);
    rope.position.set(ch.x, ch.foot + len / 2, ch.z);
    rope.castShadow = true;
    scene.add(rope);
    // rungs down its length, so it reads as something with holds on it
    const rung = new THREE.BoxGeometry(0.46, 0.09, 0.12);
    for (let y = ch.foot + 0.5; y < ch.top - 0.3; y += 0.72) {
      const r = new THREE.Mesh(rung, climbMat);
      r.position.set(ch.x, y, ch.z);
      r.rotation.y = (y * 1.7) % Math.PI;
      scene.add(r);
    }
  }

  // vines down from the broken roof — the vertical texture the ceiling needs
  const vineMat = new THREE.MeshStandardMaterial({ color: 0x3c5c2c, roughness: 0.9, side: THREE.DoubleSide });
  const leafGeo = new THREE.PlaneGeometry(0.7, 0.4);
  const vineGeo = new THREE.CylinderGeometry(0.06, 0.04, 1, 4);
  const vines = new THREE.InstancedMesh(vineGeo, vineMat, VINE_COUNT);
  const leaves = new THREE.InstancedMesh(leafGeo, vineMat, LEAVES);
  const m = new THREE.Matrix4();
  let li = 0;
  // Vines hang from the BEAMS, not from open air — the first pass left them
  // dangling in the middle of a hole in the roof with nothing above them.
  const beamZ = Array.from({ length: 7 }, (_, i) => -d / 2 + 8 + i * ((d - 16) / 6));
  for (let i = 0; i < VINE_COUNT; i++) {
    const x = (rnd() - 0.5) * (w - 10);
    const z = beamZ[Math.floor(rnd() * beamZ.length)] + (rnd() - 0.5) * 1.4;
    const len = 2 + rnd() * 7;
    m.compose(
      new THREE.Vector3(x, wallH - 2 - len / 2, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rnd() * 3, (rnd() - 0.5) * 0.25)),
      new THREE.Vector3(1, len, 1),
    );
    vines.setMatrixAt(i, m);
    for (let k = 0; k < 2 && li < LEAVES; k++, li++) {
      m.compose(
        new THREE.Vector3(x + (rnd() - 0.5) * 0.5, wallH - 2 - rnd() * len, z + (rnd() - 0.5) * 0.5),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd(), rnd() * 3, rnd())),
        new THREE.Vector3(1, 1, 1),
      );
      leaves.setMatrixAt(li, m);
    }
  }
  vines.instanceMatrix.needsUpdate = true;
  leaves.instanceMatrix.needsUpdate = true;
  scene.add(vines, leaves);

  // the jungle past the ruin — seen over the walls and through the roof holes,
  // so the world does not stop at a wall face
  const canopyMat = new THREE.MeshStandardMaterial({ color: 0x2f5228, roughness: 1 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x40331f, roughness: 1 });
  const crown = new THREE.SphereGeometry(1, 7, 5);
  const trunk = new THREE.CylinderGeometry(0.5, 0.8, 1, 5);
  const crowns = new THREE.InstancedMesh(crown, canopyMat, TREES);
  const trunks = new THREE.InstancedMesh(trunk, trunkMat, TREES);
  for (let i = 0; i < TREES; i++) {
    const ang = (i / TREES) * Math.PI * 2 + rnd() * 0.3;
    const rad = 88 + rnd() * 46;
    const x = Math.cos(ang) * rad * 1.25, z = Math.sin(ang) * rad;
    const hgt = 16 + rnd() * 16, cr = 5 + rnd() * 5;
    m.compose(new THREE.Vector3(x, hgt, z), new THREE.Quaternion(), new THREE.Vector3(cr * 1.3, cr * 0.8, cr * 1.3));
    crowns.setMatrixAt(i, m);
    m.compose(new THREE.Vector3(x, hgt / 2, z), new THREE.Quaternion(), new THREE.Vector3(1, hgt, 1));
    trunks.setMatrixAt(i, m);
  }
  crowns.instanceMatrix.needsUpdate = true;
  trunks.instanceMatrix.needsUpdate = true;
  scene.add(crowns, trunks);

  void mats;
}

/** How many metres of wall one texture tile covers, per material. A BoxGeometry
 *  UV-maps 0..1 across every face regardless of how big the face is, so without
 *  this a 12m altar and a 1m rubble block wear identically-sized blockwork and
 *  the whole room reads as one repeating pattern rather than as masonry. */
const TILE: Record<Mat, number> = {
  floor: 6, wall: 7, glyph: 6.5, frieze: 3.4, step: 5, gold: 1, timber: 2,
};

const geoCache = new Map<string, THREE.BoxGeometry>();

/** A unit box whose UVs are pre-scaled to the world size it will be stretched
 *  to, so texel density is constant across the whole ruin. */
function uvBox(sx: number, sy: number, sz: number, tile: number): THREE.BoxGeometry {
  const k = `${sx.toFixed(2)}|${sy.toFixed(2)}|${sz.toFixed(2)}|${tile}`;
  const hit = geoCache.get(k);
  if (hit) return hit;
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const uv = geo.getAttribute("uv") as THREE.BufferAttribute;
  // BoxGeometry face order: +x, -x, +y, -y, +z, -z — 4 verts each
  const spans: Array<[number, number]> = [
    [sz, sy], [sz, sy], [sx, sz], [sx, sz], [sx, sy], [sx, sy],
  ];
  for (let f = 0; f < 6; f++) {
    const [su, sv] = spans[f];
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      uv.setXY(i, uv.getX(i) * (su / tile), uv.getY(i) * (sv / tile));
    }
  }
  uv.needsUpdate = true;
  geoCache.set(k, geo);
  return geo;
}

/** Returns the static meshes the follow camera pulls back against. */
export function buildComplex(scene: THREE.Scene, physics: PhysicsWorld): THREE.Mesh[] {
  // The generated temple texture set is blocked on credits (#100); until it
  // lands these are drawn procedurally, with a height channel so the carving is
  // really lit rather than painted on.
  // repeat stays 1: the UVs carry the tiling now (see uvBox), and the material
  // colour stays white so the painted stone is the ONLY thing setting the hue —
  // tinting on top of it is what turned the first pass olive.
  const floorT = templeFloor(512, 1);
  const wallT = templeWall(512, 1);
  const glyphT = glyphWall(512, 1);
  const friezeT = skullFrieze(512, 1);
  const stepT = stepStone(512, 1);

  const mats: Record<Mat, THREE.Material> = {
    floor: new THREE.MeshStandardMaterial({ ...floorT, bumpScale: 0.5, roughness: 0.92, metalness: 0.02 }),
    wall: new THREE.MeshStandardMaterial({ ...wallT, bumpScale: 0.55, roughness: 0.9, metalness: 0.02 }),
    glyph: new THREE.MeshStandardMaterial({ ...glyphT, bumpScale: 0.75, roughness: 0.88, metalness: 0.02 }),
    frieze: new THREE.MeshStandardMaterial({ ...friezeT, bumpScale: 0.85, roughness: 0.85, metalness: 0.02 }),
    step: new THREE.MeshStandardMaterial({ ...stepT, bumpScale: 0.4, roughness: 0.88, metalness: 0.02 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xd9a441, roughness: 0.24, metalness: 1.0, emissive: 0x39230a, emissiveIntensity: 0.5 }),
    timber: new THREE.MeshStandardMaterial({ color: 0x7a5f38, roughness: 0.95, metalness: 0.0 }),
  };

  // A carved temple needs many more pieces than a box hall did — facades,
  // altars and rubble are what stop a wall reading as a plane — and ~270 draw
  // calls is how you lose a phone. The pieces are STATIC, so they are baked into
  // one merged mesh per material: seven draw calls for the whole ruin.
  // Colliders stay per-box, and every consumer of the returned list raycasts
  // (camera collision, the Stalker's cling, shots, line-of-sight), which reads
  // merged geometry exactly the same way.
  const tier = detectTier();
  const phone = tier.name === "phone" || tier.name === "phone-low";
  const batches = new Map<Mat, THREE.BufferGeometry[]>();
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();

  for (const b of layout(phone ? 12 : 46)) {
    const geo = uvBox(b.s[0], b.s[1], b.s[2], TILE[b.mat]).clone();
    const euler = b.rot ?? [0, b.yaw ?? 0, 0];
    q.setFromEuler(new THREE.Euler(euler[0], euler[1], euler[2]));
    geo.applyMatrix4(m4.compose(
      new THREE.Vector3(b.p[0], b.p[1], b.p[2]), q,
      new THREE.Vector3(b.s[0], b.s[1], b.s[2]),
    ));
    geo.clearGroups();          // one material per batch — per-face groups would fight the merge
    const list = batches.get(b.mat);
    if (list) list.push(geo); else batches.set(b.mat, [geo]);
    if (b.ghost) continue;

    const body = physics.createBody({ type: "fixed", position: b.p, rotation: euler });
    cuboidCollider(physics.world, body, [b.s[0] / 2, b.s[1] / 2, b.s[2] / 2]);
  }

  const solids: THREE.Mesh[] = [];
  for (const [mat, geos] of batches) {
    const merged = mergeGeometries(geos, false);
    for (const g of geos) g.dispose();
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, mats[mat]);
    mesh.castShadow = mat !== "floor";
    mesh.receiveShadow = true;
    scene.add(mesh);
    solids.push(mesh);
  }

  dressing(scene, mats, phone);
  return solids;
}

/** Fire in the ruin — braziers, kept as `Lamp` so the flicker rig in ambience.ts
 *  drives them unchanged. The sun does the lighting now; these are for the
 *  burial chamber and the deep bays the roof still covers. */
export interface Lamp { light: THREE.PointLight; glass: THREE.MeshStandardMaterial }
export const LAMP_RIG: Lamp[] = [];

/** Light it from the sun. The old rig was fifteen sodium lamps in the dark; the
 *  art target is midday jungle sun through a collapsed roof, so there is ONE key
 *  with hard shadows, a sky fill that is genuinely blue, a warm bounce off the
 *  sandstone, and visible shafts where the roof is open. Fire is the exception,
 *  not the rule. */
export function lightComplex(
  scene: THREE.Scene,
  shadowMapSize: number,
  renderer: THREE.WebGLRenderer,
): THREE.DirectionalLight {
  LAMP_RIG.length = 0;
  const { w, d, wallH } = HALL;

  const sky = buildSky(renderer);
  scene.background = sky.background;
  scene.environment = sky.environment;      // this is what makes the gold read as gold
  // …but at full strength the canopy's green washes every downward-facing stone
  // face olive. Dial it to a specular hint rather than a second light source.
  scene.environmentIntensity = 0.55;

  // sky above, hot sandstone bouncing below — the fill has a CAUSE, both ways.
  // Kept deliberately low against the key: the reference's punch is the SPREAD
  // between a hard sunlit face and a shaded one, and a generous fill erases it.
  scene.add(new THREE.HemisphereLight(0xa6cdf5, 0xb08b56, 1.05));
  scene.add(new THREE.AmbientLight(0xb9c2d0, 0.16));

  const sun = new THREE.DirectionalLight(0xfff2d4, 4.6);
  sun.position.copy(SUN_DIR).multiplyScalar(120);
  sun.castShadow = shadowMapSize > 0;
  sun.shadow.mapSize.setScalar(shadowMapSize || 1024);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 320;
  sun.shadow.bias = -0.0009;
  const s2 = 90;
  sun.shadow.camera.left = -s2;
  sun.shadow.camera.right = s2;
  sun.shadow.camera.top = s2;
  sun.shadow.camera.bottom = -s2;
  scene.add(sun);

  // The shafts. One per collapsed roof cell, aimed down the sun's own axis, so
  // the pools on the floor sit exactly where the holes are.
  const pw = w / ROOF_GRID.cols, pd = d / ROOF_GRID.rows;
  const shaftMat = new THREE.MeshBasicMaterial({
    color: 0xffe6b4, transparent: true, opacity: 0.05,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const len = wallH / SUN_DIR.y + 6;
  const shaftGeo = new THREE.CylinderGeometry(Math.min(pw, pd) * 0.34, Math.min(pw, pd) * 0.52, len, 14, 1, true);
  const align = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), SUN_DIR);
  for (const [x, z] of SHAFT_POINTS) {
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.quaternion.copy(align);
    shaft.position.set(x, wallH, z).addScaledVector(SUN_DIR, -len / 2 + 2);
    shaft.renderOrder = 2;
    scene.add(shaft);
  }

  // Braziers: the fixture makes the pool, same rule as before — a light with no
  // visible source reads as flat no matter how it is tuned.
  const stone = new THREE.MeshStandardMaterial({ color: 0x8f7c5c, roughness: 0.95 });
  const coals = new THREE.MeshStandardMaterial({
    color: 0xff8c33, emissive: 0xff6a12, emissiveIntensity: 2.4, roughness: 0.6,
  });
  const bowl = new THREE.CylinderGeometry(0.85, 0.45, 0.7, 10);
  const plinth = new THREE.CylinderGeometry(0.42, 0.62, 2.2, 8);
  const ember = new THREE.SphereGeometry(0.62, 10, 6);

  const SPOTS: Array<[number, number]> = [
    [-52, -36], [-42, -30],            // the burial chamber
    [-64, 34], [64, 34], [-64, -6], [10, -38], [40, 30],
  ];
  for (const [x, z] of SPOTS) {
    const rig = new THREE.Group();
    rig.position.set(x, 0, z);
    const col = new THREE.Mesh(plinth, stone);
    col.position.y = 1.1; col.castShadow = true;
    const dish = new THREE.Mesh(bowl, stone);
    dish.position.y = 2.5; dish.castShadow = true;
    const glow = new THREE.Mesh(ember, coals.clone());
    glow.position.y = 2.65; glow.scale.y = 0.55;
    rig.add(col, dish, glow);
    scene.add(rig);

    const light = new THREE.PointLight(0xffa04a, 90, 26, 1.8);
    light.position.set(x, 3.1, z);
    scene.add(light);
    LAMP_RIG.push({ light, glass: glow.material as THREE.MeshStandardMaterial });
  }

  // warm heat haze, not a dark room: distance goes pale and golden
  scene.fog = new THREE.FogExp2(0xc9c2a2, 0.0042);
  void d;
  return sun;
}
