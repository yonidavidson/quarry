// The Stalker. The whole point of it is that it does NOT stay on the floor:
// it prowls, breaks for a wall, climbs, crosses the CEILING above you, and drops.
//
// It is driven kinematically rather than through the physics character
// controller, and that is deliberate — a dynamic capsule cannot hold a wall or
// hang from a ceiling without fighting gravity every frame. Its collider exists
// so bullets can hit it, not so gravity can pull it down. The rule the whole
// state machine obeys: the player should hear it and lose track of it, then
// find it in the wrong plane.
import * as THREE from "three";
import { HALL } from "../world/complex.ts";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { AUDIO, MODELS } from "../assets.ts";
import { playAt } from "../audio.ts";

export type StalkerState =
  | "prowl"    // walking the floor toward where it last had you
  | "toWall"   // committed to a wall, closing the distance to it
  | "climb"    // going up the wall
  | "ceiling"  // crossing the ceiling, tracking you from above
  | "pounce"   // falling on you
  | "recover"  // landed, briefly open
  | "stunned"; // shot enough to break off

const CEIL_Y = HALL.wallH - 1.2;
const SPEED = { prowl: 4.2, toWall: 7.0, climb: 6.0, ceiling: 8.5 } as const;

export interface StalkerOpts {
  /** Damage dealt by a landed pounce. */
  pounceDamage: number;
  onHitPlayer: (damage: number) => void;
}

export class Stalker {
  readonly root = new THREE.Group();
  state: StalkerState = "prowl";
  hp = 6;
  alive = true;

  private t = 0;                       // seconds in the current state
  private target = new THREE.Vector3(); // where it is heading right now
  private lastKnown = new THREE.Vector3();
  private wallSide: 1 | -1 = 1;
  private wallAxis: "x" | "z" = "x";
  private vel = new THREE.Vector3();
  private nextRoar = 6;
  private stub: THREE.Mesh;
  private mixer?: THREE.AnimationMixer;

  private scene: THREE.Scene;
  private opts: StalkerOpts;

