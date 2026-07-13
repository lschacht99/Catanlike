import type { ResourceKey } from "./game";
import type { ThemeVisuals } from "@/game/assets/assetTypes";

export interface ResourceTheme {
  /** Display name shown to players (e.g. wood -> "Bamboo"). */
  label: string;
  /** Tile / chip color. */
  color: string;
  /** Legacy compact glyph. New built-in themes use the SVG sprite first. */
  icon: string;
  /**
   * Optional tile artwork (URL or data URI). When set it fills the hex;
   * otherwise procedural vector art is drawn in the tile color.
   */
  image?: string;
  /** Bundled hex SVG asset path (relative to /public), used by both boards. */
  tileArt?: string;
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
  /** Optional production visual pack. Absent on old/custom themes by design. */
  visuals?: ThemeVisuals;
  /** True for user-created themes stored in localStorage. */
  custom?: boolean;
}
