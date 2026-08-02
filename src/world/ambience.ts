// The ruin is architecture and two hunters — this is the pass that gives it a
// pulse, and all of it is procedural: no models, no generated assets, no credits.
//
// #100 — retuned for the temple. The steam vents, shorting cables and extractor
// fans went with the machine hall; what a sunlit ruin does instead is drift dust
// through its light shafts, trickle grit out of the broken roof, drip water in
// the dark corners, and burn.
//
// Deliberately threat-free. The Stalker does the hunting; these exist so that
// standing still is interesting and so its roar has something to cut through.
import * as THREE from "three";
import { softDot } from "../fx/soft-dot.ts";
import { HALL, SHAFT_POINTS } from "./complex.ts";

interface Trickle { pts: THREE.Points; base: Float32Array; vel: Float32Array; t: number; period: number }
interface Drip { pts: THREE.Points; vel: Float32Array; next: number }
interface Flicker { light: THREE.PointLight; mat: THREE.MeshStandardMaterial; base: number; emissive: number; seed: number }
interface Motes { pts: THREE.Points; drift: Float32Array; home: Float32Array }

const trickles: Trickle[] = [];
const drips: Drip[] = [];
const flickers: Flicker[] = [];
const motes: Motes[] = [];

function makePoints(count: number, size: number, hex: number, opacity: number): THREE.Points {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({
    // the sprite is what makes dust read as dust rather than grey boxes
    color: hex, size, transparent: true, opacity, depthWrite: false,
    map: softDot(), alphaTest: 0.01,
    blending: THREE.AdditiveBlending,
  }));
}

/** Dust hanging in a sun shaft. This is the single detail that sells "shaft of
 *  light" rather than "translucent cone", and it only exists where the roof is
 *  open, so it doubles as a read on where the sun is getting in. */
function addMotes(scene: THREE.Scene, at: THREE.Vector3, spread: number): void {
  const count = 90;
  const pts = makePoints(count, 0.22, 0xffe9c0, 0.55);
  const home = new Float32Array(count * 3);
  const drift = new Float32Array(count * 3);
  const attr = pts.geometry.getAttribute("position") as THREE.BufferAttribute;
  const arr = attr.array as Float32Array;
  for (let i = 0; i < count; i++) {
    home[i * 3] = (Math.random() - 0.5) * spread;
    home[i * 3 + 1] = Math.random() * 13;
    home[i * 3 + 2] = (Math.random() - 0.5) * spread;
    drift[i * 3] = Math.random() * 6.28;
    drift[i * 3 + 1] = 0.12 + Math.random() * 0.35;
    drift[i * 3 + 2] = Math.random() * 6.28;
    arr[i * 3] = home[i * 3]; arr[i * 3 + 1] = home[i * 3 + 1]; arr[i * 3 + 2] = home[i * 3 + 2];
  }
  attr.needsUpdate = true;
  pts.position.copy(at);
  scene.add(pts);
  motes.push({ pts, drift, home });
}

/** Grit letting go of the collapsed roof every few seconds — the ruin still
 *  settling, overhead, where the game wants your eye anyway. */
