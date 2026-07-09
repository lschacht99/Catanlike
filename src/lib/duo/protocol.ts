import type { Ctx } from "boardgame.io";
import type { GameState, GameVariant } from "@/types/game";

/**
 * Wire protocol for the "easy online" duo mode: two phones share one room in
 * Firebase Realtime Database at /rooms/{roomId}. Everything in this file is
 * pure and Firebase-free so the turn/locking/notification rules are unit
 * testable without any network.
 *
 * Sync model: the ACTIVE player runs the move locally, then publishes the
 * whole resulting snapshot with revision+1 (compare-and-swap on revision).
 * The other phone applies whatever snapshot has a newer revision. Refresh or
 * reconnect just re-reads the latest snapshot — there is no replay log.
 */

export type DuoSeat = "0" | "1";

/** The slice of boardgame.io ctx a snapshot needs to rebuild a client. */
export interface DuoCtxSnapshot {
  currentPlayer: string;
  phase: string;
  turn: number;
  playOrderPos: number;
}

export interface DuoSnapshot {
  G: GameState;
  ctx: DuoCtxSnapshot;
}

export interface DuoPlayerSlot {
  name: string;
  joined: boolean;
  /** serialized PushSubscription JSON, when the player enabled notifications */
  pushSubscription?: string | null;
}

export interface DuoRoom {
  createdAt: number;
  variant: GameVariant;
  /** Optional extra shared secret ("room PIN"). Empty string = none. */
  pin: string;
  players: Record<DuoSeat, DuoPlayerSlot>;
  /** Monotonic state version; every accepted action bumps it by exactly 1. */
  revision: number;
  snapshot: DuoSnapshot;
  /** Dedupe key of the last turn-change push that was sent. */
  lastNotifiedTurnId?: string;
  /** Presence heartbeats (epoch ms) so each side can show "opponent online". */
  presence?: Partial<Record<DuoSeat, number>>;
}

/** 6-digit numeric room code, zero-padded ("042137"). */
export function generateRoomCode(rng: () => number = Math.random): string {
  return String(Math.floor(rng() * 1_000_000)).padStart(6, "0");
}

export function isValidRoomCode(code: string): boolean {
  return /^\d{6}$/.test(code);
}

export type ProposalRejection =
  | "not-your-turn"
  | "stale-revision"
  | "bad-revision-step"
  | "missing-snapshot";

/**
 * Turn lock + optimistic concurrency: an action proposal is only legal when
 * it comes from the seat whose turn it is IN THE CURRENT ROOM STATE, and is
 * based on exactly the room's current revision (so a phone that raced or
 * replayed an old tab loses cleanly and just re-syncs).
 */
export function validateProposal(
  room: Pick<DuoRoom, "revision" | "snapshot">,
  proposal: { seat: DuoSeat; baseRevision: number; snapshot: DuoSnapshot },
): { ok: true } | { ok: false; reason: ProposalRejection } {
  if (!proposal.snapshot?.G || !proposal.snapshot?.ctx) {
    return { ok: false, reason: "missing-snapshot" };
  }
  if (proposal.baseRevision !== room.revision) {
    return { ok: false, reason: "stale-revision" };
  }
  if (room.snapshot.ctx.currentPlayer !== proposal.seat) {
    return { ok: false, reason: "not-your-turn" };
  }
  return { ok: true };
}

/**
 * Stable id for "the moment the turn passed to `currentPlayer`". Used both
 * to dedupe pushes (lastNotifiedTurnId) and to key the in-app banner.
 */
export function turnId(roomId: string, ctx: Pick<Ctx | DuoCtxSnapshot, "turn" | "currentPlayer">): string {
  return `${roomId}:${ctx.turn}:${ctx.currentPlayer}`;
}

/**
 * Push policy: notify ONLY the waiting player, ONLY when the active player
 * actually changed, and never twice for the same turn id. Publishing many
 * state changes within one turn (build, trade, build…) sends nothing.
 */
export function shouldNotifyTurn(args: {
  roomId: string;
  previousActivePlayer: string;
  nextCtx: Pick<DuoCtxSnapshot, "turn" | "currentPlayer">;
  lastNotifiedTurnId: string | undefined | null;
}): { notify: false } | { notify: true; turnId: string; waitingSeat: DuoSeat } {
  const { previousActivePlayer, nextCtx } = args;
  if (nextCtx.currentPlayer === previousActivePlayer) return { notify: false };
  const id = turnId(args.roomId, nextCtx);
  if (args.lastNotifiedTurnId === id) return { notify: false };
  return { notify: true, turnId: id, waitingSeat: nextCtx.currentPlayer as DuoSeat };
}

