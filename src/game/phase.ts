// The screen set: loading → menu (side select) → playing ⇄ paused → over.
// Everything that is not gameplay lives behind `data-phase` on <body>, so no
// other system has to guess at game state. Escape pauses; it is not just a
// pointer-lock release.
//
// The look is the generated chain: key-art → menu still → looping menu video
// behind the logotype and the side-select rail (issues #77/#78). The sprites
// and the video are URLs from assets.ts — nothing is committed but the code.
import { MENU_STILL, LOGO } from "../assets.ts";
import { startMenuMusic, setMusicVolume, setSfxVolume, getMusicVolume, getSfxVolume, uiTick, uiConfirm } from "../audio.ts";

export type Phase = "loading" | "menu" | "lobby" | "playing" | "paused" | "over";
export type Side = "jack" | "stalker";
/** What the player picked on the menu. Online does not choose a side — the host
 *  assigns them, because the two seats are different roles, not preferences. */
export type Choice = { mode: "solo"; side: Side } | { mode: "online" };

const CSS = `
#screens { position:fixed; inset:0; z-index:50; display:none; place-content:center;
  background:#05070b; color:#cfd6df; text-align:center; overflow:hidden; }
body[data-phase="loading"] #screens, body[data-phase="menu"] #screens,
body[data-phase="lobby"] #screens, body[data-phase="paused"] #screens { display:grid; }
/* the still (or key art until it lands) sits behind every non-gameplay screen.
   It carries a slow breathing pan/zoom — the looping clip replaces it wholesale
   when the credits refill pays for one (#77). */
#screens::before { content:""; position:absolute; inset:0; background-size:cover;
  background-position:center 30%; animation:breathe 22s ease-in-out infinite alternate; }
@keyframes breathe { from { transform:scale(1) } to { transform:scale(1.07) } }
#screens::after { content:""; position:absolute; inset:0;
  background:radial-gradient(78% 78% at 50% 42%, transparent 0%, #05070bcc 100%);
  pointer-events:none; }
/* the looping menu video sits between the still and the content */
#screens .menu-bg { position:absolute; inset:0; pointer-events:none; }
#screens .menu-bg video { position:absolute; inset:0; width:100%; height:100%;
  object-fit:cover; opacity:0; }
#screens .panel { position:relative; z-index:2; display:grid; gap:22px;
  justify-items:center; padding:24px; animation:screenin .45s ease both; }
@keyframes screenin { from { opacity:0 } to { opacity:1 } }
#screens .logo { width:min(600px, 74vw); height:auto; filter:drop-shadow(0 4px 22px rgba(232,84,44,.28))
  drop-shadow(0 2px 6px #000); pointer-events:none; }
#screens .tag { color:#a7adb6; font:600 12px/1.6 "Oswald", "Arial Narrow", sans-serif;
  letter-spacing:.3em; text-transform:uppercase; text-shadow:0 1px 4px #000; }
#screens .bar { width:min(340px,70vw); height:3px; background:#1a1d22; overflow:hidden; }
#screens .bar i { display:block; height:100%; width:35%; background:#e8542c;
  animation:sweep 1.1s ease-in-out infinite; }
@keyframes sweep { 0%{transform:translateX(-100%)} 100%{transform:translateX(385%)} }
/* only a thin scrim strictly behind the rail — never a panel over the art */
#screens .rail { position:relative; display:grid; gap:12px; justify-items:stretch;
  width:min(430px, 84vw); padding:18px 26px;
  background:linear-gradient(180deg, rgba(5,7,11,.38), rgba(5,7,11,.72)); }
#screens .rail::before { content:""; position:absolute; inset:0;
  border-top:1px solid #2a3038; border-bottom:1px solid #2a3038; pointer-events:none; }
#screens .card { pointer-events:auto; cursor:pointer; border:1px solid #2a3038;
  background:rgba(11,14,19,.55); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px);
  display:grid; gap:6px; text-align:left; padding:14px 16px; position:relative;
  font-family:"Oswald","Arial Narrow",sans-serif;
  transition:border-color .15s, transform .15s, background .15s; }
#screens .card:hover, #screens .card.is-selected { border-color:#e8542c; transform:translateY(-2px);
  background:rgba(20,16,13,.62); }
#screens .card.is-selected::before { content:"❯"; position:absolute; left:-1.1em;
  color:#e8542c; font-size:15px; }
#screens .card b { color:#e8e5df; font:400 17px/1.2 "Black Ops One", Impact, sans-serif;
  letter-spacing:.12em; }
#screens .card .role { color:#e8542c; font-size:11px; letter-spacing:.24em; }
#screens .card.prey .role { color:#4ee08a; }
#screens .card p { margin:0; color:#98a0aa; font-size:12.5px; line-height:1.55;
  letter-spacing:.03em; }
#screens .card.online { justify-items:center; text-align:center; padding:12px 16px;
  font:600 13px/1.4 "Oswald", sans-serif; letter-spacing:.22em; color:#d9dee5; }
#screens .keys { color:#717983; font:500 11px/1.7 "Oswald", sans-serif; letter-spacing:.2em;
  text-transform:uppercase; }
/* pause + settings */
#screens .pause { width:min(420px,86vw); display:grid; gap:16px; justify-items:stretch;
  padding:18px 26px; background:rgba(8,10,15,.6); border:1px solid #262b33; text-align:left; }
#screens .pause .head { display:flex; justify-content:space-between; align-items:baseline; }
#screens .pause .head b { font:400 24px/1.2 "Black Ops One", Impact, sans-serif;
  letter-spacing:.18em; color:#e8e5df; }
#screens .slider { display:grid; gap:5px; font:500 11px/1.4 "Oswald", sans-serif;
  letter-spacing:.24em; text-transform:uppercase; color:#8b929c; }
#screens .slider input { width:100%; accent-color:#e8542c; }
#screens .pause button.plain { pointer-events:auto; cursor:pointer; background:none;
  border:1px solid #333a44; color:#cfd6df; font:600 13px/1.4 "Oswald", sans-serif;
  letter-spacing:.22em; text-transform:uppercase; padding:11px 26px; }
#screens .pause button.plain:hover, #screens .pause button.plain:focus-visible { border-color:#e8542c; color:#fff; }
`;

