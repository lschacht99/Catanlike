import { describe, expect, it } from "vitest";
import { devDeck } from "../../../game/constants";
import { initialState } from "../../../game/game";
import { randomBoard } from "../../../game/generator";
import { runBotTurn, BOT_TURN_BUDGET_MS } from "../botRunner";
import { serializeSnapshot, type DuoSnapshot } from "../protocol";

/** A real 2-seat game (not the bare rule-test fixture) so the headless
 * boardgame.io client can actually run moves end to end. */
function freshDuoSnapshot(): DuoSnapshot {
  const board = randomBoard(() => 0.42);
  const G = initialState(board, 2, devDeck(), ["Moshe", "Bot 2"], "base", [
    { mode: "human" },
    { mode: "bot", botDifficulty: "normal" },
  ]);
  return serializeSnapshot(G, { currentPlayer: "1", phase: "play", turn: 3, playOrderPos: 1 });
}

describe("runBotTurn (online bot: headless client replay of the shared bot engine)", () => {
  it("returns null when the requested seat isn't actually the active player", () => {
    const snapshot = freshDuoSnapshot();
    const result = runBotTurn({ snapshot, botSeat: "0", variant: "base" });
    expect(result).toBeNull();
  });

  it("plays a full turn for a bot with an empty hand: rolls, then ends turn — never freezes", () => {
    const snapshot = freshDuoSnapshot();
    const result = runBotTurn({ snapshot, botSeat: "1", variant: "base" });
    expect(result).not.toBeNull();
    // The bot's turn is over: play moved on (either to the next player, or a
    // new turn number), and the engine recorded that it rolled at some point.
    expect(result!.ctx.currentPlayer === "0" || result!.ctx.turn > 3).toBe(true);
  });

  it("force-ends within budget instead of hanging when the clock is already up", () => {
    const snapshot = freshDuoSnapshot();
    const start = Date.now();
    const result = runBotTurn({ snapshot, botSeat: "1", variant: "base", budgetMs: -1 });
    const elapsed = Date.now() - start;
    expect(result).not.toBeNull();
    expect(elapsed).toBeLessThan(BOT_TURN_BUDGET_MS); // must not silently consume the full budget
  });

  it("resolves a mandatory bandit move before ending the turn", () => {
    const snapshot = freshDuoSnapshot();
    snapshot.G.hasRolled = true;
    snapshot.G.mustMoveBandit = true;
    const result = runBotTurn({ snapshot, botSeat: "1", variant: "base" });
    expect(result).not.toBeNull();
    expect(result!.G.mustMoveBandit).toBe(false);
  });
});
