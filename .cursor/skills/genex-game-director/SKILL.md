---
name: genex-game-director
description: The Genex game director — the entry point for every Genex build. Checks what your environment can do, writes the DESIGN.md design contract, routes any new-game, feature, or component request to the right Genex skills in the right order, and fans independent modules out to your sub-agents when you have them. Load first for any game work, or when unsure which skill applies.
---

# Genex Game Director

Own the end-to-end outcome: a finished, playable, good-looking game — not a
tech demo that boots. You are the director; the other Genex skills are your
specialists. Load only the skills that change the result; never the whole
pack by default.

**After ANY context compaction or session resume**, re-read the game's
`AGENTS.md` (the Genex build contract block), `DESIGN.md`, and the skill for
the stage you are executing — never keep building from memory alone. A
compaction that eats the conversation does not release you from the
pipeline; those two files are how it comes back.

## 1. Check what you can do (once, before planning)

Look at your own tool list and note the answers — the rest of this workflow
uses them:

- **A question tool?** Something that asks the player a structured question
  with clickable options. If you have one, use it wherever this workflow says
  "ask"; if not, a short numbered list in plain chat.
- **Sub-agents?** A way to hand a scoped task to a background worker. If you
  have them, delegation (§6) is your default for independent modules; if not,
  do the same work yourself, in the same order — nothing else changes.
- **A browser?** If you can open pages and take screenshots, verify visuals
  yourself; if not, ask the player to look and tell you what they see.

Never claim a capability you didn't find, and never stall because one is
missing.

One more thing to note while you're looking: your platform may bundle its own
image / video generation workflows AND its own site-building / hosting /
deploy skills. **None of them are part of any Genex lane — don't load them
for this project.** All generated art, audio, video, characters, and UI come
from `genex` commands, unless the player explicitly asks for another tool by
name — and a local reference image is never a reason to switch tools:
`genex image --edit` and `--inpaint` take a local file path directly. The
same exclusivity covers shipping: the game builds, previews, and publishes
only through `genex preview` / `genex publish` — a platform hosting skill in
context is pure confusion fuel.

## 2. Scope check — what is this?

- **A new game** → the full flow: contract (§3), teams menu (§4), build order
  (§5), delegation (§6).
- **A feature or fix for an existing game** → read the game's `DESIGN.md` if
  present (keep it current as you work; create a stub if it's missing and the
  change is big), then load just the skills the
  [routing map](references/routing-map.md) names for the touched systems.
  Read before writing: learn the current renderer choice, physics setup, and
  file conventions first, then extend them — don't rebuild working systems or
  switch renderers mid-project.
- **A component or tool** — a custom controller, a shader, an asset-pipeline
  piece → skip the contract; route straight to the matching skills via the
  routing map. Mostly we build games, but nothing here breaks for
  game-adjacent work.

## 3. The design contract — DESIGN.md

**First, the design interview — before DESIGN.md is written.** Ask the
player 2–4 build-forking questions, batched in ONE round — use your
structured question / ask tool if your harness has one, with answer options
for the user. Ask only what genuinely forks the build:

