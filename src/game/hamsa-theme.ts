import type { Theme } from "@/types/theme";
import { GAME_ASSETS } from "./assets/assetManifest";

export const HAMSA_THEME: Theme = {
  id: "hamsa",
  name: "Hamsa Nomads",
  resources: {
    wood: {
      label: "Olive Route",
      color: "#7F8A6A",
      icon: "🫒",
      tileArt: GAME_ASSETS.hamsa.terrain.wood,
      tilePrompt: "olive grove route hex tile, warm Hamsa Nomads style",
    },
    brick: {
      label: "Terracotta Stop",
      color: "#C88B6A",
      icon: "🧱",
      tileArt: GAME_ASSETS.hamsa.terrain.brick,
      tilePrompt: "terracotta travel stop hex tile",
    },
    grain: {
      label: "Market Harvest",
      color: "#DCC7A1",
      icon: "🌾",
      tileArt: GAME_ASSETS.hamsa.terrain.grain,
      tilePrompt: "golden market harvest hex tile",
    },
    wool: {
      label: "Tent Weave",
      color: "#91a978",
      icon: "⛺",
      tileArt: GAME_ASSETS.hamsa.terrain.wool,
      tilePrompt: "nomad tent weaving hex tile",
    },
    ore: {
      label: "Compass Brass",
      color: "#756f66",
      icon: "🧭",
      tileArt: GAME_ASSETS.hamsa.terrain.ore,
      tilePrompt: "brass compass workshop hex tile",
    },
  },
  desert: {
    label: "Passport Sands",
    color: "#DCC7A1",
    icon: "🏜️",
    tileArt: GAME_ASSETS.hamsa.terrain.desert,
    tilePrompt: "passport stamp desert hex tile",
  },
  bandit: { label: "Lost Luggage", icon: "🧳" },
  terms: { road: "Route", settlement: "Camp", city: "Medina", knight: "Scout" },
  board: { sea: GAME_ASSETS.hamsa.water.deep },
  visuals: GAME_ASSETS.hamsa,
};
