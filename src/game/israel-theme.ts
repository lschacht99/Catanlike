import type { Theme } from "@/types/theme";

export const ISRAEL_THEME: Theme = {
  id: "israel",
  name: "Israel",
  resources: {
    wood: {
      label: "Olive Wood",
      color: "#6f8f45",
      icon: "🫒",
      tilePrompt: "olive grove hex tile, Mediterranean board game style",
    },
    brick: {
      label: "Limestone",
      color: "#c9a46a",
      icon: "🧱",
      tilePrompt: "warm limestone quarry hex tile",
    },
    grain: {
      label: "Wheat",
      color: "#d7ad34",
      icon: "🌾",
      tilePrompt: "golden wheat terrace hex tile",
    },
    wool: {
      label: "Goats",
      color: "#76a66b",
      icon: "🐐",
      tilePrompt: "green hillside goat pasture hex tile",
    },
    ore: {
      label: "Copper",
      color: "#9c6b47",
      icon: "⛏️",
      tilePrompt: "copper mine hex tile, cinematic board game style",
    },
  },
  desert: {
    label: "Desert",
    color: "#d8b878",
    icon: "🏜️",
    tilePrompt: "soft desert dunes hex tile",
  },
  bandit: { label: "Wanderer", icon: "🦂" },
  terms: { road: "Trail", settlement: "Moshav", city: "Citadel" },
  board: { sea: "#0b5f82" },
};
