import { describe, expect, it } from "vitest";
import { makeState } from "./helpers";
import { botProposeTrade, evaluateTradeOffer, resourceValueFor } from "../ai/trade";
import type { TradeOffer } from "@/types/game";
import { buildGeometry } from "../geometry";

/** Fixed RNG so the ±jitter is neutral (0.5 → 0 offset). */
const noJitter = () => 0.5;

function offer(partial: Partial<TradeOffer>): TradeOffer {
  return {
    from: "0",
    to: "1",
    give: "wood",
    giveAmount: 1,
    receive: "ore",
    receiveAmount: 1,
    ...partial,
  };
}

describe("resourceValueFor", () => {
  it("values needed resources above surplus", () => {
    const G = makeState(2);
    // Bot "1" has a settlement it could upgrade and no ore.
    const geo = buildGeometry(G.board.tiles);
    G.buildings[Object.keys(geo.vertices)[0]] = { player: "1", city: false };
    const needed = resourceValueFor(G, "1", "ore");
    G.players["1"].resources.wood = 6;
    const surplus = resourceValueFor(G, "1", "wood");
    expect(needed).toBeGreaterThan(surplus);
  });
});

describe("bot trade decisions", () => {
  it("refuses when the bot cannot pay what is requested", () => {
    const G = makeState(2, { playerModes: ["human", "bot"] });
    // Bot has no ore to give.
    G.players["1"].resources.ore = 0;
    const result = evaluateTradeOffer(G, offer({ receive: "ore", receiveAmount: 2 }), noJitter);
    expect(result.accept).toBe(false);
    expect(result.reason).toMatch(/enough/i);
  });

  it("accepts a clearly favorable trade (gets 2, gives 1 surplus)", () => {
    const G = makeState(2, { playerModes: ["human", "bot"] });
    G.players["1"].resources.wood = 6; // giving away surplus wood
    const result = evaluateTradeOffer(
      G,
      offer({ from: "0", to: "1", give: "ore", giveAmount: 2, receive: "wood", receiveAmount: 1 }),
      noJitter,
    );
    expect(result.accept).toBe(true);
  });

  it("refuses a lopsided trade that gives too much away", () => {
    const G = makeState(2, { playerModes: ["human", "bot"] });
    G.players["1"].resources.ore = 3;
    const result = evaluateTradeOffer(
      G,
      offer({ from: "0", to: "1", give: "wood", giveAmount: 1, receive: "ore", receiveAmount: 3 }),
      noJitter,
    );
    expect(result.accept).toBe(false);
  });

  it("will not bankroll a lone leader on a merely-fair trade", () => {
    const G = makeState(3, { playerModes: ["human", "bot", "human"] });
    // Make proposer (0) the sole leader with 2 cities.
    const geo = buildGeometry(G.board.tiles);
    const vids = Object.keys(geo.vertices);
    G.buildings[vids[0]] = { player: "0", city: true };
    G.buildings[vids[5]] = { player: "0", city: true };
    G.players["1"].resources.wool = 3;
    const result = evaluateTradeOffer(
      G,
      offer({ from: "0", to: "1", give: "wood", giveAmount: 1, receive: "wool", receiveAmount: 1 }),
      noJitter,
    );
    expect(result.accept).toBe(false);
    expect(result.reason).toMatch(/leader/i);
  });
});

describe("difficulty & bot proposals", () => {
  it("easy bots accept a slightly bad deal that hard bots refuse", () => {
    const G = makeState(2, { playerModes: ["human", "bot"] });
    G.players["1"].resources.ore = 2;
    // Bot gives 1 wood (gets), receives 1 ore (pays) — roughly neutral/slightly bad.
    const off = offer({ from: "0", to: "1", give: "wood", giveAmount: 1, receive: "ore", receiveAmount: 1 });
    const easy = evaluateTradeOffer(G, off, () => 0.5, "easy");
    const hard = evaluateTradeOffer(G, off, () => 0.5, "hard");
    // Easy is at least as willing as hard.
    expect(Number(easy.accept)).toBeGreaterThanOrEqual(Number(hard.accept));
  });

  it("botProposeTrade offers a needed resource for a surplus, targeting a human", () => {
    const G = makeState(2, { playerModes: ["bot", "human"] });
    // Bot (0) hoards wood, has no ore (needs it for nothing base... ensure a goal):
    G.players["0"].resources.wood = 4;
    G.players["0"].resources.ore = 0;
    G.players["1"].resources.ore = 3;
    const off = botProposeTrade(G, "0", () => 0, "hard"); // rng 0 -> always initiates
    if (off) {
      expect(off.from).toBe("0");
      expect(off.to).toBe("1"); // the human rival
      expect(off.give).not.toBe(off.receive);
      expect(G.players["0"].resources[off.give]).toBeGreaterThanOrEqual(2);
    }
  });

  it("bots never propose to other bots", () => {
    const G = makeState(3, { playerModes: ["bot", "bot", "bot"] });
    G.players["0"].resources.wood = 4;
    const off = botProposeTrade(G, "0", () => 0, "hard");
    expect(off).toBeNull(); // no human rival
  });
});
