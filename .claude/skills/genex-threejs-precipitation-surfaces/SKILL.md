---
name: genex-threejs-precipitation-surfaces
description: Build coupled precipitation and weather-affected surfaces for Genex Three.js games. Use for falling snow, snow accumulation, model snow caps, rain, wet asphalt puddles, procedural ripple normals, splash flipbooks, rain streaks, shared weather envelopes, and surface wetness or coverage transitions.
---

# Genex Three.js Precipitation Surfaces

Treat weather as a coupled event, particle, and surface-response system. Do not
add rain or snow particles that are visually disconnected from the ground.

## Build order

```text
weather envelope
  -> falling precipitation volume
  -> world/object surface mask
  -> displaced or optical surface response
  -> impact residue and splashes
  -> shared lighting/post presentation
```

Read [references/precipitation-surfaces.md](references/precipitation-surfaces.md)
for snow accumulation, object capping, wrapped precipitation volumes, wet
puddle masks, procedural ripple normals, splash placement, and debug outputs.

For the base ground surface under the wetness or snow (asphalt, dirt, stone),
generate a real texture with `npx genex texture` and load it via
`$genex-ai-texture`, then build the precipitation response on top of it.
Splash flipbook atlases and ripple normals stay procedural (for example a
canvas-drawn expanding-ring atlas) — they are not generated assets.

## Required controls

- precipitation density and speed;
- wind direction and strength;
- shared weather progress or coverage;
- wetness, snow, or puddle mask threshold and softness;
- ripple or drift normal strength;
- surface roughness response;
- particle/splash opacity;
- debug modes for masks, normals, particles, and event progress.

## Failure conditions

- falling precipitation ignores the wind or timing used by surface response;
- snow height and snow normals come from different fields;
- model snow sticks to vertical faces without an upward-facing filter;
- puddles only lower roughness without a mask, normal response, or ripples;
- splashes appear on downward or hidden faces;
- rain streaks allocate per drop or fail to wrap around the camera;
- temporal wetness is faked with unrelated time noise.

## Routing boundary

Use `$genex-threejs-water-optics` for bounded pool simulation, caustics, Fresnel,
refraction, and Beer-Lambert water volumes. Use `$genex-threejs-procedural-vfx` for
general sparks, plasma, trails, and non-weather particles. Use
`$genex-threejs-temporal-surfaces` for screen-space touch history or frost clearing.
This skill owns precipitation events and the surfaces they visibly alter.
