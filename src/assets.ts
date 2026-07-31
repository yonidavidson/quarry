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
  /** Hall walls — chipped grey-green paint over rusted steel. */
  wall: `${GEN}/cms4nxrid000r2bl48qklh216/texture-basecolor`,
  /** Machine casings — dark oiled metal, rivets, rust bloom. */
  machine: `${GEN}/cms4nxsgk000w2bl4zfxv7pvj/texture-basecolor`,
  /** The ceiling: corrugated metal with pipe runs and cable trays. */
  ceiling: `${GEN}/cms4nxte7000m2ro5bxj8slct/texture-basecolor`,
} as const;

export const MODELS = {
  /** The Stalker — rigged biped, with its own walk/run clips baked in. */
  stalker: `${GEN}/cms4fiv3a008x2pqlshvq5jnp/character-rigged-a2-glb`,
  /** Jack, for when the AI wears him — the player's own body comes from the
   *  character manifest instead (public/assets/meshy-character.json). */
  jack: `${GEN}/cms4fbaky009f2ens0f1kmmbi/rigged-character.glb`,
} as const;

/** Key art: Jack alone in the hall, the beast on the ceiling above him. Used by
 *  the loader and the title screen; also the frame the gallery cover should be
 *  minted against. */
export const KEY_ART = `${GEN}/cms4m26n400iy2pqliielme17/image-main`;

/** The menu still — a UI-free establishing shot anchored to the key art. Doubles
 *  as the loader background. Menu video (when it exists) animates it. */
export const MENU_STILL = `${GEN}/cms9cfc2y00a82tmkpp4splh6/image-main`;

/** Seamless looping menu video generated from MENU_STILL. */
export const MENU_VIDEO = "";

/** The generated logotype: 'QUARRY' cut from rusted steel, transparent PNG. */
export const LOGO = `${GEN}/cms9cfc07009d2qqfxrylzrtt/image-main`;

export const AUDIO = {
  /** ~90s looping bed: sub-bass drone, distant metal, dripping water. */
  music: `${GEN}/cms4emv98007g2ensjvsuohe2/audio-music`,
  blaster: `${GEN}/cms4enbvi006r2pqlv87sczmr/audio-sfx`,
  claw: `${GEN}/cms4end10007s2ensw5eyzvhc/audio-sfx`,
  step: `${GEN}/cms4endxa006w2pqlwte99qpv/audio-sfx`,
  roar: `${GEN}/cms4enetk00722pqlceu8tlk8/audio-sfx`,
} as const;
