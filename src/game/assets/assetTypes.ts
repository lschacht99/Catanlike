import type { ResourceKey, TileResource } from "@/types/game";

export type BuiltinVisualThemeId = "classic" | "hamsa" | "israel";
export type TerrainAssetMap = Record<TileResource | "sea", string>;

export interface WaterVisuals {
  deep: string;
  shallow: string;
  foam: string;
  sand: string;
  sky: string;
}

export interface PieceVisuals {
  architecture: "classic" | "medina" | "limestone";
  knight: "guardian" | "scout" | "ranger";
  harbor: "timber" | "nomad" | "limestone";
}

export interface ThemeVisuals {
  assetPack: BuiltinVisualThemeId;
  terrain: TerrainAssetMap;
  water: WaterVisuals;
  pieces: PieceVisuals;
  sprite: string;
}

export type ResourceIconId = ResourceKey;
