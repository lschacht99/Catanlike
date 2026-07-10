/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck
import { describe, expect, it } from "vitest";
import { makeState } from "../../../game/__tests__/helpers";
import { normalizePlayerSetups } from "../../../game/player-control";
import {
  BOT_LOCK_TTL_MS,
  canClaimBotLock,
  canonicalPlayerSetups,
  devicePlayerSetups,
  generateRoomCode,
  humanSeats,
  isValidRoomCode,
  isNewerSnapshot,
  nextFreeHumanSeat,
  reviveSnapshot,
  sanitizeSeatConfigs,
  serializeSnapshot,
  shouldNotifyTurn,
  stripUndefinedDeep,
  turnId,
  turnNotificationText,
  validateProposal,
} from "../protocol";

function makeRoomState(currentPlayer = "0", revision = 4, players?: any) {
  const G = makeState(2);
  return {
    revision,
    players: players ?? {
      "0": { name: "Moshe", joined: true, type: "human" },
      "1": { name: "Leah", joined: true, type: "human" },
    },
    snapshot: { G, ctx: { currentPlayer, phase: "play", turn: 7, playOrderPos: Number(currentPlayer) } },
  };
}

/** true if any `undefined` value survives anywhere in the payload. */
function containsUndefined(value: any): boolean {
  if (value === undefined) return true;
  if (Array.isArray(value)) return value.some(containsUndefined);
  if (value && typeof value === "object") return Object.values(value).some(containsUndefined);
  return false;
}

describe("room codes", () => {
  it("generates 6-digit zero-padded codes", () => {
    expect(generateRoomCode(() => 0)).toBe("000000");
    expect(generateRoomCode(() => 0.999999)).toMatch(/^\d{6}$/);
    expect(isValidRoomCode("042137")).toBe(true);
    expect(isValidRoomCode("42137")).toBe(false);
    expect(isValidRoomCode("abc123")).toBe(false);
  });
});

describe("turn lock + optimistic concurrency (2-player sync)", () => {
  it("accepts the active player's proposal at the current revision", () => {
    const room = makeRoomState("0", 4);
    const proposal = { seat: "0", baseRevision: 4, snapshot: room.snapshot };
    expect(validateProposal(room, proposal)).toEqual({ ok: true });
  });

  it("blocks a wrong-turn proposal (only the current player can act)", () => {
    const room = makeRoomState("0", 4);
    const proposal = { seat: "1", baseRevision: 4, snapshot: room.snapshot };
    expect(validateProposal(room, proposal)).toEqual({ ok: false, reason: "not-your-turn" });
  });

  it("rejects a stale-revision proposal (raced or refreshed old tab)", () => {
    const room = makeRoomState("0", 5);
    const proposal = { seat: "0", baseRevision: 4, snapshot: room.snapshot };
    expect(validateProposal(room, proposal)).toEqual({ ok: false, reason: "stale-revision" });
  });

  it("lets ANY connected human publish a bot seat's turn (lock arbitrates who actually runs it)", () => {
    const players = {
      "0": { name: "Moshe", joined: true, type: "human" },
      "1": { name: "Leah", joined: true, type: "human" },
      "2": { name: "Bot 3", joined: true, type: "bot", botDifficulty: "normal" },
    };
    const room = makeRoomState("2", 4, players); // bot seat is active
    expect(validateProposal(room, { seat: "0", baseRevision: 4, snapshot: room.snapshot })).toEqual({ ok: true });
    expect(validateProposal(room, { seat: "1", baseRevision: 4, snapshot: room.snapshot })).toEqual({ ok: true });
    // Another bot seat may never "publish" a turn — bots don't run devices.
    const withTwoBots = { ...players, "3": { name: "Bot 4", joined: true, type: "bot", botDifficulty: "normal" } };
    const room2 = makeRoomState("2", 4, withTwoBots);
    expect(validateProposal(room2, { seat: "3", baseRevision: 4, snapshot: room2.snapshot })).toEqual({
      ok: false,
      reason: "not-your-turn",
    });
  });

  it("only strictly newer snapshots are applied on receive", () => {
    expect(isNewerSnapshot(4, 5)).toBe(true);
    expect(isNewerSnapshot(5, 5)).toBe(false); // own echo
    expect(isNewerSnapshot(5, 4)).toBe(false); // out-of-order stale
  });
});

