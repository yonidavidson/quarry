// One listener on the camera, buffers fetched once, positional where it matters.
// Browsers won't start audio before a gesture, so everything routes through
// `unlock()` which the first click/keypress calls.
import * as THREE from "three";
import { AUDIO } from "./assets.ts";

const loader = new THREE.AudioLoader();
const buffers = new Map<string, THREE.Audio["buffer"]>();
let listener: THREE.AudioListener | null = null;
let unlocked = false;

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
  a.setVolume(volume);
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
  a.setVolume(volume);
  holder.add(a);
  a.play();
  a.onEnded = () => scene.remove(holder);
}

let music: THREE.Audio | null = null;
export function startMusic(volume = 0.35): void {
  const buf = buffers.get(AUDIO.music);
  if (!buf || !listener || music) return;
  music = new THREE.Audio(listener);
  music.setBuffer(buf);
  music.setLoop(true);
  music.setVolume(volume);
  music.play();
}

/** Tension bed: the track leans louder as the Stalker closes in. */
export function setMusicIntensity(t: number): void {
  if (music) music.setVolume(0.22 + Math.min(Math.max(t, 0), 1) * 0.3);
}
