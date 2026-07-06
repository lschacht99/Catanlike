import type { GameState } from "@/types/game";
import { CITIES_KNIGHTS_POINTS_TO_WIN, VICTORY_POINTS_TO_WIN } from "./constants";

/** Victory points: 1 per settlement, 2 per city, and 1 per knight in the variant. */
export function victoryPoints(G: GameState, player: string): number {
  let points = 0;
  for (const b of Object.values(G.buildings)) {
    if (b.player === player) points += b.city ? 2 : 1;
  }
  if (G.variant === "cities-knights") {
    for (const owner of Object.values(G.knights)) {
      if (owner === player) points += 1;
    }
  }
  return points;
}

/** The winning player id, or null if the game continues. */
export function winner(G: GameState): string | null {
  const target = G.variant === "cities-knights" ? CITIES_KNIGHTS_POINTS_TO_WIN : VICTORY_POINTS_TO_WIN;
  for (const player of Object.keys(G.players)) {
    if (victoryPoints(G, player) >= target) return player;
  }
  return null;
}
