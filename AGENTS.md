# QUARRY — agent operating manual

Read this first. Every agent on the bus works from this file.

A hunt-or-be-hunted browser platformer inspired by *Hunter Hunted* (1996).
**The entire game is one self-contained `index.html`** (~1.7MB): KAPLAY v3001
from CDN, all art/audio embedded as base64. That one-file promise is a hard
constraint — never add external asset files the game loads at runtime.

| | |
|---|---|
| Repo | `yonidavidson/quarry` (local checkout may be named `hunter-hunted`) |
| Live | https://yonidavidson.github.io/quarry/ |
| Bus | auto-detected from this repo's git remote (`github://yonidavidson/quarry`) |
| Deploy | push `main` → GitHub Pages (~40s). HTML cached `max-age=600` — hard-refresh after deploy |

---

## Session start (do this every time)

```bash
# from the quarry checkout
agentcomm register
agentcomm register --status "working #<issue> <short what>"
agentcomm inbox --json          # consume instructions before coding
agentcomm network               # who else is here + their statuses
```

Bus is auto-detected from the git remote. Override only if needed:
`AGENTCOMM_BACKEND=github://yonidavidson/quarry`.

Update status as work changes. Stuck?  
`agentcomm register --status "blocked: <what you need>"` — digests recruit help.

Subjects: `task` · `ack` · `done` · `revision` · `question` · `status`.  
Reply on the sender's `--thread`. Always check inbox before reporting done.

---

## How to run the game

```bash
cd "$(git rev-parse --show-toplevel)"
python3 -m http.server 8765
# open http://localhost:8765/
```

Or play live: https://yonidavidson.github.io/quarry/

### Playtest with cmux browser

```bash
cmux --json browser open http://localhost:8765/
# note surface_ref, e.g. surface:68
cmux browser surface:68 wait --load-state complete --timeout-ms 15000
cmux browser surface:68 screenshot --out /tmp/quarry.png
cmux browser surface:68 errors list
cmux browser surface:68 console list
```

Skip boot/splash — jump straight into a side:

```bash
cmux browser surface:68 eval --script "go('game','human')"   # or 'stalker'
```

Drive with keys (`press Space`, `press ArrowRight`, …) or eval debug hooks (below).
Re-screenshot after actions. **Assert scene survival:** `get('player').length === 1`
(KAPLAY swallows runtime errors into its blue screen — page-error listeners miss them).

### Playtest with Playwright

```js
// channel: 'chrome', args: --no-sandbox, --autoplay-policy=no-user-gesture-required
await page.goto('http://localhost:8765/');
await page.evaluate(() => go('game', 'human'));
// assert get('player').length === 1 after every action
```

Boot eats the first keypress (audio gate); splash auto-advances ~3.4s. Prefer `go(...)`.

---

## Controls (player-facing)

| Action | Keyboard | Gamepad |
|--------|----------|---------|
| Move / climb | ←→↑↓ / WASD | stick / d-pad |
| Jump | Space | A |
| Crouch / crawl | hold ↓ / S | stick down |
| Attack | J / X | B / X |
| Bomb (Jack) / Super leap (Beast) | K / C | Y |
| Use door / take weapon | E | d-pad up |
| Pause / Mute / Restart | Esc / N / Shift+R | — |
| Online 2P (menu) | O | — |
| Chat (online) | T | — |

Beast wall-climb: hold into wall + Up. Jack is fragile ranged; Stalker is tough melee + mobility.

---

## Debug globals (page exposes everything)

Non-module script, `global: true`. Useful from browser eval / Playwright:

| API | Purpose |
|-----|---------|
| `go('game','human'\|'stalker')` | enter gameplay, skip boot |
| `get('player')` | player entities — **always assert `.length === 1`** |
| `GRID`, `LADDERS`, `WELLS`, `CHASMS` | level geometry |
| `NET`, `SND` | networking / sound |
| `__quarry.give(w)` | give weapon by name/id |
| `__quarry.attack()` | fire attack |
| `__quarry.weapon()` | current weapon |
| `__quarry.ceil()` / `__quarry.lad()` | ceiling / ladder helpers |
| `netHost` / `netJoin` / `netHostAccept` | WebRTC online (window globals) |
| `get('*').length`, `debug.fps()` | perf |

---

## index.html map (search these markers)

- `SOUND ENGINE` — Web Audio synthesis fallback for every cue
- `AI SOUND LAYER (#49)` — ElevenLabs clips in `SND_DATA` (`/*SND_DATA_START*/…/*SND_DATA_END*/`)
- `JACK v5` / `BEAST v5` — strips `HUMAN_PNG`/`STALKER_PNG` + `loadSprite` anim tables  
  **Anim frame indices must match `tools/pipeline/driver.py` layouts exactly.**
