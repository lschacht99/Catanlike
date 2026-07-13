import type { Theme } from "@/types/theme";
import { GAME_ASSETS } from "./assets/assetManifest";

export const ISRAEL_THEME: Theme = {
  id: "israel",
  name: "Israel Landscape",
  resources: {
    wood: {
      label: "Olive Wood",
      color: "#708353",
      icon: "🫒",
      tileArt: GAME_ASSETS.israel.terrain.wood,
      tilePrompt: "olive grove hex tile, Mediterranean board game style",
    },
    brick: {
      label: "Limestone",
      color: "#bda983",
      icon: "🧱",
      tileArt: GAME_ASSETS.israel.terrain.brick,
      tilePrompt: "warm limestone quarry hex tile",
    },
    grain: {
      label: "Wheat",
      color: "#d1a342",
      icon: "🌾",
      tileArt: GAME_ASSETS.israel.terrain.grain,
      tilePrompt: "golden wheat terrace hex tile",
    },
    wool: {
      label: "Goats",
      color: "#81986d",
      icon: "🐐",
      tileArt: GAME_ASSETS.israel.terrain.wool,
      tilePrompt: "green hillside goat pasture hex tile",
    },
    ore: {
      label: "Copper",
      color: "#b87047",
      icon: "⛏️",
      tileArt: GAME_ASSETS.israel.terrain.ore,
      tilePrompt: "copper mine and Negev rock hex tile",
    },
  },
  desert: {
    label: "Negev",
    color: "#d4b27b",
    icon: "🏜️",
    tileArt: GAME_ASSETS.israel.terrain.desert,
    tilePrompt: "Negev sandstone, dunes and desert plants hex tile",
  },
  bandit: { label: "Wanderer", icon: "🦂" },
  terms: { road: "Trail", settlement: "Moshav", city: "Citadel", knight: "Guard" },
  board: { sea: GAME_ASSETS.israel.water.deep },
  visuals: GAME_ASSETS.israel,
};
