import { describe, expect, it } from "vitest";
import type { GameState } from "@/types/game";
import { emptyResources } from "../constants";
import { randomBoard } from "../generator";
import { buildGeometry } from "../geometry";
import {
  canAfford,
  canBankTrade,
  canPayCost,
  validCitySpots,
  validRoadSpots,
  validSettlementSpots,
} from "../rules";
import { setupOrder } from "../game";
import { victoryPoints, winner } from "../scoring";

function makeState(numPlayers = 3): GameState {
  const board = randomBoard(() => 0.42);
  const players: GameState["players"] = {};
  for (let i = 0; i < numPlayers; i++) players[String(i)] = { resources: emptyResources() };
  return {
    numPlayers,
    board,
    players,
    buildings: {},
    roads: {},
    banditTile: board.tiles.find((t) => t.resource === "desert")!.id,
    setupStep: 0,
    pendingSetupSettlement: null,
    hasRolled: true,
    lastRoll: [3, 4],
    mustMoveBandit: false,
    log: [],
  };
}

describe("build costs", () => {
  it("validates each build cost exactly", () => {
    const hand = emptyResources();
    expect(canAfford(hand, "road")).toBe(false);
    hand.wood = 1;
    hand.brick = 1;
    expect(canAfford(hand, "road")).toBe(true);
    expect(canAfford(hand, "settlement")).toBe(false);
    hand.grain = 1;
    hand.wool = 1;
    expect(canAfford(hand, "settlement")).toBe(true);
    expect(canAfford(hand, "city")).toBe(false);
    hand.grain = 2;
    hand.ore = 3;
    expect(canAfford(hand, "city")).toBe(true);
  });

  it("canPayCost never passes with a partial hand", () => {
    expect(canPayCost({ ...emptyResources(), wood: 1 }, { wood: 1, brick: 1 })).toBe(false);
  });
});

describe("settlement placement", () => {
  it("allows every vertex during setup on an empty board", () => {
    const G = makeState();
    expect(validSettlementSpots(G, "0", true)).toHaveLength(54);
  });

  it("enforces the distance rule", () => {
    const G = makeState();
    const geo = buildGeometry(G.board.tiles);
    const vertexId = Object.keys(geo.vertices)[0];
    G.buildings[vertexId] = { player: "0", city: false };
    const spots = validSettlementSpots(G, "1", true);
    expect(spots).not.toContain(vertexId);
    for (const n of geo.vertices[vertexId].neighbors) {
      expect(spots).not.toContain(n);
    }
  });

  it("requires a connecting road outside of setup", () => {
    const G = makeState();
    const geo = buildGeometry(G.board.tiles);
    // No roads at all: nowhere to build.
    expect(validSettlementSpots(G, "0", false)).toHaveLength(0);
    // A lone road opens exactly its two endpoints.
    const edge = Object.values(geo.edges)[0];
    G.roads[edge.id] = "0";
    const spots = validSettlementSpots(G, "0", false).sort();
    expect(spots).toEqual([edge.a, edge.b].sort());
    // ...but not for another player.
    expect(validSettlementSpots(G, "1", false)).toHaveLength(0);
  });
});

describe("road placement", () => {
  it("during setup only offers edges touching the pending settlement", () => {
    const G = makeState();
    const geo = buildGeometry(G.board.tiles);
    const vertexId = Object.keys(geo.vertices)[10];
    G.buildings[vertexId] = { player: "0", city: false };
    G.pendingSetupSettlement = vertexId;
    const spots = validRoadSpots(G, "0", true);
    expect(spots.sort()).toEqual([...geo.vertices[vertexId].edges].sort());
  });

  it("extends the own network but not through opponent buildings", () => {
    const G = makeState();
    const geo = buildGeometry(G.board.tiles);
    const edge = Object.values(geo.edges)[0];
    G.roads[edge.id] = "0";
    const spots = validRoadSpots(G, "0", false);
    expect(spots.length).toBeGreaterThan(0);
    expect(spots).not.toContain(edge.id);
    // Block endpoint `a` with an opponent settlement: edges at `a` disappear
    // unless they connect via `b`.
    G.buildings[edge.a] = { player: "1", city: false };
    const blocked = validRoadSpots(G, "0", false);
    for (const id of blocked) {
      const e = geo.edges[id];
      expect(e.a === edge.b || e.b === edge.b).toBe(true);
    }
  });
});

describe("cities, trades, scoring", () => {
  it("only own settlements can be upgraded", () => {
    const G = makeState();
    const geo = buildGeometry(G.board.tiles);
    const [v1, v2] = Object.keys(geo.vertices);
    G.buildings[v1] = { player: "0", city: false };
    G.buildings[v2] = { player: "1", city: false };
    expect(validCitySpots(G, "0")).toEqual([v1]);
  });

  it("bank trade needs 4 of a kind and different resources", () => {
    const hand = { ...emptyResources(), wood: 4 };
    expect(canBankTrade(hand, "wood", "ore")).toBe(true);
    expect(canBankTrade(hand, "wood", "wood")).toBe(false);
    expect(canBankTrade({ ...emptyResources(), wood: 3 }, "wood", "ore")).toBe(false);
  });

  it("scores 1 per settlement, 2 per city, wins at 10", () => {
    const G = makeState();
    const geo = buildGeometry(G.board.tiles);
    const ids = Object.keys(geo.vertices);
    for (let i = 0; i < 4; i++) G.buildings[ids[i]] = { player: "0", city: true };
    expect(victoryPoints(G, "0")).toBe(8);
    expect(winner(G)).toBeNull();
    G.buildings[ids[4]] = { player: "0", city: false };
    G.buildings[ids[5]] = { player: "0", city: false };
    expect(victoryPoints(G, "0")).toBe(10);
    expect(winner(G)).toBe("0");
  });
});

describe("setup snake order", () => {
  it("goes 0..n-1 then back down to 0", () => {
    const seq = Array.from({ length: 8 }, (_, step) => setupOrder(4, step));
    expect(seq).toEqual([0, 1, 2, 3, 3, 2, 1, 0]);
  });
});
