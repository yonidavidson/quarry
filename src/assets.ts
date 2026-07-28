// Generated assets live in Genex storage, not the repo — these are the permanent
// URLs `npx genex …` printed. Keep this list in step with DESIGN.md's Assets table.
// The @1024 / @2048 rungs exist so phones can load the small one (see the
// adaptive-quality kit's loadTextureWithFallback).
const GEN = "https://assets.genex.technology/generations";

export const TEXTURES = {
  /** Machine-hall floor — wet stained concrete, seamless. */
  floor: `${GEN}/cms4emta7007b2ens0yy80gif/texture-basecolor`,
  /** Catwalks and stairs — rusted diamond plate. */
  catwalk: `${GEN}/cms4emub4006i2pqltf31ogeu/texture-basecolor`,
} as const;

export const AUDIO = {
  /** ~90s looping bed: sub-bass drone, distant metal, dripping water. */
  music: `${GEN}/cms4emv98007g2ensjvsuohe2/audio-music`,
  blaster: `${GEN}/cms4enbvi006r2pqlv87sczmr/audio-sfx`,
  claw: `${GEN}/cms4end10007s2ensw5eyzvhc/audio-sfx`,
  step: `${GEN}/cms4endxa006w2pqlwte99qpv/audio-sfx`,
  roar: `${GEN}/cms4enetk00722pqlceu8tlk8/audio-sfx`,
} as const;
