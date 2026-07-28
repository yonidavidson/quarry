---
name: genex-threejs-procedural-geometry
description: Build procedural mesh systems for Genex Three.js games. Use for mesh writers, profile sweeps, rails, branches, frames, collision-aware shapes, UV density, custom normals, material groups, instancing decisions, and geometry that must hold up to close gameplay inspection.
---

# Genex Three.js Procedural Geometry

Generate geometry from a semantic plan and an explicit coordinate frame. Triangle emission is the final compilation step, not the design model.

## Build order

1. Define dimensions and semantic segments.
2. Generate a centerline, boundary, profile, or placement plan.
3. Build the mechanism-appropriate local parameterization or branch orientation.
4. Emit vertices with intentional seams and material ownership.
5. Generate UVs from real distance.
6. Validate winding, normals, tangents, bounds, and degenerates.
7. Select merging, instancing, or LOD by update and material behavior.

Read [references/mesh-systems.md](references/mesh-systems.md)
for the exact sculpted-frame profile, rail emission, tree rings, semantic mesh
writer, and their observed scaling limits.

## Failure conditions

- profile orientation flips along a curve;
- caps reuse side vertices and create averaged edge normals;
- UV scale changes with segment count;
- arbitrary vertex merging destroys hard edges or material boundaries;
- generated dimensions are hidden in magic multipliers;
- instancing is used despite per-instance topology differences;
- triangle count is the only reported complexity metric.

## Routing boundary

This skill owns reusable mesh emission. Use
`$genex-threejs-procedural-architecture` for a building grammar and
`$genex-threejs-procedural-vegetation` for a growth hierarchy; those subject skills
may then apply these geometry mechanisms.
