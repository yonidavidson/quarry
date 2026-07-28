---
name: genex-threejs-game-ui
description: Design the UI HUD interface of a Genex Three.js game — plan the full screen set up front (loader, menu, HUD, pause/win/lose, lobby) under one shared art direction, then build it as an animated DOM overlay. Use for every new game before writing UI code, and whenever the game needs on-screen text, meters, buttons, or menus, or the interface reads as a generic dashboard, covers the action, or shifts as numbers change.
---

# Genex Three.js Game UI

The interface is part of the game, not chrome around it. A strong UI layer tells
the player what to protect, what to chase, and what just happened — and it moves:
screens fade and stagger in, values tween, defeat feels different from victory.
This skill is the UI director for the 2D layer of a vanilla Three.js game: the
plan, the architecture, the states, motion, and readability rules.

## Plan the UI first — before any UI code

Run this gate ONCE, right after the game concept is locked. It takes two
minutes and prevents the two failure modes no later polish can fix: a screen
set discovered piecemeal, and a menu styled in one world while the HUD lives
in another.

**1. Screen inventory — derived from the game type, not discovered later:**

| Screen | When it exists | Default tier |
| --- | --- | --- |
| Loader | always | 1 — branded (see loader spec below) |
| Main menu | always — the decision defaults to YES for every game; a "no" needs a one-line game-type reason (e.g. an instant-restart arcade toy), and "it's only a draft" is never a reason | 2 — cinematic (`$genex-ai-menu`) |
| Pause | always — opens on the Escape key | 1 — menu backdrop under a dark overlay |
| Fail / retry | always | 1 — a *graded* variant of the menu screen |
| Win / next | always | 1 — graded variant, warm |
| Settings | always — every game carries the Quality picker (Auto/Low/Medium/High, `$genex-threejs-adaptive-quality`), and any game with generated audio carries **Music + SFX volume sliders** (persisted, applied live; music default 0.30, sfx ~0.7 — `$genex-ai-music`; a paid track with no volume control is a failure mode), plus whatever else it has to set | 1 |
| Lobby / waiting | multiplayer only | 1 over the menu backdrop |
| HUD | always | 2 — generated sprite HUD (`$genex-ai-hud`), enqueued at this gate for EVERY game; plain CSS is the placeholder until the sprites land, never the final HUD |

The lobby row is bound by `$genex-threejs-multiplayer`'s MANDATORY rule: the
waiting overlay's visibility is re-read from `mm.matchmaking.status` every
frame and closes the instant it flips to `playing` — verified in two browser
windows. Plan the lobby as a styled screen (roster + count over the menu
backdrop), not an afterthought `<div>`. When the menu decision is a reasoned
"no", every "menu backdrop" row above (pause, fail, win, lobby) grades over
the loader's key art instead.

The table lists screens; **elements are inventoried separately**. Walk the
whole loop in your head — loader → menu → spawn → action → pickup → damage →
death → retry → win — and write down EVERY on-screen element the player will
ever see: the reticle and each of its states, aim/interact cues, toasts,
damage numbers, kill feeds, timers, countdowns, pickup popups.

**2. One shared style brief — for the WHOLE game, not just the UI.** Write it
once — 4–5 named hues, materials, one display + one body font, mood — and
store it as a comment block near the UI code. `$genex-ai-menu`,
`$genex-ai-hud`, the loader, and every plain-CSS screen consume THIS brief
verbatim — and so does the scene: the visual-direction plan (the router's
next gate) derives its lighting mood, fog, grading, and post-stack choices
from the same block. Two style briefs in one game is a bug; a scene graded in
one world under a UI styled in another is the same bug. The brief's font pair
is LOADED for real — a Google Fonts `<link>` (or `@font-face`) in
`index.html`, per `$genex-ai-menu`'s genre font table; a display font that
ships as a system-stack fallback (`Arial Black`, `Impact`) is the same bug in
type.

