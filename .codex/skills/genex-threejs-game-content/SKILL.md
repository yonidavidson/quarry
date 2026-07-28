---
name: genex-threejs-game-content
description: Turn a content-shaped request — quests, NPCs, dialogue, shops, loot, XP — into a countable content contract and the data-driven systems that ship it. Use when the ask names game content in the plural or a content genre (RPG, adventure, story, open world), BEFORE the asset batch, and before calling such a game done.
---

# Genex Three.js Game Content

The most common way a content-shaped request fails is not bad code — it is the
ask silently shrinking: "quests" ships as one hardcoded integer, "NPCs" as
empty textured huts, "a big world" as one small fogged plane, while every
visual floor passes, because content is invisible to a screenshot. This skill
gives content the same teeth the look has: a countable contract written up
front, data-driven systems that make each contract line cheap to ship, and a
floor that gates publish.

## The content contract — write it before the asset batch

Run this the moment the game concept is locked, in the SAME plan message as
`$genex-threejs-game-ui`'s UI gate, whenever the request names content in the
plural (quests, enemies, bosses, locations, spells, items, factions…) or a
content genre (an RPG, an adventure, an open world, a story game, a survival
game). **Walk every plural noun of the request and make each one a countable
line.** The template:

```
CONTENT CONTRACT — <game>
world:       <size class, as a number: one arena | a district (~500 m) | open world (km-class — $genex-threejs-open-world)>
ground:      <the terrain as a DECISION: flat plane | rolling relief | heightfield; water: none | river/lake/sea>
locations:   <N, named: village, crypt, bandit camp, watchtower, boss lair…>
quests:      <N total — a main chain of M gated steps + side quests; each giver named>
NPCs:        <N speaking (quest givers, merchants) + M flavor villagers>
enemies:     <N types + where they spawn; which are bosses and what makes each boss FIGHT differently>
progression: <what grows: XP/levels, gear tiers, learnable abilities — the numbers and their rewards>
economy:     <currency sources AND sinks — what the player earns and what they spend it on>
minute ten:  <one sentence: what is the player DOING ten minutes in, and why is it different from minute one?>
```

Rules that make the contract real:

- **It comes before the asset batch.** The asset set derives from the
  contract — a world with six locations and four enemy types needs a
  different `npx genex model` list than one arena, and finding that out after
  the batch means the world gets shaped around the wrong assets.
- **Every line is a floor.** Publish and the final handoff wait for the
  contract's countables exactly the way they wait for the sprite HUD: a
  request that said "quests" is not done with one; a request that said "big
  world" is not done with an arena.
- **Scope belongs to the user.** Building a small first slice is the right
  ORDER (`$genex-threejs-game-ui`'s v0 beat still applies) — but the slice is
  a milestone on the way to the contract, never a quiet replacement for it.
  If the full ask genuinely doesn't fit, shrinking any line is a
  question to the user with real options — never a silent cut justified as
  "standard practice". (Use your question tool when you have one; if you
  have none, a short numbered list in chat.)
- **Minute ten is the design test.** If the honest answer is "the same sixty
  seconds, again", the contract needs another beat (a new area unlocks, a
  quest chain escalates, a build comes online) before any polish work.
- **The `ground:` line is a decision, not a default.** Flat is fine when
  DECIDED — but the concept frame the user approved is a promise: if it shows
  rolling hills or a shoreline and the game ships a flat plane, that visible
  gap goes through one plain line to the user, exactly like any other cut
  ($genex-threejs-open-world owns real relief when the answer is yes).

## Data-driven, or you won't finish in one session

The reason a solo agent can ship seven quests and seventeen items in an
afternoon is architecture, not typing speed:

- **Systems read tables; content lives in tables.** The quest engine, the
  dialogue walker, the merchant screen, and the spawner are each written
  ONCE; quest #5, item #12, and enemy #4 are table rows. If adding a quest
  means touching engine code, the engine is wrong.
- **Hand-author the beats, table-drive the bulk, seed the placement.** Quest
  prose, boss mechanics, and location identities deserve human-quality
  authoring; stats, stocks, and rewards are data; trees, rocks, and chest
  scatter come from a seeded RNG so "more world" costs zero authoring.
- **One event bus.** Quests advance on events the game already emits
  (`enemy:died`, `item:pickup`, `chest:opened`, `npc:talked`, `zone:entered`)
  — the quest system subscribes; combat and loot never know quests exist.
  This is also what makes quest logic testable in isolation.

The full engine — quest defs + state machine, dialogue trees with quest
hooks, merchant stocks, XP curve — is in
[references/content-tables.md](references/content-tables.md) as copy-paste
modules. Copy them and fill the tables; don't re-derive the shape.

## Quests: defs + events, never an integer

The minimum honest quest system is a table of defs and an event-driven state
machine (`locked → available → active → ready → done`), with prereq gating for
the main chain:

