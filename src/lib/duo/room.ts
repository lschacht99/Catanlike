"use client";

import { get, onValue, ref, runTransaction, set, onDisconnect } from "firebase/database";
import type { Board, GameVariant } from "@/types/game";
import { initialState } from "@/game/game";
import { devDeck } from "@/game/constants";
import { duoDatabase } from "./firebase";
import {
  canonicalPlayerSetups,
  generateRoomCode,
  nextFreeHumanSeat,
  sanitizeSeatConfigs,
  stripUndefinedDeep,
  turnId,
  validateProposal,
  type DuoPlayers,
  type DuoRoom,
  type DuoSeat,
  type DuoSeatConfig,
  type DuoSnapshot,
  type ProposalRejection,
} from "./protocol";

/**
 * All Realtime Database access for a room lives here. Reads/writes are
 * plain JSON under /rooms/{roomId}; concurrency is handled with
 * runTransaction (compare-and-swap on `revision`), and the turn lock is
 * re-checked INSIDE the transaction so a stale or out-of-turn phone can
 * never clobber state, whatever its local UI believed.
 *
 * Every payload passes through stripUndefinedDeep — RTDB throws on any
 * `undefined` value anywhere in a write.
 */

const roomPath = (roomId: string) => `rooms/${roomId}`;

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export async function createRoom(args: {
  board: Board;
  variant: GameVariant;
  /** Seat 0 is the creator (always human); 2–4 entries. */
  seats: Array<Partial<DuoSeatConfig>>;
  pin?: string;
}): Promise<{ roomId: string }> {
  const db = duoDatabase();
  const seats = sanitizeSeatConfigs(args.seats);
  // Retry on the (rare) collision with an existing live room code.
  for (let attempt = 0; attempt < 8; attempt++) {
    const roomId = generateRoomCode();
    const node = ref(db, roomPath(roomId));
    const existing = await get(node);
    if (existing.exists()) continue;
    const players: DuoPlayers = {};
    seats.forEach((seat, i) => {
      players[String(i) as DuoSeat] = {
        name: seat.name,
        // The creator sits down immediately; bots never need to join.
        joined: i === 0 || seat.type === "bot",
        type: seat.type,
        ...(seat.type === "bot" ? { botDifficulty: seat.botDifficulty ?? "normal" } : {}),
        pushSubscription: null,
      };
    });
    const G = initialState(
      args.board,
      seats.length,
      shuffle(devDeck()),
      seats.map((s) => s.name),
      args.variant,
      canonicalPlayerSetups(players),
    );
    const room: DuoRoom = {
      createdAt: Date.now(),
      variant: args.variant,
      pin: args.pin ?? "",
      players,
      revision: 0,
      snapshot: {
        G,
        ctx: { currentPlayer: "0", phase: "setup", turn: 1, playOrderPos: 0 },
      },
      lastNotifiedTurnId: "",
      presence: {},
    };
    await set(node, stripUndefinedDeep(room));
    return { roomId };
  }
  throw new Error("Could not allocate a room code — try again.");
}

export type JoinResult =
  | { ok: true; seat: DuoSeat; room: DuoRoom }
  | { ok: false; reason: "not-found" | "wrong-pin" | "room-full" };

/**
 * Claim the next free HUMAN seat. Runs as a transaction so two guests
 * joining a 3–4 player room at the same moment get different seats.
 */
export async function joinRoom(roomId: string, pin: string, guestName?: string): Promise<JoinResult> {
  const db = duoDatabase();
  const snap = await get(ref(db, roomPath(roomId)));
  if (!snap.exists()) return { ok: false, reason: "not-found" };
  const existing = snap.val() as DuoRoom;
  if ((existing.pin ?? "") !== (pin ?? "")) return { ok: false, reason: "wrong-pin" };

  let claimedSeat: DuoSeat | null = null;
  let rejection: "wrong-pin" | "room-full" | null = null;
  const result = await runTransaction(ref(db, roomPath(roomId)), (room: DuoRoom | null) => {
    if (!room) return room; // local cache miss / room vanished
    claimedSeat = null;
    rejection = null;
    if ((room.pin ?? "") !== (pin ?? "")) {
      rejection = "wrong-pin";
      return undefined; // abort
    }
    const seat = nextFreeHumanSeat(room.players ?? {});
    if (!seat) {
      rejection = "room-full";
      return undefined; // abort
    }
    claimedSeat = seat;
    const name = guestName?.trim() || room.players[seat]?.name || `Player ${Number(seat) + 1}`;
    const players: DuoPlayers = { ...room.players, [seat]: { ...room.players[seat], name, joined: true } };
    const names = [...(room.snapshot?.G?.names ?? [])];
    const playerNames = [...(room.snapshot?.G?.playerNames ?? names)];
    names[Number(seat)] = name;
    playerNames[Number(seat)] = name;
    return stripUndefinedDeep({
      ...room,
      players,
      snapshot: { ...room.snapshot, G: { ...room.snapshot.G, names, playerNames } },
    });
  });
  if (rejection) return { ok: false, reason: rejection };
  if (!result.committed || !claimedSeat || !result.snapshot.exists()) {
    return { ok: false, reason: "not-found" };
  }
  return { ok: true, seat: claimedSeat, room: result.snapshot.val() as DuoRoom };
}

