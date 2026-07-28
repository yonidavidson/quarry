---
name: quarry-codebase
description: Map of QUARRY's three.js source — which file owns each system (boot, world, the Stalker's vertical AI, blaster, hunt loop, HUD, assets, bundled controllers), plus the loop contract the character controller requires and the gotchas that have already cost a debugging round. Use this before searching, reading, or editing game code, when hunting down where a behavior lives, or when a change touches physics, the camera, or the render loop.
---

# Finding your way around `src/`

Small files, one system each. Read `DESIGN.md` first — it says what is built and
what is next.

| File | What lives there |
|---|---|
| `src/main.ts` | Boot and the only render loop. Identity → tier → renderer → physics → world → player → hunt. The **only** writer of shared boot state. |
| `src/world/complex.ts` | The floor: one `layout()` list that emits both the mesh and its static collider, plus the light rig. Returns the wall meshes the camera and bullets need. |
| `src/hunter/stalker.ts` | The Stalker: the prowl → wall → climb → ceiling → pounce state machine, kinematic movement, the generated creature model. |
| `src/combat/blaster.ts` | Hitscan fire down the camera's forward axis, tracers, muzzle flash, line-of-sight blocking. |
| `src/game/hunt.ts` | Health, energy cells, the extraction pad, win/lose. |
| `src/ui/hud.ts` | The DOM HUD — health pips, cell count, the danger read, end screen. **Scaffolding**: the generated sprite set replaces it (`DESIGN.md` → HUD lane). |
| `src/audio.ts` | One listener, positional roars, the tension bed. Everything waits on a user gesture. |
| `src/assets.ts` | Permanent Genex URLs for every generated texture, model and sound. Keep in step with `DESIGN.md`'s Assets table. |
| `src/genex.config.ts` | Written by `genex init`. **Read-only** — never hardcode environment URLs. |
| `src/controllers/**` | Vendored Genex kits: `character/` (controller, follow camera, animations, player body), `shared/` (PhysicsWorld, colliders), `quality/` (device tier, governor), `touch/`. Treat as library code. |

## The loop contract — get this wrong and nothing moves

The bundled character controller is strict about ordering, and the CLI's short
wiring sketch omits half of it. The correct shape lives in
`$genex-threejs-character-controller`; the parts that have already bitten:

- `physics.onBeforeStep(...)` runs `character.setMovement(kb.getCharacterMovement())`
  then `character.update()` — once per **fixed substep**, before `world.step()`.
  `character.update()` takes **no** dt; it uses the fixed timestep internally.
- `physics.registerBody(character.body, character.root)` is required, or the
  visible root never follows the physics body.
- A `FollowCamera` must be constructed and driven every render frame. Passing the
  camera to `CharacterController` alone does **not** move it — the symptom is a
  frozen view of nothing while the game otherwise runs fine.
- The render delta comes from `performance.now()`, never `THREE.Clock.getDelta()`.

## Two rules the code depends on

**One layout list, two consumers.** `world/complex.ts` builds every solid from a
single array, emitting the mesh and the static cuboid collider in the same pass.
Add geometry there and nowhere else, or the walkable shape and the visible shape
drift apart silently.

**The Stalker is kinematic on purpose.** It is not a physics character. A dynamic
capsule cannot hold a wall or hang from a ceiling without fighting gravity every
frame, so the Stalker's position is set directly and its collider exists only for
bullets to raycast against. Do not "fix" this by giving it a rigid body.

## Gotchas

- **Never run `npm create vite .` here.** `--overwrite ignore` empties the whole
  directory; it has already destroyed this repo once, including `.genex/` and the
  skills. Write config files by hand.
- The TypeScript config is strict with `erasableSyntaxOnly`: **constructor
  parameter properties** (`constructor(private scene: Scene)`) are a compile
  error. Declare the field, assign in the body.
- `THREE.Audio.playbackRate` is read-only — use `setPlaybackRate()`.
- Generated models load without a per-tier rung unless routed through
  `loadModelWithFallback`; `genex preview` warns about it, and phones pay for it.
- `npm run build` type-checks before bundling, so it is the cheap correctness
  gate — run it before any preview.
