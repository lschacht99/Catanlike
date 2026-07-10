import type { GameState, ResourceKey, TradeOffer } from "@/types/game";

/**
 * Pure, UI-facing helpers for the duo-online trade overlay. The engine's own
 * G.pendingTrade / proposeTrade / respondTrade / cancelTrade (moves.ts) are
 * untouched — this only projects that state for rendering and adds a single
 * safety net (stale-trade detection) on top, using the exact same resource
 * check the engine already performs in respondTrade.
 */

export type OnlineTradeRole = "proposer" | "responder" | "bystander";

/** Which of the three roles the LOCAL device's own seat plays in this offer. */
export function onlineTradeRole(offer: TradeOffer | null | undefined, mySeatId: string): OnlineTradeRole {
  if (!offer) return "bystander";
  if (offer.from === mySeatId) return "proposer";
  if (offer.to === mySeatId) return "responder";
  return "bystander";
}

/**
 * The wire-facing trade record shape: {id, fromPlayerId, toPlayerId, offer,
 * request, status, createdAt}. Derived entirely from the existing TradeOffer
 * — no new persisted G fields, no non-deterministic values inside a move
 * (boardgame.io moves must stay pure/replayable, so a real Date.now() has no
 * safe home inside proposeTrade). createdAt is therefore not tracked by the
 * engine and is always null here; ordering/expiry use the room's own
 * revision, not wall-clock time.
 */
export interface OnlineTradeState {
  id: string;
  fromPlayerId: string;
  toPlayerId: string;
  offer: { resource: ResourceKey; amount: number };
  request: { resource: ResourceKey; amount: number };
  status: "pending" | "expired";
  createdAt: null;
}

export function toOnlineTradeState(offer: TradeOffer, expired: boolean): OnlineTradeState {
  return {
    id: `${offer.from}:${offer.to}:${offer.give}:${offer.giveAmount}:${offer.receive}:${offer.receiveAmount}`,
    fromPlayerId: offer.from,
    toPlayerId: offer.to,
    offer: { resource: offer.give, amount: offer.giveAmount },
    request: { resource: offer.receive, amount: offer.receiveAmount },
    status: expired ? "expired" : "pending",
    createdAt: null,
  };
}

/**
 * True when the offer can no longer be honored by the PROPOSER's own give
 * side (validated affordable at proposal time — a change means something
 * else consumed those resources meanwhile), or references a player that no
 * longer exists. The RESPONDER being unable to pay is NOT staleness — that
 * is an ordinary, expected accept/refuse decision point, already handled by
 * disabling Accept (matches the engine's own respondTrade canPay check).
 */
export function isTradeStale(G: Pick<GameState, "players">, offer: TradeOffer): boolean {
  const fromPlayer = G.players[offer.from];
  const toPlayer = G.players[offer.to];
  if (!fromPlayer || !toPlayer) return true;
  return fromPlayer.resources[offer.give] < offer.giveAmount;
}

/** The engine's own affordability check, exposed for the responder's UI. */
export function canResponderPay(G: Pick<GameState, "players">, offer: TradeOffer): boolean {
  const toPlayer = G.players[offer.to];
  return !!toPlayer && toPlayer.resources[offer.receive] >= offer.receiveAmount;
}
