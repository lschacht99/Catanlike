import type { Board, GameConfig, PlayerMode } from "@/types/game";
import { PLAYER_NAMES } from "@/game/constants";

const ACTIVE_GAME_KEY = "hexisles:activeGame";
const SAVED_BOARDS_KEY = "hexisles:boards";

export interface SavedBoard {
  id: string;
  name: string;
  createdAt: number;
  board: Board;
}

export function saveGameConfig(config: GameConfig): void {
  window.localStorage.setItem(ACTIVE_GAME_KEY, JSON.stringify(normalizeGameConfig(config)));
}

export function loadGameConfig(): GameConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ACTIVE_GAME_KEY);
    return raw ? normalizeGameConfig(JSON.parse(raw) as GameConfig) : null;
  } catch {
    return null;
  }
}

function normalizeGameConfig(config: GameConfig): GameConfig {
  return {
    ...config,
    playerModes: normalizePlayerModes(config.numPlayers, config.playerModes),
    playerNames: normalizePlayerNames(config.numPlayers, config.playerNames),
    variant: config.variant ?? "base",
  };
}

function normalizePlayerModes(numPlayers: number, modes?: PlayerMode[]): PlayerMode[] {
  if (modes?.length === numPlayers) return modes;
  if (numPlayers === 4) return ["human", "human", "bot", "bot"];
  return Array.from({ length: numPlayers }, () => "human");
}

function normalizePlayerNames(numPlayers: number, names?: string[]): string[] {
  return Array.from({ length: numPlayers }, (_, i) => names?.[i]?.trim() || PLAYER_NAMES[i] || `Player ${i + 1}`);
}

export function loadSavedBoards(): SavedBoard[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SAVED_BOARDS_KEY);
    return raw ? (JSON.parse(raw) as SavedBoard[]) : [];
  } catch {
    return [];
  }
}

export function saveBoard(entry: SavedBoard): void {
  const others = loadSavedBoards().filter((b) => b.id !== entry.id);
  window.localStorage.setItem(SAVED_BOARDS_KEY, JSON.stringify([entry, ...others]));
}

export function deleteSavedBoard(id: string): void {
  window.localStorage.setItem(
    SAVED_BOARDS_KEY,
    JSON.stringify(loadSavedBoards().filter((b) => b.id !== id)),
  );
}
