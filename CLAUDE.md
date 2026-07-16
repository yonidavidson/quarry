# QUARRY — development guide

A hunt-or-be-hunted platformer inspired by Hunter Hunted (1996). **The entire game is one
self-contained `index.html`** (~1MB): KAPLAY v3001 from CDN, all art/audio embedded as base64
data URIs. That one-file promise is a hard constraint — never add external asset files that the
game loads at runtime.

Live at https://yonidavidson.github.io/quarry/ — deployed by pushing `main` (GitHub Pages,
build ~40s, HTML cached `max-age=600` so testers may need a hard refresh after a deploy).

## index.html map (search for these markers)

- `SOUND ENGINE` — Web Audio synthesis (tones/noise/reverb). Full fallback for every cue.
- `AI SOUND LAYER (#49)` — ElevenLabs clips in `SND_DATA` between `/*SND_DATA_START*/…/*SND_DATA_END*/`;
  `sndPlay`/`sndLoop`/`themeVol`; `CLIP_MAP` wraps `SFX.*` clip-first.
- `JACK v5` / `BEAST v5` — character strips (`HUMAN_PNG`/`STALKER_PNG`) + `loadSprite` anim tables.
  **The anim frame indices must match `tools/pipeline/driver.py` layouts exactly.**
- `OUTSIDE WORLD (#50)` — dusk vista parallax, crows, window views, clouds.
- `LEVEL GENERATOR` — seeded (`sRand`, seed 20260714). **Deterministic and shared by online peers:
  never use unseeded `rand()` for anything that affects collision/pickups; cosmetic-only decoration
  may use `rand()`.** Wells/mezzanines/hills/chasms/underdeep (#54), ropes `|`, medkits `+`.
- `SIDES` — per-character config. `frameW/frameH/areaX/areaY/sc/shadowY` are coupled to the baked
  strip dimensions; hitbox = frame × sc × areaX/Y. When a strip is rebaked and its size changes,
  retune these to keep HIT_W≈30/HIT_H≈57 (human) and ≈32.5/68.5 (beast).
- `scene("game")` — everything gameplay. Key locals: `curAnim` state machine, `animSpeed`
  motion-matching, tilt/lean block, crouch (`area.scale/offset` mutation), mantle tween,
  magnetic climb-column snap, `mkHeld` (weapon overlay with holster predicate).
- `spawnEnemy(x, y, kind)` — "drone" | "hunterbot" (3 HP, chases) | "crawlbot" (2 HP, underdeep).
  `hitEnemy` chips HP; `killEnemy` is death; explosions one-shot.
- `spawnNemesis` — the AI hunter. It reads `LADDERS` for navigation and can crouch through
  1-row crawl gaps (`n.crouched`).
- `ONLINE 2P` — manual-signal WebRTC (`netHost/netJoin/netHostAccept` are window globals).
  `NET.onMsg` per scene; over-scene rematch swaps sides; `{t:"atk"|"crate"|"lever"|"pod"|"rematch"|"left"}`.
- `scene("boot")` — audio-unlock gate (browsers block AudioContext until a gesture; the splash roar
  depends on this).

## Asset pipelines

### Characters (PixelLab MCP)
- Jack `a3aefd17-e5dc-4e76-a699-48a6c03e26c3`, Stalker `1071585a-fb6d-4b65-9118-4151afc0df6e`
  (252×252 canvas, east-facing only; game mirrors with `flipX`).
- Generate with `animate_character` mode v3. **Hard-won lessons:**
  - Text-only prompts stay near the standing pose. For inverted/vertical/prone/grip poses,
    compose a start frame (PIL flip/rotate/erase), quantize ≤64 colors, commit it under
    `tools/ref/`, push, and pass `custom_start_frame_url` (inline base64 gets truncated in transit).
  - Never name a prop in the prompt ("climbing a vine" ⇒ the model paints a club into his hands).
    Ask for *pantomime with completely empty hands*; the game draws the prop.
  - Fluidity = frame count: cycles at 8f, not 4f. Transitions via **interpolation mode**
    (`custom_start_frame_url` + `end_frame_url`) — the mantle (hang→crouch) was made this way.
  - Back view (`directions: ["north"]`) is correct for ropes/ladders/hangs.
  - **Register multi-frame cycles**: shift each frame so the bottom-half (legs) bbox center-x sits
    at 126, or the body wanders between frames.
  - "status: already complete" = silent dedupe; reword the prompt and re-queue.
  - Download all frames via `https://api.pixellab.ai/mcp/characters/<id>/download` (zip; poll until
    the new animation directory appears — the zip can race the render).
- Source frames are committed in `tools/frames/{jack,stalker}/` — the durable store.

### Strips (rebake after any frame change)
```
cd tools/pipeline && python3 driver.py [jack|stalker|both]   # writes ../frames/<name>_strip.png
```
Then base64 the strip into `HUMAN_PNG`/`STALKER_PNG` (regex-replace the data URI), update the
`loadSprite` anim indices to match driver.py comments, and retune `SIDES` dims from the bake output
(`frameW/frameH/feetFromCenter→shadowY`). Current layouts are documented as comments in driver.py.

### World objects (PixelLab map objects)
- `create_map_object` — min size 32px (generate small props at 2×, downscale LANCZOS); download from
  `https://api.pixellab.ai/mcp/map-objects/<id>/download` (the backblaze URL pattern 404s).
  **Objects auto-delete server-side after 8h** — raw PNGs are committed in `tools/objs/`.
- Prompt lessons: "fills the canvas" still leaves margins (crop bbox + stretch at bake); vertical
  geometry needs "seen head-on, perfectly vertical"; sprite-sheet rows work for simple shapes
  (crows, explosion) but fail for many distinct small items (weapon icons → 17 identical pistols).
- Deliberately still SVG: weapon icons, rope, cable, brackets, stains, and all pure light/atmosphere
  gradients (glows, cones, fog, sky, shadows) — pixelating those reads worse.

### Sounds (ElevenLabs)
- `node tools/gen_sfx.mjs` regenerates + re-injects everything between the SND_DATA markers.
  Prompts/durations in-file; clip cache `tools/sfx/`; key at `~/.config/elevenlabs/key` (chmod 600).
- Free tier needs the README attribution (present). Music API is paid-tier; the theme is a
  sound-generation loop.

## Testing (always verify before shipping)

Playwright with system Chrome (`channel: 'chrome'`, args `--no-sandbox`,
`--autoplay-policy=no-user-gesture-required`); serve with `python3 -m http.server` from the repo.
The page exposes everything as globals (`global: true`, non-module script): `go('game','human'|'stalker')`,
`get('player')`, `GRID`, `LADDERS`, `WELLS`, `CHASMS`, `NET`, `SND`, `__quarry` (debug hook:
`.give(w)`, `.attack()`, `.weapon()`, `.ceil()`, `.lad()`).

**KAPLAY swallows runtime errors into its own blue screen — page-error listeners see nothing.**
Every test must also assert scene survival after actions: `get('player').length === 1`.
Boot flow eats the first keypress (audio gate) and the splash auto-advances ~3.4s; jumping straight
to gameplay with `go('game', side)` avoids all of it. Two-page WebRTC tests work headlessly by
calling `netHost/netJoin/netHostAccept` directly.

## Ship loop

1. Edit → serve locally → drive with Playwright (screenshots + survival asserts, zero console errors).
2. Commit (imperative summary + body; end with the Claude Code trailer), push `main`.
3. Verify live: `until curl -s "https://yonidavidson.github.io/quarry/?cb=$(date +%s)" | grep -q "<marker>"; do sleep 5; done`
   using a string unique to the new build.
4. Update README when player-facing behavior changes.

## Backlog

- #47 remaining SVG→PixelLab (weapon icons need per-icon generation)
- #48 ambient life & weather ideas
- #50 animation backlog (weapon attack poses, death anims, beast fluidity pass at 8f)

## Gotchas that bit us

- zsh does NOT word-split unquoted vars — `for pair in "a b"; set -- $pair` breaks; use python for loops over pairs.
- `dx`/input vars are locals of the game update loop — key handlers must read input inline.
- `lifespan()` requires an `opacity()` comp on the same object.
- `offscreen({hide})` culls by position, not bbox — chunk wide tiled sprites (≤12 tiles).
- Buried solid cells (all four neighbors solid) skip sprites entirely; colliders merge per row from GRID.
- Object count is the perf ceiling (~2500 OK); measure with `get('*').length` and `debug.fps()`.
- Gate/lever state and destroyed stubs mutate module-level GRID — consistent across rematches by design.
