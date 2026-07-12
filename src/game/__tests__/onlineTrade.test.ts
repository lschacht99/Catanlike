import { describe, expect, it } from "vitest";
import { canResponderPay, isTradeStale, onlineTradeRole, resolveDisplayPlayerId, toOnlineTradeState } from "../onlineTrade";
import { makeState } from "./helpers";
import type { TradeOffer } from "@/types/game";

const offer: TradeOffer = { from: "0", to: "1", give: "wood", giveAmount: 2, receive: "ore", receiveAmount: 1 };

describe("onlineTradeRole (who sees which panel on duo online)", () => {
  it("identifies the proposer's own seat", () => {
    expect(onlineTradeRole(offer, "0")).toBe("proposer");
  });

  it("identifies the responder's own seat", () => {
    expect(onlineTradeRole(offer, "1")).toBe("responder");
  });

  it("is a bystander for any other seat in a 3-4 player game", () => {
    expect(onlineTradeRole(offer, "2")).toBe("bystander");
    expect(onlineTradeRole(offer, "3")).toBe("bystander");
  });

  it("is a bystander when there is no offer at all", () => {
    expect(onlineTradeRole(null, "0")).toBe("bystander");
    expect(onlineTradeRole(undefined, "0")).toBe("bystander");
  });
});

describe("isTradeStale (safe-recovery trigger)", () => {
  it("is not stale when the proposer can still honor their give side", () => {
    const G = makeState(2);
    G.players["0"].resources.wood = 2;
    expect(isTradeStale(G, offer)).toBe(false);
  });

  it("is stale once the proposer can no longer pay what they offered", () => {
    const G = makeState(2);
    G.players["0"].resources.wood = 1; // offer needs 2
    expect(isTradeStale(G, offer)).toBe(true);
  });

  it("is stale if either referenced player is missing", () => {
    const G = makeState(2);
    delete (G.players as Record<string, unknown>)["1"];
    expect(isTradeStale(G, offer)).toBe(true);
  });

  it("is NOT stale just because the responder can't currently pay — that's an ordinary refuse/accept decision, not staleness", () => {
    const G = makeState(2);
    G.players["0"].resources.wood = 2;
    G.players["1"].resources.ore = 0; // responder can't pay receive side
    expect(isTradeStale(G, offer)).toBe(false);
  });
});

describe("canResponderPay", () => {
  it("true when the responder holds enough of the requested resource", () => {
    const G = makeState(2);
    G.players["1"].resources.ore = 1;
    expect(canResponderPay(G, offer)).toBe(true);
  });

  it("false when they don't", () => {
    const G = makeState(2);
    G.players["1"].resources.ore = 0;
    expect(canResponderPay(G, offer)).toBe(false);
  });
});

describe("resolveDisplayPlayerId (private hands — each device shows only its own resources)", () => {
  it("in local pass-and-play, always shows the active player's hand (device is physically handed over)", () => {
    expect(resolveDisplayPlayerId(false, "", "1")).toBe("1");
    expect(resolveDisplayPlayerId(false, "0", "1")).toBe("1"); // mySeatId ignored offline
  });

  it("online, shows THIS device's own seat regardless of whose turn it is", () => {
    expect(resolveDisplayPlayerId(true, "1", "0")).toBe("1"); // not seat 0's turn — still shows seat 1's own hand
    expect(resolveDisplayPlayerId(true, "0", "0")).toBe("0");
  });

  it("online with no resolved seat yet (mySeatId empty) falls back to current player rather than crashing", () => {
    expect(resolveDisplayPlayerId(true, "", "0")).toBe("0");
  });
});

describe("toOnlineTradeState (wire-facing {id, fromPlayerId, toPlayerId, offer, request, status, createdAt} shape)", () => {
  it("maps the engine's TradeOffer fields onto the requested names", () => {
    const state = toOnlineTradeState(offer, false);
    expect(state).toEqual({
      id: "0:1:wood:2:ore:1",
      fromPlayerId: "0",
      toPlayerId: "1",
      offer: { resource: "wood", amount: 2 },
      request: { resource: "ore", amount: 1 },
      status: "pending",
      createdAt: null,
    });
  });

  it("reports status expired when flagged stale", () => {
    expect(toOnlineTradeState(offer, true).status).toBe("expired");
  });

  it("produces a stable id for the same offer content", () => {
    const other: TradeOffer = { ...offer };
    expect(toOnlineTradeState(offer, false).id).toBe(toOnlineTradeState(other, false).id);
  });
});
