// SPDX-License-Identifier: MIT
import type { CharacterAnimations } from "./character-animations.ts";
import type { CharacterActionMotion } from "./character-controller.ts";

export type MotionTrajectorySample = readonly [time: number, x: number, y: number, z: number];

export interface MotionTrajectory {
  schema: 1;
  clip: string;
  samples: MotionTrajectorySample[];
}

export interface MotionActionController {
  setActionMotion(motion: CharacterActionMotion | null): void;
}

export async function loadMotionTrajectory(url: string): Promise<MotionTrajectory> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`[motion-action] ${url} returned HTTP ${response.status}`);
  const value = await response.json() as Partial<MotionTrajectory>;
  if (value.schema !== 1 || !value.clip || !Array.isArray(value.samples) || value.samples.length < 1) {
    throw new Error(`[motion-action] invalid trajectory ${url}`);
  }
  const samples = value.samples as MotionTrajectorySample[];
  let previous = -Infinity;
  for (const sample of samples) {
    if (
      sample.length !== 4 ||
      sample.some((item) => !Number.isFinite(item)) ||
      sample[0] < previous
    ) {
      throw new Error(`[motion-action] invalid trajectory sample in ${url}`);
    }
    previous = sample[0];
  }
  return { schema: 1, clip: value.clip, samples };
}

/**
 * Samples an extracted GLB root curve into ECCTRL's dynamic Rapier body.
 * The animation GLB stays in-place; only this driver can advance the capsule.
 */
export class MotionActionDriver {
  #controller: MotionActionController;
  #animations: CharacterAnimations;
  #trajectory: MotionTrajectory | null = null;
  #elapsed = 0;
  #onDone: (() => void) | undefined;

  constructor(controller: MotionActionController, animations: CharacterAnimations) {
    this.#controller = controller;
    this.#animations = animations;
  }

  get active(): boolean {
    return this.#trajectory !== null;
  }

  play(trajectory: MotionTrajectory, onDone?: () => void): boolean {
    this.cancel();
    if (!this.#animations.playOneShot(trajectory.clip)) return false;
    this.#trajectory = trajectory;
    this.#elapsed = 0;
    this.#onDone = onDone;
    return true;
  }

  /** Call once in the fixed-step callback immediately before controller.update(). */
  update(dt: number): void {
    const trajectory = this.#trajectory;
    if (!trajectory || !(dt > 0)) return;
    const duration = trajectory.samples.at(-1)?.[0] ?? 0;
    // Release on the callback AFTER the final interval was applied. Clearing
    // immediately after setActionMotion would erase that velocity before the
    // caller's following controller.update().
    if (this.#elapsed >= duration) {
      this.#finish();
      return;
    }
    const nextTime = Math.min(this.#elapsed + dt, duration);
    const from = sampleTrajectory(trajectory.samples, this.#elapsed);
    const to = sampleTrajectory(trajectory.samples, nextTime);
    const sampleDt = nextTime - this.#elapsed;
    if (sampleDt > 0) {
      this.#controller.setActionMotion({
        x: (to[1] - from[1]) / sampleDt,
        z: (to[3] - from[3]) / sampleDt,
      });
    }
    this.#elapsed = nextTime;
  }

  cancel(): void {
    if (!this.#trajectory) return;
    this.#controller.setActionMotion(null);
    this.#trajectory = null;
    this.#elapsed = 0;
    this.#onDone = undefined;
  }

  #finish(): void {
    const done = this.#onDone;
    this.#controller.setActionMotion(null);
    this.#trajectory = null;
    this.#elapsed = 0;
    this.#onDone = undefined;
    done?.();
  }
}

export function sampleTrajectory(
  samples: readonly MotionTrajectorySample[],
  time: number,
): MotionTrajectorySample {
  if (samples.length === 0) return [0, 0, 0, 0];
  if (time <= samples[0]![0]) return samples[0]!;
  const last = samples.at(-1)!;
  if (time >= last[0]) return last;
  let high = samples.length - 1;
  let low = 0;
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (samples[middle]![0] <= time) low = middle;
    else high = middle;
  }
  const a = samples[low]!;
  const b = samples[high]!;
  const alpha = (time - a[0]) / Math.max(b[0] - a[0], Number.EPSILON);
  return [
    time,
    a[1] + (b[1] - a[1]) * alpha,
    a[2] + (b[2] - a[2]) * alpha,
    a[3] + (b[3] - a[3]) * alpha,
  ];
}
