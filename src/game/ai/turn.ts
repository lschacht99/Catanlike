import type { GameState, GameVariant } from "@/types/game";
import { TOKEN_PIPS } from "@/game/constants";
import {
  canAfford,
  getGeometry,
  validBanditTiles,
  validCitySpots,
  validKnightSpots,
  validRoadSpots,
  validSettlementSpots,
} from "@/game/rules";
import { botProposeTrade, planBankTrade } from "@/game/ai/trade";

/**
 * The bot turn brain, extracted from GameBoardPlay's inline effect so the
 * SAME engine drives local pass-and-play bots and /duo online bots. Pure:
 * given a state it returns the single next action to dispatch (the callers
 * own pacing, timers and dispatch). No rewrite — the decision sequence is
 * the exact one the local loop always used.
 */

export interface BotAction {
  move:
    | "placeSettlement"
    | "placeRoad"
    | "rollDice"
    | "moveBandit"
    | "proposeTrade"
    | "playProgressCard"
    | "activateKnight"
    | "buildCity"
    | "buildSettlement"
    | "buildKnight"
    | "buildRoad"
    | "bankTrade"
    | "endTurn";
  args: unknown[];
}

export interface ChooseBotActionOptions {
  variant: GameVariant;
  /**
   * Whether the once-per-turn player-trade offer stage may fire. Local play
   * gates it with a per-turn ref; online duo keeps it off (a bot offer to a
   * remote human would stall the room waiting for an out-of-turn response).
   */
  allowTradeOffer?: boolean;
  rng?: () => number;
}

export function chooseBotAction(
  G: GameState,
  ctx: { phase?: string | null },
  player: string,
  options: ChooseBotActionOptions,
): BotAction | null {
  const { variant, allowTradeOffer = false, rng = Math.random } = options;

  if (ctx.phase === "setup") {
    if (G.pendingSetupSettlement === null) {
      const spot = pickBestSettlement(G, validSettlementSpots(G, player, true));
      return spot ? { move: "placeSettlement", args: [spot] } : null;
    }
    const road = pickBestRoad(G, player, validRoadSpots(G, player, true));
    return road ? { move: "placeRoad", args: [road] } : null;
  }
  if (!G.hasRolled) return { move: "rollDice", args: [] };
  if (G.mustMoveBandit) {
    const tile = pickBestBanditTile(G, player, validBanditTiles(G));
    return tile !== null ? { move: "moveBandit", args: [tile] } : null;
  }
  if (allowTradeOffer) {
    const offer = botProposeTrade(G, player, rng);
    if (offer) {
      return {
        move: "proposeTrade",
        args: [offer.to, offer.give, offer.giveAmount, offer.receive, offer.receiveAmount],
      };
    }
  }
  const hand = G.players[player].resources;
  const cards = G.players[player].progressCards ?? [];
  // Only auto-play cards that need no interactive choice, so the bot can
  // never stall on a card that requires a picker.
  const noChoiceCards = new Set(["harvest", "oreRush", "roadworks", "merchant", "warlord", "levy"]);
  const playable = cards.find((c) => noChoiceCards.has(c));
  if (variant === "cities-knights" && playable) {
    return { move: "playProgressCard", args: [playable] };
  }
  const inactive = Object.entries(G.knights ?? {}).find(([id, owner]) => owner === player && !G.activeKnights?.[id])?.[0];
  if (variant === "cities-knights" && inactive && hand.grain > 0) {
    return { move: "activateKnight", args: [inactive] };
  }
  const city = pickBestCity(G, validCitySpots(G, player));
  if (city && canAfford(hand, "city")) return { move: "buildCity", args: [city] };
  const settlement = pickBestSettlement(G, validSettlementSpots(G, player, false));
  if (settlement && canAfford(hand, "settlement")) return { move: "buildSettlement", args: [settlement] };
  const knight = pickBestCity(G, validKnightSpots(G, player));
  if (variant === "cities-knights" && knight && canAfford(hand, "knight")) {
    return { move: "buildKnight", args: [knight] };
  }
  const road = pickBestRoad(G, player, validRoadSpots(G, player, false));
  if (road && canAfford(hand, "road")) return { move: "buildRoad", args: [road] };
  // Nothing affordable to build: bank-trade toward a needed card at the
  // bot's OWN best legal maritime rate (per-player harbors), then retry.
  const swap = planBankTrade(G, player);
  if (swap) return { move: "bankTrade", args: [swap.give, swap.receive] };
  return { move: "endTurn", args: [] };
}

/**
 * Minimal legal sequence to hand the turn over when a bot must be force-
 * ended (online watchdog): roll if needed, resolve a pending bandit, end.
 */
export function forceEndAction(G: GameState): BotAction {
  if (!G.hasRolled) return { move: "rollDice", args: [] };
  if (G.mustMoveBandit) {
    const tiles = validBanditTiles(G);
    return { move: "moveBandit", args: [tiles[0] ?? 0] };
  }
  return { move: "endTurn", args: [] };
}

function tokenWeight(token: number | null): number {
  return token ? TOKEN_PIPS[token] ?? 0 : 0;
}

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

export function pickBestSettlement(G: GameState, spots: string[]): string | null {
  return spots.length === 0 ? null : [...spots].sort((a, b) => vertexScore(G, b) - vertexScore(G, a))[0];
}

export function pickBestRoad(G: GameState, player: string, spots: string[]): string | null {
  if (spots.length === 0) return null;
  const geo = getGeometry(G.board);
  return [...spots].sort((a, b) => {
    const edgeA = geo.edges[a];
    const edgeB = geo.edges[b];
    const scoreA = Math.max(vertexScore(G, edgeA.a), vertexScore(G, edgeA.b));
    const scoreB = Math.max(vertexScore(G, edgeB.a), vertexScore(G, edgeB.b));
    const ownA = Number(G.buildings[edgeA.a]?.player === player || G.buildings[edgeA.b]?.player === player);
    const ownB = Number(G.buildings[edgeB.a]?.player === player || G.buildings[edgeB.b]?.player === player);
    return scoreB + ownB - (scoreA + ownA);
  })[0];
}

export function pickBestCity(G: GameState, spots: string[]): string | null {
  return spots.length === 0 ? null : [...spots].sort((a, b) => vertexScore(G, b) - vertexScore(G, a))[0];
}

export function pickBestBanditTile(G: GameState, player: string, tileIds: number[]): number | null {
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
