/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck
import { describe, expect, it } from "vitest";
import { makeState } from "../../../game/__tests__/helpers";
import {
  generateRoomCode,
  isValidRoomCode,
  isNewerSnapshot,
  reviveSnapshot,
  serializeSnapshot,
  shouldNotifyTurn,
  turnId,
  turnNotificationText,
  validateProposal,
} from "../protocol";

function makeRoomState(currentPlayer = "0", revision = 4) {
  const G = makeState(2);
  return {
    revision,
    snapshot: { G, ctx: { currentPlayer, phase: "play", turn: 7, playOrderPos: Number(currentPlayer) } },
  };
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
