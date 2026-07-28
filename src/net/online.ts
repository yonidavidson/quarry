// Online 1v1 — one seat is Jack, one seat is the Stalker.
//
// Net model: `matchmake()` with the `open` preset at 2/2. Not `duel`, whose
// server-owned winner-stays loop assumes symmetric players; this game's whole
// point is that the two seats are different, so the sides are assigned in game
// code — by the HOST, into `shared`, which is the one shape that survives host
// migration and cannot have two writers.
//
// The rules from $genex-threejs-multiplayer that this file exists to obey:
//   · matchmake() fires on the Play Online CLICK, never at boot — a player
//     sitting in the menu must not hold a seat other people are waiting on.
//   · render remotes straight from `state` (already smoothed); never re-smooth.
//   · render YOURSELF from your local body, never from the network echo.
//   · publish on a fixed 15Hz tick, rounded; never per frame.
//   · rotation as a quaternion — a scalar yaw lerps the long way round ±π.
import * as THREE from "three";
import { matchmake, type Session } from "@genex-ai/multiplayer";
import { waitForPlayer, getColyseusAuth, getColyseusUrls } from "@genex-ai/embed-sdk";
import { GENEX } from "../genex.config.ts";
import type { Side } from "../game/phase.ts";

/** What each player publishes about itself. Flat, small, rounded. */
export interface NetState extends Record<string, unknown> {
  x: number; y: number; z: number;
  q: number[];
  /** Discrete — read from stateRaw, never the smoothed view. */
  hp: number;
  /** 0 walking/idle, 1 clinging, 2 airborne — remote animation reads this raw. */
  f: number;
}

type MM = Awaited<ReturnType<typeof matchmake<NetState>>>;

const r2 = (n: number): number => Math.round(n * 100) / 100;

export class Online {
  private mm: MM | null = null;
  private session: Session<NetState> | null = null;
  private wired: Session<NetState> | null = null;
  private tick: number | null = null;
  private local: NetState = { x: 0, y: 0, z: 0, q: [0, 0, 0, 1], hp: 5, f: 0 };

  /** Null until the host has assigned sides. Never default it — an unassigned
   *  player is not "Jack", they are unassigned, and rendering them as a side
   *  before the map lands is how both players end up the same character. */
  mySide: Side | null = null;

  get status(): string { return this.mm?.matchmaking.status ?? "offline"; }
  get lobbyCount(): number {
    const v = this.mm?.matchmaking;
    if (!v) return 0;
    // While searching the roster is EMPTY — you are in the queue, in no room.
    return v.status === "searching" ? Math.max(v.queue.size, 1) : v.connectedPlayers.length;
  }
  get live(): boolean { return this.status === "playing" && !!this.session; }
  get room(): Session<NetState> | null { return this.session; }

  /** Called by the Play Online button, and by nothing else. */
  async join(): Promise<void> {
    const { user } = await waitForPlayer();   // guests included — never waitForAuth
    this.mm = await matchmake<NetState>({
      urls: getColyseusUrls(),
      room: GENEX.slug,
      name: user.name,
      auth: () => getColyseusAuth(),          // fresh on every seat and re-seat
    });
    this.mm.on("matched", () => this.syncSession());
    this.mm.on("error", (e) => console.error("[quarry] matchmaking", e));
    this.syncSession();

    this.tick = window.setInterval(() => this.publish(), 66);   // ~15Hz
  }

  /** Leaving online must free the seat, or everyone else waits on a ghost. */
  leave(): void {
    if (this.tick !== null) { clearInterval(this.tick); this.tick = null; }
    this.mm?.cancel();
    this.mm = null;
    this.session = null;
    this.wired = null;
    this.mySide = null;
  }

  /** The handle swaps in a new Session after seating — poll it, do not assume. */
  syncSession(): void {
    const live = (this.mm?.session ?? null) as Session<NetState> | null;
    if (live === this.wired) return;
    this.wired = live;
    this.session = live;
  }

  /** Feed the local body in every frame; this is the only thing published. */
  setLocal(pos: THREE.Vector3, quat: THREE.Quaternion, hp: number, flags: number): void {
    this.local.x = r2(pos.x); this.local.y = r2(pos.y); this.local.z = r2(pos.z);
    this.local.q = [r2(quat.x), r2(quat.y), r2(quat.z), r2(quat.w)];
    this.local.hp = hp;
    this.local.f = flags;
  }

  private publish(): void {
    this.syncSession();
    this.session?.me.set({ ...this.local });
  }

  /**
   * Sides live in `shared`, written ONLY by the host. Two seats, two roles: the
   * lower session id takes Jack so the split is deterministic on both clients,
   * and the map is reconciled every tick so a re-seat after a drop does not
   * leave both players as the predator.
   */
  reconcileSides(): void {
    this.syncSession();
    const room = this.session;
    if (!room) return;

    if (room.isHost && room.host !== undefined) {
      const sides = { ...((room.shared.get("sides") ?? {}) as Record<string, Side>) };
      const roster = [...room.players.keys()].sort();
      let changed = false;
      for (const id of Object.keys(sides)) {
        if (!roster.includes(id)) { delete sides[id]; changed = true; }
      }
      // exactly one of each; first id by sort order is the prey
      const taken = new Set(Object.values(sides));
      for (const id of roster) {
        if (sides[id]) continue;
        sides[id] = taken.has("jack") ? "stalker" : "jack";
        taken.add(sides[id]);
        changed = true;
      }
      if (changed) room.shared.set("sides", sides);
    }

    const map = room.shared.get("sides") as Record<string, Side> | undefined;
    this.mySide = map?.[room.id] ?? null;
  }

  /** Every remote in the room, already smoothed — draw these directly. */
  remotes(): Array<{ id: string; side: Side | null; state: NetState; raw: NetState }> {
    const room = this.session;
    if (!room) return [];
    const map = (room.shared.get("sides") ?? {}) as Record<string, Side>;
    const out: Array<{ id: string; side: Side | null; state: NetState; raw: NetState }> = [];
    for (const [id, p] of room.players) {
      if (id === room.id) continue;                 // that echo is you
      if (!p.state) continue;
      out.push({ id, side: map[id] ?? null, state: p.state, raw: p.stateRaw ?? p.state });
    }
    return out;
  }
}
