import { describe, expect, it } from "vitest";
import { initialState } from "../game";
import { canLocalDeviceControlSeat, canRemoteCredentialControlSeat, isBotSeat, normalizePlayerSetups } from "../player-control";
import { randomBoard } from "../generator";

const board = () => randomBoard(() => 0.42);

describe("per-seat player control setup", () => {
  it("normalizes each player slot independently", () => {
    const setups = normalizePlayerSetups(4, [
      { mode: "human" },
      { mode: "remote", joinCode: "ROOM-P2" },
      { mode: "bot", botDifficulty: "easy" },
      { mode: "bot", botDifficulty: "hard" },
    ]);

    expect(setups.map((setup) => setup.mode)).toEqual(["human", "remote", "bot", "bot"]);
    expect(setups[1].joinCode).toBe("ROOM-P2");
    expect(setups[2].botDifficulty).toBe("easy");
    expect(setups[3].botDifficulty).toBe("hard");
  });

  it("stores bot difficulty per bot seat in game state", () => {
    const G = initialState(board(), 3, [], ["A", "B", "C"], "cities-knights", [
      { mode: "human" },
      { mode: "bot", botDifficulty: "easy" },
      { mode: "bot", botDifficulty: "hard" },
    ]);

    expect(G.variant).toBe("cities-knights");
    expect(G.playerSetups?.[1]).toEqual({ mode: "bot", botDifficulty: "easy" });
    expect(G.playerSetups?.[2]).toEqual({ mode: "bot", botDifficulty: "hard" });
  });

  it("identifies only bot-controlled seats as bots", () => {
    const G = initialState(board(), 3, [], undefined, "base", [
      { mode: "human" },
      { mode: "remote", joinCode: "ROOM-P2" },
      { mode: "bot", botDifficulty: "normal" },
    ]);

    expect(isBotSeat(G, "0")).toBe(false);
    expect(isBotSeat(G, "1")).toBe(false);
    expect(isBotSeat(G, "2")).toBe(true);
  });

  it("prevents remote players from controlling another seat", () => {
    const G = initialState(board(), 2, [], undefined, "base", [
      { mode: "remote", joinCode: "ROOM-P1" },
      { mode: "remote", joinCode: "ROOM-P2" },
    ]);

    expect(canRemoteCredentialControlSeat(G, "0", "0")).toBe(true);
    expect(canRemoteCredentialControlSeat(G, "0", "1")).toBe(false);
    expect(canRemoteCredentialControlSeat(G, "1", "0")).toBe(false);
  });

  it("keeps local pass-and-play control for local human seats", () => {
    const G = initialState(board(), 3, [], undefined, "base", [
      { mode: "human" },
      { mode: "human" },
      { mode: "bot", botDifficulty: "normal" },
    ]);

    expect(canLocalDeviceControlSeat(G, "0")).toBe(true);
    expect(canLocalDeviceControlSeat(G, "1")).toBe(true);
    expect(canLocalDeviceControlSeat(G, "2")).toBe(false);
  });

  it("starts mixed human, remote, and bot games", () => {
    const G = initialState(board(), 4, [], ["Phone 1", "Phone 2", "CPU A", "CPU B"], "base", [
      { mode: "human" },
      { mode: "remote", joinCode: "ROOM-P2" },
      { mode: "bot", botDifficulty: "easy" },
      { mode: "bot", botDifficulty: "normal" },
    ]);

    expect(Object.keys(G.players)).toEqual(["0", "1", "2", "3"]);
    expect(G.playerSetups?.map((setup) => setup.mode)).toEqual(["human", "remote", "bot", "bot"]);
  });
});
