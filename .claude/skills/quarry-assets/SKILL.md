---
name: quarry-assets
description: Regenerate QUARRY's embedded art and audio — PixelLab character animations for Jack and the Stalker, rebaking sprite strips with tools/pipeline/driver.py, PixelLab map objects, and ElevenLabs sound effects via tools/gen_sfx.mjs. Use whenever a task involves new or changed character poses/animations, sprite strips, HUMAN_PNG/STALKER_PNG, world object art, SVG→pixel-art conversion, or sound effects, including issue #47.
---

# Asset pipelines

Everything ends up base64-embedded in `index.html` — nothing is loaded from disk
at runtime. Source frames and raw PNGs are committed under `tools/` so a
regenerated asset can always be reproduced.

## Characters (PixelLab)

- Jack `a3aefd17-e5dc-4e76-a699-48a6c03e26c3`
- Stalker `1071585a-fb6d-4b65-9118-4151afc0df6e`
- 252×252, east-facing only — the game mirrors with `flipX`. Mode v3 `animate_character`.
- Source frames live in `tools/frames/{jack,stalker}/`.
- Download a character: `https://api.pixellab.ai/mcp/characters/<id>/download`

Hard lessons, learned the expensive way:

- **Text-only prompts drift back to the standing pose.** For anything inverted,
  prone, or gripping, compose a start frame yourself (PIL), quantize to ≤64
  colors, commit it under `tools/ref/`, and pass `custom_start_frame_url` —
  inline base64 gets truncated.
- **Never name props in a prompt.** The model paints them into the sprite.
- Cycles are 8 frames. When registering a multi-frame cycle, line it up so the
  legs' bbox center-x lands ≈ 126, otherwise the character slides while animating.
- Back views (ropes, ladders, hangs) need `directions: ["north"]`.

## Rebaking strips — required after any frame change

```bash
cd tools/pipeline && python3 driver.py [jack|stalker|both]   # → ../frames/<name>_strip.png
```

Then base64 the strip into `HUMAN_PNG` / `STALKER_PNG`, keep the anim indices in
`index.html` matching `driver.py`'s row-major order, and retune `SIDES` from the
bake output. See **quarry-codebase** for why those two couplings matter.

## World objects (PixelLab map objects)

- `create_map_object` — 32px minimum.
- Download from `https://api.pixellab.ai/mcp/map-objects/<id>/download`
  (the backblaze URL 404s).
- **The server deletes objects after 8 hours** — commit the raw PNG to
  `tools/objs/` immediately or it's gone.
- Deliberately still SVG: cable, brackets, stains, and pure light/atmosphere
  gradients. Weapons and the rope are already PixelLab.

## Sounds (ElevenLabs)

```bash
node tools/gen_sfx.mjs   # rewrites the SND_DATA markers in place
```

Clips are cached in `tools/sfx/`; the API key is read from
`~/.config/elevenlabs/key`. The Web Audio synthesis layer stays as the complete
fallback if a clip fails to decode — don't remove it when adding clips.
