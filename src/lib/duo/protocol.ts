import type { Ctx } from "boardgame.io";
import type { BotDifficulty, GameState, GameVariant, PlayerSetup } from "@/types/game";

/**
 * Wire protocol for the "easy online" mode: 2–4 players share one room in
 * Firebase Realtime Database at /rooms/{roomId}. Everything in this file is
 * pure and Firebase-free so the turn/locking/notification rules are unit
 * testable without any network.
 *
 * Sync model: the device controlling the ACTIVE seat runs the move locally,
 * then publishes the whole resulting snapshot with revision+1 (compare-and-
 * swap on revision). Every other phone applies whatever snapshot has a newer
 * revision. Refresh or reconnect just re-reads the latest snapshot — there
 * is no replay log.
 *
 * Bots: bot seats live in the room config and are DRIVEN BY THE HOST DEVICE
 * (seat "0") only — the host's local client marks them `mode:"bot"` so its
 * bot loop plays them, and publishes the results; every other device sees
 * them as `mode:"remote"` and just watches. That keeps exactly one driver
 * per bot with no coordination protocol.
 */

export type DuoSeat = "0" | "1" | "2" | "3";

/** The creator is always seat "0", is always human, and drives the bots. */
export const HOST_SEAT: DuoSeat = "0";

export const MIN_DUO_PLAYERS = 2;
export const MAX_DUO_PLAYERS = 4;

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

export interface BotTurnLock {
  turnId: string;
  playerId: DuoSeat;
  claimedBy: DuoSeat;
  claimedAt: number;
}

export interface DuoPlayerSlot {
  name: string;
  /** Bots are created `joined: true`; human guests flip this when they join. */
  joined: boolean;
  /** Missing on rooms created before bot support — treat as "human". */
  type?: "human" | "bot";
  /** Only present on bot seats; defaults to "normal". */
  botDifficulty?: BotDifficulty;
  /** serialized PushSubscription JSON, when the player enabled notifications */
  pushSubscription?: string | null;
}

export type DuoPlayers = Partial<Record<DuoSeat, DuoPlayerSlot>>;

export interface DuoRoom {
  createdAt: number;
  variant: GameVariant;
  /** Optional extra shared secret ("room PIN"). Empty string = none. */
  pin: string;
  players: DuoPlayers;
  /** Monotonic state version; every accepted action bumps it by exactly 1. */
  revision: number;
  snapshot: DuoSnapshot;
  /** Dedupe key of the last turn-change push that was sent. */
  lastNotifiedTurnId?: string;
  /** Presence heartbeats (epoch ms) so each side can show "opponent online". */
  presence?: Partial<Record<DuoSeat, number>>;
  /** Per-bot-turn mutex so only one connected human browser drives a bot. */
  botTurnLock?: BotTurnLock | null;
}

/** What the lobby collects per seat before the room exists. */
export interface DuoSeatConfig {
  type: "human" | "bot";
  name: string;
  botDifficulty?: BotDifficulty;
}

/**
 * Firebase RTDB throws on ANY `undefined` value anywhere in a payload
 * ("set failed: ... contains undefined"). Every write goes through this:
 * object keys holding `undefined` are dropped; `undefined` array slots
 * become `null` so indices don't shift.
 */
export function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => (item === undefined ? null : stripUndefinedDeep(item))) as unknown as T;
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (item !== undefined) out[key] = stripUndefinedDeep(item);
    }
    return out as T;
  }
  return value;
}

/**
 * Validate/normalize the lobby's seat choices into the canonical room form:
 * 2–4 seats, seat 0 forced to a human (the creator), humans NEVER carry
 * botDifficulty, bots always do (default "normal"), names defaulted.
 */
export function sanitizeSeatConfigs(raw: Array<Partial<DuoSeatConfig>>): DuoSeatConfig[] {
  const count = Math.max(MIN_DUO_PLAYERS, Math.min(MAX_DUO_PLAYERS, raw.length || MIN_DUO_PLAYERS));
  return Array.from({ length: count }, (_, i) => {
    const entry = raw[i] ?? {};
    const type = i === 0 ? "human" : entry.type === "bot" ? "bot" : "human";
    const name = (entry.name ?? "").trim() || (type === "bot" ? `Bot ${i + 1}` : `Player ${i + 1}`);
    if (type === "bot") {
      const d = entry.botDifficulty;
      return { type, name, botDifficulty: d === "easy" || d === "hard" ? d : "normal" };
    }
    return { type, name };
  });
}

/** Seats present in a room, in play order. */
export function roomSeats(players: DuoPlayers): DuoSeat[] {
  return (["0", "1", "2", "3"] as const).filter((s) => !!players[s]);
}

export function isBotSlot(slot: DuoPlayerSlot | undefined): boolean {
  return slot?.type === "bot";
}

export function humanSeats(players: DuoPlayers): DuoSeat[] {
  return roomSeats(players).filter((s) => !isBotSlot(players[s]));
}

/** First human seat still waiting to be claimed by a joining device. */
export function nextFreeHumanSeat(players: DuoPlayers): DuoSeat | null {
  return humanSeats(players).find((s) => s !== HOST_SEAT && !players[s]?.joined) ?? null;
}

/**
 * The playerSetups that travel on the wire: device-independent. Humans are
 * plain `{mode:"human"}` (each device remaps its own seat locally); bots
 * keep their difficulty. No key is ever `undefined`.
 */
