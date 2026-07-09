/**
 * Pure pip-layout helper for dice faces — no React, no visuals, so it can be
 * unit-tested on its own. Rules never import this; it is display-only.
 *
 * Pips map onto a 3x3 grid, indices 0-8:
 *   0 1 2
 *   3 4 5
 *   6 7 8
 */
const LAYOUTS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

/** A length-9 boolean grid; `true` where a pip sits for the given die value. */
export function faceGrid(value: number): boolean[] {
  const on = LAYOUTS[value] ?? [];
  const grid = new Array<boolean>(9).fill(false);
  for (const i of on) grid[i] = true;
  return grid;
}
