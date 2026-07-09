"use client";

import { get, onValue, ref, runTransaction, set, update, onDisconnect } from "firebase/database";
import type { Board, GameVariant } from "@/types/game";
import { initialState } from "@/game/game";
import { devDeck } from "@/game/constants";
import { duoDatabase } from "./firebase";
import {
  generateRoomCode,
  validateProposal,
  type DuoRoom,
  type DuoSeat,
  type DuoSnapshot,
  type ProposalRejection,
} from "./protocol";

/**
 * All Realtime Database access for a duo room lives here. Reads/writes are
 * plain JSON under /rooms/{roomId}; concurrency is handled with
 * runTransaction (compare-and-swap on `revision`), and the turn lock is
 * re-checked INSIDE the transaction so a stale or out-of-turn phone can
 * never clobber state, whatever its local UI believed.
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
  hostName: string;
  guestName: string;
  pin?: string;
}): Promise<{ roomId: string }> {
  const db = duoDatabase();
  // Retry on the (rare) collision with an existing live room code.
  for (let attempt = 0; attempt < 8; attempt++) {
    const roomId = generateRoomCode();
    const node = ref(db, roomPath(roomId));
    const existing = await get(node);
    if (existing.exists()) continue;
    const names = [args.hostName || "Player 1", args.guestName || "Player 2"];
    const G = initialState(args.board, 2, shuffle(devDeck()), names, args.variant, [
      { mode: "human" },
      { mode: "human" },
    ]);
    const room: DuoRoom = {
      createdAt: Date.now(),
      variant: args.variant,
      pin: args.pin ?? "",
      players: {
        "0": { name: names[0], joined: true, pushSubscription: null },
        "1": { name: names[1], joined: false, pushSubscription: null },
      },
      revision: 0,
      snapshot: {
        G,
        ctx: { currentPlayer: "0", phase: "setup", turn: 1, playOrderPos: 0 },
      },
      lastNotifiedTurnId: "",
      presence: {},
    };
    await set(node, room);
    return { roomId };
  }
  throw new Error("Could not allocate a room code — try again.");
}

export type JoinResult =
  | { ok: true; room: DuoRoom }
  | { ok: false; reason: "not-found" | "wrong-pin" };

export async function joinRoom(roomId: string, pin: string, guestName?: string): Promise<JoinResult> {
  const db = duoDatabase();
  const snap = await get(ref(db, roomPath(roomId)));
  if (!snap.exists()) return { ok: false, reason: "not-found" };
  const room = snap.val() as DuoRoom;
  if ((room.pin ?? "") !== (pin ?? "")) return { ok: false, reason: "wrong-pin" };
  const updates: Record<string, unknown> = { [`${roomPath(roomId)}/players/1/joined`]: true };
  if (guestName) {
    updates[`${roomPath(roomId)}/players/1/name`] = guestName;
    updates[`${roomPath(roomId)}/snapshot/G/names/1`] = guestName;
    updates[`${roomPath(roomId)}/snapshot/G/playerNames/1`] = guestName;
  }
  await update(ref(db), updates);
  return { ok: true, room };
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
    return { ...room, revision: committedRevision, snapshot: args.snapshot };
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
  await set(ref(db, `${roomPath(roomId)}/players/${seat}/pushSubscription`), subscriptionJson);
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
