/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck
import { describe, expect, it } from "vitest";
import { makeState } from "./helpers";
import { bankTrade } from "../moves";
import { deriveHarbors, maritimeRate, playerHarborTypes, type HarborType } from "../harbors";
import { INVALID_MOVE } from "boardgame.io/core";

function ctx(G: any, playerID: string) {
  return { G, playerID, random: { Number: () => 0.5, D6: () => 3 }, events: {} };
}
const run = (fn: any, ...args: any[]) => fn(...args);

/** Put a building of `player` on a node of the first harbor of `type`. */
function giveHarbor(G: any, player: string, type: HarborType, city = false): void {
  const harbor = deriveHarbors(G.board).find((h) => h.type === type);
  if (!harbor) throw new Error(`no ${type} harbor on this board`);
  G.buildings[harbor.nodes[0]] = { player, city };
}

describe("per-player maritime trade rate", () => {
  it("defaults to 4:1 with no harbor", () => {
    const G = makeState(2, { variant: "cities-knights" });
    expect(maritimeRate(G, "0", "wood")).toBe(4);
    expect(maritimeRate(G, "0", "paper")).toBe(4);
    expect(playerHarborTypes(G, "0").size).toBe(0);
  });

  it("a 3:1 (generic) harbor owner trades resources AND commodities at 3", () => {
    const G = makeState(2, { variant: "cities-knights" });
    giveHarbor(G, "0", "generic");
    expect(maritimeRate(G, "0", "wood")).toBe(3);
    expect(maritimeRate(G, "0", "ore")).toBe(3);
    expect(maritimeRate(G, "0", "paper")).toBe(3);
    // A non-owner still pays 4.
    expect(maritimeRate(G, "1", "wood")).toBe(4);
  });

  it("a 2:1 wood harbor owner trades wood at 2 but other cards at 4", () => {
    const G = makeState(2, { variant: "cities-knights" });
    giveHarbor(G, "0", "wood");
    expect(maritimeRate(G, "0", "wood")).toBe(2);
    // The specific harbor does NOT extend to other resources or any commodity.
    expect(maritimeRate(G, "0", "ore")).toBe(4);
    expect(maritimeRate(G, "0", "paper")).toBe(4);
    expect(maritimeRate(G, "0", "cloth")).toBe(4);
  });

  it("Merchant Guild (Trade level 3) trades commodities at 2, not resources", () => {
    const G = makeState(2, { variant: "cities-knights" });
    G.players["0"].improvements.trade = 3;
    expect(maritimeRate(G, "0", "paper")).toBe(2);
    expect(maritimeRate(G, "0", "coin")).toBe(2);
    // Resources are unaffected by the guild — still 4 without a harbor.
    expect(maritimeRate(G, "0", "wood")).toBe(4);
  });
});

describe("bankTrade honors the per-player rate", () => {
  it("moves 4 resources for 1 with no harbor", () => {
    const G = makeState(2, { variant: "cities-knights" });
    G.players["0"].resources.wood = 4;
    run(bankTrade, ctx(G, "0"), "wood", "ore");
    expect(G.players["0"].resources.wood).toBe(0);
    expect(G.players["0"].resources.ore).toBe(1);
  });

  it("a 2:1 wood owner can trade 2 wood for a resource or a commodity", () => {
    const G = makeState(2, { variant: "cities-knights" });
    giveHarbor(G, "0", "wood");
    G.players["0"].resources.wood = 4;
    run(bankTrade, ctx(G, "0"), "wood", "ore");
    expect(G.players["0"].resources.wood).toBe(2);
    expect(G.players["0"].resources.ore).toBe(1);
    run(bankTrade, ctx(G, "0"), "wood", "paper");
    expect(G.players["0"].resources.wood).toBe(0);
    expect(G.players["0"].commodities.paper).toBe(1);
  });

  it("a 2:1 wood owner CANNOT dump 2 paper (or 2 ore) at that rate", () => {
    const G = makeState(2, { variant: "cities-knights" });
    giveHarbor(G, "0", "wood");
    G.players["0"].commodities.paper = 2;
    G.players["0"].resources.ore = 2;
    // Paper is a commodity (rate 4) and ore has no harbor (rate 4): both fail at 2.
    expect(run(bankTrade, ctx(G, "0"), "paper", "wood")).toBe(INVALID_MOVE);
    expect(run(bankTrade, ctx(G, "0"), "ore", "wood")).toBe(INVALID_MOVE);
    expect(G.players["0"].commodities.paper).toBe(2);
    expect(G.players["0"].resources.ore).toBe(2);
  });

  it("Merchant Guild lets a player trade 2 commodities for 1 chosen card", () => {
    const G = makeState(2, { variant: "cities-knights" });
    G.players["0"].improvements.trade = 3;
    G.players["0"].commodities.paper = 2;
    run(bankTrade, ctx(G, "0"), "paper", "grain");
    expect(G.players["0"].commodities.paper).toBe(0);
    expect(G.players["0"].resources.grain).toBe(1);
  });

  it("rejects commodity trades entirely in the base game", () => {
    const G = makeState(2, { variant: "base" });
    G.players["0"].commodities = { paper: 4, coin: 0, cloth: 0 };
    expect(run(bankTrade, ctx(G, "0"), "paper", "wood")).toBe(INVALID_MOVE);
  });
});
