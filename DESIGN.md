# QUARRY — Design

_Living document — the agent keeps this current; changes land in the log at the
bottom._

## Concept

A hunt where both sides are armed and only one of you is meant to walk out. You
are Jack, a human loose in a ruined jungle temple with a blaster and no room for
error — or you are the Stalker, a horned thing that climbs walls, crawls the
roof beams and does not need a weapon. Third-person, over the shoulder, under a
midday sun. The tension is asymmetry: Jack's advantage is range and nerve; the
Stalker's is that it can be anywhere above you. A 3D rebuild of the shipped 2D
game (tagged `quarry-2d-final`), carrying over its premise, its two characters
and its ledge-and-vent movement vocabulary.

Art target: `docs/reference/art-target-temple.png` — the player's own reference,
and the frame every screenshot is judged against (#100). Sculpted sandstone,
skull friezes, moss in the joints, hard sun through a collapsed roof, jungle
past the walls.

Concept image: _pending — the UI plan gate has not run yet; the character concept
(candidate 2 of cms4enx33007a2pqlpfflj82e) is approved and rigging._

## Core loop

- **You do:** move through the complex, break line of sight, and commit to a
  strike when you have one
- **To:** kill the other hunter — or reach the extraction lift with enough
  energy cells
- **Under pressure from:** the other hunter actively looking for you, and a
  complex with more ways in than you can watch
- **You earn:** energy cells (score + the extraction condition) and better
  weapons found in the level
- **You lose when:** your health runs out → **and retry by:** one key, straight
  back in

## Build plan & status

Now: ▶ 9. The temple reskin ([#100](https://github.com/yonidavidson/quarry/issues/100)) — the world's geometry, sun rig and post stack are rebuilt against the player's art reference and previewed; **every generation lane in it (temple textures, skybox, props, character reskins, new key art, jungle audio) waits on the Aug 4 credit refill**, along with the menu video and threat mask from milestone 5/6.

1. Boot, identity, and a walkable floor — ✅ → previewed
2. Jack moves and shoots; the Stalker hunts — ✅ → previewed
3. Play as the Stalker — the asymmetric half — ✅ → previewed ([#75](https://github.com/yonidavidson/quarry/issues/75))
4. The hunt loop: energy cells, extraction lift, win/lose, instant retry — ✅ → previewed
5. Screens: loader, title, side select, pause ([#77](https://github.com/yonidavidson/quarry/issues/77)) — ◐ machine + side select done; menu video, branded loader and settings still open
6. HUD sprite swap from the landed concept ([#78](https://github.com/yonidavidson/quarry/issues/78)) — ⬜
7. 1v1 asymmetric online ([#83](https://github.com/yonidavidson/quarry/issues/83)) — ◐ seating, sides and remote bodies verified with two identities; feel gate not run
8. World dressing — the ceiling the Stalker crosses ([#80](https://github.com/yonidavidson/quarry/issues/80)) — ◐ stone beams, vines and roof collapse landed with the reskin; props still owed
9. The temple reskin ([#100](https://github.com/yonidavidson/quarry/issues/100)) — ◐ geometry, sun rig, sky and grade previewed; the generated asset half is credit-blocked

Open defects:
[#79](https://github.com/yonidavidson/quarry/issues/79) phone budgets ·
[#81](https://github.com/yonidavidson/quarry/issues/81) Stalker attack anims ·
[#82](https://github.com/yonidavidson/quarry/issues/82) camera clips on pounce ·
[#84](https://github.com/yonidavidson/quarry/issues/84) stray dashboard project

A milestone is done only once its work reached a `genex preview` (`→ previewed`).
After any break, resume from `Now:`.

## Content

- **Playable hunters:** 2 — Jack (ranged, fragile, 5 HP) and the Stalker (melee,
  tough, 6 HP, wall-climb + ceiling-crawl + double jump)
- **Weapons:** 4 for v0 — blaster, scatter, shotgun, bomb — found in crates, not
  bought
- **Enemies besides the other hunter:** 2 kinds — a patrol drone and a crawlbot;
  neither hunts you, both punish carelessness
- **Locations:** 1 floor of the ruin for v0 — great hall, stone ledge ring,
  hanging platforms, burial chamber, the gate (same footprints as the machine
  hall / catwalk ring / pump room / extraction bay they replaced, #100)
- **Grows:** weapons found mid-match; no meta-progression in v0
- **Ten minutes in, I am:** learning the floor's sightlines well enough to
  choose where the fight happens instead of being found in the open.

## Screens & UI

Screens: loader, title menu, HUD (health, weapon + ammo, energy cells, a
proximity read on the other hunter), pause, win/lose, lobby.
Style brief: wet concrete and rusted steel, hazard-stripe accents, stencilled
industrial type, sodium-orange emergency light against near-black.
References: _named at the UI plan gate_. Menu archetype: slow pan across the
dark machine hall.
HUD lane: **sprites** — the brief is stencilled metal with hazard-stripe accents
and etched frames; a CSS rebuild would not pass for it. The hand-written DOM HUD
in `src/ui/hud.ts` is scaffolding until the sprite sheet lands.
Menu video: declined (this pass) — credit-blocked at balance 0 until the Aug 4
refill; the verbatim command to fire on the refill is recorded in Decisions. The
prompt is re-written for the ruins before it fires (#100).

## Assets — the generation plan AND the budget

| Asset | Kind | Status | Wired? |
|---|---|---|---|
| Concept + HUD mockup | image | landed (cms4fujmg00bm2ensvgzgdfqj) — confirms the sprites lane | n/a |
| Jack — player character | character | landed (cms4fbaky009f2ens0f1kmmbi) | yes |
| The Stalker — rigged hunter | creature | landed (cms4fiv3a008x2pqlshvq5jnp) | yes |
| Complex floor — wet concrete | texture | landed (cms4emta7007b2ens0yy80gif) — **retired by #100**, removed from `assets.ts` | no |
| Steel catwalk / plate | texture | landed (cms4emub4006i2pqltf31ogeu) — **retired by #100**, removed from `assets.ts` | no |
| Hall walls — chipped paint | texture | landed (cms4nxrid000r2bl48qklh216) — **retired by #100**, removed from `assets.ts` | no |
| Machine casings — oiled metal | texture | landed (cms4nxsgk000w2bl4zfxv7pvj) — **retired by #100**, removed from `assets.ts` | no |
| Ceiling — corrugated + pipes | texture | landed (cms4nxte7000m2ro5bxj8slct) — **retired by #100**, removed from `assets.ts` | no |
| Temple flagstone floor | texture | planned (#100) — credit-blocked to Aug 4; procedural stand-in in `src/world/stone.ts` | stand-in |
| Carved glyph wall | texture | planned (#100) — same | stand-in |
| Skull frieze block | texture | planned (#100) — same | stand-in |
| Cut step / ledge stone | texture | planned (#100) — same | stand-in |
| Mossy boulder / rubble | texture | planned (#100) — same | — |
| Ancient gold | texture | planned (#100) — same | — |
| Jungle sky + distant pyramids | skybox | planned (#100) — credit-blocked; procedural equirect stand-in in `src/world/sky.ts`, also the environment map | stand-in |
| Carved idol / god head | model | planned (#100) | — |
| Broken column + capital | model | planned (#100) | — |
| Stone brazier | model | planned (#100) — procedural stand-in in `lightComplex` | stand-in |
| Offering chest (weapon crate) | model | planned (#100) | — |
| Patrol drone | model | planned | — |
| Energy cell pickup | model | planned | — |
| Blaster shot | sfx | landed | yes |
| Claw strike | sfx | landed | yes |
| Boot on steel grating | sfx | landed | yes |
| Stalker roar | sfx | landed | yes |
| Industrial dread bed | music | landed — replaced by the jungle bed when credits allow (#100) | yes |
| Jungle dread bed | music | planned (#100) | — |
| Temple ambience (birds, insects, stone) | sfx | planned (#100) | — |
| Boot on stone | sfx | planned (#100) | — |
| Key art (loader + title + cover) | image | landed (cms4m26n400iy2pqliielme17) | yes |
| Menu still | image | landed (cms9cfc2y00a82tmkpp4splh6) | yes |
| Menu video | video | declined (this pass) — credit-blocked at balance 0 until the Aug 4 refill; verbatim command recorded in Decisions | — |
| Logotype | image | landed (cms9cfc07009d2qqfxrylzrtt) | yes |
| Night sky through the windows | skybox | proposed — only if v0 keeps window views | — |

Status flow: proposed → planned → generating (id) → landed (URL) → wired.

HUD pipeline state (sprites lane): Stage-1 mockup landed and the lane decision
recorded, but the style chain (Stage-2 sheet · menu still · logotype) was never
enqueued behind it — fired late on 2026-07-31 (see Decisions). Stage-2 sheet
`cms9cfbzo00a32tmky8munqs7` landed; extracted 7 sprites into `public/assets/hud/`
(health full/half/empty, threat frame + annotated twin, cell counter, weapon
frame) and WIRED into `src/ui/hud.ts` (#78). `hp-half` is cut from the wiring —
health is integer (5 or 6 slots), a half state never occurs. Stopgap notes
recorded there and in
Decisions: the annotated threat twin was drawn shaded + off-registration so
`genex ui masks` correctly refuses it (model-edit + `--clean` waits on the Aug 4
refill); the threat fill mask is currently DERIVED from the frame art (channel
band rows 22–48 minus the ~15px separators, fillBox `0.0222,0.2716,0.9511,0.3210`)
and swaps for the real mask on refill. `genex ui text-color` sampling of the
mockup's widget regions recorded for the visual pass — the mockup's boxes need
an eyeball first.

## World & scale

One floor, roughly 140 × 90 m of interior, walled — no streaming. Vertical
interest comes from the stone ledge ring above the great hall, two chain-hung
platforms and the roof beams, not from multiple storeys. Most of the roof has
collapsed: a broken ring of panels survives at the edges, the middle is open to
the sky, and the beams still span the whole hall so the Stalker's ceiling route
is intact. The 2D game's multi-floor complex, atrium wells and underdeep are
explicitly out of v0 and are the growth path.

Draw-call note (#79): the reskin took the static solid count from ~40 boxes to
~270, because carved facades, altars and rubble are what stops a wall reading as
a plane. Desktop is fine; the phone tier has NOT been re-measured since, and it
is the first thing to check when the generated texture set lands.

## Multiplayer

Fresh capped matches (`matchmake()`), quorum 2, asymmetric teams — one seat is
Jack, one is the Stalker. Solo play fills the empty seat with the AI hunter, so
the game is never unplayable alone. Nothing connects before the Play click. Late
join backfills only the AI-held seat.

## Modules — the build split

Everything is built inline by the main agent this session: sub-agent delegation
is not authorized in this environment, so the director's default parallel fan-out
does not apply. Rows stay as the split to hand out the moment that changes.

| Module | Owns files | Built by | Done when |
|---|---|---|---|
| Boot & identity | `src/main.ts`, `src/boot/**` | main agent (only writer of shared boot) | boots, tier wired, `initEmbed` runs |
| World — the floor | `src/world/**` | main agent (inline; would be parallel — no dependency on combat) | walkable, matches World & scale |
| Player & camera | `src/player/**` | main agent (shared boot touches it) | third-person control passes the input-direction check |
| The Stalker AI | `src/hunter/**` | main agent, serial (tuned against movement feel) | hunts, loses you, re-acquires |
| Weapons & pickups | `src/combat/**` | main agent (inline; would be parallel — pure data + spawns) | 4 weapons, cells, crates |
| HUD chain | `src/ui/**` | main agent, on concept landing | every screen in Screens & UI |
| Netcode | `src/net/**` | main agent (shared) | two seats, feel gate passed |

## Decisions & changes

- 2026-08-02 — **The no-credit sweep: everything that did not need the Aug 4 refill.** Closed [#101](https://github.com/yonidavidson/quarry/issues/101) (touch controls), [#95](https://github.com/yonidavidson/quarry/issues/95) (a world that moves), [#80](https://github.com/yonidavidson/quarry/issues/80) (the ceiling), [#86](https://github.com/yonidavidson/quarry/issues/86) (superseded by #100), [#75](https://github.com/yonidavidson/quarry/issues/75) and [#97](https://github.com/yonidavidson/quarry/issues/97) (both fixed long ago and never closed).
  - **The climb is the game now, not a feature.** The cells sat almost entirely on the floor, which quietly made every ledge, rope and vine optional — you could win without leaving the ground. They are a ladder: two on the floor, then the 6 m ring, the hanging platforms, the 14 m ring, and two on the beam run where the beast lives. Each stands a beam of light, because under a midday sun a small green box thirty metres up is invisible and a climb you cannot see the reason for is just a wall.
  - **Falling costs you above 11 m**, which is what gives the 28 m walls their stakes — a mantle, a vine drop and a hop off the low ledge all land free.
  - **Feel** (`src/fx/feel.ts`): camera shake on a squared trauma curve so small events stay subtle and big ones bite; hitstop on a solid connect with the camera and post stack still on real time, so it reads as impact rather than a dropped frame; landing dust; and the beast's pounce shaking the hall with distance falloff, so one landing across the room still tells you what happened.
  - **Readability was the real graphics problem, not fidelity.** Almost every surface was carved — glyph panels on every bay, skulls on the wall band AND the capitals AND the altar markers AND the parapets, three patterns stacked per altar, under sixteen ropes and twelve vines and a 110-instance vine scatter. Ornament needs plain stone around it to read as ornament. Carving is on alternate bays only now, skulls on the one wall band, ropes at 10 and vines at 6. Less fill and more key, because how much sun a face catches is the only thing separating one sandstone surface from another. Shadow frustum tightened from 90 m to 52 m of half-extent — the sun follows the player, so a smaller box covers everything visible and quadruples texel density where the carved relief actually is.
  - **Holds light up when they are in reach.** Diegetic rather than a HUD line, because in the moment you need to know, you are looking at the wall.
  - **Still credit-blocked and nothing else can move them:** both characters ([#91](https://github.com/yonidavidson/quarry/issues/91) and the beast's retexture), the temple texture set and skybox, the props, the new key art / menu / cover ([#104](https://github.com/yonidavidson/quarry/issues/104)), the per-weapon sounds and bomb model ([#99](https://github.com/yonidavidson/quarry/issues/99)), the menu video and the HUD threat mask ([#78](https://github.com/yonidavidson/quarry/issues/78)). All queued verbatim in `docs/generation-queue.md`.

- 2026-08-02 — **The full traversal set, and how it was actually verified.** Player played it and reported: climbing is very fast, it cannot hang, it cannot hold the ropes, the walls are too low, and it should go up/down and sideways on a wall, swing on the vines and climb them. All landed. Speeds: wall/rope climb 0.92 m/s, sideways 0.85, vine climb 1.15 — a person on a rope does about a metre a second and it costs them. `HALL.wallH` 14 → 21, with the wall ornament repositioned OFF `wallH` instead of magic numbers so raising the hall never strands the frieze halfway up; 16 ropes (was 6) and 12 swingable vines.
  - **The vine is a real pendulum**, not a moving platform: θ/ω integrated per frame, A/D pump it, W/S climb the rope itself, and shortening the rope speeds the swing up because angular momentum is conserved explicitly. You leave on the TANGENT, so *when* you let go decides where you land — releasing at the top of the arc correctly gives you almost nothing. Swing gravity is 30, not 9.81: a 15 m vine under real gravity has an eight-second period, which is physically right and completely dead to play. The pivot the player sees is the pivot being simulated.
  - **Verification without a debug hook.** The harness cannot acquire pointer lock, so the game cannot be steered in a capture — and the fix is not to add a test mode to the game (AGENTS rule 19). Instead the real modules are imported from the dev server in a Playwright page (`import('/src/player/traverse.ts')`) and driven against a stub controller and a synthetic wall. That measured: hang holds 2.5 s with W+Space still down; wall climb 3.68 m up in 4 s, 2.55 m sideways, back down; reaching a top hands you to a hang; rope +2.76 m in 3 s; standing under a rope without jumping correctly does NOT grab; a running leap onto a vine swings 6 m free and 29.6 m pumped. Feel is still the player's call — this proves the mechanics exist and are tuned, not that they are fun.
  - **Two bugs the measurement caught that reading could not.** (1) Every catch was thrown off instantly, because you grab a rope by *pressing* Space and a ledge by jumping while holding W, and that same still-held key was read as "push off"/"mantle" on the very next frame — hence "it can't hang" and "can't hold the ropes". Holds are edge-detected now and a short settle lets the body take its weight. (2) `faceAt()` borrowed the shared `_v` scratch vector, and its callers pass `_v` in as the position to test — so it overwrote its own argument and every wall-climb step snapped the body to the foot of the wall. Shared temporaries are fine until one of them is also a parameter.

- 2026-08-02 — **Traversal: the human gets a vertical game.** Player feedback: movement is "very blunt — you can't catch the ropes and climb, or jump like Tomb Raider between blocks". Asked the forking question and the player chose **keep the duel, make climbing real** (not a chase game). So `src/player/traverse.ts` gives Jack ledge grabs, hanging, shimmying along a lip, mantling over it, and climbing chains, all procedural — the generated climb clips are credit-blocked and a hand-over-hand cycle solved against the actual surface beats a canned clip that slides anyway.
  - **The asymmetry is preserved deliberately**, and this was the design call worth making: the beast holds ANY surface (bare stone, ceiling, mid-span); the human goes only where the ruin offers a hold — a ledge lip or a chain. Jack stops being a man on a flat floor without becoming the Stalker. Six climbable chains are placed where climbing one puts you on the ledge ring or a hanging platform, so a rope is a route rather than scenery, and they are drawn fatter than the decorative chains because the player should never have to guess which one takes weight. `CHAINS` is exported from `complex.ts` and consumed by both the builder and traversal, so what you can see is exactly what you can hold. Jack's side-select card no longer says "no way up".
  - **The hand-over-hand cycle is the point.** A body that slides up a surface with both palms glued at head height reads as an elevator — which is exactly what the player was describing. One hand is always planted while the other reaches, the phase only advances when you actually move, and feet brace on the wall because a pure dangle reads as a corpse on a hook.
- 2026-08-02 — **The beast was a red capsule for the whole match, and it was a one-line bug.** `stalker.ts` and the play-as-beast path both loaded the creature with a bare `pickModel(...)`, which appends an `@<budget>` rung. That rung does not exist for this asset (verified: `@desktop`/`@phone`/`@medium` all 404, the original is 8.3 MB with no required extensions), the 404 hit a silent error handler, and the stand-in capsule stayed on screen forever. Both paths now use `loadModelWithFallback`, which tries the rung and falls back to the original. Verified by capture: the Stalker renders as the horned brute. **The lesson generalises** — `pickModel` alone is only safe for assets that actually have rungs; anything else needs the ladder.
- 2026-08-02 — **Every player's first aim click threw a page error.** `follow-camera.ts` requested pointer lock and then called `setPointerCapture` on the same pointer; once the lock is granted that pointer is no longer active, so it threw `InvalidStateError`. Guarded — capture is an optimisation, never a requirement, which is the same defensive shape the vendored touch primitives already use.

- 2026-08-02 — **Look pass on the live build, and the fixes it found.** Drove the published game in a browser rather than reasoning about it, which surfaced four things the reskin commit missed. Fixed and live: rubble was wearing the skull-frieze material, so every fallen block read as a die ([#102](https://github.com/yonidavidson/quarry/issues/102) — rubble now takes cut stone or wall, with unequal sides and a pitch/roll resting rotation the collider shares); the glyph panels read as electrical sockets because the carving was a stroked rectangle with round marks floating inside it ([#103](https://github.com/yonidavidson/quarry/issues/103) — replaced with edge-to-edge step-frets and cartouche columns, no border, no circles); and the game still called itself an industrial complex in the page blurb, the loader, both side-select cards, the pause header and the Stalker's win line ([#104](https://github.com/yonidavidson/quarry/issues/104) — all rewritten for the ruin, the blurb updated with `genex publish --no-push --description` and verified live). The side-select rail also ran off a short viewport; the fix is a `max-height:900px` block that MUST stay last in `phase.ts`'s sheet, because it has the same specificity as the base rules and only source order makes it win. Still owed on #104: the cover, menu backdrop and loader art, which are credit-blocked — and the cover needs `genex publish --regenerate-cover` once the new key art is wired, not a plain publish.
- 2026-08-02 — **Phone tier verified, and it is not playable.** The tier-scaled dressing works and renders correctly, and the DPR cap is confirmed applied (390×664 buffer at `devicePixelRatio: 3`), which settles the recurring preflight warning as a false positive. But the vendored touch kit in `src/controllers/touch/` is never imported by `main.ts`: a phone gets a rendered world, a HUD, and the hint "WASD MOVE · SPACE JUMP · CLICK FIRE". Filed as [#101](https://github.com/yonidavidson/quarry/issues/101) rather than fixed — it is an input feature, not graphics, and rotate-to-landscape vs. a real portrait layout is a design call.

- 2026-08-02 — **The hunt moves to sunlit temple ruins** ([#100](https://github.com/yonidavidson/quarry/issues/100)). The player gave a reference frame (saved at `docs/reference/art-target-temple.png`) and, asked the two forking questions, chose **replace the industrial complex with the ruins** and **bright warm midday sun over the dark**. So: the machine hall is a temple hall, the sodium-lamp premise retires, and the hunt is now about sightlines and cover rather than about darkness — fire survives only in the burial chamber and the deep bays. This re-points [#86](https://github.com/yonidavidson/quarry/issues/86): its gap analysis still holds, but the target it measures against is the reference, not the industrial key art.
  - **Footprints are unchanged on purpose.** The six machine blocks became stepped altars on the same centres, the catwalk ring became a stone ledge at the same height and width, the ramps became pyramid stairs, the pump room became the burial chamber, the extraction bay became the gate. Every sightline, patrol path and cling surface the hunt was tuned around survives the reskin; only what the room is made of changed.
  - **Landed this pass, no credits needed:** carved facades (base course, glyph panels, skull-frieze band, pilasters), stepped altars, ledge ring with parapet, two chain-hung platforms, the great arch, a collapsed roof (14 of 35 panels survive, in a broken ring — the middle is open sky), stone beams + timber under the whole span, columns with base and capital, 46 rubble blocks, hanging vines, an instanced jungle ring past the walls, dust motes in the shafts, roof-grit trickles, water drips, and braziers that flicker like fire instead of like a failing tube.
  - **Sun rig:** one 4.6-intensity key aimed down `SUN_DIR`, hard shadows, sky/ground hemisphere fill at 1.05, ambient at 0.16, warm `FogExp2` haze. Post retuned for a bright scene — bloom threshold up to 1.15 (a dark-room threshold smears sunlit sandstone into haze), lighter vignette, ochre-highlight/cool-shade grade.
  - **Three real bugs found by looking, not by reasoning:** (1) `BoxGeometry` UVs are 0..1 per face regardless of face size, so a 12m altar and a 1m rubble block wore identical blockwork — fixed with `uvBox`, which pre-scales UVs to world size for constant texel density; (2) the first pass came out olive because the procedural moss was too strong AND the sky's saturated jungle-green lower hemisphere was feeding the environment map — moss cut, ground band desaturated, `scene.environmentIntensity` dialled to 0.55; (3) vines were hanging in open air where the roof had collapsed — they hang from the beams now.
  - **Draw calls, and the two preflight lines that survive.** The reskin needed ~270 static solids where the box hall had ~40, so they are baked into ONE merged mesh per material — seven draw calls for the whole ruin. Colliders stay per-box, and every consumer of the returned list raycasts (camera collision, the Stalker's cling, shots, line-of-sight), which reads merged geometry identically; a capture before and after the merge is pixel-identical. Rubble, vines and the jungle ring scale down on the phone tier. Two `genex preview` warnings still fire and both are heuristic false positives worth not re-litigating: the DPR cap IS applied, to the renderer in `main.ts` AND to the composer in `post.ts` (`tier.dprCap`, 1 on phone-low / 1.5 on phone), and the ~327 MB estimate is a static asset-size count that does not see the merge. What is genuinely unmeasured is a real phone; that stays open on [#79](https://github.com/yonidavidson/quarry/issues/79).
  - **The blocked half is queued, not deferred.** `docs/generation-queue.md` holds every command verbatim — prompts written for the ruins, `--raw` on the skybox (its lane refuses prompts naming structures, and the distant pyramids are the point), the key art anchored to the player's reference with `--edit`, and the wiring note for each. Ordered in tiers by change-per-credit, because 100 credits does not cover all of it: surfaces first, then screens, then audio, then the two hunters (which needs the player to pick a character candidate and cannot run unattended).
  - **Stand-ins, and they are labelled as such:** the temple texture set and the jungle skybox are drawn procedurally in `src/world/stone.ts` and `src/world/sky.ts` because the balance is 0 until the Aug 4 refill. They carry a real height channel so the carving is lit rather than painted, and they are a rung to be replaced — not the destination. Everything queued behind the refill is listed in #100's task breakdown.

- 2026-07-31 — **Milestone 5/6 wired, minus credits.** The menu now opens on the generated **still** (UI-free, calm lower third) with the **logotype** wordmark, Black Ops One + Oswald loaded, keyboard side-select (↑↓ + Enter), and pause-hosted **settings** (music/sfx/look sliders, persisted). The sprite **HUD** is wired: health slots, energy-cell counter panel, weapon frame, and the segmented threat meter with a fill **derived from the frame art** (channel rows 22–48, ~15px separator pitch, fillBox `0.0222,0.2716,0.9511,0.3210`) because the sheet's green twin was drawn shaded + off-registration and the model-edit fix needs credits. Smoke pass (local test mode): menu renders with still + logo, HUD reads live (danger reached "above you", threat fill tracked pressure), pause/settings open + resume, zero page errors. Not exercised: auth/saves/multiplayer (local mode), the menu video, and the real mask. Pre-existing noise: 6 status-0 loads of the fallback VRM character's animation GLBs (200 over curl — client-side abort, unrelated to this milestone).\n- 2026-07-31 — **The style chain fires late** ([#77](https://github.com/yonidavidson/quarry/issues/77), [#78](https://github.com/yonidavidson/quarry/issues/78)). When the UI concept landed (2026-07-28) the Stage-2 HUD sheet, menu still and logotype should have enqueued `--no-wait` behind it and never did; the menu video's event triple also never fired. Pushed now: Stage-2 sheet `cms9cfbzo00a32tmky8munqs7` (asset list from the game contract — health segments, segmented threat meter, energy-cell counter chrome, weapon readout frame), menu still `cms9cfc2y00a82tmkpp4splh6`, logotype `cms9cfc07009d2qqfxrylzrtt`. The menu still anchors to the **key art** (`cms4m26n…`, already UI-free and recorded as the canonical frame) rather than the mockup — the mockup has a HUD baked in and must never seed UI into the menu frame; one-line reason recorded per menu-skill rule.
- 2026-07-31 — **Menu video blocked on credits; the still ships.** The video costs 20 credits and the balance is 0 (refills Aug 4). The still menu is live — key art → still backdrop with a slow breathing pan/zoom, logotype, cinematic side-select rail, keyboard nav, and settings (music/sfx/look) in pause. The hover/confirm `genex sfx` ticks (5 credits each) are blocked the same way — procedural WebAudio blips keep the menu from being silent until then. Fires on the refill, recorded verbatim: `npx genex video "slow drifting fog moves across the floor and settles back, a hanging lamp sways a hair and steadies, dust motes drift and return, steam pulses from a vent and thins, the beast on the ceiling stirs and returns to stillness — every motion ends where it began" --frame https://assets.genex.technology/generations/cms9cfc2y00a82tmkpp4splh6/image-main --duration 8 --no-wait` then paste the URL into `src/assets.ts` `MENU_VIDEO`.
- 2026-07-28 — Rebuild in three.js on Genex, replacing the KAPLAY 2D game on
  `main`. The 2D game is preserved at tag `quarry-2d-final` and is restorable
  with `git checkout quarry-2d-final -- index.html`.
- 2026-07-28 — Player picked: third-person over the shoulder; one dense complex
  floor for v0; 1v1 asymmetric Jack vs the Stalker with the AI filling the empty
  seat.
- 2026-07-28 — Pointer bucket: **locked**. Jack's blaster is mouse-aimed, which
  makes pointer lock mandatory rather than a default.
- 2026-07-28 — The 2D game's vector rig (33 keyframed poses over a bone tree)
  is the reference for the Stalker's movement vocabulary — wall-cling, ceiling
  crawl, ledge hang, mantle. Recover the pose table from the tag if it is worth
  porting to the 3D rig.
- 2026-07-28 — Milestone 1 previewed: walkable hall, third-person follow camera,
  Rapier physics, generated concrete + plate textures. Body is still the stock
  VRM fallback; Jack replaces it with no code change when the manifest lands.
- 2026-07-28 — The scaffold step wiped the repo (create-vite `--overwrite ignore`
  empties the directory); everything was restored from git and `genex init` was
  re-run, which created a SECOND project. The live one is `quarry-d291c2`; the
  original `quarry` project is a stray to delete from the dashboard.
- 2026-07-28 — Milestone 2+4 previewed: Jack's hitscan blaster (cover blocks
  shots), the Stalker's vertical hunt, energy cells, extraction, win/lose and
  one-key retry. The Stalker is driven KINEMATICALLY, not by the physics
  character controller — a dynamic capsule cannot hold a wall or hang from a
  ceiling without fighting gravity every frame. Its collider is for bullets.
- 2026-07-28 — Known preview warnings to clear before publish: models load
  without `pickModel`/`loadModelWithFallback` (phones fetch the full GLB), and
  the DPR cap needs the tier applied under the post stack.
- 2026-07-28 — **Published** (categories: games). The game is public and
  guest-playable; every `genex preview` from here goes live to everyone
  immediately. Shipped knowingly ahead of the usual publish floors — the HUD and
  menus are still hand-written scaffolding and there is no loader or title
  screen. The player was told and said go.
- 2026-07-28 — Links: the README and skills point at the permanent GitHub Pages
  URL, which redirects via `docs/index.html` to the world page. That file is the
  only place to edit when the game moves.
- 2026-07-28 — Everything observed is now filed: #75–#84. The build plan above
  points at them; the issues carry the plans. #47 (the 2D PixelLab pipeline) is
  closed as obsolete — that art belongs to `quarry-2d-final`.
- 2026-07-28 — The UI concept landed and settles the HUD lane as **sprites**:
  etched-metal frames, hazard striping, a segmented orange threat meter. CSS
  could not pass for it.
- 2026-07-28 — Both sides playable ([#75](https://github.com/yonidavidson/quarry/issues/75)).
  Player wall-climb/ceiling-crawl works by taking the body OFF the character
  controller — disable it, switch the rigid body to kinematic, drive position,
  and snap interpolation on release. The controller is a dynamic capsule and was
  never going to hold a wall.
  Two bugs found and fixed while building it: the cling never re-probed the wall,
  so you could climb off the top of a 6m block into open air; and AI Jack was a
  hitscan that never missed, which killed the beast before it could reach a wall
  and deleted the vertical game entirely. He now has range-based accuracy and
  takes a beat to notice you.
  The second playable body is swapped in locally — the platform's loader always
  resolves the game's ONE generated character (Jack).
- 2026-07-28 — Gallery card fixed ([#85](https://github.com/yonidavidson/quarry/issues/85)).
  It was listing the SLUG as the title and an auto-minted cover of a literal
  rock quarry — an open-pit mine with a dump truck. `genex publish --title
  --description --regenerate-cover` fixes it, but **the cover must be re-minted
  in a SECOND call**: run in the same invocation as `--description`, the art is
  generated before the description persists, so it re-draws the same wrong image.
- 2026-07-28 — Purpose-built key art landed and is wired behind the loader and
  title screen: Jack alone in the machine hall, the beast on the ceiling above
  him. Treat it as the game's canonical frame — the menu still and the branded
  loader ([#77](https://github.com/yonidavidson/quarry/issues/77)) should anchor
  to it with `--edit` rather than starting fresh.
- 2026-07-28 — **The freeze is fixed** ([#76](https://github.com/yonidavidson/quarry/issues/76)).
  Root cause: `capsuleFromModel` measures the MESH, and a humanoid mesh is
  narrow, so it returned a 0.15m capsule radius — a 15cm-wide person. That
  needle against the hall's 140x90 floor slab, with CCD on, blew up Rapier's
  solver; once the world panicked, `stepWithEvents` threw every frame, and since
  `physics.step()` is the first call in the loop, everything after it stopped.
  You could walk 1.2m and then nothing.
  Fix: floor the radius at 0.32m and turn CCD off (a walking character cannot
  tunnel). Measured after: a steady 2 m/s for 28m with zero errors.
  Also added: the render loop is wrapped so a throw skips ONE frame instead of
  permanently stopping three.js from re-requesting the next one. That is what
  turned a recoverable panic into a dead game.
  **Lesson for the smoke pass**: "no page errors + the HUD updates" is not
  evidence the game is playable. Sample the player's POSITION over time, or hash
  frames and look for repeats.
- 2026-07-28 — Visual pass ([#86](https://github.com/yonidavidson/quarry/issues/86)),
  first round. What actually moved the needle, in order:
  1. **A ceiling.** Without one the camera looked into black void above head
     height and the hall read as a floor floating in nothing.
  2. **Lamps as GEOMETRY.** Emissive fixtures hanging on stems, not invisible
     point lights — light with a visible cause is most of what "lit" means.
  3. **A grid of them.** Ten lamps across 140x90m left most of the space
     unreadable; fifteen on a grid make the architecture legible while the dark
     still lives between the pools.
  4. **A post stack** — bloom, grade, vignette (`src/render/post.ts`), tier-aware,
     with the composer's MSAA from `tier.composerSamples`.
  5. Textures on the walls, machines and ceiling; the floor tinted back toward
     grey because the generated concrete reads warm.
  Two tuning passes were needed: the first blew the bloom out into suns and
  graded the whole hall to lava, the second was too dark to see. Still warm-
  dominant and Jack's skin reads pale — not finished, just no longer boxes.
- 2026-07-28 — The predator side is playable properly now:
  charged leap ([#88](https://github.com/yonidavidson/quarry/issues/88)) — hold
  Space to wind up, release to launch, and **grabbing is automatic on contact**
  rather than a second apex-timed keypress; a full charge from standing reaches
  the ceiling and hangs. Click from a hang dives (the AI's pounce, player-side).
  Camera scaled to the body ([#90](https://github.com/yonidavidson/quarry/issues/90)) —
  the follow distance was tuned for Jack at 1.8m and put the camera inside the
  2.4m beast's chest.
- 2026-07-28 — **Blocked on credits**: the beast's leap/land/claw animations
  ([#81](https://github.com/yonidavidson/quarry/issues/81)) cost 26-93 credits
  and the balance is 24; it refills to 100 on Aug 4. Everything else about the
  predator works — those states currently borrow the walk clip.
- 2026-07-28 — **Online 1v1 is live** ([#83](https://github.com/yonidavidson/quarry/issues/83)).
  `matchmake()` + the `open` preset at 2/2 — NOT `duel`, whose server-owned
  winner-stays loop assumes symmetric players. The two seats are different
  roles, so sides are assigned in game code: the HOST reconciles an
  `id → side` map into `shared`, every client reads its own from there, and it
  is never computed per-client (that is how both players end up the same
  character). `matchmake()` fires on the Play Online click and nowhere else —
  a player sitting in the menu must not hold a seat others are queuing behind.
  Verified on the published build with two isolated browser contexts (two
  distinct guests, not two tabs on one account): both seated, the waiting screen
  closed on both, one got Jack and one got the Stalker, and Jack's client
  rendered the remote beast. NOT verified: how it FEELS, the pounce/claw
  interaction at speed, host migration, and re-seat after a drop.

- 2026-07-31 — **Weapons: all four now real** (`src/combat/arsenal.ts`). The
  contract promised blaster/scatter/shotgun/bomb and the game shipped only the
  blaster. One hitscan core, spec-driven, so the tracer and the hit can never
  disagree: blaster (∞, the floor you never lose), scatter (70, fast and weak),
  shotgun (8, seven pellets, damage falls off past 9m so it stays a close-range
  answer), bomb (3, arcs under gravity, 7m blast, can catch you too). Running dry
  falls back to the blaster rather than leaving a dead button. Six crates
  (`src/combat/crates.ts`), placed off the cell circuit so arming yourself costs
  time in the open — and checked against the hall's real geometry after a first
  pass left one crate hanging at y=7 over open floor with no catwalk under it and
  another hidden behind a machine block. Q/wheel cycles, 1-4 selects.
  Verified in local test mode: walked into the crate → "SCATTER recovered",
  70 rounds, Q cycles BLASTER↔SCATTER, and 12 shots spent exactly 12 rounds.
- 2026-07-31 — **Footsteps** (`src/fx/footsteps.ts`). Nothing in the game made a
  sound when it moved, in a game about hearing something before you see it.
  Spaced by distance travelled rather than a timer, so cadence follows speed and
  cannot drift out of sync with the legs; yours are quiet and 2D, everyone
  else's are positional, and the beast's stride is longer and heavier.
