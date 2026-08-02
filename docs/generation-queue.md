# The Aug 4 generation queue (#100)

Everything here is blocked on one thing: the Genex credit balance is **0** and
refills to **100 on 2026-08-04**. Confirmed by trying —

```
✗ Out of credits — this texture generation costs 3 credits; your balance is 0.
  Credits refill to 100 on Aug 4.
```

This file exists so the refill is a paste, not a fresh design session. The
prompts are written against the art target (`docs/reference/art-target-temple.png`)
and against what is actually in the game now, so they drop straight into the
stand-ins they replace.

**100 credits will not cover all of it.** Known costs: texture 3, sfx 5, video 20;
the rest print their cost before they bill. The tiers below are in order of how
much the game changes per credit — run Tier 1 first and re-check the balance
between tiers.

Every command is `--no-wait`, so the whole tier enqueues at once. Then:

```bash
npx genex wait --all      # one status line each; never bills, never blocks
```

---

## Tier 1 — the world's surfaces (~18 credits + skybox)

These replace `src/world/stone.ts` and `src/world/sky.ts`, which are procedural
stand-ins. This is the single biggest step toward the reference.

```bash
npx genex texture "ancient Mayan temple floor: worn sandstone flagstones with hand-cut edges, moss growing in the joints, fine dust and grit, sunlit warm ochre stone, photoreal game PBR base colour" --terrain --no-wait

npx genex texture "Mayan temple wall of large coursed sandstone blocks, weathered and chipped corners, deep mortar joints, faint moss streaks, warm ochre stone, seamless tiling, photoreal game PBR base colour" --no-wait

npx genex texture "carved Mayan glyph panel in sandstone, deep-relief cartouches and step-fret symbols, sharp chisel edges catching light, weathered and dusty, seamless tiling, photoreal game PBR base colour" --no-wait

npx genex texture "carved stone frieze of rows of skulls in relief, Mesoamerican tzompantli wall, pale bone-coloured carving against warm sandstone blocks, deep shadow in the eye sockets, seamless tiling, photoreal game PBR base colour" --no-wait

npx genex texture "cut sandstone pyramid step blocks, clean-quarried faces with chipped edges, pale warm stone, light dust, seamless tiling, photoreal game PBR base colour" --no-wait

npx genex texture "mossy jungle boulder and overgrown broken stone rubble, deep green moss over grey-brown rock, wet shadowed crevices, seamless tiling, photoreal game PBR base colour" --no-wait

npx genex texture "polished ancient gold and bronze, hammered surface with fine scratches and dark tarnish in the recesses, warm rich metal, seamless tiling, photoreal game PBR base colour" --no-wait

# --raw is required: the skybox lane refuses prompts naming structures, and the
# distant step pyramids on the horizon are the point.
npx genex skybox "midday tropical sky over dense jungle canopy, deep blue zenith burning to pale haze at the horizon, brilliant sun with a wide warm halo, scattered cumulus, distant Mayan step pyramids rising out of the treeline, equirectangular 360 panorama" --raw --no-wait
```

**Wiring:** put the URLs in `src/assets.ts` → `TEXTURES`, load through
`pickAsset` for the rungs (#79), and swap the `map`/`bumpMap` on the matching
material in `src/world/complex.ts` (`floor` · `wall` · `glyph` · `frieze` ·
`step`). Keep `uvBox`'s `TILE` metres-per-tile values — they are tuned to the
architecture, not to the stand-in art. Then delete `src/world/stone.ts` and
`src/world/sky.ts`.

## Tier 2 — the screens

The menu and loader still show the industrial key art, which now jars against
the game. This is the most visible remaining mismatch.

```bash
npx genex image "Temple-ruin survival-horror video game key art, cinematic 16:9. A lone explorer with a golden pistol runs across a sunlit stone causeway in a collapsed Mayan temple; a huge horned bull-headed brute charges after him. Hard midday sun through the broken roof, carved skull friezes, moss and vines, jungle beyond the arches. No text, no UI, no logo." --edit docs/reference/art-target-temple.png --quality high --aspect landscape --no-wait

npx genex image "Temple-ruin game menu backdrop: the same collapsed Mayan temple hall, empty of characters, seen from low and wide. Shafts of hard midday sun through the broken roof, dust in the light, carved skull frieze along the wall, vines hanging from the beams, jungle past the arches. Calm lower third with room for menu buttons. No text, no UI, no logo." --quality high --aspect landscape --no-wait

npx genex image "the word 'QUARRY' carved into a weathered sandstone temple block, deep chiselled relief with hard sun raking across it, moss in the cut edges, Mesoamerican glyph styling on the letterforms, transparent background" --transparent --no-wait
```

Then the menu video, which fires from the NEW still (20 credits — check the
balance first):

```bash
npx genex video "dust drifts through the shafts of sunlight and settles back, a vine sways a hair and steadies, a lizard crosses a carved block and is gone, heat shimmer rises off the sunlit stone and thins — every motion ends where it began" --frame <MENU_STILL_URL> --duration 8 --loop --no-wait
```

**Wiring:** `KEY_ART`, `MENU_STILL`, `LOGO`, `MENU_VIDEO` in `src/assets.ts`.

## Tier 3 — audio (~15-25 credits)

```bash
npx genex music "slow jungle dread, low tribal drums and a distant hollow flute, sub-bass drone underneath, cicadas and heat, tense and patient, instrumental loop" --duration 90 --no-wait

npx genex sfx "temple ruin ambience: jungle birds and insects, wind moving through hollow stone, a distant water drip" --duration 8 --no-wait

npx genex sfx "single boot step on dusty stone flagstone, gritty scuff, dry echo in a large stone hall" --no-wait
```

**Wiring:** `AUDIO.music` and `AUDIO.step` in `src/assets.ts`; ambience is a new
key, played as a quiet loop under the hunt in `src/audio.ts`.

## Tier 4 — the two hunters (expensive; needs the player in the loop)

The character lane is a three-step ceremony and the player must pick a candidate
— it cannot be run unattended:

```bash
npx genex character "Jack — a lean, weathered treasure hunter in a ruined jungle temple. Short-sleeved shirt, cargo trousers, boots, a climbing rig and a holster, a golden pistol in hand. Sun-bleached and dust-covered. Game-ready hero silhouette."
# → player picks a candidate → genex character preview <id> → genex character finalize <id>

npx genex creature "a hulking horned bull-headed brute, heavy muscular torso, ochre-brown hide, thick curved horns, stone bracers and a leather kilt, hunched forward and mid-charge. Readable silhouette from across a temple hall."
```

Also here: props (`genex model`) for the carved idol, broken column, stone
brazier and offering chest. All lower priority than Tiers 1–3 — the world reads
correctly without them and does not without Tier 1.

---

## Also queued from before the reskin

- The HUD threat mask clean-up (#78) — the annotated twin was drawn shaded and
  off-registration, so `genex ui masks` correctly refuses it. Needs a model edit
  plus `--clean`. The derived fill in `src/ui/hud.ts` holds until then.
- The menu hover/confirm ticks (5 credits each) — procedural WebAudio blips hold
  until then.
