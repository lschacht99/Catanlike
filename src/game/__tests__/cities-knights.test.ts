import { describe, expect, it } from "vitest";
import { PROGRESS_DECK } from "../constants";
import { improveCity, playProgressCard, resolveBarbarian } from "../moves";
import { makeState } from "./helpers";

describe("cities and knights rules", () => {
  it("creates a meaningful progress deck", () => {
    expect(PROGRESS_DECK.length).toBeGreaterThanOrEqual(18);
    expect(new Set(PROGRESS_DECK).size).toBeGreaterThanOrEqual(12);
  });

  it("plays progress cards from hand", () => {
    const G = makeState(2); G.variant = "cities-knights"; G.players[0].progressCards = ["oreRush"]; G.progressDiscards = [];
    (playProgressCard as any)({ G, playerID: "0" }, "oreRush");
    expect(G.players[0].resources.ore).toBe(2);
    expect(G.players[0].progressCards).toHaveLength(0);
  });

  it("upgrades city improvements with commodities", () => {
    const G = makeState(2); G.variant = "cities-knights"; G.players[0].commodities = { coin: 0, cloth: 1, book: 0 }; G.players[0].improvements = { trade: 0, politics: 0, science: 0 }; G.buildings.a = { player: "0", city: true };
    (improveCity as any)({ G, playerID: "0" }, "trade");
    expect(G.players[0].improvements.trade).toBe(1);
  });

  it("resolves barbarian attacks and deactivates knights", () => {
    const G = makeState(2); G.variant = "cities-knights"; G.buildings.a = { player: "0", city: true }; G.knights = { k: "0" }; G.activeKnights = { k: true }; G.knightLevels = { k: 1 };
    resolveBarbarian(G);
    expect(G.activeKnights.k).toBe(false);
    expect(G.barbarianPosition).toBe(0);
    expect(G.players[0].victoryBonus).toBe(1);
  });
});
