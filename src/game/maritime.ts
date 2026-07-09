import type { CommodityKey, GameState, ResourceKey } from "@/types/game";
import { BANK_TRADE_RATE, COMMODITY_KEYS_ORDERED, RESOURCE_KEYS_ORDERED } from "./constants";
import { getGeometry } from "./rules";

export type TradeCardKey = ResourceKey | CommodityKey;
export type HarborKind = "generic" | ResourceKey;

export interface HarborAccess {
  edgeId: string;
  kind: HarborKind;
}

export interface MaritimeTradeOption {
  give: TradeCardKey;
  receive: TradeCardKey;
  rate: number;
  source: "default" | "generic-harbor" | "specific-harbor" | "trade-improvement";
  reason: string;
}

export const TRADE_CARD_KEYS: TradeCardKey[] = [...RESOURCE_KEYS_ORDERED, ...COMMODITY_KEYS_ORDERED];

const HARBOR_KINDS: HarborKind[] = ["generic", "wood", "brick", "generic", "grain", "wool", "generic", "ore", "generic"];

function edgeTileCount(G: GameState, edgeId: string): number {
  const geo = getGeometry(G.board);
  const edge = geo.edges[edgeId];
  if (!edge) return 0;
  const aTiles = new Set(geo.vertices[edge.a]?.tiles ?? []);
  return (geo.vertices[edge.b]?.tiles ?? []).filter((tile) => aTiles.has(tile)).length;
}

export function boardHarbors(G: GameState): HarborAccess[] {
  const geo = getGeometry(G.board);
  const cx = (geo.bounds.minX + geo.bounds.maxX) / 2;
  const cy = (geo.bounds.minY + geo.bounds.maxY) / 2;
  const coast = Object.values(geo.edges)
    .filter((edge) => edgeTileCount(G, edge.id) === 1)
    .map((edge) => {
      const a = geo.vertices[edge.a];
      const b = geo.vertices[edge.b];
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      return { edge, angle: Math.atan2(my - cy, mx - cx) };
    })
    .sort((a, b) => a.angle - b.angle);
  if (coast.length === 0) return [];
  const step = coast.length / HARBOR_KINDS.length;
  return HARBOR_KINDS.map((kind, i) => ({ edgeId: coast[Math.floor(i * step) % coast.length].edge.id, kind }));
}

export function playerHarbors(G: GameState, player: string): HarborAccess[] {
  const geo = getGeometry(G.board);
  return boardHarbors(G).filter((harbor) => {
    const edge = geo.edges[harbor.edgeId];
    return [edge.a, edge.b].some((vertexId) => G.buildings[vertexId]?.player === player);
  });
}

function countCard(G: GameState, player: string, card: TradeCardKey): number {
  if ((RESOURCE_KEYS_ORDERED as TradeCardKey[]).includes(card)) return G.players[player].resources[card as ResourceKey];
  return G.players[player].commodities?.[card as CommodityKey] ?? 0;
}

export function hasTradeImprovementCommodityAbility(G: GameState, player: string): boolean {
  return G.variant === "cities-knights" && (G.players[player].improvements?.trade ?? 0) >= 3;
}

export function maritimeTradeOptions(G: GameState, player: string): MaritimeTradeOption[] {
  const harbors = playerHarbors(G, player);
  const hasGeneric = harbors.some((h) => h.kind === "generic");
  const specific = new Set<ResourceKey>(harbors.filter((h) => h.kind !== "generic").map((h) => h.kind as ResourceKey));
  const hasTrade3 = hasTradeImprovementCommodityAbility(G, player);
  return TRADE_CARD_KEYS.flatMap((give) => {
    const isCommodity = (COMMODITY_KEYS_ORDERED as TradeCardKey[]).includes(give);
    let rate = BANK_TRADE_RATE;
    let source: MaritimeTradeOption["source"] = "default";
    let reason = "Default market trade: 4 identical cards for 1 chosen card.";
    if (!isCommodity && specific.has(give as ResourceKey)) {
      rate = 2;
      source = "specific-harbor";
      reason = `Owned ${give} harbor: 2 ${give} for 1 chosen resource or commodity.`;
    } else if (isCommodity && hasTrade3) {
      rate = 2;
      source = "trade-improvement";
      reason = "Trade level 3: 2 identical commodities for 1 chosen resource or commodity.";
    } else if (hasGeneric) {
      rate = 3;
      source = "generic-harbor";
      reason = "Owned 3:1 harbor: 3 identical resources or commodities for 1 chosen card.";
    }
    if (!isCommodity && (G.tradeRate ?? BANK_TRADE_RATE) < rate) {
      rate = G.tradeRate ?? BANK_TRADE_RATE;
      source = "default";
      reason = "Current turn trade ability: reduced resource market rate.";
    }
    return TRADE_CARD_KEYS.filter((receive) => receive !== give).map((receive) => ({ give, receive, rate, source, reason }));
  });
}

export function bestMaritimeTradeOption(G: GameState, player: string, give: TradeCardKey, receive: TradeCardKey): MaritimeTradeOption | null {
  if (give === receive) return null;
  return maritimeTradeOptions(G, player)
    .filter((option) => option.give === give && option.receive === receive && countCard(G, player, give) >= option.rate)
    .sort((a, b) => a.rate - b.rate)[0] ?? null;
}

export function moveCard(G: GameState, player: string, card: TradeCardKey, delta: number): void {
  if ((RESOURCE_KEYS_ORDERED as TradeCardKey[]).includes(card)) G.players[player].resources[card as ResourceKey] += delta;
  else G.players[player].commodities![card as CommodityKey] += delta;
}
