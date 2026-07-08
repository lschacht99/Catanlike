import type { GameState, ResourceKey, TradeOffer } from "@/types/game";
import { BUILD_COSTS } from "../constants";
import { publicPoints } from "../scoring";

export type Rng = () => number;

export interface TradeEvaluation {
  accept: boolean;
  /** Short, player-facing explanation. */
  reason: string;
}

const RESOURCES: ResourceKey[] = ["wood", "brick", "grain", "wool", "ore"];

/**
 * How much one unit of `resource` is worth to `player` right now.
 * Base value 1; resources still missing for the player's next sensible
 * build are worth more, resources they already hoard are worth less.
 */
export function resourceValueFor(G: GameState, player: string, resource: ResourceKey): number {
  const hand = G.players[player].resources;
  let value = 1;

  // What is this player plausibly saving for?
  const hasUpgradeableSettlement = Object.values(G.buildings).some(
    (b) => b.player === player && !b.city,
  );
  const goals = hasUpgradeableSettlement
    ? [BUILD_COSTS.city, BUILD_COSTS.settlement, BUILD_COSTS.road]
    : [BUILD_COSTS.settlement, BUILD_COSTS.road];
  for (const goal of goals) {
    const needed = goal[resource] ?? 0;
    if (needed > 0 && hand[resource] < needed) {
      value += 0.6;
      break;
    }
  }

  // Surplus is cheap to give away and boring to receive.
  if (hand[resource] >= 4) value -= 0.35;
  return value;
}

/**
 * Decide whether the bot at `offer.to` accepts a player-to-player offer.
 * The bot receives `give` x giveAmount and pays `receive` x receiveAmount.
 * Deterministic given `rng`, so it is unit-testable.
 */
export function evaluateTradeOffer(
  G: GameState,
  offer: TradeOffer,
  rng: Rng = Math.random,
): TradeEvaluation {
  const bot = offer.to;
  const hand = G.players[bot]?.resources;
  if (!hand) return { accept: false, reason: "Unknown trader." };

  if (!RESOURCES.includes(offer.give) || !RESOURCES.includes(offer.receive)) {
    return { accept: false, reason: "Unknown goods." };
  }
  if (offer.give === offer.receive) {
    return { accept: false, reason: "That is not a trade." };
  }
  if (hand[offer.receive] < offer.receiveAmount) {
    return { accept: false, reason: "Not enough resources to pay." };
  }

  const gain = offer.giveAmount * resourceValueFor(G, bot, offer.give);
  const cost = offer.receiveAmount * resourceValueFor(G, bot, offer.receive);
  // Small jitter so bots are not perfectly predictable (±0.3 value).
  const net = gain - cost + (rng() - 0.5) * 0.6;

  // Never bankroll the table leader unless the deal is clearly great.
  const scores = Object.keys(G.players).map((p) => [p, publicPoints(G, p)] as const);
  const top = Math.max(...scores.map(([, s]) => s));
  const proposerLeads =
    publicPoints(G, offer.from) === top &&
    scores.filter(([, s]) => s === top).length === 1 &&
    offer.from !== bot;
  if (proposerLeads && net < 1) {
    return { accept: false, reason: "Refuses to help the leader." };
  }

  if (net >= 0.9) return { accept: true, reason: "Needs those resources." };
  if (net >= 0) return { accept: true, reason: "A fair exchange." };
  return { accept: false, reason: "Not a good deal." };
}
