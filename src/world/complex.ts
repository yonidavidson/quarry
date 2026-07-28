// One floor of the complex: machine hall, catwalk ring, pump room, extraction
// bay. Boxes and planes for now — every solid here is both a mesh and a static
// Rapier collider, so the walkable shape and the visible shape can never drift.
import * as THREE from "three";
import type { PhysicsWorld } from "../controllers/shared/physics-world.ts";
import { cuboidCollider } from "../controllers/shared/colliders.ts";
import { TEXTURES } from "../assets.ts";

/** Interior bounds, metres. Matches DESIGN.md → World & scale. */
export const HALL = { w: 140, d: 90, wallH: 14 } as const;

type Box = {
  /** centre */ p: [number, number, number];
  /** full size */ s: [number, number, number];
  mat: "floor" | "catwalk" | "wall";
};

/** The static solids. One list, so the mesh pass and the collider pass agree. */
function layout(): Box[] {
  const { w, d, wallH } = HALL;
  const t = 1; // wall thickness
  const boxes: Box[] = [
    // floor slab + the four walls that close the hall in
    { p: [0, -0.5, 0], s: [w, 1, d], mat: "floor" },
    { p: [0, wallH / 2, -d / 2], s: [w, wallH, t], mat: "wall" },
    { p: [0, wallH / 2, d / 2], s: [w, wallH, t], mat: "wall" },
    { p: [-w / 2, wallH / 2, 0], s: [t, wallH, d], mat: "wall" },
    { p: [w / 2, wallH / 2, 0], s: [t, wallH, d], mat: "wall" },
  ];

  // Machine blocks down the middle of the hall — cover, and the thing that
  // makes sightlines matter. Staggered so no straight line crosses the room.
  for (let i = 0; i < 6; i++) {
    const x = -50 + i * 20;
    const z = i % 2 === 0 ? -14 : 12;
    boxes.push({ p: [x, 3, z], s: [12, 6, 9], mat: "wall" });
  }

  // Catwalk ring: a raised walkway around the hall, 6m up, with the four
  // ramps that get you onto it.
  const ch = 6, cwWidth = 4, inset = 10;
  boxes.push(
    { p: [0, ch, -d / 2 + inset], s: [w - inset * 2, 0.4, cwWidth], mat: "catwalk" },
    { p: [0, ch, d / 2 - inset], s: [w - inset * 2, 0.4, cwWidth], mat: "catwalk" },
    { p: [-w / 2 + inset, ch, 0], s: [cwWidth, 0.4, d - inset * 2], mat: "catwalk" },
    { p: [w / 2 - inset, ch, 0], s: [cwWidth, 0.4, d - inset * 2], mat: "catwalk" },
  );
  // stepped ramps up to the ring (a stack of slabs — cheap stairs)
  for (let i = 0; i < 8; i++) {
    const y = 0.75 * (i + 1);
    boxes.push({ p: [-56 + i * 2.2, y - 0.2, 34], s: [2.2, 0.4, 4], mat: "catwalk" });
    boxes.push({ p: [56 - i * 2.2, y - 0.2, -34], s: [2.2, 0.4, 4], mat: "catwalk" });
  }

  // Pump room — a walled annex in one corner, one way in.
  boxes.push(
    { p: [-52, 4, -32], s: [26, 8, t], mat: "wall" },
    { p: [-39, 4, -38], s: [t, 8, 12], mat: "wall" },
  );

  // Extraction bay platform, far end.
  boxes.push({ p: [58, 1, 0], s: [18, 2, 26], mat: "catwalk" });

  return boxes;
}

function loadTiling(url: string, repeat: number): THREE.Texture {
  const tex = new THREE.TextureLoader().load(url);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Returns the static meshes the follow camera pulls back against. */
export function buildComplex(scene: THREE.Scene, physics: PhysicsWorld): THREE.Mesh[] {
  const floorTex = loadTiling(TEXTURES.floor, 24);
  const plateTex = loadTiling(TEXTURES.catwalk, 6);

  const mats = {
    floor: new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.95, metalness: 0.05 }),
    catwalk: new THREE.MeshStandardMaterial({ map: plateTex, roughness: 0.8, metalness: 0.35 }),
    wall: new THREE.MeshStandardMaterial({ color: 0x2a2b2e, roughness: 0.9, metalness: 0.15 }),
  };

  const box = new THREE.BoxGeometry(1, 1, 1);
  const solids: THREE.Mesh[] = [];
  for (const b of layout()) {
    const mesh = new THREE.Mesh(box, mats[b.mat]);
    mesh.position.set(b.p[0], b.p[1], b.p[2]);
    mesh.scale.set(b.s[0], b.s[1], b.s[2]);
    mesh.castShadow = b.mat !== "floor";
    mesh.receiveShadow = true;
    scene.add(mesh);

    const body = physics.createBody({ type: "fixed", position: b.p });
    cuboidCollider(physics.world, body, [b.s[0] / 2, b.s[1] / 2, b.s[2] / 2]);
    solids.push(mesh);
  }
  return solids;
}

/** Sodium emergency lighting — dim, warm, and pooled, so the dark between
 *  pools is where the hunt happens. */
export function lightComplex(scene: THREE.Scene, shadowMapSize: number): THREE.DirectionalLight {
  scene.add(new THREE.AmbientLight(0x3d4654, 1.5));
  scene.add(new THREE.HemisphereLight(0x7d8ba0, 0x241c14, 1.0));

  // one weak overhead key so shapes read at all, shadow-casting
  const key = new THREE.DirectionalLight(0xc4d2e6, 1.6);
  key.position.set(30, 40, 20);
  key.castShadow = shadowMapSize > 0;
  key.shadow.mapSize.setScalar(shadowMapSize || 1024);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 160;
  const s = 80;
  key.shadow.camera.left = -s;
  key.shadow.camera.right = s;
  key.shadow.camera.top = s;
  key.shadow.camera.bottom = -s;
  scene.add(key);

  for (const [x, z] of [[-50, -30], [-50, 25], [-20, 20], [-20, -22], [20, -20], [20, 22], [50, 25], [50, -25], [58, 0], [0, 0]]) {
    const lamp = new THREE.PointLight(0xff9840, 220, 60, 2);
    lamp.position.set(x, 8, z);
    scene.add(lamp);
  }

  scene.fog = new THREE.FogExp2(0x12161d, 0.0055);
  return key;
}
