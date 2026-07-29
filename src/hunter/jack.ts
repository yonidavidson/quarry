// AI Jack — the nemesis you face when you play the Stalker.
//
// He is the inverse of the beast: no vertical game at all, but he wins any fight
// he can see coming. So his whole behaviour is about range. He backs off when you
// close, shoots the moment he has line of sight, and puts the machine blocks
// between you. Losing him means breaking that line — which is exactly what the
// ceiling is for.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { AUDIO, MODELS } from "../assets.ts";
import { pickModel } from "../controllers/quality/pick-asset.ts";
import { detectTier } from "../controllers/quality/tier.ts";
import { play, playAt } from "../audio.ts";
import { HALL } from "../world/complex.ts";
import { BodyAnim } from "../anim/body-anim.ts";
import { flashBody, sparkBurst } from "../fx/hits.ts";

export type JackState = "patrol" | "engage" | "backpedal" | "reload";

const SPEED = { patrol: 3.6, engage: 4.4, backpedal: 5.2 } as const;
const SIGHT = 55;
const KEEP_AWAY = 14;   // he wants at least this much between you
const SHOT_CD = 1.05;

export interface JackOpts {
  damage: number;
  onHitPlayer: (damage: number) => void;
}

export class JackAI {
  readonly root = new THREE.Group();
  state: JackState = "patrol";
  hp = 5;
  alive = true;

  private t = 0;
  private shotCd = 0;
  private senseAt = 2.5;   // a couple of seconds before he is a threat at all
  private life = 0;
  private lastKnown = new THREE.Vector3();
  private waypoint = new THREE.Vector3();
  private prevPos = new THREE.Vector3();
  private anim?: BodyAnim;
  private tracers: Array<{ line: THREE.Line; life: number }> = [];

  private scene: THREE.Scene;
  private opts: JackOpts;

