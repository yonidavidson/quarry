# Genex open-world terrain — copy-paste streaming heightfield

One module: seeded noise → fBm heightfield with location pads → chunked,
time-budgeted streaming with seam-free normals → instanced scatter. Plain
vanilla-ts, three.js only. Copy it, then tune the named constants at the top —
they are the whole difficulty/size surface.

## Constants + the canonical height function

```ts
// world-terrain.ts
import * as THREE from "three";

export const WORLD_SEED = 1337;      // one seed → same world on every machine
export const WORLD_BOUND = 2048;     // half-size: playable area is 4096×4096 m
export const CHUNK = 128;            // chunk side in meters
export const CHUNK_RES = 32;         // vertices per side (33×33 grid)
export const VIEW_CHUNKS = 5;        // load radius → ~600 m view with fog

// --- seeded value noise + fBm (swap in $genex-threejs-procedural-fields'
// simplex if it's already loaded; the shape below is what matters) ---
const hash2 = (x: number, y: number): number => {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + WORLD_SEED) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 0xffffffff;
};
const smooth = (t: number): number => t * t * (3 - 2 * t);
function valueNoise(x: number, y: number): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const tx = smooth(x - xi), ty = smooth(y - yi);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty; // 0..1
}
function fbm(x: number, y: number, octaves = 5): number {
  let sum = 0, amp = 0.5, freq = 1;
  for (let i = 0; i < octaves; i++) {
    sum += amp * (valueNoise(x * freq, y * freq) * 2 - 1);
    amp *= 0.5; freq *= 2;
  }
  return sum; // ~-1..1
}

// --- location pads: level ground for structures, BLENDED into the field ---
type Pad = { x: number; z: number; radius: number; height: number };
export const PADS: Pad[] = []; // fill from your POI table before first chunk build

function baseHeight(x: number, z: number): number {
  const n = fbm(x * 0.0016, z * 0.0016);            // rolling base, ~600 m features
  const ridge = 1 - Math.abs(fbm(x * 0.004, z * 0.004)); // sharp ridge lines
  let h = n * 26 + ridge * ridge * 18;
  // edge-mountain ring: the honest world bound the player can SEE
  const edge = Math.max(Math.abs(x), Math.abs(z)) / WORLD_BOUND; // 0..1
  if (edge > 0.85) h += ((edge - 0.85) / 0.15) ** 2 * 90;
  return h;
}

/**
 * THE canonical height. Chunk meshing, physics grounding, scatter, spawns,
 * and the minimap all call THIS — a second height formula anywhere is how
 * trees float and feet sink.
 */
export function getHeightAt(x: number, z: number): number {
  let h = baseHeight(x, z);
  for (const p of PADS) {
    const d = Math.hypot(x - p.x, z - p.z);
    if (d < p.radius) {
      const t = smooth(1 - d / p.radius); // 1 at center → 0 at rim
      h = h * (1 - t) + p.height * t;     // flat pad blended into the hills
    }
  }
  return h;
}
```

## Chunk manager — streamed, time-budgeted, seam-free

```ts
// world-chunks.ts
const chunkKey = (cx: number, cz: number): string => `${cx},${cz}`;
const live = new Map<string, THREE.Mesh>();
const queue: Array<{ cx: number; cz: number }> = [];
const material = new THREE.MeshStandardMaterial({ vertexColors: true });

function buildChunk(cx: number, cz: number): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(CHUNK, CHUNK, CHUNK_RES, CHUNK_RES);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const x0 = cx * CHUNK, z0 = cz * CHUNK;
  for (let i = 0; i < pos.count; i++) {
    const wx = x0 + pos.getX(i), wz = z0 + pos.getZ(i);
    const h = getHeightAt(wx, wz);
    pos.setY(i, h);
    const c = biomeColor(wx, wz, h); // your biome lookup (see below)
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  // Seam rule: analytic normals from the SAME height field (an implicit
  // one-vertex apron) — computeVertexNormals() per chunk creases every border.
  const nrm = geo.attributes.normal;
  const eps = CHUNK / CHUNK_RES;
  for (let i = 0; i < pos.count; i++) {
    const wx = x0 + pos.getX(i), wz = z0 + pos.getZ(i);
    const hx = getHeightAt(wx + eps, wz) - getHeightAt(wx - eps, wz);
    const hz = getHeightAt(wx, wz + eps) - getHeightAt(wx, wz - eps);
    const n = new THREE.Vector3(-hx, 2 * eps, -hz).normalize();
    nrm.setXYZ(i, n.x, n.y, n.z);
  }
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x0, 0, z0);
  mesh.receiveShadow = true;
  return mesh;
}

/** Call every frame. Streams chunks around the player inside a ms budget. */
export function updateChunks(scene: THREE.Scene, px: number, pz: number, budgetMs = 5): void {
  const ccx = Math.round(px / CHUNK), ccz = Math.round(pz / CHUNK);
  for (let dz = -VIEW_CHUNKS; dz <= VIEW_CHUNKS; dz++) {
    for (let dx = -VIEW_CHUNKS; dx <= VIEW_CHUNKS; dx++) {
      const key = chunkKey(ccx + dx, ccz + dz);
      if (!live.has(key) && !queue.some((q) => chunkKey(q.cx, q.cz) === key)) {
        queue.push({ cx: ccx + dx, cz: ccz + dz });
      }
    }
  }
  const start = performance.now();
  while (queue.length && performance.now() - start < budgetMs) {
    const { cx, cz } = queue.shift()!;
    const mesh = buildChunk(cx, cz);
    live.set(chunkKey(cx, cz), mesh);
    scene.add(mesh);
    // scatterChunk(scene, cx, cz) — instanced vegetation, below
  }
  for (const [key, mesh] of live) {
    const [cx, cz] = key.split(",").map(Number);
    if (Math.max(Math.abs(cx - ccx), Math.abs(cz - ccz)) > VIEW_CHUNKS + 1) {
      scene.remove(mesh);
      mesh.geometry.dispose(); // material is shared — never dispose it here
      live.delete(key);
    }
  }
}
```

