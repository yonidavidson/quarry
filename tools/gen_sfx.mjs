#!/usr/bin/env node
// QUARRY sound pipeline (#49): generate the game's SFX/ambience with the
// ElevenLabs sound-generation API and embed them as base64 into index.html
// between the /*SND_DATA_START*/ ... /*SND_DATA_END*/ markers.
//
//   node tools/gen_sfx.mjs            # generate missing clips + inject
//   node tools/gen_sfx.mjs --force    # regenerate everything
//   node tools/gen_sfx.mjs --only crow,gate
//
// Key: $ELEVENLABS_API_KEY or ~/.config/elevenlabs/key
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = join(ROOT, "tools", "sfx");
const IDX = join(ROOT, "index.html");

const KEY = process.env.ELEVENLABS_API_KEY || readFileSync(join(homedir(), ".config/elevenlabs/key"), "utf8").trim();

const SOUNDS = [
  { name: "amb-wind", dur: 8, loop: true, text: "cold wind blowing steadily across a high industrial rooftop at dusk, soft gusts, distant birds far away, smooth seamless ambient loop, no music" },
  { name: "amb-machine", dur: 8, loop: true, text: "deep industrial factory hall room tone, low machinery hum, occasional distant metal clank and steam hiss, smooth seamless ambient loop, no music" },
  { name: "amb-deep", dur: 8, loop: true, text: "dark dripping underground cavern ambience, echoing water drips, faint low rumble, hollow air, smooth seamless ambient loop, no music" },
  { name: "crow", dur: 1.6, text: "a single crow caws twice and flaps its wings taking off, close, dry" },
  { name: "roar", dur: 2.2, text: "monstrous alien creature roar, guttural and wet with clicking mandibles, aggressive, close range" },
  { name: "leap", dur: 1.2, text: "large beast lunging forward: sharp guttural snarl with a fast air whoosh" },
  { name: "gate", dur: 1.6, text: "heavy steel security gate slamming shut, loud metallic clang with echoing rattle in a factory hall" },
  { name: "boom", dur: 2, text: "grenade explosion inside a metal warehouse, punchy blast with metal debris rattle and echo" },
  { name: "shot", dur: 0.8, text: "single sci-fi energy blaster shot, punchy retro laser with a slight metallic tail" },
  { name: "shotgun", dur: 1.2, text: "pump-action shotgun blast close up, deep punchy boom, then the pump rack" },
  { name: "rail", dur: 1.4, text: "electromagnetic railgun firing: rising charge whine then a piercing supersonic crack" },
  { name: "splash", dur: 1.2, text: "a body jumping into thick shallow sewage water, heavy gloopy splash" },
  { name: "hurt", dur: 0.8, text: "man grunting sharply in pain, short single grunt" },
  { name: "kill", dur: 1.1, text: "small robotic drone exploding with a crunchy electrical zap and metal parts scattering" },
  { name: "theme", dur: 22, loop: true, text: "dark brooding retro synthwave chase theme, tense pulsing bassline, eerie lead melody, 80s horror movie soundtrack, seamless loop, instrumental" },
  { name: "jump", dur: 0.5, text: "quick agile jump: soft grunt with cloth whoosh" },
  { name: "jump2", dur: 0.5, text: "energetic double-jump flip whoosh, airy" },
  { name: "claw", dur: 0.6, text: "sharp claw swipe slicing fast through air, whistling cut" },
  { name: "scatter", dur: 0.8, text: "scattergun burst: three rapid overlapping muffled shots" },
  { name: "mgun", dur: 0.5, text: "single machine gun shot, dry and punchy, small calibre" },
  { name: "crossbow", dur: 0.7, text: "crossbow firing: taut string twang and bolt whoosh" },
  { name: "flame", dur: 0.5, text: "short flamethrower burst, fiery hiss" },
  { name: "spines", dur: 0.7, text: "wet organic spikes launching, fleshy triple thwip" },
  { name: "whip", dur: 0.7, text: "sharp whip crack with a thin tail" },
  { name: "bat", dur: 0.6, text: "heavy club swing, deep air whoosh" },
  { name: "thunk", dur: 0.6, text: "heavy blunt impact with a meaty crunch" },
  { name: "clunk", dur: 0.8, text: "heavy industrial lever clunk, big mechanism engaging with metal echo" },
  { name: "pickup", dur: 0.6, text: "bright arcade energy pickup chime, sparkling metallic ding" },
  { name: "plink", dur: 0.5, text: "tiny metallic plink, a drop of water on a pipe" },
  { name: "toss", dur: 0.5, text: "small object tossed with a short whoosh" },
  { name: "warp", dur: 1.2, text: "sci-fi teleporter zap: rising shimmer and phase pop" },
  { name: "win", dur: 2.5, text: "triumphant short retro arcade victory sting, rising synth fanfare" },
  { name: "lose", dur: 2.5, text: "dark defeat sting: three descending ominous synth notes, retro arcade" },
  { name: "heart", dur: 0.6, text: "single deep heartbeat thump, sub-heavy, dry" },
  { name: "land", dur: 0.6, text: "heavy boots landing on a metal floor with a dusty thud" },
  { name: "slosh", dur: 0.5, text: "single footstep wading through thick swampy water" },
  { name: "step", dur: 0.5, text: "single boot footstep on a metal industrial floor, short and dry" },
];

const args = process.argv.slice(2);
const FORCE = args.includes("--force");
const only = args.includes("--only") ? args[args.indexOf("--only") + 1].split(",") : null;

mkdirSync(CACHE, { recursive: true });

async function gen(s) {
  const f = join(CACHE, `${s.name}.mp3`);
  if (existsSync(f) && !FORCE && !(only || []).includes(s.name)) { console.log(`cached  ${s.name}`); return; }
  const res = await fetch("https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_22050_32", {
    method: "POST",
    headers: { "xi-api-key": KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ text: s.text, duration_seconds: s.dur, prompt_influence: 0.55, ...(s.loop ? { loop: true } : {}) }),
  });
  if (!res.ok) throw new Error(`${s.name}: HTTP ${res.status} ${await res.text()}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(f, buf);
  console.log(`made    ${s.name}  ${(buf.length / 1024).toFixed(1)}KB`);
}

for (const s of SOUNDS) if (!only || only.includes(s.name)) await gen(s);

// inject into index.html
const data = {};
let total = 0;
for (const s of SOUNDS) {
  const f = join(CACHE, `${s.name}.mp3`);
  if (!existsSync(f)) continue;
  const b = readFileSync(f);
  total += b.length;
  data[s.name] = `data:audio/mpeg;base64,${b.toString("base64")}`;
}
const src = readFileSync(IDX, "utf8");
const out = src.replace(/\/\*SND_DATA_START\*\/[\s\S]*?\/\*SND_DATA_END\*\//, `/*SND_DATA_START*/${JSON.stringify(data)}/*SND_DATA_END*/`);
if (out === src) throw new Error("SND_DATA markers not found in index.html");
writeFileSync(IDX, out);
console.log(`injected ${Object.keys(data).length} clips, ${(total / 1024).toFixed(0)}KB raw (${((total * 4) / 3 / 1024).toFixed(0)}KB base64)`);
