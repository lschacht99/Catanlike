import type {
  Board,
  BoardGeometry,
  GameState,
  ResourceCounts,
  ResourceKey,
} from "@/types/game";
import {
  BANK_TRADE_RATE,
  BUILD_COSTS,
  PIECE_LIMITS,
  type BuildableKind,
} from "./constants";
import { buildGeometry } from "./geometry";

/** Geometry is pure data derived from tiles; cache it per board identity. */
const geometryCache = new WeakMap<object, BoardGeometry>();
export function getGeometry(board: Board): BoardGeometry {
  let geo = geometryCache.get(board.tiles);
  if (!geo) {
    geo = buildGeometry(board.tiles);
    geometryCache.set(board.tiles, geo);
  }
  return geo;
}

export function canPayCost(
  resources: ResourceCounts,
  cost: Partial<ResourceCounts>,
): boolean {
  return (Object.entries(cost) as [ResourceKey, number][]).every(
    ([key, amount]) => resources[key] >= amount,
  );
}

export function canAfford(resources: ResourceCounts, kind: BuildableKind): boolean {
  return canPayCost(resources, BUILD_COSTS[kind]);
}

export function pieceCounts(G: GameState, player: string) {
  let settlements = 0;
  let cities = 0;
  for (const b of Object.values(G.buildings)) {
    if (b.player !== player) continue;
    if (b.city) cities++;
    else settlements++;
  }
  const roads = Object.values(G.roads).filter((p) => p === player).length;
  const knights = Object.values(G.knights).filter((p) => p === player).length;
  return { roads, settlements, cities, knights };
}

/** Distance rule: a settlement may not be adjacent to any other building. */
function distanceRuleOk(G: GameState, geo: BoardGeometry, vertexId: string): boolean {
  if (G.buildings[vertexId]) return false;
  return geo.vertices[vertexId].neighbors.every((n) => !G.buildings[n]);
}

/** Does `player` have a road touching this vertex? */
function touchesOwnRoad(G: GameState, geo: BoardGeometry, vertexId: string, player: string): boolean {
  return geo.vertices[vertexId].edges.some((e) => G.roads[e] === player);
}

/**
 * Vertices where `player` may place a settlement.
 * During setup the road-connection requirement is waived.
 */
export function validSettlementSpots(
  G: GameState,
  player: string,
  setup: boolean,
): string[] {
  const geo = getGeometry(G.board);
  if (!setup && pieceCounts(G, player).settlements >= PIECE_LIMITS.settlement) {
    return [];
  }
  return Object.keys(geo.vertices).filter((id) => {
    if (!distanceRuleOk(G, geo, id)) return false;
    if (setup) return true;
    return touchesOwnRoad(G, geo, id, player);
  });
}

/**
 * Edges where `player` may place a road. During setup the road must touch
 * the settlement just placed (`G.pendingSetupSettlement`).
 */
export function validRoadSpots(G: GameState, player: string, setup: boolean): string[] {
  const geo = getGeometry(G.board);
  if (pieceCounts(G, player).roads >= PIECE_LIMITS.road) return [];
  return Object.values(geo.edges)
    .filter((edge) => {
      if (G.roads[edge.id]) return false;
      if (setup) {
        const v = G.pendingSetupSettlement;
        return v !== null && (edge.a === v || edge.b === v);
      }
      // Must connect to an own building or own road on either endpoint.
      for (const end of [edge.a, edge.b]) {
        if (G.buildings[end]?.player === player) return true;
        // Roads may not extend through an opponent's building.
        if (G.buildings[end]) continue;
        if (touchesOwnRoad(G, geo, end, player)) return true;
      }
      return false;
    })
    .map((e) => e.id);
}

/** Vertices where `player` may upgrade a settlement to a city. */
export function validCitySpots(G: GameState, player: string): string[] {
  if (pieceCounts(G, player).cities >= PIECE_LIMITS.city) return [];
  return Object.entries(G.buildings)
    .filter(([, b]) => b.player === player && !b.city)
    .map(([id]) => id);
}

/** Vertices where `player` may place a knight on their own built spot. */
export function validKnightSpots(G: GameState, player: string): string[] {
  if (G.variant !== "cities-knights") return [];
  if (pieceCounts(G, player).knights >= PIECE_LIMITS.knight) return [];
  return Object.entries(G.buildings)
    .filter(([id, b]) => b.player === player && !G.knights[id])
    .map(([id]) => id);
}

export function canBankTrade(
  resources: ResourceCounts,
  give: ResourceKey,
  receive: ResourceKey,
): boolean {
  return give !== receive && resources[give] >= BANK_TRADE_RATE;
}

/** Tiles the bandit may be moved to (anywhere but where it stands). */
export function validBanditTiles(G: GameState): number[] {
  return G.board.tiles.filter((t) => t.id !== G.banditTile).map((t) => t.id);
}

/** Opponents with a building on `tileId` who hold at least one resource. */
export function banditVictims(G: GameState, tileId: number, mover: string): string[] {
  const geo = getGeometry(G.board);
  const victims = new Set<string>();
  for (const v of Object.values(geo.vertices)) {
    if (!v.tiles.includes(tileId)) continue;
    const b = G.buildings[v.id];
    if (!b || b.player === mover) continue;
    const total = Object.values(G.players[b.player].resources).reduce((a, n) => a + n, 0);
    if (total > 0) victims.add(b.player);
  }
  return [...victims].sort();
}
