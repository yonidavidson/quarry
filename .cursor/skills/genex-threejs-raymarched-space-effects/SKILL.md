---
name: genex-threejs-raymarched-space-effects
description: Build raymarched space effects for Genex Three.js games. Use for black holes, accretion disks, wormholes, curved-ray distortion, procedural star fields, bounded volumetric structures, relativistic-looking effects, and GPU effects needing numerical integration.
---

# Genex Three.js Raymarched Space Effects

Treat these effects as numerical renderers with explicit integration state. The visual character depends on coordinate choice, step policy, and how rays interact with emissive structures.

## Workflow

1. Define the effect-space transform and camera ray.
2. Choose a physical, physically inspired, or purely artistic bending model.
3. Bound the integration domain.
4. Track ray position, direction, throughput, and accumulated radiance.
5. Detect crossings with disks, shells, throats, or event boundaries.
6. Sample the background only after integration terminates.
7. Add diagnostics for trajectory, step count, and termination reason.

Read [references/space-effects.md](references/space-effects.md)
for the RK4 wormhole, artistic curved-ray accretion integrator, disk
composition, and implementation defects.

## Constraints

- Do not call a UV swirl “gravitational lensing.”
- Cap iterations and provide early termination.
- Use continuous crossing tests for thin structures.
- Keep numerical stability independent from frame rate.
- Separate the integrator from shading of the accretion disk or wormhole interior.
- Provide a cheaper approximation for non-hero views.

## Routing boundary

Use `$genex-threejs-procedural-vfx` for ordinary particles, trails, plasma, and event
effects. This skill is for per-pixel numerical ray integration through curved
or bounded space-effect domains.
