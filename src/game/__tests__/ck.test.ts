import { describe, expect, it } from "vitest";
import { makeState } from "./helpers";
import {
  advanceBarbarians,
  drawProgressCard,
  eventFromDie,
  knightStrength,
  resolveBarbarianAttack,
  runProgressEvent,
} from "../ck";
import {
  PROGRESS_DECK_COMPOSITION,
  progressDeckFor,
  PROGRESS_CARD_TRACK,
} from "../constants";
import { buildGeometry } from "../geometry";

/** Deterministic RNG helper. */
const seq = (values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe("progress decks", () => {
  it("builds 10 cards per track, all mapped back to that track", () => {
    for (const track of ["trade", "politics", "science"] as const) {
      const deck = progressDeckFor(track);
      const total = Object.values(PROGRESS_DECK_COMPOSITION[track]).reduce(
        (a, b) => a + (b ?? 0),
        0,
      );
      expect(deck).toHaveLength(total);
      expect(deck.every((c) => PROGRESS_CARD_TRACK[c] === track)).toBe(true);
    }
  });
});

describe("event die", () => {
  it("maps 1-3 to raiders and 4/5/6 to the three tracks", () => {
    expect(eventFromDie(1)).toBe("barbarian");
    expect(eventFromDie(3)).toBe("barbarian");
    expect(eventFromDie(4)).toBe("trade");
    expect(eventFromDie(5)).toBe("politics");
    expect(eventFromDie(6)).toBe("science");
  });
});

describe("drawing progress cards", () => {
  it("moves a card from the track pile into the player's hand", () => {
    const G = makeState(2, { variant: "cities-knights" });
    const card = drawProgressCard(G, "0", "science", seq([0]));
    expect(card).not.toBeNull();
    expect(PROGRESS_CARD_TRACK[card!]).toBe("science");
    expect(G.players["0"].progressCards).toContain(card);
  });

  it("caps the hand at the limit, discarding the oldest", () => {
    const G = makeState(2, { variant: "cities-knights" });
    for (let i = 0; i < 6; i++) drawProgressCard(G, "0", "trade", seq([0]));
    expect(G.players["0"].progressCards!.length).toBeLessThanOrEqual(4);
    expect((G.progressDiscards ?? []).length).toBeGreaterThan(0);
  });
});

describe("progress event", () => {
  it("only draws for players with an improvement on that track", () => {
    const G = makeState(2, { variant: "cities-knights" });
    G.players["0"].improvements!.science = 3; // always draws (roll <= 4)
    const events = runProgressEvent(G, "science", seq([0.1]));
    expect(G.players["0"].progressCards!.length).toBe(1);
    expect(G.players["1"].progressCards!.length).toBe(0);
    expect(events.length).toBe(1);
  });
});

describe("barbarian attack", () => {
  function twoCities(player: string) {
    const G = makeState(2, { variant: "cities-knights" });
    const geo = buildGeometry(G.board.tiles);
    const vids = Object.keys(geo.vertices);
    G.buildings[vids[0]] = { player, city: true };
    return { G, vids };
  }

  it("rewards the sole strongest defender when defended", () => {
    const { G, vids } = twoCities("0");
    // Player 0 has an active knight >= city count (1).
    G.knights[vids[3]] = "0";
    G.activeKnights![vids[3]] = true;
    G.knightLevels![vids[3]] = 2;
    const outcome = resolveBarbarianAttack(G, seq([0]));
    expect(outcome.defended).toBe(true);
    expect(outcome.rewarded).toEqual(["0"]);
    expect(G.players["0"].victoryBonus).toBe(1);
    // Track reset and knights deactivated.
    expect(G.barbarianPosition).toBe(0);
    expect(G.activeKnights![vids[3]]).toBe(false);
  });

  it("pillages a city from the weakest defender when overrun", () => {
    const { G, vids } = twoCities("0");
    // No active knights -> strength 0 < 1 city.
    const outcome = resolveBarbarianAttack(G, seq([0]));
    expect(outcome.defended).toBe(false);
    expect(outcome.pillaged).toContain("0");
    expect(G.buildings[vids[0]].city).toBe(false);
  });

  it("advanceBarbarians resolves exactly when the ship arrives", () => {
    const G = makeState(2, { variant: "cities-knights" });
    G.barbarianPosition = 5;
    advanceBarbarians(G, seq([0])); // -> 6
    expect(G.barbarianPosition).toBe(6);
    advanceBarbarians(G, seq([0])); // -> 7 triggers attack + reset
    expect(G.barbarianPosition).toBe(0);
  });
});

describe("knight strength", () => {
  it("sums only active knights by level", () => {
    const G = makeState(2, { variant: "cities-knights" });
    G.knights["a"] = "0";
    G.knights["b"] = "0";
    G.activeKnights!["a"] = true;
    G.activeKnights!["b"] = false;
    G.knightLevels!["a"] = 2;
    expect(knightStrength(G, "0")).toBe(2);
  });
});