/** Deterministic seamless loop for the menu clip: two stacked <video>s with the
 *  same src crossfade at the cycle end, so the residual seam never shows. */
function seamlessLoop(holder: HTMLElement, url: string, fade = 0.6): void {
  const mk = (): HTMLVideoElement => {
    const v = document.createElement("video");
    v.src = url; v.muted = true; v.playsInline = true; v.preload = "auto";
    holder.appendChild(v);
    return v;
  };
  let front = mk(), back = mk();
  front.style.opacity = "1";
  void front.play();
  const tick = (): void => {
    if (front.duration > 0 && front.currentTime >= front.duration - fade && back.paused) {
      back.currentTime = 0;
      void back.play();
      front.style.transition = back.style.transition = `opacity ${fade}s linear`;
      back.style.opacity = "1";
      front.style.opacity = "0";
      const old = front; front = back; back = old;
      window.setTimeout(() => back.pause(), fade * 1000 + 50);
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export class Screens {
  private el: HTMLDivElement;
  private bg: HTMLElement;
  private phase: Phase = "loading";
  /** Resolves with what the player picked on the menu. */
  readonly chosen: Promise<Choice>;
  private resolve!: (c: Choice) => void;
  /** Set by the online lobby so the waiting screen can report the count. */
  lobbyLine = "";
  /** Live-hooked to the FollowCamera's aimSensitivity (set once it exists). */
  onSensitivity: ((v: number) => void) | null = null;
  /** Mouse-look sensitivity, persisted. */
  sensitivity = Number(localStorage.getItem("quarry.look")) || 0.0023;
  private menuButtons: HTMLElement[] = [];
  private menuSel = 0;

  constructor() {
    const style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);

    this.el = document.createElement("div");
    this.el.id = "screens";
    this.el.innerHTML = `<div class="menu-bg"></div>`;
    document.body.appendChild(this.el);
    this.bg = this.el.querySelector(".menu-bg") as HTMLElement;
    // The still is the menu/loader backdrop from the first frame — it is the
    // key art made menu-safe (UI-free, calm lower third). attachStill() only
    // exists so a late-landing still can still replace a stand-in; here the
    // still is already permanent, so it IS the default.
    this.setBackdrop(MENU_STILL);
    this.chosen = new Promise<Choice>((r) => (this.resolve = r));
    this.set("loading");

    // Menus are keyboard-first: the arrows drive the same selection the mouse
    // does, Enter activates. Scoped to menu/lobby/paused — never gameplay.
    document.addEventListener("keydown", (e) => {
      if (this.phase !== "menu" && this.phase !== "lobby" && this.phase !== "paused") return;
      if (this.phase === "paused") return; // pause keys (Esc/Resume) are handled in main
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        this.moveMenu(e.key === "ArrowDown" ? 1 : -1);
      } else if (e.key === "Enter") {
        const b = this.menuButtons[this.menuSel];
        if (b) { e.preventDefault(); b.click(); }
      }
    });
  }

  /** The still is the menu/loader backdrop from the first frame. If a future
   *  generation ever lands late, re-point the backdrop here. */
  setBackdrop(url: string): void {
    const s = document.createElement("style");
    s.textContent = `#screens::before { background-image:url("${url}"); }`;
    document.head.appendChild(s);
  }

  /** The looping clip that animates the still — phone tiers keep the poster. */
  attachMenuVideo(url: string): void {
    if (!url || this.bg.childElementCount > 0) return;
    seamlessLoop(this.bg, url);
  }

  set(phase: Phase): void {
    this.phase = phase;
    document.body.dataset.phase = phase;
    if (phase === "loading") this.renderLoading();
    else if (phase === "menu") this.renderMenu();
    else if (phase === "lobby") this.renderLobby();
    else if (phase === "paused") this.renderPaused();
    else this.el.innerHTML = "";
  }

  get current(): Phase { return this.phase; }

  private moveMenu(d: number): void {
    if (!this.menuButtons.length) return;
    this.menuSel = (this.menuSel + d + this.menuButtons.length) % this.menuButtons.length;
    this.markMenu();
    uiTick();
  }

  private markMenu(): void {
    this.menuButtons.forEach((b, i) => b.classList.toggle("is-selected", i === this.menuSel));
  }

  private wireMenu(btns: HTMLElement[], acts: Array<() => void>): void {
    this.menuButtons = btns;
    this.menuSel = 0;
    btns.forEach((b, i) => {
      b.addEventListener("mouseenter", () => { this.menuSel = i; this.markMenu(); uiTick(); });
      b.addEventListener("click", () => { b.blur(); uiConfirm(); acts[i](); });
    });
    this.markMenu();
  }

  private renderLoading(): void {
    this.el.innerHTML = `
      <div class="panel">
        <img class="logo" src="${LOGO}" alt="QUARRY" />
        <div class="tag">waking the complex</div>
        <div class="bar"><i></i></div>
      </div>`;
  }

  private renderMenu(): void {
    startMenuMusic();
    this.el.innerHTML = `
      <div class="panel">
        <img class="logo" src="${LOGO}" alt="QUARRY" />
        <div class="tag">hunt, or be hunted</div>
        <div class="rail">
          <button class="card prey" data-side="jack" type="button">
            <span class="role">prey</span>
            <b>Jack</b>
            <p>A blaster, five hits of health and no way up. Cover stops bullets;
               nothing stops what is on the ceiling. Find five cells and reach
               extraction — or kill it first.</p>
          </button>
          <button class="card" data-side="stalker" type="button">
            <span class="role">predator</span>
            <b>The Stalker</b>
            <p>No gun and no need for one. Climb the walls, cross the ceiling,
               drop on him. Six hits of health and the only vertical movement in
               the complex.</p>
          </button>
          <button class="card online" data-act="online" type="button">
            Play online — hunt a friend
          </button>
        </div>
        <div class="keys">↑↓ choose · enter commit · wasd move · esc pauses</div>
      </div>`;
    const jack = this.el.querySelector<HTMLElement>('[data-side="jack"]')!;
    const stalker = this.el.querySelector<HTMLElement>('[data-side="stalker"]')!;
    const online = this.el.querySelector<HTMLElement>('[data-act="online"]')!;
    this.wireMenu([jack, stalker, online], [
      () => this.resolve({ mode: "solo", side: "jack" }),
      () => this.resolve({ mode: "solo", side: "stalker" }),
      () => this.resolve({ mode: "online" }),
    ]);
  }

  /** Only ever shown AFTER the player committed to online and holds a seat. */
  private renderLobby(): void {
    this.el.innerHTML = `
      <div class="panel">
        <img class="logo" src="${LOGO}" alt="QUARRY" />
        <div class="tag">${this.lobbyLine || "finding an opponent"}</div>
        <div class="bar"><i></i></div>
        <p class="keys" style="max-width:44ch;text-transform:none;letter-spacing:.04em;line-height:1.8">
          This needs a second player. Send someone this page and have them press
          <b>Play online</b> too &mdash; the match starts the moment they arrive.<br><br>
          One of you will be Jack. The other will be the thing hunting him.
          You do not get to choose.</p>
        <button class="card online" data-act="cancel" type="button">Back to menu</button>
      </div>`;
    const cancel = this.el.querySelector<HTMLElement>('[data-act="cancel"]')!;
    cancel.addEventListener("click", () => this.onCancel?.());
    this.wireMenu([cancel], [() => this.onCancel?.()]);
  }

  /** Set by the caller so leaving the queue can free the seat. */
  onCancel: (() => void) | null = null;

  /** Refresh just the lobby's count line without rebuilding the screen. */
  setLobbyLine(text: string): void {
    this.lobbyLine = text;
    const tag = this.el.querySelector(".tag");
    if (tag && this.phase === "lobby") tag.textContent = text;
  }

  private renderPaused(): void {
    this.el.innerHTML = `
      <div class="panel">
        <div class="pause">
          <div class="head"><b>Paused</b><span class="tag">the complex waits</span></div>
          <label class="slider">music
            <input type="range" min="0" max="1" step="0.01" value="${getMusicVolume()}" data-vol="music">
          </label>
          <label class="slider">sfx
            <input type="range" min="0" max="1" step="0.01" value="${getSfxVolume()}" data-vol="sfx">
          </label>
          <label class="slider">look
            <input type="range" min="0.0008" max="0.005" step="0.0001" value="${this.sensitivity}" data-vol="look">
          </label>
          <button class="plain" data-act="resume" type="button">Resume</button>
          <div class="keys">esc to go back in</div>
        </div>
      </div>`;
    this.el.querySelectorAll<HTMLInputElement>('input[data-vol]').forEach((sl) => {
      sl.addEventListener("input", () => {
        const v = Number(sl.value);
        if (sl.dataset.vol === "music") setMusicVolume(v);
        else if (sl.dataset.vol === "sfx") setSfxVolume(v);
        else {
          this.sensitivity = v;
          localStorage.setItem("quarry.look", String(v));
          this.onSensitivity?.(v);
        }
      });
    });
    this.el.querySelector<HTMLElement>('[data-act="resume"]')
      ?.addEventListener("click", () => this.set("playing"));
  }
}
