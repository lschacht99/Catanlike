import type { GameState, ResourceCounts, ResourceKey } from "@/types/game";
import { BUILD_COSTS } from "./constants";
import { victoryPoints } from "./scoring";

export interface TradeOffer {
  proposer: string;
  target: string;
  give: ResourceKey;
  giveAmount: number;
  receive: ResourceKey;
  receiveAmount: number;
}

export interface TradeDecision {
  accepted: boolean;
  reason: string;
}

const RESOURCE_VALUE: Record<ResourceKey, number> = { wood: 1, brick: 1, grain: 1.15, wool: 1, ore: 1.25 };

function has(hand: ResourceCounts, resource: ResourceKey, amount: number): boolean {
  return amount > 0 && hand[resource] >= amount;
}

function buildNeedScore(hand: ResourceCounts, resource: ResourceKey): number {
  let score = 0;
  for (const cost of Object.values(BUILD_COSTS)) {
    const needed = cost[resource] ?? 0;
    if (!needed) continue;
    const missingKinds = Object.entries(cost).filter(([key, amount]) => hand[key as ResourceKey] < (amount ?? 0)).length;
    if (hand[resource] < needed) score += Math.max(1, 4 - missingKinds) * needed;
  }
  return score;
}

export function evaluateBotTrade(G: GameState, offer: TradeOffer, random = Math.random): TradeDecision {
  const bot = G.players[offer.target];
  const proposer = G.players[offer.proposer];
  if (!bot || !proposer) return { accepted: false, reason: "Unknown player." };
  if (offer.proposer === offer.target || offer.give === offer.receive || offer.giveAmount < 1 || offer.receiveAmount < 1) {
    return { accepted: false, reason: "Illegal trade." };
  }
  if (!has(proposer.resources, offer.give, offer.giveAmount)) return { accepted: false, reason: "Proposer cannot pay." };
  if (!has(bot.resources, offer.receive, offer.receiveAmount)) return { accepted: false, reason: "Bot does not have enough resources." };

  const botGain = offer.giveAmount * RESOURCE_VALUE[offer.give] + buildNeedScore(bot.resources, offer.give) * 0.35;
  const botLoss = offer.receiveAmount * RESOURCE_VALUE[offer.receive] + buildNeedScore(bot.resources, offer.receive) * 0.45;
  const proposerGain = offer.receiveAmount * RESOURCE_VALUE[offer.receive] - offer.giveAmount * RESOURCE_VALUE[offer.give];
  const points = Object.keys(G.players).map((id) => victoryPoints(G, id));
  const leaderPoints = Math.max(...points);
  const proposerIsLeader = victoryPoints(G, offer.proposer) >= leaderPoints && leaderPoints >= 5;
  const leaderPenalty = proposerIsLeader ? Math.max(0.75, proposerGain * 0.8) : 0;
  const jitter = (random() - 0.5) * 0.35;
  const score = botGain - botLoss - Math.max(0, proposerGain) * 0.55 - leaderPenalty + jitter;

  if (score >= 0.35) return { accepted: true, reason: "Accepted: useful resources for the bot." };
  if (botLoss > botGain) return { accepted: false, reason: "Bot needs those resources." };
  return { accepted: false, reason: proposerIsLeader ? "Refused: helps the leader too much." : "Refused: not enough benefit." };
}
