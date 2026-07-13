import type { FnContext, Game } from "boardgame.io";
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
  cancelTrade,
  clearTradeResult,
  deactivateKnight,
  endTurn,
  improveCity,
  moveBandit,
  placeRoad,
  placeSettlement,
  proposeTrade,
  respondTrade,
  playKnight,
  playMonopoly,
  playProgressCard,
  playRoadBuilding,
  playYearOfPlenty,
  rollDice,
  upgradeKnight,
} from "./moves";
import { normalizePlayerSetups } from "./player-control";

export function setupOrder(numPlayers: number, step: number): number {
  return step < numPlayers ? step : 2 * numPlayers - 1 - step;
}

/** Every move available during the play phase (shared by new & resumed games). */
const PLAY_MOVES = {
  rollDice,
  moveBandit,
  buildRoad,
  buildSettlement,
  buildCity,
  bankTrade,
  buyDevCard,
  playKnight,
  playRoadBuilding,
  playYearOfPlenty,
  playMonopoly,
  proposeTrade,
  respondTrade,
  cancelTrade,
  clearTradeResult,
  buildKnight,
  activateKnight,
  deactivateKnight,
  upgradeKnight,
  improveCity,
  playProgressCard,
  endTurn,
} as const;

const RESET_TURN = ({ G, events }: FnContext<GameState>) => {
  // Duo-online: each device rebuilds a brand-new boardgame.io client from
  // the latest synced snapshot on every action (see DuoGame.tsx), and the
  // hand-rolled Firebase wire protocol only carries {currentPlayer, phase,
  // turn, playOrderPos} — NOT ctx.activePlayers (boardgame.io's own
  // multiplayer transport would sync that automatically; this one doesn't).
  // So a fresh mount always starts with activePlayers=null regardless of
  // what proposeTrade set on the originating device. Re-derive it here,
  // every time this phase begins (which fires once immediately even for a
  // mid-turn resume) — otherwise a pending trade's target can never
  // dispatch respondTrade from their own remounted client.
  if (G.pendingTrade) {
    events.setActivePlayers([G.pendingTrade.from, G.pendingTrade.to]);
  }
  // Duo-online resume: a snapshot can land MID-turn (the opponent rolled and
  // built, then synced). The first synthetic "turn begin" after rebuilding a
  // client from such a snapshot must not wipe hasRolled/lastRoll — the guard
  // flag is set once by createDuoGame's setup and consumed here.
  if (G._duoSkipTurnReset) {
    delete G._duoSkipTurnReset;
    return;
  }
  G.hasRolled = false;
  G.lastRoll = null;
  G.mustMoveBandit = false;
  G.freeRoads = 0;
  G.playedDevCardThisTurn = false;
};

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
  const setups = normalizePlayerSetups(numPlayers, playerSetups);

  return {
    numPlayers,
    board,
    players,
    names: resolvedNames,
    playerNames: resolvedNames,
    playerModes: setups.map((s) => s.mode),
    difficulties: setups.map((s) => s.botDifficulty ?? "normal"),
    variant,
    playerSetups: setups,
    buildings: {},
    roads: {},
    knights: {},
    activeKnights: {},
    knightLevels: {},
    barbarianPosition: 0,
    lastEventDie: null,
    pendingTrade: null,
    lastTradeResult: null,
    tradeRate: 4,
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
    moves: PLAY_MOVES,
    turn: {
      order: {
        first: () => 0,
        next: ({ ctx }) => (ctx.playOrderPos + 1) % ctx.numPlayers,
      },
      onBegin: RESET_TURN,
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
 * Resume a saved game. The persisted `G` snapshot is replayed as the initial
 * state of a single play phase that begins with the player whose turn it was.
 * The setup phase is intentionally skipped — snapshots are only taken during
 * play, so all buildings/roads already exist in `G`.
 */
export function createResumeGame(
  savedG: GameState,
  startPlayOrderPos: number,
): Game<GameState> {
  return {
    name: "hamsa-nomads",
    setup: () => savedG,
    endIf: END_IF,
    phases: {
      play: {
        start: true,
        moves: PLAY_MOVES,
        turn: {
          order: {
            first: () => startPlayOrderPos % Math.max(1, savedG.numPlayers),
            next: ({ ctx }) => (ctx.playOrderPos + 1) % ctx.numPlayers,
          },
          onBegin: RESET_TURN,
        },
      },
    },
  };
}

/**
 * Duo-online (Firebase-synced) game: each phone rebuilds a local client from
 * the latest shared snapshot, which — unlike createResumeGame — may land in
 * EITHER phase and mid-turn. The setup phase's first player is derived from
 * G.setupStep, and RESET_TURN is skipped exactly once via _duoSkipTurnReset
 * so a mid-turn snapshot keeps its hasRolled/lastRoll state.
 */
export function createDuoGame(
  savedG: GameState,
  startPhase: "setup" | "play",
  startPlayOrderPos: number,
): Game<GameState> {
  return {
    name: "hamsa-nomads",
    setup: () => ({ ...savedG, _duoSkipTurnReset: true }),
    endIf: END_IF,
    phases: {
      setup: {
        start: startPhase === "setup",
        moves: { placeSettlement, placeRoad },
        turn: {
          order: {
            first: ({ G }) =>
              G.setupStep >= 2 * G.numPlayers ? 0 : setupOrder(G.numPlayers, G.setupStep),
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
        start: startPhase === "play",
        moves: PLAY_MOVES,
        turn: {
          order: {
            first: () => startPlayOrderPos % Math.max(1, savedG.numPlayers),
            next: ({ ctx }) => (ctx.playOrderPos + 1) % ctx.numPlayers,
          },
          onBegin: RESET_TURN,
        },
      },
    },
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
