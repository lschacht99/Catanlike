/** Canonical resource keys. Game rules ONLY ever reference these.
 *  Themes remap how they are displayed, never how they behave. */
export const RESOURCE_KEYS = ["wood", "brick", "grain", "wool", "ore"] as const;
export type ResourceKey = (typeof RESOURCE_KEYS)[number];

export const COMMODITY_KEYS = ["coin", "cloth", "book"] as const;
export type CommodityKey = (typeof COMMODITY_KEYS)[number];
export type CommodityCounts = Record<CommodityKey, number>;

export const PROGRESS_TRACK_KEYS = ["trade", "politics", "science"] as const;
export type ProgressTrackKey = (typeof PROGRESS_TRACK_KEYS)[number];
export type ProgressTrackCounts = Record<ProgressTrackKey, number>;

export type ProgressCardType =
  | "roadworks"
  | "harvest"
  | "oreRush"
  | "merchant"
  | "diplomat"
  | "invention";

/** What a tile can produce ("desert" produces nothing). */
export type TileResource = ResourceKey | "desert";

export type DevCardType =
  | "knight"
  | "victory"
  | "roadBuilding"
  | "yearOfPlenty"
  | "monopoly";

export interface DevCard {
  type: DevCardType;
  /** ctx.turn when bought — a card cannot be played the turn it was bought. */
  turnBought: number;
}

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
  devCards: DevCard[];
  knightsPlayed: number;
  /** Cities & Knights extras (patched in lazily for legacy saves). */
  commodities?: CommodityCounts;
  improvements?: ProgressTrackCounts;
  progressCards?: ProgressCardType[];
  victoryBonus?: number;
}

export type PlayerMode = "human" | "bot";
export type GameVariant = "base" | "cities-knights";

/** The boardgame.io G object. */
export interface GameState {
  numPlayers: number;
  board: Board;
  players: Record<string, PlayerState>;
  /** Display names, index = player id. */
  names: string[];
  /** Alias of names kept for newer UI components. */
  playerNames?: string[];
  /** Rules variant this match was created with. */
  variant?: GameVariant;
  /** vertexId -> building */
  buildings: Record<string, Building>;
  /** edgeId -> player id */
  roads: Record<string, string>;
  /** vertexId -> player id for Cities & Knights */
  knights: Record<string, string>;
  /** vertexId -> active knight flag */
  activeKnights?: Record<string, boolean>;
  barbarianPosition?: number;
  lastEventDie?: "barbarian" | ProgressTrackKey | null;
  progressDeck?: ProgressCardType[];
  progressDiscards?: ProgressCardType[];
  /** Tile id the bandit currently occupies. */
  banditTile: number;
  /** Shuffled development card deck (draw from the end). */
  devDeck: DevCardType[];
  /** Bonus holders (2 VP each). */
  largestArmyHolder: string | null;
  longestRoadHolder: string | null;
  /** Setup phase bookkeeping. */
  setupStep: number;
  /** Vertex placed this setup turn; the setup road must touch it. */
  pendingSetupSettlement: string | null;
  /** Play phase bookkeeping. */
  hasRolled: boolean;
  lastRoll: [number, number] | null;
  /** Resources gained by each player on the last roll (for the roll-result sheet). */
  lastGains: Record<string, Partial<ResourceCounts>>;
  mustMoveBandit: boolean;
  /** Free roads remaining from a Road Building card. */
  freeRoads: number;
  /** Only one development card may be played per turn. */
  playedDevCardThisTurn: boolean;
  /** Human-readable event feed (most recent last). */
  log: string[];
}

/** Saved in localStorage to configure the next local game. */
export interface GameConfig {
  numPlayers: number;
  themeId: string;
  board: Board;
  playerNames?: string[];
  playerModes?: PlayerMode[];
  variant?: GameVariant;
}

/** setupData passed through the lobby when creating an online match. */
export interface OnlineSetupData {
  board: Board;
  themeId: string;
}
