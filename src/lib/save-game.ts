import type { Ctx } from "boardgame.io";
import type { GameConfig, GameState } from "@/types/game";

export const SAVE_VERSION = 1;
export const SAVED_GAME_KEY = "hexisles:savedGame:v1";

export interface SavedGameSnapshot {
  version: typeof SAVE_VERSION;
  savedAt: number;
  config: GameConfig;
  state: { G: GameState; ctx: Pick<Ctx, "currentPlayer" | "phase" | "turn" | "playOrder" | "playOrderPos"> };
}

export function saveSnapshot(snapshot: Omit<SavedGameSnapshot, "version" | "savedAt">): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SAVED_GAME_KEY, JSON.stringify({ ...snapshot, version: SAVE_VERSION, savedAt: Date.now() }));
}

export function loadSnapshot(): SavedGameSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SAVED_GAME_KEY) || "null");
    return parsed?.version === SAVE_VERSION && parsed?.state?.G ? parsed : null;
  } catch { return null; }
}

export function deleteSnapshot(): void {
  if (typeof window !== "undefined") window.localStorage.removeItem(SAVED_GAME_KEY);
}
