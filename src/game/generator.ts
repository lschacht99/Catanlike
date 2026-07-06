import type { Board, Tile, TileResource } from "@/types/game";
import { NUMBER_TOKENS, TILE_COUNTS, TOKEN_PIPS } from "./constants";
import { buildGeometry, standardBoardCoords, tilesAdjacent } from "./geometry";

type Rng = () => number;

function shuffle<T>(items: T[], rng: Rng): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function tileBag(): TileResource[] {
  const bag: TileResource[] = [];
  for (const [resource, count] of Object.entries(TILE_COUNTS)) {
    for (let i = 0; i < count; i++) bag.push(resource as TileResource);
  }
  return bag;
}

/** One random (unscored) candidate board. */
export function randomBoard(rng: Rng = Math.random): Board {
  const coords = standardBoardCoords();
  const resources = shuffle(tileBag(), rng);
  const tokens = shuffle(NUMBER_TOKENS, rng);
  let tokenIndex = 0;
  const tiles: Tile[] = coords.map((c, id) => {
    const resource = resources[id];
    return {
      id,
      q: c.q,
      r: c.r,
      resource,
      token: resource === "desert" ? null : tokens[tokenIndex++],
    };
  });
  return { tiles, score: 0 };
}

/**
 * Balance score, higher is better (100 = no penalties).
 * Penalizes: 6/8 tokens adjacent to each other, equal tokens adjacent,
 * lopsided pip totals per resource, and clusters of top-value intersections.
 */
export function scoreBoard(board: Board): number {
  const { tiles } = board;
  let penalty = 0;

  // Pairwise tile adjacency checks.
  for (let i = 0; i < tiles.length; i++) {
    for (let j = i + 1; j < tiles.length; j++) {
      const a = tiles[i];
      const b = tiles[j];
      if (!tilesAdjacent(a, b) || a.token === null || b.token === null) continue;
      const bothHot = (a.token === 6 || a.token === 8) && (b.token === 6 || b.token === 8);
      if (bothHot) penalty += 30;
      if (a.token === b.token) penalty += 12;
    }
  }

  // Resource fairness: average pips per tile should be similar across resources.
  const pipsByResource: Record<string, { pips: number; count: number }> = {};
  let totalPips = 0;
  let producingTiles = 0;
  for (const t of tiles) {
    if (t.resource === "desert" || t.token === null) continue;
    const entry = (pipsByResource[t.resource] ??= { pips: 0, count: 0 });
    const pips = TOKEN_PIPS[t.token] ?? 0;
    entry.pips += pips;
    entry.count += 1;
    totalPips += pips;
    producingTiles += 1;
  }
  const globalAvg = totalPips / producingTiles;
  for (const { pips, count } of Object.values(pipsByResource)) {
    penalty += Math.abs(pips / count - globalAvg) * 6;
  }

  // Spread of strong intersections: the best settlement spots should not touch.
  const geometry = buildGeometry(tiles);
  const tileById = new Map(tiles.map((t) => [t.id, t]));
  const vertexPips: Record<string, number> = {};
  for (const v of Object.values(geometry.vertices)) {
    vertexPips[v.id] = v.tiles.reduce((sum, tid) => {
      const t = tileById.get(tid)!;
      return sum + (t.token !== null ? TOKEN_PIPS[t.token] ?? 0 : 0);
    }, 0);
  }
  const top = Object.entries(vertexPips)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([id]) => id);
  const topSet = new Set(top);
  for (const id of top) {
    for (const n of geometry.vertices[id].neighbors) {
      if (topSet.has(n) && n > id) penalty += 8;
    }
  }

  return Math.round((100 - penalty) * 10) / 10;
}

/** Generate many candidates and keep the best-scoring one. */
export function generateBoard(candidates = 400, rng: Rng = Math.random): Board {
  let best: Board | null = null;
  for (let i = 0; i < candidates; i++) {
    const board = randomBoard(rng);
    board.score = scoreBoard(board);
    if (!best || board.score > best.score) best = board;
  }
  return best!;
}
