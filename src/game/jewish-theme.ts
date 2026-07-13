import type { Theme } from "@/types/theme";
import { terrainAsset } from "./assets";

export const JEWISH_THEME: Theme = {
  id: "jewish",
  name: "Jewish Journey",
  resources: {
    wood: {
      label: "Olive Grove",
      color: "#6f8f45",
      icon: "🫒",
      tileArt: terrainAsset("israel_landscape", "wood"), tilePrompt: "olive grove hex tile, warm Mediterranean Jewish travel style",
    },
    brick: {
      label: "Jerusalem Stone",
      color: "#c8ac7c",
      icon: "🧱",
      tileArt: terrainAsset("israel_landscape", "brick"), tilePrompt: "Jerusalem stone courtyard hex tile",
    },
    grain: {
      label: "Challah Grain",
      color: "#d8b04a",
      icon: "🥖",
      tileArt: terrainAsset("israel_landscape", "grain"), tilePrompt: "golden grain and challah inspired field hex tile",
    },
    wool: {
      label: "Tallit Wool",
      color: "#7db3e3",
      icon: "🧵",
      tileArt: terrainAsset("israel_landscape", "wool"), tilePrompt: "soft blue and white weaving pasture hex tile",
    },
    ore: {
      label: "Silver",
      color: "#8b949f",
      icon: "🕍",
      tileArt: terrainAsset("israel_landscape", "ore"), tilePrompt: "silver workshop and stone mountain hex tile",
    },
  },
  desert: {
    label: "Judean Desert",
    color: "#d8b878",
    icon: "🏜️",
    tileArt: terrainAsset("israel_landscape", "desert"), tilePrompt: "judean desert hex tile",
  },
  bandit: { label: "Wanderer", icon: "🧿" },
  terms: { road: "Path", settlement: "Village", city: "Kehillah", knight: "Guardian" },
  board: { sea: "#0f4c81" },
  assetSet: "israel_landscape",
};
