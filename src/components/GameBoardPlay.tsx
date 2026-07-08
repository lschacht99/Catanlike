// @ts-nocheck
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { BoardProps } from "boardgame.io/react";
import type {
  GameState,
  GameVariant,
  PlayerMode,
  ProgressCardType,
  ProgressTrackKey,
  ResourceKey,
} from "@/types/game";
import type { Theme } from "@/types/theme";
import {
  CITIES_KNIGHTS_POINTS_TO_WIN,
  COMMODITY_KEYS_ORDERED,
  PLAYER_COLORS,
  PROGRESS_CARD_LABELS,
  TOKEN_PIPS,
  TRACK_COMMODITY,
  TRACK_KEYS_ORDERED,
  VICTORY_POINTS_TO_WIN,
  type BuildableKind,
} from "@/game/constants";
import {
  canAfford,
  getGeometry,
  pieceCounts,
  validBanditTiles,
  validCitySpots,
  validKnightSpots,
  validRoadSpots,
  validSettlementSpots,
} from "@/game/rules";
import { victoryPoints } from "@/game/scoring";
import { evaluateBotTrade } from "@/game/trade-ai";
import { loadGameConfig } from "@/lib/storage";
import { BOT_DIFFICULTY_LABELS, canLocalDeviceControlSeat, isBotSeat, normalizePlayerSetups } from "@/game/player-control";
import { saveSnapshot } from "@/lib/save-game";
import HexBoardPlay from "./HexBoardPlay";
import PlayerHand from "./PlayerHand";
import BuildMenu from "./BuildMenu";
import TradePanel from "./TradePanel";

export interface GameBoardPlayProps extends BoardProps<GameState> {
  theme: Theme;
  playerModes?: PlayerMode[];
  variant?: GameVariant;
}

type ExtendedMoves = BoardProps<GameState>["moves"] & {
  buildKnight?: (vertexId: string) => void;
  activateKnight?: (vertexId?: string) => void;
  improveCity?: (track: ProgressTrackKey) => void;
  playProgressCard?: (card: ProgressCardType) => void;
  playerTrade?: (
    targetPlayer: string,
    give: ResourceKey,
    giveAmount: number,
    receive: ResourceKey,
    receiveAmount: number,
  ) => void;
};

type PendingAction = { title: string; body: string; run: () => void };