function addTrickle(scene: THREE.Scene, at: THREE.Vector3, period: number): void {
  const count = 26;
  const pts = makePoints(count, 0.28, 0xd9c69b, 0);
  const base = new Float32Array(count * 3);
  const vel = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    base[i * 3] = (Math.random() - 0.5) * 0.8;
    base[i * 3 + 1] = 0;
    base[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
    vel[i * 3] = (Math.random() - 0.5) * 0.5;
    vel[i * 3 + 1] = -2.2 - Math.random() * 2.5;
    vel[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
  }
  pts.position.copy(at);
  scene.add(pts);
  trickles.push({ pts, base, vel, t: Math.random() * period, period });
}

/** Water finding its way through stone — the sound of the dark half of the map. */
function addDrip(scene: THREE.Scene, at: THREE.Vector3): void {
  const count = 6;
  const pts = makePoints(count, 0.13, 0xbfe4ff, 0);
  const vel = new Float32Array(count * 3);
  pts.position.copy(at);
  scene.add(pts);
  drips.push({ pts, vel, next: Math.random() * 4 });
}

/** Fire never sits still — a brazier that holds one intensity reads as a bulb. */
function addFlicker(light: THREE.PointLight, mat: THREE.MeshStandardMaterial): void {
  flickers.push({ light, mat, base: light.intensity, emissive: mat.emissiveIntensity, seed: Math.random() * 100 });
}

/** Call once after the world is built. `lamps` are the braziers from
 *  lightComplex — every one of them burns. */
export function buildAmbience(scene: THREE.Scene, lamps: Array<{ light: THREE.PointLight; glass: THREE.MeshStandardMaterial }>): void {
  const { w, d, wallH } = HALL;

  // one mote column per drawn shaft — the positions come from complex.ts so the
  // dust is inside the beam rather than beside it, offset down-sun the same way
  for (const [x, z] of SHAFT_POINTS) {
    addMotes(scene, new THREE.Vector3(x - 8, 0, z - 6), 16);
  }

  for (const [x, z, period] of [
    [-44, -20, 7], [-12, 26, 9], [18, -30, 6], [46, 14, 11], [-30, 4, 13],
  ] as Array<[number, number, number]>) {
    addTrickle(scene, new THREE.Vector3(x, wallH - 1.6, z), period);
  }

  for (const [x, y, z] of [
    [-52, 7.2, -34], [-44, 7.2, -30], [-4, 11.2, 38], [56, 11.0, -12],
  ] as Array<[number, number, number]>) {
    addDrip(scene, new THREE.Vector3(x, y, z));
  }

  for (const l of lamps) addFlicker(l.light, l.glass);

  void w; void d;
}

export function updateAmbience(dt: number, t: number): void {
  for (const m of motes) {
    const attr = m.pts.geometry.getAttribute("position") as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < arr.length; i += 3) {
      // a slow rise with a lazy horizontal wander, wrapping at the roof
      arr[i] = m.home[i] + Math.sin(t * 0.35 + m.drift[i]) * 1.4;
      arr[i + 1] = (m.home[i + 1] + t * m.drift[i + 1]) % 13;
      arr[i + 2] = m.home[i + 2] + Math.cos(t * 0.28 + m.drift[i + 2]) * 1.4;
    }
    attr.needsUpdate = true;
  }

  for (const v of trickles) {
    v.t += dt;
    const phase = v.t % v.period;
    const falling = phase < 1.2;
    const mat = v.pts.material as THREE.PointsMaterial;
    mat.opacity = falling ? Math.max(0, 0.55 * (1 - phase / 1.2)) : 0;
    if (!falling) continue;
    const attr = v.pts.geometry.getAttribute("position") as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < arr.length; i += 3) {
      arr[i] = v.base[i] + v.vel[i] * phase;
      arr[i + 1] = v.base[i + 1] + v.vel[i + 1] * phase;
      arr[i + 2] = v.base[i + 2] + v.vel[i + 2] * phase;
    }
    attr.needsUpdate = true;
  }

  for (const s of drips) {
    s.next -= dt;
    const mat = s.pts.material as THREE.PointsMaterial;
    const attr = s.pts.geometry.getAttribute("position") as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    if (s.next <= 0) {
      s.next = 1.8 + Math.random() * 4;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i] = (Math.random() - 0.5) * 0.4; arr[i + 1] = 0; arr[i + 2] = (Math.random() - 0.5) * 0.4;
        s.vel[i] = 0; s.vel[i + 1] = -0.5; s.vel[i + 2] = 0;
      }
      mat.opacity = 0.9;
    }
    if (mat.opacity > 0) {
      mat.opacity = Math.max(0, mat.opacity - dt * 0.7);
      for (let i = 0; i < arr.length; i += 3) {
        s.vel[i + 1] -= 9 * dt;
        arr[i + 1] += s.vel[i + 1] * dt;
      }
      attr.needsUpdate = true;
    }
  }

  for (const f of flickers) {
    // two detuned sines plus a fast jitter: fire, not a strobe and not a dimmer
    const n =
      0.72 +
      Math.sin(t * 6.1 + f.seed) * 0.10 +
      Math.sin(t * 13.7 + f.seed * 1.7) * 0.07 +
      Math.sin(t * 31.3 + f.seed * 0.3) * 0.05;
    f.light.intensity = f.base * n;
    f.mat.emissiveIntensity = f.emissive * n;
  }
}
