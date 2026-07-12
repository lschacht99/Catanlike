/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck
import { describe, expect, it } from "vitest";
import { Client } from "boardgame.io/client";
import { createDuoGame } from "../game";
import { makeState } from "./helpers";

/**
 * Reproduces duo-online's real architecture end to end: EVERY device
 * rebuilds an independent boardgame.io client from the latest synced
 * snapshot (see DuoGame.tsx / botRunner.ts) — there is no shared
 * `multiplayer` transport. These tests build a proposer client, take its
 * snapshot, and build a SEPARATE fresh client for the responder's seat from
 * that snapshot, exactly like a second phone reconnecting. Before the
 * events.setActivePlayers fix (game.ts RESET_TURN + moves.ts), the
 * responder's fresh client rejected respondTrade/cancelTrade as "disallowed
 * move" because boardgame.io's own IsPlayerActive gate only recognizes
 * ctx.currentPlayer, and ctx.activePlayers never survives the wire.
 */

function buildClientFromSnapshot(G: any, playerID: string) {
  const client = Client({
    game: createDuoGame({ ...G }, "play", 0),
    numPlayers: G.numPlayers,
    playerID,
    multiplayer: undefined,
  });
  client.start();
  return client;
}

/** Sets up a 2-player play-phase G with a pending trade from "0" to "1". */
function seedPendingTrade() {
  const G = makeState(2, { playerModes: ["human", "human"] });
  G.players["0"].resources.wood = 3;
  G.players["1"].resources.ore = 3;
  const seeded = buildClientFromSnapshot(G, "0");
  seeded.moves.proposeTrade("1", "wood", 1, "ore", 1);
  const afterPropose = seeded.getState()!;
  expect(afterPropose.G.pendingTrade).toMatchObject({ from: "0", to: "1" });
  seeded.stop();
  // getState().G comes back Immer-frozen — clone before handing to the next
  // independently-remounted client, exactly like a fresh JSON snapshot would.
  return JSON.parse(JSON.stringify(afterPropose.G));
}

