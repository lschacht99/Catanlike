import type { Board, CommodityKey, GameState, ResourceKey } from "@/types/game";
import { COMMODITY_KEYS } from "@/types/game";
import { BANK_TRADE_RATE } from "./constants";
import { getGeometry } from "./rules";

/**
 * Maritime trade in Cities & Knights is PER PLAYER, driven by which harbors a
 * player's own settlements/cities touch — never a single global rate. This
 * module is the single source of truth for harbor placement and the resulting
 * trade rate, shared by the engine, the bots, and the 3D board.
 */

/** A harbor is either "generic" (3:1 any) or specific to one resource (2:1). */
export type HarborType = "generic" | ResourceKey;

/** Any card that can be handed to / received from the bank. */
export type TradeCard = ResourceKey | CommodityKey;

export interface Harbor {
  /** "generic" = 3:1 on any resource or commodity; else 2:1 on that resource. */
  type: HarborType;
  /** The coastal edge this harbor sits on. */
  edge: string;
  /** The two vertices whose buildings grant access to this harbor. */
  nodes: [string, string];
  /** Midpoint in SVG board units (for rendering). */
  mx: number;
  my: number;
  /** Outward-facing angle from the board centre (for rendering). */
  angle: number;
}

/**
 * Nine harbors spread around the coast: four generic 3:1 plus one 2:1 per
 * resource. The order is fixed so a given board always lays its harbors out
 * the same way (deterministic — no RNG, matches the standard 4×3:1 + 5×2:1).
 */
const HARBOR_TYPES: HarborType[] = [
  "generic",
  "wood",
  "generic",
  "brick",
  "grain",
  "generic",
  "wool",
  "ore",
  "generic",
];

const harborCache = new WeakMap<object, Harbor[]>();

export function isCommodity(card: TradeCard): card is CommodityKey {
  return (COMMODITY_KEYS as readonly string[]).includes(card);
}

/**
 * Derive the harbors for a board. A coastal edge is one whose two vertices
 * share exactly ONE tile (i.e. it borders the open sea). We sort those edges
 * by angle around the board centre and place the harbor types evenly, so they
 * ring the island rather than clustering. Cached per board identity.
 */
export function deriveHarbors(board: Board): Harbor[] {
  const cached = harborCache.get(board.tiles);
  if (cached) return cached;

  const geo = getGeometry(board);
  const cx = (geo.bounds.minX + geo.bounds.maxX) / 2;
  const cy = (geo.bounds.minY + geo.bounds.maxY) / 2;

  const coastal = Object.values(geo.edges)
    .map((e) => {
      const a = geo.vertices[e.a];
      const b = geo.vertices[e.b];
      if (!a || !b) return null;
      const shared = a.tiles.filter((t) => b.tiles.includes(t));
      if (shared.length !== 1) return null;
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      return { edge: e.id, a: e.a, b: e.b, mx, my, angle: Math.atan2(my - cy, mx - cx) };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null)
    .sort((p, q) => p.angle - q.angle);

  const n = Math.min(HARBOR_TYPES.length, coastal.length);
  const harbors: Harbor[] = Array.from({ length: n }, (_, i) => {
    const spot = coastal[Math.floor((i * coastal.length) / n)];
    return {
      type: HARBOR_TYPES[i],
      edge: spot.edge,
      nodes: [spot.a, spot.b] as [string, string],
      mx: spot.mx,
      my: spot.my,
      angle: spot.angle,
    };
  });

  harborCache.set(board.tiles, harbors);
  return harbors;
}

/** The harbor types a player can currently use (has a building on a node of). */
export function playerHarborTypes(G: GameState, player: string): Set<HarborType> {
  const owned = new Set<HarborType>();
  for (const h of deriveHarbors(G.board)) {
    if (h.nodes.some((vid) => G.buildings[vid]?.player === player)) owned.add(h.type);
  }
  return owned;
}

/** True when this player has Merchant Guild (Trade improvement level 3+). */
export function hasMerchantGuild(G: GameState, player: string): boolean {
  return (G.players[player]?.improvements?.trade ?? 0) >= 3;
}

/**
 * How many `give` cards this player must hand the bank for one card in return.
 *
 * - Resources: 4 by default; 3 with any generic harbor; 2 with the matching
 *   resource-specific harbor. The per-turn Merchant progress card can lower it.
 * - Commodities: 4 by default; 3 with a generic harbor. Resource-specific 2:1
 *   harbors NEVER apply to commodities. Merchant Guild (Trade level 3) grants
 *   2:1 on commodities — a city-improvement ability, separate from harbors.
 */
export function maritimeRate(G: GameState, player: string, give: TradeCard): number {
  const owned = playerHarborTypes(G, player);
  let rate = BANK_TRADE_RATE;
  if (owned.has("generic")) rate = Math.min(rate, 3);

  if (isCommodity(give)) {
    if (hasMerchantGuild(G, player)) rate = Math.min(rate, 2);
  } else {
    if (owned.has(give)) rate = Math.min(rate, 2);
    // Merchant progress card lowers this turn's resource rate (default 4 = no-op).
    if (typeof G.tradeRate === "number") rate = Math.min(rate, G.tradeRate);
  }
  return rate;
}