**3. Make ONE concept mockup** — the game concept
and the HUD Stage-1 mockup are the SAME image, generated once (never a
separate UI-free concept first): a single image of a PLAYABLE MOMENT of this
game with its complete HUD composited over it, built with `$genex-ai-hud`'s
Stage-1 prompt template. For genre conventions to borrow, skim
[references/style-capsules.md](references/style-capsules.md). The scene half of the prompt comes from the game
contract in TEXT, not from a prior image: what the player is DOING
mid-action (the verb), what threatens them right now (enemy silhouettes),
what they are chasing (the objective — a finish gate, a goal, a pickup),
and how the space reads (route, scale) — plus the brief's palette,
materials, and light. A beautiful empty vista with nothing to fight and
nowhere to go is a FAILED concept; so is one that invents mechanics the
game doesn't have (a lap counter in a game without laps). Generate it
`--size 2560x1440 --quality high --no-wait`, enqueued FIRST of all art —
ONE image, no candidate variants unless the user asks; its URL goes into
the style-brief comment.

**Describe the concept in words while it renders.** Lay it out in chat —
the playable moment (the verb), what threatens the player, what they chase,
how the space reads, and the brief's palette / materials / light /
references — so the user is weighing a stated direction, not guessing at a
picture.

**The moment the mockup lands, the style chain fires — then the user sees
the frame.** In this order, no waiting between the steps: decide the HUD
lane as art director and record the `HUD lane:` line in DESIGN.md
(`$genex-game-director` §5 owns the criteria), enqueue the style-dependent
chain `--no-wait` — the HUD Stage-2 deconstruct (from the mockup), the menu
still (`--edit`-anchored to it), and the logotype — and THEN show the frame:
pick it up with `genex wait <id> --open` (or generate with `--open`) so it
opens in the user's browser AND prints the link, and paste the URL as a
clickable link — a URL is invisible in a terminal, and "do you like it?"
with no picture in front of the user is the #1 way this checkpoint fails.

**Ask keep-or-change with your question tool — as INFORMATION, never a
gate.** The one that shows clickable options; a short numbered list in chat
only where there is none. ONE question — "this is roughly how the game and
its HUD will look — keep this direction, or change something?" — with
concrete keep / change options. The chain is already running while they
read it: silence means the concept stands; nothing except the menu VIDEO
ever waits for the answer. The user still gets a real say — a "change" at
any time loops the concept with their notes at image prices (below). The
menu video (the one expensive item) fires at the FIRST of: the user's yes ·
the next `genex preview` after the menu still landed · style work being the
only work left — and never while a user objection is open
(`$genex-ai-menu` owns the trigger). (The core asset set — hero model,
ground texture, skybox, sfx — is prompted from the game IDEA, not the
image, and mostly survives a style change: launch it up front with
placeholders. Everything style-independent — scaffold, boot wiring, the
core loop, the gameplay-LOGIC subagent modules — keeps moving at full speed
in parallel throughout.)

**Change reopens the loop, same shape.** If the user picks "change" — or
comes back with notes immediately or an hour later — re-run Stage 1 (the
concept mockup itself) with their exact notes, open + link the new frame,
ask again the same structured way, and re-run the cheap chain from the new
frame (image-priced — that is the design: the correction lane is cheap
because the expensive item waited). Carry every note forward so each round
compounds; if two rounds don't converge, offer 2–3 distinct directions
(that's the one moment `--candidates` earns its place) instead of
re-rolling blind. Each standing frame is the working style. When the style
changes after downstream art already ran, re-anchor it: the menu still is
re-edited (`--edit`) against the new mockup and its video re-run once from
the new still (`$genex-ai-menu` — a user-driven style change re-opens its
one-video rule), and the HUD deconstruct (Stage 2 onward, `$genex-ai-hud`)
restarts from the new mockup. Style-neutral assets (most textures, sfx,
models) usually survive — judge each in one line. The same "open it + paste
the link" rule covers every image the user weighs in on — the menu still,
the HUD mockup.

**The concept anchors STYLE, not truth.** Palette, materials, light, and
register come from the frame; CONTENT comes from the game contract. This
matters MORE now that the concept carries a HUD: every widget in the mockup
is a PROPOSAL, and a widget with no backing mechanic is cut before Stage 2 —
mechanics come from the agreed game, never from the picture. Extra widgets
the image invented are recorded in the plan message as "deferred from
mockup" — never silently wired, never silently dropped. When
the frame lands, diff it against the contract in one visible line — what
does this game have that the frame doesn't show (enemies? arenas? the
finish? the pickup)? Carry those requirements in words into every later
prompt. Where the frame contradicts gameplay, gameplay wins — never inherit
an invented mechanic, or the absence of a real one, from a picture.

