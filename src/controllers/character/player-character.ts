// SPDX-License-Identifier: MIT
// The player's body, resolved once: the game's OWN generated character when
// this game has one, the visiting player's profile avatar when it does not.
//
// WHY THIS EXISTS: before it, the two lanes were different code — different
// loader, different CharacterAnimations arguments, and a per-frame call that
// appeared and disappeared. So the boot path written at hour 0 (the avatar,
// the only lane that works before a character exists) had to be REWRITTEN at
// hour 2 when the generated character landed, by an agent low on context with
// ten things half-done. It wasn't, and games shipped wearing the platform's
// stock avatar instead of the character they were designed around. ONE shape
// for both lanes means the character arriving later is a file drop, not an
// edit — `genex controller character --character <id>` writes the manifest and
// the next reload picks it up.
//
// The generated character is the default for any game where a human body
// appears on screen (first-person included — remotes, a look-down body, a
// shadow, a menu portrait). The avatar is the FALLBACK: a declared temporary
// body while the character renders, or the stand-in when generation genuinely
// could not happen (out of credits, failed, unverified).
import * as THREE from "three";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import { VRMUtils } from "@pixiv/three-vrm";
import type { LocomotionProfile } from "./character-animations.ts";
import { loadCharacterClips } from "./animation-packs.ts";
import {
  loadMeshyCharacter,
  type LoadMeshyCharacterOptions,
  type MeshyCharacter,
} from "./meshy/meshy-loader.ts";
import { loadVrm, loadVrmCloneBase } from "./vrm/vrm-loader.ts";

/** "generated" = this game's own themed character; "avatar" = the fallback. */
export type PlayerCharacterKind = "generated" | "avatar";

export interface PlayerCharacter {
  kind: PlayerCharacterKind;
  /** Renderable root — parent it under `character.root`. */
  scene: THREE.Group;
  /** Clips for CharacterAnimations (exact-rig generated clips, or retargeted UAL). */
  clips: THREE.AnimationClip[];
  /** Present only in the generated lane; pass straight through to CharacterAnimations. */
  locomotionProfile?: LocomotionProfile;
  /** Once per RENDER frame, after physics.step(). Ticks the VRM humanoid + spring
   *  bones in the fallback lane; a no-op for native rigs. Always call it — that
   *  is the point: the boot code never changes when the lane does. */
  update(delta: number): void;
  dispose(): void;
}

/** A REMOTE player's body: visual only, so no per-frame update and no physics. */
export interface RemotePlayerCharacter {
  kind: PlayerCharacterKind;
  scene: THREE.Group;
  clips: THREE.AnimationClip[];
  locomotionProfile?: LocomotionProfile;
  /** Detach on 'leave'. GPU resources belong to the shared base, never a clone. */
  dispose(): void;
}

export interface LoadPlayerCharacterOptions {
  /** The visiting player's VRM (`user.avatarUrl` from the embed identity). Fallback lane only. */
  avatarUrl?: string | null;
  /** Asset base. Default "./assets/". */
  base?: string;
  /** Manifest override. Default `${base}meshy-character.json`. */
  manifestUrl?: string;
  /** Passed through to the Meshy loader — the quality kit's decoder-wired loader
   *  and per-tier model rung ladder (`$genex-threejs-adaptive-quality`). */
  meshy?: LoadMeshyCharacterOptions;
}

/**
 * Does this game have a generated character? A dev server answers HTTP 200 with
 * `index.html` for ANY unknown path, so `res.ok` is not evidence — the JSON
 * parse plus the manifest's own identity fields are. False is the quiet,
 * expected answer for a game that has not generated its character yet.
 *
 * Exported for tests: this probe is the whole routing decision.
 */
export async function probeGeneratedCharacter(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return false;
    const manifest = (await response.json()) as { schema?: number; rig?: string } | null;
    return manifest?.schema === 1 && manifest.rig === "meshy-biped";
  } catch {
    return false; // absent, or the dev server's index.html — same meaning here
  }
}

// One PARSED base per manifest URL — the clone source for remote players, so N
// remotes cost ~1 character of GPU memory instead of N (the same trade the VRM
// lane's loadVrmCloneBase makes). Never animated; clones carry their own mixer.
const generatedBaseCache = new Map<string, Promise<MeshyCharacter>>();
// Retargeted fallback clips per (avatar URL + asset base) — retargeting is per
// humanoid rig, and every clone of one URL shares one base rig.
const fallbackClipsCache = new Map<string, Promise<THREE.AnimationClip[]>>();

