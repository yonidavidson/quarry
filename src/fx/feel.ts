// Game feel: the layer between "the systems work" and "the game feels good".
//
// Nothing here changes what the game DOES. It changes what the game tells you
// it just did — and a hunt where a 20 m fall, a claw landing and a pounce all
// feel identical is a hunt with no stakes in it.
//
// All of it is additive and frame-rate independent, and all of it is procedural:
// no clips, no assets, no credits.
import * as THREE from "three";
import { softDot } from "./soft-dot.ts";

// ── camera shake ───────────────────────────────────────────────────────────
// A single trauma value, squared on the way out. Squaring is the trick: small
// events stay subtle, big ones bite, and the decay reads as settling rather
// than as a switch being flipped.
let trauma = 0;
let shakeT = 0;
const _shakeOffset = new THREE.Vector3();

/** `amount` 0..1. Additive, so two hits at once hit harder than one. */
export function shake(amount: number): void {
  trauma = Math.min(1, trauma + amount);
}

/** Returns the offset to add to the camera this frame. Call once per frame. */
export function shakeOffset(dt: number): THREE.Vector3 {
  trauma = Math.max(0, trauma - dt * 1.6);
  shakeT += dt;
  const s = trauma * trauma;
  if (s < 0.0002) return _shakeOffset.set(0, 0, 0);
  // three detuned frequencies so it never reads as a sine wave
  _shakeOffset.set(
    (Math.sin(shakeT * 47.3) + Math.sin(shakeT * 31.1) * 0.6) * s * 0.42,
    (Math.sin(shakeT * 39.7) + Math.sin(shakeT * 23.3) * 0.6) * s * 0.34,
    Math.sin(shakeT * 29.1) * s * 0.18,
  );
  return _shakeOffset;
}

// ── hitstop ────────────────────────────────────────────────────────────────
// Freezing the world for a few dozen milliseconds on a solid connect is the
// oldest trick in action games and still the strongest: it is what makes a hit
// feel like it MET something instead of passing through it.
let stopFor = 0;

export function hitstop(seconds: number): void {
  stopFor = Math.max(stopFor, seconds);
}

/** Scales the frame's delta. Returns 0 while frozen, 1 otherwise. */
export function timeScale(dt: number): number {
  if (stopFor <= 0) return 1;
  stopFor -= dt;
  return 0;
}

// ── landing ────────────────────────────────────────────────────────────────
/** A puff of dust where the feet hit. Sized by how hard the landing was. */
let dust: THREE.Points | null = null;
let dustVel: Float32Array | null = null;
let dustLife = 0;

function ensureDust(scene: THREE.Scene): void {
  if (dust) return;
  const count = 26;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  dust = new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0xd8c8a4, size: 0.5, transparent: true, opacity: 0,
    depthWrite: false, map: softDot(), alphaTest: 0.01,
  }));
  dust.frustumCulled = false;
  dustVel = new Float32Array(count * 3);
  scene.add(dust);
}

export function landPuff(scene: THREE.Scene, at: THREE.Vector3, strength: number): void {
  ensureDust(scene);
  if (!dust || !dustVel) return;
  const attr = dust.geometry.getAttribute("position") as THREE.BufferAttribute;
  const arr = attr.array as Float32Array;
  for (let i = 0; i < arr.length; i += 3) {
    arr[i] = at.x; arr[i + 1] = at.y + 0.08; arr[i + 2] = at.z;
    const a = Math.random() * Math.PI * 2;
    const sp = (0.7 + Math.random() * 1.7) * (0.5 + strength);
    dustVel[i] = Math.cos(a) * sp;
    dustVel[i + 1] = Math.random() * 0.9 * strength;
    dustVel[i + 2] = Math.sin(a) * sp;
  }
  attr.needsUpdate = true;
  (dust.material as THREE.PointsMaterial).opacity = Math.min(0.75, 0.28 + strength * 0.5);
  (dust.material as THREE.PointsMaterial).size = 0.35 + strength * 0.45;
  dustLife = 0.85;
}

export function updateFeel(dt: number): void {
  if (!dust || !dustVel || dustLife <= 0) return;
  dustLife -= dt;
  const mat = dust.material as THREE.PointsMaterial;
  mat.opacity = Math.max(0, mat.opacity - dt * 0.9);
  const attr = dust.geometry.getAttribute("position") as THREE.BufferAttribute;
  const arr = attr.array as Float32Array;
  for (let i = 0; i < arr.length; i += 3) {
    dustVel[i] *= 1 - dt * 2.4;
    dustVel[i + 2] *= 1 - dt * 2.4;
    dustVel[i + 1] -= dt * 2.2;
    arr[i] += dustVel[i] * dt;
    arr[i + 1] += dustVel[i + 1] * dt;
    arr[i + 2] += dustVel[i + 2] * dt;
  }
  attr.needsUpdate = true;
}

// ── falling ────────────────────────────────────────────────────────────────
/** Tracks airtime so a landing knows how far it fell.
 *
 *  This is what gives the 28 m walls their stakes: climbing is only interesting
 *  if being up there can cost you something. The thresholds are deliberately
 *  forgiving — a mantle, a vine drop and a jump off the 6 m ledge all land
 *  free — and only a genuine fall hurts. */
export class FallWatch {
  private peak = 0;
  private falling = false;

  /** Returns the drop in metres if this frame is a landing, else 0. */
  update(y: number, onGround: boolean): number {
    if (!onGround) {
      if (!this.falling) { this.falling = true; this.peak = y; }
      this.peak = Math.max(this.peak, y);
      return 0;
    }
    if (!this.falling) return 0;
    this.falling = false;
    return Math.max(0, this.peak - y);
  }

  /** Cancel — the body was taken over by a grab, so it never landed. */
  clear(y: number): void { this.falling = false; this.peak = y; }

  /** Damage for a drop. 0 up to 11 m, then one hit, then two. */
  static damageFor(drop: number): number {
    if (drop < 11) return 0;
    if (drop < 19) return 1;
    return 2;
  }
}