**4. Ask only when genuinely ambiguous.** If the concept pins the mood (a
"gothic horror dungeon crawler" pins it), decide and state the plan in one
line. Only when the art direction is truly open, ask ONE question
with 2–3 concrete directions, each naming its palette + font pair — using
your question tool when you have one; if you have none, a short numbered
list in chat. Never ask about the screen
inventory — it derives from the game type.

**5. Style follows THIS game's concept.** The examples in every Genex skill
are examples, not defaults. Do not default to neon/cyberpunk/synthwave — or
any other single register — unless the concept calls for it.

**6. Close the gate out loud — a fixed-format plan message.** Post this
message in chat, translated to the user's language, filling every line —
this exact structure, not a paraphrase (the scaffold's keep-it-short talk
rule explicitly does not apply to this one message):

```
UI plan
• Screens: <list with tiers — loader / menu / pause (Esc) / win/lose / …>
• Style: <4–5 named hues> · fonts <display> / <body> (from $genex-ai-menu's
  genre table, or a one-line reason)
• References: <2–3 AAA games — one line on what's borrowed>
• Menu: <archetype + button treatment, one-line reason from the brief>
• HUD lane: <sprites (…) | CSS (…, one-line justification)> — recorded in DESIGN.md
• Concept (HUD mockup): <generation id> — shown for keep / change
  (informational — the chain below is already queued; silence = it stands)
• Queued on concept landing: HUD sheet (Stage 2) · menu still · logotype
  <or "skipped: reason">; menu VIDEO waits for: your yes / the next preview
  after the still lands / style work being all that's left <or "no menu: reason">
• Building now (style-independent): <core loop · logic modules already moving>
• Deferred from mockup: <widgets the image invented but the game lacks — or "none">
```

A message missing any line means the gate did not run — go back and run it.

## The tier ladder

- **Tier 1 — instant baseline, every game.** Everything in this skill: planned
  screens, shared brief, branded loader, animated CSS menu with keyboard
  navigation, phase transitions, UI sounds, vignette. Zero generations — the
  game is playable immediately.
- **Tier 2 — the production UI, generated, async — mandatory, not an upsell.**
  The sprite HUD (`$genex-ai-hud`) for EVERY game, the cinematic menu
  video (`$genex-ai-menu`) whenever the menu decision is yes (the default for
  every game), and the generated **logotype** — one `--transparent` wordmark
  in the brief's display register (`$genex-ai-menu`'s logotype step), default
  YES for every game with a menu; skipping it needs a one-line stated reason.
  Enqueue this chain the instant the concept mockup LANDS (`--no-wait`) —
  the keep/change answer never gates it; only the menu VIDEO waits, for its
  event triple (`$genex-ai-menu`) — then
  keep building, pick results up with `npx genex wait <id>`, swap them in as
  they land. **Tier 2 must never block a playable v0 — but the game is NOT
  DONE until its Tier-2 assets have landed and been wired in** (the only
  exit: the user explicitly declines them — on their own initiative; never
  solicit the decline by presenting these as optional, slow, or costly).
  Run `npx genex wait` on every enqueued ID before any publish and before
  the final handoff of a session — never park landed assets for "later".
  Shipping the placeholder CSS HUD as the final HUD is a failure, not a
  tier choice — the ONE exception is a DESIGN.md-recorded `HUD lane: CSS`
  decision (`$genex-game-director` §5), where the CSS build, finished to
  its brief, IS the production HUD.
- **Tier 3 — offer, don't build.** Video layers over the HUD, 9-slice panel
  sprites, animated menu sprites. Offer in one line
  after the player has seen Tier 1+2 working; build on request.

## Architecture: DOM overlay by default

Genex games are plain Vite + Three.js apps, so the default UI layer is a DOM
overlay — HTML/CSS on top of the canvas, not text sprites inside the scene:

```html
<div id="ui">          <!-- fixed, full-screen, pointer-events: none -->
  <div id="hud">…</div>
  <!-- data-phase must exactly match a phase name in setPhase() below — that's how
       screens toggle. A phase with no screen (e.g. "playing") just hides them all. -->
  <div id="screen-loading" class="screen" data-phase="loading">…</div>
  <div id="screen-pause" class="screen" data-phase="paused" hidden>…</div>
  <div id="screen-over"  class="screen" data-phase="over" hidden>…</div>
</div>
```

```css
#ui { position: fixed; inset: 0; pointer-events: none; font-variant-numeric: tabular-nums; }
#ui button, #ui .screen { pointer-events: auto; }
```

