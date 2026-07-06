import { describe, expect, it } from "vitest";
import { createDuelBoard, validateBoard } from "@/game/board-generator/presets";
import { sanitizeGeneratedTheme } from "@/game/theme-generator/schema";

describe("duel board preset", () => {
  it("creates a validated balanced 2-player board", () => {
    const board = createDuelBoard();
    expect(board.tiles).toHaveLength(7);
    expect(validateBoard(board, "duel")).toEqual([]);
    expect(board.tiles.filter((t) => t.resource === "desert")).toHaveLength(1);
  });
});

describe("generated theme sanitation", () => {
  it("clamps unsafe model output to stable resource ids", () => {
    const theme = sanitizeGeneratedTheme({ themeName: "<b>Bad</b>", resources: [{ id: "wood", displayName: "Bamboo<script>" }] });
    expect(theme.themeName).not.toContain("<");
    expect(theme.resources.map((r) => r.id)).toEqual(["wood", "brick", "grain", "wool", "ore"]);
    expect(theme.resources[0].displayName).toBe("Bambooscript");
  });
});
