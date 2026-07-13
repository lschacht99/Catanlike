import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { KNIGHT_MAX_LEVEL } from "../constants";

const root = process.cwd();
const moves = readFileSync(join(root, "src/game/moves.ts"), "utf8");
const board = readFileSync(join(root, "src/components/GameBoardPlay.tsx"), "utf8");
const board3d = readFileSync(join(root, "src/components/HexBoard3D.tsx"), "utf8");
const board2d = readFileSync(join(root, "src/components/HexBoardPlay.tsx"), "utf8");

describe("Cities & Knights visual ranks", () => {
  it("supports Basic, Strong, and Mighty ranks", () => {
    expect(KNIGHT_MAX_LEVEL).toBe(3);
  });

  it("requires the Politics Fortress before promoting to Mighty", () => {
    expect(moves).toContain("currentLevel === 2");
    expect(moves).toContain("improvements?.politics ?? 0) < 3");
  });

  it("passes active and level state into the board renderers", () => {
    expect(board).toContain("activeKnights={G.activeKnights}");
    expect(board).toContain("knightLevels={G.knightLevels}");
    expect(board3d).toContain("level={knightLevels[vertexId]??1}");
    expect(board2d).toContain("level={knightLevels[vertexId]??1}");
  });

  it("renders knights independently from buildings", () => {
    expect(board3d).toContain("Object.entries(knights).map");
    expect(board2d).toContain("Object.entries(knights).map");
    expect(board3d).not.toContain("hasKnight");
  });
});
