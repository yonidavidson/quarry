// #95 — the ruin has architecture and two hunters, and nothing else that moves.
//
// The rule these follow, inherited from the design contract: they do NOT hunt
// you. The Stalker does the hunting. These punish carelessness — they make the
// fast route across a ledge cost something, so "run straight there" stops being
// the answer to every question, and they give the room a pulse when nothing is
// chasing you.
//
// All procedural: no models, no clips, no credits.
import * as THREE from "three";
import { HALL, BEAM_Y } from "./complex.ts";
import { softDot } from "../fx/soft-dot.ts";
import { landPuff, shake } from "../fx/feel.ts";

interface Pendulum {
  pivot: THREE.Object3D;
  /** world position of the swinging mass, refreshed each frame */
  head: THREE.Vector3;
  phase: number;
  period: number;
  reach: number;
  axis: THREE.Vector3;
  anchor: THREE.Vector3;
}

interface Swarm {
  pts: THREE.Points;
  home: THREE.Vector3;
  phase: number;
  radius: number;
  centre: THREE.Vector3;
}

const pendulums: Pendulum[] = [];
const swarms: Swarm[] = [];
const _v = new THREE.Vector3();

/** A log on two chains, swinging across a walkway. The oldest trap in the genre
 *  and still the most readable: you can see its whole cycle from a distance and
 *  decide when to run, which makes crossing a choice rather than a corridor. */
function addPendulum(scene: THREE.Scene, at: THREE.Vector3, alongX: boolean, period: number, phase: number): void {
  const pivot = new THREE.Group();
  pivot.position.copy(at);
  scene.add(pivot);

  const drop = 4.6;
  const wood = new THREE.MeshStandardMaterial({ color: 0x6b5433, roughness: 0.95 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x6b6257, roughness: 0.5, metalness: 0.85 });

  for (const side of [-1, 1]) {
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, drop, 5), iron);
    chain.position.set(alongX ? side * 1.5 : 0, -drop / 2, alongX ? 0 : side * 1.5);
    pivot.add(chain);
  }
  const log = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 4.6, 9), wood);
  log.rotation.z = Math.PI / 2;
  if (!alongX) log.rotation.y = Math.PI / 2;
  log.position.y = -drop;
  log.castShadow = true;
  pivot.add(log);
  // spikes, so it reads as a trap and not as scaffolding
  const spike = new THREE.ConeGeometry(0.2, 0.6, 5);
  for (let i = -2; i <= 2; i++) {
    for (const r of [0, Math.PI]) {
      const s = new THREE.Mesh(spike, iron);
      s.position.set(alongX ? i * 1.0 : Math.sin(r) * 0.7, -drop + Math.cos(r) * 0.7, alongX ? Math.sin(r) * 0.7 : i * 1.0);
      s.rotation.z = r === 0 ? 0 : Math.PI;
      pivot.add(s);
    }
  }

  pendulums.push({
    pivot,
    head: new THREE.Vector3(),
    phase,
    period,
    reach: drop,
    axis: alongX ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0),
    anchor: at.clone(),
  });
}

/** A scarab swarm boiling over a patch of floor. It never leaves its patch —
 *  it is terrain you learn, not an enemy you fight. */
function addSwarm(scene: THREE.Scene, centre: THREE.Vector3, radius: number): void {
  const count = 60;
  const geo = new THREE.BufferGeometry();
  const arr = new Float32Array(count * 3);
  geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0x1b1208, size: 0.30, transparent: true, opacity: 0.95,
    depthWrite: false, map: softDot(), alphaTest: 0.02,
  }));
  pts.position.copy(centre);
  scene.add(pts);
  swarms.push({ pts, home: centre.clone(), phase: Math.random() * 10, radius, centre: centre.clone() });
}

export function buildHazards(scene: THREE.Scene): void {
  pendulums.length = 0;
  swarms.length = 0;
  const { w, d } = HALL;

  // Across the two stair runs and the high ring — exactly the places the route
  // wants you to hurry through.
  addPendulum(scene, new THREE.Vector3(-45, BEAM_Y - 8.5, 34), false, 3.1, 0);
  addPendulum(scene, new THREE.Vector3(45, BEAM_Y - 8.5, -34), false, 3.4, 1.2);
  addPendulum(scene, new THREE.Vector3(-w / 2 + 22, 20.2, 0), true, 2.7, 0.6);
  addPendulum(scene, new THREE.Vector3(w / 2 - 22, 20.2, 0), true, 2.9, 1.9);

  for (const [x, z, r] of [
    [-30, 6, 4.5], [26, -8, 4], [2, 26, 5], [-8, -26, 4.2], [54, 22, 4],
  ] as Array<[number, number, number]>) {
    addSwarm(scene, new THREE.Vector3(x, 0.14, z), r);
  }
  void d;
}

/** Returns damage to apply to the player this frame (0 most frames).
 *  `onKnock` fires with a shove direction when a log connects. */
export function updateHazards(
  dt: number,
  t: number,
  player: THREE.Vector3,
  scene: THREE.Scene,
  onKnock: (dir: THREE.Vector3) => void,
): number {
  let damage = 0;

  for (const p of pendulums) {
    const a = Math.sin((t / p.period + p.phase) * Math.PI * 2) * 1.05;
    p.pivot.quaternion.setFromAxisAngle(p.axis, a);
    // where the log actually is, so the hit test matches what you can see
    p.head.set(0, -p.reach, 0).applyQuaternion(p.pivot.quaternion).add(p.anchor);
    if (p.head.distanceTo(player) < 2.0) {
      damage += 1;
      _v.subVectors(player, p.head).setY(0.35).normalize();
      onKnock(_v);
      shake(0.45);
      landPuff(scene, player.clone(), 0.6);
    }
  }

  for (const s of swarms) {
    s.phase += dt;
    const attr = s.pts.geometry.getAttribute("position") as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < arr.length; i += 3) {
      // each beetle runs its own slow orbit inside the patch, so the mass
      // seethes instead of translating
      const k = i * 0.37;
      const rr = s.radius * (0.25 + ((i * 13) % 70) / 100);
      const sp = 0.5 + ((i * 7) % 30) / 40;
      arr[i] = Math.cos(s.phase * sp + k) * rr;
      arr[i + 1] = Math.abs(Math.sin(s.phase * 3 + k)) * 0.14;
      arr[i + 2] = Math.sin(s.phase * sp * 1.3 + k) * rr;
    }
    attr.needsUpdate = true;
    const flat = Math.hypot(player.x - s.centre.x, player.z - s.centre.z);
    if (flat < s.radius * 0.75 && player.y < 1.9) {
      // a slow bleed, not a spike — standing in them is the mistake, crossing
      // them quickly is a legitimate risk you are allowed to take
      damage += dt * 1.6;
    }
  }

  return damage;
}
