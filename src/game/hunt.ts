// The loop: collect cells, survive the Stalker, reach the extraction bay.
// Everything the HUD shows and everything that ends a run lives here.
import * as THREE from "three";
import { AUDIO } from "../assets.ts";
import { play } from "../audio.ts";

export const NEED_CELLS = 5;
export const EXTRACTION = new THREE.Vector3(58, 2, 0); // matches the bay platform

export type Outcome = "playing" | "won" | "lost";

/** Where the cells sit — spread so collecting them walks you past every part of
 *  the floor, which is what puts you where the Stalker can find you. */
const CELL_SPOTS: Array<[number, number, number]> = [
  [-58, 1, 34], [-46, 7, -28], [-6, 1, 34], [14, 7, 22],
  [34, 1, -34], [-24, 1, -34], [46, 7, 26], [4, 1, -6],
];

export interface HuntOpts {
  maxHp: number;
  /** Cells needed to open extraction. 0 = the beast, which wins by killing. */
  needCells: number;
}

export class Hunt {
  hp: number;
  maxHp: number;
  needCells: number;
  cells = 0;
  outcome: Outcome = "playing";
  extractionOpen = false;

  private pickups: THREE.Mesh[] = [];
  private hurtAt = -99;

  private scene: THREE.Scene;

  constructor(scene: THREE.Scene, opts: HuntOpts = { maxHp: 5, needCells: NEED_CELLS }) {
    this.scene = scene;
    this.hp = opts.maxHp;
    this.maxHp = opts.maxHp;
    this.needCells = opts.needCells;
    const geo = new THREE.BoxGeometry(0.5, 0.9, 0.5);
    for (const [x, y, z] of CELL_SPOTS) {
      const mat = new THREE.MeshStandardMaterial({
        color: 0x2ad06a,
        emissive: 0x1f9c50,
        emissiveIntensity: 2.2,
        roughness: 0.35,
      });
      const cell = new THREE.Mesh(geo, mat);
      cell.position.set(x, y + 0.6, z);
      cell.castShadow = true;
      this.scene.add(cell);
      // a small light each, so they read as the only friendly thing in the dark
      const glow = new THREE.PointLight(0x35e07a, 5, 9, 2);
      glow.position.y = 0.4;
      cell.add(glow);
      this.pickups.push(cell);
    }

    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(5, 5, 0.25, 24),
      new THREE.MeshStandardMaterial({ color: 0x30435c, emissive: 0x14202e, emissiveIntensity: 1 }),
    );
    pad.position.copy(EXTRACTION).setY(2.15);
    pad.receiveShadow = true;
    this.scene.add(pad);
    this.pad = pad;
  }

  private pad: THREE.Mesh;

  get invulnerable(): boolean { return performance.now() / 1000 - this.hurtAt < 1.0; }

  damage(amount: number): void {
    if (this.outcome !== "playing" || this.invulnerable) return;
    this.hurtAt = performance.now() / 1000;
    this.hp -= amount;
    play(AUDIO.claw, 0.7);
    if (this.hp <= 0) { this.hp = 0; this.outcome = "lost"; }
  }

  update(dt: number, player: THREE.Vector3): void {
    if (this.outcome !== "playing") return;

    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const cell = this.pickups[i];
      cell.rotation.y += dt * 1.8;
      cell.position.y += Math.sin(performance.now() / 480 + i) * dt * 0.35;
      if (cell.position.distanceTo(player) < 2.4) {
        this.scene.remove(cell);
        this.pickups.splice(i, 1);
        this.cells++;
        play(AUDIO.step, 0.5, 1.9);
      }
    }

    this.extractionOpen = this.needCells > 0 && this.cells >= this.needCells;
    const padMat = this.pad.material as THREE.MeshStandardMaterial;
    padMat.emissive.setHex(this.extractionOpen ? 0x2ad06a : 0x14202e);
    padMat.emissiveIntensity = this.extractionOpen ? 2.4 : 1;

    if (this.extractionOpen && player.distanceTo(EXTRACTION) < 5.5) this.outcome = "won";
  }

  /** The other hunter is dead — the win both sides share. */
  foeDown(): void { if (this.outcome === "playing") this.outcome = "won"; }
}