/** Notification copy, per spec: generic title + "<name>'s turn" body. */
export function turnNotificationText(activeName: string): { title: string; body: string } {
  return {
    title: "Your turn in Hamsa Catan",
    body: `${activeName}’s turn — open the app to play.`,
  };
}

/** Applying the same snapshot twice must be a no-op (reconnect safety). */
export function isNewerSnapshot(localRevision: number, remoteRevision: number): boolean {
  return remoteRevision > localRevision;
}

export function seatName(room: Pick<DuoRoom, "players">, seat: DuoSeat): string {
  return room.players[seat]?.name || (seat === "0" ? "Player 1" : "Player 2");
}

export function otherSeat(seat: DuoSeat): DuoSeat {
  return seat === "0" ? "1" : "0";
}

/**
 * Prepare a local boardgame.io state for the wire. The JSON round-trip
 * strips `undefined` (which RTDB rejects); playerSetups are normalized back
 * to the canonical both-human form (each DEVICE remaps its own seat locally);
 * the transient resume guard never travels.
 */
export function serializeSnapshot(
  G: GameState,
  ctx: Pick<Ctx | DuoCtxSnapshot, "currentPlayer" | "phase" | "turn" | "playOrderPos">,
): DuoSnapshot {
  const cleanG = JSON.parse(JSON.stringify(G)) as GameState;
  delete cleanG._duoSkipTurnReset;
  cleanG.playerSetups = [{ mode: "human" }, { mode: "human" }];
  cleanG.playerModes = ["human", "human"];
  return {
    G: cleanG,
    ctx: {
      currentPlayer: String(ctx.currentPlayer),
      phase: String(ctx.phase ?? "play"),
      turn: Number(ctx.turn ?? 1),
      playOrderPos: Number(ctx.playOrderPos ?? Number(ctx.currentPlayer) ?? 0),
    },
  };
}

/**
 * Restore a snapshot read back from RTDB. Firebase DROPS empty objects and
 * arrays entirely, so a fresh game's `buildings: {}` comes back as
 * `undefined` — every container the engine dereferences is re-defaulted
 * here. Reviving an already-complete snapshot is a no-op (reconnect safety).
 */
export function reviveSnapshot(raw: DuoSnapshot): DuoSnapshot {
  const G = { ...(raw.G as GameState) };
  G.buildings ??= {};
  G.roads ??= {};
  G.knights ??= {};
  G.activeKnights ??= {};
  G.knightLevels ??= {};
  G.lastGains ??= {};
  G.log ??= [];
  G.devDeck ??= [];
  G.progressDeck ??= [];
  G.progressDiscards ??= [];
  G.names ??= ["Player 1", "Player 2"];
  G.playerNames ??= G.names;
  G.pendingTrade ??= null;
  G.lastTradeResult ??= null;
  // RTDB also drops explicit nulls — restore every nullable the engine
  // compares against null (undefined !== null would corrupt the rules).
  G.pendingSetupSettlement ??= null;
  G.lastRoll ??= null;
  G.lastEventDie ??= null;
  G.largestArmyHolder ??= null;
  G.longestRoadHolder ??= null;
  G.setupStep ??= 0;
  G.freeRoads ??= 0;
  G.hasRolled ??= false;
  G.mustMoveBandit ??= false;
  G.playedDevCardThisTurn ??= false;
  G.barbarianPosition ??= 0;
  G.tradeRate ??= 4;
  if (typeof G.banditTile !== "number") G.banditTile = -1;
  for (const id of Object.keys(G.players ?? {})) {
    const p = G.players[id];
    p.devCards ??= [];
    p.progressCards ??= [];
    p.resources ??= { wood: 0, brick: 0, grain: 0, wool: 0, ore: 0 };
    p.commodities ??= { paper: 0, coin: 0, cloth: 0 };
    p.improvements ??= { trade: 0, politics: 0, science: 0 };
  }
  if (G.progressDecks) {
    G.progressDecks = {
      trade: G.progressDecks.trade ?? [],
      politics: G.progressDecks.politics ?? [],
      science: G.progressDecks.science ?? [],
    };
  }
  return {
    G,
    ctx: {
      currentPlayer: String(raw.ctx.currentPlayer ?? "0"),
      phase: String(raw.ctx.phase ?? "setup"),
      turn: Number(raw.ctx.turn ?? 1),
      playOrderPos: Number(raw.ctx.playOrderPos ?? 0),
    },
  };
}
