# Routing Map

The director's routing source: which skill owns which system, the execution
order for a Genex game, and the acceptance gate. Use it for every game and
whenever a request touches multiple visual systems.

## Three.js version and references

For new Genex browser-game projects, use the current stable Three.js release
(what `npm i three` installs) and keep the project on the version that is
actually installed — match all docs and examples to it.

For existing projects, inspect and respect the installed Three.js version unless
the user asks to upgrade. Use official Three.js docs first, then official
examples as implementation references. Match examples to the project's installed
Three.js release or branch, and do not blindly copy demo architecture.

## Route by system

| Work needed | Load |
| --- | --- |
| shot composition, chase/side/orbit rigs, camera handoffs, projection ownership, pointer look, mouse-aimed action (shooter, FPS/first-person, sniper, turret, crosshair/reticle), mouse-look, hand-rolled steering/pan/look input signs (screen-direction contract), floating origins | `$genex-threejs-camera-direction` |
| on-foot player movement: walk/run/jump/crouch, third-person character, slopes, stairs, moving platforms, the player's body loader, directional locomotion, transitions, action motion | `$genex-threejs-character-controller` |
| the game's own generated character — the player's BODY wherever a human body appears on screen (first-person included; the exemption is "no human body ever appears", not "the camera is in the head"), enqueued with the first art actions; one user stop riding the concept review, owner-ratified auto-pick on silence (director §7) — or Meshy animation coverage beyond UAL: reference-informed A-pose concepts, exact action IDs, same-rig adapter | `$genex-ai-character` + `$genex-threejs-character-controller` |
| a character or enemy needs a motion the catalog lacks — a signature move, a boss telegraph, a death, a full 8-way movement set, or a performance from the user's own footage: free-text verbs, platform-routed, plan shown before any spend (`genex character animate <id> "<verb>"`, `genex creature animate`, `--locomotion`, `--video`) | `$genex-ai-character` (motion section + `references/motion-generation.md`) |
| remote player bodies in multiplayer — NEVER hand-built primitives: the game's generated character when it has one (everyone wears it), the player's `p.avatarUrl` VRM only when it doesn't | `$genex-threejs-multiplayer` + `$genex-threejs-character-controller` |
| the game has enemies, NPCs, or creatures — **load whenever an enemy roster exists**: rigged bipeds via `npx genex creature`, static + procedural motion for other body shapes, plus the mechanical floor every enemy owes (collider, verified facing, hit reaction, death moment) | `$genex-threejs-creatures` |
| the player drives or flies something: cars, drones, vehicle physics, gearbox, enter/exit between character and vehicle | `$genex-threejs-vehicle-controllers` |
| playable on phones: touch/mobile input for any game — joystick, virtual buttons, drag zones, per-genre touch recipes, rotate-device overlay — wired by default for every NEW game when a recipe fits (skip with a one-line reason) | `$genex-threejs-touch-controls` |
| phone-survivable rendering — device tiers, DPR/shadow/post budgets, the runtime quality governor, per-tier asset rungs for generated skyboxes/textures, the Quality picker, dispose-on-swap discipline — **mandatory for every game at boot wiring** | `$genex-threejs-adaptive-quality` |
| anything falls, collides, gets pushed, or needs physics: Rapier world setup, colliders for meshes and GLBs, collision events | `$genex-threejs-physics-rapier` |
| launch and docking timelines, procedural transform phases, springs, staging, rotating-frame alignment, debris motion | `$genex-threejs-procedural-animation` |
| reusable scalar/vector fields, domain warping, causal masks, procedural normals | `$genex-threejs-procedural-fields` |
| atlas-filtered blocks, planetary surfaces, terrain wetness, lava/emissive procedural surfaces, authored frame PBR, specular AA | `$genex-threejs-procedural-materials` |
| sculpted rails/frames, branch rings, semantic mesh writers, material groups | `$genex-threejs-procedural-geometry` |
| trees, stylized grass, GPU-computed grass fields, branching organisms, roots, foliage, rooted wind deformation | `$genex-threejs-procedural-vegetation` |
| buildings, façade grammars, profiles, ornaments, modular mesh writers | `$genex-threejs-procedural-architecture` |
| planets, terrain, craters, biome fields, coastlines, spherical detail | `$genex-threejs-procedural-planets` |
| sky scattering, planetary shells, depth-based aerial perspective | `$genex-threejs-atmosphere-aerial-perspective` |
| weather-driven raymarched clouds and cloud shadows | `$genex-threejs-volumetric-clouds` |
| hero open-water FFT oceans (expensive — only when open water IS the game): spectral cascades, hybrid FFT/Gerstner clear water, choppy derivatives, Jacobian whitecaps | `$genex-threejs-spectral-ocean` |
| **default water**: an ocean, sea, lake, river, or pool the game plays on or around — authored analytic waves, bounded heightfield pools, object ripples, differential-area caustics, shared normals, heuristic refraction, fallback absorption, crest foam | `$genex-threejs-water-optics` |
| falling snow, snow accumulation, model snow caps, wet asphalt puddles, procedural ripple normals, splash flipbooks, rain streaks, shared weather envelopes, surface wetness | `$genex-threejs-precipitation-surfaces` |
| curved-ray black holes, accretion disks, wormholes | `$genex-threejs-raymarched-space-effects` |
| particles, trails, plasma, shockwaves, layered event effects | `$genex-threejs-procedural-vfx` |
| accumulated screen frost, touch clearing, reduced blur, and refraction masks | `$genex-threejs-temporal-surfaces` |
| the light rig and where light belongs: sun/moon key, practical lights (campfire, torch, neon, lava), emissive-to-light coupling, light shafts and visible beams, fog mood, light signals, flicker, a scene that reads flat or uniformly lit | `$genex-threejs-lighting-design` |
| stable large-world shadows, cascades, clipmaps, cached updates | `$genex-threejs-shadow-systems` |
| GTAO, bent normals, bilateral reconstruction | `$genex-threejs-screen-space-ambient-occlusion` |
| HDR bloom and selective emission contribution | `$genex-threejs-bloom` |
| eye adaptation, tone mapping, LUT grading, output color | `$genex-threejs-exposure-color-grading` |
| shared depth/normal/velocity ownership and multi-pass ordering | `$genex-threejs-image-pipeline` |
| fixed-view diagnostics, seed sweeps, temporal and budget evidence | `$genex-threejs-visual-validation` |
| game content named in the plural or a content genre: quests, objectives, NPCs, dialogue, shops, inventory, loot, XP/progression, an RPG/adventure/story game — **mandatory whenever the ask names content**, and its content contract is written before the asset batch | `$genex-threejs-game-content` |
| a big/open world: kilometers of terrain, multiple regions or locations, exploration, points of interest, biomes, world streaming | `$genex-threejs-open-world` |
| the 2D interface — HUD, menus, pause/win/lose screens, loaders, lobby, on-screen text and buttons, UI state flow — **mandatory for every game**, and its "Plan the UI first" gate runs right after the concept is locked | `$genex-threejs-game-ui` |
| a cinematic menu — main menu/title/pause/victory/defeat/lobby/credits with a looping generated video backdrop behind DOM buttons | `$genex-ai-menu` |
| a cohesive art-directed HUD — generated sprite set (matched frames, masks, icons in one style) wired with masked fills | `$genex-ai-hud` |
| background music — the looping instrumental track under gameplay and menu (default ONE ~90 s track; Music + SFX sliders in settings) | `$genex-ai-music` |
| the game works but feels flat, floaty, or unresponsive: input response, acceleration curves, camera shake, hit feedback, hitstop, cooldowns, difficulty ramp, fail/retry loop | `$genex-threejs-game-feel` |
| realtime multiplayer: movement sync, a shared ball/NPC, host-run scores/enemies, shots/emotes, persistence | `$genex-threejs-multiplayer` |
| player identity, sign-in, guests, saves/progress, per-player state, a shared persistent world, leaderboards — **mandatory for every game** | `$genex-threejs-embed-auth` |

