import type { GameState, GameVariant, PlayerMode } from "@/types/game";

/**
 * Versioned local save-game persistence. A snapshot is a clean turn-start
 * state (before the die is rolled) plus the metadata needed to rebuild the
 * client. Old/invalid saves are rejected rather than crashing the app.
 */
export const SAVE_VERSION = 2;
const SAVE_KEY = "hamsa:savedGame:v2";

export interface SavedGame {
  version: number;
  savedAt: number;
  themeId: string;
  variant: GameVariant;
  numPlayers: number;
  playerNames: string[];
  playerModes: PlayerMode[];
  /** Play-order position of the player whose turn it is. */
  playOrderPos: number;
  turn: number;
  /** The boardgame.io `G` snapshot. */
  state: GameState;
}

export type LoadResult =
  | { status: "ok"; save: SavedGame }
  | { status: "none" }
  | { status: "invalid" };

function looksValid(save: unknown): save is SavedGame {
  if (!save || typeof save !== "object") return false;
  const s = save as Partial<SavedGame>;
  return (
    s.version === SAVE_VERSION &&
    typeof s.themeId === "string" &&
    typeof s.numPlayers === "number" &&
    Array.isArray(s.playerNames) &&
    !!s.state &&
    typeof s.state === "object" &&
    !!(s.state as GameState).players &&
    !!(s.state as GameState).board
  );
}

export function saveGame(save: Omit<SavedGame, "version" | "savedAt">): void {
  if (typeof window === "undefined") return;
  try {
    const payload: SavedGame = { ...save, version: SAVE_VERSION, savedAt: Date.now() };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  } catch {
    // Storage full / disabled — saving is best-effort, never fatal.
  }
}

export function loadGame(): LoadResult {
  if (typeof window === "undefined") return { status: "none" };
  const raw = window.localStorage.getItem(SAVE_KEY);
  if (!raw) return { status: "none" };
  try {
    const parsed = JSON.parse(raw);
    if (!looksValid(parsed)) return { status: "invalid" };
    return { status: "ok", save: parsed };
  } catch {
    return { status: "invalid" };
  }
}

export function hasSavedGame(): boolean {
  return loadGame().status === "ok";
}

export function deleteSavedGame(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SAVE_KEY);
}

/** Human-readable summary for the Resume card. */
export function describeSavedGame(save: SavedGame): string {
  const mode = save.variant === "cities-knights" ? "Cities & Knights" : "Standard";
  const who = save.playerNames.slice(0, save.numPlayers).join(", ");
  return `${mode} · ${who} · turn ${save.turn}`;
}
