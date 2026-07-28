---
name: quarry
description: Entry point and operating manual for the QUARRY game repo — a 3D hunt-or-be-hunted browser game built in three.js on the Genex platform. Use this whenever working in this repo at all — before editing game code, running or previewing the game, shipping a change, or deciding which specialist skill applies. Covers how the project is laid out, how to run and preview it, the ship loop, and routing to the quarry-* and genex-* skills.
---

# QUARRY — operating manual

A 3D hunt-or-be-hunted game: you are Jack, alone in an industrial complex with a
blaster, and the Stalker hunts you from the walls and ceiling.

| | |
|---|---|
| Repo | `yonidavidson/quarry` (local checkout may be named `hunter-hunted`) |
| Play | https://genex.games/world/quarry-d291c2 — the game's page on Genex |
| Platform | [Genex](https://genex.games) — identity, hosting, publishing, multiplayer |
| Stack | three.js + Rapier + Vite + TypeScript |
| Contract | **`DESIGN.md`** — the plan, its status, and the asset budget |

## Read DESIGN.md first, every time

`DESIGN.md` is the single source of truth: the pitch, the core loop, the numbered
build plan with a `Now:` line, the content contract, and the Assets table. After
any break or context compaction, resume from its `Now:` line rather than from
memory. Keep it current as decisions land — a stale contract is worse than a
short one.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173/?genex_local_test=1
```

The `?genex_local_test=1` marker is **required** for local self-testing: without
it, an unpublished draft shows the platform's sign-in gate to your browser, and a
screenshot of that gate is not a screenshot of the game. It validates rendering,
controls and feel — never identity, saves, leaderboards or multiplayer, which
have no local equivalent. Label evidence from it accordingly.

## Ship loop

1. Edit → `npm run build` (the template type-checks; a build error is a real
   error) → drive it locally and screenshot. See **quarry-playtest**.
2. `npx genex preview` — builds and pushes. Hand the player the **page** link,
   never the bare `*.genex.technology` origin, never localhost, never a file
   path. **This game is published**, so every preview goes live to everyone
   instantly — never describe it as a private draft. `preview`'s summary line
   states the current status; read it rather than assuming.
3. `npx genex wait --all` at every preview — a generation can fail server-side
   while its URL is already wired in, and looking is the only way to find out.
4. Update `DESIGN.md`: a milestone is done only once it reached a preview.
5. Commit and push `main`.
6. `npx genex publish` re-lists it; already done, so `preview` is the normal
   update path from here.

GitHub Pages serves the repo's `docs/` folder — a redirect to the Genex world
page, and the single place that knows where the game lives. The README and every
shared link point at the Pages URL, so moving the game means editing one file.
The repo root is Vite source now; a static host cannot run it.

## The hard rules

- **Everything Genex owns goes through `genex` commands.** All generated art,
  audio, video, characters and UI come from `npx genex …`; the game builds,
  previews and publishes only through `genex preview` / `genex publish`. Don't
  reach for another generation or hosting tool.
- **Generated assets are URLs, not files.** They live in Genex storage. Their
  permanent URLs are collected in `src/assets.ts` — keep that in step with
  `DESIGN.md`'s Assets table. Nothing large belongs in this repo.
- **Never hand-roll movement physics.** The bundled controllers under
  `src/controllers/` are tuned; see **quarry-codebase** for the loop contract
  they require.
- **`src/genex.config.ts` is read-only** and environment URLs are never
  hardcoded. If it goes missing, re-run `genex init` rather than writing one.
- **Never scaffold over this directory.** `npm create vite .` empties the folder
  — it has already destroyed this repo once. Write new config files by hand.

## Which skill to read next

| You're about to… | Read |
|---|---|
| Find or change game code | **quarry-codebase** |
| Run the game, screenshot it, check it works | **quarry-playtest** |
| Generate or re-roll art, audio, characters | **quarry-assets** |
| Coordinate with other agents, claim work, file bugs | **quarry-agentcomm** |
| Anything the above don't cover | the `genex-*` skills — start with `genex-game-director` |

The `genex-*` skills are the platform's own and are authoritative on their
subjects (identity, adaptive quality, multiplayer, HUD, creatures, lighting).
The `quarry-*` skills are this game's specifics. When they disagree about
platform mechanics, the `genex-*` skill wins.

## The 2D game

QUARRY was a 2D KAPLAY platformer in a single self-contained `index.html` until
July 2026. It is preserved at the tag `quarry-2d-final`:

```bash
git checkout quarry-2d-final -- index.html   # one file, no build
```

Its vector rig — a bone tree of 33 keyframed poses driving both characters — is
worth reading before building the Stalker's 3D movement vocabulary, since it
already solved wall-cling, ceiling-crawl, ledge-hang and mantle as pose data.
