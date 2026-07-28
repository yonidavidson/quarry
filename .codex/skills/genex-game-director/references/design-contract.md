# The design contract — DESIGN.md

Write `DESIGN.md` at the game project root before any rendering code, from the
template below. Plain game language, readable by the player, committed to the
game's repo (it travels into remixes). It is a working document, not paperwork:
it replaces the plan you would otherwise post only in chat, and it is the
recovery point after any long break — sub-agents read it by path, and so do
you when a session resumes.

Rules the director enforces about this file:

- Create it right after the scope check, before the concept generation; fill
  sections as decisions land and keep it current (stale is worse than short).
- **The Build plan & status section is the compass.** Numbered milestones,
  each with a status mark, and a `Now:` line naming the current one. Update
  it the moment a milestone starts or finishes — a milestone is done only
  when its work reached a `genex preview` (mark it `→ previewed`). After any
  context compaction or session resume, this section — not memory — says
  where the build is; continue from `Now:`. When the plan first lands, tell
  the player in one plain line that it's locked in and lives in `DESIGN.md`.
- **The Modules table is the delegation contract, and "Built by" is a
  per-game DECISION, not a default you copy.** While drafting the plan, walk
  the modules once and decide what can run in parallel and what must stay
  serial for THIS game — dependencies decide (an arena can be a parallel row
  in one game and the serial spine of another). Write the call into each row
  with a one-line reason. When your platform has sub-agents, independent
  modules default to parallel; building everything serially needs a stated
  reason. One row per independent lane, and a row's "Owns files" set never
  overlaps another row's — one writer per file. If a planned-parallel module
  gets built inline, say why in one line. Verification is never a module
  row: the milestone smoke pass belongs to the director (the scaffold prompt
  owns its ceilings).
- **The Assets table is the budget**: the asset list falls out of Content
  (enemies → models, an arena → a ground texture, outdoors → a skybox).
  Status flow per row: `proposed → planned → generating (id) → landed (URL) →
  wired`. Workers generate only their own rows already marked `planned`; new
  wants enter as `proposed` for the main agent to approve; the asset shepherd
  flips statuses and never enqueues. Re-rolls follow the player's notes only.
  The `Wired?` column exists because "generated but never wired in" is the
  most common way finished art gets lost — a row isn't done at `landed`.
  And no eternal `proposed`: at every preview/publish, every `proposed` row
  gets promoted or cancelled with one visible line — never silently parked.
- Shrinking any Content line is a question to the player first, never a
  silent cut.

## Template

```markdown
# <Game name> — Design

_Living document — the agent keeps this current; changes land in the log at
the bottom._

## Concept
One paragraph: what the game is, what playing it feels like.
Concept image: <asset URL> (standing — shown <date>; player said
<yes | nothing — pick stands | change → looped>)

## Core loop
- **You do:** <primary verb — drive, shoot, build…>
- **To:** <objective>
- **Under pressure from:** <what pushes back>
- **You earn:** <reward / progression>
- **You lose when:** <fail state> → **and retry by:** <restart shape>

## Build plan & status
Now: ▶ <number + name of the milestone in progress>
1. <milestone> — ✅ → previewed
2. <milestone> — ▶ in progress (<who: main agent | sub-agent>)
3. <milestone> — ⬜ (<parallel: sub-agent | serial: main agent — one-line why>)
(One line per milestone; update on every start/finish; done requires its
preview. This section is the post-compaction compass — resume from `Now:`.)

## Content (only when the request names plural content or a content genre)
Every plural noun from the request becomes a countable line:
- Quests: <N>, chained by <how>
- Locations: <named list>
- Enemies: <N kinds, which are bosses>
- Grows: <levels/gear/abilities> · Earn/spend: <economy>
- Ten minutes in, I am: <one honest sentence>

## Screens & UI
Screens: <loader, menu, HUD, pause, win/lose…> · Style brief: <one line>
References: <2–3 named games> · Menu archetype: <name>
HUD lane: <sprites (…) | CSS (…, one-line justification)> — mandatory line;
the concept decides it (director §5) and the preview preflight checks for it
Menu video: <yes (the default for every game) | declined (player's reason)>

## Assets — the generation plan AND the budget
| Asset            | Kind        | Status                          | Wired? |
|------------------|-------------|---------------------------------|--------|
| Concept + HUD    | image       | landed → <URL>                  | n/a    |
| <main surface>   | texture     | generating (<id>)               | —      |
| <hero model>     | model       | planned                         | —      |
| Background music | music       | planned (one ~90s looping track)| —      |
| Menu still       | image       | enqueued on concept landing (<id>) | —   |
| Menu video       | video       | waits: yes / next preview after still / style-only-left | — |
| Logotype         | image       | enqueued on concept landing (<id>) | —   |
Status flow: proposed → planned → generating (id) → landed (URL) → wired.
(Optionally note the prompt gist per row — it makes style-change re-rolls one
command.)

**HUD pipeline state (sprites lane) — keep this current; it is how the
pipeline survives a context compaction.** One row per stage with its
generation id / output path, so a resumed session knows exactly where the
chain stopped and what fires next:
- Stage-1 mockup: <id → URL>
- Stage-2 sheet: <id → URL>
- Cleaned sheet: <id → URL>
- Extracted sprites: <public/assets/hud/…>
- Masks: <public/assets/hud/…-mask.png + sidecars>
- Next stage: <what fires next, one line>

## World & scale
<Size in numbers if open world; arena bounds otherwise. Streamed terrain? y/n>

## Multiplayer
<single-player | ongoing world (connect) | fresh matches (matchmake: quorum,
teams, backfill…)> — and why. Play-button rule: nothing connects before the
click (when a Play screen exists).

## Modules — the build split
("Built by" is decided per game while drafting the plan — dependencies
decide, with a one-line reason per row; the rows below are only a SHAPE.)
| Module | Owns files | Built by | Done when |
|---|---|---|---|
| Boot & identity | src/main.ts, src/genex-boot.ts | main agent (only writer of shared boot) | boots, tier wired, initEmbed runs |
| World/terrain | src/world/** | parallel: sub-agent (no dependency on combat) | walkable, matches World & scale |
| Quests & dialogue data | src/content/** | parallel: sub-agent (pure data) | counts match Content lines |
| Enemies/AI | src/enemies/** | serial: main agent (tuned against movement feel) | roster matches Content |
| HUD chain (style-dependent) | src/ui/** | parallel: sub-agent on concept landing | all screens from Screens & UI |

## Decisions & changes
- <date> — <one-liner per decision, including anything the player said no or
  yes to>
```

