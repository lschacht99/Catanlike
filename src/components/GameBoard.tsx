"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { BoardProps } from "boardgame.io/react";
import type { GameState, ResourceKey } from "@/types/game";
import type { Theme } from "@/types/theme";
import {
  PLAYER_COLORS,
  VICTORY_POINTS_TO_WIN,
  type BuildableKind,
} from "@/game/constants";
import {
  validBanditTiles,
  validCitySpots,
  validRoadSpots,
  validSettlementSpots,
} from "@/game/rules";
import { longestRoadLength, publicPoints, victoryPoints } from "@/game/scoring";
import { recordResult } from "@/lib/profile";
import HexBoard from "./HexBoard";
import PlayerHand from "./PlayerHand";
import BuildSheet from "./BuildMenu";
import DevCardsSheet from "./DevCards";
import TradePanel from "./TradePanel";
import RollResult from "./RollResult";

export interface GameBoardProps extends BoardProps<GameState> {
  theme: Theme;
}

type SheetKind = "build" | "cards" | "trade" | null;

export default function GameBoard({
  G,
  ctx,
  moves,
  theme,
  playerID,
  isActive,
  matchData,
}: GameBoardProps) {
  const [buildMode, setBuildMode] = useState<BuildableKind | null>(null);
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [rollSeenTurn, setRollSeenTurn] = useState(0);
  const recorded = useRef(false);

  const current = ctx.currentPlayer;
  const online = playerID !== null && playerID !== undefined;
  /** Whose hand & cards this client sees. */
  const viewer = online ? playerID! : current;
  const canAct = isActive && !ctx.gameover;
  const inSetup = ctx.phase === "setup";
  const resources = G.players[viewer].resources;
  const gameover = ctx.gameover as { winner: string } | undefined;

  const displayName = (id: string) =>
    matchData?.[Number(id)]?.name ?? G.names[Number(id)] ?? `Player ${Number(id) + 1}`;

  // Persist finished games into local stats, once.
  useEffect(() => {
    if (!gameover || recorded.current) return;
    recorded.current = true;
    recordResult({
      date: Date.now(),
      winner: displayName(gameover.winner),
      points: victoryPoints(G, gameover.winner),
      longestRoad: longestRoadLength(G, gameover.winner),
      largestArmy: G.players[gameover.winner].knightsPlayed,
      players: Object.keys(G.players).map(displayName),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameover]);

  // ----- what is tappable right now -----
  let highlightVertices: string[] = [];
  let highlightEdges: string[] = [];
  let highlightTiles: number[] = [];
  let instruction = "";

  const showRollResult =
    !inSetup && G.lastRoll !== null && rollSeenTurn !== ctx.turn && !gameover;

  if (gameover) {
    instruction = "";
  } else if (!canAct) {
    instruction = `Waiting for ${displayName(current)}…`;
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
  } else if (G.freeRoads > 0 && buildMode !== "road") {
    instruction = `${G.freeRoads} free ${theme.terms.road.toLowerCase()}${G.freeRoads > 1 ? "s" : ""} — open Build`;
  } else if (buildMode === "road") {
    highlightEdges = validRoadSpots(G, current, false);
    instruction = `Tap an edge for a ${theme.terms.road.toLowerCase()}`;
  } else if (buildMode === "settlement") {
    highlightVertices = validSettlementSpots(G, current, false);
    instruction = `Tap a corner for a ${theme.terms.settlement.toLowerCase()}`;
  } else if (buildMode === "city") {
    highlightVertices = validCitySpots(G, current);
    instruction = `Tap a ${theme.terms.settlement.toLowerCase()} to upgrade`;
  }

  const placeable: Record<BuildableKind, boolean> = canAct && !inSetup
    ? {
        road: validRoadSpots(G, current, false).length > 0,
        settlement: validSettlementSpots(G, current, false).length > 0,
        city: validCitySpots(G, current).length > 0,
      }
    : { road: false, settlement: false, city: false };

  function onVertexTap(id: string) {
    if (!canAct) return;
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
    if (!canAct) return;
    if (inSetup) {
      moves.placeRoad(id);
    } else if (buildMode === "road") {
      moves.buildRoad(id);
      if (G.freeRoads <= 1) setBuildMode(null);
    }
  }

  function onTileTap(id: number) {
    if (canAct && G.mustMoveBandit) moves.moveBandit(id);
  }

  const lastLog = G.log[G.log.length - 1];
  const others = Object.keys(G.players).filter((id) => id !== viewer);
  const readyToAct = canAct && !inSetup && G.hasRolled && !G.mustMoveBandit;

  return (
    <div className="flex h-dvh flex-col bg-sand">
      {/* Header */}
      <header className="flex items-center gap-2 px-3 pb-2 pt-[calc(env(safe-area-inset-top)+10px)]">
        <Link
          href="/"
          aria-label="Exit game"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-cream text-ink shadow-card"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M10 3 5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <div className="flex-1 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-ink">
            {inSetup ? "Setup" : `Turn ${ctx.turn}`}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-rust">
            {gameover
              ? "Journey complete"
              : canAct
                ? online
                  ? "⟡ Your turn ⟡"
                  : `⟡ ${displayName(current)} ⟡`
                : `${displayName(current)}'s turn`}
          </p>
        </div>
        <button
          onClick={() => setSheet("cards")}
          aria-label="Journey cards"
          className="relative flex h-9 w-9 items-center justify-center rounded-full border border-line bg-cream text-base shadow-card"
        >
          🃏
          {G.players[viewer].devCards.length > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rust text-[9px] font-bold text-cream">
              {G.players[viewer].devCards.length}
            </span>
          )}
        </button>
      </header>

      {/* Board */}
      <div className="relative min-h-0 flex-1 px-2">
        <div className="h-full overflow-hidden rounded-2xl border border-line shadow-card">
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
            tilt
            className="h-full w-full"
          />
        </div>
        {instruction && (
          <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 whitespace-nowrap rounded-full border border-line bg-cream/95 px-4 py-1.5 text-xs font-bold text-rust shadow-card">
            {instruction}
          </div>
        )}
        {lastLog && (
          <div className="pointer-events-none absolute bottom-3 left-4 max-w-[70%] rounded-full bg-ink/70 px-3 py-1 text-[10px] text-cream backdrop-blur">
            {lastLog}
          </div>
        )}
      </div>

      {/* Bottom panel */}
      <div className="px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2">
        <PlayerHand resources={resources} theme={theme} />

        {/* You + opponents */}
        <div className="mt-2 flex items-center gap-1.5 overflow-x-auto">
          <div
            className={`flex shrink-0 items-center gap-2 rounded-full border bg-cream py-1 pl-1 pr-3 shadow-card ${
              current === viewer ? "border-rust" : "border-line"
            }`}
          >
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-cream"
              style={{ background: PLAYER_COLORS[Number(viewer)] }}
            >
              {displayName(viewer)[0]?.toUpperCase()}
            </span>
            <span className="text-xs font-bold text-ink">
              {online ? "You" : displayName(viewer)}
            </span>
            <span className="text-[11px] text-ink-soft">
              ⭐ {victoryPoints(G, viewer)}/{VICTORY_POINTS_TO_WIN}
              {G.players[viewer].knightsPlayed > 0 && ` · 🛡️ ${G.players[viewer].knightsPlayed}`}
            </span>
          </div>
          {others.map((id) => (
            <div
              key={id}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border bg-cream py-1 pl-1 pr-2.5 shadow-card ${
                current === id ? "border-rust" : "border-line"
              }`}
            >
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-cream"
                style={{ background: PLAYER_COLORS[Number(id)] }}
              >
                {displayName(id)[0]?.toUpperCase()}
              </span>
              <span className="text-[11px] font-semibold text-ink">{displayName(id)}</span>
              <span className="text-[10px] text-ink-soft">⭐{publicPoints(G, id)}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        {!inSetup && (
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {!G.hasRolled ? (
              <button
                disabled={!canAct || !!gameover}
                onClick={() => moves.rollDice()}
                className="rounded-full bg-ink py-3 text-xs font-bold uppercase tracking-widest text-cream shadow-card disabled:opacity-40"
              >
                🎲 Roll
              </button>
            ) : (
              <button
                disabled={!readyToAct}
                onClick={() => {
                  setBuildMode(null);
                  moves.endTurn();
                }}
                className="rounded-full bg-ink py-3 text-xs font-bold uppercase tracking-widest text-cream shadow-card disabled:opacity-40"
              >
                End
              </button>
            )}
            <button
              disabled={!readyToAct}
              onClick={() => setSheet("build")}
              className="rounded-full border border-ink/25 bg-cream py-3 text-xs font-bold uppercase tracking-widest text-ink shadow-card disabled:opacity-40"
            >
              Build
            </button>
            <button
              disabled={!readyToAct}
              onClick={() => setSheet("trade")}
              className="rounded-full border border-ink/25 bg-cream py-3 text-xs font-bold uppercase tracking-widest text-ink shadow-card disabled:opacity-40"
            >
              Trade
            </button>
            <button
              onClick={() => setSheet("cards")}
              className="rounded-full border border-ink/25 bg-cream py-3 text-xs font-bold uppercase tracking-widest text-ink shadow-card"
            >
              Cards
            </button>
          </div>
        )}
      </div>

      {/* Sheets & overlays */}
      {sheet === "build" && (
        <BuildSheet
          G={G}
          player={viewer}
          theme={theme}
          placeable={placeable}
          onPick={(kind) => {
            setBuildMode(kind);
            setSheet(null);
          }}
          onBuyDevCard={() => {
            moves.buyDevCard();
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === "cards" && (
        <DevCardsSheet
          G={G}
          player={viewer}
          theme={theme}
          turn={ctx.turn}
          canPlay={readyToAct && viewer === current}
          onPlayKnight={() => moves.playKnight()}
          onPlayRoadBuilding={() => {
            moves.playRoadBuilding();
            setBuildMode("road");
          }}
          onPlayYearOfPlenty={(a: ResourceKey, b: ResourceKey) => moves.playYearOfPlenty(a, b)}
          onPlayMonopoly={(r: ResourceKey) => moves.playMonopoly(r)}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === "trade" && (
        <TradePanel
          theme={theme}
          resources={resources}
          onTrade={(give: ResourceKey, receive: ResourceKey) => moves.bankTrade(give, receive)}
          onClose={() => setSheet(null)}
        />
      )}
      {showRollResult && (
        <RollResult
          G={G}
          theme={theme}
          displayName={displayName}
          onContinue={() => setRollSeenTurn(ctx.turn)}
        />
      )}

      {gameover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-6">
          <div className="w-full max-w-sm rounded-3xl border border-line bg-sand p-6 text-center shadow-card">
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-ink-soft">
              Victory!
            </p>
            <p className="mt-3 text-4xl">🏆</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-ink">
              Congratulations
              <br />
              <span style={{ color: PLAYER_COLORS[Number(gameover.winner)] }}>
                {displayName(gameover.winner)}
              </span>{" "}
              wins!
            </h2>
            <div className="mt-4 grid grid-cols-3 divide-x divide-line rounded-2xl border border-line bg-cream py-3">
              <div>
                <p className="text-lg font-bold text-ink">{victoryPoints(G, gameover.winner)}</p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-ink-soft">Points</p>
              </div>
              <div>
                <p className="text-lg font-bold text-ink">{longestRoadLength(G, gameover.winner)}</p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-ink-soft">Longest route</p>
              </div>
              <div>
                <p className="text-lg font-bold text-ink">{G.players[gameover.winner].knightsPlayed}</p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-ink-soft">Knights</p>
              </div>
            </div>
            <Link
              href="/new"
              className="mt-4 block w-full rounded-full bg-ink py-3.5 text-sm font-bold uppercase tracking-[0.2em] text-cream"
            >
              Play again
            </Link>
            <Link href="/" className="mt-3 block text-sm text-ink-soft underline">
              Back home
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
