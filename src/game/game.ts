import type { Game } from "boardgame.io";
import type { Board, GameState } from "@/types/game";
import { emptyResources } from "./constants";
import { winner } from "./scoring";
import {
  bankTrade,
  buildCity,
  buildRoad,
  buildSettlement,
  endTurn,
  moveBandit,
  placeRoad,
  placeSettlement,
  rollDice,
} from "./moves";

/** Setup order: 0,1,...,n-1 then back n-1,...,0 (snake draft). */
export function setupOrder(numPlayers: number, step: number): number {
  return step < numPlayers ? step : 2 * numPlayers - 1 - step;
}

function initialState(board: Board, numPlayers: number): GameState {
  const players: GameState["players"] = {};
  for (let i = 0; i < numPlayers; i++) {
    players[String(i)] = { resources: emptyResources() };
  }
  const desert = board.tiles.find((t) => t.resource === "desert");
  return {
    numPlayers,
    board,
    players,
    buildings: {},
    roads: {},
    banditTile: desert ? desert.id : -1,
    setupStep: 0,
    pendingSetupSettlement: null,
    hasRolled: false,
    lastRoll: null,
    mustMoveBandit: false,
    log: [],
  };
}

/**
 * Build the boardgame.io game definition for a given generated board.
 * The board is fixed at creation time so every client shares the same map.
 */
export function createHexIslesGame(
  board: Board,
  numPlayers: number,
): Game<GameState> {
  return {
    name: "hex-isles",

    setup: () => initialState(board, numPlayers),

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
          bankTrade,
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
