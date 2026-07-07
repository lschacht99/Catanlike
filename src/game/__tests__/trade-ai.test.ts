import { describe, expect, it } from "vitest";
import { evaluateBotTrade } from "../trade-ai";
import { makeState } from "./helpers";

describe("bot trade decisions", () => {
  it("refuses when bot cannot pay", () => {
    const G = makeState(2);
    G.players[0].resources.wood = 1;
    expect(evaluateBotTrade(G, { proposer: "0", target: "1", give: "wood", giveAmount: 1, receive: "ore", receiveAmount: 1 }, () => 0.5).accepted).toBe(false);
  });

  it("accepts a useful fair trade", () => {
    const G = makeState(2);
    G.players[0].resources.wood = 1;
    G.players[1].resources.ore = 3;
    G.players[1].resources.brick = 1;
    G.players[1].resources.grain = 2;
    expect(evaluateBotTrade(G, { proposer: "0", target: "1", give: "wool", giveAmount: 1, receive: "ore", receiveAmount: 1 }, () => 1).accepted).toBe(false);
    G.players[0].resources.wool = 1;
    expect(evaluateBotTrade(G, { proposer: "0", target: "1", give: "wool", giveAmount: 1, receive: "ore", receiveAmount: 1 }, () => 1).accepted).toBe(true);
  });
});
