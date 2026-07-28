// Speed-driven animation for any body the platform's CharacterAnimations does
// not own — the two AI hunters and the beast the player wears.
//
// The bug this replaces: every one of them built a mixer and called
// `clipAction(walk).play()` once, forever, at a fixed rate. A standing character
// walked on the spot, a sprinting one walked in slow motion, and a creature
// hanging from the ceiling kept striding. The clips are in-place, so the body is
// translated by code — which means the ONLY thing that can keep the feet honest
// is matching playback rate to real speed. That is the whole idea here, and it
// is the same one the 2D game used (`quarry-2d-final` gates animSpeed on carried
// velocity rather than on "am I in the run state").
import * as THREE from "three";

type Gait = "idle" | "walk" | "run";

/** Metres per second each clip looks correct at. Playback is scaled against
 *  these, so a body moving at 3 m/s on a 1.6 m/s walk plays it ~1.9x. */
const REFERENCE: Record<Gait, number> = { idle: 1, walk: 1.6, run: 4.5 };
const WALK_ABOVE = 0.35;
const RUN_ABOVE = 3.2;
const FADE = 0.18;

function pick(clips: THREE.AnimationClip[], re: RegExp): THREE.AnimationClip | undefined {
  return clips.find((c) => re.test(c.name));
}

export class BodyAnim {
  private mixer: THREE.AnimationMixer;
  private actions = new Map<Gait, THREE.AnimationAction>();
  private current: Gait | null = null;
  private prev = new THREE.Vector3();
  private started = false;

  constructor(root: THREE.Object3D, clips: THREE.AnimationClip[]) {
    this.mixer = new THREE.AnimationMixer(root);
    const walk = pick(clips, /walk/i) ?? clips[0];
    const run = pick(clips, /run|sprint/i) ?? walk;
    // Not every generated body ships an idle. Falling back to the walk clip and
    // letting the speed scaling crawl it is much better than a frozen bind pose,
    // which reads as a crashed character.
    const idle = pick(clips, /idle|stand/i) ?? walk;
    if (!walk) return;
    for (const [gait, clip] of [["idle", idle], ["walk", walk], ["run", run]] as const) {
      if (!clip) continue;
      const a = this.mixer.clipAction(clip);
      a.setLoop(THREE.LoopRepeat, Infinity);
      a.enabled = true;
      this.actions.set(gait, a);
    }
  }

  /** Call once per render frame with the body's world position. Speed is derived
   *  here rather than passed in, so a body moved by physics, by a state machine
   *  or by a kinematic climb all animate off the same truth: did it move. */
  update(dt: number, pos: THREE.Vector3, opts: { frozen?: boolean } = {}): void {
    if (this.actions.size === 0) return;
    if (!this.started) { this.prev.copy(pos); this.started = true; }

    const moved = pos.distanceTo(this.prev);
    this.prev.copy(pos);
    const speed = dt > 0 ? moved / dt : 0;

    // `frozen` is for a body that is holding on rather than travelling — a
    // stalker hanging from the ceiling must not treadmill.
    const gait: Gait = opts.frozen || speed < WALK_ABOVE ? "idle"
      : speed < RUN_ABOVE ? "walk" : "run";

    if (gait !== this.current) {
      const next = this.actions.get(gait);
      const prevAction = this.current ? this.actions.get(this.current) : undefined;
      if (next) {
        next.reset().play();
        if (prevAction && prevAction !== next) next.crossFadeFrom(prevAction, FADE, false);
        this.current = gait;
      }
    }

    const action = this.current ? this.actions.get(this.current) : undefined;
    if (action) {
      action.timeScale = gait === "idle"
        ? (opts.frozen ? 0.35 : 0.5)                       // a slow shift, not a stride
        : THREE.MathUtils.clamp(speed / REFERENCE[gait], 0.55, 2.0);
    }
    this.mixer.update(dt);
  }

  dispose(): void { this.mixer.stopAllAction(); }
}
