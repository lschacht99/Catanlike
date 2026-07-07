import { describe, expect, it } from "vitest";
import {
  DEV_DECK_COMPOSITION,
  devDeck,
  emptyResources,
  LONGEST_ROAD_MIN,
} from "../constants";
import { canBuyDevCard, getGeometry, playableDevCardIndex } from "../rules";
import {
  longestRoadLength,
  publicPoints,
  updateLargestArmy,
  updateLongestRoad,
  victoryPoints,
} from "../scoring";
import { makeState } from "./helpers";

describe("development deck", () => {
  it("has the standard 25-card composition", () => {
    const deck = devDeck();
    expect(deck).toHaveLength(25);
    for (const [type, count] of Object.entries(DEV_DECK_COMPOSITION)) {
      expect(deck.filter((c) => c === type)).toHaveLength(count);
    }
  });

  it("requires grain + wool + ore and a non-empty deck to buy", () => {
    const G = makeState();
    G.devDeck = devDeck();
    expect(canBuyDevCard(G, "0")).toBe(false);
    G.players["0"].resources = { ...emptyResources(), grain: 1, wool: 1, ore: 1 };
    expect(canBuyDevCard(G, "0")).toBe(true);
    G.devDeck = [];
    expect(canBuyDevCard(G, "0")).toBe(false);
  });
});

describe("playing cards", () => {
  it("cannot play a card the turn it was bought, or two per turn", () => {
    const G = makeState();
    G.players["0"].devCards = [{ type: "knight", turnBought: 5 }];
    expect(playableDevCardIndex(G, "0", "knight", 5)).toBe(-1);
    expect(playableDevCardIndex(G, "0", "knight", 6)).toBe(0);
    G.playedDevCardThisTurn = true;
    expect(playableDevCardIndex(G, "0", "knight", 6)).toBe(-1);
  });

  it("victory cards are never playable but always count", () => {
    const G = makeState();
    G.players["0"].devCards = [{ type: "victory", turnBought: 1 }];
    expect(playableDevCardIndex(G, "0", "victory", 99)).toBe(-1);
    expect(victoryPoints(G, "0")).toBe(1);
    expect(publicPoints(G, "0")).toBe(0);
  });
});

describe("largest army", () => {
  it("needs 3 knights and strictly more than the holder", () => {
    const G = makeState();
    G.players["0"].knightsPlayed = 2;
    updateLargestArmy(G);
    expect(G.largestArmyHolder).toBeNull();
    G.players["0"].knightsPlayed = 3;
    updateLargestArmy(G);
    expect(G.largestArmyHolder).toBe("0");
    // A tie does not steal the bonus.
    G.players["1"].knightsPlayed = 3;
    updateLargestArmy(G);
    expect(G.largestArmyHolder).toBe("0");
    G.players["1"].knightsPlayed = 4;
    updateLargestArmy(G);
    expect(G.largestArmyHolder).toBe("1");
    expect(publicPoints(G, "1")).toBe(2);
  });
});

describe("longest road", () => {
  it("measures a chain and awards the bonus at 5", () => {
    const G = makeState();
    const geo = getGeometry(G.board);
    // Walk a chain of connected edges starting anywhere.
    let vertex = Object.keys(geo.vertices)[0];
    const used = new Set<string>();
    for (let i = 0; i < LONGEST_ROAD_MIN; i++) {
      const edgeId = geo.vertices[vertex].edges.find((e) => !used.has(e))!;
      used.add(edgeId);
      G.roads[edgeId] = "0";
      const edge = geo.edges[edgeId];
      vertex = edge.a === vertex ? edge.b : edge.a;
    }
    expect(longestRoadLength(G, "0")).toBeGreaterThanOrEqual(LONGEST_ROAD_MIN);
    updateLongestRoad(G);
    expect(G.longestRoadHolder).toBe("0");
    expect(publicPoints(G, "0")).toBe(2);
  });

  it("an opponent settlement cuts the road", () => {
    const G = makeState();
    const geo = getGeometry(G.board);
    // Build a 2-edge path a-b-c and verify length 2, then block b.
    const va = Object.values(geo.vertices).find((v) => v.edges.length >= 2)!;
    const e1 = geo.edges[va.edges[0]];
    const mid = e1.a === va.id ? e1.b : e1.a;
    const e2id = geo.vertices[mid].edges.find((e) => e !== e1.id)!;
    G.roads[e1.id] = "0";
    G.roads[e2id] = "0";
    expect(longestRoadLength(G, "0")).toBe(2);
    G.buildings[mid] = { player: "1", city: false };
    expect(longestRoadLength(G, "0")).toBe(1);
  });
});
