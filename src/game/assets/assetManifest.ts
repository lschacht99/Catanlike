import type { BuiltinVisualThemeId, TerrainAssetMap, ThemeVisuals } from "./assetTypes";

const terrain = (theme: BuiltinVisualThemeId): TerrainAssetMap => ({
  wood: `/assets/game/themes/${theme}/hex/wood.svg`,
  brick: `/assets/game/themes/${theme}/hex/brick.svg`,
  grain: `/assets/game/themes/${theme}/hex/grain.svg`,
  wool: `/assets/game/themes/${theme}/hex/wool.svg`,
  ore: `/assets/game/themes/${theme}/hex/ore.svg`,
  desert: `/assets/game/themes/${theme}/hex/desert.svg`,
  sea: `/assets/game/themes/${theme}/hex/sea.svg`,
});

export const GAME_ASSETS: Record<BuiltinVisualThemeId, ThemeVisuals> = {
  classic: {
    assetPack: "classic",
    terrain: terrain("classic"),
    water: { deep: "#124b68", shallow: "#4f9daf", foam: "#e9f7f5", sand: "#d7bd83", sky: "#b8d7df" },
    pieces: { architecture: "classic", knight: "guardian", harbor: "timber" },
    sprite: "/assets/game/sprites/game-icons.svg",
  },
  hamsa: {
    assetPack: "hamsa",
    terrain: terrain("hamsa"),
    water: { deep: "#1D4F8C", shallow: "#5ea6ad", foam: "#F6F2E7", sand: "#DCC7A1", sky: "#e8d6b7" },
    pieces: { architecture: "medina", knight: "scout", harbor: "nomad" },
    sprite: "/assets/game/sprites/game-icons.svg",
  },
  israel: {
    assetPack: "israel",
    terrain: terrain("israel"),
    water: { deep: "#176f8f", shallow: "#62a9b0", foam: "#f2eadb", sand: "#d4b27b", sky: "#d8d0bd" },
    pieces: { architecture: "limestone", knight: "ranger", harbor: "limestone" },
    sprite: "/assets/game/sprites/game-icons.svg",
  },
};

export const FALLBACK_VISUALS = GAME_ASSETS.classic;

export function visualsForTheme(id: string): ThemeVisuals {
  return GAME_ASSETS[id as BuiltinVisualThemeId] ?? FALLBACK_VISUALS;
}
