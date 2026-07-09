/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck
import { describe, expect, it } from "vitest";
import { makeState } from "./helpers";
import {
  proposeTrade,
  respondTrade,
  buildKnight,
  upgradeKnight,
  activateKnight,
  deactivateKnight,
  improveCity,
  placeSettlement,
} from "../moves";
import { totalResources } from "../constants";
import { buildGeometry } from "../geometry";
import { INVALID_MOVE } from "boardgame.io/core";

/** Minimal boardgame.io move context wrapper. */
function ctx(G: any, playerID: string, extra: any = {}) {
  return { G, playerID, random: { Number: () => 0.5, D6: () => 3 }, events: {}, ...extra };
}

/** boardgame.io Move is a non-callable union to tsc; invoke via any. */
const run = (fn: any, ...args: any[]) => fn(...args);

describe("player trade offers", () => {
  it("parks a human-target offer as pending without moving resources", () => {
    const G = makeState(2, { playerModes: ["human", "human"] });
    G.players["0"].resources.wood = 2;
    run(proposeTrade, ctx(G, "0") as any, "1", "wood", 1, "ore", 1);
    expect(G.pendingTrade).toMatchObject({ from: "0", to: "1", give: "wood" });
    expect(G.players["0"].resources.wood).toBe(2); // not yet moved
  });

  it("rejects an offer the proposer cannot fund", () => {
    const G = makeState(2, { playerModes: ["human", "human"] });
    G.players["0"].resources.wood = 0;
    const r = run(proposeTrade, ctx(G, "0") as any, "1", "wood", 1, "ore", 1);
    expect(r).toBe(INVALID_MOVE);
  });

  it("settles resources only after the target accepts", () => {
    const G = makeState(2, { playerModes: ["human", "human"] });
    G.players["0"].resources.wood = 2;
    G.players["1"].resources.ore = 2;
    run(proposeTrade, ctx(G, "0") as any, "1", "wood", 1, "ore", 1);
    run(respondTrade, ctx(G, "1") as any, true);
    expect(G.players["0"].resources.wood).toBe(1);
    expect(G.players["0"].resources.ore).toBe(1);
    expect(G.players["1"].resources.wood).toBe(1);
    expect(G.players["1"].resources.ore).toBe(1);
    expect(G.pendingTrade).toBeNull();
    expect(G.lastTradeResult?.accepted).toBe(true);
  });

  it("refusing leaves both hands untouched", () => {
    const G = makeState(2, { playerModes: ["human", "human"] });
    G.players["0"].resources.wood = 2;
    G.players["1"].resources.ore = 2;
    run(proposeTrade, ctx(G, "0") as any, "1", "wood", 1, "ore", 1);
    run(respondTrade, ctx(G, "1") as any, false);
    expect(G.players["0"].resources.wood).toBe(2);
    expect(G.players["1"].resources.ore).toBe(2);
    expect(G.lastTradeResult?.accepted).toBe(false);
  });

  it("a bot target auto-resolves the offer immediately", () => {
    const G = makeState(2, { playerModes: ["human", "bot"] });
    G.players["0"].resources.ore = 2; // give surplus ore
    G.players["1"].resources.wood = 6; // bot has plenty of wood to give
    run(proposeTrade, ctx(G, "0") as any, "1", "ore", 2, "wood", 1);
    expect(G.pendingTrade).toBeNull();
    expect(G.lastTradeResult?.respondedByBot).toBe(true);
  });
});

describe("cities & knights moves", () => {
  function withCityAndKnight() {
    const G = makeState(2, { variant: "cities-knights" });
    const geo = buildGeometry(G.board.tiles);
    const vids = Object.keys(geo.vertices);
    G.buildings[vids[0]] = { player: "0", city: true };
    G.buildings[vids[3]] = { player: "0", city: false };
    return { G, vids };
  }

  it("builds, activates, upgrades and deactivates a knight", () => {
    const { G, vids } = withCityAndKnight();
    Object.assign(G.players["0"].resources, { grain: 5, wool: 5, ore: 5 });
    run(buildKnight, ctx(G, "0") as any, vids[3]);
    expect(G.knights[vids[3]]).toBe("0");
    expect(G.activeKnights[vids[3]]).toBe(false);

    run(activateKnight, ctx(G, "0") as any, vids[3]);
    expect(G.activeKnights[vids[3]]).toBe(true);

    run(upgradeKnight, ctx(G, "0") as any, vids[3]);
    expect(G.knightLevels[vids[3]]).toBe(2);

    run(deactivateKnight, ctx(G, "0") as any, vids[3]);
    expect(G.activeKnights[vids[3]]).toBe(false);
  });

  it("improves a city track by spending commodities", () => {
    const { G } = withCityAndKnight();
    G.players["0"].commodities.coin = 3;
    const r = run(improveCity, ctx(G, "0") as any, "politics");
    expect(r).not.toBe(INVALID_MOVE);
    expect(G.players["0"].improvements.politics).toBe(1);
    expect(G.players["0"].commodities.coin).toBe(2); // level 1 costs 1
  });

  it("blocks a city improvement the player cannot afford", () => {
    const { G } = withCityAndKnight();
    G.players["0"].commodities.paper = 0; // science costs paper
    const r = run(improveCity, ctx(G, "0") as any, "science");
    expect(r).toBe(INVALID_MOVE);
  });
});

describe("cities & knights setup", () => {
  it("round 1 places a settlement and grants no starting cards", () => {
    const G = makeState(2, { variant: "cities-knights" });
    const geo = buildGeometry(G.board.tiles);
    const cityVertex = Object.values(geo.vertices).find((v) =>
      v.tiles.some((t) => G.board.tiles[t].resource !== "desert"),
    )!.id;

    // Round 1 (setupStep 0): a settlement, no starting resources or commodities.
    G.setupStep = 0;
    G.pendingSetupSettlement = null;
    const firstVertex = Object.keys(geo.vertices).find(
      (id) => id !== cityVertex && geo.vertices[id].neighbors.every((n) => n !== cityVertex),
    )!;
    run(placeSettlement, ctx(G, "0") as any, firstVertex);
    expect(G.buildings[firstVertex].city).toBe(false);
    expect(totalResources(G.players["0"].resources)).toBe(0);
    const c0 = G.players["0"].commodities;
    expect(c0.paper + c0.coin + c0.cloth).toBe(0);
  });

  it("round 2 places a city and grants ONE resource per adjacent hex, NO commodities", () => {
    const G = makeState(2, { variant: "cities-knights" });
    const geo = buildGeometry(G.board.tiles);
    const cityVertex = Object.values(geo.vertices).find((v) =>
      v.tiles.some((t) => G.board.tiles[t].resource !== "desert"),
    )!.id;

    // Round 2 (setupStep >= numPlayers): the second building is a CITY, but the
    // STARTING hand is resources only — exactly one per adjacent non-desert hex,
    // and crucially NO paper/coin/cloth (commodities come later, from production).
    G.setupStep = 2;
    G.pendingSetupSettlement = null;
    run(placeSettlement, ctx(G, "0") as any, cityVertex);
    expect(G.buildings[cityVertex].city).toBe(true);

    const adjacentNonDesert = geo.vertices[cityVertex].tiles
      .map((t) => G.board.tiles[t].resource)
      .filter((r) => r !== "desert");
    expect(totalResources(G.players["0"].resources)).toBe(adjacentNonDesert.length);

    const c = G.players["0"].commodities;
    expect(c.paper + c.coin + c.cloth).toBe(0);
  });
});
