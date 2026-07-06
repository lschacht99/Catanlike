import type { ResourceKey } from "@/types/game";

export interface GeneratedThemeResource { id: ResourceKey; displayName: string; visualStyle: string; cardTitle: string; cardDescription: string }
export interface GeneratedTerrainTile { baseType: string; displayName: string; heightStyle: "low" | "medium" | "high"; objects: string[]; materialHint: string }
export interface GeneratedTheme {
  themeName: string;
  themeDescription: string;
  palette: { primary: string; secondary: string; accent: string; terrainBase: string };
  resources: GeneratedThemeResource[];
  terrainTiles: GeneratedTerrainTile[];
  specialCards: { id: string; displayName: string; description: string; visualPrompt: string }[];
  buildings: { roadName: string; settlementName: string; cityName: string; knightName: string };
  boardGenerationHints: { terrainBalance: string; rarityNotes: string; avoid: string[] };
}

const RESOURCE_IDS: ResourceKey[] = ["wood", "brick", "grain", "wool", "ore"];
const objectField = (value: unknown, key: string): unknown => (value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined);
const safe = (value: unknown, fallback: string, max = 90) =>
  String(typeof value === "string" && value.trim() ? value : fallback).replace(/[<>]/g, "").slice(0, max);

export function sanitizeGeneratedTheme(input: unknown): GeneratedTheme {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const palette = (raw.palette && typeof raw.palette === "object" ? raw.palette : {}) as Record<string, unknown>;
  const byId = new Map((Array.isArray(raw.resources) ? raw.resources : []).map((r: Record<string, unknown>) => [r?.id, r]));
  return {
    themeName: safe(raw.themeName, "Custom Isles", 60),
    themeDescription: safe(raw.themeDescription, "A safe generated visual theme.", 220),
    palette: {
      primary: safe(palette.primary, "#7BA05B", 16), secondary: safe(palette.secondary, "#F4B6C2", 16),
      accent: safe(palette.accent, "#F8D66D", 16), terrainBase: safe(palette.terrainBase, "#88A06A", 16),
    },
    resources: RESOURCE_IDS.map((id) => {
      const r = byId.get(id) ?? {};
      return { id, displayName: safe(r.displayName, id), visualStyle: safe(r.visualStyle, `${id} terrain`, 180), cardTitle: safe(r.cardTitle, id), cardDescription: safe(r.cardDescription, `${id} resource`, 180) };
    }),
    terrainTiles: (Array.isArray(raw.terrainTiles) ? raw.terrainTiles : []).slice(0, 8).map((t: Record<string, unknown>) => ({
      baseType: safe(t.baseType, "forest", 30), displayName: safe(t.displayName, "Terrain", 60),
      heightStyle: typeof t.heightStyle === "string" && ["low", "medium", "high"].includes(t.heightStyle) ? t.heightStyle as "low" | "medium" | "high" : "medium",
      objects: (Array.isArray(t.objects) ? t.objects : []).slice(0, 8).map((o: unknown) => safe(o, "object", 32)),
      materialHint: safe(t.materialHint, "stylized low-poly terrain", 160),
    })),
    specialCards: (Array.isArray(raw.specialCards) ? raw.specialCards : []).slice(0, 12).map((c: Record<string, unknown>) => ({ id: safe(c.id, "card", 30), displayName: safe(c.displayName, "Card", 60), description: safe(c.description, "Special action", 180), visualPrompt: safe(c.visualPrompt, "original stylized board-game card art", 220) })),
    buildings: { roadName: safe(objectField(raw.buildings, "roadName"), "Trail"), settlementName: safe(objectField(raw.buildings, "settlementName"), "Haven"), cityName: safe(objectField(raw.buildings, "cityName"), "Citadel"), knightName: safe(objectField(raw.buildings, "knightName"), "Guardian") },
    boardGenerationHints: { terrainBalance: safe(objectField(raw.boardGenerationHints, "terrainBalance"), "standard"), rarityNotes: safe(objectField(raw.boardGenerationHints, "rarityNotes"), "Keep rare highlands dramatic.", 180), avoid: ["copyrighted characters", "real brand logos", ...((Array.isArray(objectField(raw.boardGenerationHints, "avoid")) ? objectField(raw.boardGenerationHints, "avoid") as unknown[] : []).map((x: unknown) => safe(x, "", 80)))] },
  };
}
