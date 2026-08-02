// Traversal for the human: ledge grabs, hanging, shimmying, mantling, and
// climbing the chains. The Tomb Raider verb set, procedurally driven.
//
// Why this exists: the hunt gave Jack a gun and a flat floor, so his only answer
// to anything was to walk backwards while shooting. The reference frame the art
// target came from is a man ON a wall, and the movement has to earn that. The
// Stalker could already hold any surface (src/player/cling.ts); this is the
// human counterpart and it is deliberately NOT the same power:
//
//   the Stalker goes anywhere — bare stone, ceiling, mid-span
//   the human goes where the ruin offers a hold — a ledge lip, a chain
//
// which keeps the asymmetry the duel is built on while giving the human a real
// vertical game instead of "no way up".
//
// Everything here is procedural. The generated climb clips (`genex character
// animate <id> "climb"`) are credit-blocked, and a hand-over-hand cycle solved
// against the actual surface beats a canned clip that slides anyway.
import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import type { CharacterController } from "../controllers/character/character-controller.ts";
import type { PhysicsWorld } from "../controllers/shared/physics-world.ts";
import { CHAINS } from "../world/complex.ts";
import { AUDIO } from "../assets.ts";
import { play } from "../audio.ts";
import { solveTwoBone, findArm, findLeg } from "../anim/two-bone-ik.ts";

export type TraverseState = "off" | "hang" | "chain" | "mantle";

/** What the keys are asking for, already resolved into intent. */
export interface TraverseInput {
  /** −1 back, +1 forward (up, when holding on) */ forward: number;
  /** −1 left, +1 right (shimmy) */ right: number;
  jump: boolean;
  /** crouch/back — lets go */ drop: boolean;
}

const REACH = 1.05;         // how far in front a wall can be and still be caught
// Climbing is SLOW. A person going up a rope does about a metre a second and it
// costs them; at the 2.6 m/s this shipped with, an 11 m chain went by in four
// seconds and read as an elevator with arms. The whole point of a climb is that
// it takes long enough to be a decision while something is hunting you.
const SHIMMY = 0.85;        // m/s sideways along a lip
const CLIMB = 0.92;         // m/s up a chain
const HANG_DROP = 1.34;     // body centre below the lip while hanging
const MANTLE_TIME = 0.62;
/** After a catch, the body just HANGS for a moment. Nothing you were already
 *  holding can act during it — see the edge-detection below. */
const SETTLE = 0.32;
/** Metres of travel per full hand-over-hand cycle: one reach, one plant. */
const CYCLE_M = 0.62;

const _fwd = new THREE.Vector3();
const _probe = new THREE.Vector3();
const _down = new THREE.Vector3(0, -1, 0);
const _tan = new THREE.Vector3();
const _pole = new THREE.Vector3();
const _v = new THREE.Vector3();

export class Traverse {
  state: TraverseState = "off";
  /** Outward normal of the face being held (points away from the wall). */
  private normal = new THREE.Vector3(0, 0, 1);
  /** World Y of the lip being held. */
  private lipY = 0;
  private pos = new THREE.Vector3();
  private ray = new THREE.Raycaster();
  private cooldown = 0;
  private chain: (typeof CHAINS)[number] | null = null;

  /** Mantle is a short authored arc, not a state you steer. */
  private mantleT = 0;
  private mantleFrom = new THREE.Vector3();
  private mantleTo = new THREE.Vector3();

  /** The hand-over-hand cycle. This is the whole point of the module: a body
   *  that slides up a surface with both palms glued at head height reads as an
   *  elevator. One hand is always PLANTED while the other reaches for its next
   *  hold, and the phase only advances when you actually move. */
  private cycle = 0;
  /** Edge detection. THE bug this fixes: you grab a rope by pressing Space and
   *  a ledge by jumping while holding W — so on the very next frame the same
   *  still-held key was read as "push off the chain" / "mantle over the lip",
   *  and the hang never existed. A hold that is already down when you catch
   *  something must be RELEASED before it means anything. */
  private armedJump = false;
  private armedFwd = false;
  /** Counts down after a catch: the body just hangs there and takes its weight. */
  private settle = 0;
  /** Swing left over from arriving, and a slow idle sway once it damps out. */
  private swing = 0;
  private hangT = 0;
  private gripL = new THREE.Vector3();
  private gripR = new THREE.Vector3();
  private footL = new THREE.Vector3();
  private footR = new THREE.Vector3();
  private armL: ReturnType<typeof findArm> = null;
  private armR: ReturnType<typeof findArm> = null;
  private legL: ReturnType<typeof findLeg> = null;
  private legR: ReturnType<typeof findLeg> = null;
  private posed = false;

