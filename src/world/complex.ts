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
  mat: "floor" | "catwalk" | "wall" | "machine" | "ceiling" | "pipe";
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
    boxes.push({ p: [x, 3, z], s: [12, 6, 9], mat: "machine" });
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

  // The ceiling. Without it the camera looks into black void above head height
  // and the hall reads as a floor floating in nothing — and it is the surface
  // the whole game asks you to watch.
  boxes.push({ p: [0, wallH + 0.5, 0], s: [w, 1, d], mat: "ceiling" });

  // Pipe runs across it, so the Stalker crosses something instead of an
  // invisible plane, and so there is structure overhead to read against.
  for (let i = 0; i < 7; i++) {
    const z = -d / 2 + 8 + i * ((d - 16) / 6);
    boxes.push({ p: [0, wallH - 1.9, z], s: [w - 6, 0.9, 0.9], mat: "pipe" });
    boxes.push({ p: [0, wallH - 2.9, z + 1.6], s: [w - 6, 0.55, 0.55], mat: "pipe" });
  }
  // support columns — vertical anchors that give the space a sense of depth
  for (const x of [-46, -16, 16, 46]) {
    for (const z of [-30, 30]) {
      boxes.push({ p: [x, wallH / 2, z], s: [2.2, wallH, 2.2], mat: "machine" });
    }
  }

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
    // the generated concrete reads warm; pull it back toward wet grey
    floor: new THREE.MeshStandardMaterial({ map: floorTex, color: 0x8e94a0, roughness: 0.62, metalness: 0.12 }),
    catwalk: new THREE.MeshStandardMaterial({ map: plateTex, color: 0xb8bcc4, roughness: 0.7, metalness: 0.45 }),
    wall: new THREE.MeshStandardMaterial({ map: loadTiling(TEXTURES.wall, 10), color: 0x9aa0a6, roughness: 0.88, metalness: 0.2 }),
    machine: new THREE.MeshStandardMaterial({ map: loadTiling(TEXTURES.machine, 3), color: 0x9fa4ac, roughness: 0.72, metalness: 0.55 }),
    ceiling: new THREE.MeshStandardMaterial({ map: loadTiling(TEXTURES.ceiling, 16), color: 0x6e737c, roughness: 0.9, metalness: 0.3 }),
    pipe: new THREE.MeshStandardMaterial({ color: 0x4a4038, roughness: 0.75, metalness: 0.6 }),
  };

  const box = new THREE.BoxGeometry(1, 1, 1);
  const solids: THREE.Mesh[] = [];
  for (const b of layout()) {
    const mesh = new THREE.Mesh(box, mats[b.mat]);
    mesh.position.set(b.p[0], b.p[1], b.p[2]);
    mesh.scale.set(b.s[0], b.s[1], b.s[2]);
    mesh.castShadow = b.mat !== "floor" && b.mat !== "ceiling";
    mesh.receiveShadow = true;
    scene.add(mesh);

    const body = physics.createBody({ type: "fixed", position: b.p });
    cuboidCollider(physics.world, body, [b.s[0] / 2, b.s[1] / 2, b.s[2] / 2]);
    solids.push(mesh);
  }
  return solids;
}

/** Sodium emergency lighting. The rule this follows: every pool of light has a
 *  FIXTURE you can see making it. A scene lit by invisible point lights reads as
 *  flat no matter how the numbers are tuned, and in a hunt the dark between the
 *  pools is the gameplay — so the fill is deliberately low and the falloff is
 *  short. Fixtures are emissive so the bloom pass turns them into real lamps. */
export interface Lamp { light: THREE.PointLight; glass: THREE.MeshStandardMaterial }
export const LAMP_RIG: Lamp[] = [];

export function lightComplex(scene: THREE.Scene, shadowMapSize: number): THREE.DirectionalLight {
  LAMP_RIG.length = 0;
  // a true fill, not a wash — enough to keep shapes from going to pure black
  scene.add(new THREE.AmbientLight(0x3d4b63, 1.7));
  scene.add(new THREE.HemisphereLight(0x6f83a6, 0x2b2014, 1.3));

  // one cold overhead key, mostly for shadow shape rather than illumination
  const key = new THREE.DirectionalLight(0xb4c6de, 1.25);
  key.position.set(30, 44, 20);
  key.castShadow = shadowMapSize > 0;
  key.shadow.mapSize.setScalar(shadowMapSize || 1024);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 180;
  key.shadow.bias = -0.0012;
  const s2 = 80;
  key.shadow.camera.left = -s2;
  key.shadow.camera.right = s2;
  key.shadow.camera.top = s2;
  key.shadow.camera.bottom = -s2;
  scene.add(key);

  // the sodium lamps — geometry first, light second
  const housing = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.9, metalness: 0.4 });
  const glass = new THREE.MeshStandardMaterial({
    color: 0xffb060, emissive: 0xff8a2c, emissiveIntensity: 0.8, roughness: 0.35,
  });
  const shade = new THREE.ConeGeometry(1.25, 1.1, 12, 1, true);
  const bulb = new THREE.SphereGeometry(0.3, 10, 8);

  // A grid, not a scatter. Ten lamps across 140x90m left most of the hall in
  // black void with nothing to read; the space needs enough sources that the
  // architecture is legible, and the DARK still has to live between them.
  const LAMPS: Array<[number, number]> = [];
  for (const x of [-58, -29, 0, 29, 58]) {
    for (const z of [-32, 0, 32]) LAMPS.push([x, z]);
  }
  for (const [x, z] of LAMPS) {
    const rig = new THREE.Group();
    rig.position.set(x, 9.4, z);

    const cone = new THREE.Mesh(shade, housing);
    cone.rotation.x = Math.PI;      // open end down
    rig.add(cone);
    const glow = new THREE.Mesh(bulb, glass);
    glow.position.y = -0.35;
    rig.add(glow);

    // a short stem up to the ceiling, so the lamp hangs from something
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.4, 6), housing);
    stem.position.y = 2.1;
    rig.add(stem);
    scene.add(rig);

    // Short range and quadratic falloff: the pool ends, and between pools it is
    // genuinely dark. That darkness is where the hunt happens.
    const lamp = new THREE.PointLight(0xffa862, 260, 46, 1.7);
    lamp.position.set(x, 8.6, z);
    scene.add(lamp);
    // each fixture keeps its own glass material so one can fail alone
    const ownGlass = glass.clone();
    glow.material = ownGlass;
    LAMP_RIG.push({ light: lamp, glass: ownGlass });
  }

  scene.fog = new THREE.FogExp2(0x141a24, 0.0048);
  return key;
}
