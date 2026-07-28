// QUARRY — boot. Identity first, then the device tier, then the world.
import { initEmbed, waitForPlayer } from "@genex-ai/embed-sdk";
import { GENEX } from "./genex.config.ts";

initEmbed({
  slug: GENEX.slug,
  apiUrl: GENEX.apiUrl,
  dashboardOrigins: GENEX.dashboardOrigins,
});

import * as THREE from "three";
import { detectTier, rendererAntialias } from "./controllers/quality/tier.ts";
import { QualityGovernor } from "./controllers/quality/governor.ts";
import { PhysicsWorld } from "./controllers/shared/physics-world.ts";
import { CharacterController } from "./controllers/character/character-controller.ts";
import { CharacterAnimations } from "./controllers/character/character-animations.ts";
import { characterPresets } from "./controllers/character/presets.ts";
import { FollowCamera } from "./controllers/character/follow-camera.ts";
import { createAimCue } from "./controllers/character/aim-cue.ts";
import { KeyboardInput } from "./controllers/character/keyboard-input.ts";
import { loadPlayerCharacter } from "./controllers/character/player-character.ts";
import { capsuleFromModel } from "./controllers/character/vrm/capsule-fit.ts";
import { buildComplex, lightComplex, HALL } from "./world/complex.ts";

const $ = <T extends Element>(sel: string): T => {
  const el = document.querySelector<T>(sel);
  if (!el) throw new Error("missing " + sel);
  return el;
};

async function boot(): Promise<void> {
  const canvas = $<HTMLCanvasElement>("#game");

  // ── device tier owns the renderer's budget from the first frame ──
  const tier = detectTier();
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: rendererAntialias(tier, false),
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, tier.dprCap));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = tier.shadowMapSize > 0;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x12161d);
  const camera = new THREE.PerspectiveCamera(
    62,
    window.innerWidth / window.innerHeight,
    0.1,
    260 * tier.drawDistanceScale,
  );

  const sun = lightComplex(scene, tier.shadowMapSize);

  // ── physics + the floor you walk on ──
  const physics = await PhysicsWorld.create();
  const walls = buildComplex(scene, physics);

  // ── the player's body: this game's character once it lands, the visiting
  // player's avatar until then. One shape either way — no rewrite later. ──
  const { user } = await waitForPlayer();
  const player = await loadPlayerCharacter({ avatarUrl: user.avatarUrl });
  const fit = capsuleFromModel(player.scene);

  const character = new CharacterController(physics.world, camera, {
    ...characterPresets["default"].options,
    ...fit,
    position: { x: 0, y: 3, z: 0 },
    userData: { controller: { excludeVehicleRay: true } },
    // the hall is walled, but a physics escape should never strand the player
    isPoseAllowed: (p) =>
      Math.abs(p.x) < HALL.w / 2 + 4 && Math.abs(p.z) < HALL.d / 2 + 4 && p.y > -20,
  });
  scene.add(character.root);
  character.root.add(player.scene);
  // root is the capsule CENTRE — drop the body so the feet meet the floor
  player.scene.position.y = fit.modelOffsetY;
  physics.registerBody(character.body, character.root);

  const anims = new CharacterAnimations(player.scene, player.clips, {
    locomotionProfile: player.locomotionProfile,
  });

  // Jack's blaster is mouse-aimed, so pointer-lock aim stays on (the default).
  const kb = new KeyboardInput();
  const aimCue = createAimCue();
  const followCam = new FollowCamera(camera, {
    domElement: renderer.domElement,
    colliderMeshes: walls, // static environment only — never the player's own mesh
    onAimChange: aimCue.onAimChange,
  });

  // the controller's brain runs once per FIXED substep, before world.step()
  physics.onBeforeStep(() => {
    character.setMovement(kb.getCharacterMovement());
    character.update();
  });

  // keep the shadow frustum on the player rather than on the world origin
  sun.target = character.root;
  scene.add(sun.target);

  // ── quality governor: sustained slowness steps the picture down, never out ──
  const governor = new QualityGovernor(
    tier,
    {
      setDprScale: (m) =>
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, tier.dprCap * m)),
      setShadowQuality: (level) => {
        renderer.shadowMap.enabled = level !== "off";
        if (level !== "off") {
          sun.shadow.mapSize.setScalar(
            level === "full" ? tier.shadowMapSize : Math.max(512, tier.shadowMapSize / 2),
          );
        }
      },
    },
    renderer,
  );

  // ── resize: one trailing setSize per burst (resize storms leak GPU memory) ──
  let resizeTimer = 0;
  addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }, 120);
  });

  // ── context loss: pause rather than die ──
  let contextLost = false;
  const hint = document.querySelector<HTMLElement>("#hint");
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    contextLost = true;
    if (hint) hint.textContent = "restoring…";
  });
  canvas.addEventListener("webglcontextrestored", () => {
    contextLost = false;
    if (hint) hint.textContent = "";
  });

  // ── the loop. performance.now delta, never THREE.Clock.getDelta(). ──
  const pivot = new THREE.Vector3();
  let last = performance.now();
  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const delta = Math.min((now - last) / 1000, 0.1);
    last = now;
    if (contextLost) return;

    physics.step(delta); // fixed substeps (which run the controller) + mesh sync

    pivot.copy(character.currPos).addScaledVector(character.bodyYAxis, 0.5);
    followCam.moveTo(pivot.x, pivot.y, pivot.z, true);
    followCam.setUp(character.upAxis);
    if (physics.stepsLastFrame > 0 && character.isOnPlatform) {
      followCam.applyPlatformTurn(character.turnOnYQuat);
    }
    followCam.update(delta);

    anims.update(character, delta);
    player.update(delta);
    governor.frame(delta * 1000);

    renderer.render(scene, camera);
  });
}

void boot();