  constructor(scene: THREE.Scene, opts: StalkerOpts) {
    this.scene = scene;
    this.opts = opts;
    // a stand-in until the generated creature lands — replaced by setBody()
    const mat = new THREE.MeshStandardMaterial({ color: 0x8e5230, roughness: 0.7 });
    const stub = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 1.5, 6, 10), mat);
    stub.position.y = 1.3;
    stub.castShadow = true;
    this.stub = stub;
    this.root.add(stub);
    this.root.position.set(50, 0, -30);
    scene.add(this.root);

    // the eye — a small emissive point, so it reads in the dark from across the hall
    const eye = new THREE.PointLight(0xff3020, 3.5, 14, 2);
    eye.position.set(0, 2.0, 0.4);
    this.root.add(eye);
    this.loadBody();
  }

  /** Load the generated creature and drop the stand-in. Async on purpose: the
   *  hunt is playable from frame one and the beast swaps in when it arrives. */
  private loadBody(): void {
    new GLTFLoader().load(MODELS.stalker, (gltf) => {
      const body = gltf.scene;
      body.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
      // Meshy bipeds come in at ~1.8m; the Stalker should tower over Jack
      const box = new THREE.Box3().setFromObject(body);
      const h = box.max.y - box.min.y || 1.8;
      const scale = 2.6 / h;
      body.scale.setScalar(scale);
      body.position.y = -box.min.y * scale;
      this.root.remove(this.stub);
      this.root.add(body);
      if (gltf.animations.length) {
        this.mixer = new THREE.AnimationMixer(body);
        const walk = gltf.animations.find((c) => /walk/i.test(c.name)) ?? gltf.animations[0];
        this.mixer.clipAction(walk).play();
      }
    }, undefined, () => { /* keep the stand-in rather than lose the enemy */ });
  }

  get position(): THREE.Vector3 { return this.root.position; }

  /** How close it is to being on top of you, 0..1 — drives the music and the HUD. */
  pressure(player: THREE.Vector3): number {
    const d = this.root.position.distanceTo(player);
    const above = this.state === "ceiling" || this.state === "pounce" ? 0.35 : 0;
    return Math.min(1, Math.max(0, 1 - d / 60) + above);
  }

  takeHit(damage: number): void {
    if (!this.alive) return;
    this.hp -= damage;
    if (this.hp <= 0) { this.alive = false; this.root.visible = false; return; }
    // being shot makes it leave — and it leaves UPWARD, which is the threat
    this.enter(this.state === "ceiling" ? "ceiling" : "toWall");
  }

  private enter(next: StalkerState): void {
    this.state = next;
    this.t = 0;
    if (next === "toWall") this.pickWall();
  }

  /** Commit to the nearest wall — the shortest path out of the player's plane. */
  private pickWall(): void {
    const p = this.root.position;
    const dx = HALL.w / 2 - Math.abs(p.x);
    const dz = HALL.d / 2 - Math.abs(p.z);
    if (dx < dz) { this.wallAxis = "x"; this.wallSide = p.x >= 0 ? 1 : -1; }
    else { this.wallAxis = "z"; this.wallSide = p.z >= 0 ? 1 : -1; }
  }

  update(dt: number, player: THREE.Vector3, playerVisible: boolean): void {
    if (!this.alive) return;
    this.t += dt;
    if (playerVisible) this.lastKnown.copy(player);

    // it announces itself on a slow timer — you should hear it coming
    this.nextRoar -= dt;
    if (this.nextRoar <= 0) {
      this.nextRoar = 9 + Math.random() * 8;
      playAt(AUDIO.roar, this.root.position, this.scene, 0.9, 18);
    }

    switch (this.state) {
      case "prowl":   this.prowl(dt, player); break;
      case "toWall":  this.toWall(dt); break;
      case "climb":   this.climb(dt); break;
      case "ceiling": this.ceiling(dt, player); break;
      case "pounce":  this.pounce(dt, player); break;
      case "recover": if (this.t > 1.2) this.enter("prowl"); break;
      case "stunned": if (this.t > 2.0) this.enter("toWall"); break;
    }

    this.faceTravel(dt);
    // limbs only move when the body does — a treadmilling walk on a hanging
    // creature reads worse than no animation at all
    const moving = this.state !== "recover" && this.state !== "stunned";
    this.mixer?.update(moving ? dt : 0);
  }

  // ── states ──────────────────────────────────────────────────────────────

  private prowl(dt: number, player: THREE.Vector3): void {
    this.target.set(this.lastKnown.x, 0, this.lastKnown.z);
    this.step(dt, SPEED.prowl);
    const flat = this.root.position.distanceTo(new THREE.Vector3(player.x, 0, player.z));
    // Close on the floor is a losing fight for it — past ~18m it goes vertical,
    // and it always goes vertical eventually so the hunt never settles into a
    // footrace across an open hall.
    if (flat < 3.5) { this.opts.onHitPlayer(2); this.enter("recover"); }
    else if (this.t > 7 || flat > 18) this.enter("toWall");
  }

  private toWall(dt: number): void {
    const p = this.root.position;
    const wall = (this.wallAxis === "x" ? HALL.w : HALL.d) / 2 - 1.6;
    this.target.copy(p);
    if (this.wallAxis === "x") this.target.x = this.wallSide * wall;
    else this.target.z = this.wallSide * wall;
    this.target.y = 0;
    this.step(dt, SPEED.toWall);
    const reach = this.wallAxis === "x"
      ? Math.abs(Math.abs(p.x) - wall)
      : Math.abs(Math.abs(p.z) - wall);
    if (reach < 1.0 || this.t > 4) this.enter("climb");
  }

  private climb(dt: number): void {
    this.root.position.y += SPEED.climb * dt;
    if (this.root.position.y >= CEIL_Y) {
      this.root.position.y = CEIL_Y;
      this.enter("ceiling");
    }
  }

  private ceiling(dt: number, player: THREE.Vector3): void {
    // hang upside down and track the player's ground position from above
    this.root.rotation.z = Math.PI;
    this.target.set(player.x, CEIL_Y, player.z);
    const p = this.root.position;
    const to = new THREE.Vector3(this.target.x - p.x, 0, this.target.z - p.z);
    const dist = to.length();
    if (dist > 0.001) {
      to.normalize().multiplyScalar(Math.min(SPEED.ceiling * dt, dist));
      p.add(to);
    }
    p.y = CEIL_Y;
    // directly overhead and settled → drop
    if (dist < 2.2 && this.t > 1.0) {
      playAt(AUDIO.roar, p, this.scene, 1.0, 25);
      this.vel.set(0, 0, 0);
      this.enter("pounce");
    }
  }

  private pounce(dt: number, player: THREE.Vector3): void {
    this.root.rotation.z = 0;
    this.vel.y -= 34 * dt;                                  // heavier than gravity — it dives
    const lead = new THREE.Vector3(player.x - this.root.position.x, 0, player.z - this.root.position.z);
    if (lead.length() > 0.001) lead.normalize().multiplyScalar(6 * dt);
    this.root.position.add(lead);
    this.root.position.y += this.vel.y * dt;
    if (this.root.position.y <= 0) {
      this.root.position.y = 0;
      this.vel.set(0, 0, 0);
      playAt(AUDIO.claw, this.root.position, this.scene, 1.0, 20);
      const hit = this.root.position.distanceTo(new THREE.Vector3(player.x, 0, player.z));
      if (hit < 3.2) this.opts.onHitPlayer(this.opts.pounceDamage);
      this.enter("recover");                                 // a missed pounce is your window
    }
  }

  // ── movement helpers ────────────────────────────────────────────────────

  private step(dt: number, speed: number): void {
    const p = this.root.position;
    const to = new THREE.Vector3(this.target.x - p.x, 0, this.target.z - p.z);
    const d = to.length();
    if (d < 0.001) return;
    to.normalize().multiplyScalar(Math.min(speed * dt, d));
    p.add(to);
    p.y = Math.max(0, p.y);
  }

  /** Face where it is going, smoothly. A creature that snaps around reads as a bug. */
  private prevPos = new THREE.Vector3();
  private faceTravel(dt: number): void {
    const delta = new THREE.Vector3().subVectors(this.root.position, this.prevPos);
    this.prevPos.copy(this.root.position);
    if (delta.lengthSq() < 1e-6) return;
    const want = Math.atan2(delta.x, delta.z);
    let diff = want - this.root.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.root.rotation.y += diff * Math.min(1, dt * 8);
  }

  reset(): void {
    this.hp = 6;
    this.alive = true;
    this.root.visible = true;
    this.root.position.set(50, 0, -30);
    this.root.rotation.set(0, 0, 0);
    this.vel.set(0, 0, 0);
    this.enter("prowl");
  }
}