## Filled example (a small arena shooter)

```markdown
# Rustyard — Design

## Concept
A scrap-robot arena shooter: you skate a magnetized junkyard bot around a
crusher pit, blasting rival bots into spare parts before the magnet cycle
pulls everything in. Fast, crunchy, thirty-second lives.
Concept image: https://assets.genex.technology/g/rustyard/concept.png
(standing — shown 2026-07-20; player said yes)

## Core loop
- **You do:** skate + shoot
- **To:** outscore three rival bots before the magnet cycle ends
- **Under pressure from:** rivals hunting you; the pit's edges electrify as
  the cycle counts down
- **You earn:** scrap for hits → speed/armor pickups mid-round
- **You lose when:** your bot breaks → **and retry by:** one key, instant
  respawn, same round

## Build plan & status
Now: ▶ 3. Rival AI feels dangerous
1. Arena skeleton + movement — ✅ → previewed
2. Shooting + scrap scoring — ✅ → previewed
3. Rival AI feels dangerous — ▶ main agent
4. HUD sprite swap — ⬜ parallel: sub-agent (concept landed, chain enqueued)
5. Magnet cycle + pickups — ⬜ parallel: sub-agent (own files, no AI dependency)
6. Menus, music, publish floors — ⬜

## Screens & UI
Screens: loader, title menu, HUD (health, scrap, cycle timer), pause,
win/lose. Style brief: oily metal, warning-stripe accents, stencil type.
References: <three named AAA games>. Menu archetype: hangar pan.
HUD lane: sprites (stencil-cut metal meters + riveted scrap counter — ornate
material chrome, CSS can't pass for it)
Menu video: yes

## Assets
| Asset            | Kind    | Status                     | Wired? |
|------------------|---------|----------------------------|--------|
| Concept + HUD    | image   | landed → <URL>             | n/a    |
| Junkyard ground  | texture | landed → <URL>             | yes    |
| Player bot       | model   | generating (gen_8f2k)      | —      |
| Rival bot        | model   | planned                    | —      |
| Overcast sky     | skybox  | landed → <URL>             | yes    |
| Blaster zap      | sfx     | landed → <URL>             | yes    |
| Menu still       | image   | landed → <URL>             | —      |
| Menu video       | video   | waiting (still landed — fires at yes / next preview / style-only-left) | — |
| Logotype         | image   | generating (gen_9t3m)      | —      |

HUD pipeline state: Stage-1 mockup gen_7a1x → URL · Stage-2 sheet gen_7b2y →
URL · cleaned gen_7c3z → URL · extracted public/assets/hud/ · masks derived ·
next: wire masked fills

## World & scale
One 60×60 m arena, walled; no streaming.

## Multiplayer
Single-player v1 (rivals are host-free local AI). Revisit after publish.

## Modules
| Module | Owns files | Built by | Done when |
|---|---|---|---|
| Boot & identity | src/main.ts | main agent (shared boot) | boots, tier wired, initEmbed runs |
| Arena & pickups | src/world/** | parallel: sub-agent (independent of AI) | walkable, magnet cycle fires |
| Rival AI | src/enemies/** | serial: main agent (tuned vs player feel) | 3 rivals hunt + shoot |
| HUD chain | src/ui/** | parallel: sub-agent on concept landing | all 5 screens live |

## Decisions & changes
- 2026-07-20 — player picked concept candidate 2; asked for "more sparks".
- 2026-07-20 — sparks added as the ambient-motion loop, not particles-everywhere.
```
