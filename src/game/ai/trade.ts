import type { Difficulty, GameState, ResourceKey, TradeOffer } from "@/types/game";
import { BUILD_COSTS } from "../constants";
import { publicPoints } from "../scoring";

export type Rng = () => number;
export type { Difficulty };

export interface TradeEvaluation {
  accept: boolean;
  /** Short, player-facing explanation. */
  reason: string;
}

const RESOURCES: ResourceKey[] = ["wood", "brick", "grain", "wool", "ore"];

/** Per-difficulty knobs. Easy accepts more and never blocks; hard is strict. */
const TUNING: Record<Difficulty, { acceptThreshold: number; jitter: number; blockLeader: boolean }> = {
  easy: { acceptThreshold: -0.35, jitter: 0.9, blockLeader: false },
  normal: { acceptThreshold: 0, jitter: 0.6, blockLeader: true },
  hard: { acceptThreshold: 0.15, jitter: 0.25, blockLeader: true },
};

/** A player's difficulty, defaulting to normal. */
export function difficultyOf(G: GameState, player: string): Difficulty {
  return (G.difficulties ?? [])[Number(player)] ?? "normal";
}

/**
 * How much one unit of `resource` is worth to `player` right now.
 * Base value 1; resources still missing for the player's next sensible
 * build are worth more, resources they already hoard are worth less.
 * Harder bots weight their build goals more sharply.
 */
export function resourceValueFor(
  G: GameState,
  player: string,
  resource: ResourceKey,
  difficulty: Difficulty = "normal",
): number {
  const hand = G.players[player].resources;
  let value = 1;

  const hasUpgradeableSettlement = Object.values(G.buildings).some(
    (b) => b.player === player && !b.city,
  );
  const goals = hasUpgradeableSettlement
    ? [BUILD_COSTS.city, BUILD_COSTS.settlement, BUILD_COSTS.road]
    : [BUILD_COSTS.settlement, BUILD_COSTS.road];
  const needWeight = difficulty === "hard" ? 0.85 : difficulty === "easy" ? 0.4 : 0.6;
  for (const goal of goals) {
    const needed = goal[resource] ?? 0;
    if (needed > 0 && hand[resource] < needed) {
      value += needWeight;
      break;
    }
  }

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
  difficulty: Difficulty = difficultyOf(G, offer.to),
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

  const tune = TUNING[difficulty];
  const gain = offer.giveAmount * resourceValueFor(G, bot, offer.give, difficulty);
  const cost = offer.receiveAmount * resourceValueFor(G, bot, offer.receive, difficulty);
  const net = gain - cost + (rng() - 0.5) * tune.jitter;

  // Harder bots refuse to bankroll a lone leader unless the deal is great.
  if (tune.blockLeader) {
    const scores = Object.keys(G.players).map((p) => [p, publicPoints(G, p)] as const);
    const top = Math.max(...scores.map(([, s]) => s));
    const proposerLeads =
      publicPoints(G, offer.from) === top &&
      scores.filter(([, s]) => s === top).length === 1 &&
      offer.from !== bot;
    if (proposerLeads && net < 1) {
      return { accept: false, reason: "Refuses to help the leader." };
    }
  }

  if (net >= 0.9) return { accept: true, reason: "Needs those resources." };
  if (net >= tune.acceptThreshold) return { accept: true, reason: "A fair exchange." };
  return { accept: false, reason: "Not a good deal." };
}

/**
 * On its turn, a bot may propose a 1:1 trade: give a resource it holds in
 * surplus for a resource it needs for its next build. Returns null when the
 * bot has nothing worth proposing (easy bots propose less often). The chosen
 * target is the rival most likely to hold the wanted resource (bots may read
 * bot hands; against humans it targets whoever holds the most cards).
 */
export function botProposeTrade(
  G: GameState,
  bot: string,
  rng: Rng = Math.random,
  difficulty: Difficulty = difficultyOf(G, bot),
): TradeOffer | null {
  // Easy bots rarely initiate; hard bots usually do.
  const initiateChance = difficulty === "hard" ? 0.8 : difficulty === "easy" ? 0.25 : 0.5;
  if (rng() > initiateChance) return null;

  const hand = G.players[bot].resources;
  const values = RESOURCES.map((r) => ({ r, v: resourceValueFor(G, bot, r, difficulty), have: hand[r] }));
  // Want: a needed resource the bot lacks. Give: a surplus, low-value resource.
  const want = values
    .filter((x) => x.have === 0 && x.v > 1)
    .sort((a, b) => b.v - a.v)[0];
  const give = values
    .filter((x) => x.have >= 2 && x.r !== want?.r)
    .sort((a, b) => a.v - b.v)[0];
  if (!want || !give) return null;

  // Bots only offer to HUMAN rivals — a bot-to-bot popup would have no one to
  // answer it in pass-and-play / solo. If there is no human rival, skip.
  const modes = G.playerModes ?? [];
  const rivals = Object.keys(G.players).filter((p) => p !== bot && modes[Number(p)] !== "bot");
  if (rivals.length === 0) return null;
  // Prefer a rival holding the most cards overall (public info to the engine).
  const target =
    rivals
      .map((p) => ({ p, total: RESOURCES.reduce((s, r) => s + G.players[p].resources[r], 0) }))
      .sort((a, b) => b.total - a.total)[0]?.p ?? rivals[0];

  return {
    from: bot,
    to: target,
    give: give.r,
    giveAmount: 1,
    receive: want.r,
    receiveAmount: 1,
  };
}