## Biomes — one lookup drives color, scatter, and spawns

```ts
type Biome = "meadow" | "forest" | "marsh" | "desert" | "alpine";
export function biomeAt(x: number, z: number, h: number): Biome {
  if (h > 55) return "alpine";
  const temp = valueNoise(x * 0.0006 + 100, z * 0.0006);     // slow fields:
  const moist = valueNoise(x * 0.0006, z * 0.0006 + 100);    // ~1.5 km regions
  if (temp > 0.62 && moist < 0.4) return "desert";
  if (moist > 0.62 && h < 12) return "marsh";
  if (moist > 0.45) return "forest";
  return "meadow";
}
const BIOME_TINT: Record<Biome, THREE.Color> = {
  meadow: new THREE.Color(0x5d7f3a), forest: new THREE.Color(0x3f5f31),
  marsh: new THREE.Color(0x4a5a3c), desert: new THREE.Color(0xb59a63),
  alpine: new THREE.Color(0x8d8d94),
};
function biomeColor(x: number, z: number, h: number): THREE.Color {
  const c = BIOME_TINT[biomeAt(x, z, h)].clone();
  // slope → rock, shoreline → sand: cheap reads that sell the terrain
  return c;
}
```

Spawn tables and ambient audio key off `biomeAt` too — that is the content
hookup (`$genex-threejs-game-content`'s enemy line usually reads "wolves in
the forest, bandits on the roads": this function is where that sentence
becomes true).

## Instanced scatter — a forest for one draw call

```ts
export function scatterChunk(scene: THREE.Scene, cx: number, cz: number): void {
  const rng = seededRng((cx * 73856093) ^ (cz * 19349663) ^ WORLD_SEED);
  const spots: THREE.Matrix4[] = [];
  for (let i = 0; i < 40; i++) {
    const x = (cx + rng()) * CHUNK, z = (cz + rng()) * CHUNK;
    const h = getHeightAt(x, z);
    if (biomeAt(x, z, h) !== "forest") continue;
    if (PADS.some((p) => Math.hypot(x - p.x, z - p.z) < p.radius + 6)) continue;
    const s = 0.8 + rng() * 0.7;
    spots.push(new THREE.Matrix4().compose(
      new THREE.Vector3(x, h, z),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rng() * Math.PI * 2),
      new THREE.Vector3(s, s, s),
    ));
  }
  if (!spots.length) return;
  const tree = new THREE.InstancedMesh(sharedTreeGeometry, sharedTreeMaterial, spots.length);
  spots.forEach((m, i) => tree.setMatrixAt(i, m));
  tree.castShadow = true;
  scene.add(tree); // track per chunk-key and remove alongside the chunk
}
```

(`seededRng` is the one from `$genex-threejs-game-content`'s reference —
share it. `sharedTreeGeometry`/`sharedTreeMaterial` are module-level ONE-time
allocations: per-chunk geometry allocation is the classic memory leak here.
Real trees come from `$genex-threejs-procedural-vegetation`; a cone-on-
cylinder placeholder is fine until it loads.)

## Grounding the player

For the character/vehicle, the cheap path is the canonical function itself —
`y = getHeightAt(x, z)` plus a small offset for walking, with slopes from the
same finite differences as the normals. Move to per-chunk Rapier heightfield
colliders (`$genex-threejs-physics-rapier`) when projectiles, ragdolls, or
rolling props need true collision — build them only for the chunks around the
player, and from the SAME `getHeightAt`, never a copy.