export function canonicalPlayerSetups(players: DuoPlayers): PlayerSetup[] {
  return roomSeats(players).map((s) => {
    const slot = players[s];
    return isBotSlot(slot)
      ? { mode: "bot" as const, botDifficulty: slot?.botDifficulty ?? "normal" }
      : { mode: "human" as const };
  });
}

/**
 * The playerSetups THIS device runs its local client with: its own seat is
 * the only "human"; bot seats run as real bots only on the human browser that won
 * that bot turn's RTDB lock; everything else renders as "remote".
 */
export function devicePlayerSetups(players: DuoPlayers, mySeat: DuoSeat, botDriverSeat?: DuoSeat | null): PlayerSetup[] {
  return roomSeats(players).map((s) => {
    const slot = players[s];
    if (s === mySeat) return { mode: "human" as const };
    if (isBotSlot(slot) && botDriverSeat === s) {
      return { mode: "bot" as const, botDifficulty: slot?.botDifficulty ?? "normal" };
    }
    return { mode: "remote" as const };
  });
}

/** 6-digit numeric room code, zero-padded ("042137"). */
export function generateRoomCode(rng: () => number = Math.random): string {
  return String(Math.floor(rng() * 1_000_000)).padStart(6, "0");
}

export function isValidRoomCode(code: string): boolean {
  return /^\d{6}$/.test(code);
}

export function isDuoSeat(value: unknown): value is DuoSeat {
  return value === "0" || value === "1" || value === "2" || value === "3";
}

export type ProposalRejection =
  | "bot-lock-mismatch"
  | "not-your-turn"
  | "stale-revision"
  | "bad-revision-step"
  | "missing-snapshot";

/**
 * Turn lock + optimistic concurrency: an action proposal is only legal when
 * it comes from the seat whose turn it is IN THE CURRENT ROOM STATE — or
 * from the HOST when the active seat is a bot (the host drives bots) — and
 * is based on exactly the room's current revision (so a phone that raced or
 * replayed an old tab loses cleanly and just re-syncs).
 */
export function validateProposal(
  room: Pick<DuoRoom, "revision" | "snapshot" | "players">,
  proposal: { seat: DuoSeat; baseRevision: number; snapshot: DuoSnapshot },
): { ok: true } | { ok: false; reason: ProposalRejection } {
  if (!proposal.snapshot?.G || !proposal.snapshot?.ctx) {
    return { ok: false, reason: "missing-snapshot" };
  }
  if (proposal.baseRevision !== room.revision) {
    return { ok: false, reason: "stale-revision" };
  }
  const active = room.snapshot.ctx.currentPlayer;
  const activeIsBot = isBotSlot(room.players?.[active as DuoSeat]);
  if (activeIsBot) {
    const lock = (room as Pick<DuoRoom, "botTurnLock">).botTurnLock;
    if (!lock || lock.playerId !== active || lock.claimedBy !== proposal.seat || lock.turnId !== turnId("", room.snapshot.ctx)) {
      return { ok: false, reason: "bot-lock-mismatch" };
    }
    return { ok: true };
  }
  if (active !== proposal.seat) {
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
 * actually changed, never twice for the same turn id, and never for a bot
 * seat (its "phone" is the host, which is already driving it). Publishing
 * many state changes within one turn (build, trade, build…) sends nothing.
 */
export function shouldNotifyTurn(args: {
  roomId: string;
  previousActivePlayer: string;
  nextCtx: Pick<DuoCtxSnapshot, "turn" | "currentPlayer">;
  lastNotifiedTurnId: string | undefined | null;
  players?: DuoPlayers;
}): { notify: false } | { notify: true; turnId: string; waitingSeat: DuoSeat } {
  const { previousActivePlayer, nextCtx } = args;
  if (nextCtx.currentPlayer === previousActivePlayer) return { notify: false };
  if (args.players && isBotSlot(args.players[nextCtx.currentPlayer as DuoSeat])) return { notify: false };
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
  return room.players[seat]?.name || `Player ${Number(seat) + 1}`;
}

/**
 * Prepare a local boardgame.io state for the wire. The JSON round-trip
 * strips `undefined` (which RTDB rejects); playerSetups are normalized back
 * to the canonical device-independent form (each DEVICE remaps its own seat
 * locally); the transient resume guard never travels.
 */
export function serializeSnapshot(
  G: GameState,
  ctx: Pick<Ctx | DuoCtxSnapshot, "currentPlayer" | "phase" | "turn" | "playOrderPos">,
  canonicalSetups?: PlayerSetup[],
): DuoSnapshot {
  const cleanG = JSON.parse(JSON.stringify(G)) as GameState;
  delete cleanG._duoSkipTurnReset;
  const setups =
    canonicalSetups && canonicalSetups.length === cleanG.numPlayers
      ? canonicalSetups
      : Array.from({ length: cleanG.numPlayers }, () => ({ mode: "human" as const }));
  cleanG.playerSetups = setups;
  cleanG.playerModes = setups.map((s) => s.mode);
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
  const numPlayers = Math.max(MIN_DUO_PLAYERS, Number(G.numPlayers) || MIN_DUO_PLAYERS);
  G.numPlayers = numPlayers;
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
  G.names ??= Array.from({ length: numPlayers }, (_, i) => `Player ${i + 1}`);
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
