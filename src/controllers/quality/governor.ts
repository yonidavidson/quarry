// Genex adaptive-quality: the runtime governor (mobile-readiness program).
// Tiers pick the START; the governor owns the RUNTIME knobs forever — phones
// thermally throttle after minutes, so a game that benched fine at 0:30
// degrades at 8:00. Feed it a frame time every frame; wire the callbacks to
// the runtime-changeable knobs only (DPR, post passes, draw distance, frame
// cap — NEVER context-creation flags like antialias, those are fixed).
//
// Step-down ladder on sustained slowness: DPR ×0.8 → post off → shadows
// reduced → DPR ×0.65 → draw distance down → 30fps cap. Step-up is slow
// (hysteresis) and a step whose recovery failed twice is never re-attempted. It also self-reports renderer.info counts to
// window.__GENEX_QUALITY__ — the crash watchdog attaches them to its beacons,
// which is how the field data that calibrates the whole program gets its
// memory signal.
import type { QualityTier } from './tier.ts';

export interface GovernorCallbacks {
  /** Apply a DPR multiplier (1 = tier cap). E.g. renderer.setPixelRatio(Math.min(realDpr, tier.dprCap * m)). */
  setDprScale?: (multiplier: number) => void;
  /** Toggle the post stack between the tier's level and 'off'. */
  setPostEnabled?: (enabled: boolean) => void;
  /** Reduce shadow quality — 'reduced' = halve the map (realloc) and/or
   *  freeze autoUpdate; 'off' = shadows disabled; 'full' = the tier's budget.
   *  Shadows are one of the two big fixed costs the governor previously
   *  couldn't touch (the other, context MSAA, is unfixable at runtime —
   *  see tier.rendererAntialias). */
  setShadowQuality?: (level: 'full' | 'reduced' | 'off') => void;
  /** Apply a draw-distance multiplier (1 = tier scale). */
  setDrawDistanceScale?: (multiplier: number) => void;
  /** Apply a frame cap (0 = uncapped). Pace to a STABLE 30 over a stuttery 45. */
  setFrameCap?: (fps: number) => void;
}

interface RendererInfoLike {
  info?: { memory?: { textures?: number; geometries?: number } };
}

const SLOW_WINDOW_MS = 4000; // sustained, not spikes — shader compiles must not trigger steps
const RECOVER_WINDOW_MS = 20000; // step up slowly (hysteresis)
const MEM_REPORT_MS = 5000;

export class QualityGovernor {
  private tier: QualityTier;
  private steps: Array<{ apply: () => void; revert: () => void; failures: number; pendingRecovery?: boolean }>;
  private applied = 0;
  private slowSince: number | null = null;
  private goodSince: number | null = null;
  private lastMemReport = 0;
  private paused = false;

  constructor(tier: QualityTier, callbacks: GovernorCallbacks, renderer?: RendererInfoLike) {
    this.tier = tier;
    this.rendererRef = renderer;
    const c = callbacks;
    this.steps = [
      {
        apply: () => c.setDprScale?.(0.8),
        revert: () => c.setDprScale?.(1),
        failures: 0,
      },
      {
        apply: () => c.setPostEnabled?.(false),
        revert: () => c.setPostEnabled?.(true),
        failures: 0,
      },
      {
        apply: () => c.setShadowQuality?.('reduced'),
        revert: () => c.setShadowQuality?.('full'),
        failures: 0,
      },
      {
        // Second resolution step — one ×0.8 was often not enough on weak
        // desktops; 0.65 of the tier cap is still readable everywhere.
        apply: () => c.setDprScale?.(0.65),
        revert: () => c.setDprScale?.(0.8),
        failures: 0,
      },
      {
        apply: () => c.setDrawDistanceScale?.(0.6),
        revert: () => c.setDrawDistanceScale?.(1),
        failures: 0,
      },
      {
        apply: () => c.setFrameCap?.(30),
        revert: () => c.setFrameCap?.(this.tier.frameCap),
        failures: 0,
      },
    ];
    // Visibility lifecycle: a backgrounded game must stop burning GPU/audio on
    // exactly the thermally-constrained device class. The game's loop should
    // also pause itself; the governor at minimum stops judging frames.
    try {
      document.addEventListener('visibilitychange', () => {
        this.paused = document.visibilityState !== 'visible';
        this.slowSince = null;
        this.goodSince = null;
      });
    } catch {
      /* non-DOM context */
    }
  }

  private rendererRef?: RendererInfoLike;

  /** Call once per frame with the frame delta in ms (performance.now() based). */
  frame(deltaMs: number): void {
    if (this.paused) return;
    const now = performance.now();
    const budgetMs = 1000 / Math.min(this.tier.frameCap, 60) + 8; // ~24ms at 30, ~25ms at 60

    if (deltaMs > budgetMs) {
      this.goodSince = null;
      if (this.slowSince == null) this.slowSince = now;
      else if (now - this.slowSince > SLOW_WINDOW_MS) {
        this.stepDown();
        this.slowSince = null;
      }
    } else {
      this.slowSince = null;
      if (this.goodSince == null) this.goodSince = now;
      else if (now - this.goodSince > RECOVER_WINDOW_MS) {
        this.stepUp();
        this.goodSince = null;
      }
    }

    // Memory self-report for the crash watchdog's beacons (field calibration).
    if (now - this.lastMemReport > MEM_REPORT_MS) {
      this.lastMemReport = now;
      try {
        const mem = this.rendererRef?.info?.memory;
        if (mem) {
          (window as Window & { __GENEX_QUALITY__?: { tex?: number; geo?: number } }).__GENEX_QUALITY__ =
            { tex: mem.textures ?? 0, geo: mem.geometries ?? 0 };
        }
      } catch {
        /* observational only */
      }
    }
  }

  private stepDown(): void {
    if (this.applied >= this.steps.length) return;
    const step = this.steps[this.applied]!;
    // A re-application of a rung whose recovery is still pending means the
    // revert did NOT hold — that's the failure being counted, never the
    // successful revert itself.
    if (step.pendingRecovery) {
      step.pendingRecovery = false;
      step.failures++;
    }
    step.apply();
    this.applied++;
  }

  private stepUp(): void {
    if (this.applied === 0) return;
    const step = this.steps[this.applied - 1]!;
    // Never re-attempt a knob whose recovery failed twice (reverting it put
    // the game back over budget both times) — it stays applied for the session.
    if (step.failures >= 2) return;
    step.pendingRecovery = true;
    step.revert();
    this.applied--;
  }
}
