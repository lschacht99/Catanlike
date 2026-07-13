// @ts-nocheck
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  COMMODITY_ICONS,
  COMMODITY_KEYS_ORDERED,
  COMMODITY_LABELS,
  PLAYER_COLORS,
  PROGRESS_CARD_LABELS,
  totalResources,
  TRACK_COMMODITY,
  TRACK_KEYS_ORDERED,
  VICTORY_POINTS_TO_WIN,
  type BuildableKind,
} from "@/game/constants";
import {
  pieceCounts,
  validBanditTiles,
  validCitySpots,
  validKnightSpots,
  validRoadSpots,
  validSettlementSpots,
} from "@/game/rules";
import { victoryPoints } from "@/game/scoring";
import { chooseBotAction } from "@/game/ai/turn";
import { hasMerchantGuild, maritimeRate, playerHarborTypes } from "@/game/harbors";
import { canResponderPay as canResponderPayFor, isTradeStale, onlineTradeRole, resolveDisplayPlayerId } from "@/game/onlineTrade";
import { loadGameConfig } from "@/lib/storage";
import { BOT_DIFFICULTY_LABELS, canLocalDeviceControlSeat, isBotSeat, normalizePlayerSetups } from "@/game/player-control";
import { saveSnapshot } from "@/lib/save-game";
import { saveGame } from "@/lib/savegame";
import BoardStage from "./BoardStage";
import DiceRoll from "./DiceRoll";
import PlayerHand from "./PlayerHand";
import BuildMenu from "./BuildMenu";
import TradePanel, { type RivalInfo } from "./TradePanel";
import PrivacyOverlay from "./PrivacyOverlay";
import { TradeReview, TradeResultBanner } from "./TradeReview";
import OnlineTradePanel from "./OnlineTradePanel";
import ProgressCardPlay, { cardNeedsChoice } from "./ProgressCardPlay";

export interface GameBoardPlayProps extends BoardProps<GameState> {
  theme: Theme;
  playerModes?: PlayerMode[];
  variant?: GameVariant;
  /**
   * Pass-and-play privacy curtain between local human turns. Defaults on;
   * duo-online turns it off — each phone has exactly one local human, so
   * there is nobody to hide the hand from.
   */
  handoffGate?: boolean;
  /**
   * Seat ids that are bots in a duo-online room. There, EVERY non-local
   * seat is passed as playerModes="remote" (a bot can't be driven by an
   * on-screen client bound to another seat's playerID) — this lets the UI
   * still show "🤖 thinking" instead of the generic reserved-seat banner.
   */
  remoteBotSeats?: string[];
  /**
   * Duo-online: identifies the one specific roll (if any) the caller wants
   * animated on THIS mount — "" or omitted means none. This component
   * always remounts fresh when a synced snapshot arrives (see DuoGame), so
   * without this signal a roll that's simply still on the board from an
   * earlier action would replay its animation on every unrelated remount.
   * Left undefined for local pass-and-play, which never has this problem
   * (the client stays mounted for the whole game) and keeps its original
   * "always animate a set G.lastRoll" behavior unchanged.
   */
  diceAnimKey?: string;
}

type ExtendedMoves = BoardProps<GameState>["moves"] & {
  buildKnight?: (vertexId: string) => void;
  activateKnight?: (vertexId?: string) => void;
  deactivateKnight?: (vertexId?: string) => void;
  upgradeKnight?: (vertexId?: string) => void;
  improveCity?: (track: ProgressTrackKey) => void;
  playProgressCard?: (card: ProgressCardType, choice?: unknown) => void;
  proposeTrade?: (
    targetPlayer: string,
    give: ResourceKey,
    giveAmount: number,
    receive: ResourceKey,
    receiveAmount: number,
  ) => void;
  respondTrade?: (accept: boolean) => void;
  cancelTrade?: () => void;
  clearTradeResult?: () => void;
};

type PendingAction = { title: string; body: string; run: () => void };

