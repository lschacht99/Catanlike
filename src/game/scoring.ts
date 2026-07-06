import type { GameState } from "@/types/game";
import { VICTORY_POINTS_TO_WIN } from "./constants";

/** Victory points: 1 per settlement, 2 per city. */
export function victoryPoints(G: GameState, player: string): number {
  let points = 0;
  for (const b of Object.values(G.buildings)) {
    if (b.player === player) points += b.city ? 2 : 1;
  }
  return points;
}

/** The winning player id, or null if the game continues. */
export function winner(G: GameState): string | null {
  for (const player of Object.keys(G.players)) {
    if (victoryPoints(G, player) >= VICTORY_POINTS_TO_WIN) return player;
  }
  return null;
}
