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
import { buildComplex, lightComplex, HALL, LAMP_RIG } from "./world/complex.ts";
import { buildAmbience, updateAmbience } from "./world/ambience.ts";
import { buildHazards, updateHazards } from "./world/hazards.ts";
import { Stalker } from "./hunter/stalker.ts";
import { Arsenal, WEAPONS } from "./combat/arsenal.ts";
import { Crates } from "./combat/crates.ts";
import { Hunt } from "./game/hunt.ts";
import { Hud } from "./ui/hud.ts";
import { initAudio, setMusicIntensity, play } from "./audio.ts";
import { createPost } from "./render/post.ts";
import { updateSparks, fadeNearCamera, flashBody, sparkBurst, gradeCreature } from "./fx/hits.ts";
import { Footsteps } from "./fx/footsteps.ts";
import { shake, shakeOffset, hitstop, timeScale, landPuff, updateFeel, FallWatch } from "./fx/feel.ts";
import { Screens } from "./game/phase.ts";
import { Cling } from "./player/cling.ts";
import { Traverse } from "./player/traverse.ts";
import { JackAI } from "./hunter/jack.ts";
import { Online } from "./net/online.ts";
import type { Side as SideT } from "./game/phase.ts";
import { AUDIO, MODELS, MENU_VIDEO } from "./assets.ts";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { pickModel, loadModelWithFallback } from "./controllers/quality/pick-asset.ts";
import { createGltfLoader } from "./controllers/quality/gltf-loader.ts";
import { BodyAnim } from "./anim/body-anim.ts";

const $ = <T extends Element>(sel: string): T => {
  const el = document.querySelector<T>(sel);
  if (!el) throw new Error("missing " + sel);
  return el;
};

