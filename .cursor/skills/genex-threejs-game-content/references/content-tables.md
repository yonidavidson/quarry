# Genex game content — copy-paste systems

Four small modules that turn contract lines into shipped content: an event
bus, a quest engine, a dialogue walker with quest hooks, and items/economy +
XP. Copy them, fill the tables, and keep content OUT of engine code — adding
a quest, an item, or a vendor must always be a table edit.

All snippets are plain vanilla-ts (no enums, no decorators) and assume a
single shared game-state object `G` you already have (player stats, wallet,
the scene). Adapt names, not shapes.

## 1. Event bus — the only coupling

```ts
// events.ts — combat, loot, and movement EMIT; quests and UI SUBSCRIBE.
type GameEvent =
  | { type: "enemy:died"; enemyKind: string }
  | { type: "item:pickup"; item: string; count: number }
  | { type: "chest:opened"; chestId: string }
  | { type: "npc:talked"; npc: string }
  | { type: "zone:entered"; location: string };

type Handler = (e: GameEvent) => void;
const handlers: Handler[] = [];

export function onEvent(h: Handler): void {
  handlers.push(h);
}
export function emit(e: GameEvent): void {
  for (const h of handlers) h(e);
}
```

## 2. Quest engine — defs are data, progress is events

```ts
// quests.ts
import { onEvent } from "./events.ts";

type Objective =
  | { kind: "kill"; target: string; count: number }
  | { kind: "collect"; item: string; count: number }
  | { kind: "reach"; location: string }
  | { kind: "talk"; npc: string };

type QuestDef = {
  id: string;
  giver: string;
  prereq?: string;
  title: string;
  brief: string;
  turnIn: string; // authored prose for the hand-in moment
  objective: Objective;
  rewards: { gold?: number; xp?: number; items?: string[] };
};

// CONTENT — the whole quest list lives here. Main chain via prereq; the
// prose is authored, not generated filler. Counts must match the contract.
export const QUESTS: QuestDef[] = [
  {
    id: "q_wolves",
    giver: "elder",
    title: "Teeth in the Tall Grass",
    brief:
      "Wolves have taken the shepherd's flock and now they circle the palisade at dusk. Thin the pack before someone's child is next.",
    turnIn: "Five pelts. The flock sleeps easy tonight — and so do we. Take this.",
    objective: { kind: "kill", target: "wolf", count: 5 },
    rewards: { gold: 40, xp: 60 },
  },
  {
    id: "q_amulet",
    giver: "elder",
    prereq: "q_wolves",
    title: "What the Crypt Keeps",
    brief:
      "Our founder's amulet lies in the old crypt east of the fields. The dead have grown restless around it — bring it back, and mind the narrow dark.",
    turnIn: "The amulet… after all these years. You have the village's gratitude, and its coin.",
    objective: { kind: "collect", item: "founder_amulet", count: 1 },
    rewards: { gold: 80, xp: 120, items: ["potion_health"] },
  },
  // …side quests: no prereq, different givers, different objective kinds.
];

type QuestStatus = "locked" | "available" | "active" | "ready" | "done";
type QuestState = { status: QuestStatus; progress: number };

export const questState = new Map<string, QuestState>();
for (const q of QUESTS) {
  questState.set(q.id, { status: q.prereq ? "locked" : "available", progress: 0 });
}

const def = (id: string): QuestDef => QUESTS.find((q) => q.id === id)!;

export function accept(id: string): void {
  const s = questState.get(id)!;
  if (s.status !== "available") return;
  s.status = "active";
  // Contract check "can't dead-end": count pre-acceptance progress where the
  // fiction allows it (kills already made), or reset knowingly.
}

export function turnIn(id: string): { gold: number; xp: number; items: string[] } | null {
  const s = questState.get(id)!;
  if (s.status !== "ready") return null;
  s.status = "done";
  for (const q of QUESTS) {
    if (q.prereq === id && questState.get(q.id)!.status === "locked") {
      questState.get(q.id)!.status = "available"; // next chain link opens
    }
  }
  const r = def(id).rewards;
  return { gold: r.gold ?? 0, xp: r.xp ?? 0, items: r.items ?? [] };
}

function bump(q: QuestDef, s: QuestState, amount = 1): void {
  const needed = "count" in q.objective ? q.objective.count : 1;
  s.progress = Math.min(needed, s.progress + amount);
  if (s.progress >= needed) s.status = "ready"; // journal + marker flip to "return"
}

onEvent((e) => {
  for (const q of QUESTS) {
    const s = questState.get(q.id)!;
    if (s.status !== "active") continue;
    const o = q.objective;
    if (o.kind === "kill" && e.type === "enemy:died" && e.enemyKind === o.target) bump(q, s);
    if (o.kind === "collect" && e.type === "item:pickup" && e.item === o.item) bump(q, s, e.count);
    if (o.kind === "reach" && e.type === "zone:entered" && e.location === o.location) bump(q, s);
    if (o.kind === "talk" && e.type === "npc:talked" && e.npc === o.npc) bump(q, s);
  }
});
```

