import { LobbyClient } from "boardgame.io/client";
import type { Board } from "@/types/game";

export const GAME_NAME = "hamsa-nomads";

/**
 * Where the boardgame.io server lives. Configure with
 * NEXT_PUBLIC_GAME_SERVER; defaults to the current host on port 8000.
 */
export function serverUrl(): string {
  if (process.env.NEXT_PUBLIC_GAME_SERVER) return process.env.NEXT_PUBLIC_GAME_SERVER;
  if (typeof window === "undefined") return "http://localhost:8000";
  return `${window.location.protocol}//${window.location.hostname}:8000`;
}

export function lobbyClient(): LobbyClient {
  return new LobbyClient({ server: serverUrl() });
}

export interface MatchSeat {
  matchID: string;
  playerID: string;
  credentials: string;
  name: string;
  themeId: string;
}

const SEAT_PREFIX = "hamsa:seat:";

export function saveSeat(seat: MatchSeat): void {
  window.localStorage.setItem(SEAT_PREFIX + seat.matchID, JSON.stringify(seat));
}

export function loadSeat(matchID: string): MatchSeat | null {
  try {
    const raw = window.localStorage.getItem(SEAT_PREFIX + matchID);
    return raw ? (JSON.parse(raw) as MatchSeat) : null;
  } catch {
    return null;
  }
}

export function clearSeat(matchID: string): void {
  window.localStorage.removeItem(SEAT_PREFIX + matchID);
}

export async function createMatch(
  numPlayers: number,
  board: Board,
  themeId: string,
): Promise<string> {
  const { matchID } = await lobbyClient().createMatch(GAME_NAME, {
    numPlayers,
    setupData: { board, themeId },
  });
  return matchID;
}

export async function joinMatch(
  matchID: string,
  name: string,
  themeId: string,
): Promise<MatchSeat> {
  const existing = loadSeat(matchID);
  if (existing) return existing;
  const { playerID, playerCredentials } = await lobbyClient().joinMatch(
    GAME_NAME,
    matchID,
    { playerName: name },
  );
  const seat: MatchSeat = {
    matchID,
    playerID,
    credentials: playerCredentials,
    name,
    themeId,
  };
  saveSeat(seat);
  return seat;
}

export interface MatchInfo {
  matchID: string;
  players: { id: number; name?: string }[];
  setupData?: { themeId?: string };
}

export async function getMatch(matchID: string): Promise<MatchInfo> {
  return (await lobbyClient().getMatch(GAME_NAME, matchID)) as unknown as MatchInfo;
}
