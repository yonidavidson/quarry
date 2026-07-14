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

Multi-floor industrial complex: spikes, patrol drones, sewage pools that slow your wading, ladders, climbable chain-nets, teleport doors, flickering lamps, steam vents, ceiling drips. Grab energy cells, find the glowing **EXIT**.

**Random weapons** spawn on pads — you can hold only one; swapping drops your current where you stand. Human pool: Blaster / Scattergun / Rail Lance. Beast pool: Claws / Bone Scythe / Barb Whip. The hunter arms itself too.

## Online 2P — hunt a real friend

Press **O** on the menu. Host picks a side, gets a code; friend pastes it and sends back an answer code; paste that and you're in the same world hunting each other. Pure P2P over WebRTC (Google STUN, no server, no accounts). First to kill the other — or escape — wins.

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
- All art: inline SVG (hand-authored sprite strips with real run/idle/jump animation)
- All audio: Web Audio synthesis — layered noise + tones through a generated impulse-response reverb; ambient machinery hum
- One self-contained `index.html`. That's the whole game.

## License

MIT — see [LICENSE](LICENSE).