async function boot(): Promise<void> {
  const canvas = $<HTMLCanvasElement>("#game");
  const screens = new Screens();          // shows the loader immediately

  // ── device tier owns the renderer's budget from the first frame ──
  const tier = detectTier();
  const renderer = new THREE.WebGLRenderer({
    canvas,
    // a post stack runs, so context MSAA would anti-alias a buffer the composer
    // never reads — the samples come from tier.composerSamples instead
    antialias: rendererAntialias(tier, true),
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, tier.dprCap));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = tier.shadowMapSize > 0;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  // background + environment come from the sky in lightComplex — a flat clear
  // colour under a midday sun is exactly the flatness #100 is about
  const camera = new THREE.PerspectiveCamera(
    62,
    window.innerWidth / window.innerHeight,
    0.1,
    260 * tier.drawDistanceScale,
  );

  const sun = lightComplex(scene, tier.shadowMapSize, renderer);
  const post = createPost(renderer, scene, camera, tier);
  // Audio belongs to the camera and must exist before the menu — the menu needs
  // its bed and its ticks, and the unlock listener rides the first gesture.
  initAudio(camera);

  // ── physics + the floor you walk on ──
  const physics = await PhysicsWorld.create();
  const walls = buildComplex(scene, physics);
  buildAmbience(scene, LAMP_RIG);   // dust, drips, braziers
  buildHazards(scene);              // swinging logs and scarab swarms (#95)

  // ── the player's body: this game's character once it lands, the visiting
  // player's avatar until then. One shape either way — no rewrite later. ──
  const { user } = await waitForPlayer();
  // #79 — the player's body goes through the rung ladder too: a decoder-wired
  // loader plus the candidate list, best rung first, bare URL last so a missing
  // rung degrades instead of failing.
  const gltf = createGltfLoader(renderer);
  const player = await loadPlayerCharacter({
    avatarUrl: user.avatarUrl,
    meshy: {
      loader: gltf.loader,
      modelUrlCandidates: (url) => [
        pickModel(url, tier, { ktx2: true }),
        pickModel(url, tier),
        url,
      ],
    },
  });
  const fit = capsuleFromModel(player.scene);

  const character = new CharacterController(physics.world, camera, {
    ...characterPresets["default"].options,
    ...fit,
    // capsuleFromModel measures the MESH, and a humanoid's mesh is narrow — it
    // hands back a 0.15m radius, a 15cm-wide person. A needle that thin against
    // the hall's 140x90 floor slab is what blows the solver up; give it a body's
    // width instead.
    capsuleRadius: Math.max(fit.capsuleRadius, 0.32),
    // CCD is for things that move fast enough to tunnel. A walking character is
    // not that, and it is expensive on every contact.
    ccd: false,
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

  // #91 — Jack fires from the camera, which in third person puts the bolt and the
  // flash in mid-air beside his head. Aim stays on the camera axis (that is what
  // makes the crosshair honest) but the shot is DRAWN from his hand, and his
  // upper body turns to point where the crosshair does. Both are procedural:
  // a real weapon model and an aim clip are blocked on credits.
  let handBone: THREE.Object3D | null = null;
  let aimBone: THREE.Object3D | null = null;
  player.scene.traverse((o) => {
    const n = o.name.toLowerCase();
    if (!handBone && /hand/.test(n) && /r|right/.test(n.replace("hand", ""))) handBone = o;
    if (!aimBone && /(spine.*2|chest|upperchest)/.test(n)) aimBone = o;
  });
  if (!aimBone) player.scene.traverse((o) => { if (!aimBone && /spine/.test(o.name.toLowerCase())) aimBone = o; });
  const handPos = new THREE.Vector3();

  // Jack's blaster is mouse-aimed, so pointer-lock aim stays on (the default).
  const kb = new KeyboardInput();
  const aimCue = createAimCue();
  // the controller's brain runs once per FIXED substep, before world.step()
  physics.onBeforeStep(() => {
    const mv = kb.getCharacterMovement();
    character.setMovement(mv);
    character.update();

    // Shift is a HOLD, and the input layer honours that — but the controller only
    // ever pushes UP to its target speed and never brakes back down, and the
    // capsule's friction is negative on purpose (traction is synthesised by the
    // move impulse). So letting go of Shift left you coasting at run speed
    // indefinitely, which reads exactly like a toggle. Bleed the excess off.
    if (!mv.run && character.isOnGround) {
      const v = character.body.linvel();
      const speed = Math.hypot(v.x, v.z);
      const walkCap = 2.2;
      if (speed > walkCap) {
        // ease down over a few steps rather than snapping — an instant stop reads
        // as hitting a wall
        const k = Math.max(walkCap / speed, 0.90);
        character.body.setLinvel({ x: v.x * k, y: v.y, z: v.z * k }, true);
      }
    }
  });

  // Everything heavy is loaded — offer the choice, then build the match around it.
  screens.set("menu");
  const choice = await screens.chosen;
  const online = choice.mode === "online" ? new Online() : null;
  let asStalker = choice.mode === "solo" && choice.side === "stalker";

  if (online) {
    // matchmake() fires HERE — on the commit, never at boot. A player sitting in
    // the menu must not hold a seat other people are queuing behind.
    screens.onCancel = () => { online.leave(); location.reload(); };
    screens.set("lobby");
    await online.join();
    // The waiting screen is driven by the live status, read every frame below —
    // never by an event, and never by a host-written "go" that might never come.
    await new Promise<void>((resolve) => {
      const poll = window.setInterval(() => {
        online.syncSession();
        online.reconcileSides();
        // "opponent found" while you sit there alone is a lie — say what is true
        const st = online.status;
        screens.setLobbyLine(
          st === "playing" ? "opponent found — starting"
          : `waiting for an opponent — ${online.lobbyCount} / 2`,
        );
        if (online.live && online.mySide) { clearInterval(poll); resolve(); }
      }, 250);
    });
    asStalker = online.mySide === "stalker";
  }
  screens.set("playing");
  // #90 — the follow distance was tuned for Jack at 1.8m. The beast is 2.4m and
  // far broader, so the same offset puts the camera inside its chest. Scale the
  // orbit to the body instead of using one constant for both sides.
  const bodyScale = asStalker ? 1.7 : 1;
  const followCam = new FollowCamera(camera, {
    domElement: renderer.domElement,
    colliderMeshes: walls, // static environment only — never the player's own mesh
    onAimChange: aimCue.onAimChange,
    initialDistance: 4 * bodyScale,
    minDistance: asStalker ? 3.4 : 0.02,
    maxDistance: 12 * bodyScale,
  });

  // The pause menu's Look slider drives the camera's sensitivity live; the
  // persisted value applies at boot. The looping menu clip animates the still
  // once credits pay for one (#77) — phone tiers keep the poster.
  screens.onSensitivity = (v: number) => { followCam.aimSensitivity = v; };
  followCam.aimSensitivity = screens.sensitivity;
  if (tier.name !== "phone-low" && tier.name !== "phone") screens.attachMenuVideo(MENU_VIDEO);

  // #93 — the camera used to orbit freely while the character turned to face its
  // travel, so after a few direction changes W meant nothing intuitive and the
  // beast's leap (which launches along the camera azimuth) fired somewhere you
  // did not intend. Ease the camera behind the heading while moving, and get out
  // of the way the moment the player looks around on purpose.
  let lastLook = 0;
  // One body per remote, built exactly once. The reservation is taken
  // synchronously: `remotes()` is read every frame, and a guard that straddles
  // an await is not a guard — it spawns a clone per frame and leaves a trail.
  const remoteBodies = new Map<string, THREE.Group>();
  const remoteLoading = new Set<string>();
  const remoteBody = (id: string, remoteSide: SideT | null): THREE.Group | null => {
    const existing = remoteBodies.get(id);
    if (existing) return existing;
    if (remoteLoading.has(id) || !remoteSide) return null;
    remoteLoading.add(id);
    void (async () => {
      try {
        const url = remoteSide === "stalker" ? MODELS.stalker : MODELS.jack;
        const gltf = await new GLTFLoader().loadAsync(pickModel(url, tier));
        if (!online?.room?.players.has(id)) return;   // left while loading
        const g = gltf.scene;
        g.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
        const box = new THREE.Box3().setFromObject(g);
        const h = box.max.y - box.min.y || 1.8;
        const sc = (remoteSide === "stalker" ? 2.4 : 1.8) / h;
        g.scale.setScalar(sc);
        scene.add(g);
        remoteBodies.set(id, g);
      } finally { remoteLoading.delete(id); }
    })();
    return null;
  };
  const dropStaleRemotes = (live: Set<string>): void => {
    for (const [id, g] of remoteBodies) {
      if (!live.has(id)) { scene.remove(g); remoteBodies.delete(id); }
    }
  };

  addEventListener("mousemove", (e) => {
    if (Math.abs(e.movementX) + Math.abs(e.movementY) > 2) lastLook = performance.now();
  });

  const hintEl = document.querySelector<HTMLElement>("#hint");
  if (hintEl) {
    hintEl.textContent = asStalker
      ? "WASD move · Shift run · Space grab wall · Left click CLAW · Esc pause"
      : "WASD move · Shift run · Space jump · Left click FIRE · Esc pause";
  }

  // ── the hunt ──
  const hud = new Hud(asStalker ? 6 : 5, asStalker ? 0 : 5);
  const hunt = new Hunt(scene, { maxHp: asStalker ? 6 : 5, needCells: asStalker ? 0 : 5 });
  // A bomb detonates seconds after it leaves your hand, by which time the list
  // of things it can hurt has moved. The hook is filled in below, once the
  // targets exist — the arsenal itself stays ignorant of who is in the match.
  let onBlastHook: (at: THREE.Vector3, damage: number, radius: number) => void = () => {};
  const arsenal = new Arsenal(scene, camera, (at, d, r) => onBlastHook(at, d, r));
  const crates = asStalker ? null : new Crates(scene);
  if (asStalker) hud.hideWeapon();
  const hurt = (d: number) => {
    const before = hunt.hp;
    hunt.damage(d);
    if (hunt.hp < before) {
      hud.flashHurt();
      // your own body reacts too — in third person you can see yourself take it
      flashBody(character.root, 0xff3a24);
      sparkBurst(scene, character.currPos.clone().setY(character.currPos.y + 1.2), 0xff8a60, 12);
      // and the CAMERA reacts, which is the part you feel rather than see: a
      // brief freeze so the hit lands, then a shake scaled to how bad it was
      hitstop(0.05 + Math.min(0.06, d * 0.03));
      shake(0.34 + Math.min(0.4, d * 0.2));
    }
  };

  // You are one of these; the AI wears the other.
  // Online, the other seat is a person — no AI stands in for them.
  const stalker = !online && !asStalker ? new Stalker(scene, { pounceDamage: 2, onHitPlayer: hurt }) : null;
  const jack = !online && asStalker ? new JackAI(scene, { damage: 1, onHitPlayer: hurt }) : null;
  const foe = () => (asStalker ? jack : stalker);

  // Playing the beast: wall-climb and ceiling-crawl take the body off the
  // physics controller — see src/player/cling.ts.
  const cling = asStalker ? new Cling(physics, character, walls, scene) : null;

  // Playing the human: no cling to bare stone, but ledges and chains ARE holds.
  // The asymmetry survives — the beast goes anywhere, you go where the ruin
  // offers something to grab — and Jack stops being a man on a flat floor.
  const traverse = !asStalker ? new Traverse(physics, character, walls) : null;
  traverse?.setBody(player.scene);

  // ...and you wear the beast, not Jack. The platform's character loader always
  // resolves the game's ONE generated character (Jack), so the second playable
  // body is swapped in here rather than fought for upstream.
  let beastAnim: BodyAnim | null = null;
  if (asStalker) {
    player.scene.visible = false;
    // same rung-ladder fix as the AI Stalker: a bare pickModel() 404s on this
    // asset and leaves you wearing nothing at all
    loadModelWithFallback(MODELS.stalker, tier, (u) => new GLTFLoader().loadAsync(u)).then((gltf) => {
      const body = gltf.scene;
      body.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
      gradeCreature(body);
      const box = new THREE.Box3().setFromObject(body);
      const h = box.max.y - box.min.y || 1.8;
      const sc = 2.4 / h;
      body.scale.setScalar(sc);
      body.position.y = fit.modelOffsetY - box.min.y * sc;
      character.root.add(body);
      if (gltf.animations.length) beastAnim = new BodyAnim(body, gltf.animations);
      cling?.setBody(body);        // so the arms can reach for the surface
    }).catch(() => { /* the VRM body stays visible rather than no body at all */ });
  }

  // Gated on the PHASE, never on pointer lock. Locking is a camera convenience;
  // if it is refused, dropped or swallowed the player must still be able to
  // fight, and the first click after entering must not vanish into acquiring it.
  // The beast's signature move. Hold Space to wind up, release to launch — the
  // longer the charge the higher and further it goes, and a full charge from a
  // standing start should reach the ceiling. Grabbing is automatic on contact
  // (see cling.update): asking for a second, apex-timed keypress is the
  // fiddliest possible version of this.
  let charge = 0;
  const CHARGE_MAX = 0.75;
  const launch = (): void => {
    if (!asStalker || !cling || cling.active) return;
    const t = Math.min(charge, CHARGE_MAX) / CHARGE_MAX;
    charge = 0;
    const up = 7.5 + t * 9.5;                       // ~2.9m uncharged, ~14m full
    const fwd = 3 + t * 7;
    const a = followCam.azimuthAngle;
    // Carry the run into the leap. Setting velocity outright made a sprinting
    // launch land exactly where a standing one did — the same weightlessness the
    // 2D game had before it started treating speed as a carried quantity
    // (quarry-2d-final). Momentum ADDS to the launch; it does not get discarded.
    const v = character.body.linvel();
    character.body.setLinvel(
      {
        x: v.x * 0.8 + -Math.sin(a) * fwd,
        y: up,
        z: v.z * 0.8 + -Math.cos(a) * fwd,
      },
      true,
    );
    play(AUDIO.step, 0.5, 0.7);
  };

  /**
   * Online the opponent is a remote BODY, not an AI instance — and all the hit
   * feedback lived inside the AI classes' takeHit(). So a shot across the wire
   * produced a tracer and nothing else: the beast never felt the bullets.
   *
   * The shooter predicts the impact locally rather than waiting for the round
   * trip. That is correct here because it is purely cosmetic: the victim still
   * owns the damage, so a mispredicted flash costs a flash, never a health point.
   */
  const impact = (body: THREE.Object3D, hex: number): void => {
    flashBody(body, hex);
    sparkBurst(scene, body.position.clone().setY(body.position.y + 1.5), 0xffb070, 16);
    play(AUDIO.claw, 0.45, 1.15);
  };

  // Online the opponent is a person, not an AI — the AI handles are null, and
  // dereferencing them here is what made attacking throw and do nothing at all.
  const liveTargets = (): Array<readonly [string, THREE.Object3D]> => (
    online
      ? [...remoteBodies.entries()] as Array<readonly [string, THREE.Object3D]>
      : asStalker
        ? (jack ? [["ai", jack.root] as const] : [])
        : (stalker ? [["ai", stalker.root] as const] : [])
  );

  /** One door for every source of damage — bullets, pellets and blasts all end
   *  up here, so a new weapon can never forget to check for the kill. */
  const dealTo = (id: string, body: THREE.Object3D, amount: number, hex = 0xff4020): void => {
    if (id === "ai") {
      const ai = asStalker ? jack : stalker;
      if (!ai || !ai.alive) return;
      ai.takeHit(amount);
      if (!ai.alive) hunt.foeDown();
    } else {
      online!.hit(id, amount);
      impact(body, hex);
    }
  };

  // filled in now that the targets exist — see the note at the arsenal
  onBlastHook = (at, damage, radius) => {
    sparkBurst(scene, at.clone(), 0xffb070, 40);
    for (const [id, body] of liveTargets()) {
      const d = body.position.distanceTo(at);
      if (d > radius) continue;
      // full damage at the centre, tapering to nothing at the rim
      dealTo(id, body, damage * (1 - d / radius), 0xffa040);
    }
    // your own bomb can catch you — the reason you throw it and then move
    const mine = character.currPos.distanceTo(at);
    if (mine < radius) hurt(Math.round(damage * (1 - mine / radius) * 0.6));
  };

  addEventListener("pointerdown", () => {
    if (hunt.outcome !== "playing" || screens.current !== "playing") return;
    // from a hang, a click is the dive — the AI's pounce, in the player's hands
    if (asStalker && cling?.state === "ceiling") { cling.pounce(followCam.azimuthAngle); return; }
    hud.pulseCrosshair();
    const targets = liveTargets();

    if (asStalker) {
      // claws: short reach, heavy hit, no ammo
      for (const [id, body] of targets) {
        const at = body instanceof THREE.Object3D ? body.position : body;
        if (character.currPos.distanceTo(at) > 4.2) continue;
        play(AUDIO.claw, 0.8);
        if (id === "ai") { jack!.takeHit(2); if (!jack!.alive) hunt.foeDown(); }
        else { online!.hit(id, 2); impact(body as THREE.Object3D, 0xff5a3c); }
        break;
      }
    } else {
      const from = handBone ? (handBone as THREE.Object3D).getWorldPosition(handPos) : undefined;
      const meshes = targets.map(([, b]) => b);
      // a shotgun lands several pellets on one body — they arrive summed, so the
      // damage owed is one number per victim rather than one per pellet
      for (const { root, damage } of arsenal.fireAt(meshes, walls, from)) {
        const entry = targets.find(([, b]) => root === b || b.getObjectById(root.id));
        if (entry) dealTo(entry[0], entry[1], damage);
      }
    }
  });

  // Q cycles, 1-4 select directly. Both are ignored playing the beast, which
  // has claws and nothing to swap between.
  if (!asStalker) {
    const slots = ["blaster", "scatter", "shotgun", "bomb"] as const;
    addEventListener("keydown", (e) => {
      if (screens.current !== "playing") return;
      if (e.code === "KeyQ") { arsenal.cycle(); return; }
      const n = ["Digit1", "Digit2", "Digit3", "Digit4"].indexOf(e.code);
      if (n >= 0) arsenal.select(slots[n]);
    });
    addEventListener("wheel", () => { if (screens.current === "playing") arsenal.cycle(); }, { passive: true });
  }

  addEventListener("keyup", (e) => { if (e.code === "Space") launch(); });
  addEventListener("keydown", (e) => {
    if (e.code === "KeyR" && hunt.outcome !== "playing") { hud.hideEnd(); location.reload(); return; }
    if (e.code === "Escape" && hunt.outcome === "playing") {
      screens.set(screens.current === "paused" ? "playing" : "paused");
    }
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
      setPostEnabled: (on) => post.setEnabled(on),
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
      post.setSize(window.innerWidth, window.innerHeight);
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
  const sightRay = new THREE.Raycaster();

  // Footsteps. Yours are 2D and quiet; everyone else's are positional and are
  // meant to be heard through a wall before they are seen around it.
  const fall = new FallWatch();
  let hazardDebt = 0;
  const myFeet = new Footsteps(asStalker);
  const foeFeet = new Footsteps(!asStalker);
  const remoteFeet = new Map<string, Footsteps>();
  let last = performance.now();
  // A throw inside the animation callback stops three.js re-requesting the
  // frame, so ONE bad frame ends the game permanently — which is exactly how a
  // physics panic turned into "I can walk for two seconds and then it is stuck".
  // Never let that class of bug be fatal again: log once, skip the frame, keep
  // rendering.
  let loopFaults = 0;
  renderer.setAnimationLoop(() => {
    try {
      frame();
    } catch (err) {
      if (loopFaults++ === 0) console.error("[quarry] frame fault — continuing", err);
    }
  });

  function frame(): void {
    const now = performance.now();
    const real = Math.min((now - last) / 1000, 0.1);
    last = now;
    // Hitstop: the world stops for a few dozen milliseconds on a solid connect,
    // which is what makes a hit feel like it MET something. The camera and the
    // post stack keep running on real time, so the freeze reads as impact
    // rather than as a dropped frame.
    const delta = timeScale(real) === 0 ? 0 : real;
    if (contextLost) return;

    physics.step(delta); // fixed substeps (which run the controller) + mesh sync

    // look over the shoulder of whichever body it is, not through its waist
    pivot.copy(character.currPos).addScaledVector(character.bodyYAxis, 0.5 * bodyScale);
    pivot.add(shakeOffset(real));
    followCam.moveTo(pivot.x, pivot.y, pivot.z, true);
    followCam.setUp(character.upAxis);
    if (physics.stepsLastFrame > 0 && character.isOnPlatform) {
      followCam.applyPlatformTurn(character.turnOnYQuat);
    }
    // A deliberate look always wins; alignment resumes shortly after you stop.
    const steering = kb.getCharacterMovement();
    const wantsMove = !!(steering.forward || steering.backward || steering.leftward || steering.rightward);
    if (wantsMove && !cling?.active && !traverse?.active && performance.now() - lastLook > 850) {
      followCam.alignHeading(character.bodyZAxis, delta);
    }
    followCam.update(delta);

    anims.update(character, delta);
    player.update(delta);
    // additive aim — the mixer has just written the bone rotations, so this
    // layers on top of whatever gait is playing rather than fighting it
    if (aimBone && !asStalker) {
      const pitch = THREE.MathUtils.clamp(followCam.polarAngle - Math.PI / 2, -0.55, 0.55);
      let yaw = followCam.azimuthAngle - Math.PI - character.root.rotation.y;
      while (yaw > Math.PI) yaw -= Math.PI * 2;
      while (yaw < -Math.PI) yaw += Math.PI * 2;
      const b = aimBone as THREE.Object3D;
      b.rotation.x += pitch * 0.8;
      b.rotation.y += THREE.MathUtils.clamp(yaw, -0.7, 0.7) * 0.5;
    }
    // clinging to a wall or ceiling is holding on, not travelling
    beastAnim?.update(delta, character.currPos, { frozen: !!cling?.active });
    // the reach layers ON TOP of the clip — before the mixer, the clip wins
    cling?.poseArms();
    // ORDER MATTERS, and getting it wrong is what made climbing look wrong: the
    // IK solves hand and foot targets in WORLD space, so the body has to be
    // facing the surface BEFORE it runs. Rotating the root afterwards carried
    // the arms round with it and lifted the hands clean off the stone.
    const holdYaw = traverse?.facing;
    if (holdYaw !== null && holdYaw !== undefined) {
      character.root.rotation.y = holdYaw;
      character.root.updateMatrixWorld(true);
    }
    // and freeze the gait while holding on — a walk cycle playing under a climb
    // is the rest of what read as "weird"
    anims.setPaused(!!traverse?.holding);
    traverse?.poseLimbs();

    // ── the hunt ──
    const here = character.currPos;
    if (hunt.outcome === "playing" && screens.current === "playing") {
      // playing the beast: climbing takes the body off the controller
      if (cling) {
        const mv = kb.getCharacterMovement();
        if (mv.jump && !cling.active) charge = Math.min(charge + delta, CHARGE_MAX);
        cling.update(delta, {
          forward: (mv.forward ? 1 : 0) - (mv.backward ? 1 : 0),
          right: (mv.rightward ? 1 : 0) - (mv.leftward ? 1 : 0),
          grab: !!mv.jump,
          drop: !!mv.crouch,
        }, followCam.azimuthAngle);
      }

      // The ruin itself, which does not hunt you but does punish carelessness.
      // Damage accumulates in fractions (the swarms bleed) so it is banked and
      // spent a whole hit at a time rather than rounding away to nothing.
      if (!asStalker) {
        hazardDebt += updateHazards(delta, now / 1000, here, scene, (dir) => {
          const v = character.body.linvel();
          character.body.setLinvel({ x: dir.x * 9, y: 5.5, z: dir.z * 9 }, true);
          void v;
        });
        if (hazardDebt >= 1) { const n = Math.floor(hazardDebt); hazardDebt -= n; hurt(n); }
      }

      // Landing. This is where the 28 m walls get their stakes: climbing only
      // means something if being up there can cost you. A mantle, a vine drop
      // and a hop off the 6 m ledge all land free — only a real fall hurts.
      if (traverse?.holding) {
        fall.clear(here.y);
      } else {
        const drop = fall.update(here.y, character.isOnGround);
        if (drop > 1.2) {
          const hard = Math.min(1, drop / 16);
          landPuff(scene, here.clone().setY(here.y - 0.85), hard);
          if (drop > 4) { shake(0.10 + hard * 0.42); play(AUDIO.step, 0.4 + hard * 0.5, 0.7); }
          const dmg = FallWatch.damageFor(drop);
          if (dmg > 0) { hitstop(0.06); hurt(dmg); }
        }
      }

      // playing the human: ledge grabs, shimmy, mantle, chain climbs
      if (traverse) {
        const mv = kb.getCharacterMovement();
        traverse.update(delta, {
          forward: (mv.forward ? 1 : 0) - (mv.backward ? 1 : 0),
          right: (mv.rightward ? 1 : 0) - (mv.leftward ? 1 : 0),
          jump: !!mv.jump,
          drop: !!mv.crouch,
        }, followCam.azimuthAngle);
      }

      const enemy = foe();
      let pressure = 0;

      if (enemy) {
        // ── solo: the other side is an AI ──
        const flat = new THREE.Vector3(here.x - enemy.position.x, 0, here.z - enemy.position.z);
        const dist = flat.length();
        sightRay.set(enemy.position.clone().setY(1.6), flat.clone().normalize());
        sightRay.far = Math.max(dist, 0.01);
        const blocked = dist > 0.2 && sightRay.intersectObjects(walls, false).length > 0;
        if (stalker) stalker.update(delta, here, !blocked);
        if (jack) jack.update(delta, here, !blocked);
        pressure = enemy.alive ? enemy.pressure(here) : 0;
        // the AI's approach is now audible before it is visible
        if (enemy.alive) foeFeet.update(enemy.position, false, scene);
      } else if (online) {
        // ── online: the other seat is a person ──
        online.setLocal(
          character.root.position,
          character.root.quaternion,
          hunt.hp,
          cling?.active ? 1 : character.isOnGround ? 0 : 2,
        );
        online.reconcileSides();
        online.onHit((d) => hurt(d));
        // you win when the other seat publishes itself dead
        if (online.foeIsDown()) hunt.foeDown();
        // ...and a 1v1 with nobody in it is not a match. Without this the last
        // player left stands in a live room alone, forever.
        if (online.opponents === 0 && hunt.outcome === "playing") {
          hunt.abandon();
        }
        for (const r of online.remotes()) {
          const body = remoteBody(r.id, r.side);
          if (!body) continue;
          // straight from `state` — it is already smoothed; re-smoothing here is
          // what makes a networked game feel laggy
          body.position.set(r.state.x, r.state.y, r.state.z);
          if (r.state.q?.length === 4) body.quaternion.fromArray(r.state.q as number[]);
          let feet = remoteFeet.get(r.id);
          if (!feet) { feet = new Footsteps(r.side === "stalker"); remoteFeet.set(r.id, feet); }
          // pose 2 is airborne — a leaping body is not stepping
          feet.update(body.position, false, scene, r.state.pose === 2);
          const d = here.distanceTo(body.position);
          pressure = Math.max(pressure, Math.min(1, Math.max(0, 1 - d / 60)));
        }
        const live = new Set(online.remotes().map((r) => r.id));
        dropStaleRemotes(live);
        for (const id of remoteFeet.keys()) if (!live.has(id)) remoteFeet.delete(id);
      }

      // #82 — a landed pounce filled the frame with opaque body; fading whatever
      // is on top of the lens keeps the room readable
      if (stalker?.alive) fadeNearCamera(stalker.root, camera);
      if (jack?.alive) fadeNearCamera(jack.root, camera);

      // your own steps — not while airborne, and not while hanging off a wall
      myFeet.update(here, true, scene, !character.isOnGround || !!cling?.active);

      const got = crates?.update(delta, here);
      if (got) { arsenal.give(got); hud.announcePickup(WEAPONS[got].label); }
      if (!asStalker) hud.setWeapon(arsenal.label, arsenal.rounds);

      hunt.update(delta, here);
      setMusicIntensity(pressure);
      if (asStalker && enemy) hud.setInRange(enemy.alive && here.distanceTo(enemy.position) < 4.2);
      const foeHp = stalker ? stalker.hp / 6 : jack ? jack.hp / 5 : 1;
      hud.update(hunt.hp, hunt.cells, hunt.extractionOpen, pressure,
                 stalker ? stalker.state : "prowl", enemy ? foeHp : 1);
      if (hunt.outcome !== "playing") hud.showEnd(hunt.outcome === "won", hunt.cells, hunt.winReason, asStalker, hunt.outcome === "abandoned");
    }
    arsenal.update(delta, walls);
    updateSparks(delta, scene);
    updateFeel(real);
    updateAmbience(delta, now / 1000);
    governor.frame(delta * 1000);

    post.render(delta);
  }
}

void boot();
