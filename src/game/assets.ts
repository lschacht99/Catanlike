import type { CommodityKey, ResourceKey } from "@/types/game";
import type { Theme } from "@/types/theme";

export const GAME_ASSET_ROOT = "/assets/game";

const PLAYER_ASSET_NAMES = ["navy", "rust", "olive", "gold"] as const;

export function gameAsset(path: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return `${base}${GAME_ASSET_ROOT}/${path.replace(/^\//, "")}`;
}

export function themeAssetSet(theme: Theme): "classic" | "hamsa" | "israel_landscape" {
  if (theme.assetSet) return theme.assetSet;
  if (theme.id === "hamsa") return "hamsa";
  if (theme.id === "israel" || theme.id === "jewish") return "israel_landscape";
  return "classic";
}

export function terrainAsset(set: "classic" | "hamsa" | "israel_landscape", resource: ResourceKey | "desert"): string {
  return `${GAME_ASSET_ROOT}/01_TERRAIN/themes/${set}/${resource}.png`;
}

export function pieceAsset(
  theme: Theme,
  piece: "road" | "settlement" | "city" | "city_wall" | "bandit" | "harbor_dock" | "merchant" | "metropolis_trade" | "metropolis_politics" | "metropolis_science",
  player?: string | number,
): string {
  const set = themeAssetSet(theme);
  if (player === undefined || piece === "bandit" || piece === "harbor_dock" || piece === "merchant" || piece.startsWith("metropolis_")) {
    return gameAsset(`03_PIECES/themes/${set}/neutral/${piece}.png`);
  }
  const playerName = PLAYER_ASSET_NAMES[Number(player)] ?? PLAYER_ASSET_NAMES[0];
  return gameAsset(`03_PIECES/themes/${set}/players/${playerName}/${piece}.png`);
}

export function knightAsset(theme: Theme, player: string | number, level = 1, active = false): string {
  const set = themeAssetSet(theme);
  const playerName = PLAYER_ASSET_NAMES[Number(player)] ?? PLAYER_ASSET_NAMES[0];
  const safeLevel = Math.max(1, Math.min(3, level));
  return gameAsset(`03_PIECES/themes/${set}/players/${playerName}/knight_level_${safeLevel}_${active ? "active" : "inactive"}.png`);
}

export function numberTokenAsset(value: number): string {
  const folder = value <= 5 ? "dice_numbers" : "numbers_markers";
  return gameAsset(`06_TOKENS/${folder}/number_${value}.png`);
}

export function resourceIconAsset(resource: ResourceKey): string {
  return gameAsset(`05_UI_ICONS/core/resource_${resource}.png`);
}

export function commodityIconAsset(commodity: CommodityKey): string {
  return gameAsset(`05_UI_ICONS/core/commodity_${commodity}.png`);
}

export function actionIconAsset(action: string): string {
  return gameAsset(`05_UI_ICONS/actions/${action}.png`);
}

export function buildIconAsset(piece: "road" | "settlement" | "city" | "knight"): string {
  return gameAsset(`05_UI_ICONS/core/build_${piece}.png`);
}
