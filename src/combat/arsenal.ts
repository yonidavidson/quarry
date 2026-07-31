// Jack's guns. DESIGN.md promised four and the game shipped one, so this is the
// rest of the contract: blaster, scatter, shotgun, bomb.
//
// Everything hitscan shares one core — aim down the camera's forward axis, let
// walls eat the shot — and the weapons differ only by their spec. That is
// deliberate: a second aiming model is a second thing to keep in sync, and the
// bug it produces (visual and hit disagreeing) is the worst kind to debug.
//
// The blaster is the floor you always have. The other three are found in crates
// and run dry, which is what makes finding one matter.
import * as THREE from "three";
import { AUDIO } from "../assets.ts";
import { play } from "../audio.ts";

export type WeaponKind = "blaster" | "scatter" | "shotgun" | "bomb";

interface Spec {
  label: string;
  damage: number;      // per pellet
  cooldown: number;
  pellets: number;
  spread: number;      // radians, cone half-angle
  range: number;
  /** null = infinite. Only the blaster is. */
  ammo: number | null;
  /** Metres past which damage starts dropping. Absent = no falloff. */
  falloff?: number;
  thrown?: boolean;
  tracer: number;
  glow: number;
  rate: number;        // sound pitch
}

export const WEAPONS: Record<WeaponKind, Spec> = {
  // the one you never lose: reliable, accurate, and never quite enough
  blaster: { label: "BLASTER", damage: 1, cooldown: 0.22, pellets: 1, spread: 0, range: 90,
             ammo: null, tracer: 0xbfe4ff, glow: 0x9fd4ff, rate: 0.95 },
  // suppression — you will hit, but you have to stay on target while it closes
  scatter: { label: "SCATTER", damage: 0.45, cooldown: 0.075, pellets: 1, spread: 0.038, range: 45,
             ammo: 70, tracer: 0xd8ffb0, glow: 0xa8e070, rate: 1.35 },
  // the panic button: enormous up close, close to useless across the hall
  shotgun: { label: "SHOTGUN", damage: 0.8, cooldown: 0.85, pellets: 7, spread: 0.11, range: 30,
             ammo: 8, falloff: 9, tracer: 0xffd0a0, glow: 0xffa860, rate: 0.55 },
  // area denial — the only weapon that hurts something you cannot see
  bomb: { label: "BOMB", damage: 4, cooldown: 1.1, pellets: 0, spread: 0, range: 0,
          ammo: 3, thrown: true, tracer: 0xff8040, glow: 0xff6020, rate: 0.7 },
};

/** Blast radius of a bomb. Generous — a thrown weapon you have to land perfectly
 *  is a weapon nobody picks up twice. */
export const BLAST_RADIUS = 7;

export interface Struck { root: THREE.Object3D; damage: number }

interface Tracer { line: THREE.Line; life: number; span: number }
interface Grenade { mesh: THREE.Mesh; vel: THREE.Vector3; fuse: number; light: THREE.PointLight }
interface Blast { light: THREE.PointLight; life: number }

export class Arsenal {
  private cooldown = 0;
  private tracers: Tracer[] = [];
  private grenades: Grenade[] = [];
  private blasts: Blast[] = [];
  private ray = new THREE.Raycaster();
  private muzzle = new THREE.PointLight(0x9fd4ff, 0, 4.5, 2);

  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private onBlast: (at: THREE.Vector3, damage: number, radius: number) => void;

