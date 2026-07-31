// One listener on the camera, buffers fetched once, positional where it matters.
// Browsers won't start audio before a gesture, so everything routes through
// `unlock()` which the first click/keypress calls.
import * as THREE from "three";
import { AUDIO } from "./assets.ts";

const loader = new THREE.AudioLoader();
const buffers = new Map<string, THREE.Audio["buffer"]>();
let listener: THREE.AudioListener | null = null;
let unlocked = false;

// Volume is player-owned and persisted (Settings in the pause menu). Everything
// else multiplies these two masters — music is a bed, sfx is everything else.
let musicVol = loadVol("quarry.music", 0.35);
let sfxVol = loadVol("quarry.sfx", 0.7);

function loadVol(key: string, fallback: number): number {
  const v = Number(localStorage.getItem(key));
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback;
}

export function setMusicVolume(v: number): void {
  musicVol = Math.min(1, Math.max(0, v));
  localStorage.setItem("quarry.music", String(musicVol));
  if (music) music.setVolume(musicVol * musicIntensity);
}

export function setSfxVolume(v: number): void {
  sfxVol = Math.min(1, Math.max(0, v));
  localStorage.setItem("quarry.sfx", String(sfxVol));
}

export function getMusicVolume(): number { return musicVol; }
export function getSfxVolume(): number { return sfxVol; }

export function initAudio(camera: THREE.Camera): void {
  listener = new THREE.AudioListener();
  camera.add(listener);
  for (const url of Object.values(AUDIO)) {
    loader.load(url, (buf) => buffers.set(url, buf), undefined, () => {
      /* a missing sound must never take the game down */
    });
  }
  const unlock = () => {
    if (unlocked || !listener) return;
    unlocked = true;
    void listener.context.resume();
  };
  addEventListener("pointerdown", unlock, { once: true });
  addEventListener("keydown", unlock, { once: true });
}

/** Fire-and-forget 2D sound. */
export function play(url: string, volume = 1, rate = 1): void {
  const buf = buffers.get(url);
  if (!buf || !listener || !unlocked) return;
  const a = new THREE.Audio(listener);
  a.setBuffer(buf);
  a.setVolume(volume * sfxVol);
  a.setPlaybackRate(rate);
  a.play();
}

/** A sound that belongs to a place — the whole point of the Stalker being audible
 *  before it is visible. Returns the object so the caller can move it. */
export function playAt(url: string, at: THREE.Vector3, scene: THREE.Scene, volume = 1, refDistance = 12): void {
  const buf = buffers.get(url);
  if (!buf || !listener || !unlocked) return;
  const holder = new THREE.Object3D();
  holder.position.copy(at);
  scene.add(holder);
  const a = new THREE.PositionalAudio(listener);
  a.setBuffer(buf);
  a.setRefDistance(refDistance);
  a.setVolume(volume * sfxVol);
  holder.add(a);
  a.play();
  a.onEnded = () => scene.remove(holder);
}

let music: THREE.Audio | null = null;
let musicIntensity = 0.22;
/** The one bed, started quietly on the menu. The loop's setMusicIntensity owns
 *  its level from there — pressure 0 is a menu-ish hush, pressure 1 is the
 *  full chase. */
export function startMenuMusic(): void {
  const buf = buffers.get(AUDIO.music);
  if (!buf || !listener) return;
  if (!music) {
    music = new THREE.Audio(listener);
    music.setBuffer(buf);
    music.setLoop(true);
    music.setVolume(musicVol * musicIntensity);
  }
  if (music.isPlaying) return;
  if (unlocked) music.play();
  else addEventListener("pointerdown", () => music?.play(), { once: true });
}

/** Tension bed: the track leans louder as the Stalker closes in. */
export function setMusicIntensity(t: number): void {
  musicIntensity = 0.22 + Math.min(Math.max(t, 0), 1) * 0.3;
  if (music) music.setVolume(musicVol * musicIntensity);
}

// ── Menu UI sounds ──
// The two `npx genex sfx` ticks (hover + confirm) are queued for the Aug 4 credit
// refill (see DESIGN.md). Until then these WebAudio blips keep the menu from
// being silent — the same register (short metallic industrial clicks).
const ac = (): AudioContext | null => listener?.context ?? null;

function blip(vol: number, freq: number, dur: number, type: OscillatorType): void {
  const ctx = ac();
  if (!ctx || !unlocked) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t = ctx.currentTime;
  g.gain.setValueAtTime(vol * sfxVol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

/** Menu hover — a short, faint metallic tick. */
export function uiTick(): void {
  blip(0.12, 1900, 0.05, "square");
}

/** Menu confirm — a heavier two-note mechanical thunk. */
export function uiConfirm(): void {
  blip(0.2, 320, 0.09, "square");
  setTimeout(() => blip(0.16, 180, 0.12, "sine"), 45);
}
