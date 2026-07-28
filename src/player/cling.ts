// Player wall-climb and ceiling-crawl, for when you ARE the Stalker.
//
// The bundled CharacterController is a dynamic capsule: it cannot hold a wall or
// hang upside down without fighting gravity every frame. So this does not try to
// persuade it — it takes the body away. On grab the controller is disabled and
// the rigid body becomes kinematic-position-based, driven directly; on release
// the body goes back to dynamic and the controller resumes with its
// interpolation snapped, so there is no rubber-band on the hand-off.
//
// The same trick the AI Stalker uses (src/hunter/stalker.ts), except a human
// decides when.
import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import type { CharacterController } from "../controllers/character/character-controller.ts";
import type { PhysicsWorld } from "../controllers/shared/physics-world.ts";
import { HALL } from "../world/complex.ts";
import { AUDIO } from "../assets.ts";
import { play } from "../audio.ts";
import { sparkBurst } from "../fx/hits.ts";

export type ClingState = "off" | "wall" | "ceiling";

const CEIL_Y = HALL.wallH - 1.2;
const REACH = 2.2;      // how close a wall has to be to grab it
const CLIMB = 7.5;      // m/s up and down
const STRAFE = 6.0;     // m/s along the wall
const CRAWL = 9.0;      // m/s across the ceiling

/** Which way the keys are asking to go, in the camera's frame. */
export interface ClingInput { forward: number; right: number; grab: boolean; drop: boolean }

export class Cling {
  state: ClingState = "off";
  /** Outward normal of the wall being held, so the body can face into it. */
  private normal = new THREE.Vector3();
  private pos = new THREE.Vector3();
  private ray = new THREE.Raycaster();
  private cooldown = 0;

  private physics: PhysicsWorld;
  private character: CharacterController;
  private solids: THREE.Object3D[];

  // ── the moment of contact ──
  // A grab that simply changes state reads as teleporting onto the wall. What
  // sells it is that the body ARRIVES: the hands lead, the momentum is arrested
  // visibly, and the body swings under the grip before it settles. The 2D game
  // did exactly this — the catch swung harder the faster you flew in, then
  // damped out (quarry-2d-final: grabAt / swayAmp) — and it is the single
  // cheapest thing that makes a ledge feel grabbed rather than snapped to.
  private swing = 0;          // amplitude, from the speed you arrived at
  private swingT = 0;         // seconds since contact
  private catching = 0;       // brief input lockout so contact reads as an event
  private armL: THREE.Object3D | null = null;
  private armR: THREE.Object3D | null = null;
  private scene: THREE.Scene | null = null;

  constructor(physics: PhysicsWorld, character: CharacterController, solids: THREE.Object3D[], scene?: THREE.Scene) {
    this.physics = physics;
    this.character = character;
    this.solids = solids;
    this.scene = scene ?? null;
    this.ray.far = REACH;
  }

  /** Hand the body over once it loads, so the arms can reach for the surface. */
  setBody(root: THREE.Object3D): void {
    root.traverse((o) => {
      const n = o.name.toLowerCase();
      if (!/upperarm|shoulder|arm/.test(n)) return;
      if (!this.armL && /l(eft)?($|[^a-z])/.test(n)) this.armL = o;
      if (!this.armR && /r(ight)?($|[^a-z])/.test(n)) this.armR = o;
    });
  }

  /** Additive arm pose — call AFTER the animation mixer writes its bones, or the
   *  clip overwrites the reach every frame. The arms lift toward whatever the
   *  body is holding, and lead it on the way in. */
  poseArms(): void {
    if (this.state === "off" || this.catching > 0.35) return;
    const lift = this.state === "ceiling" ? -1.15 : -0.95;
    if (this.armL) this.armL.rotation.x += lift;
    if (this.armR) this.armR.rotation.x += lift;
  }

  get active(): boolean { return this.state !== "off"; }

