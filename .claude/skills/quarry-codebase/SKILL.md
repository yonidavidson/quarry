---
name: quarry-codebase
description: Map of QUARRY's single 1.7MB index.html — which marker comment to search for each system (sound engine, sprite strips, level generator, SIDES character config, scenes, enemies, online 2P, outside world), plus the hitbox/anim-index coupling rules and the gotchas that have bitten past changes. Use this before searching, reading, or editing index.html, when hunting down where a game behavior lives, or when a change involves hitboxes, animation frames, level generation determinism, or performance.
---

# Finding your way around `index.html`

The file is ~1.7MB, so don't read it top to bottom — grep for the marker comment
that owns the system you're changing.

| Marker | What lives there |
|---|---|
| `SOUND ENGINE` | Web Audio synthesis fallback for every cue |
| `AI SOUND LAYER (#49)` | ElevenLabs clips in `SND_DATA` (`/*SND_DATA_START*/…/*SND_DATA_END*/`) |
| `JACK v5` / `BEAST v5` | sprite strips `HUMAN_PNG` / `STALKER_PNG` + `loadSprite` anim tables — the `?sprites=1` fallback |
| `VECTOR RIG (#74)` | the default renderer: `RIGCFG` palettes/scale, `RIG_BONES`, `RIG_ANIMS` keyframes, `rigPose`/`rigFK`/`rigDraw`, `rigComp` |
| `OUTSIDE WORLD (#50)` | dusk vista parallax, crows, window views, clouds |
| `LEVEL GENERATOR` | seeded generation (`sRand`, seed `20260714`) |
| `SIDES` | per-character config (frame size, scale, hitbox areas, shadow) |
| `scene("game")` | gameplay: `curAnim`, `animSpeed`, crouch area mutation, mantle, climb snap, `mkHeld` |
| `spawnEnemy` | `"drone"` \| `"hunterbot"` (3 HP) \| `"crawlbot"` (2 HP) |
| `spawnNemesis` | the AI hunter — uses `LADDERS`, can crouch-crawl gaps |
| `ONLINE 2P` | manual-signal WebRTC; msgs `{t:"atk"\|"crate"\|"lever"\|"pod"\|"rematch"\|"left"}` |
| `scene("boot")` | audio-unlock gate |

## The rig is the default renderer

`RIG_ON` (true unless `?sprites=1`) swaps `sprite(...)` for `rigComp(sideKey)` on
the player, the nemesis and the online remote. `rigComp` deliberately mimics the
sprite comp's surface — `play()`, `curAnim()`, `animSpeed`, `flipX`, `width`/
`height`, `renderArea()` — so the game code around it is renderer-agnostic. Two
rules when you touch it:

- **Every `play()` goes through `animFor()`.** The rig has `walk` and `cdown`; the
  strips don't. Anim names also cross the wire in online 2P, where the peer may be
  running the other renderer.
- **Poses that touch the floor need a `root` drop.** The hip is the root and does
  not move on its own, so folding the legs lifts the feet instead of lowering the
  body. Knees bend one way only: shin absolute angle ≥ thigh's. Foot height is
  `-(cos(thighAbs) + cos(shinAbs)) * 10 + root[1]`, and standing is 20 — audit a
  new pose against that number before trusting how it looks in one screenshot.

## Two couplings that break silently

**Anim frame indices ↔ `tools/pipeline/driver.py`.** The `loadSprite` anim tables
index into a baked strip whose layout is decided by `driver.py` (row-major, in
its order). Change one without the other and you get the wrong pose playing, with
no error. See **quarry-assets** for the rebake.

**`SIDES` ↔ baked strip size.** `frameW`/`frameH`/`areaX`/`areaY`/`sc`/`shadowY`
are all tuned against the strip's actual frame dimensions. The hitbox is
frame × `sc` × `areaX`/`areaY`. Targets: ≈ HIT_W 30 / HIT_H 57 for the human,
≈ 32.5 / 68.5 for the beast. Retune `SIDES` from the bake output whenever the
strip dimensions move.

## Level generation is deterministic on purpose

The generator is seeded (`sRand`, seed `20260714`) and **online peers rely on
both sides generating the identical level**. Never use unseeded `rand()` for
anything that affects collision, geometry, or pickups — it desyncs multiplayer.
Cosmetic-only decoration may use `rand()`.

## Gotchas that bit us

- zsh does not word-split unquoted vars — use python for pair loops in shell work.
- `dx` and input are locals of the game update loop; key handlers must read input inline.
- `lifespan()` needs `opacity()` on the same object.
- `offscreen({hide})` culls by position, not bbox — chunk wide tiled sprites (≤12 tiles).
- Buried solid cells (all 4 neighbors solid) skip sprites; colliders merge per row from `GRID`.
- Object count is the perf ceiling (~2500 is fine); measure `get('*').length` and `debug.fps()`.
- Gate/lever state and destroyed stubs mutate module-level `GRID` — this persists
  across rematches, and that's intentional.
