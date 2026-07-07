import type {
  DevCardType,
  ResourceCounts,
  ResourceKey,
  TileResource,
} from "@/types/game";

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

export type BuildableKind = "road" | "settlement" | "city" | "knight";

export const BUILD_COSTS: Record<BuildableKind, Partial<ResourceCounts>> = {
  road: { wood: 1, brick: 1 },
  settlement: { wood: 1, brick: 1, grain: 1, wool: 1 },
  city: { grain: 2, ore: 3 },
  knight: { grain: 1, wool: 1, ore: 1 },
};

/** Per-player piece limits. */
export const PIECE_LIMITS = { road: 15, settlement: 5, city: 4, knight: 6 };

export const BANK_TRADE_RATE = 4;
export const VICTORY_POINTS_TO_WIN = 10;
export const CITIES_KNIGHTS_POINTS_TO_WIN = 13;
export const BARBARIAN_TRACK_LENGTH = 7;

/** Development cards. */
export const DEV_CARD_COST: Partial<ResourceCounts> = { grain: 1, wool: 1, ore: 1 };

export const DEV_DECK_COMPOSITION: Record<DevCardType, number> = {
  knight: 14,
  victory: 5,
  roadBuilding: 2,
  yearOfPlenty: 2,
  monopoly: 2,
};

export function devDeck(): DevCardType[] {
  const deck: DevCardType[] = [];
  for (const [type, count] of Object.entries(DEV_DECK_COMPOSITION)) {
    for (let i = 0; i < count; i++) deck.push(type as DevCardType);
  }
  return deck;
}

/** Bonus thresholds — 2 VP each. */
export const LARGEST_ARMY_MIN = 3;
export const LONGEST_ROAD_MIN = 5;
export const BONUS_POINTS = 2;

export const PLAYER_COLORS = ["#1e3a5f", "#b45a37", "#6b7f3e", "#c9a227"];
export const PLAYER_NAMES = ["Navy", "Rust", "Olive", "Gold"];

export const COMMODITY_FROM_RESOURCE: Partial<Record<ResourceKey, CommodityKey>> = {
  ore: "coin",
  wool: "cloth",
  wood: "book",
};

export const TRACK_COMMODITY: Record<ProgressTrackKey, CommodityKey> = {
  trade: "cloth",
  politics: "coin",
  science: "book",
};

export const PROGRESS_CARD_LABELS: Record<ProgressCardType, string> = {
  roadworks: "Roadworks",
  harvest: "Harvest",
  oreRush: "Ore Rush",
  merchant: "Merchant",
  diplomat: "Diplomat",
  invention: "Invention",
};

export const PROGRESS_DECK: ProgressCardType[] = [
  "roadworks", "roadworks", "harvest", "harvest", "oreRush", "oreRush",
  "merchant", "merchant", "diplomat", "diplomat", "invention", "invention",
];

export function emptyResources(): ResourceCounts {
  return { wood: 0, brick: 0, grain: 0, wool: 0, ore: 0 };
}

export function emptyCommodities(): CommodityCounts {
  return { coin: 0, cloth: 0, book: 0 };
}

export function emptyImprovements(): ProgressTrackCounts {
  return { trade: 0, politics: 0, science: 0 };
}

export function totalResources(r: ResourceCounts): number {
  return r.wood + r.brick + r.grain + r.wool + r.ore;
}

export const RESOURCE_KEYS_ORDERED: ResourceKey[] = [
  "wood", "brick", "grain", "wool", "ore",
];

export const COMMODITY_KEYS_ORDERED: CommodityKey[] = ["coin", "cloth", "book"];
export const TRACK_KEYS_ORDERED: ProgressTrackKey[] = ["trade", "politics", "science"];
