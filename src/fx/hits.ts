// Impact feedback. Combat had none: you could empty a magazine into the beast and
// get exactly the same picture as missing, because the only tell was that it fled
// — and it flees on a timer anyway. These are the three cheapest things that make
// a hit legible, none of which need generated assets.
import * as THREE from "three";

type Mat = THREE.MeshStandardMaterial;

/** Original emissive per material, so a flash can be undone rather than guessed. */
const cache = new WeakMap<Mat, { color: THREE.Color; intensity: number }>();

function eachMaterial(root: THREE.Object3D, fn: (m: Mat) => void): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      if ((m as Mat).isMeshStandardMaterial) fn(m as Mat);
    }
  });
}

/** Blow the body out for a moment. The 2D game did this with an opacity blink and
 *  it read instantly; emissive is the 3D equivalent and survives being in shadow,
 *  which an opacity change does not. */
export function flashBody(root: THREE.Object3D, hex = 0xff5a3c, ms = 130): void {
  const touched: Mat[] = [];
  eachMaterial(root, (m) => {
    if (!cache.has(m)) cache.set(m, { color: m.emissive.clone(), intensity: m.emissiveIntensity });
    m.emissive.setHex(hex);
    m.emissiveIntensity = 2.4;
    touched.push(m);
  });
  setTimeout(() => {
    for (const m of touched) {
      const was = cache.get(m);
      if (!was) continue;
      m.emissive.copy(was.color);
      m.emissiveIntensity = was.intensity;
    }
  }, ms);
}

interface Spark { pts: THREE.Points; vel: Float32Array; life: number; max: number }
const sparks: Spark[] = [];

/** A burst at the point of impact — the thing that says "here, this connected". */
export function sparkBurst(scene: THREE.Scene, at: THREE.Vector3, hex = 0xffc27a, count = 14): void {
  const pos = new Float32Array(count * 3);
  const vel = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = at.x; pos[i * 3 + 1] = at.y; pos[i * 3 + 2] = at.z;
    const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8, Math.random() - 0.5).normalize();
    const speed = 2.5 + Math.random() * 5;
    vel[i * 3] = dir.x * speed; vel[i * 3 + 1] = dir.y * speed; vel[i * 3 + 2] = dir.z * speed;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({
    color: hex, size: 0.12, transparent: true, depthWrite: false,
  }));
  scene.add(pts);
  sparks.push({ pts, vel, life: 0.5, max: 0.5 });
}

export function updateSparks(dt: number, scene: THREE.Scene): void {
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i];
    s.life -= dt;
    const attr = s.pts.geometry.getAttribute("position") as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let k = 0; k < arr.length; k += 3) {
      s.vel[k + 1] -= 14 * dt;                       // they fall
      arr[k] += s.vel[k] * dt;
      arr[k + 1] += s.vel[k + 1] * dt;
      arr[k + 2] += s.vel[k + 2] * dt;
    }
    attr.needsUpdate = true;
    (s.pts.material as THREE.PointsMaterial).opacity = Math.max(0, s.life / s.max);
    if (s.life <= 0) {
      scene.remove(s.pts);
      s.pts.geometry.dispose();
      (s.pts.material as THREE.PointsMaterial).dispose();
      sparks.splice(i, 1);
    }
  }
}

/**
 * #82 — a landed pounce used to fill the frame with opaque body, so you could not
 * see what killed you or where it went. Adding the creature to the camera's
 * collider list is the wrong fix: that list is for STATIC geometry and a moving
 * mesh in it fights the pullback every frame. Fading it out at close range keeps
 * the room readable through whatever is on top of you.
 */
export function fadeNearCamera(root: THREE.Object3D, camera: THREE.Camera, from = 3.2, to = 1.0): void {
  const d = camera.position.distanceTo(root.position);
  const a = THREE.MathUtils.clamp((d - to) / (from - to), 0.12, 1);
  eachMaterial(root, (m) => {
    if (a < 1) { m.transparent = true; m.depthWrite = false; }
    else if (m.opacity === 1) { m.transparent = false; m.depthWrite = true; }
    m.opacity = a;
  });
}