export async function fetchRoom(roomId: string): Promise<DuoRoom | null> {
  const db = duoDatabase();
  const snap = await get(ref(db, roomPath(roomId)));
  return snap.exists() ? (snap.val() as DuoRoom) : null;
}

/** Live subscription to the whole room. Returns the unsubscribe function. */
export function watchRoom(roomId: string, onRoom: (room: DuoRoom | null) => void): () => void {
  const db = duoDatabase();
  return onValue(ref(db, roomPath(roomId)), (snap) => {
    onRoom(snap.exists() ? (snap.val() as DuoRoom) : null);
  });
}

/**
 * Publish the snapshot that resulted from a local move. The turn lock and
 * revision are validated inside the transaction (see validateProposal);
 * returns the rejection reason so the UI can re-sync instead of retrying.
 */
export async function publishSnapshot(args: {
  roomId: string;
  seat: DuoSeat;
  baseRevision: number;
  snapshot: DuoSnapshot;
}): Promise<{ ok: true; revision: number } | { ok: false; reason: ProposalRejection | "aborted" }> {
  const db = duoDatabase();
  let rejection: ProposalRejection | null = null;
  let committedRevision = args.baseRevision + 1;
  const result = await runTransaction(ref(db, roomPath(args.roomId)), (room: DuoRoom | null) => {
    if (!room) return room; // room vanished — abort
    const verdict = validateProposal(room, args);
    if (!verdict.ok) {
      rejection = verdict.reason;
      return undefined; // abort the transaction
    }
    committedRevision = room.revision + 1;
    return stripUndefinedDeep({ ...room, revision: committedRevision, snapshot: args.snapshot });
  });
  if (rejection) return { ok: false, reason: rejection };
  if (!result.committed) return { ok: false, reason: "aborted" };
  return { ok: true, revision: committedRevision };
}

/**
 * Atomically claim the right to send the push for `turnId`. Exactly one
 * phone wins even if both try at once — the loser sees `false` and sends
 * nothing. This is the lastNotifiedTurnId dedupe from the spec.
 */
export async function claimTurnNotification(roomId: string, turnIdValue: string): Promise<boolean> {
  const db = duoDatabase();
  const result = await runTransaction(
    ref(db, `${roomPath(roomId)}/lastNotifiedTurnId`),
    (current: string | null) => (current === turnIdValue ? undefined : turnIdValue),
  );
  return result.committed;
}

/** Store (or clear, with null) a player's push subscription in the room. */
export async function savePushSubscription(roomId: string, seat: DuoSeat, subscriptionJson: string | null): Promise<void> {
  const db = duoDatabase();
  await set(ref(db, `${roomPath(roomId)}/players/${seat}/pushSubscription`), subscriptionJson ?? null);
}

/** Heartbeat presence: repeated timestamps + best-effort clear on disconnect. */
export function startPresence(roomId: string, seat: DuoSeat): () => void {
  const db = duoDatabase();
  const node = ref(db, `${roomPath(roomId)}/presence/${seat}`);
  const beat = () => set(node, Date.now()).catch(() => {});
  beat();
  const timer = window.setInterval(beat, 20_000);
  onDisconnect(node).set(0).catch(() => {});
  return () => {
    window.clearInterval(timer);
    set(node, 0).catch(() => {});
  };
}

export function isPresent(timestamp: number | undefined): boolean {
  return !!timestamp && Date.now() - timestamp < 45_000;
}


/** Atomically claim the active bot turn. Host wins preference by trying first; any human can fall back. */
export async function claimBotTurn(roomId: string, botPlayerId: DuoSeat, claimedBy: DuoSeat, staleMs = 10_000): Promise<boolean> {
  const db = duoDatabase();
  const now = Date.now();
  const idFor = (ctx: { turn: number; currentPlayer: string }) => turnId("", ctx);
  const result = await runTransaction(ref(db, roomPath(roomId)), (room: DuoRoom | null) => {
    if (!room) return room;
    if (room.snapshot?.ctx?.currentPlayer !== botPlayerId) return undefined;
    if (room.players?.[botPlayerId]?.type !== "bot") return undefined;
    if (room.players?.[claimedBy]?.type === "bot" || !room.players?.[claimedBy]?.joined) return undefined;
    const nextTurnId = idFor(room.snapshot.ctx);
    const lock = room.botTurnLock;
    const reusable = !lock || lock.turnId !== nextTurnId || lock.playerId !== botPlayerId || now - (lock.claimedAt ?? 0) > staleMs;
    if (!reusable && lock.claimedBy !== claimedBy) return undefined;
    return stripUndefinedDeep({
      ...room,
      botTurnLock: { turnId: nextTurnId, playerId: botPlayerId, claimedBy, claimedAt: now },
    });
  });
  return result.committed;
}

export async function clearBotTurnLock(roomId: string, claimedBy: DuoSeat): Promise<void> {
  const db = duoDatabase();
  await runTransaction(ref(db, roomPath(roomId)), (room: DuoRoom | null) => {
    if (!room) return room;
    if (room.botTurnLock?.claimedBy !== claimedBy) return room;
    return stripUndefinedDeep({ ...room, botTurnLock: null });
  });
}