```ts
type Objective =
  | { kind: "kill"; target: string; count: number }
  | { kind: "collect"; item: string; count: number }
  | { kind: "reach"; location: string }
  | { kind: "talk"; npc: string };

type QuestDef = {
  id: string;
  giver: string;            // NPC id — every quest has a face, not a board
  prereq?: string;          // quest id that must be done first (main chain)
  title: string;
  brief: string;            // 2–3 sentences of authored prose, not filler
  objective: Objective;
  rewards: { gold?: number; xp?: number; items?: string[] };
};
```

Progress comes only from the event bus (see the reference for the ~60-line
engine). A tracked quest gets a compass/journal marker
(`$genex-threejs-game-ui` inventories the journal as a screen element), and
turn-in happens in dialogue — handing in a quest should feel like talking to
a person, not watching a counter flip.

## Dialogue: trees with quest hooks

Quest givers and merchants speak. The walker is a dozen lines (reference file)
over nodes of `{ text, options: [{ label, next | action }] }`; what makes it a
QUEST system is three dynamic option states injected per NPC: **offer** (quest
available → "I might have work for you"), **remind** (active → restate the
objective), **turn-in** (ready → hand rewards, open the next chain link). Add
a couple of lore branches per named NPC — three authored lines is the
difference between a person and a signpost. A quest board is an acceptable
extra for arcade-shaped games; it is never the replacement for speaking
NPCs when the ask said "NPCs".

## Items, shops, and an economy that closes

An item catalog (id, kind, price, stats), stack-based inventory, and merchant
stock tables per vendor NPC — all data (reference file). The rule that keeps
it a game: **currency needs sinks.** Gold the player can only accumulate is a
score with a coin icon; gold that buys potions, a better sword, and a spell
tome is an economy. Price the first upgrade to be affordable after the first
quest, and let drops + chest loot + quest rewards all feed the same wallet.

## Progression: something must grow

Pick at least one growth axis and wire its rewards into the quest/enemy
tables: an XP curve (`xpNext = 100 * level ** 1.4` is a fine default) with
flat stat gains per level, gear tiers on the merchant, or learnable abilities
gated behind tomes/trainers. The contract names which; "nothing grows" is what
makes minute ten feel like minute one.

## NPCs: the minimum that reads as alive

A named NPC with a role, a home spot, an idle bob, a face-the-player turn
within a few meters, and dialogue reads as a person — schedules and pathing
are optional upgrades, speech is not. Place speaking NPCs (givers, merchants)
by hand at their locations; scatter flavor villagers with one-line barks from
a table. An empty textured hut village fails the "NPCs" line of any contract.
For host-simulated NPCs/enemies in multiplayer, `$genex-threejs-multiplayer`
owns the authority rules.

## Content that can't dead-end — check before shipping

- A kill/collect quest counts progress made BEFORE acceptance (or the brief
  says why not) — "kill 5 bandits" accepted after clearing the camp must not
  strand at 0/5.
- A quest item from a unique source (a boss drop, a one-time chest) must
  persist until picked up — the source never respawns, so expiring the drop
  dead-ends the chain.
- The main chain gates on prereqs, not on geography alone — reaching the
  final lair early should show a locked door or a warning, not a sequence
  break that skips the story.
- The turn-in NPC is reachable after the objective (didn't die in the wave,
  isn't locked behind the boss arena).
- Saves restore quest state AND its world side-effects — the opened chest
  stays open, the armed boss stays armed. Quest stages, inventory, XP, and
  gold go in the per-player slot via `$genex-threejs-embed-auth`.

## Wiring into the rest of the pack

- World layout, terrain, and location placement at scale:
  `$genex-threejs-open-world` (the contract's `world:` line decides whether
  it loads).
- Quest journal, tracker, toasts, vendor screens: inventory them at
  `$genex-threejs-game-ui`'s gate — they are screen elements like any other.
- Level-ups, quest completion, and boss kills are exactly the "moments" the
  feel pass layers feedback on: `$genex-threejs-game-feel` + a real
  `npx genex sfx` fanfare (`$genex-ai-sfx`).
- Location set pieces and speaking-NPC meshes: `$genex-ai-model` /
  `$genex-ai-character` — generated assets decorate the contract's landmarks;
  they never decide how many exist.

## Failure modes to catch

- "Quests" (plural, in the ask) shipped as one quest — a stage integer with
  hardcoded strings and no giver.
- A village of textured huts where nobody speaks.
- A gold counter with nothing to spend it on.
- No growth axis: the player at minute thirty plays exactly like minute one.
- The contract posted, then quietly abandoned when the first slice previewed
  well — the slice is a milestone, not the destination.
- Contract lines silently shrunk without a structured question to the user.
- The approved concept frame shows rolling hills or water; the game ships one
  flat plane and nobody said so.
