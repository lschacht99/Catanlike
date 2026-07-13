import { describe, expect, it } from "vitest";
import { chooseBotAction, forceEndAction } from "../turn";
import { getGeometry } from "../../rules";
import { makeState } from "../../__tests__/helpers";

describe("chooseBotAction (shared local + online bot brain)", () => {
  it("rolls first when the bot hasn't rolled yet", () => {
    const G = makeState(2);
    G.hasRolled = false;
    const action = chooseBotAction(G, { phase: "play" }, "0", { variant: "base" });
    expect(action).toEqual({ move: "rollDice", args: [] });
  });

  it("resolves a pending bandit before anything else", () => {
    const G = makeState(2);
    G.mustMoveBandit = true;
    const action = chooseBotAction(G, { phase: "play" }, "0", { variant: "base" });
    expect(action?.move).toBe("moveBandit");
  });

  it("ends the turn when nothing is affordable and no trade offer is allowed", () => {
    const G = makeState(2);
    // Bare hand, no dev cards, no harbors — nothing to build or bank-trade.
    const action = chooseBotAction(G, { phase: "play" }, "0", { variant: "base", allowTradeOffer: false });
    expect(action).toEqual({ move: "endTurn", args: [] });
  });

  it("places a settlement during setup when one hasn't been placed yet", () => {
    const G = makeState(2);
    G.pendingSetupSettlement = null;
    const action = chooseBotAction(G, { phase: "setup" }, "0", { variant: "base" });
    expect(action?.move).toBe("placeSettlement");
  });

  it("places a road right after the setup settlement", () => {
    const G = makeState(2);
    const [vertexId] = Object.keys(getGeometry(G.board).vertices);
    G.pendingSetupSettlement = vertexId;
    const action = chooseBotAction(G, { phase: "setup" }, "0", { variant: "base" });
    expect(action?.move).toBe("placeRoad");
  });

  it("never proposes a trade unless explicitly allowed (online duo keeps this off)", () => {
    const G = makeState(2);
    G.players["1"].resources.ore = 5;
    G.players["0"].resources.wool = 3;
    const withoutOffer = chooseBotAction(G, { phase: "play" }, "0", { variant: "base", allowTradeOffer: false });
    expect(withoutOffer?.move).not.toBe("proposeTrade");
  });
});

describe("forceEndAction (online watchdog force-end)", () => {
  it("rolls first if the bot never rolled", () => {
    const G = makeState(2);
    G.hasRolled = false;
    expect(forceEndAction(G)).toEqual({ move: "rollDice", args: [] });
  });

  it("resolves the bandit before ending", () => {
    const G = makeState(2);
    G.mustMoveBandit = true;
    expect(forceEndAction(G).move).toBe("moveBandit");
  });

  it("otherwise just ends the turn", () => {
    const G = makeState(2);
    expect(forceEndAction(G)).toEqual({ move: "endTurn", args: [] });
  });
});
