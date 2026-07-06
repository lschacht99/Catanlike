import type { Board, TileResource } from "@/types/game";
import { NUMBER_TOKENS } from "@/game/constants";
import { scoreBoard } from "@/game/generator";

export type BoardPreset = "duel" | "standard";

const DUEL_COORDS = [
  { q: 0, r: -1 }, { q: 1, r: -1 },
  { q: -1, r: 0 }, { q: 0, r: 0 }, { q: 1, r: 0 },
  { q: -1, r: 1 }, { q: 0, r: 1 },
];

const DUEL_RESOURCES: TileResource[] = ["wood", "grain", "brick", "desert", "wool", "ore", "wood"];
const DUEL_TOKENS = [5, 9, 4, 10, 6, 8];

export function createDuelBoard(): Board {
  let token = 0;
  const tiles = DUEL_COORDS.map((coord, id) => {
    const resource = DUEL_RESOURCES[id];
    return { id, ...coord, resource, token: resource === "desert" ? null : DUEL_TOKENS[token++] };
  });
  const board = { tiles, score: 0 };
  board.score = scoreBoard(board);
  return board;
}

export function validateBoard(board: Board, preset: BoardPreset = "standard"): string[] {
  const errors: string[] = [];
  const expectedHexes = preset === "duel" ? 7 : 19;
  if (board.tiles.length !== expectedHexes) errors.push(`Expected ${expectedHexes} hexes.`);
  const ids = new Set(board.tiles.map((t) => t.id));
  if (ids.size !== board.tiles.length) errors.push("Tile ids must be unique.");
  for (const tile of board.tiles) {
    if (tile.resource === "desert" && tile.token !== null) errors.push("Desert cannot produce resources.");
    if (tile.resource !== "desert" && !NUMBER_TOKENS.includes(tile.token ?? 7)) errors.push(`Invalid token on tile ${tile.id}.`);
  }
  return errors;
}
