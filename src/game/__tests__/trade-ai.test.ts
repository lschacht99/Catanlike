import { describe, expect, it } from "vitest";
import { makeState } from "./helpers";
import { evaluateTradeOffer, resourceValueFor } from "../ai/trade";
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
