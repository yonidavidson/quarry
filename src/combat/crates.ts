// Weapon crates. DESIGN.md is specific that the guns are "found in crates, not
// loadout" — the point is that arming yourself costs you the thing you least
// want to spend, which is time in the open with the Stalker awake.
//
// So the crates sit AWAY from the energy cells. A route that collects both is a
// longer route, and choosing between them is the decision the level is for.
import * as THREE from "three";
import { AUDIO } from "../assets.ts";
import { play } from "../audio.ts";
import type { WeaponKind } from "./arsenal.ts";

/**
 * Deliberately off the cell circuit — see the note above — and every one of
 * these is checked against the hall's actual geometry rather than eyeballed.
 * An earlier set put a crate at y=7 over open floor, where no catwalk reaches:
 * it hung in mid-air, unreachable, and another sat directly behind a machine
 * block where nothing would ever walk into it.
 *
 * The machine blocks occupy x = -50+20i, z = ±(14|12), 12x9 each; the catwalk
 * ring is at z = ±35 and x = ±60, six metres up. All of these sit clear of both.
 *
 * The first scatter is straight out from the spawn along open floor — your first
 * weapon should be findable by walking, not by learning the map.
 */
const SPOTS: Array<[WeaponKind, number, number, number]> = [
  ["scatter", 0, 1, 26],
  ["shotgun", -40, 1, 0],
  ["bomb", 20, 1, -30],
  ["scatter", 38, 1, 20],
  ["shotgun", -8, 1, -32],
  ["bomb", 30, 1, 4],
];

const TINT: Record<WeaponKind, number> = {
  blaster: 0x9fd4ff, scatter: 0xa8e070, shotgun: 0xffa860, bomb: 0xff6020,
};

interface Crate { mesh: THREE.Mesh; kind: WeaponKind; spin: number }

export class Crates {
  private crates: Crate[] = [];
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    const geo = new THREE.BoxGeometry(0.8, 0.6, 0.8);
    for (const [kind, x, y, z] of SPOTS) {
      const mat = new THREE.MeshStandardMaterial({
        color: 0x24282e, emissive: TINT[kind], emissiveIntensity: 0.9,
        roughness: 0.5, metalness: 0.6,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y + 0.5, z);
      mesh.castShadow = true;
      // banded lid, so a crate never reads as an energy cell at a glance
      const lid = new THREE.Mesh(
        new THREE.BoxGeometry(0.88, 0.09, 0.88),
        new THREE.MeshStandardMaterial({ color: TINT[kind], emissive: TINT[kind], emissiveIntensity: 2.4 }),
      );
      lid.position.y = 0.33;
      mesh.add(lid);
      const glow = new THREE.PointLight(TINT[kind], 3.5, 7, 2);
      glow.position.y = 0.5;
      mesh.add(glow);
      this.scene.add(mesh);
      this.crates.push({ mesh, kind, spin: Math.random() * Math.PI });
    }
  }

  /** @returns the weapon picked up this frame, or null. */
  update(dt: number, player: THREE.Vector3): WeaponKind | null {
    let got: WeaponKind | null = null;
    for (let i = this.crates.length - 1; i >= 0; i--) {
      const c = this.crates[i];
      c.spin += dt * 0.9;
      c.mesh.rotation.y = c.spin;
      if (c.mesh.position.distanceTo(player) < 2.4) {
        this.scene.remove(c.mesh);
        this.crates.splice(i, 1);
        play(AUDIO.step, 0.55, 1.35);
        got = c.kind;
      }
    }
    return got;
  }
}
