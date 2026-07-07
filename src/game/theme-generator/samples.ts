import type { GeneratedTheme } from "./schema";

export const JAPAN_CHERRY_BAMBOO_THEME: GeneratedTheme = {
  themeName: "Cherry Bamboo Highlands", themeDescription: "An original spring mountain village theme with bamboo groves, blossom winds, rice terraces, and lantern-lit paths.",
  palette: { primary: "#7BA05B", secondary: "#F4B6C2", accent: "#F6C85F", terrainBase: "#9DBA74" },
  resources: [
    { id: "wood", displayName: "Bamboo", visualStyle: "green bamboo grove with cut poles", cardTitle: "Bamboo", cardDescription: "Flexible poles for paths and homes" },
    { id: "brick", displayName: "Red Clay", visualStyle: "warm clay banks and kiln stacks", cardTitle: "Red Clay", cardDescription: "Fired earth for sturdy walls" },
    { id: "grain", displayName: "Rice", visualStyle: "stepped golden rice terraces", cardTitle: "Rice Harvest", cardDescription: "Food from mountain paddies" },
    { id: "wool", displayName: "Silk Thread", visualStyle: "mulberry pasture and soft textile bundles", cardTitle: "Silk Thread", cardDescription: "Fine trade fiber" },
    { id: "ore", displayName: "Mountain Iron", visualStyle: "dark rocky slopes with iron seams", cardTitle: "Mountain Iron", cardDescription: "Metal from misty ridges" },
  ],
  terrainTiles: [{ baseType: "forest", displayName: "Bamboo Grove", heightStyle: "medium", objects: ["bamboo", "lanterns", "fallen_petals"], materialHint: "stylized low-poly bamboo forest" }],
  specialCards: [{ id: "guardian", displayName: "Guardian", description: "Move the blocker or defend a town.", visualPrompt: "original small guardian figure in blossom village style" }],
  buildings: { roadName: "Lantern Path", settlementName: "Hamlet", cityName: "Hill Town", knightName: "Guardian" },
  boardGenerationHints: { terrainBalance: "standard", rarityNotes: "Mountains should be rare and misty.", avoid: ["copyrighted characters", "real brand logos"] },
};

export const MINECRAFT_MOUNTAIN_VILLAGE_THEME: GeneratedTheme = {
  ...JAPAN_CHERRY_BAMBOO_THEME,
  themeName: "Blocky Mountain Village",
  themeDescription: "A voxel-inspired original alpine village with chunky cliffs, pine blocks, crop squares, sheep, and glowing mine mouths.",
  palette: { primary: "#4F8A3D", secondary: "#8B5E3C", accent: "#63B3ED", terrainBase: "#6BA257" },
  buildings: { roadName: "Stone Track", settlementName: "Cabin", cityName: "Keep", knightName: "Ranger" },
};
