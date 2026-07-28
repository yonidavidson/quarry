---
name: genex-threejs-temporal-surfaces
description: Build temporal screen-space and surface-history effects for Genex Three.js games. Use for touch history, frost clearing, burn-in masks, wet trails, accumulation buffers, ping-pong render targets, reduced-resolution blur, refraction masks, and interaction effects that persist over time.
---

# Genex Three.js Temporal Surfaces

Use render-target state when the effect depends on history. Do not fake accumulation with a time-only procedural mask.

## Pipeline

```text
screen-space touch source
  → ping-pong state update
  → reduced-resolution scene blur
  → static structure textures
  → frost composite
  → normal/refraction output
```

Read [references/temporal-surfaces.md](references/temporal-surfaces.md)
for an exact frost pass graph, pointer-history channels, blur and refraction
coupling, and implementation defects that must be corrected.

## Rules

- Separate persistent state from static noise and scene color.
- Preserve separate visible-mask and tilt-response channels.
- Use half-float for this history path unless a measured lower format is equivalent.
- Convert per-frame history decay to frame-rate-independent decay.
- Run the two-pass scene blur at reduced resolution.
- Pre-render static procedural textures once.
- Define and test resize/reset behavior for both history targets and static targets.
- Do not route world footprints, object-UV paint, or simulation-plane wetness here; this skill is screen-space.

## Routing boundary

Use `$genex-threejs-procedural-vfx` for world- or object-space residue, particles, and
dissolves. Use `$genex-threejs-precipitation-surfaces` for rain wetness, puddles,
snow accumulation, and weather-surface coupling in world space. This skill owns
screen-space persistent history and its composite.
