# QUARRY — Design

_Living document — the agent keeps this current; changes land in the log at the
bottom._

## Concept

A hunt where both sides are armed and only one of you is meant to walk out. You
are Jack, a human loose in a dead industrial complex with a blaster and no room
for error — or you are the Stalker, a horned thing that climbs walls, crawls
ceilings and does not need a weapon. Third-person, over the shoulder, in the
dark. The tension is asymmetry: Jack's advantage is range and nerve; the
Stalker's is that it can be anywhere above you. A 3D rebuild of the shipped 2D
game (tagged `quarry-2d-final`), carrying over its premise, its two characters
and its ledge-and-vent movement vocabulary.

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

Now: ▶ 5. Screens polish + 6. HUD sprite swap

1. Boot, identity, and a walkable floor — ✅ → previewed
2. Jack moves and shoots; the Stalker hunts — ✅ → previewed
3. Play as the Stalker — the asymmetric half — ✅ → previewed ([#75](https://github.com/yonidavidson/quarry/issues/75))
4. The hunt loop: energy cells, extraction lift, win/lose, instant retry — ✅ → previewed
5. Screens: loader, title, side select, pause ([#77](https://github.com/yonidavidson/quarry/issues/77)) — ◐ machine + side select done; menu video, branded loader and settings still open
6. HUD sprite swap from the landed concept ([#78](https://github.com/yonidavidson/quarry/issues/78)) — ⬜
7. 1v1 asymmetric online ([#83](https://github.com/yonidavidson/quarry/issues/83)) — ◐ seating, sides and remote bodies verified with two identities; feel gate not run
8. World dressing — the ceiling the Stalker crosses ([#80](https://github.com/yonidavidson/quarry/issues/80)) — ⬜

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
- **Locations:** 1 floor of the complex for v0 — machine hall, catwalk ring,
  vent crawl, pump room, extraction bay
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
Menu video: yes.

## Assets — the generation plan AND the budget

| Asset | Kind | Status | Wired? |
|---|---|---|---|
| Concept + HUD mockup | image | landed (cms4fujmg00bm2ensvgzgdfqj) — confirms the sprites lane | n/a |
| Jack — player character | character | landed (cms4fbaky009f2ens0f1kmmbi) | yes |
| The Stalker — rigged hunter | creature | landed (cms4fiv3a008x2pqlshvq5jnp) | yes |
| Complex floor — wet concrete | texture | landed | yes |
| Steel catwalk / plate | texture | landed | yes |
| Hall walls — chipped paint | texture | landed | yes |
| Machine casings — oiled metal | texture | landed | yes |
| Ceiling — corrugated + pipes | texture | landed | yes |
| Patrol drone | model | planned | — |
| Energy cell pickup | model | planned | — |
| Blaster shot | sfx | landed | yes |
| Claw strike | sfx | landed | yes |
| Boot on steel grating | sfx | landed | yes |
| Stalker roar | sfx | landed | yes |
| Industrial dread bed | music | landed | yes |
| Key art (loader + title + cover) | image | landed (cms4m26n400iy2pqliielme17) | yes |
| Menu still | image | enqueue on concept landing | — |
| Menu video | video | waits: player's yes / next preview after still / style-only-left | — |
| Logotype | image | enqueue on concept landing | — |
| Night sky through the windows | skybox | proposed — only if v0 keeps window views | — |

Status flow: proposed → planned → generating (id) → landed (URL) → wired.

HUD pipeline state (sprites lane): _not started — Stage-1 mockup is the next
art action._

## World & scale

One floor, roughly 140 × 90 m of interior, walled — no streaming. Vertical
interest comes from a catwalk ring above the machine hall and a vent crawl
between them, not from multiple storeys. The 2D game's multi-floor complex,
atrium wells and underdeep are explicitly out of v0 and are the growth path.

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
