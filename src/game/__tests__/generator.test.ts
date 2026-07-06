import { describe, expect, it } from "vitest";
import { generateBoard, randomBoard, scoreBoard } from "../generator";
import { NUMBER_TOKENS, TILE_COUNTS } from "../constants";
import { buildGeometry, standardBoardCoords, tilesAdjacent } from "../geometry";

describe("standard board geometry", () => {
  it("has 19 hexes, 54 vertices and 72 edges", () => {
    const board = randomBoard();
    expect(board.tiles).toHaveLength(19);
    const geo = buildGeometry(board.tiles);
    expect(Object.keys(geo.vertices)).toHaveLength(54);
    expect(Object.keys(geo.edges)).toHaveLength(72);
  });

  it("gives every interior vertex 6 neighbors-of-tiles consistency", () => {
    const board = randomBoard();
    const geo = buildGeometry(board.tiles);
    for (const v of Object.values(geo.vertices)) {
      expect(v.tiles.length).toBeGreaterThanOrEqual(1);
      expect(v.tiles.length).toBeLessThanOrEqual(3);
      expect(v.neighbors.length).toBeGreaterThanOrEqual(2);
      expect(v.neighbors.length).toBeLessThanOrEqual(3);
    }
  });
});

describe("randomBoard", () => {
  it("uses the exact standard tile mix", () => {
    const board = randomBoard();
    const counts: Record<string, number> = {};
    for (const t of board.tiles) counts[t.resource] = (counts[t.resource] ?? 0) + 1;
    expect(counts).toEqual(TILE_COUNTS);
  });

  it("assigns every number token exactly once and none to the desert", () => {
    const board = randomBoard();
    const tokens = board.tiles
      .filter((t) => t.token !== null)
      .map((t) => t.token)
      .sort((a, b) => a! - b!);
    expect(tokens).toEqual([...NUMBER_TOKENS].sort((a, b) => a - b));
    const desert = board.tiles.find((t) => t.resource === "desert")!;
    expect(desert.token).toBeNull();
  });

  it("covers the 19 standard coordinates", () => {
    const board = randomBoard();
    const coords = new Set(board.tiles.map((t) => `${t.q},${t.r}`));
    for (const c of standardBoardCoords()) {
      expect(coords.has(`${c.q},${c.r}`)).toBe(true);
    }
  });
});

describe("scoreBoard", () => {
  it("penalizes adjacent 6/8 tokens", () => {
    const board = randomBoard(() => 0.5);
    // Force two adjacent tiles to hold 6 and 8.
    const [a, b] = findAdjacentProducingPair(board);
    swapTokens(board, 6, a);
    swapTokens(board, 8, b);
    const bad = scoreBoard(board);
    // Now push the 8 far away and rescore.
    swapTokens(board, 8, farthestTileFrom(board, a));
    const better = scoreBoard(board);
    expect(better).toBeGreaterThan(bad);
  });

  it("generateBoard picks a candidate with no adjacent 6/8 pair", () => {
    const board = generateBoard(300);
    for (const a of board.tiles) {
      for (const b of board.tiles) {
        if (a.id >= b.id || !tilesAdjacent(a, b)) continue;
        const hotA = a.token === 6 || a.token === 8;
        const hotB = b.token === 6 || b.token === 8;
        expect(hotA && hotB).toBe(false);
      }
    }
  });
});

// --- helpers -------------------------------------------------------------

import type { Board, Tile } from "@/types/game";

function findAdjacentProducingPair(board: Board): [Tile, Tile] {
  for (const a of board.tiles) {
    if (a.token === null) continue;
    for (const b of board.tiles) {
      if (b.token === null || a.id === b.id) continue;
      if (tilesAdjacent(a, b)) return [a, b];
    }
  }
  throw new Error("no adjacent producing pair");
}

function swapTokens(board: Board, token: number, target: Tile): void {
  const holder = board.tiles.find((t) => t.token === token)!;
  const tmp = target.token;
  target.token = holder.token;
  holder.token = tmp;
}

function farthestTileFrom(board: Board, origin: Tile): Tile {
  let best = origin;
  let bestDist = -1;
  for (const t of board.tiles) {
    if (t.token === null) continue;
    const dist =
      (Math.abs(t.q - origin.q) +
        Math.abs(t.r - origin.r) +
        Math.abs(t.q + t.r - origin.q - origin.r)) /
      2;
    if (dist > bestDist) {
      bestDist = dist;
      best = t;
    }
  }
  return best;
}
