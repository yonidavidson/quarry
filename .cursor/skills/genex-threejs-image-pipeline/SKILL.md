---
name: genex-threejs-image-pipeline
description: Design the final image pipeline for Genex Three.js games. Use for render-target ownership, depth and normal signals, albedo/history buffers, pass ordering, post-processing composition, AO, bloom, exposure, tone mapping, grading, diagnostics, and avoiding conflicting render effects.
---

# Genex Three.js Image Pipeline

Use this skill only when composing several image-space systems or defining shared buffers. For one effect, load its atomic skill instead.

Load:

- `$genex-threejs-screen-space-ambient-occlusion` for GTAO, bent normals, denoising, or AO application;
- `$genex-threejs-bloom` for HDR extraction and bloom;
- `$genex-threejs-exposure-color-grading` for metering, adaptation, tone mapping, LUTs, and output conversion.

The pipeline must expose its signals and ordering. Do not install a pile of effects and tune the final frame blindly.

## Signal order

```text
scene HDR color + depth + normals + albedo where required
  → lighting-related screen effects
  → atmosphere/transparency composition
  → bloom
  → exposure
  → tone mapping
  → grading
  → lens/presentation effects
  → output conversion
```

Read [references/image-pipeline.md](references/image-pipeline.md)
for four production pass graphs, their buffer/resolution contracts, and the
ownership boundaries between whole-scene and effect-local graphs.

## Rules

- Tone-map once.
- Keep HDR bloom before tone mapping.
- Meter exposure from a small luminance target, not the final 8-bit screen.
- Separate direct and indirect light before applying bent-normal ambient tint when possible.
- Upsample low-resolution effects with depth/normal-aware weights.
- Build pass toggles and effect-only views before tuning.
- UI rendered in the same target needs an explicit protection strategy.
- Do not load all atomic post skills by default. Route only the effects actually requested.
- Budget the pipeline per device tier (`$genex-threejs-adaptive-quality`):
  phone pixel budget ≈ 1,000,000 px at DPR ≤ 1.25–1.5, desktop ≈ 1,650,000 px —
  every full-res pass target multiplies that cost, so phone tiers run the light
  post level and per-pass resolution scales (0.4–0.5 DPR blurs) are the norm,
  not an optimization.

## Routing boundary

Use this skill when multiple image-space systems must share buffers, ordering,
or output ownership. For one isolated effect, use its atomic skill without
loading this coordinator.
