import type { BotDifficulty, GameConfig, GameState, PlayerMode, PlayerSetup } from "@/types/game";

export const PLAYER_MODE_LABELS: Record<PlayerMode, string> = {
  human: "Human on this device",
  remote: "Remote human",
  bot: "Bot",
};

export const BOT_DIFFICULTY_LABELS: Record<BotDifficulty, string> = {
  easy: "Easy",
  normal: "Normal",
  hard: "Hard",
};

export function joinCodeForSeat(matchId: string, seat: number): string {
  return `${matchId.toUpperCase()}-P${seat + 1}`;
}

export function normalizePlayerSetups(numPlayers: number, setups?: PlayerSetup[], modes?: PlayerMode[]): PlayerSetup[] {
  return Array.from({ length: numPlayers }, (_, index) => {
    const existing = setups?.[index];
    const mode = existing?.mode ?? modes?.[index] ?? "human";
    return {
      mode,
      botDifficulty: mode === "bot" ? existing?.botDifficulty ?? "normal" : undefined,
      joinCode: mode === "remote" ? existing?.joinCode ?? joinCodeForSeat("LOCAL", index) : undefined,
    };
  });
}

export function normalizePlayerModes(numPlayers: number, modes?: PlayerMode[], setups?: PlayerSetup[]): PlayerMode[] {
  return Array.from({ length: numPlayers }, (_, index) => setups?.[index]?.mode ?? modes?.[index] ?? "human");
}

export function withPlayerSetups(config: GameConfig): GameConfig {
  const playerSetups = normalizePlayerSetups(config.numPlayers, config.playerSetups, config.playerModes);
  return {
    ...config,
    playerSetups,
    playerModes: normalizePlayerModes(config.numPlayers, config.playerModes, playerSetups),
  };
}

export function playerSetupFor(G: Pick<GameState, "playerSetups" | "numPlayers">, playerID: string): PlayerSetup {
  const index = Number(playerID);
  return normalizePlayerSetups(G.numPlayers, G.playerSetups)[index] ?? { mode: "human" };
}

export function isBotSeat(G: Pick<GameState, "playerSetups" | "numPlayers">, playerID: string): boolean {
  return playerSetupFor(G, playerID).mode === "bot";
}

export function canLocalDeviceControlSeat(G: Pick<GameState, "playerSetups" | "numPlayers">, playerID: string): boolean {
  return playerSetupFor(G, playerID).mode === "human";
}

export function canRemoteCredentialControlSeat(G: Pick<GameState, "playerSetups" | "numPlayers">, credentialPlayerID: string | null | undefined, seatID: string): boolean {
  return playerSetupFor(G, seatID).mode === "remote" && credentialPlayerID === seatID;
}
