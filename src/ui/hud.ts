// The generated sprite HUD (issue #78) — replaces the hand-written scaffolding
// with the art from the Stage-2 sheet: health slots, the segmented threat meter,
// the energy-cell counter and the weapon frame. Chrome is sprites; numbers,
// labels and the fill are DOM. Crosshair stays CSS (a primitive, styled to the
// brief).
//
// Wire-note stopgap: the threat meter's channel mask is DERIVED from the frame
// art (channel band rows 22-48 minus the ~15px separator columns) because the
// sheet's green annotated twin was drawn shaded and off-registration, and the
// model-edit that would fix it (region `--edit` + `--clean` + `genex ui masks`)
// waits on the Aug 4 credit refill. fillBox below was measured from the art.
// When the real mask lands, swap `threat-mask.png` and the FB values.
//
// Text colors: the brief's hexes (sodium orange #e8542c, cell green #4ee08a,
// slate #cfd6df). `genex ui text-color` sampling of the mockup regions is
// recorded for the visual pass — the mockup's widget boxes need an eyeball
// first.
import { NEED_CELLS } from "../game/hunt.ts";
import type { WinReason } from "../game/hunt.ts";
import type { StalkerState } from "../hunter/stalker.ts";

// Threat-meter channel, normalized to the frame sprite (measured from the art):
// the recessed band rows 22-48, x 10-438 of the 450x81 frame.
const FB = { x: 0.0222, y: 0.2716, w: 0.9511, h: 0.3210 };
const H_FULL = "/assets/hud/hp-full.png";
const H_EMPTY = "/assets/hud/hp-empty.png";

const CSS = `
#hud { position:fixed; inset:0; pointer-events:none; color:#cfd6df;
  font:500 13px/1.3 "Oswald","Arial Narrow",sans-serif; letter-spacing:.12em;
  text-transform:uppercase; text-shadow:0 1px 4px #000; }
#hud .tl { position:absolute; top:0; left:0; display:flex; flex-direction:column; gap:12px; }
#hud .slots { display:flex; gap:5px; }
#hud .slots img { display:block; }
#hud .cellsrow { display:flex; align-items:stretch; gap:12px; }
#hud .cellpanel { position:relative; }
#hud .cellpanel img { display:block; width:100%; height:100%; }
#hud .cellpanel .num { position:absolute; inset:0; display:grid; place-items:center;
  color:#4ee08a; font:400 30px/1 "Black Ops One",Impact,sans-serif;
  text-shadow:0 0 12px #4ee08a88, 0 1px 3px #000; }
#hud .cellmeta { display:flex; flex-direction:column; justify-content:center; gap:4px; }
#hud .cellmeta .label { font-size:10px; color:#7c848f; letter-spacing:.22em; }
#hud .cellmeta .kill { font-size:11px; color:#7c848f; }
#hud .cellmeta .kill b { color:#e8542c; font-weight:600; }
#hud .tr { position:absolute; top:0; right:0; text-align:right; }
#hud .danger { font-size:12px; color:#8b929c; letter-spacing:.18em; }
#hud .danger.hot { color:#ff7a3c; }
#hud .danger.above { color:#ff3b2f; animation:pulse .7s ease-in-out infinite; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.45} }
#hud .threat { position:relative; }
#hud .threat .frame { position:absolute; inset:0; width:100%; height:100%; object-fit:fill; }
#hud .threat .channel { position:absolute; inset:0; overflow:hidden;
  -webkit-mask-image:url(/assets/hud/threat-mask.png); mask-image:url(/assets/hud/threat-mask.png);
  -webkit-mask-size:100% 100%; mask-size:100% 100%; mask-repeat:no-repeat; }
#hud .threat .fill { position:absolute; inset:0;
  background:linear-gradient(180deg,#ffb070 0%,#ff7a3c 55%,#e8542c 100%); }
#hud .crosshair { position:absolute; left:50%; top:50%; width:3px; height:3px; margin:-1.5px 0 0 -1.5px;
  background:#dfe7f2; box-shadow:0 0 0 1px rgba(0,0,0,.55), 0 0 4px #000; opacity:.85;
  transition:transform .06s ease-out, background .1s; }
#hud .crosshair.fired { transform:scale(3.4); background:#ffd9a0; }
#hud .crosshair.inrange { background:#ff6a3c; box-shadow:0 0 0 1px rgba(0,0,0,.55), 0 0 9px #ff6a3c; }
/* absolute, not relative: layout() positions this by right/bottom, which a
   relatively-positioned box ignores — it flowed to the top-left instead and sat
   on top of the health slots. */
#hud .gun { position:absolute; }
#hud .gun .frame { position:absolute; inset:0; width:100%; height:100%; object-fit:fill; }
#hud .gun .name { position:absolute; left:6%; top:7%; font-size:15px; letter-spacing:.2em;
  color:#ffb070; text-shadow:0 1px 3px #000; }
#hud .gun .rounds { position:absolute; right:9%; bottom:18%; font:400 40px/1 "Black Ops One",Impact,sans-serif;
  letter-spacing:.04em; color:#e8eef7; text-shadow:0 2px 6px #000; }
#hud .gun .rounds.low { color:#ff5a3c; animation:pulse .7s ease-in-out infinite; }
#hud .gun .swap { position:absolute; left:6%; bottom:7%; font-size:10px; color:#6b727c; }
#hud .end { position:absolute; inset:0; display:grid; place-content:center; text-align:center; gap:14px;
  background:#05070bdd; pointer-events:auto; }
#hud .end h1 { margin:0; font:400 44px/1.1 "Black Ops One",Impact,sans-serif; letter-spacing:.16em;
  color:#e8e5df; }
#hud .end.won h1 { color:#4ee08a; } #hud .end.lost h1 { color:#e8542c; }
#hud .end p { margin:0; color:#8b929c; font-size:13px; letter-spacing:.14em; }
#hud .hurt { position:absolute; inset:0; box-shadow:inset 0 0 140px #c0202088; opacity:0; transition:opacity .12s; }
#hud .pick { position:absolute; left:50%; bottom:22%; transform:translateX(-50%); font-size:14px;
  letter-spacing:.24em; color:#ffb070; opacity:0; transition:opacity .25s; }
`;