`pointer-events: none` on the root keeps the canvas playable; re-enable it only
on elements that are actually clickable. Keep ALL layout in CSS — never
position UI by mutating inline pixel styles per frame. In-world (diegetic) UI —
a health bar floating over an enemy, a scoreboard mesh in a stadium — is the
exception for things that belong to the world, not the default.

## The states every game needs

Build these as show/hide layers over one state machine, not as ad-hoc DOM
edits scattered through the code:

1. **Loading** — the branded loader below; players must never stare at a black
   screen or a bare percentage.
2. **Playing HUD** — the minimal always-on layer (see hierarchy below).
3. **Pause** — freeze the loop, dim the scene, show resume/restart. Bound to
   the **Escape key in every game** — Escape pauses, Escape again (or Resume)
   unpauses; on touch, a small pause button. (With the bundled physics pack,
   freezing is built in: `physics.paused = true` plus `anims.setPaused(true)`
   — don't hand-roll a second clock.)
4. **Fail / retry** — what happened, the score, and a ONE-KEY instant restart
   (show which key). Restart must not reload the page.
5. **Win / next** — celebrate, then offer the next thing to do.
6. **Identity moments** — the player's name/guest identity comes from
   `$genex-threejs-embed-auth` (`waitForPlayer()`); leaderboards render from
   `getLeaderboard()`. Never invent your own login UI.
7. **Multiplayer lobby/points** — matchmaking status, countdowns, and match
   HUD state come from `$genex-threejs-multiplayer`; render what the SDK
   reports, don't guess at it.

## Escape must pause the game — not shrink the window

For a game that captures the mouse (first-person or pointer-lock aim — see the
pointer bucket in `$genex-threejs-camera-direction`), pressing Escape does two
**browser-reserved** things you CANNOT stop with `preventDefault`: it exits
fullscreen and releases pointer lock, and the player sees the window "shrink".
The real fix is the **Keyboard Lock API**, which routes Escape to your code
instead — Chromium only, and only in fullscreen. Enter fullscreen on a gesture
(the Deploy/Resume click), capture Escape, and own the pause:

```ts
// call ONLY from a user gesture (the Deploy click, the Resume click) — never at boot
async function enterImmersive(): Promise<void> {
  try {
    if (!document.fullscreenElement)
      await document.documentElement.requestFullscreen({ navigationUI: "hide" });
  } catch { /* sandboxed iframe or no gesture — the pointer-lock path below still pauses */ }
  // Chromium + fullscreen only: deliver Escape to us instead of exiting fullscreen.
  try {
    await (navigator as unknown as { keyboard?: { lock?: (k: string[]) => Promise<void> } })
      .keyboard?.lock?.(["Escape"]);
  } catch { /* Keyboard Lock unsupported — fine */ }
}

document.addEventListener("keydown", (e) => {
  if (e.code !== "Escape") return;
  e.preventDefault();                 // stops any *other* default; the reserved ones the lock handles
  if (phase === "playing") { document.exitPointerLock?.(); setPhase("paused"); } // free cursor for the menu
  else if (phase === "paused") { void enterImmersive(); canvas.requestPointerLock?.(); } // Esc resumes
});
```

- **On the bundled `FollowCamera`, it owns the lock — don't fight it.** Do NOT
  call `document.exitPointerLock()` / `canvas.requestPointerLock()` yourself; that
  desyncs its aim state (the cue flips wrong). Instead pause/resume through it —
  and bind it **on phase transitions, never per frame**: put
  `followCam?.setPaused(phase !== "playing")` inside `setPhase()` (below) and it
  covers everything at once — the BOOT menu parks aim, Escape's
  `setPhase("paused")` frees the cursor, and the Play/Resume click's
  `setPhase("playing")` re-locks inside the gesture. Read `onAimChange` for the
  cue. The raw calls above are only for a hand-rolled camera with no bundled
  controller.
- **Degradation is built in.** Where Keyboard Lock is absent (Safari, Firefox) or
  the game isn't fullscreen, the browser still releases pointer lock on Escape —
  so ALSO keep the pointer-lock-loss → pause path (`pointerlockchange`: if
  unlocked while `playing`, `setPhase("paused")`). Escape then always pauses; it
  only *also* drops fullscreen on browsers without the lock — unavoidable there.
- **Skip Keyboard Lock + fullscreen only when the cursor stays a tool.**
  Cursor-core / top-down / menu-driven games never capture the pointer — skip
  `enterImmersive` and Keyboard Lock entirely. But ANY game that locks the
  pointer during play — aim games AND keyboard-only racers/platformers/runners
  under the lock-or-tool rule (next section) — keeps the Escape → pause path and
  the `pointerlockchange` fallback (if unlocked while `playing`, pause): without
  it, Esc frees the cursor while the game keeps running. Keyboard-only games may
  still skip Keyboard Lock + fullscreen; the lock + pause/resume path is the
  non-negotiable part.
- **Dashboard embed:** no setup needed — the platform's game frame grants keyboard
  lock (and pointer lock + fullscreen), so Escape-to-pause works the same inside
  `/world/` + `/draft/` as it does standalone (`<slug>.genex.technology`).

A mouse-aim game earns its keep with a **look-sensitivity slider** in the pause
menu — trackpads feel slower than mice, so let the player tune it. On the bundled
camera the setter is live: `slider.oninput = () => { followCam.aimSensitivity = +slider.value; };`
(radians per pixel; default `0.0023`, a usable range is ~`0.0008`–`0.005`).

## The cursor during play: locked or a tool

During play the OS cursor is either the gameplay tool (cursor-core: click-to-move,
tower defense, builders, card/board — it stays visible, that's correct) or it is
**locked away — including keyboard-only games** (racer, platformer, runner): an
arrow parked over the action for the whole session is a shipped defect. Games on
the bundled `FollowCamera` get the lock free (on by default). A hand-rolled game
locks with ~6 lines, reusing this section's Escape flow:

```ts
// Once at setup (NOT inside the click handler — a fresh listener on every
// Resume stacks and multi-fires setPhase on a single unlock):
document.addEventListener("pointerlockchange", () => {
  if (!document.pointerLockElement && phase === "playing") setPhase("paused");
});
// In the Play/Start/Resume CLICK handler (lock needs a user gesture):
canvas.requestPointerLock?.();          // hides the cursor, focuses the game
// Required (not optional): without Keyboard Lock, the browser consumes Esc to
// exit pointer lock and the keydown never reaches the page — the listener
// above is what pauses. The Resume click re-locks. Keyboard games need nothing
// more — no reticle, no aim code; the lock just parks the cursor.
```

If the lock is genuinely unavailable (a third-party embed without
`allow="pointer-lock"`), fall back to hiding the idle cursor over the canvas:
`canvas.style.cursor = "none"` after ~2s without `pointermove`, restored
instantly on move. Menus and pause screens always keep their cursor.

## The loader

The loader is the first thing every player sees — a bare "Loading… 3/5" over
black reads as a broken page. The branded version costs nothing:

- **Background:** the menu's still frame — when the game has a cinematic menu,
  that image exists BEFORE the video does; show it dimmed
  (`filter: brightness(0.6)`) behind the progress. Menu-less game: one
  `npx genex image` key-art call in the house style, enqueued first thing.
  Until the image arrives, the flat darkest hue from the style brief — a
  placeholder with the same status as the placeholder CSS HUD: a loader
  still without its key-art/menu-frame background at publish or session
  handoff is the same failure.
- **Progress:** a thin bar styled from the brief (its accent hue), driven by
  real asset counts — never an indeterminate spinner alone.
- **Reveal:** when ready, fade the loader out (400–600 ms) into the menu or
  game. No hard cut.

## Motion — screens move or the game feels dead

Phase changes animate. `hidden` alone hard-cuts; pair it with a class so
opacity can transition:

```ts
function setPhase(phase: "loading" | "playing" | "paused" | "over" | "won") {
  for (const s of document.querySelectorAll<HTMLElement>("#ui .screen")) {
    const on = s.dataset.phase === phase;
    s.classList.toggle("is-on", on);
    if (on) s.hidden = false;                       // show immediately, then fade in
    else setTimeout(() => { if (!s.classList.contains("is-on")) s.hidden = true; }, 300);
  }
  // The camera's lock lifecycle rides the SAME transition — never the render loop
  // (optional-chained: the camera may not exist yet at the first "loading" call).
  followCam?.setPaused(phase !== "playing");
  // (Vehicle games combine conditions instead:
  //  followCam.setPaused(phase !== "playing" || activeId !== CHARACTER_ID).)
}
```

```css
#ui .screen { opacity: 0; transition: opacity 280ms ease; }
#ui .screen.is-on { opacity: 1; }

/* Entrance choreography: title first, buttons staggered, corner text last.
   Stamp --i per element: <button class="stagger" style="--i: 1"> … */
.screen .stagger { opacity: 0; transform: translateY(12px);
                   transition: opacity 320ms ease, transform 320ms ease;
                   transition-delay: calc(var(--i, 0) * 70ms); }
.screen.is-on .stagger { opacity: 1; transform: none; }
```

- **Defeat and victory are grades, not new screens.** Same backdrop, different
  emotion via CSS `filter` on the background — defeat
  `saturate(0.25) brightness(0.55)` with a ~600 ms beat before buttons stagger
  in; victory `saturate(1.15) brightness(1.05)` with the score counting up
  (tween the displayed number over ~800 ms; never snap it).
- **Buttons react**: a hover/focus state (scale, glow, or an indicator chevron)
  plus a pressed state. Menus are keyboard-first — ↑/↓ moves focus, Enter
  activates, and the hovered/focused item is visibly selected.
- **A menu action must release focus before gameplay begins.** A clicked
  `<button>` keeps browser focus, so a later gameplay Space/Enter can natively
  activate that same button again and repeat Play, Cancel, Leave, or Requeue.
  Blur inside every action handler before running the action:

  ```ts
  function wireButton(button: HTMLButtonElement, act: () => void) {
    button.addEventListener("click", () => {
      button.blur();
      act();
    });
  }
  ```

  Scope ↑/↓/Enter menu navigation to menu/lobby phases only. When a phase
  transition leaves a menu, also blur any focused button as a backstop:
  `if (document.activeElement instanceof HTMLButtonElement) document.activeElement.blur();`
- **Values tween.** Score, coins, timers tick to their new value; health bars
  slide. A number that teleports reads as a bug even when it's correct.

## Sound — a silent UI is a bug

Hover tick, confirm click, and a fail/win stinger are three
`npx genex sfx` calls (`$genex-ai-sfx`); a cinematic menu also wants a quiet
ambient loop, because its video is necessarily muted. Wire hover sounds to
`mouseenter`/`focus` (throttled), keep them short and quiet.

## Hierarchy: if everything shouts, nothing reads

Order the HUD by what the player loses the game for ignoring:

1. **Survival/status** — health, time, fuel: biggest, most stable, edge/corner.
2. **Objective** — score, laps, wave: prominent but calmer.
3. **Moment feedback** — "+100" popups, damage flashes: transient, near the
   action, gone in under a second.
4. **Flavor** — combo names, taunts: smallest, skippable.

## Readability rules

- **Never cover the player or incoming threats.** Corners and edges belong to
  UI; the center of the screen belongs to the game.
- **Stable layout.** A score ticking 9 → 10 → 100 must not reflow anything:
  tabular numerals (`font-variant-numeric: tabular-nums`), fixed-width slots,
  meters that change fill — not size.
- **Contrast against the real scene.** Test text over the brightest AND
  darkest areas of actual gameplay; a soft dark plate or text-shadow beats
  restyling per level.
- **Panel and button corners come from `border-radius` or a generated frame
  sprite — never a raw `clip-path`/`mask` chamfer.** A CSS-cut angular corner
  is the recurring "cut corners" defect: the clip shears off borders, shadows,
  and any content that sits near the corner, and it re-breaks the instant the
  padding, font, or value length changes — so it can only be held together by
  a per-build visual check that is easy to skip. It is not worth that fragility.
  For a soft corner use `border-radius` (it keeps its `border`/`box-shadow`
  natively). For a genuinely angular or ornamented "hi-tech" frame, generate it
  as chrome (`$genex-ai-hud`, or a Tier-3 9-slice panel) and lay the DOM over
  it — that reads richer and physically cannot shear. `mask`/`clip-path` stay
  reserved for their ONE established HUD use: the masked-fill progress reveal
  driven by `genex ui` masks. Never for corner shaping.
- **One cohesion layer.** A single full-screen vignette div (a subtle radial
  gradient darkening the corners, optionally faint grain) over canvas + UI is
  the cheapest way to make DOM-over-WebGL read as one composed image instead
  of a web page floating over a game. Keep it `pointer-events: none`. If you add
  grain here, it's a **static** fine-noise tile (a small data-URI at 1:1, not a
  stretched image); grain that belongs to the rendered LOOK goes in the WebGL
  grade instead — see `$genex-threejs-exposure-color-grading` for why per-frame
  `vUv` grain shimmers.
- **Desktop first.** Verify at desktop sizes and survive window resizes
  without clipping; don't design phone layouts or test mobile viewports unless
  the user asks. Two exceptions ship by default precisely BECAUSE you don't
  test on phones: touch *input* when a recipe fits — a bundled controller's
  built-in touch controls, or the touch kit + recipes in
  `$genex-threejs-touch-controls` — behind `navigator.maxTouchPoints > 0`,
  invisible on desktop (skipping needs a one-line reason, not silence); and
  the adaptive-quality tier at boot (`$genex-threejs-adaptive-quality`), which
  keeps the shared link from being a dead OR crashing link on a phone.

## Wire UI to game state, never the reverse

The game state machine is the single source of truth; the UI renders it.
Don't keep a second copy of rules in the UI layer (a timer in the HUD and a
timer in the game WILL drift apart). Buttons and menu keys emit the same
intents the gameplay input path uses — a "Restart" button and the R key must
run identical code.