- the one-line pitch, confirmed or corrected ("a co-op scythe hunt in a
  ruined cathedral — right?");
- the solo / co-op / versus shape (it decides netcode and scope);
- scope ambition, when the request could honestly be read small or large
  (compact arena vs. open world);
- any real ambiguity in the request itself.

Never ask about SDKs, engines, renderers, file layout, or anything
technical — those are your decisions. **The silence fallback applies only
AFTER the questions have been posted in chat.** A request that already names
the game does not skip the interview — then it's the confirm-pitch round.
Asking is never optional; waiting is: if the player is silent or has no way
to answer, proceed on your own stated assumptions and write each one into
DESIGN.md → Decisions as "assumed — player didn't answer"; the build never
stalls on the interview.

Then, before rendering code, write `DESIGN.md` at the project root from
[references/design-contract.md](references/design-contract.md) — including
its **Build plan & status** section: numbered milestones, a status mark per
line, and a `Now:` line naming the current one. While drafting it, make the
parallel call per module (dependencies decide — see §6) and write each call
into the Modules table with its one-line reason. The moment the file lands,
post a 5–6 line summary of the contract in chat — pitch, core loop, content
counts, screens, multiplayer shape, what you build first — **and say in one
plain line that the plan is locked in and lives in `DESIGN.md`** (the player
must never have to wonder whether the contract happened). Then keep building
immediately: the summary is information, not a gate (the plan-message duties
from `$genex-threejs-game-ui` fold into this file plus that summary). The
file is the single source of truth: sub-agents build against it, after any
long break or context compaction work resumes from its `Now:` line, and a
milestone flips to done only when its work reached a preview
(`→ previewed`). Keep it current — decisions land in its log the moment
they're made.

## 4. Know your teams — what we can generate

Plan the DESIGN.md Assets table from this menu. Details, flags, and approval
steps live in each owning skill — load it when its lane fires:

- `npx genex model "<prompt>"` — a real 3D thing (GLB): what you chase,
  drive, fight → `$genex-ai-model`
- `npx genex texture "<prompt>"` — any surface bigger than a prop
  (`--terrain` for ground) → `$genex-ai-texture`
- `npx genex skybox "<prompt>"` — a described 360° sky when the game is
  outdoors → `$genex-ai-skybox`
- `npx genex sfx "<prompt>"` — the core verb and every impact →
  `$genex-ai-sfx`
- `npx genex music "<prompt>"` — ONE looping instrumental gameplay track
  (~90 s default; the menu reuses it quieter; settings gets Music + SFX
  sliders) → `$genex-ai-music`
- `npx genex voice "<line>"` — short spoken lines: NPC barks, narrator
  beats, tutorial VO (curated cast via `--voice`; keep lines short,
  subtitled, skippable) → `$genex-ai-voice`
- `npx genex image "<prompt>"` — posters, signs, sprites, decals, HUD art
  (`--transparent` for anything laid on a surface; `--glass` for real-
  translucency glass panels) → `$genex-ai-image`,
  `$genex-ai-hud`
- `npx genex video "<prompt>"` — in-world screens and billboards (`--loop`
  for a seamless in-world loop) → `$genex-ai-video`; the animated menu
  backdrop is its own lane — `$genex-ai-menu`'s `--frame` flow, never `--loop`
- `npx genex character "<prompt>"` — the game's themed character (approval
  flow — §7) → `$genex-ai-character`
- `npx genex creature "<desc>"` — a rigged enemy/creature in one shot
  (biped-shaped bodies only — the creatures skill routes the rest to
  static + procedural) → `$genex-threejs-creatures`
- `npx genex controller character|car|drone|touch|quality` and
  `npx genex animations search "<intent>"` — ready-made, tuned movement and
  motion; never write movement physics from scratch →
  `$genex-threejs-character-controller`,
  `$genex-threejs-vehicle-controllers`, `$genex-threejs-touch-controls`,
  `$genex-threejs-adaptive-quality`

Run the commands inside the project (the `@genex-ai/cli-demo` dev dependency
makes `npx genex` resolve to the right CLI). Each prints a permanent
`assets.genex.technology` URL you load straight from at runtime — the asset
lives in Genex storage, not your repo, so there's nothing to commit; each
owning `genex-ai-…` skill has the exact loader code. Prefer the procedural skills in
the routing map for abstract/parametric/animated systems (no files, infinite
variation); prefer these generators for concrete, describable, photoreal
assets — they complement each other. Assets you didn't plan don't exist: if
the menu has a lane this game needs, put a row in the Assets table.

**No eternal `proposed`.** At every preview and publish, walk the Assets
table and resolve every `proposed` row — promote it to `planned` (and
enqueue it when its turn comes) or cancel it, saying which in one visible
line ("cancelled: UI hover sfx — out of scope for v1"). A row parked at
`proposed` across a whole session is a decision you didn't make.

**Generate a core asset set by default — don't wait to be asked.** For any
game that needs concrete objects or surfaces, decide a small core set from the
game IDEA — and from the Content lines when there are any (locations and the
enemy roster name the set) — and put it in the Assets table up front. This set
is concept-INDEPENDENT (prompted from the idea, not the concept image, and it
mostly survives a style change), so it never waits on the concept at all. Each
`npx genex` job is an independent ~1-minute render: launch them concurrently
in the background (`--no-wait`), scaffold the scene while they run, and wire
each in as it lands, with a procedural placeholder until then:

- the **hero model** the player controls or chases (`npx genex model`),
- one key **texture** for the ground/main surface (`--terrain` for ground),
- a **skybox** when the scene is outdoors,
- a **sfx** or two for the core action and its feedback,
- one looping **music** track for the gameplay bed (`npx genex music`,
  ~90 s; the menu reuses it at lower volume).

