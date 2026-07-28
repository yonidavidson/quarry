---
name: genex-threejs-water-optics
description: Build analytic water surfaces for Genex Three.js games. Use for rivers, pools, lakes, shoreline water, bounded heightfield pool simulation, object-driven ripples, differential-area caustics, ray-traced pool volume optics, shared wave displacement, normals, Fresnel, refraction, absorption, crest foam, underwater color, and cheaper water than a full spectral ocean.
---

# Genex Three.js Water Optics

Treat water as geometry motion, surface orientation, and a participating optical layer. A blue transparent material is not a water system.

For large stochastic seas driven by directional spectra and GPU FFTs, use
`$genex-threejs-spectral-ocean` instead.

## Analytic surface build order

1. Define wave bands and evaluate displacement.
2. Derive the normal analytically from the same waves.
3. Choose displaced geometry or explicitly normal-only water.
4. Establish scene-color ownership for heuristic refraction.
5. Declare whether absorption uses true depth or a fallback path-length estimate.
6. Blend analytic reflection/refraction through side-aware Fresnel.
7. Derive foam and glints from the shared wave response.
8. Filter unresolved normal bands from derivatives.

Read [references/water-optics.md](references/water-optics.md)
for the exact five-wave displaced ocean, six-band normal-only water, optical
hierarchy, and the limits that distinguish both from the spectral-ocean skill.

## Bounded pool volumes

A bounded pool couples a small RGBA heightfield simulation (height and velocity,
with local drop injection and moving-object displacement) with the optical
layer: normals derive from the simulated heights and feed differential-area
caustics on the pool floor, and the water volume is shaded by ray-tracing
against the pool bounds. Keep the simulation, the normal derivation, and the
caustics reading the same field — a caustic pattern detached from the simulated
surface is a failure condition below.

## Failure conditions

- normal texture motion does not agree with displaced crests;
- heuristic refraction can sample foreground objects but the limitation is undisclosed;
- fallback path length is presented as reconstructed scene thickness;
- bounded pool caustics are a decorative projection detached from simulated
  height normals;
- micro-waves alias into sparkling noise;
- foam is a scrolling texture unrelated to the shared crest metric;
- Fresnel is replaced by constant opacity;
- reflection, refraction, and transparency are all added without energy control.

## Routing boundary

Use `$genex-threejs-spectral-ocean` for stochastic directional spectra, FFT
cascades, Jacobian breaking, and persistent ocean foam. Use
`$genex-threejs-precipitation-surfaces` for rain-driven puddle wetness, ripple
masks, and weather-coupled splashes on ground surfaces. This skill owns
authored analytic waves, bounded heightfield simulation, ray-traced
pool-volume optics, and bounded-water optics.
