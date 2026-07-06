import type { ResourceKey } from "./game";

export interface ResourceTheme {
  /** Display name shown to players (e.g. wood -> "Bamboo"). */
  label: string;
  /** Tile / chip color. */
  color: string;
  /** Single emoji or short glyph used as the resource icon. */
  icon: string;
  /** Prompt reserved for future AI-generated tile art. */
  tilePrompt?: string;
}

export interface Theme {
  id: string;
  name: string;
  resources: Record<ResourceKey, ResourceTheme>;
  desert: ResourceTheme;
  bandit: { label: string; icon: string };
  /** Display names for the build pieces. Rules never read these. */
  terms: { road: string; settlement: string; city: string; knight: string };
  /** Board chrome colors. */
  board: { sea: string };
  /** True for user-created themes stored in localStorage. */
  custom?: boolean;
}
