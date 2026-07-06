import type { Game } from "boardgame.io";
import type { Board, GameState, GameVariant } from "@/types/game";
import { emptyResources, PLAYER_NAMES } from "./constants";
import { winner } from "./scoring";
import {
  bankTrade,
  buildCity,
  buildKnight,
  buildRoad,
  buildSettlement,
  endTurn,
  moveBandit,
  placeRoad,
  placeSettlement,
  playerTrade,
  rollDice,
} from "./moves";

export function setupOrder(numPlayers: number, step: number): number {
  return step < numPlayers ? step : 2 * numPlayers - 1 - step;
}

function initialState(
  board: Board,
  numPlayers: number,
  options?: { playerNames?: string[]; variant?: GameVariant },
): GameState {
  const players: GameState["players"] = {};
  for (let i = 0; i < numPlayers; i++) {
    players[String(i)] = { resources: emptyResources() };
  }
  const desert = board.tiles.find((t) => t.resource === "desert");
  return {
    numPlayers,
    board,
    players,
    playerNames: Array.from({ length: numPlayers }, (_, i) => options?.playerNames?.[i] || PLAYER_NAMES[i] || `Player ${i + 1}`),
    variant: options?.variant ?? "base",
    buildings: {},
    roads: {},
    knights: {},
    banditTile: desert ? desert.id : -1,
    setupStep: 0,
    pendingSetupSettlement: null,
    hasRolled: false,
    lastRoll: null,
    mustMoveBandit: false,
    log: [],
  };
}

export function createHexIslesGame(
  board: Board,
  numPlayers: number,
  options?: { playerNames?: string[]; variant?: GameVariant },
): Game<GameState> {
  return {
    name: "hex-isles",
    setup: () => initialState(board, numPlayers, options),
    endIf: ({ G }) => {
      const w = winner(G);
      return w !== null ? { winner: w } : undefined;
    },
    phases: {
      setup: {
        start: true,
        moves: { placeSettlement, placeRoad },
        turn: {
          order: {
            first: () => 0,
            next: ({ G }) => {
              if (G.setupStep >= 2 * G.numPlayers) return undefined;
              return setupOrder(G.numPlayers, G.setupStep);
            },
          },
        },
        endIf: ({ G }) => G.setupStep >= 2 * G.numPlayers,
        next: "play",
      },
      play: {
        moves: {
          rollDice,
          moveBandit,
          buildRoad,
          buildSettlement,
          buildCity,
          buildKnight,
          bankTrade,
          playerTrade,
          endTurn,
        },
        turn: {
          onBegin: ({ G }) => {
            G.hasRolled = false;
            G.lastRoll = null;
            G.mustMoveBandit = false;
          },
        },
      },
    },
  };
}