- `OUTSIDE WORLD (#50)` — dusk vista parallax, crows, window views, clouds
- `LEVEL GENERATOR` — seeded (`sRand`, seed `20260714`). **Deterministic and shared by online peers: never use unseeded `rand()` for collision/pickups; cosmetic-only decoration may use `rand()`.**
- `SIDES` — per-character config. `frameW/frameH/areaX/areaY/sc/shadowY` couple to baked strip size. Hitbox = frame × sc × areaX/Y. Target ≈ HIT_W 30 / HIT_H 57 (human), ≈ 32.5 / 68.5 (beast).
- `scene("game")` — gameplay: `curAnim`, `animSpeed`, crouch area mutation, mantle, climb snap, `mkHeld`
- `spawnEnemy` — `"drone"` \| `"hunterbot"` (3 HP) \| `"crawlbot"` (2 HP)
- `spawnNemesis` — AI hunter (uses `LADDERS`, can crouch crawl gaps)
- `ONLINE 2P` — manual-signal WebRTC; msgs `{t:"atk"|"crate"|"lever"|"pod"|"rematch"|"left"}`
- `scene("boot")` — audio-unlock gate

---

## Asset pipelines

### Characters (PixelLab)
- Jack `a3aefd17-e5dc-4e76-a699-48a6c03e26c3`
- Stalker `1071585a-fb6d-4b65-9118-4151afc0df6e`
- 252×252, east-facing only; game mirrors with `flipX`. Mode v3 `animate_character`.
- Hard lessons: text-only stays near standing pose — for inverted/prone/grip, compose start frame (PIL), quantize ≤64 colors, commit under `tools/ref/`, pass `custom_start_frame_url` (inline base64 truncates). Never name props in prompts (model paints them in). Cycles at 8f. Register multi-frame cycles so legs bbox center-x ≈ 126. Back view `directions: ["north"]` for ropes/ladders/hangs. Download: `https://api.pixellab.ai/mcp/characters/<id>/download`.
- Source frames: `tools/frames/{jack,stalker}/`

### Strips (rebake after any frame change)
```bash
cd tools/pipeline && python3 driver.py [jack|stalker|both]  # → ../frames/<name>_strip.png
```
Base64 into `HUMAN_PNG`/`STALKER_PNG`, keep anim indices = driver.py order (row-major), retune `SIDES` from bake output.

### World objects (PixelLab map objects)
- `create_map_object` — min 32px; download `https://api.pixellab.ai/mcp/map-objects/<id>/download` (backblaze 404s). **Server deletes after 8h** — commit raw PNGs in `tools/objs/`.
- Still SVG on purpose: cable, brackets, stains, pure light/atmosphere gradients.
- Weapons + rope are already PixelLab.

### Sounds (ElevenLabs)
```bash
node tools/gen_sfx.mjs   # rewrites SND_DATA markers; cache tools/sfx/; key ~/.config/elevenlabs/key
```

---

## Ship loop

1. Edit `index.html` (and tools if assets) → serve locally → Playwright/cmux playtest  
   (screenshots + `get('player').length === 1` + zero console errors).
2. Commit imperative summary + body; push `main`.
3. Verify live:
   ```bash
   until curl -s "https://yonidavidson.github.io/quarry/?cb=$(date +%s)" | grep -q "<unique-marker>"; do sleep 5; done
   ```
4. Update README when player-facing behavior changes.
5. Bus: `agentcomm register --status "done #<n> …"` and `send --subject done` to whoever assigned you.

---

## Collaboration on the bus

- Claim work with `register --status` + `send --subject ack` before coding.
- Open playtest bugs as **GitHub issues** on `yonidavidson/quarry`, then assign on the bus:
  ```bash
  gh issue create --repo yonidavidson/quarry --title "…" --body "…"
  agentcomm send --to <alias> --subject task --body "Fix #N: … repro … expected …"
  ```
- Image / screenshot QA: attach path or URL; someone with vision reviews.
- Mechanical work → smaller model; hard bugs → smarter model (`--subject question`).
- One actor per mailbox. Prefer a background listener subagent for `wait`/inbox if your harness supports it.
- Stale status without progress = fair game for reassignment.

---

## Backlog (check `gh issue list` for truth)

- **#47** remaining SVG→PixelLab (portraits, structural tiles/props). Weapons + rope done. Often blocked on PixelLab credits.
- Playtest polish leftovers from #48/#50 as they surface.

---

## Gotchas that bit us

- zsh does not word-split unquoted vars — use python for pair loops.
- `dx`/input are locals of the game update loop — key handlers must read input inline.
- `lifespan()` needs `opacity()` on the same object.
- `offscreen({hide})` culls by position not bbox — chunk wide tiled sprites (≤12 tiles).
- Buried solid cells (4 neighbors solid) skip sprites; colliders merge per row from GRID.
- Object count is the perf ceiling (~2500 OK); measure `get('*').length` + `debug.fps()`.
- Gate/lever state and destroyed stubs mutate module-level GRID — intentional across rematches.
- Online peers share the seeded level — unseeded gameplay RNG desyncs multiplayer.