## Execution order

1. Define the game contract: player verb, win/interaction loop, target device,
   camera distance, scene scale, motion, and frame budget. **When the request
   names content in the plural (quests, enemies, locations, bosses, items) or
   a content genre (RPG, adventure, open world, story game), the contract has
   a second half — the content contract from `$genex-threejs-game-content`:**
   every plural noun becomes a countable line (N quests and their chain, N
   named locations, N enemy types and which are bosses, the progression axis,
   the economy's sources and sinks), plus the minute-ten answer ("what is the
   player doing ten minutes in?"). Write it BEFORE step 3's art enqueue and
   before the asset batch — the asset set derives from it, and a world shaped
   around the wrong assets can't be reshaped later. A **big/open world** ask
   additionally fixes the world's scale class as a number here via
   `$genex-threejs-open-world` — kilometers of streamed terrain, never one
   fogged plane. Scope belongs to the user: shipping fewer or smaller than
   the ask requires their explicit OK through a question with real options
   (your question tool when you have one; a short numbered list in chat
   otherwise) — a "vertical slice first" is a build order, never a license
   to shrink the destination silently.
2. Wire player identity before any boot code: `$genex-threejs-embed-auth` is
   mandatory for every game (`initEmbed(...)` + the `waitForPlayer()` gate) —
   saves, leaderboards, and multiplayer auth all come from it.
3. Run `$genex-threejs-game-ui`'s "Plan the UI first" gate: screen inventory,
   one shared style brief, a tier per screen — stated visibly in chat, never
   decided silently. FIRST of all art, generate the gate's **concept mockup** —
   a playable-moment shot (verb + threat + objective in frame, per the
   game-ui gate) WITH the full HUD composited over it: the `$genex-ai-hud`
   Stage-1 image, ONE generation serving as concept, style checkpoint, and
   HUD blueprint (never a separate UI-free concept first, and no candidate
   variants unless the player asks for them). **The moment it lands, the
   cheap style chain fires — nothing waits for the player here**: decide the
   HUD lane as art director and record the `HUD lane:` line in DESIGN.md
   (director §5), then enqueue with `--no-wait` the `$genex-ai-hud` Stage-2
   sheet, the `$genex-ai-menu` still (the menu is the default for every
   game — "it's only a draft" is not a reason to decide no), and the
   logotype. THEN show the player the frame and ask keep-or-change through
   your question tool (a short numbered list in chat when you have none) —
   the answer is INFORMATION, never a gate: silence means the concept
   stands; "change" loops the concept with their notes and the chain re-runs
   from the new frame (image-priced — cheap by design; the game-ui skill
   owns the re-anchor loop). Only the menu VIDEO waits, for the FIRST of:
   the player's yes · the next `genex preview` after the menu still landed ·
   style work being the only work left — and never while a player objection
   is open (two failed videos → ship the still). Later `--edit`-able
   generations anchor to the standing frame for STYLE while the game
   contract owns content. Everything concept-independent — scaffold, boot
   wiring, the core loop, the worker lanes — keeps building in parallel.
   Skipping this enqueue is the #1 way a finished game ships an ugly HUD —
   by step 12 there is nothing to swap in.
4. Lock the visual direction — the same plan-first logic as the UI gate, in
   the same plan block, before any rendering code:
   - **camera**: the rig type and the pointer bucket
     (`$genex-threejs-camera-direction` — the bucket decision is mandatory);
   - **renderer baseline**: tone mapping, exposure, and output color space set
     deliberately at boot (`$genex-threejs-exposure-color-grading` owns the
     staging — stock three.js defaults are not a look);
   - **the post stack**: read the look off your evidence — don't default to a
     single bloom. TWO sources drive it: (a) the CONCEPT FRAME — a rendered
     image that already carries a grade, a bloom level, haze/DoF, maybe grain or
     aberration; name what it actually shows and reproduce THAT; (b) the 2–3 AAA
     references — name which post each one leans on (racing: motion blur + heat
     haze; grounded shooter: restrained bloom + film grain + faint aberration;
     clean sci-fi: crisp bloom + strong grade). Ship the stack that evidence
     calls for, each effect named and justified. ONE scene-serving render-pass
     effect (bloom, AO, or a LUT/shader grade — a UI vignette div or a CSS
     canvas filter does NOT count) is the FLOOR against "no post", never the
     target: match the concept's richness, don't stop at one token pass. "No
     post at all" is the stock default, not a plan, and "it's only a draft" is
     not a lower floor. When 2+ effects compose, `$genex-threejs-image-pipeline`
     owns the pass ordering. **If the stack includes film grain, author it from
     `$genex-threejs-exposure-color-grading`'s grain recipe — static, seeded on
     device pixels, luminance-weighted. A hand-rolled per-frame `vUv` hash
     shimmers across the whole screen and reads as a cheap noise sheet; it is the
     most common post defect in shipped games, and "add grain" without that
     recipe is how it happens;**
   - **references**: name 2–3 AAA games whose look this game borrows
     (conventions, lighting mood, palette, post — never trade dress); the
     same 2–3 the UI gate named, extended from the interface to the scene,
     and embodied in the gate's concept frame — the image the scene's STYLE
     is judged against (content always comes from the game contract);
   - **ambient motion**: name ONE subtle environmental motion loop that keeps
     the scene alive at rest — an emissive pulse along edges, heat shimmer,
     drifting dust, a slowly flowing texture. Shader/procedural, zero
     generations, built with the scene — a world that is perfectly still
     reads as a screenshot, not a place. ONE is the budget, not the floor.
     If the answer is particles, `$genex-threejs-procedural-vfx` carries the
     recipe — a bare `PointsMaterial` renders hard squares, and picking this
     bullet without that skill is how "drifting dust" ships as flying boxes;
   - **every primitive surface — texture it or shade it, decided one by one**:
     the ground is never the only surface. Walk the walls, barriers, kerbs,
     platforms and props the game BUILDS out of primitives, and give each a real
     material: a generated texture, or a **shader** where that surface genuinely
     wants motion or energy — a force barrier that pulses and refracts, an
     electric fence, a scrolling hazard strip, an emissive seam that breathes.
     Judge surface by surface: a shader that gives a blocking barrier life earns
     its place; the same effect smeared over everything disfigures the scene.
     Deliberate flat black IS a valid answer when the look calls for it — say so
     in one line. What is never valid is not deciding: a flat-colour box standing
     next to textured geometry is the "stopped halfway" tell, and it is what
     ships when this bullet is skipped. `$genex-threejs-procedural-materials`
     and `$genex-threejs-procedural-vfx` own the craft. Whatever you apply, SEE
     it in the running game before calling it done — an unverified shader
     disfigures as easily as it delights. Scale is not a judgement call: derive
     the UVs from world size (`worldUV`, `$genex-ai-texture`) and never hand-pick
     a `repeat` — one `repeat` cannot be right for six box faces of different
     sizes, and a shipped game put 1:102 on a wall top that way;
   - **every moment the rules fire — decide the effect one by one**: the
     surfaces above are only half the scene. Walk the moments the GAME
     CONTRACT already names — a hit lands, a crate breaks, a pickup is taken, a
     player dies, a round starts — and for each ask whether the world changes
     in a way the player should see, and whether existing feedback already says
     it. "A flash and a sound already carry this" is a real answer; so is "bare
     on purpose". Say either in one line. Not deciding is the only wrong answer,
     and it is why games ship where bombs detonate and nothing reacts. Then
     check the inverse — an effect on a moment the player didn't cause and can't
     read is noise, and ambient particles are the usual offender. For a moment
     made of ENERGY (fire, a blast, a shockwave) the question is not "what
     texture goes on this box" but "what shape is this energy": a primitive
     standing in for an effect is a placeholder no matter how deliberate the
     comment says it is. `$genex-threejs-procedural-vfx` owns this gate;
   - **every light has a cause — walk the sources one by one**: the
     lighting/atmosphere mood comes from the SAME shared style brief the UI
     gate wrote — one art direction across scene and UI — but a mood is not a
     rig. Walk the sources the contract already names: the sky (day, night,
     underground — that one answer sets the key), the fiction's emitters
     (campfire, torch, neon, a monitor, a crack of daylight in the roof), and
     the gameplay signals (beacon, telegraph, checkpoint). For each: does it
     change what the player sees around it, or only need to be seen itself?
     Emissive-only is a real answer said in one line; a coupled practical
     light is the step up; one white ambient wash over everything is the
     unlit look with extra steps, and it reads the same at noon and at
     midnight. `$genex-threejs-lighting-design` owns that gate;
   Planning is not building: effects still land LAST (steps 10–11); this step
   only fixes the target so the look isn't improvised pass-by-pass at the end.
5. Wire the gameplay layer for the player verb: the physics world via
   `$genex-threejs-physics-rapier` when anything falls, collides, or gets
   pushed; on-foot movement via `$genex-threejs-character-controller`;
   driving/flying and character↔vehicle enter/exit via
   `$genex-threejs-vehicle-controllers`. For a custom Meshy player, load
   `$genex-ai-character` and keep the generation decisions ahead of wiring:
   discuss two or three visual directions, inspect any user-named references,
   then generate and show exactly three neutral-A-pose concepts. Wait for an
   explicit candidate selection before Image-to-3D. Warn that held, slung, or
   overlapping props and straps may fuse into the body or hide limbs. Keep the
   selected high-detail pre-rig output in neutral A-pose, preserve it in R2,
   show front/back/left/right views plus its measured face count, and wait for
   explicit approval of the separate 10,000-face triangle remesh. Only the 10k
   remesh is rigged and animated; there is no dynamic concept pose or silent
   T-pose fallback. Meshy limb rotations remain unchanged—never freeze or
   correct arm, hand, leg, or foot tracks. Only horizontal root or hip
   translation may be normalized for Rapier.
6. Select the minimum scene-generation skills: geometry, materials, vegetation,
   architecture, planets, water, precipitation, clouds, or VFX. Show the
   planned loader from the very first asset load — a player must never stare
   at a black screen; the rest of the UI states come at step 12.
   Then make the world-dressing DECISION — a judgment call, not a quota:
   does THIS world's fiction support 2D art (posters, signs, graffiti,
   decals, banners, in-world screens — `$genex-ai-image`; `$genex-ai-video`
   for anything that should move)? Say the decision in one line in the
   visual-direction block. Name only the pieces that genuinely belong — a
   garage wants grease posters and warning decals; a pristine void wants
   none — and anchor their prompts to the concept frame. **Zero is a valid
   answer with a stated reason; art placed just to satisfy this step is the
   failure mode, not skipping it.** Enqueue what you named with `--no-wait`
   alongside the other assets. Every placed piece is
   screenshot-checked in situ — right scale, not stretched, unlit material
   where it must glow, readable at gameplay distance
   (`$genex-threejs-visual-validation` owns the capture discipline).
