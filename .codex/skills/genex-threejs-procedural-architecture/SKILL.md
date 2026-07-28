---
name: genex-threejs-procedural-architecture
description: Create procedural architecture for Genex Three.js games. Use for buildings, modular kits, facade grammars, exposed-edge analysis, bay systems, roofs, arches, ornaments, city blocks, collision proxies, material-slot compilation, and readable architecture at gameplay distance.
---

# Genex Three.js Procedural Architecture

Separate design planning from mesh emission. A building generator should produce an inspectable plan before it produces triangles.

## Required architecture

```text
settings
  → mass grammar
  → exposed-surface graph
  → façade/roof placements
  → module registry
  → material-slot mesh writer
  → geometries
```

Read [references/architecture-systems.md](references/architecture-systems.md) before implementing the generator.

## Rules

- Massing, façade rhythm, and detail modules are separate layers.
- Resolve exposed edges before façade placement. Do not decorate hidden internal faces.
- Modules own semantic anchors and construction depth, not global building coordinates.
- Compile by material slot to reduce draw calls without destroying material separation.
- Preserve real dimensions for floor height, bay width, trim projection, and texture density.
- Randomness may select among valid designs; it must not repair invalid geometry.
- Provide topology, façade ownership, material/geometry, and shadow diagnostics
  appropriate to the renderer path.

## Acceptance

The generated building must survive:

- silhouette-only view;
- flat untextured material;
- grazing light;
- close inspection of corners and roof transitions;
- seed variation without broken bays, overlapping ownership, or floating ornament;
- triangle and module-count reporting.

## Routing boundary

Use `$genex-threejs-procedural-geometry` for a reusable profile, sweep, ring, or mesh
writer without a building grammar. This skill owns massing, façade semantics,
architectural modules, and building-plan compilation.