describe("duo online trade — end to end across independently-remounted clients", () => {
  it("ACCEPT: the responder's own fresh client can accept and resources move", () => {
    const G = seedPendingTrade();
    const responder = buildClientFromSnapshot(G, "1");
    responder.moves.respondTrade(true);
    const after = responder.getState()!;
    expect(after.G.pendingTrade).toBeNull();
    expect(after.G.lastTradeResult?.accepted).toBe(true);
    expect(after.G.players["0"].resources.wood).toBe(2);
    expect(after.G.players["0"].resources.ore).toBe(1);
    expect(after.G.players["1"].resources.wood).toBe(1);
    expect(after.G.players["1"].resources.ore).toBe(2);
    responder.stop();
  });

  it("DECLINE: the responder's own fresh client can decline and nothing transfers", () => {
    const G = seedPendingTrade();
    const responder = buildClientFromSnapshot(G, "1");
    responder.moves.respondTrade(false);
    const after = responder.getState()!;
    expect(after.G.pendingTrade).toBeNull();
    expect(after.G.lastTradeResult?.accepted).toBe(false);
    expect(after.G.players["0"].resources.wood).toBe(3); // untouched
    expect(after.G.players["1"].resources.ore).toBe(3); // untouched
    responder.stop();
  });

  it("UNAUTHORIZED: a bystander seat's fresh client cannot respond to someone else's trade", () => {
    const G = makeState(3, { playerModes: ["human", "human", "human"] });
    G.players["0"].resources.wood = 3;
    G.players["1"].resources.ore = 3;
    const seeded = buildClientFromSnapshot(G, "0");
    seeded.moves.proposeTrade("1", "wood", 1, "ore", 1);
    const withTrade = JSON.parse(JSON.stringify(seeded.getState()!.G));
    seeded.stop();

    const bystander = buildClientFromSnapshot(withTrade, "2");
    const before = bystander.getState()!.G;
    bystander.moves.respondTrade(true);
    const after = bystander.getState()!.G;
    // Rejected at the engine's playerID-activity gate: G is untouched.
    expect(after.pendingTrade).toEqual(before.pendingTrade);
    expect(after.lastTradeResult).toEqual(before.lastTradeResult);
    bystander.stop();
  });

  it("UNAUTHORIZED: a bystander cannot cancel someone else's trade either", () => {
    const G = makeState(3, { playerModes: ["human", "human", "human"] });
    G.players["0"].resources.wood = 3;
    const seeded = buildClientFromSnapshot(G, "0");
    seeded.moves.proposeTrade("1", "wood", 1, "ore", 1);
    const withTrade = JSON.parse(JSON.stringify(seeded.getState()!.G));
    seeded.stop();

    const bystander = buildClientFromSnapshot(withTrade, "2");
    bystander.moves.cancelTrade();
    expect(bystander.getState()!.G.pendingTrade).not.toBeNull();
    bystander.stop();
  });

  it("INSUFFICIENT RESOURCES: the responder's own fresh client cannot accept an offer it can't pay — voided safely", () => {
    const G = makeState(2, { playerModes: ["human", "human"] });
    G.players["0"].resources.wood = 3;
    G.players["1"].resources.ore = 0; // responder can't pay
    const seeded = buildClientFromSnapshot(G, "0");
    seeded.moves.proposeTrade("1", "wood", 1, "ore", 1);
    const withTrade = JSON.parse(JSON.stringify(seeded.getState()!.G));
    seeded.stop();

    const responder = buildClientFromSnapshot(withTrade, "1");
    responder.moves.respondTrade(true);
    const after = responder.getState()!.G;
    expect(after.pendingTrade).toBeNull();
    expect(after.lastTradeResult?.accepted).toBe(false);
    expect(after.players["0"].resources.wood).toBe(3); // no partial transfer
    responder.stop();
  });

  it("DUPLICATE ACTION: responding twice from re-dispatched clients is a no-op the second time", () => {
    const G = seedPendingTrade();
    const responder = buildClientFromSnapshot(G, "1");
    responder.moves.respondTrade(true);
    const resolved = responder.getState()!.G;
    expect(resolved.pendingTrade).toBeNull();

    // A second, independently-remounted responder client (e.g. a duplicate
    // tap that raced ahead, or a reconnect that replays from the same base)
    // built from the ALREADY-resolved snapshot has nothing left to respond
    // to — respondTrade with no pendingTrade is rejected, not re-applied.
    const secondAttempt = buildClientFromSnapshot(resolved, "1");
    secondAttempt.moves.respondTrade(true);
    const after = secondAttempt.getState()!.G;
    expect(after.players["0"].resources.wood).toBe(resolved.players["0"].resources.wood);
    expect(after.players["0"].resources.ore).toBe(resolved.players["0"].resources.ore);
    secondAttempt.stop();
    responder.stop();
  });

  it("CANCEL: the proposer's own fresh client can cancel their own pending trade", () => {
    const G = seedPendingTrade();
    const proposerAgain = buildClientFromSnapshot(G, "0");
    proposerAgain.moves.cancelTrade();
    const after = proposerAgain.getState()!.G;
    expect(after.pendingTrade).toBeNull();
    expect(after.players["0"].resources.wood).toBe(3); // untouched
    proposerAgain.stop();
  });

  it("RECONNECT: a THIRD fresh client for the same responder seat, built after the trade already resolved, sees the resolved state with no re-transfer", () => {
    const G = seedPendingTrade();
    const responder = buildClientFromSnapshot(G, "1");
    responder.moves.respondTrade(true);
    const resolved = responder.getState()!.G;
    responder.stop();

    // Simulates the responder's phone refreshing/reconnecting after their
    // own accept already synced — a brand new client mounted on the
    // resolved snapshot must not find anything left to act on.
    const reconnected = buildClientFromSnapshot(resolved, "1");
    const state = reconnected.getState()!;
    expect(state.G.pendingTrade).toBeNull();
    expect(state.G.players["0"].resources.wood).toBe(2);
    expect(state.G.players["1"].resources.ore).toBe(2);
    reconnected.stop();
  });

  it("STALE REVISION semantics: proposing again after a resolved trade starts a fresh, independent offer (old offer never reanimates)", () => {
    const G = seedPendingTrade();
    const responder = buildClientFromSnapshot(G, "1");
    responder.moves.respondTrade(true);
    const resolved = JSON.parse(JSON.stringify(responder.getState()!.G));
    responder.stop();

    resolved.players["0"].resources.grain = 2;
    const proposerAgain = buildClientFromSnapshot(resolved, "0");
    proposerAgain.moves.proposeTrade("1", "grain", 1, "wool", 1);
    const restate = proposerAgain.getState()!.G;
    expect(restate.pendingTrade).toMatchObject({ from: "0", to: "1", give: "grain" });
    proposerAgain.stop();
  });
});