7. Add camera direction when framing, controls, transitions, or scale perception
   affect play — or the game aims with the mouse (shooter/FPS/turret): the
   step-4 bucket decision executes here. And before ANY hand-rolled
   steering/pan/look math: the screen-direction contract (D → screen-right,
   mouse-right → view right, drag axes one convention) with verified copy-paste
   bases lives there — signs are copied, never derived.
8. Add procedural animation when object motion needs authored phases,
   convergence, looping, or deterministic timelines.
9. Add shared fields before writing multiple independent noise layers.
10. Add lighting, atmosphere, and shadows only after the no-post baseline
    reads: the step-4 source walk builds now — `$genex-threejs-lighting-design`
    owns the rig.
11. Add image-pipeline, bloom, exposure, grading, or AO last — building out the
    step-4 post plan, not inventing one now. This is a completion gate: the
    named post stack must be BUILT before the game is called done, published,
    or handed off — a game rendering on stock three.js defaults is not done,
    and the gate does not wait for the word "done" to be said. The stack is
    tier-gated (`$genex-threejs-adaptive-quality`): full on desktop, the built
    tone-mapping pass + the tier's light additions on phones — wire the
    governor's post toggle so phone tiers drop the heavy passes, never ship
    them undropped.
12. Once the loop is playable, build the planned interface states via
    `$genex-threejs-game-ui` (HUD, pause on Escape, fail/retry, win, and the
    full loading state grown from the step-6 loader), then `npx genex wait`
    the step-3 UI generations and wire them in — the sprite HUD replaces the
    placeholder CSS (or the recorded `HUD lane: CSS` build lands finished to
    its brief), the menu video replaces the still frame (wired with the menu
    skill's loop crossfade), the logotype lands on the menu and loader, and
    the scene's planned generated models replace their placeholder
    primitives — a shipped wave of enemies may not be untextured boxes. This
    swap is a completion gate, not an option: a game still on the
    placeholder CSS HUD (with no recorded CSS lane), without the menu video
    playing (or its recorded still fallback), or without a working Escape
    pause, is not done. Then run a feel pass via
    `$genex-threejs-game-feel` (input response, camera, impact feedback,
    retry speed).
13. Validate in a real browser with fixed seeds, captures, interaction checks,
    and performance evidence.

## Delegation

Fan-out is owned by the director: sub-agents own DESIGN.md Modules rows,
concept-DEPENDENT lanes launch the moment the concept lands (only the menu
video waits for its event triple — step 3), one writer per file, workers
never spawn workers, and the Assets table is the budget —
the full rules and the worker prompt shape live in the Delegate section of
`$genex-game-director`. This map adds no separate delegation rules; it is the
routing source the director and its workers read.

## Routing rules

- Build silhouette, motion, and material readability before adding image
  effects. Never dress a primitive shape in glow or bloom to fake quality —
  authored forms first, then materials, then lighting, then effects last.
- Keep game logic, simulation state, visual fields, and screen-space passes
  separated unless coupling is intentional.
- Prefer deterministic seeds and named controls for every procedural system.

## Acceptance gate

**Game fast path:** for a game task that loaded no procedural/visual-system skill,
done = a screenshot plus an interaction smoke check (load the page, press each
control, assert a visible response in its labeled direction — `$genex-threejs-visual-validation` has the
procedure), **plus the UI floor from `$genex-threejs-game-ui` (the generated
sprite HUD wired in — not the CSS placeholder — or the DESIGN.md-recorded
`HUD lane: CSS` build finished to its brief; the menu video playing, or its
recorded still fallback; the logotype placed; pause on Escape, the branded
loader with its key-art background, the brief's font pair actually loaded)
and the look floor (the step-4 renderer baseline + named post stack actually
built; every placed 2D/media piece — decals, posters, in-world screens —
screenshot-verified in situ; no UI element left as default browser CSS; no
placeholder primitive left where a generated asset was
planned)**, **plus the content floor whenever a step-1 content contract
exists: every countable line of the contract is present and reachable in the
shipped game, or the user explicitly re-scoped it in chat. "Big world"
shipped as one small fogged arena, "quests" shipped as a single kill
counter, a village of textured huts where nobody speaks — each is a scope
violation the same way a CSS-placeholder HUD is, and it gates publish the
same way.** These floors gate `npx genex publish` and the
final handoff of a session the same way — "I never said it was done" is not
an exemption. The list below applies to routed *visual-system* scenes, and each
system-specific item (debug views, seed manifests, tier knobs) applies only when
the corresponding skill was loaded.

A routed Genex scene is incomplete until it exposes:

- deterministic or reproducible inputs;
- camera and input controls suited to the game verb;
- named perceptual parameters for the important visual systems;
- debug views for generated fields, masks, or passes;
- a no-post baseline that still communicates the subject;
- a clear quality tier or render-budget knob when the effect is expensive —
  and for every GAME, the adaptive-quality tier wired at boot
  (`$genex-threejs-adaptive-quality`): tier-capped pixel ratio, tier shadow
  budget, the runtime governor in the loop, and generated skybox/texture
  loads routed through their rungs;
- when physics or controllers are in play, a fixed-timestep loop: per-frame
  work (platforms, enter/exit, controller updates) runs inside the physics
  world's before-step hook, then the world steps — never in the render loop;
- browser evidence showing the canvas renders, moves, and responds to input.

## Publish and multiplayer awareness

**Publishing IS calling it done.** Before `npx genex publish`, every completion
gate above must pass — sprite HUD wired (or the recorded CSS lane finished),
the menu video playing (or its recorded still fallback), the logotype placed,
Escape pause working, branded loader
with its key art, fonts loaded, renderer baseline + one built post effect
(tier-aware), the adaptive-quality tier wired at boot, world dressing placed
or validly waived, and the content contract's countables present or
explicitly re-scoped by the user. `genex preview`/`publish` print a mobile
preflight (estimated phone GPU memory vs budget) — treat a warning there as a
gate item too. If any is still
pending, say which and publish only after an explicit go-ahead.

Do not invent unavailable Genex service APIs. When preparing a game for Genex
publishing or multiplayer, inspect the project first. Prefer clean boundaries:

- renderer and scene setup isolated from transport/auth code;
- deterministic spawn and simulation seeds;
- serializable player/session state;
- explicit asset loading paths;
- one clear start function for local preview and hosted launch.

**Multiplayer is mandatory routing.** If the game has 2+ players sharing a world,
load `$genex-threejs-multiplayer` **before writing any networking code** — it is not
optional. The `@genex-ai/multiplayer` relay syncs `me`/`shared`/`objects`; the **SDK
auto-smooths remote players AND shared objects** for you (do not write your own
interpolation). It gives you server-enforced primitives — `objects` (one owner per ball/
NPC, claimed on contact) and a room `host` (single writer of scores, single simulator of
enemies). That skill covers the rules that keep it smooth (draw `state` directly, render
yourself and objects you own from a local object, quaternion rotation, `stateRaw` for
hit-tests), the per-genre recipes (sports/ball, shooter, co-op), config wiring, and the
persistent-world API. Reconnection is built into the SDK (render `reconnecting`/
`reconnected`, never rebuild it). **Pushable/ownable bodies** (a ball, a box, a prop) use
claim-on-touch + a Rapier proxy — the soft handoff glides the ownership change; only a genuine
**simultaneous** contest (two players pushing one crate against each other — sumo, tug-of-war)
uses the host-authoritative pattern (`inputs` + `onHostTick`). Both are in that skill's
host-physics reference.
Choose the net model from player experience: one ongoing drop-in world uses `connect()`; a fresh
bounded match/mission with quorum, fair start, teams, backfill, or parallel sessions uses
`matchmake()`. Infer this when the brief is clear. Ask one experience-level question only when both
are genuinely plausible — never ask the user to select an SDK API or preset. For either model, a
Play/Online button is the first relay contact; immediate `connect()` + spawn is valid only when
loading the game already means joining the always-online world and there is no fake Play screen.
Before handoff, run the multiplayer skill's netcode feel gate with two distinct identities.
Use only the APIs that skill documents — do not invent transport methods.
