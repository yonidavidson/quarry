---
name: quarry-playtest
description: Drive the 3D QUARRY game in a real browser to verify a change — the dev server in local test mode, Playwright for anything timed or scripted, screenshotting real gameplay, reading page and console errors, and the HUD readouts that expose game state. Use this whenever asked to play, test, try, screenshot, reproduce a bug in, or confirm a change works, and before reporting any change as done.
---

# Playtesting QUARRY

```bash
npm run dev
# then open http://localhost:5173/?genex_local_test=1
```

## The marker is not optional

`?genex_local_test=1` boots a credential-less local session. **Without it an
unpublished draft shows the platform's sign-in gate to your browser**, and a
screenshot of that gate is not a screenshot of the game.

It validates rendering, camera, controls, HUD and feel. It does **not** validate
identity, saves, leaderboards or multiplayer — no relay credential is minted, so
`connect()` failing there is expected, not a bug. Say so when you report:
"validated in local test mode — auth, saves and multiplayer not exercised."

The marker only works on http loopback, outside an iframe. It is inert on the
hosted draft, and the hosted draft stays owner-only. Never work around that gate.

## Playwright, not a hand-driven browser

The game needs held keys and real frames, so script it:

```js
const b = await chromium.launch({ channel: 'chrome',
  args: ['--no-sandbox', '--use-gl=angle', '--enable-unsafe-swiftshader'] });
const pg = await (await b.newContext({ viewport: { width: 1280, height: 760 } })).newPage();
pg.on('pageerror', e => errs.push(e.message));
pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await pg.goto('http://localhost:5173/?genex_local_test=1');
await pg.waitForTimeout(9000);          // physics WASM + character + textures
await pg.keyboard.down('KeyW'); await pg.waitForTimeout(1500); await pg.keyboard.up('KeyW');
```

- **Wait ~9s before the first screenshot.** Rapier's WASM, the rigged characters
  and the streamed textures all load asynchronously; a shot at 2s is a shot of an
  empty scene and reads as a black-screen bug that isn't there.
- **Hold keys, don't press them.** Movement reads key state per frame.
- **Pointer lock cannot be acquired headlessly.** Mouse-look and firing (which
  requires `document.pointerLockElement`) can't be exercised — verify the "click
  to aim" cue and the wiring, not the lock.

## Read the game's state off the HUD

There are no debug globals. The HUD is the introspection surface, and it is
enough to assert the whole loop:

```js
await pg.evaluate(() => ({
  danger: document.querySelector('#hud .danger')?.textContent,  // no contact | contact | close | above you
  cells:  document.querySelector('#hud .cells')?.textContent,
  hp:     document.querySelectorAll('#hud .pip.on').length,
  end:    document.querySelector('#hud .end h1')?.textContent,  // extracted | hunted down
}));
```

`danger` is the Stalker's state made visible: **"above you"** means it reached
the ceiling. Sampling it every ~700ms over ~20s captures a full hunt cycle —
prowl → wall → climb → ceiling → pounce — and the health pips falling to zero
plus `end` reading "hunted down" proves the loop closes.

## What a pass looks like

- Zero page errors and zero console errors
- A screenshot of **real gameplay** — the character visible, the HUD readable
- The controls respond the right way: `D`/`→` moves screen-RIGHT
- For a hunt change: the danger read reaches "above you" and health actually drops

Don't write unit tests or test suites for the game unless asked, and don't
re-test after cosmetic tweaks — push those and let the player feel them.

## Before reporting done

`npx genex preview`, then hand over the **page** link
(`https://genex.games/draft/<slug>`) — never the bare `*.genex.technology`
origin, never localhost. The player running around the hosted draft is the QA
local test mode cannot do.