export default function GameBoardPlay({
  G,
  ctx,
  moves,
  theme,
  playerModes = [],
  variant = "base",
  handoffGate = true,
  remoteBotSeats = [],
  diceAnimKey,
}: GameBoardPlayProps) {
  const [buildMode, setBuildMode] = useState<BuildableKind | null>(null);
  const [showTrade, setShowTrade] = useState(false);
  const [diceFlash, setDiceFlash] = useState<[number, number] | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [privacyGate, setPrivacyGate] = useState(handoffGate);
  const [tradeNotice, setTradeNotice] = useState<string | null>(null);
  // A progress card awaiting its interactive choice (resources/commodities/target).
  const [cardToPlay, setCardToPlay] = useState<ProgressCardType | null>(null);
  // Whether the addressed human has passed the privacy curtain to review an offer.
  const [tradeReviewed, setTradeReviewed] = useState(false);

  // Proof-of-fix logging: confirms this component (and the board beneath
  // it) stays mounted across a duo-online sync tick instead of tearing
  // down and rebuilding on every action.
  useEffect(() => {
    console.debug("[GameBoardPlay] mounted");
    return () => console.debug("[GameBoardPlay] unmounted");
  }, []);

  const current = ctx.currentPlayer;
  const inSetup = ctx.phase === "setup";
  const gameover = ctx.gameover as { winner: string } | undefined;
  const playerSetups = normalizePlayerSetups(G.numPlayers, G.playerSetups, playerModes);
  const remoteBotSeatSet = useMemo(() => new Set(remoteBotSeats), [remoteBotSeats]);
  // Local-loop CPU (pass-and-play) only — an online bot seat is deliberately
  // NOT included here: it must stay "remote" so this on-screen client (bound
  // to its own playerID) never tries to dispatch moves for another seat.
  const currentIsCpu = isBotSeat(G, current);
  const currentIsRemote = playerSetups[Number(current)]?.mode === "remote";
  // Label-only: an online bot seat renders as "remote" above (so taps stay
  // blocked and the auto-play effect stays off), but the UI should still
  // read "🤖 thinking" instead of the generic reserved-seat banner.
  const currentIsRemoteBot = currentIsRemote && remoteBotSeatSet.has(current);
  const canControlCurrent = canLocalDeviceControlSeat(G, current);
  const boardMoves = moves as ExtendedMoves;
  const names = useMemo(() => G.playerNames ?? G.names ?? [], [G.playerNames, G.names]);

  // Duo-online has exactly one human seat per device (handoffGate={false});
  // local pass-and-play shares one device across every seat, where "which
  // seat is mine" isn't a meaningful question, so this stays unused there.
  const onlineMode = !handoffGate;
  const mySeatId = useMemo(() => {
    const idx = playerSetups.findIndex((s) => s.mode === "human");
    return idx >= 0 ? String(idx) : "";
  }, [playerSetups]);
  // Whose HAND gets displayed on this screen — see resolveDisplayPlayerId.
  // Board/move VALIDATION below stays keyed on `current` throughout
  // (unchanged) — only the hand/cards shown at THIS screen can switch.
  const displayPlayerId = resolveDisplayPlayerId(onlineMode, mySeatId, current);
  const resources = G.players[displayPlayerId].resources;
  const pieces = pieceCounts(G, displayPlayerId);
  const player = G.players[displayPlayerId];
  const commodities = player.commodities ?? { paper: 0, coin: 0, cloth: 0 };
  const improvements = player.improvements ?? { trade: 0, politics: 0, science: 0 };
  const progressCards = player.progressCards ?? [];
  const activeKnights = G.activeKnights ?? {};
  const targetPoints = variant === "cities-knights" ? CITIES_KNIGHTS_POINTS_TO_WIN : VICTORY_POINTS_TO_WIN;
  const ownInactiveKnight = Object.entries(G.knights ?? {}).find(([id, owner]) => owner === current && !activeKnights[id])?.[0];
  const hasCity = Object.values(G.buildings).some((b) => b.player === current && b.city);

  const pendingTrade = G.pendingTrade ?? null;
  const tradeResult = G.lastTradeResult ?? null;

  const myTradeRole = onlineMode ? onlineTradeRole(pendingTrade, mySeatId) : "bystander";
  const tradeStale = onlineMode && !!pendingTrade && isTradeStale(G, pendingTrade);

  // Safe recovery: if the offer's own giver can no longer honor it (or it
  // somehow references a player that doesn't exist), clear it instead of
  // leaving either device stuck. Only the two participants may legally
  // answer (respondTrade enforces this) — whichever device notices first
  // does it; the CAS on the room's revision makes a duplicate a no-op.
  useEffect(() => {
    if (!tradeStale) return;
    if (myTradeRole !== "proposer" && myTradeRole !== "responder") return;
    boardMoves.respondTrade?.(false);
  }, [tradeStale, myTradeRole, boardMoves]);

  // Online trade action UX: disable Accept/Refuse/Cancel the instant they're
  // tapped (guards a rapid double-tap racing ahead of the re-render that
  // would otherwise disable them — respondTrade/cancelTrade are already
  // idempotent at the engine level regardless, this is belt-and-suspenders),
  // and surface a retry ONLY if the action still hasn't taken effect after a
  // few seconds (a genuine failure — e.g. lost connection before the local
  // move could even apply), never as a routine part of the flow.
  const [tradeActionBusy, setTradeActionBusy] = useState(false);
  const [tradeActionStuck, setTradeActionStuck] = useState(false);
  const pendingTradeKey = pendingTrade
    ? `${pendingTrade.from}:${pendingTrade.to}:${pendingTrade.give}:${pendingTrade.giveAmount}:${pendingTrade.receive}:${pendingTrade.receiveAmount}`
    : "";
  useEffect(() => {
    // Resolved (or replaced by a new offer) — clear busy/stuck for the new state.
    setTradeActionBusy(false);
    setTradeActionStuck(false);
  }, [pendingTradeKey]);
  useEffect(() => {
    if (!tradeActionBusy) return;
    const timer = window.setTimeout(() => setTradeActionStuck(true), 4000);
    return () => window.clearTimeout(timer);
  }, [tradeActionBusy]);
  function runTradeAction(run: () => void) {
    setTradeActionBusy(true);
    setTradeActionStuck(false);
    run();
  }

  // Public rival info for the trade panel — counts only, never the breakdown.
  const rivals: RivalInfo[] = Object.keys(G.players)
    .filter((id) => id !== current)
    .map((id) => ({
      id,
      name: names[Number(id)],
      isBot: playerModes[Number(id)] === "bot" || remoteBotSeatSet.has(id),
      cardCount: totalResources(G.players[id].resources),
    }));

  // Autosave at each clean turn start (before rolling) so Resume restarts the
  // active player's turn without replaying production.
  const lastSaved = useRef<string>("");
  // Guards the once-per-turn bot trade proposal (keyed by ctx.turn).
  const botProposeRef = useRef<number>(-1);
  useEffect(() => {
    if (inSetup || gameover || G.hasRolled || G.mustMoveBandit || pendingTrade) return;
    const key = `${ctx.turn}:${current}`;
    if (lastSaved.current === key) return;
    lastSaved.current = key;
    saveGame({
      themeId: theme.id,
      variant,
      numPlayers: Object.keys(G.players).length,
      playerNames: names,
      playerModes,
      playOrderPos: ctx.playOrderPos,
      turn: ctx.turn,
      state: G,
    });
  }, [ctx.turn, current, G.hasRolled, G.mustMoveBandit, inSetup, gameover, pendingTrade, G, names, playerModes, theme.id, variant, ctx.playOrderPos]);

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

  useEffect(() => { setPrivacyGate(handoffGate && canControlCurrent); }, [handoffGate, canControlCurrent, current]);

  // Captured once, at construction: what G.lastRoll already was the moment
  // this instance was born. Distinguishes a LIVE transition (this device
  // just rolled, or the client is still mounted from before — always show
  // the animation) from being remounted already holding a roll that some
  // earlier instance may already have animated (duo-online: every synced
  // action remounts this whole component, so a roll that's simply still on
  // the board from a prior action must not replay).
  const rollAtMountRef = useRef(G.lastRoll);
  useEffect(() => {
    if (!G.lastRoll) return;
    const bornWithThisRoll = rollAtMountRef.current === G.lastRoll;
    if (bornWithThisRoll && diceAnimKey !== undefined && !diceAnimKey) {
      console.debug("[GameBoardPlay] dice anim suppressed — already animated this roll", G.lastRoll);
      return;
    }
    console.debug("[GameBoardPlay] dice anim firing", G.lastRoll, bornWithThisRoll ? "(remount, fresh roll)" : "(live roll)");
    setDiceFlash(G.lastRoll);
    const timer = window.setTimeout(() => setDiceFlash(null), 1200);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [G.lastRoll]);

  // A bot never taps "Continue", so auto-dismiss a lingering result banner
  // once it's a bot's turn.
  useEffect(() => {
    if (!tradeResult || !currentIsCpu) return;
    const t = window.setTimeout(() => boardMoves.clearTradeResult?.(), 1600);
    return () => window.clearTimeout(t);
  }, [tradeResult, currentIsCpu, boardMoves]);

  let highlightVertices: string[] = [];
  let highlightEdges: string[] = [];
  let highlightTiles: number[] = [];
  let instruction = "";

  if (gameover) instruction = "";
  else if (currentIsCpu || currentIsRemoteBot) instruction = `${names[Number(current)]} is thinking…`;
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
    // While a bot's own trade offer is awaiting a human answer, wait.
    if (G.pendingTrade) return;
    const timer = window.setTimeout(() => {
      // The once-per-turn trade-offer stage only unlocks after roll/bandit,
      // and is marked attempted whether or not an offer materializes.
      const offerStageReached = ctx.phase !== "setup" && G.hasRolled && !G.mustMoveBandit;
      const allowTradeOffer = offerStageReached && botProposeRef.current !== ctx.turn;
      if (allowTradeOffer) botProposeRef.current = ctx.turn;
      const action = chooseBotAction(G, ctx, current, { variant, allowTradeOffer, rng: Math.random });
      if (!action) return;
      const dispatch = (boardMoves as Record<string, ((...args: unknown[]) => void) | undefined>)[action.move];
      dispatch?.(...action.args);
    }, inSetup ? 420 : 650);
    return () => window.clearTimeout(timer);
  }, [G, boardMoves, ctx, current, currentIsCpu, gameover, inSetup, moves, variant]);

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
    <div className="game-shell flex h-dvh flex-col overflow-hidden bg-slate-950 landscape:flex-row">
      <div className="ambient-orb ambient-orb-a" />
      <div className="ambient-orb ambient-orb-b" />

      {diceFlash && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
          <div className="dice-popup rounded-3xl border border-white/15 bg-slate-950/90 px-7 py-6 text-center shadow-2xl backdrop-blur">
            <DiceRoll roll={diceFlash} eventDie={variant === "cities-knights" ? G.lastEventDie ?? null : null} />
          </div>
        </div>
      )}

      {/* Header + board share a column; in landscape they sit left of the rail. */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
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
          <BoardStage board={G.board} theme={theme} buildings={G.buildings} roads={G.roads} knights={G.knights} banditTile={G.banditTile} highlightVertices={highlightVertices} highlightEdges={highlightEdges} highlightTiles={highlightTiles} onVertexTap={onVertexTap} onEdgeTap={onEdgeTap} onTileTap={onTileTap} className="h-full w-full" />
          {instruction && <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-black/65 px-3 py-1.5 text-center text-xs font-semibold text-yellow-300 shadow-lg backdrop-blur">{instruction}</div>}
          {lastLog && <div className="pointer-events-none absolute bottom-3 left-3 max-w-[82%] rounded-xl bg-black/55 px-3 py-1.5 text-[11px] text-white/85 shadow-lg backdrop-blur">{lastLog}</div>}
        </div>
      </div>
      </div>

      <div className="relative z-10 shrink-0 overflow-y-auto rounded-t-3xl border-t border-white/10 bg-slate-900/95 px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2 shadow-[0_-18px_60px_rgba(0,0,0,0.45)] backdrop-blur portrait:max-h-[46dvh] landscape:w-[22rem] landscape:max-h-none landscape:max-w-[42%] landscape:shrink-0 landscape:overflow-y-auto landscape:rounded-none landscape:rounded-l-3xl landscape:border-l landscape:border-t-0">
        {/* Sheet grabber — signals this control panel is a draggable-style sheet. */}
        <div className="mx-auto mb-1.5 h-1 w-9 rounded-full bg-white/20 landscape:hidden" />
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
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {COMMODITY_KEYS_ORDERED.map((key) => (
                <div key={key} className="flex flex-col items-center rounded-lg bg-black/20 px-1 py-1.5 leading-tight">
                  <span className="text-base leading-none">{COMMODITY_ICONS[key]}</span>
                  <span className="mt-0.5 text-[9px] uppercase tracking-wide text-white/50">{COMMODITY_LABELS[key]}</span>
                  <span className="text-sm font-bold text-white">{commodities[key]}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
              {TRACK_KEYS_ORDERED.map((track) => (
                <span key={track} className="rounded-lg bg-black/20 px-1 py-1 capitalize">{track}: {improvements[track]}</span>
              ))}
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
                  return <button key={track} disabled={privacyGate || !canControlCurrent || currentIsCpu || !G.hasRolled || !hasCity || improvements[track] >= 3 || commodities[commodity] < cost || !!gameover} onClick={() => ask("Improve city", `Spend ${cost} ${COMMODITY_LABELS[commodity]} to improve ${track}.`, () => boardMoves.improveCity?.(track))} className="rounded-xl bg-white/10 py-2 text-xs font-bold capitalize text-white disabled:opacity-30">+ {track}</button>;
                })}
                {progressCards.slice(0, 2).map((card) => <button key={card} disabled={privacyGate || !canControlCurrent || currentIsCpu || !G.hasRolled || !!gameover} onClick={() => cardNeedsChoice(card) ? setCardToPlay(card) : ask("Play progress card", `Play ${PROGRESS_CARD_LABELS[card]}.`, () => boardMoves.playProgressCard?.(card))} className="rounded-xl bg-yellow-500/90 py-2 text-xs font-black text-slate-900 disabled:opacity-30">{PROGRESS_CARD_LABELS[card]}</button>)}
              </div>
            )}
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {/* No confirmation for dice — rolling isn't a choice to second-guess, and gating it
                  behind a modal only added friction (and, in duo online, an extra tap before the
                  remount/animation cycle). */}
              <button disabled={privacyGate || !canControlCurrent || currentIsCpu || G.hasRolled || !!gameover} onClick={() => moves.rollDice()} className="rounded-xl bg-yellow-500 py-3 text-sm font-black text-slate-900 disabled:opacity-30">🎲 Roll</button>
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
          commodities={commodities}
          variant={variant}
          rateFor={(give) => maritimeRate(G, current, give)}
          ownedHarbors={[...playerHarborTypes(G, current)]}
          merchantGuild={hasMerchantGuild(G, current)}
          rivals={rivals}
          onTrade={(give, receive) => { const r = maritimeRate(G, current, give); setShowTrade(false); ask("Confirm bank trade", `Trade ${r} ${give} for 1 ${receive}.`, () => moves.bankTrade(give, receive)); }}
          onPlayerTrade={(target, give, giveAmount, receive, receiveAmount) => {
            // The engine settles bot targets immediately (surfacing a result banner)
            // and parks a human offer in pendingTrade for the private review flow.
            setShowTrade(false);
            boardMoves.proposeTrade?.(target, give, giveAmount, receive, receiveAmount);
          }}
          onClose={() => setShowTrade(false)}
        />
      )}

      {/* Trade response flow. Online: a bottom sheet over the still-mounted
          board, no "pass the device" handoff — each phone is already the
          right player's own device. Local pass-and-play keeps its original
          handoff → private review flow, unchanged. */}
      {onlineMode ? (
        pendingTrade && (
          <OnlineTradePanel
            offer={pendingTrade}
            theme={theme}
            role={myTradeRole}
            proposerName={names[Number(pendingTrade.from)]}
            responderName={names[Number(pendingTrade.to)]}
            canResponderPay={canResponderPayFor(G, pendingTrade)}
            expired={tradeStale}
            busy={tradeActionBusy}
            failed={tradeActionStuck}
            onAccept={() => runTradeAction(() => boardMoves.respondTrade?.(true))}
            onRefuse={() => runTradeAction(() => boardMoves.respondTrade?.(false))}
            onCancel={() => runTradeAction(() => boardMoves.cancelTrade?.())}
          />
        )
      ) : (
        <>
          {pendingTrade && !tradeReviewed && (
            <PrivacyOverlay
              playerName={names[Number(pendingTrade.to)]}
              color={PLAYER_COLORS[Number(pendingTrade.to)]}
              title="Trade offer"
              subtitle={`${names[Number(pendingTrade.from)]} sent you a private offer.`}
              actionLabel={`I'm ${names[Number(pendingTrade.to)]} — Review offer`}
              onReady={() => setTradeReviewed(true)}
            />
          )}
          {pendingTrade && tradeReviewed && (
            <TradeReview
              offer={pendingTrade}
              theme={theme}
              proposerName={names[Number(pendingTrade.from)]}
              responderName={names[Number(pendingTrade.to)]}
              canPay={G.players[pendingTrade.to].resources[pendingTrade.receive] >= pendingTrade.receiveAmount}
              onAccept={() => { boardMoves.respondTrade?.(true); setTradeReviewed(false); }}
              onRefuse={() => { boardMoves.respondTrade?.(false); setTradeReviewed(false); }}
            />
          )}
        </>
      )}
      {!pendingTrade && tradeResult && (
        <TradeResultBanner
          result={tradeResult}
          theme={theme}
          proposerName={names[Number(tradeResult.offer.from)]}
          responderName={names[Number(tradeResult.offer.to)]}
          onDismiss={() => boardMoves.clearTradeResult?.()}
        />
      )}

      {cardToPlay && (
        <ProgressCardPlay
          card={cardToPlay}
          theme={theme}
          rivals={rivals.map((r) => ({ id: r.id, name: r.name }))}
          onPlay={(choice) => { boardMoves.playProgressCard?.(cardToPlay, choice); setCardToPlay(null); }}
          onCancel={() => setCardToPlay(null)}
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

      {currentIsRemote && !currentIsRemoteBot && !gameover && (
        <div className="fixed inset-x-4 bottom-28 z-[65] rounded-2xl border border-sky-300/30 bg-sky-950/90 p-3 text-center text-sm font-bold text-sky-100 shadow-2xl">
          Remote seat reserved for {names[Number(current)]}. Only that remote player can act for this seat online.
        </div>
      )}

      {currentIsRemoteBot && !gameover && (
        <div className="fixed inset-x-4 bottom-28 z-[65] rounded-2xl border border-amber-300/30 bg-amber-950/90 p-3 text-center text-sm font-bold text-amber-100 shadow-2xl">
          🤖 {names[Number(current)]} is thinking…
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

