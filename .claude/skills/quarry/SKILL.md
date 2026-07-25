---
name: quarry
description: Entry point and operating manual for the QUARRY game repo (hunt-or-be-hunted browser platformer, the whole game is one self-contained index.html). Use this whenever working in this repo at all — before editing index.html, running or serving the game, shipping a change, or deciding which specialist skill applies. Covers the one-file hard constraint, local serving, the ship loop, and routing to quarry-playtest, quarry-codebase, quarry-assets, and quarry-agentcomm.
---

# QUARRY — operating manual

A hunt-or-be-hunted browser platformer inspired by *Hunter Hunted* (1996).

| | |
|---|---|
| Repo | `yonidavidson/quarry` (local checkout may be named `hunter-hunted`) |
| Live | https://yonidavidson.github.io/quarry/ |
| Deploy | push `main` → GitHub Pages (~40s). HTML cached `max-age=600` — hard-refresh after deploy |
| Player docs | `README.md` — update it when player-facing behavior changes |

## The one-file constraint

**The entire game is one self-contained `index.html`** (~1.7MB): KAPLAY v3001 from
CDN, all art and audio embedded as base64. Everything the game loads at runtime
lives inside that file. Never add external asset files the game fetches at
runtime — a change that breaks "download one file and it works" breaks the
product's whole premise. Build tooling under `tools/` is fine; it produces
artifacts you paste *into* `index.html`.

## Run it

```bash
cd "$(git rev-parse --show-toplevel)"
python3 -m http.server 8765
# open http://localhost:8765/
```

Or play live: https://yonidavidson.github.io/quarry/

## Ship loop

1. Edit `index.html` (and `tools/` if assets changed) → serve locally → playtest.
   A change isn't done until you've seen it run: screenshots, `get('player').length === 1`,
   zero console errors. See **quarry-playtest**.
2. Commit with an imperative summary + body; push `main`.
3. Verify the deploy actually landed — Pages is cached, so poll for a marker
   unique to your change:
   ```bash
   until curl -s "https://yonidavidson.github.io/quarry/?cb=$(date +%s)" | grep -q "<unique-marker>"; do sleep 5; done
   ```
4. Update `README.md` when player-facing behavior changes.
5. Report on the bus — see **quarry-agentcomm**.

## Which skill to read next

| You're about to… | Read |
|---|---|
| Open the game in a browser, drive it, screenshot, check for errors | **quarry-playtest** |
| Find or change game code inside `index.html` | **quarry-codebase** |
| Regenerate character sprites, world objects, or sound effects | **quarry-assets** |
| Coordinate with other agents, claim work, file playtest bugs | **quarry-agentcomm** |

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

Beast wall-climb: hold into wall + Up. Jack is fragile ranged; the Stalker is
tough melee with better mobility.

## Backlog

`gh issue list --repo yonidavidson/quarry` is the truth. Long-running threads:

- **#47** remaining SVG→PixelLab conversions (portraits, structural tiles/props).
  Weapons and rope are done. Often blocked on PixelLab credits.
- Playtest polish leftovers from #48/#50 as they surface.
