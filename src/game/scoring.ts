import type { GameState } from "@/types/game";
import {
  BONUS_POINTS,
  LARGEST_ARMY_MIN,
  LONGEST_ROAD_MIN,
  VICTORY_POINTS_TO_WIN,
} from "./constants";
import { getGeometry } from "./rules";

/** Points from buildings only: 1 per settlement, 2 per city. */
export function buildingPoints(G: GameState, player: string): number {
  let points = 0;
  for (const b of Object.values(G.buildings)) {
    if (b.player === player) points += b.city ? 2 : 1;
  }
  return points;
}

/**
 * Length of `player`'s longest continuous road (edge-simple trail).
 * Roads may end at, but never pass through, an opponent's building.
 */
export function longestRoadLength(G: GameState, player: string): number {
  const geo = getGeometry(G.board);
  const own = new Set(
    Object.keys(G.roads).filter((id) => G.roads[id] === player),
  );
  if (own.size === 0) return 0;

  const blocked = (v: string) => {
    const b = G.buildings[v];
    return b !== undefined && b.player !== player;
  };

  function dfs(vertex: string, used: Set<string>): number {
    let max = 0;
    for (const edgeId of geo.vertices[vertex].edges) {
      if (!own.has(edgeId) || used.has(edgeId)) continue;
      const edge = geo.edges[edgeId];
      const next = edge.a === vertex ? edge.b : edge.a;
      used.add(edgeId);
      const len = 1 + (blocked(next) ? 0 : dfs(next, used));
      used.delete(edgeId);
      if (len > max) max = len;
    }
    return max;
  }

  let best = 0;
  for (const edgeId of own) {
    const edge = geo.edges[edgeId];
    for (const v of [edge.a, edge.b]) {
      best = Math.max(best, dfs(v, new Set()));
    }
  }
  return best;
}

/**
 * Recompute the longest-road bonus holder. The holder keeps the bonus on a
 * tie; it is lost when their road drops below the minimum (e.g. cut by a
 * settlement) or someone builds a strictly longer one.
 */
export function updateLongestRoad(G: GameState): void {
  const lengths = new Map(
    Object.keys(G.players).map((p) => [p, longestRoadLength(G, p)]),
  );
  let holder = G.longestRoadHolder;
  if (holder !== null && (lengths.get(holder) ?? 0) < LONGEST_ROAD_MIN) {
    holder = null;
  }
  for (const [p, len] of lengths) {
    if (p === holder || len < LONGEST_ROAD_MIN) continue;
    const toBeat = holder !== null ? lengths.get(holder)! : LONGEST_ROAD_MIN - 1;
    if (len > toBeat) holder = p;
  }
  G.longestRoadHolder = holder;
}

/** Recompute the largest-army bonus holder after a knight is played. */
export function updateLargestArmy(G: GameState): void {
  let holder = G.largestArmyHolder;
  for (const [p, state] of Object.entries(G.players)) {
    if (p === holder || state.knightsPlayed < LARGEST_ARMY_MIN) continue;
    const toBeat =
      holder !== null ? G.players[holder].knightsPlayed : LARGEST_ARMY_MIN - 1;
    if (state.knightsPlayed > toBeat) holder = p;
  }
  G.largestArmyHolder = holder;
}

/** Publicly visible points: buildings + bonuses (no hidden victory cards). */
export function publicPoints(G: GameState, player: string): number {
  let points = buildingPoints(G, player);
  if (G.largestArmyHolder === player) points += BONUS_POINTS;
  if (G.longestRoadHolder === player) points += BONUS_POINTS;
  return points;
}

/** Full victory points including hidden victory cards. */
export function victoryPoints(G: GameState, player: string): number {
  const cards = G.players[player].devCards.filter((c) => c.type === "victory").length;
  return publicPoints(G, player) + cards;
}

/** The winning player id, or null if the game continues. */
export function winner(G: GameState): string | null {
  const target = G.variant === "cities-knights" ? CITIES_KNIGHTS_POINTS_TO_WIN : VICTORY_POINTS_TO_WIN;
  for (const player of Object.keys(G.players)) {
    if (victoryPoints(G, player) >= target) return player;
  }
  return null;
}
