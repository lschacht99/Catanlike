import type { Game } from "boardgame.io";
import type { Board, GameState, GameVariant, OnlineSetupData, PlayerSetup } from "@/types/game";
import {
  devDeck,
  emptyCommodities,
  emptyImprovements,
  emptyResources,
  PLAYER_NAMES,
  PROGRESS_DECK,
} from "./constants";
import { generateBoard } from "./generator";
import { winner } from "./scoring";
import {
  activateKnight,
  bankTrade,
  buildCity,
  buildKnight,
  buildRoad,
  buildSettlement,
  buyDevCard,
  endTurn,
  improveCity,
  upgradeKnight,
  moveBandit,
  placeRoad,
  placeSettlement,
  playerTrade,
  playKnight,
  playMonopoly,
  playProgressCard,
  playRoadBuilding,
  playYearOfPlenty,
  rollDice,
} from "./moves";
import { normalizePlayerSetups } from "./player-control";

export function setupOrder(numPlayers: number, step: number): number {
  return step < numPlayers ? step : 2 * numPlayers - 1 - step;
}

export function initialState(
  board: Board,
  numPlayers: number,
  shuffledDeck: GameState["devDeck"],
  names?: string[],
  variant: GameVariant = "base",
  playerSetups?: PlayerSetup[],
): GameState {
  const players: GameState["players"] = {};
  for (let i = 0; i < numPlayers; i++) {
    players[String(i)] = {
      resources: emptyResources(),
      devCards: [],
      knightsPlayed: 0,
      commodities: emptyCommodities(),
      improvements: emptyImprovements(),
      progressCards: [],
      victoryBonus: 0,
    };
  }

  const resolvedNames =
    names && names.length === numPlayers
      ? names
      : Array.from({ length: numPlayers }, (_, i) => PLAYER_NAMES[i] ?? `Player ${i + 1}`);
  const desert = board.tiles.find((t) => t.resource === "desert");

  return {
    numPlayers,
    board,
    players,
    names: resolvedNames,
    playerNames: resolvedNames,
    variant,
    playerSetups: normalizePlayerSetups(numPlayers, playerSetups),
    buildings: {},
    roads: {},
    knights: {},
    activeKnights: {},
    knightLevels: {},
    barbarianPosition: 0,
    lastEventDie: null,
    progressDeck: [...PROGRESS_DECK],
    progressDiscards: [],
    banditTile: desert ? desert.id : -1,
    devDeck: shuffledDeck,
    largestArmyHolder: null,
    longestRoadHolder: null,
    setupStep: 0,
    pendingSetupSettlement: null,
    hasRolled: false,
    lastRoll: null,
    lastGains: {},
    mustMoveBandit: false,
    freeRoads: 0,
    playedDevCardThisTurn: false,
    log: [],
  };
}

const PHASES: Game<GameState>["phases"] = {
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
      activateKnight,
      improveCity,
      upgradeKnight,
      playProgressCard,
      bankTrade,
      playerTrade,
      buyDevCard,
      playKnight,
      playRoadBuilding,
      playYearOfPlenty,
      playMonopoly,
      endTurn,
    },
    turn: {
      order: {
        first: () => 0,
        next: ({ ctx }) => (ctx.playOrderPos + 1) % ctx.numPlayers,
      },
      onBegin: ({ G }) => {
        G.hasRolled = false;
        G.lastRoll = null;
        G.lastEventDie = null;
        G.mustMoveBandit = false;
        G.freeRoads = 0;
        G.playedDevCardThisTurn = false;
      },
    },
  },
};

const END_IF: Game<GameState>["endIf"] = ({ G }) => {
  const w = winner(G);
  return w !== null ? { winner: w } : undefined;
};

/**
 * Local (pass-and-play) game definition: the board and player names are
 * fixed at creation time on the device.
 */
export function createHexIslesGame(
  board: Board,
  numPlayers: number,
  names?: string[],
  variant: GameVariant = "base",
  playerSetups?: PlayerSetup[],
): Game<GameState> {
  return {
    name: "hamsa-nomads",
    setup: ({ random }) =>
      initialState(board, numPlayers, random.Shuffle(devDeck()), names, variant, playerSetups),
    endIf: END_IF,
    phases: PHASES,
  };
}

/**
 * Online game definition registered on the boardgame.io server. The board
 * travels through the lobby's `setupData` so every client shares the map;
 * if absent, the server generates one.
 */
export const HamsaNomadsGame: Game<GameState> = {
  name: "hamsa-nomads",
  setup: ({ ctx, random }, setupData?: OnlineSetupData) => {
    const board = setupData?.board ?? generateBoard(400, () => random.Number());
    return initialState(board, ctx.numPlayers, random.Shuffle(devDeck()), undefined, "base", setupData?.playerSetups);
  },
  endIf: END_IF,
  phases: PHASES,
  minPlayers: 2,
  maxPlayers: 4,
};