describe("push dedupe (lastNotifiedTurnId)", () => {
  const nextCtx = { turn: 8, currentPlayer: "1" };

  it("notifies the waiting player exactly when the active player changes", () => {
    const decision = shouldNotifyTurn({
      roomId: "042137",
      previousActivePlayer: "0",
      nextCtx,
      lastNotifiedTurnId: "",
    });
    expect(decision).toEqual({ notify: true, turnId: "042137:8:1", waitingSeat: "1" });
  });

  it("does NOT notify on state changes within the same player's turn", () => {
    const decision = shouldNotifyTurn({
      roomId: "042137",
      previousActivePlayer: "1",
      nextCtx,
      lastNotifiedTurnId: "",
    });
    expect(decision).toEqual({ notify: false });
  });

  it("does NOT notify twice for the same turn id", () => {
    const decision = shouldNotifyTurn({
      roomId: "042137",
      previousActivePlayer: "0",
      nextCtx,
      lastNotifiedTurnId: turnId("042137", nextCtx),
    });
    expect(decision).toEqual({ notify: false });
  });

  it("uses the required copy", () => {
    const text = turnNotificationText("Moshe");
    expect(text.title).toBe("Your turn in Hamsa Catan");
    expect(text.body).toContain("Moshe");
  });

  it("never notifies a bot seat (the host is already driving it)", () => {
    const decision = shouldNotifyTurn({
      roomId: "042137",
      previousActivePlayer: "0",
      nextCtx: { turn: 8, currentPlayer: "1" },
      lastNotifiedTurnId: "",
      players: {
        "0": { name: "Moshe", joined: true, type: "human" },
        "1": { name: "Bot 2", joined: true, type: "bot", botDifficulty: "normal" },
      },
    });
    expect(decision).toEqual({ notify: false });
  });
});

describe("RTDB payload hygiene (no undefined ever)", () => {
  it("stripUndefinedDeep drops undefined object keys and nulls array holes", () => {
    const dirty = {
      a: 1,
      b: undefined,
      nested: { c: undefined, d: "ok", deep: [{ e: undefined, f: 2 }] },
      arr: [1, undefined, 3],
      keepNull: null,
    };
    expect(stripUndefinedDeep(dirty)).toEqual({
      a: 1,
      nested: { d: "ok", deep: [{ f: 2 }] },
      arr: [1, null, 3],
      keepNull: null,
    });
  });

  it("normalizePlayerSetups never emits undefined keys (the createRoom crash)", () => {
    const setups = normalizePlayerSetups(3, [
      { mode: "human" },
      { mode: "bot" },
      { mode: "bot", botDifficulty: "hard" },
    ]);
    // Humans must NOT carry botDifficulty at all; bots default to "normal".
    expect(Object.keys(setups[0])).toEqual(["mode"]);
    expect(setups[1]).toEqual({ mode: "bot", botDifficulty: "normal" });
    expect(setups[2]).toEqual({ mode: "bot", botDifficulty: "hard" });
    expect(containsUndefined(setups)).toBe(false);
  });

  it("a serialized snapshot with bots contains no undefined anywhere", () => {
    const G = makeState(3);
    const setups = canonicalPlayerSetups({
      "0": { name: "Moshe", joined: true, type: "human" },
      "1": { name: "Leah", joined: false, type: "human" },
      "2": { name: "Bot 3", joined: true, type: "bot", botDifficulty: "easy" },
    });
    const wire = serializeSnapshot(G, { currentPlayer: "0", phase: "setup", turn: 1, playOrderPos: 0 }, setups);
    expect(containsUndefined(wire)).toBe(false);
    expect(wire.G.playerSetups).toEqual([
      { mode: "human" },
      { mode: "human" },
      { mode: "bot", botDifficulty: "easy" },
    ]);
  });
});