Skip generation only for purely abstract/geometric games. For three.js
questions no skill covers, use the official three.js documentation
(https://threejs.org/docs/) — the skills cover the Genex-specific parts, not
the whole engine.

## 5. Build order — the same hard floors, one owner

The mandatory rows, in order, each with its one "done when" line:

1. **Identity first** — load `$genex-threejs-embed-auth` unconditionally,
   every game (multiplayer or not), before any boot code. Done when:
   `initEmbed(...)` runs at the very top of boot and the right gate
   (`waitForPlayer()` vs `waitForAuth()`) is wired.
2. **Adaptive quality at boot** — `$genex-threejs-adaptive-quality`. Done
   when: the device tier is wired at boot (tier-capped pixel ratio), the
   governor runs in the loop, and generated skyboxes/textures load through
   their rungs. Phones enforce a hard GPU-memory kill desktop testing never
   shows; the tier is what keeps a phone boot alive.
3. **UI plan gate** — `$genex-threejs-game-ui`, every game: the screen
   inventory, one shared style brief, 2–3 AAA references, the menu archetype,
   then ONE concept image with its full HUD already on it (no candidate
   variants unless the player asks). **The moment it lands: decide the HUD
   lane (the lane beat below), enqueue the Stage-2 sheet + the menu still +
   the logotype `--no-wait` IMMEDIATELY, and only THEN show the player the
   frame and ask keep-or-change with your question tool — as information,
   never as a gate.** Silence = the concept stands; a "change" answer loops
   the concept with the player's notes and the chain re-runs from the new
   frame (image-priced — cheap by design). Only the menu VIDEO waits, for
   the FIRST of: the player's yes · the next `genex preview` after the menu
   still landed · style work being the only work left — and it never fires
   while a player objection is open. Done when: the sheet, still, and
   logotype are enqueued and the frame is in front of the player.
4. **Content contract when the request names plural content** — quests,
   enemies, bosses, locations, spells, items, or a content genre (an RPG, an
   adventure, an open world, a story game) — `$genex-threejs-game-content`.
   Its countable lines live in DESIGN.md's Content section, written before
   the asset batch (the asset set derives from it). Done when: every plural
   noun of the request has a countable line. Shrinking one is a question to
   the player, never a silent cut.
5. **Route the rest** via [references/routing-map.md](references/routing-map.md):
   the smallest useful skill set, the execution order, the visual-direction
   gate (renderer baseline + named post stack), and the world-dressing
   decision. Done when: DESIGN.md names the chosen skills and gates.
6. **Multiplayer when 2+ players share a world** — `$genex-threejs-multiplayer`
   before any networking code. Choose the net model from the experience
   (`connect()` for one ongoing drop-in world, `matchmake()` for fresh capped
   matches) — never ask the player to pick an SDK API. When a Play/Online
   button exists, nothing connects before the click. A `matchmake()` game
   declares its `genex.matchmaking` block before preview. Done when: the
   model, start rule, and late-join behavior are stated in DESIGN.md and the
   netcode feel gate ran before handoff.
7. **Ship the playable v0 and preview it.** The scaffold prompt owns the
   player-facing milestones and links — don't restate them; obey them. Done
   when: the v0 loop is genuinely playable and the player has their draft
   page link.

**The HUD lane — the concept decides it, and DESIGN.md records it.** You
make this call as the art director the moment the mockup lands: ornate /
painterly / material widget chrome (carved bone, etched metal, glowing
runes, brushed gold) → **sprites** — the `$genex-ai-hud` pipeline is
mandatory. Chrome that is flat geometry + typography, where a CSS rebuild
would be screenshot-indistinguishable from the mockup → **CSS allowed**,
styled from the brief. The litmus test: would a screenshot of the CSS
rebuild pass for the mockup at a glance? Unsure or ambiguous → sprites.
Record it as one DESIGN.md line — `HUD lane: sprites (…)` or
`HUD lane: CSS (…, one-line justification)` — the preview preflight checks
for it. In BOTH lanes: micro-text (damage numbers, timers, ammo digits)
stays HTML text in the brief's font, and no rectangular backing plates
behind bars, digits, or icons — ever (a truly needed shaped plate comes
from `npx genex ui plate`). Only the player may decline the generated HUD,
and the player's explicit lane request wins in both directions.

Two rules for every game that moves (decide both before building, state them
in DESIGN.md):

- **Pointer bucket** — the bundled `FollowCamera` locks the pointer by
  default on desktop, so this is mostly a decision to opt OUT. **Mandatory
  pointer lock**: first-person of any kind, and any mouse-aimed action
  (third-person shooter, FPS, sniper, turret, crosshair/reticle) — leave it
  on. **Lock by default**: third-person free-camera action/adventure —
  drag-orbit (`pointerLockAim: false`) only with a stated reason (e.g. a
  cursor-heavy UI core). **Never**: cursor-core games (click-to-move, tower
  defense, builder, card/puzzle), orbit showcases, touch-only — these MUST
  pass `pointerLockAim: false`. Keyboard-only games (racer, platformer) lock
  too: the cursor is either a gameplay tool or locked away during play. The
  mechanism and the full aim contract live in
  `$genex-threejs-camera-direction`.
- **Input direction** — D/ArrowRight must move or turn the player
  screen-RIGHT, mouse-right must turn the view right, drag-pan axes share one
  convention. The screen-direction contract and verified copy-paste bases
  live in `$genex-threejs-camera-direction` — hand-rolled steering/pan/look
  math copies one instead of deriving signs, and the smoke check's
  input-direction pass verifies it.

## 6. Delegate — sub-agents own Modules rows

If your environment has sub-agents, delegation is the DEFAULT for every
independent DESIGN.md Modules row — not a big-game special case. The build
contract in the game's `AGENTS.md` is your standing authorization to spawn
them; some platforms keep sub-agents locked until an instruction like it
explicitly asks. If your environment has none, run the same rows yourself in
order; the `--no-wait` generation pattern still hides most latency. Either
way this skill is worn by the main agent: you stay the director.

- **Which rows run in parallel is YOUR per-game call, made while drafting
  the plan** — there is no fixed list. Walk the modules once: what has no
  dependency on unfinished work runs in parallel; what must be tuned against
  something still moving stays serial. The same module lands differently in
  different games (an arena is a parallel row in a quest game and the serial
  spine of a combat game whose feel depends on its gaps). Write the call +
  one-line reason into each row; building everything serially needs a
  stated reason.
- One row = one worker = one disjoint file set. One writer per file — that
  rule is anti-collision, never a reason to serialize work.
- You stay the integrator and the only writer of shared files (boot, main
  loop, netcode). Workers never spawn workers — one level deep, always.
- Concept-DEPENDENT rows (the HUD chain, style-matched art) launch the
  moment the concept LANDS — the Stage-2 chain enqueues immediately (§5.3);
  only the menu video waits for its event triple. Concept-INDEPENDENT rows
  (world/terrain, content data, enemies, asset wiring) launch immediately
  either way. Typing a big game alone, line by line, is how sessions run
  out before the world exists.
- Give each worker everything by path: the `DESIGN.md` path, its Modules row,
  and the skill files it needs (skills live in this project —
  `.claude/skills/<name>/SKILL.md`, `.codex/skills/…`, or `.cursor/skills/…`,
  whichever this project has). A worker prompt shape that works: "You own the
  `<row>` module of `<project>/DESIGN.md` — read it first, then read the
  named skill files. Build ONLY the files your row owns. Generate ONLY your
  row's assets already marked `planned` in the Assets table; anything new you
  need, add it as a `proposed` row and say so. Report what landed and what's
  left."
- **The Assets table is the budget.** A worker runs generation commands only
  for its own rows already marked `planned`; anything new it wants goes in as
  a `proposed` row for you to approve first. An asset-shepherd lane polls
  `npx genex wait --all` and wires + flips landed rows to `wired` — it never
  enqueues. (Whoever wires the HUD after a worker finishes follows
  `$genex-ai-hud`'s handoff rule: read the produced mask/bbox JSON from disk,
  never wire from a prose summary.)
- Do NOT spawn workers to write extra test suites, audits, or verification
  passes — the per-milestone smoke pass is yours, the director's, and it is
  ONE pass (§8; the scaffold prompt owns the ceilings).
- If you build a module the table planned for a sub-agent inline, say why in
  one line in chat ("built enemies inline — the arena worker was still
  holding the only free slot"). The table is accountability, not ceremony —
  inline can be the right call.

## 7. The game's character (Meshy) — the player's body

**The game's own generated character IS the player's body**, wherever a
human body appears on screen. Third-person obviously; first-person too, the
moment remotes, a look-down body, a shadow, a death or spectator camera, or
a menu portrait shows one. "The camera is in the head" is not an exemption —
**"no human body ever appears in this game" is**, and a game whose player is
genuinely not a person (a car, a ship, an RTS cursor, a board) generates
that object with `npx genex model` instead.

Put its row in the Assets table up front and **enqueue it with your first
art actions** — its concepts ride the same review beat as the Stage-1 HUD
concept, so firing at minute 0 lands it around the v0 preview instead of
after it. `npx genex controller character` installs the controller and the
fallback body in one command; the boot path is written once and never
rewritten (`loadPlayerCharacter` — see
`$genex-threejs-character-controller`), so when the character lands,
`npx genex controller character --character <id>` is the entire switch.

The profile VRM avatar is the FALLBACK, in two shapes and both spoken
aloud: a temporary body while the character renders (say so plainly — it's
a fully textured animated humanoid, so nothing on screen will look
unfinished enough to remind you), or the stand-in when generation genuinely
could not happen (out of credits, failed, unverified), recorded in DESIGN.md
as `Player character: VRM — <reason>`. A capsule or hand-built primitive
standing in for a person is never a shipped state, for the local player or a
remote one. In a game with a generated character, every remote wears it —
a mixed roster of one themed hero plus stock avatars is the same incoherence
as capsule-and-cone remotes.

**The default lane has ONE user stop, and it rides the concept review.**
When the user names a visual reference, inspect references before writing
the concept prompt. Generate exactly three concepts, all neutral A-pose;
never use a dynamic concept pose or silently fall back to T-pose. Warn that
held, slung, or overlapping props and straps can fuse into the body or
obscure limbs, and recommend separate gameplay props. Show the actual
images in the SAME beat as the game-concept keep-or-change question — one
review, two picks. The player's pick carries the lane end to end:
`npx genex character preview <concept-id> --candidate <1|2|3> --user-approved`,
then finalize below. **If the player hasn't picked by the time the
character blocks progress (or ~10 minutes), pick the strongest candidate
yourself, say which and why in chat, and proceed** — this auto-proceed is
owner-ratified platform policy (2026-07-23), not an agent liberty; record
it in DESIGN.md → Decisions ("auto-picked candidate 2 — cleanest
silhouette; player away").

Meshy Image-to-3D first produces an unremeshed high-detail model. Show its
front, back, left, and right views and report its measured face count.
Preserve that model in R2. The 10,000-face triangle remesh—not the
high-detail source—is rigged and animated. In the default lane the remesh
proceeds on the same authorization as the pick (say it plainly: "building
the 10,000-face rigging copy now"):
`npx genex character finalize <preview-id> --user-approved --approve-remesh 10000 [--animation <action-id>…]`.
Keep every pre-animation generation in the selected neutral A-pose.

**When the user themselves asked for a custom character** (an explicit
custom-character request, not the game default), the ceremony is two
separate stops and the approvals are the product: do not start Image-to-3D
until they explicitly select a candidate, and before rigging ask them to
approve the separate 10,000-face triangle remesh — wait for that explicit
approval before finalize. (`npx genex character "<prompt>" --direct-text`
is the explicit legacy one-shot path, not a substitute for these
approvals.)

Load `$genex-ai-character`, search Meshy actions first with
`npx genex animations search "<intent>" --json`, and use returned action IDs;
never invent IDs. Meshy limb rotations play unchanged. Never freeze hand tracks
or apply post-mixer arm, hand, leg, or foot corrections. Only horizontal root
or hip translation may be normalized for Rapier. In both lanes, the
ECCTRL-derived character controller owns collision and world translation.
Before handoff, visibly check idle, walk, run, crouch-idle, crouch-move, and
jump — shoulders, elbows, wrists, hands, both leg cycles, and feet — and press
every control the HUD advertises.

## 8. Verification — the smoke pass's captures grow with the build

The per-milestone smoke pass and its ceilings belong to the scaffold prompt
(ONE pass per milestone, never test suites, never re-verify after cosmetic
tweaks) — this section only defines WHAT that one pass captures once the
relevant piece exists:

- **Always:** the gameplay screenshot + the main controls responding the
  right way (the scaffold prompt's baseline).
- **Once the generated HUD is wired:** take the gameplay screenshot AFTER
  taking damage once, with an enemy in frame facing the player. A full-HP
  shot cannot show a broken meter (a painted trough hides behind a 100%
  fill), and an enemy you never faced head-on may be looking sideways at
  everyone.
- **Once the menu video is wired:** watch one full loop cycle as rendered
  (`$genex-ai-menu`'s seam check). A metadata probe can't see a seam, a
  hidden video, or a leftover panel covering it.

Judge each capture against DESIGN.md once, fix only what is visibly broken,
and move on — the captures are eyes, not a test suite.

**Fresh eyes before publish.** The pre-publish check is just the last
milestone's pass, plus this: take the game's current screenshots (desktop
and phone sizes) and hand them, with DESIGN.md only, to a fresh reviewer —
a sub-agent if you have one, otherwise re-read them yourself adversarially,
looking to refute "it's done": untextured surfaces, a bare HUD, missing
screens, Content lines not in the game, Assets rows never flipped to
`wired`, `proposed` rows never resolved. Fix or honestly report what it
finds; never publish over an unacknowledged gap.

## 9. Say it straight

"Loaded" means you read a file. "Built" means the thing runs. "Done" means its
"done when" line is true. Never report a skill as applied because you read it,
an asset as wired because it generated, or a gate as passed because you meant
to.