  private physics: PhysicsWorld;
  private character: CharacterController;
  private solids: THREE.Object3D[];

  /** Set when a grab or a mantle lands, so the HUD/feel layer can react. */
  onEvent: ((kind: "grab" | "mantle" | "release") => void) | null = null;

  constructor(physics: PhysicsWorld, character: CharacterController, solids: THREE.Object3D[]) {
    this.physics = physics;
    this.character = character;
    this.solids = solids;
    this.ray.far = REACH;
  }

  setBody(root: THREE.Object3D): void {
    this.armL = findArm(root, "l");
    this.armR = findArm(root, "r");
    this.legL = findLeg(root, "l");
    this.legR = findLeg(root, "r");
  }

  get active(): boolean { return this.state !== "off"; }
  /** True while the body is held — the locomotion animator should stop walking. */
  get holding(): boolean { return this.state === "hang" || this.state === "chain"; }

  // ── finding something to hold ────────────────────────────────────────────

  /** A ledge in front of `from`, facing `yaw`. Returns the lip height and the
   *  wall's outward normal, or null.
   *
   *  Two probes, and both matter: forward finds the WALL, and a downward probe
   *  just past it finds the TOP. A forward hit alone is a wall you would slide
   *  down; it is the top surface within arm's reach that makes it a ledge. */
  private findLedge(from: THREE.Vector3, yaw: number): { y: number; n: THREE.Vector3 } | null {
    _fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw));
    const chest = _probe.copy(from).setY(from.y + 0.55);
    this.ray.far = REACH;
    this.ray.set(chest, _fwd);
    const wall = this.ray.intersectObjects(this.solids, false)[0];
    if (!wall) return null;
    const n = wall.face ? wall.face.normal.clone().normalize() : _fwd.clone().negate();
    if (Math.abs(n.y) > 0.45) return null;                     // a floor is not a wall

    // step past the face and look down for its top edge
    // start ABOVE the highest catchable lip — probing from below the top of the
    // reach band would silently miss exactly the stretch grabs it is there for
    const over = _probe.copy(wall.point).addScaledVector(_fwd, 0.28).setY(from.y + 2.7);
    this.ray.far = 3.2;
    this.ray.set(over, _down);
    const top = this.ray.intersectObjects(this.solids, false)[0];
    this.ray.far = REACH;
    if (!top) return null;
    const lip = top.point.y;
    // The catchable band is deliberately a STRETCH. Its floor is above anything
    // you could simply walk or step up, so low blocks stay walk-ups and never
    // steal a grab; its ceiling is a full reach overhead at the top of a jump,
    // so catching a high lip is exactly as far as Jack can go and no further.
    if (lip < from.y + 0.75 || lip > from.y + 2.35) return null;
    // and it has to be a top, not the underside of something
    if (top.face && top.face.normal.y < 0.5) return null;
    return { y: lip, n: n.y < 0 ? n.negate() : n };
  }

  /** A rope you can actually reach. Its foot hangs above head height, so this is
   *  a reach test, not a proximity test: standing under one is not holding it,
   *  and the jump is what closes the last of the distance. "Just enough." */
  private findChain(from: THREE.Vector3): (typeof CHAINS)[number] | null {
    const reachUp = from.y + 1.15;                 // fingertips at full stretch
    for (const c of CHAINS) {
      if (reachUp < c.foot || from.y > c.top + 0.4) continue;
      if (Math.hypot(from.x - c.x, from.z - c.z) < 1.25) return c;
    }
    return null;
  }

  // ── taking and giving back the body ──────────────────────────────────────

  private takeBody(): void {
    this.character.enabled = false;
    const b = this.character.body;
    b.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
    b.setLinvel({ x: 0, y: 0, z: 0 }, true);
  }

  private giveBody(vel?: { x: number; y: number; z: number }): void {
    const b = this.character.body;
    b.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
    b.setTranslation({ x: this.pos.x, y: this.pos.y, z: this.pos.z }, true);
    b.setLinvel(vel ?? { x: 0, y: 0, z: 0 }, true);
    this.physics.snapBodyInterpolation(b);
    this.character.enabled = true;
  }

  release(vel?: { x: number; y: number; z: number }): void {
    if (this.state === "off") return;
    this.state = "off";
    this.posed = false;
    this.chain = null;
    this.cooldown = 0.28;
    this.giveBody(vel);
    this.onEvent?.("release");
  }

  private grabLedge(lip: number, n: THREE.Vector3, at: THREE.Vector3): void {
    this.state = "hang";
    this.lipY = lip;
    this.normal.copy(n).setY(0).normalize();
    // hang OFF the lip: body centre below it, pushed out to the wall face
    this.pos.set(at.x, lip - HANG_DROP, at.z);
    this.pos.addScaledVector(this.normal, 0.34);
    this.takeBody();
    this.beginHold();
    this.onEvent?.("grab");
  }

  private grabChain(c: (typeof CHAINS)[number], at: THREE.Vector3): void {
    this.state = "chain";
    this.chain = c;
    // catch it at the bottom of the rope and HANG there — the body settles just
    // under its own hands rather than snapping up to the first rung
    this.pos.set(c.x, THREE.MathUtils.clamp(at.y, c.foot - 0.85, c.top - 1.25), c.z);
    // face the chain's line — arbitrary, but consistent, so the hands read
    this.normal.set(0, 0, 1);
    this.takeBody();
    this.beginHold();
    this.onEvent?.("grab");
  }

  /** Shared by every catch: hang first, and disarm the keys you caught it with. */
  private beginHold(): void {
    this.cycle = 0;
    this.settle = SETTLE;
    this.hangT = 0;
    const v = this.character.body.linvel();
    // arrive fast, swing hard — the amplitude is the evidence of your momentum
    this.swing = THREE.MathUtils.clamp(Math.hypot(v.x, v.y, v.z) / 11, 0.05, 0.34);
    this.armedJump = false;
    this.armedFwd = false;
    play(AUDIO.step, 0.55, 0.5);
  }

  // ── the loop ─────────────────────────────────────────────────────────────

  /** Call once per frame BEFORE the camera, like Cling. `yaw` is camera heading. */
  update(dt: number, input: TraverseInput, yaw: number): void {
    if (this.cooldown > 0) this.cooldown -= dt;

    if (this.state === "off") {
      if (this.cooldown > 0) return;
      const at = this.character.currPos;
      const chain = this.findChain(at);
      if (chain && (input.jump || !this.character.isOnGround)) { this.grabChain(chain, at); return; }
      // A ledge is caught in the AIR, the way it is in every game that does
      // this well — you jump at a lip and the hands find it. Grabbing from
      // standing would let you climb the world by walking into it.
      if (this.character.isOnGround) return;
      const led = this.findLedge(at, yaw);
      if (led) this.grabLedge(led.y, led.n, at);
      return;
    }

    if (this.state === "mantle") { this.stepMantle(dt); return; }
    if (this.state === "hang") this.stepHang(dt, input, yaw);
    else if (this.state === "chain") this.stepChain(dt, input);

    // drive the kinematic body wherever the state put it
    this.character.body.setNextKinematicTranslation({ x: this.pos.x, y: this.pos.y, z: this.pos.z });
    this.character.root.position.copy(this.pos);
  }

  private stepHang(dt: number, input: TraverseInput, yaw: number): void {
    this.hangT += dt;
    this.settle = Math.max(0, this.settle - dt);
    // a key already down when you caught the lip has to be let go first
    if (!input.jump) this.armedJump = true;
    if (input.forward <= 0.2) this.armedFwd = true;
    if (input.drop) { this.release(); return; }
    if (this.settle <= 0 &&
        ((input.jump && this.armedJump) || (input.forward > 0.2 && this.armedFwd))) {
      this.startMantle();
      return;
    }

    // shimmy along the lip — but only where the lip CONTINUES. Probing before
    // the move is what stops you sliding off the end of a ledge into mid-air
    // still in the hang pose.
    if (Math.abs(input.right) > 0.15) {
      _tan.set(-this.normal.z, 0, this.normal.x).normalize();
      const step = input.right * SHIMMY * dt;
      _v.copy(this.pos).addScaledVector(_tan, step);
      const probe = _probe.copy(_v).addScaledVector(this.normal, -0.34).setY(this.lipY - 0.5);
      const still = this.findLedge(probe, yaw);
      if (still && Math.abs(still.y - this.lipY) < 0.35) {
        this.pos.copy(_v);
        this.lipY = still.y;
        this.cycle = (this.cycle + Math.abs(step) / CYCLE_M) % 1;   // hands alternate
      }
    }
    this.poseHang();
  }

  private stepChain(dt: number, input: TraverseInput): void {
    const c = this.chain;
    if (!c) { this.release(); return; }
    this.hangT += dt;
    this.settle = Math.max(0, this.settle - dt);
    // you catch a rope by PRESSING jump, so the same press must not immediately
    // throw you off it again — that is why the ropes could not be held at all
    if (!input.jump) this.armedJump = true;
    if (input.drop) { this.release(); return; }
    if (input.jump && this.armedJump && this.settle <= 0) {
      // push off the chain rather than dropping down it
      const away = _v.set(Math.sin(this.cycle * 6.28) * 3, 5.4, Math.cos(this.cycle * 6.28) * 3);
      this.release({ x: away.x, y: away.y, z: away.z });
      return;
    }
    if (Math.abs(input.forward) > 0.15) {
      const step = input.forward * CLIMB * dt;
      this.pos.y = THREE.MathUtils.clamp(this.pos.y + step, c.foot - 0.85, c.top - 1.15);
      this.cycle = (this.cycle + Math.abs(step) / CYCLE_M) % 1;
      // stepping off the top onto whatever is up there
      if (this.pos.y >= c.top - 1.15 && input.forward > 0) { this.startMantle(); return; }
    }
    this.poseChain();
  }

  private startMantle(): void {
    // read the state BEFORE overwriting it — a chain has no lip to pull over,
    // so the target height comes from where you are on the line instead
    const fromChain = this.state === "chain";
    this.state = "mantle";
    this.mantleT = 0;
    this.mantleFrom.copy(this.pos);
    const top = fromChain ? this.pos.y + 1.4 : this.lipY;
    this.mantleTo.copy(this.pos)
      .addScaledVector(this.normal, -0.85)          // in over the lip
      .setY(top + 0.95);
  }

  private stepMantle(dt: number): void {
    this.mantleT += dt;
    const t = THREE.MathUtils.clamp(this.mantleT / MANTLE_TIME, 0, 1);
    // up first, then in — the shape of pulling yourself over an edge rather
    // than sliding through it diagonally
    const up = THREE.MathUtils.smoothstep(t, 0, 0.62);
    const inward = THREE.MathUtils.smoothstep(t, 0.35, 1);
    this.pos.set(
      THREE.MathUtils.lerp(this.mantleFrom.x, this.mantleTo.x, inward),
      THREE.MathUtils.lerp(this.mantleFrom.y, this.mantleTo.y, up),
      THREE.MathUtils.lerp(this.mantleFrom.z, this.mantleTo.z, inward),
    );
    this.character.body.setNextKinematicTranslation({ x: this.pos.x, y: this.pos.y, z: this.pos.z });
    this.character.root.position.copy(this.pos);
    this.poseMantle(t);
    if (t >= 1) {
      this.state = "off";
      this.posed = false;
      this.chain = null;
      this.cooldown = 0.2;
      this.giveBody();
      this.onEvent?.("mantle");
    }
  }

  // ── where the limbs actually are ─────────────────────────────────────────

  /** One hand planted, the other reaching — the phase decides which. Returns a
   *  0..1 reach amount per hand so the pose can lift and place them. */
  private handPhase(): { l: number; r: number } {
    const c = this.cycle;
    // Shaped, not sinusoidal. A raw sine has both hands drifting most of the
    // time; smoothstepping it gives a hand that sits STILL on its hold, then
    // moves decisively to the next one — which is what makes a slow climb read
    // as deliberate rather than as a slide.
    const ease = (x: number): number => THREE.MathUtils.smoothstep(x, 0.12, 0.88);
    const l = ease(Math.max(0, Math.sin(c * Math.PI * 2)));
    const r = ease(Math.max(0, -Math.sin(c * Math.PI * 2)));
    return { l, r };
  }

  /** How much the body is swinging right now: the momentum you arrived with,
   *  damping out into a slow idle sway so a held body is never dead still. */
  private sway(): number {
    const arrival = Math.sin(this.hangT * 7.2) * this.swing * Math.exp(-this.hangT * 2.4);
    const idle = Math.sin(this.hangT * 1.15) * 0.035 + Math.sin(this.hangT * 0.63) * 0.022;
    return arrival + idle;
  }

  private poseHang(): void {
    const { l, r } = this.handPhase();
    _tan.set(-this.normal.z, 0, this.normal.x).normalize();
    const face = _v.copy(this.normal).multiplyScalar(-0.30);
    // hands ON the lip; the reaching one lifts off and swings ahead of the body
    this.gripL.copy(this.pos).addScaledVector(_tan, -0.34 + l * 0.30).add(face)
      .setY(this.lipY + 0.06 + l * 0.16);
    this.gripR.copy(this.pos).addScaledVector(_tan, 0.34 + r * 0.30).add(face)
      .setY(this.lipY + 0.06 + r * 0.16);
    // feet braced on the wall below, taking some weight — a pure dangle reads
    // as a corpse on a hook
    // the legs hang and swing — the hands are anchored, so the weight below
    // them is the only thing that can show that this body has weight at all
    const sw = this.sway();
    const brace = _v.copy(this.normal).multiplyScalar(-0.16);
    this.footL.copy(this.pos).addScaledVector(_tan, -0.26 + sw * 1.6).add(brace)
      .setY(this.pos.y - 0.62 + r * 0.12 - Math.abs(sw) * 0.35);
    this.footR.copy(this.pos).addScaledVector(_tan, 0.26 + sw * 1.6).add(brace)
      .setY(this.pos.y - 0.62 + l * 0.12 - Math.abs(sw) * 0.35);
    this.posed = true;
  }

  private poseChain(): void {
    const c = this.chain;
    if (!c) return;
    const { l, r } = this.handPhase();
    // both hands on the line itself, stacked, alternating up it
    this.gripL.set(c.x - 0.10, this.pos.y + 0.78 + l * 0.34, c.z);
    this.gripR.set(c.x + 0.10, this.pos.y + 0.62 + r * 0.34, c.z);
    const sw = this.sway();
    this.footL.set(c.x - 0.16 + sw * 1.4, this.pos.y - 0.66 + r * 0.22, c.z + sw * 0.6);
    this.footR.set(c.x + 0.16 + sw * 1.4, this.pos.y - 0.66 + l * 0.22, c.z + sw * 0.6);
    this.posed = true;
  }

  private poseMantle(t: number): void {
    // hands stay on the lip until the hips clear it, then plant flat on the top
    _tan.set(-this.normal.z, 0, this.normal.x).normalize();
    const push = _v.copy(this.normal).multiplyScalar(-0.32 - t * 0.25);
    const y = this.lipY + 0.06 + THREE.MathUtils.smoothstep(t, 0.3, 1) * 0.1;
    this.gripL.copy(this.pos).addScaledVector(_tan, -0.34).add(push).setY(y);
    this.gripR.copy(this.pos).addScaledVector(_tan, 0.34).add(push).setY(y);
    this.footL.copy(this.pos).addScaledVector(_tan, -0.24).setY(this.pos.y - 0.7);
    this.footR.copy(this.pos).addScaledVector(_tan, 0.24).setY(this.pos.y - 0.7);
    this.posed = true;
  }

  /** Additive limb pose — call AFTER the mixer writes bones, or the clip wins. */
  poseLimbs(): void {
    if (!this.posed || this.state === "off") return;
    const b = this.character.root.position;
    if (this.armL) {
      solveTwoBone(this.armL.upper, this.armL.lower, this.armL.hand, this.gripL,
        _pole.copy(b).add(new THREE.Vector3(-2.5, -1.5, 0)));
    }
    if (this.armR) {
      solveTwoBone(this.armR.upper, this.armR.lower, this.armR.hand, this.gripR,
        _pole.copy(b).add(new THREE.Vector3(2.5, -1.5, 0)));
    }
    if (this.legL) {
      solveTwoBone(this.legL.upper, this.legL.lower, this.legL.hand, this.footL,
        _pole.copy(b).add(new THREE.Vector3(-2.5, -2, 0)));
    }
    if (this.legR) {
      solveTwoBone(this.legR.upper, this.legR.lower, this.legR.hand, this.footR,
        _pole.copy(b).add(new THREE.Vector3(2.5, -2, 0)));
    }
  }

  /** Which way the body should face while holding on — into the wall. */
  get facing(): number | null {
    if (!this.holding && this.state !== "mantle") return null;
    return Math.atan2(-this.normal.x, -this.normal.z);
  }
}