  constructor(scene: THREE.Scene, opts: JackOpts) {
    this.scene = scene;
    this.opts = opts;
    const stub = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.34, 1.1, 6, 10),
      new THREE.MeshStandardMaterial({ color: 0x5a6b46, roughness: 0.85 }),
    );
    stub.position.y = 0.9;
    stub.castShadow = true;
    this.root.add(stub);
    this.root.position.set(-45, 0, 28);
    scene.add(this.root);
    this.pickWaypoint();

    new GLTFLoader().load(pickModel(MODELS.jack, detectTier()), (gltf) => {
      const body = gltf.scene;
      body.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
      const box = new THREE.Box3().setFromObject(body);
      const h = box.max.y - box.min.y || 1.8;
      const s = 1.8 / h;
      body.scale.setScalar(s);
      body.position.y = -box.min.y * s;
      this.root.remove(stub);
      this.root.add(body);
      if (gltf.animations.length) this.anim = new BodyAnim(body, gltf.animations);
    }, undefined, () => { /* the stand-in is a worse Jack, not no Jack */ });
  }

  get position(): THREE.Vector3 { return this.root.position; }

  /** Drives the HUD's threat read when you are the predator: how exposed you are. */
  pressure(player: THREE.Vector3): number {
    if (!this.alive) return 0;
    const d = this.root.position.distanceTo(player);
    return Math.min(1, Math.max(0, 1 - d / SIGHT) + (this.state === "engage" ? 0.3 : 0));
  }

  takeHit(damage: number): void {
    if (!this.alive) return;
    this.hp -= damage;
    play(AUDIO.claw, 0.6);
    flashBody(this.root, 0xff5a3c);
    sparkBurst(this.scene, this.root.position.clone().setY(1.3), 0xff9a70, 14);
    if (this.hp <= 0) { this.alive = false; this.dying = 0.001; return; }
    this.state = "backpedal";
    this.t = 0;
  }

  private pickWaypoint(): void {
    this.waypoint.set(
      (Math.random() - 0.5) * (HALL.w - 26),
      0,
      (Math.random() - 0.5) * (HALL.d - 26),
    );
  }

  private dying = 0;

  update(dt: number, player: THREE.Vector3, visible: boolean): void {
    if (!this.alive) {
      if (this.dying > 0 && this.dying < 1.6) {
        this.dying += dt;
        this.root.rotation.x = Math.min(this.dying * 1.5, Math.PI / 2.1);
      }
      return;
    }
    this.life += dt;
    if (this.life < this.senseAt) visible = false;
    this.t += dt;
    if (this.shotCd > 0) this.shotCd -= dt;
    if (visible) this.lastKnown.copy(player);

    const flat = new THREE.Vector3(player.x - this.root.position.x, 0, player.z - this.root.position.z);
    const dist = flat.length();

    if (visible && dist < SIGHT) {
      this.state = dist < KEEP_AWAY ? "backpedal" : "engage";
    } else if (this.state !== "patrol" && this.t > 4) {
      this.state = "patrol";
      this.pickWaypoint();
    }

    switch (this.state) {
      case "patrol": {
        this.moveToward(this.waypoint, dt, SPEED.patrol);
        if (this.root.position.distanceTo(this.waypoint) < 3) this.pickWaypoint();
        break;
      }
      case "engage": {
        // hold the range he wants and shoot from it
        const want = this.root.position.clone().addScaledVector(flat.clone().normalize(), dist - KEEP_AWAY - 4);
        this.moveToward(want, dt, SPEED.engage);
        if (visible) this.tryShoot(player);
        break;
      }
      case "backpedal": {
        // too close — walk away while still firing
        const away = this.root.position.clone().addScaledVector(flat.clone().normalize(), -18);
        this.moveToward(away, dt, SPEED.backpedal);
        if (visible) this.tryShoot(player);
        break;
      }
    }

    this.faceTravel(dt, visible ? player : null);
    this.anim?.update(dt, this.root.position);
    this.updateTracers(dt);
  }

  /** He shoots often and hits sometimes. A hitscan that never misses reads as
   *  unfair and, worse, it kills the beast before it can reach a wall — which
   *  deletes the whole vertical game. Accuracy falls off with range, and a miss
   *  still draws its tracer so you can see how close it came. */
  private tryShoot(player: THREE.Vector3): void {
    if (this.shotCd > 0) return;
    this.shotCd = SHOT_CD;
    const from = this.root.position.clone().setY(1.5);
    const dist = from.distanceTo(player);
    const accuracy = THREE.MathUtils.clamp(1 - dist / SIGHT, 0.18, 0.72);
    const hit = Math.random() < accuracy;
    const to = player.clone().setY(1.3);
    if (!hit) {
      // spray it past you rather than into you
      to.x += (Math.random() - 0.5) * 4;
      to.y += (Math.random() - 0.5) * 2;
      to.z += (Math.random() - 0.5) * 4;
    }
    this.addTracer(from, to);
    playAt(AUDIO.blaster, from, this.scene, 0.5, 22);
    if (hit) this.opts.onHitPlayer(this.opts.damage);
  }

  private addTracer(from: THREE.Vector3, to: THREE.Vector3): void {
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([from, to]),
      new THREE.LineBasicMaterial({ color: 0xbfe4ff, transparent: true, opacity: 0.9 }),
    );
    this.scene.add(line);
    this.tracers.push({ line, life: 0.1 });
  }

  private updateTracers(dt: number): void {
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.life -= dt;
      const m = t.line.material as THREE.LineBasicMaterial;
      m.opacity = Math.max(0, t.life / 0.1);
      if (t.life <= 0) {
        this.scene.remove(t.line);
        t.line.geometry.dispose();
        m.dispose();
        this.tracers.splice(i, 1);
      }
    }
  }

  private moveToward(target: THREE.Vector3, dt: number, speed: number): void {
    const p = this.root.position;
    const to = new THREE.Vector3(target.x - p.x, 0, target.z - p.z);
    const d = to.length();
    if (d < 0.001) return;
    to.normalize().multiplyScalar(Math.min(speed * dt, d));
    p.add(to);
    p.x = THREE.MathUtils.clamp(p.x, -HALL.w / 2 + 3, HALL.w / 2 - 3);
    p.z = THREE.MathUtils.clamp(p.z, -HALL.d / 2 + 3, HALL.d / 2 - 3);
    p.y = 0;
  }

  /** He looks at you when he can see you, and at where he is going otherwise. */
  private faceTravel(dt: number, lookAt: THREE.Vector3 | null): void {
    const delta = lookAt
      ? new THREE.Vector3(lookAt.x - this.root.position.x, 0, lookAt.z - this.root.position.z)
      : new THREE.Vector3().subVectors(this.root.position, this.prevPos);
    this.prevPos.copy(this.root.position);
    if (delta.lengthSq() < 1e-6) return;
    const want = Math.atan2(delta.x, delta.z);
    let diff = want - this.root.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.root.rotation.y += diff * Math.min(1, dt * 9);
  }
}