export class Hud {
  private needCells: number;
  private el: HTMLDivElement;
  private slots: HTMLImageElement[] = [];
  private cellNumEl: HTMLElement;
  private cellsLabelEl: HTMLElement;
  private killEl!: HTMLElement;
  private dangerEl: HTMLElement;
  private threatEl: HTMLElement;
  private threatFillEl: HTMLElement;
  private endEl: HTMLElement;
  private hurtEl: HTMLElement;
  private gunEl!: HTMLElement;
  private gunNameEl!: HTMLElement;
  private roundsEl!: HTMLElement;
  private pickEl!: HTMLElement;
  private pickTimer: ReturnType<typeof setTimeout> | undefined;
  private s = 1;

  constructor(maxHp: number, needCells = NEED_CELLS) {
    this.needCells = needCells;
    const style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);

    this.el = document.createElement("div");
    this.el.id = "hud";
    this.el.innerHTML = `
      <div class="tl">
        <div class="slots"></div>
        <div class="cellsrow">
          <div class="cellpanel"><img src="/assets/hud/cell-counter.png" alt=""><span class="num">&nbsp;</span></div>
          <div class="cellmeta">
            <span class="label">cells</span>
            <span class="kill">&nbsp;</span>
          </div>
        </div>
      </div>
      <div class="tr">
        <div class="danger">no contact</div>
        <div class="threat">
          <img class="frame" src="/assets/hud/threat-frame.png" alt="">
          <div class="channel"><div class="fill" data-fill data-fill-mask="threat-mask.png"
            data-fill-box="${FB.x},${FB.y},${FB.w},${FB.h}" data-fill-from="left"></div></div>
        </div>
      </div>
      <div class="crosshair"></div>
      <div class="gun">
        <img class="frame" src="/assets/hud/weapon-frame.png" alt="">
        <span class="name">BLASTER</span>
        <span class="rounds">&infin;</span>
        <span class="swap">[Q] or wheel &middot; swap</span>
      </div>
      <div class="pick">&nbsp;</div>
      <div class="hurt"></div>`;
    document.body.appendChild(this.el);

