import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteSavedGame,
  describeSavedGame,
  hasSavedGame,
  loadGame,
  saveGame,
  SAVE_VERSION,
  type SavedGame,
} from "../savegame";
import { makeState } from "@/game/__tests__/helpers";

// jsdom is not configured for lib tests, so stub localStorage.
function fakeStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  } as unknown as Storage;
}

function sampleSave(): Omit<SavedGame, "version" | "savedAt"> {
  return {
    themeId: "classic",
    variant: "base",
    numPlayers: 2,
    playerNames: ["Ada", "Bo"],
    playerModes: ["human", "bot"],
    playOrderPos: 0,
    turn: 4,
    state: makeState(2),
  };
}

beforeEach(() => {
  vi.stubGlobal("window", { localStorage: fakeStorage() });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("save/resume", () => {
  it("round-trips a saved game", () => {
    expect(hasSavedGame()).toBe(false);
    saveGame(sampleSave());
    expect(hasSavedGame()).toBe(true);
    const result = loadGame();
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.save.version).toBe(SAVE_VERSION);
      expect(result.save.playerNames).toEqual(["Ada", "Bo"]);
      expect(result.save.state.players["0"]).toBeDefined();
    }
  });

  it("reports invalid saves instead of throwing", () => {
    window.localStorage.setItem("hamsa:savedGame:v2", "{not valid json");
    expect(loadGame().status).toBe("invalid");
  });

  it("rejects saves from an older version", () => {
    window.localStorage.setItem(
      "hamsa:savedGame:v2",
      JSON.stringify({ version: 1, themeId: "classic", state: {} }),
    );
    expect(loadGame().status).toBe("invalid");
  });

  it("deletes a saved game", () => {
    saveGame(sampleSave());
    deleteSavedGame();
    expect(hasSavedGame()).toBe(false);
    expect(loadGame().status).toBe("none");
  });

  it("summarizes a save for the resume card", () => {
    const save: SavedGame = { ...sampleSave(), version: SAVE_VERSION, savedAt: Date.now() };
    expect(describeSavedGame(save)).toContain("Standard");
    expect(describeSavedGame(save)).toContain("Ada");
  });
});
