// The complex is currently architecture and two hunters — nothing else moves,
// runs, or makes a sound. This is the pass that gives it a pulse, and all of it
// is procedural: no models, no generated assets, no credits.
//
// Deliberately threat-free. The Stalker does the hunting; these exist so that
// standing still is interesting and so its roar has something to cut through.
import * as THREE from "three";
import { HALL } from "./complex.ts";

interface Vent { pts: THREE.Points; base: Float32Array; vel: Float32Array; t: number; period: number; origin: THREE.Vector3 }
interface Spark { pts: THREE.Points; vel: Float32Array; next: number; origin: THREE.Vector3 }
interface Flicker { light: THREE.PointLight; mat: THREE.MeshStandardMaterial; base: number; seed: number; next: number; out: number }

const vents: Vent[] = [];
const sparkers: Spark[] = [];
const flickers: Flicker[] = [];
const fans: THREE.Object3D[] = [];

function makePoints(count: number, size: number, hex: number, opacity: number): THREE.Points {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({
    color: hex, size, transparent: true, opacity, depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
}

/** Steam that vents on a timer — the loudest signal that machinery is still
 *  running, and it doubles as intermittent cover you can read from across
 *  the hall. */
function addVent(scene: THREE.Scene, at: THREE.Vector3, period: number): void {
  const count = 40;
  const pts = makePoints(count, 0.9, 0xb9c4d4, 0.0);
  const base = new Float32Array(count * 3);
  const vel = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    base[i * 3] = (Math.random() - 0.5) * 0.5;
    base[i * 3 + 1] = Math.random() * 0.4;
    base[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
    vel[i * 3] = (Math.random() - 0.5) * 1.4;
    vel[i * 3 + 1] = 1.6 + Math.random() * 2.4;
    vel[i * 3 + 2] = (Math.random() - 0.5) * 1.4;
  }
  pts.position.copy(at);
  scene.add(pts);
  vents.push({ pts, base, vel, t: Math.random() * period, period, origin: at.clone() });
}

/** A cable end that shorts every few seconds. Tiny, bright, and the eye goes
 *  straight to it — which is the point of putting them away from the action. */
function addSparker(scene: THREE.Scene, at: THREE.Vector3): void {
  const count = 12;
  const pts = makePoints(count, 0.16, 0xffd08a, 0);
  const vel = new Float32Array(count * 3);
  pts.position.copy(at);
  scene.add(pts);
  sparkers.push({ pts, vel, next: Math.random() * 5, origin: at.clone() });
}

/** A failing lamp: the ballast hum you cannot hear, made visible. */
function addFlicker(light: THREE.PointLight, mat: THREE.MeshStandardMaterial): void {
  flickers.push({ light, mat, base: light.intensity, seed: Math.random() * 10, next: 2 + Math.random() * 6, out: 0 });
}

/** Slow extractor fans in the ceiling — motion overhead, where the game wants
 *  your eye anyway. */
function addFan(scene: THREE.Scene, at: THREE.Vector3): void {
  const hub = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 0.8, metalness: 0.7 });
  const blade = new THREE.BoxGeometry(3.4, 0.08, 0.55);
  for (let i = 0; i < 4; i++) {
    const b = new THREE.Mesh(blade, mat);
    b.rotation.y = (i / 4) * Math.PI * 2;
    b.rotation.z = 0.28;
    hub.add(b);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.16, 6, 18), mat);
  ring.rotation.x = Math.PI / 2;
  hub.add(ring);
  hub.position.copy(at);
  scene.add(hub);
  fans.push(hub);
}

/** Call once after the world is built. `lamps` are the fixtures from
 *  lightComplex, so a few of them can be made to fail. */
export function buildAmbience(scene: THREE.Scene, lamps: Array<{ light: THREE.PointLight; glass: THREE.MeshStandardMaterial }>): void {
  const { w, d, wallH } = HALL;

  for (const [x, z, period] of [
    [-44, -20, 7], [-12, 26, 9], [18, -30, 6], [46, 14, 11], [-30, 4, 13],
  ] as Array<[number, number, number]>) {
    addVent(scene, new THREE.Vector3(x, 0.4, z), period);
  }

  for (const [x, y, z] of [
    [-58, 7.5, 10], [34, 8.2, -36], [-4, 9.0, 38], [56, 6.8, -12],
  ] as Array<[number, number, number]>) {
    addSparker(scene, new THREE.Vector3(x, y, z));
  }

  for (const [x, z] of [[-30, -30], [30, 30]] as Array<[number, number]>) {
    addFan(scene, new THREE.Vector3(x, wallH - 1.3, z));
  }

  // two lamps in the set are dying — not all of them, or it reads as a strobe
  lamps.filter((_, i) => i % 6 === 2).forEach((l) => addFlicker(l.light, l.glass));

  void w; void d;
}

export function updateAmbience(dt: number, t: number): void {
  for (const v of vents) {
    v.t += dt;
    const phase = v.t % v.period;
    const blowing = phase < 1.5;
    const mat = v.pts.material as THREE.PointsMaterial;
    mat.opacity = blowing ? Math.max(0, 0.5 * (1 - phase / 1.5)) : 0;
    if (!blowing) continue;
    const attr = v.pts.geometry.getAttribute("position") as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < arr.length; i += 3) {
      arr[i] = v.base[i] + v.vel[i] * phase;
      arr[i + 1] = v.base[i + 1] + v.vel[i + 1] * phase;
      arr[i + 2] = v.base[i + 2] + v.vel[i + 2] * phase;
    }
    attr.needsUpdate = true;
  }

  for (const s of sparkers) {
    s.next -= dt;
    const mat = s.pts.material as THREE.PointsMaterial;
    const attr = s.pts.geometry.getAttribute("position") as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    if (s.next <= 0) {
      s.next = 2.5 + Math.random() * 6;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i] = 0; arr[i + 1] = 0; arr[i + 2] = 0;
        s.vel[i] = (Math.random() - 0.5) * 5;
        s.vel[i + 1] = -1 - Math.random() * 3;
        s.vel[i + 2] = (Math.random() - 0.5) * 5;
      }
      mat.opacity = 1;
    }
    if (mat.opacity > 0) {
      mat.opacity = Math.max(0, mat.opacity - dt * 2.2);
      for (let i = 0; i < arr.length; i += 3) {
        s.vel[i + 1] -= 11 * dt;
        arr[i] += s.vel[i] * dt;
        arr[i + 1] += s.vel[i + 1] * dt;
        arr[i + 2] += s.vel[i + 2] * dt;
      }
      attr.needsUpdate = true;
    }
  }

  for (const f of flickers) {
    f.next -= dt;
    if (f.next <= 0) { f.next = 3 + Math.random() * 8; f.out = 0.12 + Math.random() * 0.5; }
    if (f.out > 0) {
      f.out -= dt;
      // a failing tube stutters rather than dimming smoothly
      const on = Math.sin(t * 47 + f.seed) > -0.1 ? 0.15 : 0.85;
      f.light.intensity = f.base * on;
      f.mat.emissiveIntensity = 0.8 * on;
    } else {
      f.light.intensity = f.base;
      f.mat.emissiveIntensity = 0.8;
    }
  }

  for (const fan of fans) fan.rotation.y += dt * 0.9;
}