The generated layer is the default, not a reward: every game's HUD is built
from a generated sprite set (`$genex-ai-hud`), and a cinematic menu (looping
video backdrop behind the buttons, `$genex-ai-menu`) backs every game whose
menu decision is yes. Both slot into this exact `#ui` + `data-phase`
architecture and consume the shared style brief.

## Failure modes to catch before the player does

- No UI plan: screens invented one at a time, menu and HUD styled in two
  different worlds.
- A separate UI-free concept frame generated before the HUD mockup — the
  concept IS the Stage-1 mockup, one generation; a second scene image for
  "the concept" is a wasted spend and a style-drift risk.
- The concept/mockup fed to `genex video --frame` — it has a HUD baked in;
  the UI-free menu still is the ONLY valid frame input (`$genex-ai-menu`).
- HUD sprites never enqueued at the gate — the placeholder CSS shipped as the
  final HUD.
- No pause screen, or a pause that isn't bound to Escape.
- The OS arrow parked over the action for the whole session in a keyboard-driven
  game (the cursor is either a gameplay tool or locked away — see the cursor
  section).
- A style brief whose fonts were never actually loaded (a system-stack display
  font at runtime).
- A micro-element (reticle, cue, toast, damage number) left as default CSS
  while the panels got the art treatment.
- A generic stat dashboard (rows of labels + numbers) instead of a designed
  HUD — pick the 2–3 numbers that matter and style them by hierarchy.
