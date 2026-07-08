import type { GameState } from "@/types/game";
import { emptyResources } from "../constants";
import { randomBoard } from "../generator";

/** A bare play-phase state on a deterministic board, for rule tests. */
export function makeState(numPlayers = 3): GameState {
  const board = randomBoard(() => 0.42);
  const players: GameState["players"] = {};
  for (let i = 0; i < numPlayers; i++) {
    players[String(i)] = {
      resources: emptyResources(),
      devCards: [],
      knightsPlayed: 0,
    };
  }
  return {
    numPlayers,
    board,
    players,
    names: ["Navy", "Rust", "Olive", "Gold"].slice(0, numPlayers),
    buildings: {},
    roads: {},
    knights: {},
    banditTile: board.tiles.find((t) => t.resource === "desert")!.id,
    devDeck: [],
    largestArmyHolder: null,
    longestRoadHolder: null,
    setupStep: 0,
    pendingSetupSettlement: null,
    hasRolled: true,
    lastRoll: [3, 4],
    lastGains: {},
    mustMoveBandit: false,
    freeRoads: 0,
    playedDevCardThisTurn: false,
    log: [],
  };
}