export default function GameBoardPlay({
  G,
  ctx,
  moves,
  theme,
  playerModes = [],
  variant = "base",
}: GameBoardPlayProps) {
  const [buildMode, setBuildMode] = useState<BuildableKind | null>(null);
  const [showTrade, setShowTrade] = useState(false);
  const [diceFlash, setDiceFlash] = useState<[number, number] | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [privacyGate, setPrivacyGate] = useState(true);
  const [tradeNotice, setTradeNotice] = useState<string | null>(null);

  const current = ctx.currentPlayer;
  const inSetup = ctx.phase === "setup";
  const resources = G.players[current].resources;
  const pieces = pieceCounts(G, current);
  const gameover = ctx.gameover as { winner: string } | undefined;
  const playerSetups = normalizePlayerSetups(G.numPlayers, G.playerSetups, playerModes);
  const currentIsCpu = isBotSeat(G, current);
  const currentIsRemote = playerSetups[Number(current)]?.mode === "remote";
  const canControlCurrent = canLocalDeviceControlSeat(G, current);
  const boardMoves = moves as ExtendedMoves;
  const names = G.playerNames ?? G.names ?? [];
  const player = G.players[current];
  const commodities = player.commodities ?? { coin: 0, cloth: 0, book: 0 };
  const improvements = player.improvements ?? { trade: 0, politics: 0, science: 0 };
  const progressCards = player.progressCards ?? [];
  const activeKnights = G.activeKnights ?? {};
  const targetPoints = variant === "cities-knights" ? CITIES_KNIGHTS_POINTS_TO_WIN : VICTORY_POINTS_TO_WIN;
  const ownInactiveKnight = Object.entries(G.knights ?? {}).find(([id, owner]) => owner === current && !activeKnights[id])?.[0];
  const hasCity = Object.values(G.buildings).some((b) => b.player === current && b.city);

  function ask(title: string, body: string, run: () => void) {
    if (currentIsCpu) {
      run();
      return;
    }
    setPendingAction({ title, body, run });
  }

  useEffect(() => {
    const config = loadGameConfig();
    if (config) saveSnapshot({ config, state: { G, ctx: { currentPlayer: ctx.currentPlayer, phase: ctx.phase, turn: ctx.turn, playOrder: ctx.playOrder, playOrderPos: ctx.playOrderPos } } });
  }, [G, ctx.currentPlayer, ctx.phase, ctx.turn, ctx.playOrder, ctx.playOrderPos]);

  useEffect(() => { setPrivacyGate(canControlCurrent); }, [canControlCurrent, current]);

  useEffect(() => {
    if (!G.lastRoll) return;
    setDiceFlash(G.lastRoll);
    const timer = window.setTimeout(() => setDiceFlash(null), 1200);
    return () => window.clearTimeout(timer);
  }, [G.lastRoll]);

  let highlightVertices: string[] = [];
  let highlightEdges: string[] = [];
  let highlightTiles: number[] = [];
  let instruction = "";

  if (gameover) instruction = "";
  else if (currentIsCpu) instruction = `${names[Number(current)]} is thinking…`;
  else if (inSetup) {
    if (G.pendingSetupSettlement === null) {
      highlightVertices = validSettlementSpots(G, current, true);
      instruction = `Place a ${theme.terms.settlement.toLowerCase()}`;
    } else {
      highlightEdges = validRoadSpots(G, current, true);
      instruction = `Place a ${theme.terms.road.toLowerCase()} next to it`;
    }
  } else if (!G.hasRolled) instruction = "Roll the dice";
  else if (G.mustMoveBandit) {
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
  } else if (buildMode === "knight") {
    highlightVertices = validKnightSpots(G, current);
    instruction = `Tap your built spot to train a ${theme.terms.knight.toLowerCase()}`;
  }

  const placeable: Record<BuildableKind, boolean> = {
    road: validRoadSpots(G, current, false).length > 0,
    settlement: validSettlementSpots(G, current, false).length > 0,
    city: validCitySpots(G, current).length > 0,
    knight: validKnightSpots(G, current).length > 0,
  };

  useEffect(() => {
    if (!currentIsCpu || gameover) return;
    const timer = window.setTimeout(() => {
      if (ctx.phase === "setup") {
        if (G.pendingSetupSettlement === null) {
          const spot = pickBestSettlement(G, validSettlementSpots(G, current, true));
          if (spot) moves.placeSettlement(spot);
        } else {
          const road = pickBestRoad(G, current, validRoadSpots(G, current, true));
          if (road) moves.placeRoad(road);
        }
        return;
      }
      if (!G.hasRolled) {
        moves.rollDice();
        return;
      }
      if (G.mustMoveBandit) {
        const tile = pickBestBanditTile(G, current, validBanditTiles(G));
        if (tile !== null) moves.moveBandit(tile);
        return;
      }
      const hand = G.players[current].resources;
      const cpuCards = G.players[current].progressCards ?? [];
      if (variant === "cities-knights" && cpuCards[0] && boardMoves.playProgressCard) {
        boardMoves.playProgressCard(cpuCards[0]);
        return;
      }
      const inactive = Object.entries(G.knights ?? {}).find(([id, owner]) => owner === current && !G.activeKnights?.[id])?.[0];
      if (variant === "cities-knights" && inactive && hand.grain > 0 && boardMoves.activateKnight) {
        boardMoves.activateKnight(inactive);
        return;
      }
      const city = pickBestCity(G, validCitySpots(G, current));
      if (city && canAfford(hand, "city")) {
        moves.buildCity(city);
        return;
      }
      const settlement = pickBestSettlement(G, validSettlementSpots(G, current, false));
      if (settlement && canAfford(hand, "settlement")) {
        moves.buildSettlement(settlement);
        return;
      }
      const knight = pickBestCity(G, validKnightSpots(G, current));
      if (variant === "cities-knights" && knight && canAfford(hand, "knight") && boardMoves.buildKnight) {
        boardMoves.buildKnight(knight);
        return;
      }
      const road = pickBestRoad(G, current, validRoadSpots(G, current, false));
      if (road && canAfford(hand, "road")) {
        moves.buildRoad(road);
        return;
      }
      moves.endTurn();
    }, inSetup ? 420 : 650);
    return () => window.clearTimeout(timer);
  }, [G, boardMoves, ctx.phase, current, currentIsCpu, gameover, inSetup, moves, variant]);

  function onVertexTap(id: string) {
    if (currentIsCpu || currentIsRemote || privacyGate) return;
    if (inSetup) ask("Confirm settlement", "Place your settlement on this corner.", () => moves.placeSettlement(id));
    else if (buildMode === "settlement") {
      ask("Build settlement", "Spend wood, brick, grain, and wool.", () => moves.buildSettlement(id));
      setBuildMode(null);
    } else if (buildMode === "city") {
      ask("Upgrade city", "Spend 2 grain and 3 ore to upgrade this settlement.", () => moves.buildCity(id));
      setBuildMode(null);
    } else if (buildMode === "knight" && boardMoves.buildKnight) {
      ask("Train knight", "Spend grain, wool, and ore. New knights begin inactive.", () => boardMoves.buildKnight?.(id));
      setBuildMode(null);
    }
  }

  function onEdgeTap(id: string) {
    if (currentIsCpu || currentIsRemote || privacyGate) return;
    if (inSetup) ask("Confirm route", "Place your starting route next to the settlement.", () => moves.placeRoad(id));
    else if (buildMode === "road") {
      ask("Build route", "Spend 1 wood and 1 brick.", () => moves.buildRoad(id));
      setBuildMode(null);
    }
  }

  function onTileTap(id: number) {
    if (currentIsCpu || currentIsRemote || privacyGate) return;
    if (G.mustMoveBandit) ask("Move bandit", "Move the bandit to this tile and steal if possible.", () => moves.moveBandit(id));
  }

  const lastLog = G.log[G.log.length - 1];
  const variantLabel = variant === "cities-knights" ? "Cities & Knights" : "Base game";

  return (
    <div className="game-shell flex h-dvh flex-col overflow-hidden bg-slate-950">
      <div className="ambient-orb ambient-orb-a" />
      <div className="ambient-orb ambient-orb-b" />

      {diceFlash && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
          <div className="dice-popup rounded-3xl border border-white/15 bg-slate-950/90 px-7 py-6 text-center shadow-2xl backdrop-blur">
            <div className="flex gap-3 text-5xl">
              <span className="dice-face">{diceFlash[0]}</span>
              <span className="dice-face">{diceFlash[1]}</span>
            </div>
            <p className="mt-3 text-sm font-bold text-yellow-300">Rolled {diceFlash[0] + diceFlash[1]}</p>
            {variant === "cities-knights" && G.lastEventDie && <p className="mt-1 text-xs text-white/60">Event: {G.lastEventDie}</p>}
          </div>
        </div>
      )}

      <header className="relative z-10 shrink-0 px-2 pb-1 pt-[calc(env(safe-area-inset-top)+8px)]">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {Object.keys(G.players).map((id) => {
            const active = id === current;
            const setup = playerSetups[Number(id)] ?? { mode: "human" };
            const mode = setup.mode === "bot" ? `Bot ${BOT_DIFFICULTY_LABELS[setup.botDifficulty ?? "normal"]}` : setup.mode === "remote" ? "Remote" : "Local";
            return (
              <div key={id} className={`min-w-[6rem] flex-1 rounded-xl border px-2 py-1.5 ${active ? "border-yellow-400 bg-white/15 shadow-[0_0_24px_rgba(250,204,21,0.2)]" : "border-white/10 bg-white/5"}`}>
                <div className="flex items-center justify-between gap-1">
                  <span className="truncate text-xs font-black" style={{ color: PLAYER_COLORS[Number(id)] }}>{names[Number(id)]}</span>
                  <span className="rounded-full bg-black/25 px-1.5 py-0.5 text-[9px] uppercase text-white/55">{mode}</span>
                </div>
                <span className="block text-[11px] text-white/70">⭐ {victoryPoints(G, id)} / {targetPoints}</span>
              </div>
            );
          })}
          <Link href="/" className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-xs text-white/70">Exit</Link>
        </div>
        <div className="mt-1 flex items-center justify-between gap-2 px-1 text-[10px] uppercase tracking-[0.2em] text-white/35">
          <span>{theme.name}</span>
          <span>{variantLabel}</span>
        </div>
      </header>

      <div className="relative z-10 min-h-0 flex-1 p-2 sm:p-3">
        <div className="board-card relative h-full overflow-hidden rounded-[1.6rem] border border-white/10 bg-black/20 shadow-2xl">
          <HexBoardPlay board={G.board} theme={theme} buildings={G.buildings} roads={G.roads} knights={G.knights} banditTile={G.banditTile} highlightVertices={highlightVertices} highlightEdges={highlightEdges} highlightTiles={highlightTiles} onVertexTap={onVertexTap} onEdgeTap={onEdgeTap} onTileTap={onTileTap} className="h-full w-full" />
          {instruction && <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-black/65 px-3 py-1.5 text-center text-xs font-semibold text-yellow-300 shadow-lg backdrop-blur">{instruction}</div>}
          {lastLog && <div className="pointer-events-none absolute bottom-3 left-3 max-w-[82%] rounded-xl bg-black/55 px-3 py-1.5 text-[11px] text-white/85 shadow-lg backdrop-blur">{lastLog}</div>}
        </div>
      </div>

      <div className="relative z-10 shrink-0 rounded-t-3xl border-t border-white/10 bg-slate-900/95 px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-3 shadow-[0_-18px_60px_rgba(0,0,0,0.45)] backdrop-blur">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-black" style={{ color: PLAYER_COLORS[Number(current)] }}>{names[Number(current)]}&rsquo;s turn</span>
          {G.lastRoll && <span className="rounded-lg bg-white/10 px-2 py-0.5 text-sm font-bold text-white">🎲 {G.lastRoll[0]} + {G.lastRoll[1]} = {G.lastRoll[0] + G.lastRoll[1]}</span>}
        </div>

        {variant === "cities-knights" && (
          <div className="mb-2 rounded-xl border border-white/10 bg-white/5 p-2 text-xs text-white/70">
            <div className="flex items-center justify-between gap-2">
              <span>Raiders: {G.barbarianPosition ?? 0}/7</span>
              <span>Event: {G.lastEventDie ?? "—"}</span>
              <span>Cards: {progressCards.length}</span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1 text-center">
              {COMMODITY_KEYS_ORDERED.map((key) => <span key={key} className="rounded-lg bg-black/20 px-1 py-1">{key}: {commodities[key]}</span>)}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1 text-center">
              {TRACK_KEYS_ORDERED.map((track) => <span key={track} className="rounded-lg bg-black/20 px-1 py-1">{track}: {improvements[track]}</span>)}
            </div>
          </div>
        )}

        <PlayerHand resources={resources} theme={theme} />

        {!inSetup && (
          <>
            <div className="mt-2"><BuildMenu theme={theme} resources={resources} pieces={pieces} placeable={placeable} activeMode={buildMode} onPick={(kind) => setBuildMode(kind)} includeKnights={variant === "cities-knights"} /></div>
            {variant === "cities-knights" && (
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                <button disabled={privacyGate || !canControlCurrent || currentIsCpu || !G.hasRolled || !ownInactiveKnight || resources.grain < 1 || !!gameover} onClick={() => ask("Activate knight", "Spend 1 grain. Active knights defend against raiders.", () => boardMoves.activateKnight?.(ownInactiveKnight))} className="rounded-xl bg-white/10 py-2 text-xs font-bold text-white disabled:opacity-30">Activate knight</button>
                {TRACK_KEYS_ORDERED.map((track) => {
                  const cost = (improvements[track] ?? 0) + 1;
                  const commodity = TRACK_COMMODITY[track];
                  return <button key={track} disabled={privacyGate || !canControlCurrent || currentIsCpu || !G.hasRolled || !hasCity || improvements[track] >= 3 || commodities[commodity] < cost || !!gameover} onClick={() => ask("Improve city", `Spend ${cost} ${commodity} to improve ${track}.`, () => boardMoves.improveCity?.(track))} className="rounded-xl bg-white/10 py-2 text-xs font-bold text-white disabled:opacity-30">+ {track}</button>;
                })}
                {progressCards.slice(0, 2).map((card) => <button key={card} disabled={privacyGate || !canControlCurrent || currentIsCpu || !G.hasRolled || !!gameover} onClick={() => ask("Play progress card", `Play ${PROGRESS_CARD_LABELS[card]}.`, () => boardMoves.playProgressCard?.(card))} className="rounded-xl bg-yellow-500/90 py-2 text-xs font-black text-slate-900 disabled:opacity-30">{PROGRESS_CARD_LABELS[card]}</button>)}
              </div>
            )}
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              <button disabled={privacyGate || !canControlCurrent || currentIsCpu || G.hasRolled || !!gameover} onClick={() => ask("Roll dice", variant === "cities-knights" ? "Roll production dice and the event die." : "Roll production dice.", () => moves.rollDice())} className="rounded-xl bg-yellow-500 py-3 text-sm font-black text-slate-900 disabled:opacity-30">🎲 Roll</button>
              <button disabled={privacyGate || !canControlCurrent || currentIsCpu || !G.hasRolled || G.mustMoveBandit || !!gameover} onClick={() => setShowTrade(true)} className="rounded-xl bg-white/10 py-3 text-sm font-bold text-white disabled:opacity-30">Trade</button>
              <button disabled={privacyGate || !canControlCurrent || currentIsCpu || !G.hasRolled || G.mustMoveBandit || !!gameover} onClick={() => ask("End turn", "Pass the turn to the next player.", () => { setBuildMode(null); moves.endTurn(); })} className="rounded-xl bg-white/10 py-3 text-sm font-bold text-white disabled:opacity-30">End turn</button>
            </div>
          </>
        )}
      </div>

      {showTrade && (
        <TradePanel
          theme={theme}
          resources={resources}
          players={G.players}
          currentPlayer={current}
          playerNames={names}
          playerModes={playerModes}
          onTrade={(give, receive) => { setShowTrade(false); ask("Confirm bank trade", `Trade 4 ${give} for 1 ${receive}.`, () => moves.bankTrade(give, receive)); }}
          onPlayerTrade={(target, give, giveAmount, receive, receiveAmount) => {
            setShowTrade(false);
            const offer = { proposer: current, target, give, giveAmount, receive, receiveAmount };
            if (isBotSeat(G, target)) {
              const decision = evaluateBotTrade(G, offer);
              setTradeNotice(decision.reason);
              if (decision.accepted) boardMoves.playerTrade?.(target, give, giveAmount, receive, receiveAmount);
              return;
            }
            setPendingAction({
              title: `Pass to ${names[Number(target)]}`,
              body: `${names[Number(current)]} offers ${giveAmount} ${give} for ${receiveAmount} ${receive}. Only ${names[Number(target)]} should accept or refuse.`,
              run: () => setPendingAction({ title: "Accept trade?", body: "Review the public offer. Your exact resources remain private until you choose.", run: () => boardMoves.playerTrade?.(target, give, giveAmount, receive, receiveAmount) }),
            });
          }}
          onClose={() => setShowTrade(false)}
        />
      )}

      {pendingAction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-5">
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-slate-900 p-5 text-white shadow-2xl">
            <h2 className="text-lg font-black">{pendingAction.title}</h2>
            <p className="mt-2 text-sm leading-6 text-white/65">{pendingAction.body}</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button onClick={() => setPendingAction(null)} className="rounded-xl bg-white/10 py-3 text-sm font-bold text-white">Cancel</button>
              <button onClick={() => { const run = pendingAction.run; setPendingAction(null); run(); }} className="rounded-xl bg-yellow-500 py-3 text-sm font-black text-slate-900">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {currentIsRemote && !gameover && (
        <div className="fixed inset-x-4 bottom-28 z-[65] rounded-2xl border border-sky-300/30 bg-sky-950/90 p-3 text-center text-sm font-bold text-sky-100 shadow-2xl">
          Remote seat reserved for {names[Number(current)]}. Only that remote player can act for this seat online.
        </div>
      )}

      {privacyGate && !gameover && canControlCurrent && !currentIsCpu && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950 p-6 text-center text-white">
          <div className="max-w-sm rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl">
            <p className="text-4xl">🔒</p>
            <h2 className="mt-3 text-xl font-black">Pass device to {names[Number(current)]}</h2>
            <p className="mt-2 text-sm leading-6 text-white/65">Private resources and cards are hidden between turns. Tap only when this player is ready.</p>
            <button onClick={() => setPrivacyGate(false)} className="mt-5 w-full rounded-xl bg-yellow-500 py-3 font-black text-slate-900">Show my turn</button>
          </div>
        </div>
      )}

      {tradeNotice && (
        <div className="fixed inset-x-4 top-16 z-[65] rounded-2xl bg-slate-900 p-3 text-center text-sm font-bold text-white shadow-2xl" onClick={() => setTradeNotice(null)}>{tradeNotice}</div>
      )}

      {gameover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 p-6 text-center">
            <p className="text-4xl">🏆</p>
            <h2 className="mt-2 text-xl font-bold text-white"><span style={{ color: PLAYER_COLORS[Number(gameover.winner)] }}>{names[Number(gameover.winner)]}</span> wins</h2>
            <p className="mt-1 text-sm text-white/60">First to {targetPoints} victory points.</p>
            <Link href="/studio" className="mt-4 block w-full rounded-xl bg-yellow-500 py-3 font-bold text-slate-900">Play again</Link>
            <Link href="/" className="mt-2 block text-sm text-white/60">Back home</Link>
          </div>
        </div>
      )}
    </div>
  );
}

