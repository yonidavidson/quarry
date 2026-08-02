// #101 — on a phone the game rendered perfectly and could not be played: the
// vendored touch primitives were sitting in the repo unimported, so a phone got
// a world, a HUD, and the on-screen hint "WASD MOVE · SPACE JUMP".
//
// This wires them. The mapping is chosen for THIS game rather than copied from a
// generic template: Jack is mouse-aimed, so the right half of the screen is a
// look zone rather than an aim stick, and the fire button sits under the right
// thumb where the look drag already is — you aim and shoot with the same hand,
// which is the only arrangement that works one-thumbed.
import { TouchJoystick, VirtualButton } from "../controllers/touch/touch-joystick.ts";
import { DragZone } from "../controllers/touch/drag-zone.ts";
import { RotateOverlay } from "../controllers/touch/rotate-overlay.ts";

export interface TouchHooks {
  fire: () => void;
  jump: (down: boolean) => void;
  pause: () => void;
  /** Radians of look per pixel dragged. */
  look: (dAzimuth: number, dPolar: number) => void;
}

export interface TouchRig {
  /** Movement, −1..1 each axis. Feed straight into `setMovement({ joystick })`. */
  readonly joystick: { x: number; y: number };
  readonly jumpHeld: boolean;
  /** Call once per frame: drains the look drag. */
  update(): void;
  readonly enabled: true;
}

/** True on anything that is actually finger-driven. Deliberately NOT a width
 *  check — a narrow desktop window is still a keyboard. */
export function isTouchDevice(): boolean {
  return (
    typeof window !== "undefined" &&
    (navigator.maxTouchPoints > 0 || window.matchMedia("(pointer: coarse)").matches)
  );
}

const CAP = {
  background: "rgba(14,11,8,0.55)",
  border: "1px solid rgba(232,84,44,0.55)",
  color: "#e8ddc8",
  fontFamily: '"Oswald", "Arial Narrow", sans-serif',
  fontSize: "12px",
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  backdropFilter: "blur(6px)",
} as Partial<CSSStyleDeclaration>;

export function buildTouchControls(hooks: TouchHooks): TouchRig {
  // Portrait is not playable here — the hall is wide and the HUD is laid out for
  // landscape — so ask for the rotation rather than shipping a broken layout.
  new RotateOverlay({ orientation: "landscape" });

  const stick = new TouchJoystick({
    floating: true,
    maxRadius: 56,
    wrapperStyle: { width: "42vw", height: "62vh", left: "0", bottom: "0" },
  });

  // The look zone is the RIGHT half and it sits UNDER the buttons, so a thumb
  // that starts on empty screen turns the camera and a thumb that starts on the
  // fire cap shoots. Same thumb, no mode switch.
  const look = new DragZone({
    zoneStyle: { right: "0", top: "0", width: "58vw", height: "100%", zIndex: "8" },
  });

  let jumpHeld = false;
  new VirtualButton({
    label: "Fire",
    onPress: () => hooks.fire(),
    // clear of the weapon readout, which owns the bottom-right corner
    wrapperStyle: { right: "30px", bottom: "112px", zIndex: "9" },
    capStyle: { ...CAP, width: "82px", height: "82px", borderRadius: "50%" },
  });
  new VirtualButton({
    label: "Jump",
    onPress: () => { jumpHeld = true; hooks.jump(true); },
    onRelease: () => { jumpHeld = false; hooks.jump(false); },
    wrapperStyle: { right: "126px", bottom: "142px", zIndex: "9" },
    capStyle: { ...CAP, width: "66px", height: "66px", borderRadius: "50%" },
  });
  new VirtualButton({
    label: "Pause",
    onPress: () => hooks.pause(),
    wrapperStyle: { right: "22px", top: "16px", bottom: "auto", zIndex: "9" },
    capStyle: { ...CAP, width: "62px", height: "34px", borderRadius: "4px", fontSize: "10px" },
  });

  // Sensitivity in radians per pixel. Lower than the mouse default because a
  // thumb travels far less than a mouse and overshoot on a phone is miserable.
  const SENS = 0.0038;

  return {
    joystick: { get x() { return stick.x; }, get y() { return stick.y; } },
    get jumpHeld() { return jumpHeld; },
    update(): void {
      const d = look.consumeDelta();
      if (d.dx || d.dy) hooks.look(-d.dx * SENS, -d.dy * SENS);
    },
    enabled: true,
  };
}