Journal UI, the tracked-quest compass marker, and toasts subscribe to the
same state — inventory them as screen elements at `$genex-threejs-game-ui`'s
gate. Persist `[...questState]` (plus world side-effects like opened chests)
in the per-player slot via `$genex-threejs-embed-auth`.

## 3. Dialogue walker — quest states become options

```ts
// dialogue.ts
import { QUESTS, questState, accept, turnIn } from "./quests.ts";

type DialogueOption = { label: string; next?: DialogueNode; action?: () => void };
type DialogueNode = { text: string; options: DialogueOption[] };

// CONTENT — per-NPC roots: greeting + a couple of authored lore branches.
// Three real lines is the difference between a person and a signpost.
const ROOTS: Record<string, DialogueNode> = {
  elder: {
    text: "Maren watches the road as she talks. “Strangers used to mean trade. Lately they mean trouble.”",
    options: [
      {
        label: "Tell me about this village.",
        next: {
          text: "“Three generations behind this palisade. The crypt east of here is older than all of it — and lately, louder.”",
          options: [],
        },
      },
    ],
  },
  // blacksmith, herbalist… — every giver and merchant has a root.
};

// The whole walker: render node.text + numbered options; a click (or the
// 1–9 key) runs option.action?.(), then shows option.next or closes. Emit
// { type: "npc:talked", npc } when a conversation OPENS — that's what "talk"
// objectives listen for.
export function pickOption(node: DialogueNode, index: number): DialogueNode | null {
  const opt = node.options[index];
  if (!opt) return node;
  opt.action?.();
  return opt.next ?? null; // null = close the dialogue panel
}

export function openDialogue(npc: string): DialogueNode {
  const root = ROOTS[npc];
  const options = [...root.options];
  for (const q of QUESTS) {
    if (q.giver !== npc) continue;
    const s = questState.get(q.id)!;
    if (s.status === "available") {
      options.unshift({
        label: `[Quest] ${q.title}`,
        next: {
          text: q.brief,
          options: [
            { label: "I'll do it.", action: () => accept(q.id) },
            { label: "Not now." },
          ],
        },
      });
    } else if (s.status === "active") {
      options.unshift({ label: `[${q.title}] Remind me.`, next: { text: q.brief, options: [] } });
    } else if (s.status === "ready") {
      options.unshift({
        label: `[Complete] ${q.title}`,
        next: { text: q.turnIn, options: [] },
        action: () => {
          const r = turnIn(q.id);
          // …grant r.gold / r.xp / r.items through your wallet + inventory.
        },
      });
    }
  }
  return { text: root.text, options };
}
```

## 4. Items, merchants, XP — the economy that closes

```ts
// items.ts
type ItemDef = {
  id: string;
  kind: "weapon" | "armor" | "potion" | "quest" | "tome";
  name: string;
  price: number; // what merchants charge — the SINK side of the economy
  stats?: { dmg?: number; armor?: number; heal?: number };
};

export const ITEMS: ItemDef[] = [
  { id: "sword_iron", kind: "weapon", name: "Iron Sword", price: 120, stats: { dmg: 18 } },
  { id: "potion_health", kind: "potion", name: "Health Draught", price: 25, stats: { heal: 40 } },
  { id: "founder_amulet", kind: "quest", name: "Founder's Amulet", price: 0 },
  // …the catalog. Price the first upgrade to land right after the first quest's gold.
];

// Merchant stock is per-NPC data — a second vendor is one more entry.
export const STOCKS: Record<string, string[]> = {
  blacksmith: ["sword_iron", "armor_leather"],
  herbalist: ["potion_health", "potion_mana"],
};

// XP curve + level rewards: one growth axis, wired to quest/enemy rewards.
export const xpNext = (level: number): number => Math.round(100 * level ** 1.4);
export function addXp(player: { level: number; xp: number; maxHp: number; hp: number }, amount: number): void {
  player.xp += amount;
  while (player.xp >= xpNext(player.level)) {
    player.xp -= xpNext(player.level);
    player.level += 1;
    player.maxHp += 12;
    player.hp = player.maxHp; // level-up heals — a reward the player FEELS
  }
}
```

## Seeded placement — bulk content for free

Scatter the non-authored bulk (chests, camps, flavor spawns) with a seeded
RNG so the world is deterministic across loads and machines:

```ts
export function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}
// const rng = seededRng(1337): place 10 chests at rng()-driven offsets around
// locations, skip water/steep slopes via the world's height/biome lookups
// ($genex-threejs-open-world), and hand-place only the authored few.
```

Hand-authored where it matters (quest prose, boss mechanics, unique loot),
tables for the bulk, seeds for the scatter — that split is what lets one
session ship the whole contract.