    const slotRow = this.el.querySelector(".slots") as HTMLElement;
    for (let i = 0; i < maxHp; i++) {
      const img = document.createElement("img");
      img.src = H_FULL;
      img.alt = "";
      slotRow.appendChild(img);
      this.slots.push(img);
    }
    this.cellNumEl = this.el.querySelector(".cellpanel .num") as HTMLElement;
    this.cellsLabelEl = this.el.querySelector(".cellmeta .label") as HTMLElement;
    this.killEl = this.el.querySelector(".cellmeta .kill") as HTMLElement;
    this.dangerEl = this.el.querySelector(".danger") as HTMLElement;
    this.threatEl = this.el.querySelector(".threat") as HTMLElement;
    this.threatFillEl = this.el.querySelector(".threat .fill") as HTMLElement;
    this.hurtEl = this.el.querySelector(".hurt") as HTMLElement;
    this.gunEl = this.el.querySelector(".gun") as HTMLElement;
    this.gunNameEl = this.el.querySelector(".gun .name") as HTMLElement;
    this.roundsEl = this.el.querySelector(".gun .rounds") as HTMLElement;
    this.pickEl = this.el.querySelector(".pick") as HTMLElement;
    this.endEl = document.createElement("div");
    this.layout();
    window.addEventListener("resize", () => this.layout());
  }

  /** Reference-1920×1080 layout, scaled by viewport height. Box aspects match
   *  the sprite PNGs' real dims (trim sidecars), never eyeballed. */
  private layout(): void {
    this.s = innerHeight / 1080;
    const s = this.s;
    const tl = this.el.querySelector<HTMLElement>(".tl")!;
    tl.style.left = `${40 * s}px`; tl.style.top = `${40 * s}px`;
    // one health slot is 140x71 in art
    const slotH = 34 * s;
    for (const img of this.slots) img.style.height = `${slotH}px`;
    // cell panel 105x155
    const cellH = 96 * s;
    const cp = this.el.querySelector<HTMLElement>(".cellpanel")!;
    cp.style.height = `${cellH}px`; cp.style.width = `${cellH * 105 / 155}px`;
    const meta = this.el.querySelector<HTMLElement>(".cellmeta")!;
    meta.style.height = `${cellH}px`;
    // threat frame 450x81
    const tr = this.el.querySelector<HTMLElement>(".tr")!;
    tr.style.right = `${26 * s}px`; tr.style.top = `${40 * s}px`;
    this.threatEl.style.width = `${400 * s}px`;
    this.threatEl.style.height = `${400 * s * 81 / 450}px`;
    // weapon frame 476x240
    const gun = this.el.querySelector<HTMLElement>(".gun")!;
    gun.style.width = `${290 * s}px`; gun.style.height = `${290 * s * 240 / 476}px`;
    gun.style.right = `${26 * s}px`; gun.style.bottom = `${24 * s}px`;
    this.el.querySelector<HTMLElement>(".crosshair")!.style.display = "block";
  }

  /** The beast has claws, not guns — hide the whole widget rather than show it
   *  reading zero forever. */
  hideWeapon(): void { this.gunEl.style.display = "none"; }

  setWeapon(name: string, rounds: number): void {
    this.gunNameEl.textContent = name;
    const infinite = !Number.isFinite(rounds);
    this.roundsEl.innerHTML = infinite ? "&infin;" : String(Math.ceil(rounds));
    this.roundsEl.classList.toggle("low", !infinite && rounds <= 3);
  }

  /** Picking a weapon up off the floor should announce itself — you are usually
   *  looking at the room, not at the corner of the screen. */
  announcePickup(name: string): void {
    this.pickEl.textContent = `${name} recovered`;
    this.pickEl.style.opacity = "1";
    clearTimeout(this.pickTimer);
    this.pickTimer = setTimeout(() => (this.pickEl.style.opacity = "0"), 1400);
  }

  /** A shot with no on-screen answer reads as a shot that did not happen. */
  pulseCrosshair(): void {
    const c = this.el.querySelector(".crosshair") as HTMLElement;
    c.classList.add("fired");
    setTimeout(() => c.classList.remove("fired"), 70);
  }

  /** The claw has 4.2m of reach and no tracer — the reticle is the only way to
   *  know you are close enough to connect. */
  setInRange(on: boolean): void {
    (this.el.querySelector(".crosshair") as HTMLElement).classList.toggle("inrange", on);
  }

  flashHurt(): void {
    this.hurtEl.style.opacity = "1";
    setTimeout(() => (this.hurtEl.style.opacity = "0"), 130);
  }

  update(hp: number, cells: number, extractionOpen: boolean, pressure: number,
         state: StalkerState, foeHealth = 1): void {
    this.slots.forEach((img, i) => {
      img.src = i < hp ? H_FULL : H_EMPTY;
    });
    this.cellNumEl.textContent = String(cells);
    this.cellsLabelEl.textContent = this.needCells === 0
      ? "hunt him down"
      : extractionOpen
        ? `cells ${cells} / ${this.needCells} — extraction open`
        : `cells ${cells} / ${this.needCells}`;

    // #94 — killing the other hunter always won, and the HUD never said so. The
    // enemy's condition is shown as words rather than a bar: you should be able
    // to tell shooting is working without reading a number off a meter.
    this.killEl.innerHTML = foeHealth <= 0 ? "<b>it's down</b>"
      : foeHealth < 0.35 ? "or kill it &mdash; <b>badly hurt</b>"
      : foeHealth < 0.8 ? "or kill it &mdash; <b>wounded</b>"
      : "or kill it";

    const above = state === "ceiling" || state === "pounce";
    this.dangerEl.className = "danger" + (above ? " above" : pressure > 0.55 ? " hot" : "");
    this.dangerEl.textContent = above
      ? "above you"
      : pressure > 0.55 ? "close" : pressure > 0.25 ? "contact" : "no contact";

    // masked-fill reveal from the left, channel-relative
    const ratio = Math.max(0, Math.min(1, pressure));
    const cx = (FB.x + ratio * FB.w) * 100;
    this.threatFillEl.style.clipPath = `polygon(0% 0%, ${cx}% 0%, ${cx}% 100%, 0% 100%)`;
    this.threatFillEl.dataset.fillRatio = String(ratio);
  }

  /** The headline has to match how the run actually ended — reporting a cell
   *  count after a kill reads as a game that did not notice what you did. */
  showEnd(won: boolean, cells: number, reason: WinReason, asStalker: boolean, abandoned = false): void {
    if (abandoned) {
      this.endEl.className = "end";
      this.endEl.innerHTML = `<h1>they left</h1><p>the hunt needs two</p><p>press R to go again</p>`;
      this.el.appendChild(this.endEl);
      return;
    }
    this.endEl.className = `end ${won ? "won" : "lost"}`;
    const head = !won ? (asStalker ? "put down" : "hunted down")
      : reason === "kill" ? (asStalker ? "prey taken" : "it's dead")
      : "extracted";
    const sub = !won ? (asStalker ? "he got you first" : "it got you")
      : reason === "kill" ? (asStalker ? "the complex is yours" : "you killed the thing hunting you")
      : `${cells} energy ${cells === 1 ? "cell" : "cells"} recovered`;
    this.endEl.innerHTML = `
      <h1>${head}</h1>
      <p>${sub}</p>
      <p>press R to go again</p>`;
    this.el.appendChild(this.endEl);
  }

  hideEnd(): void { this.endEl.remove(); }
}
