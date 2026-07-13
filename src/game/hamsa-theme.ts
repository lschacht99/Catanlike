import type { Theme } from "@/types/theme";
import { terrainAsset } from "./assets";

export const HAMSA_THEME: Theme = {
  id: "hamsa",
  name: "Hamsa Nomads",
  resources: {
    wood: {
      label: "Olive Route",
      color: "#758b49",
      icon: "🫒",
      tileArt: terrainAsset("hamsa", "wood"),
      tilePrompt: "olive grove route hex tile, warm Hamsa Nomads style",
    },
    brick: {
      label: "Terracotta Stop",
      color: "#b96a4a",
      icon: "🧱",
      tileArt: terrainAsset("hamsa", "brick"),
      tilePrompt: "terracotta travel stop hex tile",
    },
    grain: {
      label: "Market Harvest",
      color: "#d9b54f",
      icon: "🌾",
      tileArt: terrainAsset("hamsa", "grain"),
      tilePrompt: "golden market harvest hex tile",
    },
    wool: {
      label: "Tent Weave",
      color: "#8aa67b",
      icon: "⛺",
      tileArt: terrainAsset("hamsa", "wool"),
      tilePrompt: "nomad tent weaving hex tile",
    },
    ore: {
      label: "Compass Brass",
      color: "#7d7264",
      icon: "🧭",
      tileArt: terrainAsset("hamsa", "ore"),
      tilePrompt: "brass compass workshop hex tile",
    },
  },
  desert: {
    label: "Passport Sands",
    color: "#d7be92",
    icon: "🧿",
    tileArt: terrainAsset("hamsa", "desert"),
    tilePrompt: "passport stamp desert hex tile",
  },
  bandit: { label: "Lost Luggage", icon: "🧳" },
  terms: { road: "Route", settlement: "Camp", city: "Medina", knight: "Scout" },
  board: { sea: "#f6ecd9" },
  assetSet: "hamsa",
};
