"use client";

import { useState } from "react";
import Link from "next/link";
import type { BoardProps } from "boardgame.io/react";
import type { GameState, ResourceKey } from "@/types/game";
import type { Theme } from "@/types/theme";
import {
  PLAYER_COLORS,
  PLAYER_NAMES,
  VICTORY_POINTS_TO_WIN,
  type BuildableKind,
} from "@/game/constants";
import {
  pieceCounts,
  validBanditTiles,
  validCitySpots,
  validRoadSpots,
  validSettlementSpots,
} from "@/game/rules";
import { victoryPoints } from "@/game/scoring";
import HexBoard from "./HexBoard";
import PlayerHand from "./PlayerHand";
import BuildMenu from "./BuildMenu";
import TradePanel from "./TradePanel";
import GameScene3D from "@/three/scene/GameScene3D";

export interface GameBoardProps extends BoardProps<GameState> {
  theme: Theme;
}

export default function GameBoard({ G, ctx, moves, theme }: GameBoardProps) {
  const [buildMode, setBuildMode] = useState<BuildableKind | null>(null);
  const [showTrade, setShowTrade] = useState(false);

  const current = ctx.currentPlayer;
  const inSetup = ctx.phase === "setup";
  const resources = G.players[current].resources;
  const pieces = pieceCounts(G, current);
  const gameover = ctx.gameover as { winner: string } | undefined;

  // ----- what is tappable right now -----
  let highlightVertices: string[] = [];
  let highlightEdges: string[] = [];
  let highlightTiles: number[] = [];
  let instruction = "";

  if (gameover) {
    instruction = "";
  } else if (inSetup) {
    if (G.pendingSetupSettlement === null) {
      highlightVertices = validSettlementSpots(G, current, true);
      instruction = `Place a ${theme.terms.settlement.toLowerCase()}`;
    } else {
      highlightEdges = validRoadSpots(G, current, true);
      instruction = `Place a ${theme.terms.road.toLowerCase()} next to it`;
    }
  } else if (!G.hasRolled) {
    instruction = "Roll the dice";
  } else if (G.mustMoveBandit) {
    highlightTiles = validBanditTiles(G);
    instruction = `Move the ${theme.bandit.label.toLowerCase()} ${theme.bandit.icon}`;
  } else if (buildMode === "road") {
    highlightEdges = validRoadSpots(G, current, false);
    instruction = `Tap an edge to build a ${theme.terms.road.toLowerCase()}`;
  } else if (buildMode === "settlement") {
    highlightVertices = validSettlementSpots(G, current, false);
    instruction = `Tap a corner to build a ${theme.terms.settlement.toLowerCase()}`;
  } else if (buildMode === "city") {
    highlightVertices = validCitySpots(G, current);
    instruction = `Tap a ${theme.terms.settlement.toLowerCase()} to upgrade`;
  }

  const placeable: Record<BuildableKind, boolean> = {
    road: validRoadSpots(G, current, false).length > 0,
    settlement: validSettlementSpots(G, current, false).length > 0,
    city: validCitySpots(G, current).length > 0,
  };

  function onVertexTap(id: string) {
    if (inSetup) {
      moves.placeSettlement(id);
    } else if (buildMode === "settlement") {
      moves.buildSettlement(id);
      setBuildMode(null);
    } else if (buildMode === "city") {
      moves.buildCity(id);
      setBuildMode(null);
    }
  }

  function onEdgeTap(id: string) {
    if (inSetup) {
      moves.placeRoad(id);
    } else if (buildMode === "road") {
      moves.buildRoad(id);
      setBuildMode(null);
    }
  }

  function onTileTap(id: number) {
    if (G.mustMoveBandit) moves.moveBandit(id);
  }

  const lastLog = G.log[G.log.length - 1];

  return (
    <div className="flex h-dvh flex-col bg-slate-950">
      {/* Player strip */}
      <header className="flex items-center gap-1.5 px-2 pb-1 pt-[calc(env(safe-area-inset-top)+8px)]">
        {Object.keys(G.players).map((id) => {
          const active = id === current;
          return (
            <div
              key={id}
              className={`flex flex-1 flex-col items-center rounded-xl border px-1 py-1 ${
                active ? "border-yellow-400 bg-white/10" : "border-white/10 bg-white/5"
              }`}
            >
              <span
                className="text-xs font-bold"
                style={{ color: PLAYER_COLORS[Number(id)] }}
              >
                {PLAYER_NAMES[Number(id)]}
              </span>
              <span className="text-[11px] text-white/70">
                ⭐ {victoryPoints(G, id)} / {VICTORY_POINTS_TO_WIN}
              </span>
            </div>
          );
        })}
        <Link
          href="/"
          className="rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-xs text-white/60"
        >
          Exit
        </Link>
      </header>

      {/* Board */}
      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0 hidden sm:block">
          <GameScene3D board={G.board} theme={theme} lastRoll={G.lastRoll} />
        </div>
        <div className="absolute inset-0 sm:hidden">
          <GameScene3D board={G.board} theme={theme} lastRoll={G.lastRoll} />
        </div>
        <div className="absolute inset-0 opacity-0">
          <HexBoard
            board={G.board}
            theme={theme}
            buildings={G.buildings}
            roads={G.roads}
            banditTile={G.banditTile}
            highlightVertices={highlightVertices}
            highlightEdges={highlightEdges}
            highlightTiles={highlightTiles}
            onVertexTap={onVertexTap}
            onEdgeTap={onEdgeTap}
            onTileTap={onTileTap}
            className="h-full w-full"
          />
        </div>
        {instruction && (
          <div className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-yellow-300 backdrop-blur">
            {instruction}
          </div>
        )}
        {lastLog && (
          <div className="pointer-events-none absolute bottom-2 left-2 max-w-[70%] rounded-lg bg-black/50 px-2 py-1 text-[11px] text-white/80 backdrop-blur">
            {lastLog}
          </div>
        )}
      </div>

      {/* Bottom drawer */}
      <div className="rounded-t-2xl border-t border-white/10 bg-slate-900 px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-3">
        <div className="mb-2 flex items-center justify-between">
          <span
            className="text-sm font-bold"
            style={{ color: PLAYER_COLORS[Number(current)] }}
          >
            {PLAYER_NAMES[Number(current)]}&rsquo;s turn
          </span>
          {G.lastRoll && (
            <span className="rounded-lg bg-white/10 px-2 py-0.5 text-sm font-bold text-white">
              🎲 {G.lastRoll[0]} + {G.lastRoll[1]} = {G.lastRoll[0] + G.lastRoll[1]}
            </span>
          )}
        </div>

        <PlayerHand resources={resources} theme={theme} />

        {!inSetup && (
          <>
            <div className="mt-2">
              <BuildMenu
                theme={theme}
                resources={resources}
                pieces={pieces}
                placeable={placeable}
                activeMode={buildMode}
                onPick={(kind) => setBuildMode(kind)}
              />
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              <button
                disabled={G.hasRolled || !!gameover}
                onClick={() => moves.rollDice()}
                className="rounded-xl bg-yellow-500 py-3 text-sm font-bold text-slate-900 disabled:opacity-30"
              >
                🎲 Roll
              </button>
              <button
                disabled={!G.hasRolled || G.mustMoveBandit || !!gameover}
                onClick={() => setShowTrade(true)}
                className="rounded-xl bg-white/10 py-3 text-sm font-bold text-white disabled:opacity-30"
              >
                Trade
              </button>
              <button
                disabled={!G.hasRolled || G.mustMoveBandit || !!gameover}
                onClick={() => {
                  setBuildMode(null);
                  moves.endTurn();
                }}
                className="rounded-xl bg-white/10 py-3 text-sm font-bold text-white disabled:opacity-30"
              >
                End turn
              </button>
            </div>
          </>
        )}
      </div>

      {showTrade && (
        <TradePanel
          theme={theme}
          resources={resources}
          onTrade={(give: ResourceKey, receive: ResourceKey) => moves.bankTrade(give, receive)}
          onClose={() => setShowTrade(false)}
        />
      )}

      {gameover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 p-6 text-center">
            <p className="text-4xl">🏆</p>
            <h2 className="mt-2 text-xl font-bold text-white">
              <span style={{ color: PLAYER_COLORS[Number(gameover.winner)] }}>
                {PLAYER_NAMES[Number(gameover.winner)]}
              </span>{" "}
              wins!
            </h2>
            <p className="mt-1 text-sm text-white/60">
              First to {VICTORY_POINTS_TO_WIN} victory points.
            </p>
            <Link
              href="/new"
              className="mt-4 block w-full rounded-xl bg-yellow-500 py-3 font-bold text-slate-900"
            >
              Play again
            </Link>
            <Link href="/" className="mt-2 block text-sm text-white/60">
              Back home
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