describe("2–4 player seat configuration", () => {
  it("sanitizes lobby seats: host forced human, bots default normal, names filled", () => {
    const seats = sanitizeSeatConfigs([
      { type: "bot", name: "" }, // creator can never be a bot
      { type: "human", name: "  Leah " },
      { type: "bot", botDifficulty: "hard" },
      { type: "bot", botDifficulty: "weird" as any },
    ]);
    expect(seats).toHaveLength(4);
    expect(seats[0]).toEqual({ type: "human", name: "Player 1" });
    expect(seats[1]).toEqual({ type: "human", name: "Leah" });
    expect(seats[2]).toEqual({ type: "bot", name: "Bot 3", botDifficulty: "hard" });
    expect(seats[3]).toEqual({ type: "bot", name: "Bot 4", botDifficulty: "normal" });
    expect(containsUndefined(seats)).toBe(false);
  });

  it("clamps player count to 2–4", () => {
    expect(sanitizeSeatConfigs([{}])).toHaveLength(2);
    expect(sanitizeSeatConfigs(Array.from({ length: 6 }, () => ({})))).toHaveLength(4);
  });

  it("finds the next free human seat, skipping bots; null when full", () => {
    const players: any = {
      "0": { name: "Moshe", joined: true, type: "human" },
      "1": { name: "Bot 2", joined: true, type: "bot", botDifficulty: "normal" },
      "2": { name: "Leah", joined: false, type: "human" },
      "3": { name: "Dana", joined: false, type: "human" },
    };
    expect(humanSeats(players)).toEqual(["0", "2", "3"]);
    expect(nextFreeHumanSeat(players)).toBe("2");
    players["2"].joined = true;
    expect(nextFreeHumanSeat(players)).toBe("3");
    players["3"].joined = true;
    expect(nextFreeHumanSeat(players)).toBeNull();
  });

  it("device setups: every seat but my own — human or bot — renders as remote", () => {
    // The on-screen client is bound to this device's own playerID, so it can
    // never legally dispatch moves for another seat (boardgame.io rejects
    // "not your turn"). Bot turns are replayed on a separate HEADLESS client
    // (see botRunner.ts) behind the botTurnLock, never via this on-screen one.
    const players: any = {
      "0": { name: "Moshe", joined: true, type: "human" },
      "1": { name: "Leah", joined: true, type: "human" },
      "2": { name: "Bot 3", joined: true, type: "bot", botDifficulty: "hard" },
      "3": { name: "Bot 4", joined: true, type: "bot" },
    };
    expect(devicePlayerSetups(players, "0")).toEqual([
      { mode: "human" },
      { mode: "remote" },
      { mode: "remote" },
      { mode: "remote" },
    ]);
    expect(devicePlayerSetups(players, "1")).toEqual([
      { mode: "remote" },
      { mode: "human" },
      { mode: "remote" },
      { mode: "remote" },
    ]);
  });

  it("bot turn lock: free, cross-turn, and expired locks are all claimable; a fresh same-turn lock is not", () => {
    const now = 1_000_000;
    expect(canClaimBotLock(null, "room:1:2", now)).toBe(true);
    expect(canClaimBotLock(undefined, "room:1:2", now)).toBe(true);
    const fresh = { turnId: "room:1:2", playerId: "2", claimedBy: "0" as const, claimedAt: now - 500 };
    expect(canClaimBotLock(fresh, "room:1:2", now)).toBe(false); // someone just claimed it
    const otherTurn = { ...fresh, turnId: "room:1:1" }; // stale from a PREVIOUS bot turn
    expect(canClaimBotLock(otherTurn, "room:1:2", now)).toBe(true);
    const expired = { ...fresh, claimedAt: now - BOT_LOCK_TTL_MS - 1 }; // claimer vanished mid-run
    expect(canClaimBotLock(expired, "room:1:2", now)).toBe(true);
    const justUnderTtl = { ...fresh, claimedAt: now - BOT_LOCK_TTL_MS + 1 };
    expect(canClaimBotLock(justUnderTtl, "room:1:2", now)).toBe(false);
  });

  it("treats legacy rooms without seat types as all-human (2P wife game)", () => {
    const players: any = {
      "0": { name: "Moshe", joined: true },
      "1": { name: "Leah", joined: false },
    };
    expect(humanSeats(players)).toEqual(["0", "1"]);
    expect(nextFreeHumanSeat(players)).toBe("1");
    expect(canonicalPlayerSetups(players)).toEqual([{ mode: "human" }, { mode: "human" }]);
  });
});

describe("reconnect / refresh snapshot round-trip", () => {
  it("revives Firebase-pruned empty containers and nulls", () => {
    const G = makeState(2);
    const wire = serializeSnapshot(G, { currentPlayer: "0", phase: "play", turn: 3, playOrderPos: 0 });
    // Simulate RTDB pruning: empty objects/arrays and nulls disappear.
    const pruned = JSON.parse(
      JSON.stringify(wire, (key, value) => {
        if (value === null) return undefined;
        if (typeof value === "object" && value && Object.keys(value).length === 0) return undefined;
        return value;
      }),
    );
    const revived = reviveSnapshot(pruned);
    expect(revived.G.buildings).toEqual({});
    expect(revived.G.roads).toEqual({});
    expect(revived.G.pendingSetupSettlement).toBeNull();
    expect(revived.G.lastRoll).toEqual([3, 4]); // real values survive the wire
    expect(revived.G.lastEventDie).toBeNull(); // pruned null is restored
    expect(revived.G.players["0"].devCards).toEqual([]);
    expect(revived.ctx.currentPlayer).toBe("0");
  });

  it("is idempotent — reviving twice equals reviving once (refresh safety)", () => {
    const G = makeState(2);
    G.players["0"].resources.wood = 3;
    const wire = serializeSnapshot(G, { currentPlayer: "1", phase: "play", turn: 9, playOrderPos: 1 });
    const once = reviveSnapshot(wire);
    const twice = reviveSnapshot(JSON.parse(JSON.stringify(once)));
    expect(twice).toEqual(once);
  });

  it("never leaks device-local seat mapping or the resume guard to the wire", () => {
    const G = makeState(2);
    G._duoSkipTurnReset = true;
    G.playerSetups = [{ mode: "human" }, { mode: "remote" }];
    const wire = serializeSnapshot(G, { currentPlayer: "0", phase: "play", turn: 1, playOrderPos: 0 });
    expect(wire.G._duoSkipTurnReset).toBeUndefined();
    expect(wire.G.playerSetups).toEqual([{ mode: "human" }, { mode: "human" }]);
  });
});
