---
name: genex-threejs-procedural-vegetation
description: Generate procedural vegetation for Genex Three.js games. Use for trees, trunks, roots, recursive branches, canopies, leaf cards, stylized meadow grass, GPU-computed grass fields, grass clumps, species presets, deterministic variation, growth forces, rooted blade and leaf wind, wind deformation, and vegetation that supports navigation or scene readability.
---

# Genex Three.js Procedural Vegetation

Represent a plant as a growth hierarchy plus rendering adaptations. Do not model it as randomly scattered cylinders.

## Build sequence

1. Define a per-level species table: length, radius, taper, child count, emergence range, angle, twist, gnarliness, sections, radial segments.
2. Grow branches iteratively from a queue so recursion depth and budgets remain inspectable.
3. Emit each branch as oriented rings with an intentional UV seam.
4. Update section orientation from:
   - inherited direction;
   - stochastic curvature;
   - tropism or external force;
   - optional attraction constraints.
5. Spawn children with stratified longitudinal slots and independently permuted angular slots.
6. Generate leaves only after branch topology is stable.
7. Build foliage normals from both card orientation and local crown volume.
8. Choose wind scope explicitly. Leaf-root deformation, branch hierarchy deformation, and whole-tree sway are separate systems.

Read [references/vegetation-systems.md](references/vegetation-systems.md) and preserve its preset, continuation, child-placement, leaf, material, wind, and composition contracts before tuning.

## Grass fields

Grass is either instanced blade clusters (per-instance origin, facing, and
height, with circular-arc rooted wind that bends blades from the ground up) or
GPU-generated blade fields (blades written in render targets with Voronoi clump
variation, folded blade curvature, and distance-based density falloff). Both
keep terrain height and clump identity as shared causes; scattering blades with
uniform randomness produces lawn noise, not a meadow.

## Visual failure conditions

- branches form visible helices;
- every child emerges at the same relative height;
- dense grass ignores terrain height or clump-level variation;
- bark texture scale changes with branch radius;
- leaves reveal flat card normals under rotation;
- leaf wind moves card roots instead of remaining anchored;
- branch wind is claimed to match a reference whose branches are static;
- different seeds change species identity rather than controlled variation;
- geometry cost grows without a per-level budget.

## Routing boundary

Use `$genex-threejs-procedural-geometry` for generic branch-ring emission without a
growth model. This skill owns species tables, topology, child placement,
foliage, grass fields, roots, and hierarchical/rooted wind.
