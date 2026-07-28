---
name: genex-threejs-lighting-design
description: Light Genex Three.js games from visible causes, and decide WHERE light belongs — walk the scene's sources one by one, the way the visual-direction gate walks surfaces and the moment gate walks moments. Use for light rigs, sun/moon key lights, practical lights (campfire, torch, neon, lava), emissive-to-light coupling, light shafts and visible beams, fog mood, gameplay light signals, flicker, light budgets, and scenes that read flat or uniformly lit.
---

# Genex Three.js Lighting Design

Light from causes — every light in the frame is the visible consequence of
something the player can point at. Avoid the uniform ambient wash that lights
a cave like an office.

## The source gate — run this BEFORE writing any lighting code

The visual-direction gate walks **surfaces**; the moment gate walks
**moments**. Light lives on neither — it lives on **sources**: what the sky
pours in and what the fiction burns, glows, or screens. Walk the sources the
same way, and decide each one.

List the sources the scene contract already names — never invent them. Three
places to look:

- **the sky** — day, night, overcast, underground, deep space? That one answer
  sets the rig: a warm sun key with cool sky fill, a dim hard moon, or no sky
  at all — a cave is keyed by its practicals;
- **the fiction's emitters** — campfire, torch, lava, neon sign, a monitor,
  headlights, a portal, a crack of daylight in the roof;
- **the gameplay signals** — the objective beacon, the telegraph, the
  checkpoint. Light is information the player navigates by, and it is the
  cheapest wayfinding you own.

When gameplay needs light where the fiction names no source, add the cause
first — a lamp prop, embers, a fissure — and then light it; the light alone is
still a bug. Then judge each source:

> **Does it change what the player sees AROUND it — on the ground, the walls,
> the player — or does it only need to be seen itself?**

Four verdicts, all legitimate, one forbidden:

- **Seen itself** — an emissive material, no light object. Most sources land
  here, and that is what keeps the frame cheap; how much it glows is
  `$genex-threejs-bloom`'s question.
- **Lights its surroundings** — a real `PointLight` or `SpotLight`, coupled to
  its emitter (below). A campfire that doesn't paint the ground orange is a
  prop, not a fire.
- **Shapes the whole frame** — the key: a sun or moon `DirectionalLight`, the
  arena floods. One or two per scene, and they own the shadows.
- **The air itself is lit** — the beam is the point: the cave crack, a dusty
  window shaft, canopy rays. Build the shaft as geometry first — fog and
  volumetric passes are scene-wide decisions, never per-beam tools (recipes
  in the reference).
- **Not deciding — the only wrong answer.** One white `AmbientLight` over
  everything is not a rig; it is the unlit look with extra steps, and it is
  why shipped scenes read the same at noon and at midnight.

"The neon is emissive-only — it doesn't reach the street" is a real answer;
say it in one line and move on. Then check the inverse: **a light with no
visible cause reads as a bug**, not mood — the player asks why the floor
glows. And when the walk returns more real lights than the scene can afford,
demote the dimmest back to emissive-only: dynamic lights are the scarcest
resource in the frame, and the eye forgives an unlit distant torch far sooner
than a dropped frame.

## A practical is coupled, not placed

The light a source throws and the mesh that emits it are one thing. Drive both
from one envelope — separate flickers, or a light hovering near an unlit prop,
read instantly as fake:

```ts
// Values assume a locked renderer baseline — relationships, not mandates.
const fire = new THREE.PointLight(0xff9142, 14, 18, 2); // range-capped, physical falloff
fire.position.set(0, 0.9, 0);                 // inside the flame, above the fuel
campfire.add(fire);
const flameMat = flame.material as THREE.MeshStandardMaterial;
flameMat.emissive.set(0xff7a1e);

function flicker(t: number): number {
  // two incommensurate sines — coherent, frame-rate independent
  return 0.82 + 0.12 * Math.sin(t * 11.3) + 0.06 * Math.sin(t * 23.7 + 1.7);
}

function updateFire(elapsed: number): void {
  const e = flicker(elapsed);
  fire.intensity = 14 * e;
  flameMat.emissiveIntensity = 2.4 * e;       // mesh and light breathe together
  fire.position.x = 0.05 * Math.sin(elapsed * 7.1); // the pool sways with the flame
}
```

The same couple serves a neon sign that hums, a monitor whose picture spills
onto the desk, a muzzle flash (one envelope drives light, emissive, and the
sound cue). And when `npx genex skybox` has set `scene.environment`, that
image IS the ambient fill — do not stack an `AmbientLight` on top of it.

Read [references/light-recipes.md](references/light-recipes.md) for rig
baselines per environment (day, night, interior, cave, space), the shaft and
fog recipes, light-as-information patterns, budget relationships, and the
kill-switch diagnostic.

## Rules

- Every light names its cause; a light nothing explains is a bug, not mood.
- **The light population is fixed at scene build — never add, remove, or hide
  a light (or a group containing one) during play.** Three.js counts lights
  into every lit material's shader; a changed count recompiles ALL of them
  synchronously — a multi-second freeze on the exact frame a pickup, door, or
  death "removes" a light (a real pilot game froze ~3 s per relic collected
  this way). Turn a light off by driving `intensity` to 0 and leave it in the
  graph; per-level swaps rebuild the whole scene anyway, which is the one
  legitimate time the population changes.
- Couple a practical to its emitter: one color, one envelope, one on/off state.
- The key owns shadows; practicals cast none until a shot proves they must.
- **A shadow-casting practical that never moves gets a FROZEN map**: a
  PointLight shadow is a 6-face cube render, re-drawn every frame by default —
  four static lanterns cost 24 shadow passes/frame over your densest props for
  zero visual change (a pilot game submitted 66M triangles/frame this way).
  Set `light.shadow.autoUpdate = false; light.shadow.needsUpdate = true;` so
  the cube renders once; keep only the key (which shadows the movers) dynamic,
  and budget frozen practicals at ≤1024 map size.
- Tune intensities only after the renderer baseline is locked — retuning the
  whole rig after a tone-mapping change is self-inflicted.
- Never repair unbalanced light ratios with exposure — fix the lights.
- Flicker from elapsed time, never per-frame randomness.
- Dispose lights and their shadow maps with the level that spawned them — and
  the rest of the level with them: traverse the outgoing scene and dispose
  geometry, materials, AND textures separately (three frees nothing; material
  dispose does not touch textures). Leaked levels march phones toward the
  OS memory kill — `$genex-threejs-adaptive-quality` owns the budget watch.
- The rig must read with post off: time of day and where-to-go, before bloom.

## Routing boundary

Tone mapping, exposure, and grading are
`$genex-threejs-exposure-color-grading`. How much an emissive glows is
`$genex-threejs-bloom`; whether it also illuminates is this skill. Authoring
the emissive surface itself — lava, hot rock, a screen's picture — is
`$genex-threejs-procedural-materials`. `$genex-threejs-shadow-systems` owns
large roaming-world shadows (cascades, clipmaps) — a bounded scene's one
shadow-casting key with a tight frustum lives here. Sky scattering, haze, and the sun disc are
`$genex-threejs-atmosphere-aerial-perspective`; shafts inside clouds are
`$genex-threejs-volumetric-clouds`; ordering a volumetric pass among other
post effects is `$genex-threejs-image-pipeline`; the environment map that
feeds the fill is `$genex-ai-skybox`.
