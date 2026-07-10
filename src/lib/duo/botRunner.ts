import { Client } from "boardgame.io/client";
import type { GameState, GameVariant } from "@/types/game";
import { createDuoGame } from "@/game/game";
import { chooseBotAction, forceEndAction } from "@/game/ai/turn";
import { reviveSnapshot, type DuoCtxSnapshot, type DuoSnapshot } from "./protocol";

/**
 * Replays a bot's whole turn on a HEADLESS boardgame.io client mounted as
 * the bot seat, using the exact decision engine the local pass-and-play
 * bots use (chooseBotAction). Every move goes through the real game
 * reducers, so only legal actions can happen; the caller then publishes the
 * final snapshot through the same revision-checked pipeline as human moves.
 *
 * Never freezes: a hard time budget force-ends the turn (roll → resolve
 * bandit → end turn), a step cap bounds the loop, and a no-progress check
 * bails out if a dispatched move was rejected by the engine.
 */

export const BOT_TURN_BUDGET_MS = 10_000;
const MAX_BOT_STEPS = 80;

export interface BotTurnResult {
  G: GameState;
  ctx: DuoCtxSnapshot;
}

export function runBotTurn(args: {
  snapshot: DuoSnapshot;
  botSeat: string;
  variant: GameVariant;
  budgetMs?: number;
}): BotTurnResult | null {
  const { G, ctx } = reviveSnapshot(args.snapshot);
  if (ctx.currentPlayer !== args.botSeat) return null;
  const startPhase = ctx.phase === "setup" ? ("setup" as const) : ("play" as const);
  const client = Client<GameState>({
    game: createDuoGame({ ...G }, startPhase, ctx.playOrderPos),
    numPlayers: G.numPlayers,
    playerID: args.botSeat,
    debug: false,
  });
  client.start();
  const deadline = Date.now() + (args.budgetMs ?? BOT_TURN_BUDGET_MS);
  let lastFingerprint = "";
  for (let step = 0; step < MAX_BOT_STEPS; step++) {
    const state = client.getState();
    if (!state || state.ctx.gameover) break;
    if (state.ctx.currentPlayer !== args.botSeat) break; // turn handed over
    const overBudget = Date.now() > deadline;
    const action = overBudget
      ? forceEndAction(state.G)
      : chooseBotAction(state.G, state.ctx, args.botSeat, { variant: args.variant, allowTradeOffer: false }) ??
        forceEndAction(state.G);
    const dispatch = (client.moves as Record<string, ((...a: unknown[]) => void) | undefined>)[action.move];
    if (!dispatch) break;
    dispatch(...action.args);
    const next = client.getState();
    const fingerprint = JSON.stringify([next?.ctx.currentPlayer, next?.ctx.phase, next?.ctx.turn, next?.G]);
    if (fingerprint === lastFingerprint) break; // move was rejected — stop, don't spin
    lastFingerprint = fingerprint;
  }
  const finalState = client.getState();
  client.stop();
  if (!finalState) return null;
  return {
    G: finalState.G,
    ctx: {
      currentPlayer: String(finalState.ctx.currentPlayer),
      phase: String(finalState.ctx.phase ?? "play"),
      turn: Number(finalState.ctx.turn ?? ctx.turn),
      playOrderPos: Number(finalState.ctx.playOrderPos ?? 0),
    },
  };
}
