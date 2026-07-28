---
name: genex-threejs-bloom
description: Implement controlled HDR bloom for Genex Three.js games. Use for selective emission, glow hierarchy, bloom thresholds, multi-scale blur, material restoration, effect isolation, exposure coupling, and diagnostics where glow supports form without replacing it.
---

# Genex Three.js Bloom

Bloom is a camera/display response to bright HDR signal. Establish scene exposure and emissive luminance before tuning blur.

## Workflow

1. Inspect pre-tone-map luminance.
2. Choose which scene values should bloom.
3. Choose a single-node or dual selective-render ownership model.
4. Calibrate threshold, radius, smooth width, and strength in HDR.
5. Restore all substituted materials transactionally for selective passes.
6. Composite before exposure/tone mapping.
7. Validate base, contribution, and final views.

Read [references/bloom.md](references/bloom.md) for the
HDR ordering, dual selective-bloom transaction, compact emissive hierarchy,
and the costs and limits of each ownership model.

Apply the material substitution/restoration ownership pattern in the
reference before adding selective bloom to a composed scene.

## Failure conditions

- bloom creates the only visible form of an effect;
- all bright materials share one arbitrary emission multiplier;
- threshold is tuned after tone mapping;
- selective bloom requires mutating scene materials every frame without restoration guarantees;
- transparent particles disappear from extraction because pass ownership is unclear;
- bloom radius changes wildly with resolution;
- highlights become gray because energy is clamped too early;
- bloom ships un-tiered: phone tiers run the light post level
  (`$genex-threejs-adaptive-quality`) — bloom is a desktop-tier pass, and its
  full-res HDR target is exactly the allocation phones get killed for.

## Routing boundary

Use `$genex-threejs-exposure-color-grading` for metering, adaptation, tone mapping,
and LUTs. Load `$genex-threejs-image-pipeline` only when bloom must be composed with
several shared image-space systems.
