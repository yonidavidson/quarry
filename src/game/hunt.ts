// The loop: collect cells, survive the Stalker, reach the extraction bay.
// Everything the HUD shows and everything that ends a run lives here.
import * as THREE from "three";
import { AUDIO } from "../assets.ts";
import { play } from "../audio.ts";

export const NEED_CELLS = 5;
export const EXTRACTION = new THREE.Vector3(58, 2, 0); // matches the bay platform

export type Outcome = "playing" | "won" | "lost" | "abandoned";
/** HOW the run ended — the end screen has to say something true. */
export type WinReason = "kill" | "extract" | null;

/** Where the cells sit.
 *
 *  These used to sit almost entirely on the floor, which quietly made the whole
 *  climbing game optional — you could win without ever leaving the ground, so
 *  every ledge, rope and vine was decoration. Now the run is a LADDER: two are
 *  cheap and on the floor to get you moving, the rest are on the low ledge ring,
 *  the high ring at 14 m, a hanging platform and the beam run at the top. The
 *  last one is up where the beast lives, which is the point — the cell you need
 *  most is in the place it is most dangerous to be. */
const CELL_SPOTS: Array<[number, number, number]> = [
  [-58, 1, 34], [4, 1, -6],              // ground: the first two, to get you going
  [-46, 7, -28], [46, 7, 26],            // the 6 m ledge ring — one mantle up
  [-22, 7.2, 26], [24, 7.2, -28],        // the hanging platforms — a vine or a rope
  [-48, 15, 0], [48, 15, 0],             // the 14 m ring — a real climb
  [0, 25.6, -12.3], [-16, 25.6, 12.3],   // the beam run, where the beast crosses
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
  winReason: WinReason = null;
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
      // A beam standing straight up out of it. Under a midday sun a small green
      // box thirty metres up a wall is invisible, and a climb you cannot see the
      // reason for is just a wall — the beacon is what turns the cells on the
      // high ledges into a plan you make from the floor.
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.30, 0.46, 26, 10, 1, true),
        new THREE.MeshBasicMaterial({
          color: 0x4dff96, transparent: true, opacity: 0.11,
          blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
        }),
      );
      beam.position.y = 13;
      beam.renderOrder = 2;
      cell.add(beam);
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

    if (this.extractionOpen && player.distanceTo(EXTRACTION) < 5.5) {
      this.outcome = "won";
      this.winReason = "extract";
    }
  }

  /** The opponent left. Not a win and not a loss — say so rather than pretending. */
  abandon(): void { if (this.outcome === "playing") this.outcome = "abandoned"; }

  /** The other hunter is dead — the win both sides share. */
  foeDown(): void {
    if (this.outcome !== "playing") return;
    this.outcome = "won";
    this.winReason = "kill";
  }
}
