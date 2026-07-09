/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck
import { describe, expect, it } from "vitest";
import { PROGRESS_DECK, normalizeCommodities } from "../constants";
import { improveCity, playProgressCard, produce, resolveBarbarian } from "../moves";
import { makeState } from "./helpers";

/** boardgame.io moves are a Move union that tsc won't call directly in tests. */
const run = (fn: any, ...args: any[]) => fn(...args);

describe("cities & knights city production", () => {
  it("a C&K city on wood yields 1 wood + 1 paper", () => {
    const G = makeState(2, { variant: "cities-knights" });
    produce(G, "0", "wood", true);
    expect(G.players["0"].resources.wood).toBe(1);
    expect(G.players["0"].commodities.paper).toBe(1);
  });

  it("a C&K city on ore yields 1 ore + 1 coin", () => {
    const G = makeState(2, { variant: "cities-knights" });
    produce(G, "0", "ore", true);
    expect(G.players["0"].resources.ore).toBe(1);
    expect(G.players["0"].commodities.coin).toBe(1);
  });

  it("a C&K city on wool yields 1 wool + 1 cloth", () => {
    const G = makeState(2, { variant: "cities-knights" });
    produce(G, "0", "wool", true);
    expect(G.players["0"].resources.wool).toBe(1);
    expect(G.players["0"].commodities.cloth).toBe(1);
  });

  it("a C&K city on brick or grain yields 2 resources and no commodity", () => {
    const G = makeState(2, { variant: "cities-knights" });
    produce(G, "0", "brick", true);
    produce(G, "0", "grain", true);
    expect(G.players["0"].resources.brick).toBe(2);
    expect(G.players["0"].resources.grain).toBe(2);
    const c = G.players["0"].commodities;
    expect(c.paper + c.coin + c.cloth).toBe(0);
  });

  it("a base-game city yields 2 resources only, never a commodity", () => {
    const G = makeState(2, { variant: "base" });
    produce(G, "0", "wood", true);
    expect(G.players["0"].resources.wood).toBe(2);
    const c = G.players["0"].commodities;
    expect(c.paper + c.coin + c.cloth).toBe(0);
  });

  it("a settlement yields 1 resource regardless of variant", () => {
    const G = makeState(2, { variant: "cities-knights" });
    produce(G, "0", "wood", false);
    expect(G.players["0"].resources.wood).toBe(1);
    expect(G.players["0"].commodities.paper).toBe(0);
  });
});

describe("commodity save migration", () => {
  it("migrates legacy book into paper and defaults missing keys", () => {
    expect(normalizeCommodities({ book: 2, coin: 1 })).toEqual({ paper: 2, coin: 1, cloth: 0 });
    expect(normalizeCommodities(undefined)).toEqual({ paper: 0, coin: 0, cloth: 0 });
  });
});

describe("cities and knights rules", () => {
  it("creates a meaningful progress deck", () => {
    expect(PROGRESS_DECK.length).toBeGreaterThanOrEqual(18);
    expect(new Set(PROGRESS_DECK).size).toBeGreaterThanOrEqual(12);
  });

  it("plays progress cards from hand", () => {
    const G = makeState(2); G.variant = "cities-knights"; G.players[0].progressCards = ["oreRush"]; G.progressDiscards = [];
    run(playProgressCard, { G, playerID: "0" }, "oreRush");
    expect(G.players[0].resources.ore).toBe(2);
    expect(G.players[0].progressCards).toHaveLength(0);
  });

  it("upgrades city improvements with commodities", () => {
    const G = makeState(2); G.variant = "cities-knights"; G.players[0].commodities = { paper: 0, coin: 0, cloth: 1 }; G.players[0].improvements = { trade: 0, politics: 0, science: 0 }; G.buildings.a = { player: "0", city: true };
    run(improveCity, { G, playerID: "0" }, "trade");
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
