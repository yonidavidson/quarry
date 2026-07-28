# QUARRY

A 3D hunt-or-be-hunted game in the browser, inspired by the asymmetric design of
the 1996 classic *Hunter Hunted* — original theme, art, and code.

**[▶ Open QUARRY](https://yonidavidson.github.io/quarry/)**

Public and playable — no install, no account. That link is permanent and always
forwards to wherever the game currently lives, so it keeps working when the game
moves. It plays as a guest straight away; signing in only adds saved progress.

> **Early build.** One floor, one hunt loop, one weapon. It is a long way from
> finished — see [Where it's up to](#where-its-up-to). The plan and its status
> live in [DESIGN.md](DESIGN.md).

## The idea

You are Jack — a human alone in a dead industrial complex with a blaster and no
margin for error. Something else is in here with you, and the interesting thing
about it is that it does not stay on the floor.

The Stalker prowls, breaks for the nearest wall, **climbs it**, crosses the
**ceiling** tracking where you are standing, and drops on you. It always goes
vertical eventually — across open floor, after a few seconds of prowling, or the
instant you shoot it — so the hunt never settles into a footrace. Landing a hit
does not make it back off; it makes it go *up*. A missed pounce is the window you
get to shoot back.

The HUD's only real job is the threat read. When the beast is overhead the
warning goes red and says so, because in a game whose monster spends half its
time on the ceiling, **"above you"** has to be legible without looking up.

## What you do

Find five energy cells scattered across the floor — they are placed to walk you
through every corner of it, which is exactly where you can be found — then reach
the extraction pad, which lights green once you have enough. Or kill the thing.
Die and press **R** to go straight back in.

Cover is real cover: the machine blocks stop bullets, so standing behind one
means something.

## Controls

| Action | Keyboard |
|---|---|
| Move | WASD |
| Run | hold Shift |
| Jump | Space |
| Look / aim | mouse (click to lock the cursor) |
| Fire | left click |
| Retry after death | R |
| Release the cursor | Esc |

Sound starts on your first click — browsers require a gesture before any audio
plays.

## Where it's up to

Built and playable:

- The machine hall — floor, cover blocks, a catwalk ring with ramps, a pump-room
  annex, the extraction bay
- Third-person movement over Rapier physics, with a collision-aware follow camera
- The Stalker's full vertical hunt: prowl → wall → climb → ceiling → pounce
- Hitscan blaster with line-of-sight blocking, energy cells, extraction, win and
  lose states, one-key retry
- Both characters generated and rigged; positional roars and a tension bed that
  leans louder as it closes

Not built yet:

- **Playing as the Stalker.** The asymmetric 1v1 — one human as prey, one as
  predator — is the point of the game and is still ahead.
- Online multiplayer (Genex relay, two seats)
- The rest of the weapons, the nuisance enemies, the vent crawl
- The real HUD and menu — what ships now is hand-written scaffolding; the
  generated sprite set is the production art
- Anything above you worth looking at: the ceiling is dark, and giving the
  Stalker visible pipes and handholds to cling to would make the threat readable

## Built with

- [three.js](https://threejs.org) on the [Genex](https://genex.games) platform —
  Genex handles sign-in, hosting, publishing and (soon) multiplayer
- [Rapier](https://rapier.rs) physics, via Genex's tuned character controller —
  movement is not hand-rolled
- Characters, textures, music and sound effects are generated through Genex and
  streamed from its storage; nothing large lives in this repo
- Vite + TypeScript

## Running it

```bash
npm install
npm run dev          # then open http://localhost:5173/?genex_local_test=1
```

The `genex_local_test` marker boots a local session without the platform sign-in
gate. It exercises rendering, controls and feel — not identity, saves or
multiplayer, which only exist on the hosted build.

```bash
npx genex preview    # build + push to the private draft
npx genex publish    # list it publicly
```

## The 2D game

QUARRY started as a 2D platformer: a single self-contained 1.8MB `index.html`
running on KAPLAY, with a vector skeleton driving both characters and a
Prince-of-Persia ledge system. It is preserved at the tag `quarry-2d-final` and
still runs — one file, no build:

```bash
git checkout quarry-2d-final -- index.html
python3 -m http.server 8765
```

## License

MIT — see [LICENSE](LICENSE).
