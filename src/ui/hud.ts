// Placeholder HUD — hand-written DOM in the game's brief (stencilled industrial,
// sodium orange on near-black). This is scaffolding: the generated sprite set
// from the UI concept chain replaces it, per DESIGN.md's HUD lane.
//
// The one thing here that is NOT decoration is the danger read. In a game whose
// threat spends half its time on the ceiling, "it is above you" has to be legible
// without looking up.
import { NEED_CELLS } from "../game/hunt.ts";
import type { StalkerState } from "../hunter/stalker.ts";

const CSS = `
#hud { position:fixed; inset:0; pointer-events:none; font:600 13px/1.3 ui-monospace,"SF Mono",Menlo,monospace;
       letter-spacing:.1em; text-transform:uppercase; color:#cfd6df; text-shadow:0 1px 4px #000; }
#hud .tl { position:absolute; top:22px; left:26px; display:flex; flex-direction:column; gap:9px; }
#hud .pips { display:flex; gap:5px; }
#hud .pip { width:26px; height:7px; background:#3a1414; box-shadow:inset 0 0 0 1px #000; }
#hud .pip.on { background:#e8542c; box-shadow:inset 0 0 0 1px #000, 0 0 9px #e8542c88; }
#hud .cells { color:#4ee08a; }
#hud .tr { position:absolute; top:22px; right:26px; text-align:right; }
#hud .danger { font-size:12px; color:#8b929c; }
#hud .danger.hot { color:#ff7a3c; }
#hud .danger.above { color:#ff3b2f; animation:pulse .7s ease-in-out infinite; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.45} }
#hud .bar { width:150px; height:4px; background:#1a1d22; margin-top:6px; margin-left:auto; }
#hud .bar i { display:block; height:100%; background:#ff7a3c; width:0%; transition:width .18s linear; }
#hud .crosshair { position:absolute; left:50%; top:50%; width:3px; height:3px; margin:-1.5px 0 0 -1.5px;
                  background:#dfe7f2; box-shadow:0 0 4px #000; opacity:.8; }
#hud .end { position:absolute; inset:0; display:grid; place-content:center; text-align:center; gap:14px;
            background:#05070bdd; pointer-events:auto; }
#hud .end h1 { margin:0; font-size:34px; letter-spacing:.22em; }
#hud .end.won h1 { color:#4ee08a; } #hud .end.lost h1 { color:#e8542c; }
#hud .end p { margin:0; color:#8b929c; font-size:13px; }
#hud .hurt { position:absolute; inset:0; box-shadow:inset 0 0 140px #c0202088; opacity:0; transition:opacity .12s; }
`;

export class Hud {
  private needCells: number;
  private el: HTMLDivElement;
  private pips: HTMLElement[] = [];
  private cellsEl: HTMLElement;
  private dangerEl: HTMLElement;
  private barEl: HTMLElement;
  private endEl: HTMLElement;
  private hurtEl: HTMLElement;

  constructor(maxHp: number, needCells = NEED_CELLS) {
    this.needCells = needCells;
    const style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);

    this.el = document.createElement("div");
    this.el.id = "hud";
    this.el.innerHTML = `
      <div class="tl">
        <div class="pips"></div>
        <div class="cells">&nbsp;</div>
      </div>
      <div class="tr">
        <div class="danger">no contact</div>
        <div class="bar"><i></i></div>
      </div>
      <div class="crosshair"></div>
      <div class="hurt"></div>`;
    document.body.appendChild(this.el);

    const pipRow = this.el.querySelector(".pips") as HTMLElement;
    for (let i = 0; i < maxHp; i++) {
      const p = document.createElement("div");
      p.className = "pip on";
      pipRow.appendChild(p);
      this.pips.push(p);
    }
    this.cellsEl = this.el.querySelector(".cells") as HTMLElement;
    this.dangerEl = this.el.querySelector(".danger") as HTMLElement;
    this.barEl = this.el.querySelector(".bar i") as HTMLElement;
    this.hurtEl = this.el.querySelector(".hurt") as HTMLElement;
    this.endEl = document.createElement("div");
  }

  flashHurt(): void {
    this.hurtEl.style.opacity = "1";
    setTimeout(() => (this.hurtEl.style.opacity = "0"), 130);
  }

  update(hp: number, cells: number, extractionOpen: boolean, pressure: number, state: StalkerState): void {
    this.pips.forEach((p, i) => p.classList.toggle("on", i < hp));
    this.cellsEl.textContent = this.needCells === 0
      ? "hunt him down"
      : extractionOpen
        ? `cells ${cells} / ${this.needCells} — extraction open`
        : `cells ${cells} / ${this.needCells}`;

    const above = state === "ceiling" || state === "pounce";
    this.dangerEl.className = "danger" + (above ? " above" : pressure > 0.55 ? " hot" : "");
    this.dangerEl.textContent = above
      ? "above you"
      : pressure > 0.55 ? "close" : pressure > 0.25 ? "contact" : "no contact";
    this.barEl.style.width = `${Math.round(pressure * 100)}%`;
  }

  showEnd(won: boolean, cells: number): void {
    this.endEl.className = `end ${won ? "won" : "lost"}`;
    this.endEl.innerHTML = `
      <h1>${won ? "extracted" : "hunted down"}</h1>
      <p>${cells} energy ${cells === 1 ? "cell" : "cells"} recovered</p>
      <p>press R to go again</p>`;
    this.el.appendChild(this.endEl);
  }

  hideEnd(): void { this.endEl.remove(); }
}
