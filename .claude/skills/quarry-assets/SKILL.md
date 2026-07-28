---
name: quarry-assets
description: Generate and re-roll QUARRY's art and audio through Genex — characters (Jack), rigged creatures (the Stalker), textures, models, sound effects, music, HUD sprites and menu video — plus this game's current asset inventory and the approval gates that need the player's yes. Use whenever a task involves new or changed characters, creature models, world textures, props, sound effects, music, or UI art.
---

# QUARRY's art and audio

Everything generated goes through `npx genex …` and comes back as a **permanent
URL in Genex storage**. Nothing large is committed. The URLs are collected in
`src/assets.ts`; the plan and status live in `DESIGN.md`'s Assets table. Keep the
two in step — a generated asset that never got wired in is the most common way
finished art gets lost.

The `genex-ai-*` skills are authoritative on each generator's flags and loader
code — load the one that owns the lane. This skill is only what is specific to
QUARRY.

## Current inventory

| Asset | Command | Id |
|---|---|---|
| Jack — player character | `genex character` | `cms4fbaky009f2ens0f1kmmbi` |
| The Stalker — rigged creature | `genex creature` | `cms4fiv3a008x2pqlshvq5jnp` |
| Machine-hall floor (`--terrain`) | `genex texture` | `cms4emta7007b2ens0yy80gif` |
| Catwalk diamond plate | `genex texture` | `cms4emub4006i2pqltf31ogeu` |
| Blaster / claw / footstep / roar | `genex sfx` | see `src/assets.ts` |
| Industrial dread bed (~90s loop) | `genex music` | `cms4emv98007g2ensjvsuohe2` |

`npx genex wait --all` gives one status line per generation — run it at **every**
preview. A job can fail server-side while its URL is already wired into the game,
and looking is the only way to find out.

## The art direction to prompt against

Wet concrete and rusted steel. Sodium-orange emergency light against near-black.
Hazard-stripe accents, stencilled industrial type. Muted and desaturated, with
orange (threat) and toxic green (energy cells, extraction) as the only accents.
Grounded near-future realism — no fantasy, no clean sci-fi chrome.

## Approval gates — do not spend past them silently

- **`genex character`** returns **three concepts**. Show the player all three
  numbered links and wait for an explicit pick. Then `genex character preview
  <id> --candidate <n> --user-approved` returns four views — show all four and
  wait again before `genex character finalize <id> --user-approved
  --approve-remesh 10000`.
- **`genex creature`** is one-shot: model → rig → clips, no approval ceremony.
  That is why the Stalker was a creature and Jack was a character.
- The HUD's Stage-1 concept mockup is shown to the player as **information, not a
  gate** — enqueue the Stage-2 sheet, menu still and logotype immediately, then
  ask keep-or-change. Only the menu video waits.

## Wiring the results

- **The player's body** is a manifest, not code: `npx genex controller character
  --character <id>` writes `public/assets/meshy-character.json` and the next
  reload swaps it in. `src/main.ts` never changes. **Never run this for an
  enemy** — it would replace Jack.
- **Enemies** load their rigged GLB directly (see `stalker.ts` → `loadBody()`),
  scaled from their own bounding box so the Stalker towers over Jack, with a
  procedural stand-in until it arrives.
- **Textures** tile through `loadTiling()` in `world/complex.ts`.
- **Phones**: models and textures should go through the adaptive-quality kit's
  `loadModelWithFallback` / `loadTextureWithFallback` so small rungs are used.
  `genex preview` warns where they don't — treat that as work, not noise.

## The 2D pipeline is retired

Jack and the Stalker used to be baked PixelLab sprite strips rebaked with
`tools/pipeline/driver.py`, and sound came from `tools/gen_sfx.mjs` (ElevenLabs).
Both are historical. That art is still in the repo under `tools/` and embedded in
the 2D game at tag `quarry-2d-final`, and the strips remain a good reference for
palette and proportion — but new art comes from Genex.
