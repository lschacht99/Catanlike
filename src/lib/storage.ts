import type { Board, GameConfig } from "@/types/game";

const ACTIVE_GAME_KEY = "hexisles:activeGame";
const SAVED_BOARDS_KEY = "hexisles:boards";

export interface SavedBoard {
  id: string;
  name: string;
  createdAt: number;
  board: Board;
}

export function saveGameConfig(config: GameConfig): void {
  window.localStorage.setItem(ACTIVE_GAME_KEY, JSON.stringify(config));
}

export function loadGameConfig(): GameConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ACTIVE_GAME_KEY);
    return raw ? (JSON.parse(raw) as GameConfig) : null;
  } catch {
    return null;
  }
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
