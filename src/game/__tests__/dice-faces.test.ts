import { describe, expect, it } from "vitest";
import { faceGrid } from "@/components/dice-faces";

describe("dice pip layouts", () => {
  it("places exactly N pips for each face 1-6", () => {
    for (let v = 1; v <= 6; v++) {
      expect(faceGrid(v).filter(Boolean)).toHaveLength(v);
    }
  });

  it("odd faces use the center pip; even faces do not", () => {
    expect(faceGrid(1)[4]).toBe(true);
    expect(faceGrid(3)[4]).toBe(true);
    expect(faceGrid(5)[4]).toBe(true);
    expect(faceGrid(2)[4]).toBe(false);
    expect(faceGrid(4)[4]).toBe(false);
    expect(faceGrid(6)[4]).toBe(false);
  });

  it("is a length-9 grid and point-symmetric (180deg rotation)", () => {
    for (let v = 1; v <= 6; v++) {
      const g = faceGrid(v);
      expect(g).toHaveLength(9);
      // Every real die face reads the same rotated 180deg: cell i mirrors cell 8-i.
      for (let i = 0; i < 9; i++) expect(g[i]).toBe(g[8 - i]);
    }
  });

  it("returns an empty grid for an out-of-range value", () => {
    expect(faceGrid(0).filter(Boolean)).toHaveLength(0);
    expect(faceGrid(7).filter(Boolean)).toHaveLength(0);
  });
});
