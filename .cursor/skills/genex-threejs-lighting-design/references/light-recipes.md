# Light Recipes

Contents: rig baselines by environment, the practical couple, shafts and
visible air, light as information, budgets and lifecycle, the kill-switch
diagnostic.

Numbers below are relationships, not mandates — validate them against the
project's renderer baseline (`$genex-threejs-exposure-color-grading`), because
tone mapping and exposure change what every intensity means.

## Rig baselines by environment

- **Outdoor day** — a warm sun `DirectionalLight` key plus cool sky fill
  (`HemisphereLight`, or the skybox IBL when one is set). Fill sits well below
  the key: when fill approaches key strength, shadow shapes die and the scene
  flattens. The sun owns shadows: size the shadow camera's ortho bounds to the
  playfield edges, fix acne at contact points with `bias`/`normalBias`, and
  bump `mapSize` before loosening the frustum. A roaming world (racer, open
  map) outgrows one frustum — that cascade question is
  `$genex-threejs-shadow-systems`.
- **Outdoor night** — the moon is a dim, cool, hard key, not a gray day.
  Practicals carry visibility; the moon's job is silhouette and geography.
  Push the fiction's emitters up the ladder before brightening the moon. No
  moon (a city street)? The settlement's own skyglow is the fill — a dim,
  warm-tinted hemisphere — and the emitters carry the rest.
- **Interior** — the openings and fixtures ARE the rig: a window is a
  `SpotLight` aimed the way the sun outside would aim (or a shaft, below);
  fixtures are coupled practicals. IBL still fills, well below the windows.
  When the hard sun-rectangle on the floor IS the shot (a big window, a long
  room), swap the spot for a shadow-casting `DirectionalLight` through the
  opening — parallel light keeps the patch's edges straight where a spot's
  cone diverges.
- **Cave / underground** — no sky, no free fill. The brightest practical or
  the crack shaft is the key; darkness is part of the palette, and the
  player's own torch is a gameplay object. Ration the black, don't erase it.
- **Space** — one hard star key, black fill, bounce only from IBL or
  planetshine. The harsh terminator IS the look; softening it reads as a
  studio shoot.

## The practical couple

- Contain the light: set `distance` so the falloff dies inside the space the
  source serves, and keep `decay` at the physical `2`. An uncontained point
  light climbs walls three rooms away, and the scene creeps toward flat.
- Position the light inside the emitter, slightly above the visible flame or
  tube — the pool it throws must sit centered under the thing that explains it.
- An area emitter — neon tube, screen, softbox — is by default a tinted
  `PointLight` or `SpotLight` sunk into it. Reach for `RectAreaLight` only
  when the rectangular wash on a nearby wall IS the shot, and know its terms:
  `RectAreaLightUniformsLib.init()` first, no shadows, standard/physical
  materials only.
- When the player roams, the budget follows them — but never add or remove a
  light mid-play: changing the light count recompiles every shader that sees
  it, a visible hitch. Allocate a small fixed pool up front, reassign members'
  position and color to the nearest sources, and retire one by driving its
  intensity to 0.

## Shafts and visible air

The default shaft is geometry, not a render pass — an open cone or tapered
cylinder from the aperture, additive, fading along its length:

```ts
function beamGradient(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = 1; c.height = 64;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, 64);
  g.addColorStop(0, "rgba(255,255,255,0.9)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1, 64);
  const t = new THREE.Texture(c);
  t.needsUpdate = true;
  return t;
}

const shaft = new THREE.Mesh(
  new THREE.CylinderGeometry(0.25, 1.6, 7, 24, 1, true), // narrow at the crack, wide at the floor
  new THREE.MeshBasicMaterial({
    map: beamGradient(),          // flip the gradient if the bright end lands on the floor
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  }),
);
```

- Pair the shaft with a real `SpotLight` from the same aperture: the bright
  pool at its foot is what sells the beam. A shaft with nothing at its foot
  reads as a hologram.
- If the scene earns its one ambient-particle layer (the moment gate's
  budget), inside the beam is where it pays — slow dust motes, the
  `$genex-threejs-procedural-vfx` dot-texture recipe.
- `scene.fog` (or `FogExp2`) is a scene-wide mood decision: every light pool
  becomes a cone and contrast falls everywhere — choose it for the whole look.
- A full-screen shaft hanging off the sun disc rides the atmosphere pass
  (`$genex-threejs-atmosphere-aerial-perspective`); this skill's shafts are
  per-aperture beams built as geometry. A real raymarched volumetric pass is
  for scenes whose identity is shafts.

## Light as information

- Reserve a signal hue: pickups and objectives get a color no environment
  light uses, and it never changes meaning mid-game.
- Aim the player with brightness before UI: the lit doorway beats the arrow.
  The eye lands on the highest contrast in frame — put it where the player
  should go.
- Telegraph danger with the light's shape — a red cone where the boss will
  sweep, a pulsing ring under the falling crate — timed to the same event
  feedback the moment gate placed.
- A vertical beacon (shaft recipe above) reads across the whole map and over
  occluding walls — the map's own "you are here".

## Budgets and lifecycle

- The whole rig of most shipped scenes: one shadow-casting key, IBL or
  hemisphere fill, and a handful of coupled practicals. Each real light
  beyond that carries a stated reason.
- A shadow-casting point light renders the scene six more times; a
  shadow-casting spot, once. Prefer the spot — and prefer no shadow at all on
  a flickering source, because the moving pool already sells it.
- `scene.remove(light)` does not free it: call `light.dispose()` when the
  level unloads, and the shadow map goes with it.

## The kill-switch diagnostic

Wire a debug toggle per light, the same way the other systems expose debug
views. Turn each light off alone and name what died — "the campfire pool",
"the corridor signal" — watching the frame time as well as the frame: a light
whose absence changes nothing is dead weight to delete, and a light that costs
more milliseconds than the mood it adds is over budget. That observation is
the budget — there is no magic count. Then take two screenshots with post
off — the darkest playable corner and the brightest — and check both: if the
subject and the way forward read in each, the rig holds.