  /** The nearest wall within reach, or null. Four probes beat one — you should be
   *  able to grab the wall you are backed against, not only the one you face. */
  private findWall(from: THREE.Vector3): THREE.Vector3 | null {
    const dirs = [
      new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1),
    ];
    let best: { d: number; n: THREE.Vector3 } | null = null;
    const origin = from.clone().setY(from.y + 0.4);
    for (const dir of dirs) {
      this.ray.set(origin, dir);
      const hit = this.ray.intersectObjects(this.solids, false)[0];
      if (!hit) continue;
      // a floor slab is not a wall — only near-vertical faces can be held
      const n = hit.face ? hit.face.normal.clone() : dir.clone().negate();
      if (Math.abs(n.y) > 0.5) continue;
      if (!best || hit.distance < best.d) best = { d: hit.distance, n: dir.clone().negate() };
    }
    return best ? best.n : null;
  }

  private grab(normal: THREE.Vector3): void {
    this.state = "wall";
    this.normal.copy(normal);
    this.pos.copy(this.character.currPos);
    this.contact(this.character.body.linvel());
    this.character.enabled = false;
    const body = this.character.body;
    body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
    body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  }

  /** Everything that makes the grab an EVENT rather than a state change. */
  private contact(v: { x: number; y: number; z: number }): void {
    const speed = Math.hypot(v.x, v.y, v.z);
    // arrive fast, swing hard — the amplitude is the evidence of your momentum
    this.swing = THREE.MathUtils.clamp(speed / 9, 0.06, 0.42);
    this.swingT = 0;
    this.catching = 0.5;
    play(AUDIO.step, 0.5, 0.55);                       // palms finding the surface
    if (this.scene) {
      sparkBurst(this.scene, this.pos.clone().add(new THREE.Vector3(0, 1.4, 0)), 0xbba98a, 9);
    }
  }

  release(): void {
    if (this.state === "off") return;
    this.state = "off";
    this.cooldown = 0.35; // stops a held key re-grabbing the wall you just left
    const body = this.character.body;
    body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
    body.setTranslation({ x: this.pos.x, y: this.pos.y, z: this.pos.z }, true);
    body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.physics.snapBodyInterpolation(body);
    this.character.enabled = true;
  }

  /** Dive at the floor from a hang — the player-facing version of the AI's
   *  pounce. Lets go and throws the body down and forward along the aim. */
  pounce(yaw: number): void {
    if (this.state !== "ceiling") return;
    this.release();
    const body = this.character.body;
    body.setLinvel({ x: -Math.sin(yaw) * 11, y: -16, z: -Math.cos(yaw) * 11 }, true);
  }

  /** Call once per render frame, before the camera. `yaw` is the camera heading. */
  update(dt: number, input: ClingInput, yaw: number): void {
    if (this.cooldown > 0) this.cooldown -= dt;

    if (this.state === "off") {
      if (this.cooldown > 0) return;
      const at = this.character.currPos;
      // In the air, contact IS the grab — unless the player is steering away
      // from the surface, which is how you choose to fall past it.
      const airborne = !this.character.isOnGround;
      const wanting = input.grab || (airborne && input.forward >= 0);
      if (!wanting) return;
      if (airborne && at.y >= CEIL_Y - 1.6) {   // came up under the ceiling
        this.pos.copy(at); this.pos.y = CEIL_Y;
        this.normal.set(0, 0, 1);
        this.state = "ceiling";
        this.contact(this.character.body.linvel());
        this.character.enabled = false;
        const body = this.character.body;
        body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
        body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        return;
      }
      const wall = this.findWall(at);
      if (wall) this.grab(wall);
      return;
    }

    if (this.catching > 0) this.catching -= dt;
    this.swingT += dt;
    // the catch owns the body for a beat — you do not start climbing mid-impact
    if (this.catching > 0.34) { this.applyPose(yaw); return; }

    if (input.drop) { this.release(); return; }

    if (this.state === "wall") {
      // up/down the wall, and sideways across its face
      const along = new THREE.Vector3(-this.normal.z, 0, this.normal.x);
      this.pos.y += input.forward * CLIMB * dt;
      this.pos.addScaledVector(along, input.right * STRAFE * dt);
      if (this.pos.y >= CEIL_Y) { this.pos.y = CEIL_Y; this.state = "ceiling"; }
      else if (this.pos.y <= 0.6) { this.release(); return; }   // stepped off the bottom
      else {
        // The surface has to still BE there. Without this you climb straight off
        // the top of a 6m machine block and keep going up empty air.
        const still = this.findWall(this.pos);
        if (!still) { this.release(); return; }
        this.normal.copy(still);
      }
    } else {
      // across the ceiling, steering in the camera's frame
      const f = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
      const r = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
      this.pos.addScaledVector(f, input.forward * CRAWL * dt);
      this.pos.addScaledVector(r, input.right * CRAWL * dt);
      this.pos.y = CEIL_Y;
    }

    // never leave the hall, whatever the input says
    const lim = { x: HALL.w / 2 - 1.4, z: HALL.d / 2 - 1.4 };
    this.pos.x = THREE.MathUtils.clamp(this.pos.x, -lim.x, lim.x);
    this.pos.z = THREE.MathUtils.clamp(this.pos.z, -lim.z, lim.z);

    this.applyPose(yaw);
  }

  /** Position + the damped pendulum the contact set going. */
  private applyPose(yaw: number): void {
    this.character.body.setNextKinematicTranslation({ x: this.pos.x, y: this.pos.y, z: this.pos.z });
    this.character.root.position.copy(this.pos);
    // hanging reads as hanging: inverted on the ceiling, face-in on a wall
    const swing = Math.sin(this.swingT * 7.5) * this.swing * Math.exp(-this.swingT * 2.6);
    this.character.root.rotation.set(
      (this.state === "ceiling" ? Math.PI : 0) + swing * 0.6,
      this.state === "ceiling" ? yaw : Math.atan2(-this.normal.x, -this.normal.z),
      swing,
    );
  }
}