- Hard-cut phase swaps, a menu whose elements just appear, numbers that
  teleport.
- A silent menu; a bare "Loading…" over black.
- The style chain parked behind the keep/change question — the HUD Stage-2
  sheet, menu still, and logotype enqueue the moment the mockup LANDS, and
  silence means the concept stands; OR the menu VIDEO fired while a user
  objection was still open (its event triple is the only wait in the lane);
  OR the whole build stalled on the concept at all, when concept-INDEPENDENT
  work (scaffold, core loop, logic subagents) must keep moving in parallel
  throughout.
- A CSS-cut corner (`clip-path`/`mask`) that shears its own content — clipped
  text or padding, a lost focus ring or glow, a jagged aliased edge, or a
  border/frame that stops at the cut instead of following it — the
  technique is fine; the sloppy cut is the defect.
- A plate shaped by `npx genex ui plate` (the frame's traced silhouette as
  the plate's `mask-image`) is the fix for shaped backing — see
  `$genex-ai-hud`'s silhouette-plate rule; a bare rounded rectangle behind
  generated art is the defect below.
- A rectangular semi-transparent plate protruding past an opaque/angular
  widget frame — a dark box floating over the scene. The frame's own art is
  the backing; a plate is only for bare-text/outline widgets and stays inside
  the widget silhouette (`$genex-ai-hud`'s plate rule).
- UI panels covering the player or the thing about to kill them.
- Layout shifting as numbers grow.
- A fail state with no visible restart key, or a restart that reloads the page.
- Buttons that render but don't emit the game's real input intents.
- A clicked menu button remains focused after entering gameplay, so Space/Enter
  natively activates it again; or menu keyboard navigation still runs outside
  the menu/lobby phase.
- UI logic duplicating game rules and drifting out of sync.
- A waiting/lobby overlay that can miss its dismissal — see the multiplayer
  skill's status-driven rule.

Before calling UI done, check it over real gameplay footage at desktop size —
`$genex-threejs-visual-validation` has the capture discipline.
