---
name: quarry-playtest
description: Drive the QUARRY game in a real browser to verify a change — cmux browser or Playwright, skipping boot with go('game','human'), screenshotting, reading console/page errors, and the debug globals for giving weapons, firing attacks, and inspecting level geometry. Use this whenever asked to play, test, try, screenshot, reproduce a bug in, or confirm a change works in the game, and before reporting any index.html change as done.
---

# Playtesting QUARRY

Serve first (`python3 -m http.server 8765` from the repo root), then drive the page.

## cmux browser (preferred)

```bash
cmux --json browser open http://localhost:8765/
# note the surface_ref it prints, e.g. surface:68
cmux browser surface:68 wait --load-state complete --timeout-ms 15000
cmux browser surface:68 screenshot --out /tmp/quarry.png
cmux browser surface:68 errors list
cmux browser surface:68 console list
```

Skip boot and splash — jump straight into a side:

```bash
cmux browser surface:68 eval --script "go('game','human')"   # or 'stalker'
```

Re-screenshot after each action. Reading a screenshot is the only way to catch
visual regressions — pose, hitbox, and parallax bugs never show up in the console.

### Keep the surface visible, or nothing runs

The game pauses itself when `document.hidden` is true, so a cmux surface that
loses focus — you opened a second tab, split, or window — stops ticking
entirely. The symptom is confusing: `get('*').length` reads 0 and
`debug.fps()` reads 0, which looks exactly like a crashed scene. Check
`document.hidden` before believing it, and `cmux close-surface` / `cmux
focus-pane --pane <n>` to bring the game back to the front.

Worse, a surface left hidden long enough is *discarded*, not just paused: the
next `eval` wakes it into a fresh navigation, so you get `ReferenceError: Can't
find variable: go` and `performance.now()` back near zero. Read that as "the
harness reloaded the tab", not "my change broke the page" — the giveaway is a
`performance.now()` under a second on a page you loaded minutes ago.

Because focus keeps moving back to the terminal between commands, cmux is good
for *looking* at the game and bad for *measuring* it. Anything timed — frame
rate, acceleration, anything sampled across several commands — belongs in
Playwright, which holds its own window.

### Movement needs held keys, not taps

`press` is a tap — down and up inside one frame. The game reads movement from
key *state* each update, so taps produce zero horizontal movement while
edge-triggered actions (jump, attack) still fire. To actually walk:

```bash
cmux browser surface:16 keydown --key ArrowRight
# … let a few frames pass, then check pos …
cmux browser surface:16 keyup --key ArrowRight
```

Verify with `get('player')[0].pos.x` before and after — if x didn't move, the
key wasn't held long enough.

### Scene switches land a frame later

`go(...)` and `get(...)` in the same `eval` will report an empty scene, because
KAPLAY applies the switch on the next frame. Split them into two calls;
otherwise you'll chase a "crash" that never happened.

## Playwright

```js
// channel: 'chrome', args: --no-sandbox, --autoplay-policy=no-user-gesture-required
await page.goto('http://localhost:8765/');
await page.evaluate(() => go('game', 'human'));
```

Boot eats the first keypress (it's an audio-unlock gate) and the splash
auto-advances after ~3.4s. Prefer `go(...)` over clicking through both.

## Assert the scene survived

After **every** action:

```js
get('player').length === 1
```

KAPLAY swallows runtime errors into its own blue error screen, so page-error
listeners and `errors list` come back clean while the game is actually dead. A
missing player entity is the reliable signal that something threw.

## Debug globals

The page is a non-module script with `global: true`, so everything is reachable
from `eval` / `page.evaluate`:

| API | Purpose |
|-----|---------|
| `go('game','human'\|'stalker')` | enter gameplay, skip boot |
| `get('player')` | player entities — always assert `.length === 1` |
| `GRID`, `LADDERS`, `WELLS`, `CHASMS` | level geometry |
| `NET`, `SND` | networking / sound |
| `__quarry.give(w)` | give weapon by name/id |
| `__quarry.attack()` | fire attack |
| `__quarry.weapon()` | current weapon |
| `__quarry.ceil()` / `__quarry.lad()` | ceiling / ladder helpers |
| `netHost` / `netJoin` / `netHostAccept` | WebRTC online (window globals) |
| `__quarry.vx()` / `__quarry.grip()` | carried horizontal speed / which hold has the body |
| `get('*').length`, `debug.fps()` | perf — object count is the ceiling, ~2500 is OK |

The current animation is `player.curAnim()`, **not** `player.anim` — the latter is
`undefined`, so a check like `p.anim === "cling"` silently reads false forever and
every assertion built on it passes or fails for the wrong reason.

Prefer these introspection hooks over inferring state from `pos`. A position delta
can't tell momentum from a collision, and on a level full of walls that difference
is most of what you're trying to measure.

## Reporting what you find

Open playtest bugs as GitHub issues on `yonidavidson/quarry` with a repro and
the expected behavior, then hand them out on the bus — see **quarry-agentcomm**.
Attach screenshot paths or URLs so an agent with vision can review the image.
