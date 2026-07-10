import type { BotDifficulty, GameState, GameVariant, ResourceKey, ProgressCardType } from "@/types/game";
import { TOKEN_PIPS } from "./constants";
import { canAfford, getGeometry, validBanditTiles, validCitySpots, validKnightSpots, validRoadSpots, validSettlementSpots } from "./rules";
import { botProposeTrade, planBankTrade } from "./ai/trade";

type BotAction =
  | { move: "placeSettlement"; args: [string] }
  | { move: "placeRoad"; args: [string] }
  | { move: "rollDice"; args: [] }
  | { move: "moveBandit"; args: [number] }
  | { move: "proposeTrade"; args: [string, ResourceKey, number, ResourceKey, number] }
  | { move: "playProgressCard"; args: [ProgressCardType] }
  | { move: "activateKnight"; args: [string] }
  | { move: "buildCity"; args: [string] }
  | { move: "buildSettlement"; args: [string] }
  | { move: "buildKnight"; args: [string] }
  | { move: "buildRoad"; args: [string] }
  | { move: "bankTrade"; args: [ResourceKey, ResourceKey] }
  | { move: "endTurn"; args: [] };

export type BotMoves = Record<string, (...args: unknown[]) => void | unknown>;

export function chooseBotAction(
  G: GameState,
  botPlayerId: string,
  opts: { variant?: GameVariant; allowTradeProposal?: boolean; rng?: () => number; difficulty?: BotDifficulty } = {},
): BotAction | null {
  const variant = opts.variant ?? G.variant ?? "base";
  const inSetup = G.setupStep < 2 * G.numPlayers;
  if (G.pendingTrade) return null;
  if (inSetup) {
    if (G.pendingSetupSettlement === null) {
      const spot = pickBestSettlement(G, validSettlementSpots(G, botPlayerId, true));
      return spot ? { move: "placeSettlement", args: [spot] } : null;
    }
    const road = pickBestRoad(G, botPlayerId, validRoadSpots(G, botPlayerId, true));
    return road ? { move: "placeRoad", args: [road] } : null;
  }
  if (!G.hasRolled) return { move: "rollDice", args: [] };
  if (G.mustMoveBandit) {
    const tile = pickBestBanditTile(G, botPlayerId, validBanditTiles(G));
    return tile !== null ? { move: "moveBandit", args: [tile] } : null;
  }
  if (opts.allowTradeProposal) {
    const offer = botProposeTrade(G, botPlayerId, opts.rng ?? Math.random);
    if (offer) return { move: "proposeTrade", args: [offer.to, offer.give, offer.giveAmount, offer.receive, offer.receiveAmount] };
  }
  const hand = G.players[botPlayerId].resources;
  const noChoiceCards = new Set<ProgressCardType>(["harvest", "oreRush", "roadworks", "merchant", "warlord", "levy"] as ProgressCardType[]);
  const playable = (G.players[botPlayerId].progressCards ?? []).find((c) => noChoiceCards.has(c));
  if (variant === "cities-knights" && playable) return { move: "playProgressCard", args: [playable] };
  const inactive = Object.entries(G.knights ?? {}).find(([id, owner]) => owner === botPlayerId && !G.activeKnights?.[id])?.[0];
  if (variant === "cities-knights" && inactive && hand.grain > 0) return { move: "activateKnight", args: [inactive] };
  const city = pickBestCity(G, validCitySpots(G, botPlayerId));
  if (city && canAfford(hand, "city")) return { move: "buildCity", args: [city] };
  const settlement = pickBestSettlement(G, validSettlementSpots(G, botPlayerId, false));
  if (settlement && canAfford(hand, "settlement")) return { move: "buildSettlement", args: [settlement] };
  const knight = pickBestCity(G, validKnightSpots(G, botPlayerId));
  if (variant === "cities-knights" && knight && canAfford(hand, "knight")) return { move: "buildKnight", args: [knight] };
  const road = pickBestRoad(G, botPlayerId, validRoadSpots(G, botPlayerId, false));
  if (road && canAfford(hand, "road")) return { move: "buildRoad", args: [road] };
  const swap = planBankTrade(G, botPlayerId);
  if (swap) return { move: "bankTrade", args: [swap.give, swap.receive] };
  return { move: "endTurn", args: [] };
}

export function runBotTurn(moves: BotMoves, G: GameState, botPlayerId: string, opts: Parameters<typeof chooseBotAction>[2] = {}): boolean {
  const action = chooseBotAction(G, botPlayerId, opts);
  if (!action) return false;
  const fn = moves[action.move];
  if (!fn) return false;
  fn(...action.args);
  return true;
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
