---
name: genex-threejs-volumetric-clouds
description: Build volumetric cloud systems for Genex Three.js games. Use for weather-shaped density, bounded raymarching, cloud layers, erosion detail, lighting cones, silver lining, temporal reconstruction, cloud shadows, quality tiers, and sky drama with controlled budgets.
---

# Genex Three.js Volumetric Clouds

**Static clouds in a fixed sky → `$genex-ai-skybox` instead** (one command, a
real 360° image). This skill is for moving, weather-driven, or fly-through
clouds.

Cloud quality comes from density organization, lighting, and temporal stability—not from increasing march steps over unstructured noise.

## System order

1. Define the cloud volume and layer bounds.
2. Generate or source weather, base-shape, detail, and turbulence fields.
3. Build a density function with vertical and weather profiles.
4. Raymarch only the bounded occupied segment.
5. Integrate transmittance and lighting front-to-back.
6. Reconstruct low-resolution output temporally.
7. Project a separate low-cost cloud-shadow solution.

Read [references/volumetric-clouds.md](references/volumetric-clouds.md) before implementing or auditing the cloud system.

## Required controls

- coverage, cloud type, precipitation, and anvil bias;
- base/top altitude and vertical density profile;
- shape/detail scales and erosion;
- wind for each field;
- primary step count, light step count, and empty-space policy;
- history weight and disocclusion threshold;
- cloud-shadow extent, resolution, and update rate.

## Failure conditions

- density is only `fbm(position)`;
- the raymarch traverses the full camera range;
- detail noise adds density instead of eroding shaped masses;
- temporal history is accepted across disocclusion;
- shadows use the full beauty raymarch;
- every cloud layer shares the same wind and density profile.

## Routing boundary

Use `$genex-threejs-atmosphere-aerial-perspective` for molecular/aerosol scattering
without weather density. This skill owns weather-shaped cloud volumes,
reconstruction, cloud lighting, and cloud shadows.
