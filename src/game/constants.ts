import type { ResourceCounts, ResourceKey, TileResource } from "@/types/game";

/** Standard tile mix for the 19-hex board. */
export const TILE_COUNTS: Record<TileResource, number> = {
  wood: 4,
  brick: 3,
  grain: 4,
  wool: 4,
  ore: 3,
  desert: 1,
};

/** Standard number-token bag (no 7; desert gets none). */
export const NUMBER_TOKENS = [
  2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12,
];

/** Ways to roll each number with 2d6 ("pips" on a classic token). */
export const TOKEN_PIPS: Record<number, number> = {
  2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1,
};

export type BuildableKind = "road" | "settlement" | "city";

export const BUILD_COSTS: Record<BuildableKind, Partial<ResourceCounts>> = {
  road: { wood: 1, brick: 1 },
  settlement: { wood: 1, brick: 1, grain: 1, wool: 1 },
  city: { grain: 2, ore: 3 },
};

/** Per-player piece limits. */
export const PIECE_LIMITS = { road: 15, settlement: 5, city: 4 };

export const BANK_TRADE_RATE = 4;
export const VICTORY_POINTS_TO_WIN = 10;

export const PLAYER_COLORS = ["#ef4444", "#3b82f6", "#f59e0b", "#10b981"];
export const PLAYER_NAMES = ["Red", "Blue", "Amber", "Green"];

export function emptyResources(): ResourceCounts {
  return { wood: 0, brick: 0, grain: 0, wool: 0, ore: 0 };
}

export function totalResources(r: ResourceCounts): number {
  return r.wood + r.brick + r.grain + r.wool + r.ore;
}

export const RESOURCE_KEYS_ORDERED: ResourceKey[] = [
  "wood", "brick", "grain", "wool", "ore",
];