  /** Current weapon and what is left in it. The blaster's count stays Infinity. */
  kind: WeaponKind = "blaster";
  private ammo: Record<WeaponKind, number> = { blaster: Infinity, scatter: 0, shotgun: 0, bomb: 0 };

  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    onBlast: (at: THREE.Vector3, damage: number, radius: number) => void = () => {},
  ) {
    this.scene = scene;
    this.camera = camera;
    this.onBlast = onBlast;
    scene.add(this.muzzle);
  }

  get spec(): Spec { return WEAPONS[this.kind]; }
  get ready(): boolean { return this.cooldown <= 0; }
  /** Infinity for the blaster — the HUD renders that as a dash, not a number. */
  get rounds(): number { return this.ammo[this.kind]; }
  get label(): string { return this.spec.label; }

  /** Picked up a crate. Refills if you already had it, and always swaps to it —
   *  you walked over it on purpose. */
  give(kind: WeaponKind): void {
    const max = WEAPONS[kind].ammo;
    if (max === null) return;
    this.ammo[kind] = Math.min((this.ammo[kind] || 0) + max, max * 2);
    this.kind = kind;
  }

  /** Cycle to the next weapon you actually have rounds for. */
  cycle(dir = 1): void {
    const order: WeaponKind[] = ["blaster", "scatter", "shotgun", "bomb"];
    const at = order.indexOf(this.kind);
    for (let i = 1; i <= order.length; i++) {
      const next = order[(at + dir * i + order.length * 4) % order.length];
      if (this.ammo[next] > 0) { this.kind = next; return; }
    }
  }

  select(kind: WeaponKind): void { if (this.ammo[kind] > 0) this.kind = kind; }

  /** Out of rounds falls back to the blaster rather than leaving you holding a
   *  dead weapon — the alternative is dying while pressing a button that does
   *  nothing, which reads as a bug, not as a choice. */
  private spend(): void {
    if (this.spec.ammo === null) return;
    this.ammo[this.kind]--;
    if (this.ammo[this.kind] <= 0) { this.ammo[this.kind] = 0; this.kind = "blaster"; }
  }

  /**
   * Fire the current weapon.
   * @returns every root that was struck and by how much. Pellets that land on
   *          the same body sum, so a point-blank shotgun is one big number
   *          rather than seven small ones the caller has to add up.
   */
  fireAt(targets: THREE.Object3D[], solids: THREE.Object3D[], drawFrom?: THREE.Vector3): Struck[] {
    if (this.cooldown > 0) return [];
    const spec = this.spec;
    this.cooldown = spec.cooldown;

    const origin = new THREE.Vector3();
    const dir = new THREE.Vector3();
    this.camera.getWorldPosition(origin);
    this.camera.getWorldDirection(dir);

    const muzzleAt = drawFrom ? drawFrom.clone() : origin.clone().addScaledVector(dir, 0.6);
    this.muzzle.color.setHex(spec.glow);
    this.muzzle.position.copy(muzzleAt);
    this.muzzle.intensity = spec.thrown ? 3 : 7;
    play(AUDIO.blaster, 0.55, spec.rate + Math.random() * 0.08);
    this.spend();

    if (spec.thrown) { this.throwBomb(muzzleAt, dir); return []; }

    this.ray.far = spec.range;
    const tally = new Map<THREE.Object3D, number>();

    for (let p = 0; p < spec.pellets; p++) {
      const d = dir.clone();
      if (spec.spread > 0) {
        // cone, not a square: an even spray needs the angle picked from a disc
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * spec.spread;
        // aiming straight up or down makes the up-axis cross degenerate; any
        // other reference works there, and the cone is round so it cannot show
        const ref = Math.abs(d.y) > 0.99 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0);
        const side = new THREE.Vector3().crossVectors(d, ref).normalize();
        const up = new THREE.Vector3().crossVectors(side, d).normalize();
        d.addScaledVector(side, Math.tan(r) * Math.cos(a))
         .addScaledVector(up, Math.tan(r) * Math.sin(a)).normalize();
      }
      this.ray.set(origin, d);

      // a wall between you and it eats the pellet — cover has to actually work
      const wall = this.ray.intersectObjects(solids, false)[0];
      const hit = this.ray.intersectObjects(targets, true)[0];
      const blocked = wall && hit ? wall.distance < hit.distance : !!wall && !hit;
      const dist = hit && !blocked ? hit.distance : wall ? wall.distance : spec.range;
      const end = origin.clone().addScaledVector(d, dist);
      this.addTracer(muzzleAt, end, spec.tracer);

      if (!hit || blocked) continue;
      // falloff: the shotgun has to be a close-range answer, or it is just a
      // better blaster and the other three stop mattering
      let dmg = spec.damage;
      if (spec.falloff && hit.distance > spec.falloff) {
        dmg *= Math.max(0.15, 1 - (hit.distance - spec.falloff) / (spec.range - spec.falloff));
      }
      const root = hit.object;
      tally.set(root, (tally.get(root) || 0) + dmg);
    }

    return [...tally.entries()].map(([root, damage]) => ({ root, damage }));
  }

  /** Lob a bomb along the aim, under gravity. It detonates on its fuse or on
   *  whatever it hits first. */
  private throwBomb(from: THREE.Vector3, dir: THREE.Vector3): void {
    const mesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.22, 0),
      new THREE.MeshStandardMaterial({ color: 0x3a3f46, emissive: 0xff4010, emissiveIntensity: 1.5, roughness: 0.6 }),
    );
    mesh.position.copy(from);
    const light = new THREE.PointLight(0xff5020, 3, 6, 2);
    mesh.add(light);
    this.scene.add(mesh);
    this.grenades.push({
      mesh,
      vel: dir.clone().multiplyScalar(22).setY(dir.y * 22 + 4),  // a little loft, so it arcs
      fuse: 1.6,
      light,
    });
  }

  private detonate(g: Grenade): void {
    const at = g.mesh.position.clone();
    this.scene.remove(g.mesh);
    g.mesh.geometry.dispose();
    (g.mesh.material as THREE.Material).dispose();

    const flash = new THREE.PointLight(0xffa040, 240, 26, 2);
    flash.position.copy(at);
    this.scene.add(flash);
    this.blasts.push({ light: flash, life: 0.4 });
    play(AUDIO.blaster, 0.9, 0.35);
    this.onBlast(at, WEAPONS.bomb.damage, BLAST_RADIUS);
  }

  private addTracer(from: THREE.Vector3, to: THREE.Vector3, color: number): void {
    const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95 }));
    this.scene.add(line);
    this.tracers.push({ line, life: 0.08, span: 0.08 });
  }

  update(dt: number, solids: THREE.Object3D[] = []): void {
    if (this.cooldown > 0) this.cooldown -= dt;
    this.muzzle.intensity = Math.max(0, this.muzzle.intensity - dt * 90);

    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const g = this.grenades[i];
      g.fuse -= dt;
      g.vel.y -= 22 * dt;
      const step = g.vel.clone().multiplyScalar(dt);
      // sweep rather than teleport, or a fast bomb tunnels straight through a wall
      this.ray.set(g.mesh.position, step.clone().normalize());
      this.ray.far = step.length() + 0.25;
      const wall = solids.length ? this.ray.intersectObjects(solids, false)[0] : undefined;
      if (wall) {
        g.mesh.position.copy(wall.point).addScaledVector(this.ray.ray.direction, -0.2);
        this.detonate(g);
        this.grenades.splice(i, 1);
        continue;
      }
      g.mesh.position.add(step);
      g.mesh.rotation.x += dt * 9;
      g.mesh.rotation.z += dt * 6;
      g.light.intensity = 3 + Math.sin(g.fuse * 40) * 2;   // it ticks faster as it goes
      if (g.fuse <= 0 || g.mesh.position.y < 0.1) {
        this.detonate(g);
        this.grenades.splice(i, 1);
      }
    }

    for (let i = this.blasts.length - 1; i >= 0; i--) {
      const b = this.blasts[i];
      b.life -= dt;
      b.light.intensity = Math.max(0, 240 * (b.life / 0.4) ** 2);
      if (b.life <= 0) { this.scene.remove(b.light); this.blasts.splice(i, 1); }
    }

    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.life -= dt;
      const mat = t.line.material as THREE.LineBasicMaterial;
      mat.opacity = Math.max(0, t.life / t.span);
      if (t.life <= 0) {
        this.scene.remove(t.line);
        t.line.geometry.dispose();
        mat.dispose();
        this.tracers.splice(i, 1);
      }
    }
  }
}
