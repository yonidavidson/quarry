---
name: genex-threejs-spectral-ocean
description: Build large procedural oceans for Genex Three.js games. Use for FFT-style wave spectra, multi-cascade wave bands, hybrid FFT plus Gerstner clear water, stylized above/below-surface ocean optics, choppy displacement, derivatives, Jacobian whitecaps, temporal foam, underwater absorption, crest scatter, ocean shading, camera-scale transitions, and GPU-budgeted open-water scenes.
---

# Genex Three.js Spectral Ocean

**If the game just needs a sea/lake to float on or fly over, use `$genex-threejs-water-optics` instead** — this skill is the expensive hero-water path, for scenes where open water IS the subject.

Treat an ocean as a sampled stochastic wave field with explicit frequency-space ownership. Do not approximate this target with a pile of Gerstner waves, scrolling normal maps, or unrelated foam noise.

## Build order

1. Define the sea-state spectrum and deterministic Gaussian seed.
2. Partition wavelengths into disjoint cascades.
3. Validate the inverse FFT independently with analytic inputs.
4. Generate and conjugate-pack the initial spectrum.
5. Evolve packed displacement and derivative fields in frequency space.
6. Inverse-transform every packed field with explicit inter-step barriers.
7. Assemble displacement, derivatives, and persistent Jacobian foam maps.
8. Shade from summed cascade displacement and derivatives.
9. Add sub-grid detail only below the resolved simulation bands.
10. Expose spectrum, height, slopes, Jacobian, and foam-history diagnostics.

Read [references/spectral-ocean.md](references/spectral-ocean.md) before implementing or auditing a spectral ocean.

## Hybrid and stylized variants

For clear shallow water, a hybrid ocean may add a few authored Gerstner swells on
top of the FFT cascades — never instead of them — with Beer–Lambert depth color,
sand-bed caustics, and sharp sun highlights. A stylized ocean meant to be seen
from above and below can drive color from height gradients, add sun-path glints
and crest scatter, and composite an underwater Beer–Lambert tint from scene
depth. Both variants keep the spectral core, its derivatives, and Jacobian foam
as the single source of surface truth.

## Non-negotiable gates

- Require a power-of-two grid and a passing FFT impulse/frequency test.
- Keep cascade wavenumber intervals disjoint.
- Derive normals from transformed derivatives, not a detached normal texture.
- Detect breaking from the horizontal-displacement Jacobian.
- Persist foam in simulation state; do not infer all foam anew per frame.
- Submit FFT stages with the synchronization required by the active backend.
- Share sun and sky parameters between the visible sky and ocean reflection.
- Keep a deterministic seed and fixed-camera capture for comparisons.

## Route elsewhere

- Use `$genex-threejs-water-optics` for bounded water, screen-space refraction, depth thickness, shoreline absorption, and analytic wave surfaces.
- Add `$genex-threejs-procedural-vfx` only when crest spray or interaction splashes are required.
- Add `$genex-threejs-visual-validation` for cross-seed, temporal, and GPU evidence.
