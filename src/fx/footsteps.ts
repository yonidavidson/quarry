// Footsteps. The game is about hearing something before you see it, and until
// now every body in it moved in total silence — including the thing hunting you.
//
// Steps are spaced by DISTANCE, not by a timer: a stride is a stride whether you
// are walking or sprinting, so the cadence speeds up on its own and never
// drifts out of sync with the legs. Remotes and the AI get positional steps,
// which is the point — the Stalker's approach should be audible from across the
// hall before it is visible.
import * as THREE from "three";
import { AUDIO } from "../assets.ts";
import { play, playAt } from "../audio.ts";

/** Metres between footfalls. Roughly a stride for a person; the beast is heavier
 *  and covers more ground per step. */
const STRIDE = { light: 1.9, heavy: 2.6 } as const;

export class Footsteps {
  private travelled = 0;
  private prev = new THREE.Vector3();
  private started = false;
  private left = false;

  private readonly heavy: boolean;

  constructor(heavy = false) { this.heavy = heavy; }

  /**
   * @param pos    where the body is now
   * @param local  true for the player's own body (2D sound, always audible);
   *               false for anything else, which gets positional audio
   */
  update(pos: THREE.Vector3, local: boolean, scene: THREE.Scene, airborne = false): void {
    if (!this.started) { this.prev.copy(pos); this.started = true; return; }
    const moved = pos.distanceTo(this.prev);
    this.prev.copy(pos);
    // a body in the air is not stepping, and a teleport is not travel
    if (airborne || moved > 3) return;
    this.travelled += moved;

    const stride = this.heavy ? STRIDE.heavy : STRIDE.light;
    if (this.travelled < stride) return;
    this.travelled -= stride;

    // alternate feet — same clip, slightly detuned, so it does not read as a loop
    this.left = !this.left;
    const rate = (this.heavy ? 0.72 : 1.0) * (this.left ? 0.96 : 1.05);
    const vol = this.heavy ? 0.5 : 0.32;
    if (local) play(AUDIO.step, vol * 0.7, rate);
    else playAt(AUDIO.step, pos, scene, vol, 14);
  }

  /** After a teleport or respawn, so the next step is not a phantom stride. */
  reset(pos: THREE.Vector3): void {
    this.prev.copy(pos);
    this.travelled = 0;
  }
}
