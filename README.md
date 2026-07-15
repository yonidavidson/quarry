# QUARRY

A browser hunt-or-be-hunted platformer inspired by the asymmetric design of the 1996 classic *Hunter Hunted* — original theme, art, and code.

**[▶ Play it now](https://yonidavidson.github.io/quarry/)** — one HTML file, no install. Works with keyboard or a plugged-in gamepad (Switch Pro Controller included).

## Pick a side

| | 🔵 **JACK — Human** | 🔴 **The STALKER — Beast** |
|---|---|---|
| **Edge** | Blaster + throwable bombs | Claw lunge up close |
| **Mobility** | Standard jump | **Faster than you** • double jump • wall-climb |
| **Toughness** | Fragile (3 HP) | Tough (4 HP) |

Whichever side you pick, **the other side hunts you** across the complex — an AI nemesis that patrols, spots you, chases across floors, and attacks. When the heartbeat starts, run.

## The world wants you dead too

Multi-floor industrial complex: spikes, patrol drones, sewage pools that slow your wading, ladders, climbable chain-nets, teleport doors, flickering lamps, steam vents, ceiling drips. The roofline opens onto a **dusk vista of mountains and a sunset lake** where crows wheel overhead (land hard and they scatter); steel-framed windows glimpse the outside from the upper floors, and each depth has its own light — cool daylight up top, green industry mid, rust-warm depths. Grab energy cells, find the glowing **EXIT** on the roof.

**Random weapons** spawn on pads — you can hold only one; swapping drops your current where you stand. Human pool: Blaster / Scattergun / Rail Lance / Shotgun / Machine Gun. Beast pool: Claws / Bone Scythe / Barb Whip / Bone Bat. Every weapon has its own attack visuals and sound. The hunter arms itself too.

## Online 2P — hunt a real friend

Press **O** on the menu. A 3-step wizard walks you through it: pick your name and side, send the invite code, paste the answer back. In-game: floating name tags, **T to chat**, live link/ping indicator. (Two windows on one machine? Keep both visible — a hidden tab pauses its game.) Pure P2P over WebRTC — works across separate networks: Google STUN for most home connections, with a free TURN relay fallback for strict NATs (no server of ours, no accounts). First to kill the other — or escape — wins. The link survives game over: hit ENTER on the results screen to offer a **rematch** on the same connection — no new codes — with a running series score across games.

## Controls

| Action | Keyboard | Gamepad |
|--------|----------|---------|
| Move / climb | ←→↑↓ / WASD | stick / d-pad |
| Jump | Space | A |
| Attack | J / X | B / X |
| Bomb (Jack) | K / C | Y |
| Door | E | d-pad up |
| Pause / Mute / Restart | Esc / N / R | — |

Wall-climb (Beast): hold into a wall + Up. Coyote time, jump buffering, and variable jump height are all in — the controls are forgiving on purpose.

## Live ticker — see who's hunting, worldwide

The bottom bar shows live events from **every player everywhere** — who entered the hunt, hunter takedowns, escapes with energy counts. It works out of the box via a free keyless pub/sub channel (ntfy.sh); events are anonymous codenames only (`Hunter-551 escaped as JACK with 21 energy`). Prefer your own private backend? Fill the `LIVE` config in `index.html` with a free Supabase project — setup SQL is in the comment right above it.

## Built with

- [KAPLAY](https://kaplayjs.com) (successor to Kaboom.js) from CDN
- World art: inline SVG (hand-authored, baked to bitmap at load). Character art: pixel-art sprite strips generated with [PixelLab](https://pixellab.ai) — an 80s action-hero commando and a Predator-style beast — embedded as base64 PNG
- All audio: Web Audio synthesis — layered noise + tones through a generated impulse-response reverb; ambient machinery hum
- One self-contained `index.html`. That's the whole game.

## License

MIT — see [LICENSE](LICENSE).