function tokenWeight(token: number | null): number { return token ? TOKEN_PIPS[token] ?? 0 : 0; }
function vertexScore(G: GameState, vertexId: string): number {
  const geo = getGeometry(G.board);
  const resources = new Set<string>();
  let score = 0;
  for (const tileId of geo.vertices[vertexId].tiles) {
    const tile = G.board.tiles[tileId];
    if (!tile || tile.resource === "desert") continue;
    resources.add(tile.resource);
    score += tokenWeight(tile.token) * 2;
  }
  return score + resources.size * 1.8;
}
function pickBestSettlement(G: GameState, spots: string[]): string | null { return spots.length === 0 ? null : [...spots].sort((a, b) => vertexScore(G, b) - vertexScore(G, a))[0]; }
function pickBestRoad(G: GameState, player: string, spots: string[]): string | null {
  if (spots.length === 0) return null;
  const geo = getGeometry(G.board);
  return [...spots].sort((a, b) => {
    const edgeA = geo.edges[a]; const edgeB = geo.edges[b];
    const scoreA = Math.max(vertexScore(G, edgeA.a), vertexScore(G, edgeA.b));
    const scoreB = Math.max(vertexScore(G, edgeB.a), vertexScore(G, edgeB.b));
    const ownA = Number(G.buildings[edgeA.a]?.player === player || G.buildings[edgeA.b]?.player === player);
    const ownB = Number(G.buildings[edgeB.a]?.player === player || G.buildings[edgeB.b]?.player === player);
    return scoreB + ownB - (scoreA + ownA);
  })[0];
}
function pickBestCity(G: GameState, spots: string[]): string | null { return spots.length === 0 ? null : [...spots].sort((a, b) => vertexScore(G, b) - vertexScore(G, a))[0]; }
function pickBestBanditTile(G: GameState, player: string, tileIds: number[]): number | null {
  if (tileIds.length === 0) return null;
  const geo = getGeometry(G.board);
  return [...tileIds].sort((a, b) => banditScore(G, geo, player, b) - banditScore(G, geo, player, a))[0];
}
function banditScore(G: GameState, geo: ReturnType<typeof getGeometry>, player: string, tileId: number): number {
  const tile = G.board.tiles[tileId];
  let score = tokenWeight(tile?.token ?? null);
  for (const vertex of Object.values(geo.vertices)) {
    if (!vertex.tiles.includes(tileId)) continue;
    const building = G.buildings[vertex.id];
    if (!building) continue;
    score += building.player === player ? -4 : 6;
  }
  return score;
}