function generatedBase(url: string, options?: LoadMeshyCharacterOptions): Promise<MeshyCharacter> {
  let cached = generatedBaseCache.get(url);
  if (!cached) {
    cached = loadMeshyCharacter(url, options);
    cached.catch(() => generatedBaseCache.delete(url)); // failures retry next call
    generatedBaseCache.set(url, cached);
  }
  return cached;
}

/**
 * The LOCAL player's body. Wire it once at boot and never touch it again:
 *
 * ```ts
 * const player = await loadPlayerCharacter({ avatarUrl: user.avatarUrl });
 * const fit = capsuleFromModel(player.scene);
 * character.root.add(player.scene);
 * player.scene.position.y = fit.modelOffsetY;
 * const anims = new CharacterAnimations(player.scene, player.clips, {
 *   locomotionProfile: player.locomotionProfile,
 * });
 * // per render frame: anims.update(character, delta); player.update(delta);
 * ```
 */
export async function loadPlayerCharacter(
  options: LoadPlayerCharacterOptions = {},
): Promise<PlayerCharacter> {
  const base = options.base ?? "./assets/";
  const manifestUrl = options.manifestUrl ?? `${base}meshy-character.json`;
  const fallbackUrl = `${base}avatar.vrm`;

  if (await probeGeneratedCharacter(manifestUrl)) {
    try {
      const native = await loadMeshyCharacter(manifestUrl, options.meshy);
      return {
        kind: "generated",
        scene: native.scene,
        clips: native.clips,
        locomotionProfile: native.locomotionProfile,
        update: (delta) => native.update(delta),
        dispose: () => native.dispose(),
      };
    } catch (error) {
      // LOUD: this game HAS a character and it failed — a dead R2 URL or a rig
      // mismatch, not the ordinary "no character yet" path above.
      console.warn(
        "[player-character] the generated character failed to load — falling back to the avatar",
        error,
      );
    }
  }

  const { scene, vrm } = await loadVrm(options.avatarUrl || fallbackUrl).catch(() =>
    loadVrm(fallbackUrl),
  );
  const clips = await loadCharacterClips(vrm, { base });
  return {
    kind: "avatar",
    scene,
    clips,
    update: (delta) => vrm.update(delta),
    dispose: () => VRMUtils.deepDispose(scene),
  };
}

/**
 * A REMOTE player's body. In a game with a generated character EVERY player
 * wears it — the game should look like the game that was designed, and a mixed
 * roster (one themed knight plus three stock avatars) is the same incoherence
 * as capsule-and-cone remotes. Without a generated character each remote keeps
 * their own `avatarUrl`, which is the right look for a game with no themed cast.
 *
 * Visual only: no physics body, no controller, no per-frame update. Clones share
 * the base's geometry/materials/textures, so `dispose()` detaches — it never
 * disposes GPU resources the base and every other clone still use.
 */
export async function loadRemotePlayerCharacter(
  options: LoadPlayerCharacterOptions = {},
): Promise<RemotePlayerCharacter> {
  const base = options.base ?? "./assets/";
  const manifestUrl = options.manifestUrl ?? `${base}meshy-character.json`;
  const fallbackUrl = `${base}avatar.vrm`;

  if (await probeGeneratedCharacter(manifestUrl)) {
    try {
      const shared = await generatedBase(manifestUrl, options.meshy);
      const scene = SkeletonUtils.clone(shared.scene) as THREE.Group;
      return {
        kind: "generated",
        scene,
        clips: shared.clips,
        locomotionProfile: shared.locomotionProfile,
        dispose: () => scene.removeFromParent(),
      };
    } catch (error) {
      console.warn(
        "[player-character] the generated character failed to load for a remote player — falling back to their avatar",
        error,
      );
    }
  }

  const requested = options.avatarUrl || fallbackUrl;
  const url = await loadVrmCloneBase(requested).then(
    () => requested,
    () => fallbackUrl,
  );
  const shared = await loadVrmCloneBase(url);
  const clipsKey = `${url} ${base}`;
  let clips = fallbackClipsCache.get(clipsKey);
  if (!clips) {
    clips = loadCharacterClips(shared.vrm, { base });
    clips.catch(() => fallbackClipsCache.delete(clipsKey));
    fallbackClipsCache.set(clipsKey, clips);
  }
  const scene = SkeletonUtils.clone(shared.scene) as THREE.Group;
  return { kind: "avatar", scene, clips: await clips, dispose: () => scene.removeFromParent() };
}
