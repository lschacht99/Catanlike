import type { Theme } from "@/types/theme";

export const HAMSA_THEME: Theme = {
  id: "hamsa",
  name: "Hamsa Nomads",
  resources: {
    wood: {
      label: "Olive Route",
      color: "#758b49",
      icon: "🫒",
      tileArt: "/hex-olive-route.svg",
      tilePrompt: "olive grove route hex tile, warm Hamsa Nomads style",
    },
    brick: {
      label: "Terracotta Stop",
      color: "#b96a4a",
      icon: "🧱",
      tileArt: "/hex-terracotta-stop.svg",
      tilePrompt: "terracotta travel stop hex tile",
    },
    grain: {
      label: "Market Harvest",
      color: "#d9b54f",
      icon: "🌾",
      tileArt: "/hex-market-harvest.svg",
      tilePrompt: "golden market harvest hex tile",
    },
    wool: {
      label: "Tent Weave",
      color: "#8aa67b",
      icon: "⛺",
      tileArt: "/hex-tent-weave.svg",
      tilePrompt: "nomad tent weaving hex tile",
    },
    ore: {
      label: "Compass Brass",
      color: "#7d7264",
      icon: "🧭",
      tileArt: "/hex-compass-brass.svg",
      tilePrompt: "brass compass workshop hex tile",
    },
  },
  desert: {
    label: "Passport Sands",
    color: "#d7be92",
    icon: "🧿",
    tileArt: "/hex-passport-sands.svg",
    tilePrompt: "passport stamp desert hex tile",
  },
  bandit: { label: "Lost Luggage", icon: "🧳" },
  terms: { road: "Route", settlement: "Camp", city: "Medina", knight: "Scout" },
  board: { sea: "#f6ecd9" },
};
