import type { Theme } from "@/types/theme";
import { HAMSA_THEME } from "./hamsa-theme";
import { ISRAEL_THEME } from "./israel-theme";
import { JEWISH_THEME } from "./jewish-theme";

export const CLASSIC_THEME: Theme = {
  id: "classic",
  name: "Classic Isles",
  resources: {
    wood: {
      label: "Timber", color: "#2e7d32", icon: "🌲",
      tilePrompt: "dense evergreen forest hex tile, board game style",
    },
    brick: {
      label: "Brick", color: "#c0562f", icon: "🧱",
      tilePrompt: "red clay quarry hex tile, board game style",
    },
    grain: {
      label: "Grain", color: "#e0b431", icon: "🌾",
      tilePrompt: "golden wheat field hex tile, board game style",
    },
    wool: {
      label: "Wool", color: "#8bc34a", icon: "🐑",
      tilePrompt: "green sheep pasture hex tile, board game style",
    },
    ore: {
      label: "Ore", color: "#78909c", icon: "⛏️",
      tilePrompt: "grey stone mountain hex tile, board game style",
    },
  },
  desert: {
    label: "Badlands", color: "#d9c493", icon: "🏜️",
    tilePrompt: "dry sandy badlands hex tile, board game style",
  },
  bandit: { label: "Bandit", icon: "🗿" },
  terms: { road: "Road", settlement: "Village", city: "City" },
  board: { sea: "#e9decb" },
};

export const JAPAN_THEME: Theme = {
  id: "japan",
  name: "Japan",
  resources: {
    wood: {
      label: "Bamboo", color: "#7BA05B", icon: "🎋",
      tilePrompt: "bamboo forest hex tile, Japanese board game style",
    },
    brick: {
      label: "Clay Tile", color: "#B65A3C", icon: "🏮",
      tilePrompt: "traditional Japanese clay roof tile field",
    },
    grain: {
      label: "Rice", color: "#D8C56D", icon: "🍚",
      tilePrompt: "golden rice field hex tile",
    },
    wool: {
      label: "Silk", color: "#C9A8D8", icon: "🪡",
      tilePrompt: "silk workshop, soft Japanese textile pattern",
    },
    ore: {
      label: "Iron", color: "#6B6F76", icon: "⚔️",
      tilePrompt: "iron mountain mine, Japanese ink style",
    },
  },
  desert: {
    label: "Zen Garden", color: "#e3dbc8", icon: "🪨",
    tilePrompt: "minimal Japanese zen garden hex tile",
  },
  bandit: { label: "Ronin", icon: "👺" },
  terms: { road: "Path", settlement: "Village", city: "Castle" },
  board: { sea: "#e5dccb" },
};

export const BUILTIN_THEMES: Theme[] = [
  CLASSIC_THEME,
  JAPAN_THEME,
  ISRAEL_THEME,
  JEWISH_THEME,
  HAMSA_THEME,
];

const CUSTOM_THEMES_KEY = "hexisles:themes";

export function loadCustomThemes(): Theme[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_THEMES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Theme[];
    return parsed.map((t) => ({ ...t, custom: true }));
  } catch {
    return [];
  }
}

export function saveCustomTheme(theme: Theme): void {
  const others = loadCustomThemes().filter((t) => t.id !== theme.id);
  window.localStorage.setItem(
    CUSTOM_THEMES_KEY,
    JSON.stringify([...others, { ...theme, custom: true }]),
  );
}

export function deleteCustomTheme(id: string): void {
  window.localStorage.setItem(
    CUSTOM_THEMES_KEY,
    JSON.stringify(loadCustomThemes().filter((t) => t.id !== id)),
  );
}

export function allThemes(): Theme[] {
  return [...BUILTIN_THEMES, ...loadCustomThemes()];
}

export function getTheme(id: string): Theme {
  return allThemes().find((t) => t.id === id) ?? CLASSIC_THEME;
}
