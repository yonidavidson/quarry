// The screen set: loading → menu (side select) → playing ⇄ paused → over.
// Everything that is not gameplay lives behind `data-phase` on <body>, so no
// other system has to guess at game state. Escape pauses; it is not just a
// pointer-lock release.
//
// This is still hand-built chrome. The generated menu art and HUD sprites
// replace the look, not the machine — see issues #77 and #78.
import { KEY_ART } from "../assets.ts";

export type Phase = "loading" | "menu" | "playing" | "paused" | "over";
export type Side = "jack" | "stalker";

const CSS = `
#screens { position:fixed; inset:0; z-index:50; display:none; place-content:center;
  background:#05070b;
  font:600 13px/1.6 ui-monospace,"SF Mono",Menlo,monospace; letter-spacing:.12em;
  color:#cfd6df; text-transform:uppercase; text-align:center; }
body[data-phase="loading"] #screens, body[data-phase="menu"] #screens,
body[data-phase="paused"] #screens { display:grid; }
/* the key art sits behind every non-gameplay screen, dimmed enough to read over */
#screens::before { content:""; position:absolute; inset:0; background-size:cover;
  background-position:center; opacity:1; }
/* the art is already near-black — this only has to protect the type, not dim
   the picture, so keep it a soft vignette rather than a scrim */
#screens::after { content:""; position:absolute; inset:0;
  background:radial-gradient(78% 78% at 50% 42%, transparent 0%, #05070bcc 100%); }
#screens .panel { position:relative; z-index:1; display:grid; gap:26px; justify-items:center; padding:0 24px; }
#screens h1 { margin:0; font-size:clamp(38px,9vw,74px); letter-spacing:.34em;
  color:#e8542c; text-shadow:0 0 34px #e8542c44; }
#screens .tag { color:#7c848f; font-size:12px; letter-spacing:.24em; }
#screens .bar { width:min(340px,70vw); height:3px; background:#1a1d22; overflow:hidden; }
#screens .bar i { display:block; height:100%; width:35%; background:#e8542c;
  animation:sweep 1.1s ease-in-out infinite; }
@keyframes sweep { 0%{transform:translateX(-100%)} 100%{transform:translateX(385%)} }
#screens .sides { display:flex; gap:18px; flex-wrap:wrap; justify-content:center; }
#screens .side { pointer-events:auto; cursor:pointer; width:min(260px,80vw); padding:20px 18px;
  background:#0d1116; border:1px solid #262b33; display:grid; gap:9px; text-align:left;
  transition:border-color .15s, transform .15s, background .15s; }
#screens .side:hover { border-color:#e8542c; transform:translateY(-3px); background:#121820; }
#screens .side b { color:#e8e5df; font-size:15px; letter-spacing:.18em; }
#screens .side .role { color:#e8542c; font-size:11px; letter-spacing:.22em; }
#screens .side.prey .role { color:#4ee08a; }
#screens .side p { margin:0; color:#79818c; font-size:11px; line-height:1.7;
  letter-spacing:.06em; text-transform:none; }
#screens .keys { color:#5d646d; font-size:11px; letter-spacing:.16em; }
#screens button.plain { pointer-events:auto; cursor:pointer; background:none; border:1px solid #333a44;
  color:#cfd6df; font:inherit; padding:11px 26px; letter-spacing:.18em; text-transform:uppercase; }
#screens button.plain:hover { border-color:#e8542c; color:#fff; }
`;

export class Screens {
  private el: HTMLDivElement;
  private phase: Phase = "loading";
  /** Resolves with the side the player picked. */
  readonly chosen: Promise<Side>;
  private resolve!: (s: Side) => void;

  constructor() {
    const style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);

    this.el = document.createElement("div");
    this.el.id = "screens";
    document.body.appendChild(this.el);
    // set on the element so the URL stays in assets.ts rather than in the CSS
    const art = document.createElement("style");
    art.textContent = `#screens::before { background-image:url("${KEY_ART}"); }`;
    document.head.appendChild(art);
    this.chosen = new Promise<Side>((r) => (this.resolve = r));
    this.set("loading");
  }

  set(phase: Phase): void {
    this.phase = phase;
    document.body.dataset.phase = phase;
    if (phase === "loading") this.renderLoading();
    else if (phase === "menu") this.renderMenu();
    else if (phase === "paused") this.renderPaused();
    else this.el.innerHTML = "";
  }

  get current(): Phase { return this.phase; }

  private renderLoading(): void {
    this.el.innerHTML = `
      <div class="panel">
        <h1>Quarry</h1>
        <div class="tag">waking the complex</div>
        <div class="bar"><i></i></div>
      </div>`;
  }

  private renderMenu(): void {
    this.el.innerHTML = `
      <div class="panel">
        <h1>Quarry</h1>
        <div class="tag">pick a side</div>
        <div class="sides">
          <div class="side prey" data-side="jack">
            <span class="role">prey</span>
            <b>Jack</b>
            <p>A blaster, five hits of health and no way up. Cover stops bullets;
               nothing stops what is on the ceiling. Find five cells and reach
               extraction — or kill it first.</p>
          </div>
          <div class="side" data-side="stalker">
            <span class="role">predator</span>
            <b>The Stalker</b>
            <p>No gun and no need for one. Climb the walls, cross the ceiling,
               drop on him. Six hits of health and the only vertical movement in
               the complex.</p>
          </div>
        </div>
        <div class="keys">wasd move &middot; shift run &middot; space jump &middot; click to aim &middot; esc pauses</div>
      </div>`;
    this.el.querySelectorAll<HTMLElement>(".side").forEach((card) => {
      card.addEventListener("click", () => this.resolve(card.dataset.side as Side));
    });
  }

  private renderPaused(): void {
    this.el.innerHTML = `
      <div class="panel">
        <h1>Paused</h1>
        <div class="tag">the complex waits</div>
        <button class="plain" data-act="resume">Resume</button>
        <div class="keys">esc or click to go back in</div>
      </div>`;
    this.el.querySelector<HTMLElement>('[data-act="resume"]')
      ?.addEventListener("click", () => this.set("playing"));
  }
}
