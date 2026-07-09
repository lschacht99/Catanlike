import { describe, expect, it } from "vitest";
import { INVALID_MOVE } from "boardgame.io/core";
import type { GameState } from "@/types/game";
import type { TradeCardKey } from "../maritime";
import { makeState } from "./helpers";
import { bankTrade } from "../moves";
import { boardHarbors, maritimeTradeOptions } from "../maritime";
import { getGeometry } from "../rules";

function ownHarbor(G: ReturnType<typeof makeState>, player: string, kind: string) {
  const harbor = boardHarbors(G).find((h) => h.kind === kind)!;
  const edge = getGeometry(G.board).edges[harbor.edgeId];
  G.buildings[edge.a] = { player, city: false };
}

const callBankTrade = bankTrade as unknown as (ctx: { G: GameState; playerID: string }, give: TradeCardKey, receive: TradeCardKey) => unknown;

function move(G: ReturnType<typeof makeState>, playerID: string, give: TradeCardKey, receive: TradeCardKey) {
  return callBankTrade({ G, playerID }, give, receive);
}

describe("Cities & Knights maritime trade", () => {
  it("uses 4:1 when the player owns no harbor", () => {
    const G = makeState(2, { variant: "cities-knights" });
    G.players["0"].resources.wood = 4;
    expect(move(G, "0", "wood", "brick")).toBeUndefined();
    expect(G.players["0"].resources.wood).toBe(0);
    expect(G.players["0"].resources.brick).toBe(1);
  });

  it("lets only the 3:1 harbor owner trade 3 identical resources or commodities", () => {
    const G = makeState(2, { variant: "cities-knights" });
    ownHarbor(G, "0", "generic");
    G.players["0"].commodities!.paper = 3;
    G.players["1"].commodities!.paper = 3;
    expect(move(G, "0", "paper", "ore")).toBeUndefined();
    expect(G.players["0"].resources.ore).toBe(1);
    expect(move(G, "1", "paper", "ore")).toBe(INVALID_MOVE);
  });

  it("allows a wood harbor owner to trade 2 wood for any resource or commodity only", () => {
    const G = makeState(2, { variant: "cities-knights" });
    ownHarbor(G, "0", "wood");
    G.players["0"].resources.wood = 2;
    expect(move(G, "0", "wood", "paper")).toBeUndefined();
    expect(G.players["0"].commodities!.paper).toBe(1);
    G.players["0"].commodities!.paper = 2;
    G.players["0"].resources.ore = 2;
    expect(move(G, "0", "paper", "brick")).toBe(INVALID_MOVE);
    expect(move(G, "0", "ore", "brick")).toBe(INVALID_MOVE);
  });

  it("uses Trade level 3 as a separate 2:1 commodity ability", () => {
    const G = makeState(2, { variant: "cities-knights" });
    G.players["0"].improvements!.trade = 3;
    G.players["0"].commodities!.coin = 2;
    expect(move(G, "0", "coin", "wool")).toBeUndefined();
    expect(G.players["0"].resources.wool).toBe(1);
    expect(maritimeTradeOptions(G, "0").some((o) => o.give === "cloth" && o.source === "trade-improvement")).toBe(true);
  });
});
