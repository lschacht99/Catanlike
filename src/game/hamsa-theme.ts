import type { Theme } from "@/types/theme";

export const HAMSA_THEME: Theme = {
  id: "hamsa",
  name: "Hamsa Nomads",
  resources: {
    wood: {
      label: "Olive Route",
      color: "#758b49",
      icon: "🫒",
      tilePrompt: "olive grove route hex tile, warm hamsa nomads style",
    },
    brick: {
      label: "Terracotta Stop",
      color: "#b96a4a",
      icon: "🧱",
      tilePrompt: "terracotta kasbah stop hex tile",
    },
    grain: {
      label: "Market Harvest",
      color: "#d9b54f",
      icon: "🌾",
      tilePrompt: "golden travel market harvest hex tile",
    },
    wool: {
      label: "Tent Weave",
      color: "#8aa67b",
      icon: "⛺",
      tilePrompt: "nomad tent weaving hex tile",
    },
    ore: {
      label: "Compass Brass",
      color: "#7d7264",
      icon: "🧭",
      tilePrompt: "brass compass workshop hex tile",
    },
  },
  desert: {
    label: "Passport Sands",
    color: "#d7be92",
    icon: "🧿",
    tilePrompt: "passport stamp desert hex tile",
  },
  bandit: { label: "Lost Luggage", icon: "🧳" },
  terms: { road: "Route", settlement: "Camp", city: "Medina", knight: "Scout" },
  board: { sea: "#17324d" },
};
