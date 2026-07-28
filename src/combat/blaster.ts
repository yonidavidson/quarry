// Jack's blaster. Hitscan down the camera's forward axis — with the pointer
// locked, where you look IS where you aim, so there is no second aiming model
// to keep in sync. The tracer is cosmetic; the hit is decided the frame you fire.
import * as THREE from "three";
import { AUDIO } from "../assets.ts";
import { play } from "../audio.ts";

const RANGE = 90;
const COOLDOWN = 0.22;

interface Tracer { line: THREE.Line; life: number }

export class Blaster {
  private cooldown = 0;
  private tracers: Tracer[] = [];
  private ray = new THREE.Raycaster();
  private muzzle = new THREE.PointLight(0x9fd4ff, 0, 10, 2);

  private scene: THREE.Scene;
  private camera: THREE.Camera;

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;
    scene.add(this.muzzle);
    this.ray.far = RANGE;
  }

  get ready(): boolean { return this.cooldown <= 0; }

  /** @returns true when the shot connected with `targets`. */
  fire(targets: THREE.Object3D[], solids: THREE.Object3D[]): boolean {
    if (this.cooldown > 0) return false;
    this.cooldown = COOLDOWN;

    const origin = new THREE.Vector3();
    const dir = new THREE.Vector3();
    this.camera.getWorldPosition(origin);
    this.camera.getWorldDirection(dir);
    this.ray.set(origin, dir);

    // a wall between you and it eats the shot — cover has to actually work
    const wall = this.ray.intersectObjects(solids, false)[0];
    const hit = this.ray.intersectObjects(targets, true)[0];
    const blocked = wall && hit ? wall.distance < hit.distance : !!wall && !hit;
    const end = origin.clone().addScaledVector(dir, hit && !blocked ? hit.distance : wall ? wall.distance : RANGE);

    this.addTracer(origin.clone().addScaledVector(dir, 0.6), end);
    this.muzzle.position.copy(origin).addScaledVector(dir, 1);
    this.muzzle.intensity = 26;
    play(AUDIO.blaster, 0.55, 0.95 + Math.random() * 0.1);

    return !!hit && !blocked;
  }

  private addTracer(from: THREE.Vector3, to: THREE.Vector3): void {
    const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
    const line = new THREE.Line(
      geo,
      new THREE.LineBasicMaterial({ color: 0xbfe4ff, transparent: true, opacity: 0.95 }),
    );
    this.scene.add(line);
    this.tracers.push({ line, life: 0.08 });
  }

  update(dt: number): void {
    if (this.cooldown > 0) this.cooldown -= dt;
    this.muzzle.intensity = Math.max(0, this.muzzle.intensity - dt * 220);
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.life -= dt;
      const mat = t.line.material as THREE.LineBasicMaterial;
      mat.opacity = Math.max(0, t.life / 0.08);
      if (t.life <= 0) {
        this.scene.remove(t.line);
        t.line.geometry.dispose();
        mat.dispose();
        this.tracers.splice(i, 1);
      }
    }
  }
}
