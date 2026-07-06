/** Canonical resource keys. Game rules ONLY ever reference these.
 *  Themes remap how they are displayed, never how they behave. */
export const RESOURCE_KEYS = ["wood", "brick", "grain", "wool", "ore"] as const;
export type ResourceKey = (typeof RESOURCE_KEYS)[number];

/** What a tile can produce ("desert" produces nothing). */
export type TileResource = ResourceKey | "desert";

export interface Tile {
  id: number;
  /** Axial hex coordinates. */
  q: number;
  r: number;
  resource: TileResource;
  /** Dice number token (2-12, never 7). Null for desert. */
  token: number | null;
}

/** A serializable generated board. Geometry is derived at runtime. */
export interface Board {
  tiles: Tile[];
  /** Balance score assigned by the generator. */
  score: number;
}

export interface BoardVertex {
  id: string;
  x: number;
  y: number;
  /** Tile ids this vertex touches. */
  tiles: number[];
  /** Neighboring vertex ids. */
  neighbors: string[];
  /** Edge ids incident to this vertex. */
  edges: string[];
}

export interface BoardEdge {
  id: string;
  /** The two vertex ids this edge connects. */
  a: string;
  b: string;
}

export interface BoardGeometry {
  vertices: Record<string, BoardVertex>;
  edges: Record<string, BoardEdge>;
  /** SVG bounding box of the whole board. */
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

export type ResourceCounts = Record<ResourceKey, number>;

export interface Building {
  /** Player index as string, matching boardgame.io ids. */
  player: string;
  /** false = settlement, true = city. */
  city: boolean;
}

export interface PlayerState {
  resources: ResourceCounts;
}

export type PlayerMode = "human" | "bot";
export type GameVariant = "base" | "cities-knights";

/** The boardgame.io G object. */
export interface GameState {
  numPlayers: number;
  board: Board;
  players: Record<string, PlayerState>;
  /** vertexId -> building */
  buildings: Record<string, Building>;
  /** edgeId -> player id */
  roads: Record<string, string>;
  /** Tile id the bandit currently occupies. */
  banditTile: number;
  /** Setup phase bookkeeping. */
  setupStep: number;
  /** Vertex placed this setup turn; the setup road must touch it. */
  pendingSetupSettlement: string | null;
  /** Play phase bookkeeping. */
  hasRolled: boolean;
  lastRoll: [number, number] | null;
  mustMoveBandit: boolean;
  /** Human-readable event feed. */
  log: string[];
}

/** Saved in localStorage to configure the next game. */
export interface GameConfig {
  numPlayers: number;
  themeId: string;
  board: Board;
  playerModes?: PlayerMode[];
  variant?: GameVariant;
}
