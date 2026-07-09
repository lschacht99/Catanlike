// @ts-nocheck
import { INVALID_MOVE } from "boardgame.io/core";
import type { Move } from "boardgame.io";
import type {
  CommodityKey,
  GameState,
  ProgressCardType,
  ProgressTrackKey,
  ResourceCounts,
  ResourceKey,
} from "@/types/game";
import { COMMODITY_KEYS } from "@/types/game";
import {
  BANK_TRADE_RATE,
  BUILD_COSTS,
  COMMODITY_FROM_RESOURCE,
  DEV_CARD_COST,
  emptyImprovements,
  normalizeCommodities,
  KNIGHT_MAX_LEVEL,
  KNIGHT_UPGRADE_COST,
  PIECE_LIMITS,
  PROGRESS_CARD_LABELS,
  PROGRESS_DECK,
  TRACK_COMMODITY,
  totalResources,
} from "./constants";
import {
  advanceBarbarians,
  eventFromDie,
  runProgressEvent,
} from "./ck";
import { evaluateTradeOffer } from "./ai/trade";
import { isCommodity, maritimeRate, type TradeCard } from "./harbors";
import {
  banditVictims,
  canAfford,
  canBuyDevCard,
  canPayCost,
  getGeometry,
  pieceCounts,
  playableDevCardIndex,
  validBanditTiles,
  validCitySpots,
  validKnightSpots,
  validRoadSpots,
  validSettlementSpots,
} from "./rules";
import { updateLargestArmy, updateLongestRoad } from "./scoring";

const RESOURCES: ResourceKey[] = ["wood", "brick", "grain", "wool", "ore"];
const TRACKS: ProgressTrackKey[] = ["trade", "politics", "science"];

function ensureCkState(G: GameState): void {
  G.activeKnights ??= {};
  G.knightLevels ??= {};
  G.barbarianPosition ??= 0;
  G.lastEventDie ??= null;
  G.progressDeck ??= [...PROGRESS_DECK];
  G.progressDiscards ??= [];
  for (const p of Object.values(G.players)) {
    // Normalize migrates legacy `book` → `paper` and fills missing keys with 0.
    p.commodities = normalizeCommodities(p.commodities);
    p.improvements ??= emptyImprovements();
    p.progressCards ??= [];
    p.victoryBonus ??= 0;
  }
}

function pay(resources: ResourceCounts, cost: Partial<ResourceCounts>): void {
  for (const [key, amount] of Object.entries(cost) as [ResourceKey, number][]) {
    resources[key] -= amount;
  }
}

function payCommodity(G: GameState, player: string, commodity: CommodityKey, amount: number): boolean {
  ensureCkState(G);
  const purse = G.players[player].commodities;
  if (purse[commodity] < amount) return false;
  purse[commodity] -= amount;
  return true;
}

function log(G: GameState, message: string): void {
  G.log.push(message);
  if (G.log.length > 40) G.log.shift();
}

function name(G: GameState, id: string): string {
  return G.names[Number(id)] ?? `Player ${Number(id) + 1}`;
}
/** Alias used by the Cities & Knights move handlers. */
const playerName = name;

/**
 * Award one tile's production to a building's owner. Single source of truth for
 * both dice production and Cities & Knights starting-city resources:
 *   - Settlement            → +1 resource
 *   - Base-game city        → +2 resources
 *   - Cities & Knights city → wood/ore/wool give +1 resource +1 commodity
 *                             (paper/coin/cloth); brick/grain give +2 resources
 * `recordGains` feeds the "you gained" banner for dice rolls; setup skips it.
 */
export function produce(
  G: GameState,
  player: string,
  resource: ResourceKey,
  isCity: boolean,
  recordGains = true,
): void {
  const add = (n: number) => {
    G.players[player].resources[resource] += n;
    if (recordGains) {
      const gains = (G.lastGains[player] ??= {});
      gains[resource] = (gains[resource] ?? 0) + n;
    }
  };
  if (isCity && G.variant === "cities-knights") {
    const commodity = COMMODITY_FROM_RESOURCE[resource];
    if (commodity) {
      add(1);
      G.players[player].commodities![commodity] += 1;
    } else {
      add(2);
    }
  } else {
    add(isCity ? 2 : 1);
  }
}

function distribute(G: GameState, roll: number): void {
  ensureCkState(G);
  const geo = getGeometry(G.board);
  const producing = new Map(
    G.board.tiles
      .filter((t) => t.token === roll && t.id !== G.banditTile && t.resource !== "desert")
      .map((t) => [t.id, t.resource as ResourceKey]),
  );
  if (producing.size === 0) return;
  for (const vertex of Object.values(geo.vertices)) {
    const building = G.buildings[vertex.id];
    if (!building) continue;
    for (const tileId of vertex.tiles) {
      const resource = producing.get(tileId);
      if (!resource) continue;
      produce(G, building.player, resource, !!building.city);
    }
  }
}

export const placeSettlement: Move<GameState> = ({ G, playerID }, vertexId: string) => {
  ensureCkState(G);
  const player = playerID!;
  if (G.pendingSetupSettlement !== null) return INVALID_MOVE;
  if (!validSettlementSpots(G, player, true).includes(vertexId)) return INVALID_MOVE;
  // Cities & Knights setup: round 1 places a settlement, round 2 places a CITY.
  // (Standard game places a settlement both rounds.)
  const secondRound = G.setupStep >= G.numPlayers;
  const asCity = secondRound && G.variant === "cities-knights";
  G.buildings[vertexId] = { player, city: asCity };
  G.pendingSetupSettlement = vertexId;
  if (secondRound) {
    // Starting resources come from the second building's adjacent terrain: exactly
    // ONE matching resource per non-desert hex it touches — in BOTH the base game
    // and Cities & Knights. A starting C&K city does NOT pay its doubled dice
    // output here, and grants NO commodities (no paper/coin/cloth) at setup.
    const geo = getGeometry(G.board);
    for (const tileId of geo.vertices[vertexId].tiles) {
      const tile = G.board.tiles[tileId];
      if (tile.resource !== "desert") produce(G, player, tile.resource, false, false);
    }
  }
  log(G, `${name(G, player)} placed a ${asCity ? "city" : "settlement"}.`);
};

export const placeRoad: Move<GameState> = ({ G, events, playerID }, edgeId: string) => {
  ensureCkState(G);
  const player = playerID!;
  if (G.pendingSetupSettlement === null) return INVALID_MOVE;
  if (!validRoadSpots(G, player, true).includes(edgeId)) return INVALID_MOVE;
  G.roads[edgeId] = player;
  G.pendingSetupSettlement = null;
  G.setupStep += 1;
  log(G, `${name(G, player)} placed a road.`);
  events.endTurn();
};

export const rollDice: Move<GameState> = ({ G, playerID, random }) => {
  ensureCkState(G);
  if (G.hasRolled) return INVALID_MOVE;
  const dice = random.D6(2) as [number, number];
  const sum = dice[0] + dice[1];
  G.hasRolled = true;
  G.lastRoll = dice;
  G.lastGains = {};
  G.tradeRate = BANK_TRADE_RATE;
  log(G, `${name(G, playerID!)} rolled ${sum}.`);
  if (sum === 7) {
    G.mustMoveBandit = true;
  } else {
    distribute(G, sum);
  }

  // Cities & Knights: the third (event) die resolves after production. The
  // production dice double as the red (dice[0]) and yellow (dice[1]) dice;
  // the red die drives progress-card eligibility on a gate event.
  if (G.variant === "cities-knights") {
    const rng = () => random.Number();
    const face = random.D6();
    const outcome = eventFromDie(face);
    if (outcome === "barbarian") {
      G.lastEventDie = "barbarian";
      for (const line of advanceBarbarians(G, rng)) log(G, line);
    } else {
      G.lastEventDie = outcome;
      for (const line of runProgressEvent(G, outcome, dice[0], rng)) log(G, line);
    }
  }
};

export const moveBandit: Move<GameState> = (
  { G, playerID, random },
  tileId: number,
  victimId?: string,
) => {
  ensureCkState(G);
  const player = playerID!;
  if (!G.mustMoveBandit) return INVALID_MOVE;
  if (!validBanditTiles(G).includes(tileId)) return INVALID_MOVE;
  G.banditTile = tileId;
  G.mustMoveBandit = false;
  const victims = banditVictims(G, tileId, player);
  if (victims.length === 0) {
    log(G, `${name(G, player)} moved the bandit.`);
    return;
  }
  const victim = victimId !== undefined && victims.includes(victimId) ? victimId : victims[Math.floor(random.Number() * victims.length)];
  const hand = G.players[victim].resources;
  const pool: ResourceKey[] = RESOURCES.flatMap((r) => Array(hand[r]).fill(r));
  const stolen = pool[Math.floor(random.Number() * pool.length)];
  hand[stolen] -= 1;
  G.players[player].resources[stolen] += 1;
  log(G, `${name(G, player)} moved the bandit and stole from ${name(G, victim)}.`);
};

function requireRolled(G: GameState): boolean {
  return G.hasRolled && !G.mustMoveBandit;
}

export const buildRoad: Move<GameState> = ({ G, playerID }, edgeId: string) => {
  ensureCkState(G);
  const player = playerID!;
  if (!requireRolled(G)) return INVALID_MOVE;
  const free = G.freeRoads > 0;
  if (!free && !canAfford(G.players[player].resources, "road")) return INVALID_MOVE;
  if (!validRoadSpots(G, player, false).includes(edgeId)) return INVALID_MOVE;
  if (free) G.freeRoads -= 1;
  else pay(G.players[player].resources, BUILD_COSTS.road);
  G.roads[edgeId] = player;
  updateLongestRoad(G);
  log(G, `${name(G, player)} built a road${free ? " (free)" : ""}.`);
};

export const buildSettlement: Move<GameState> = ({ G, playerID }, vertexId: string) => {
  ensureCkState(G);
  const player = playerID!;
  if (!requireRolled(G)) return INVALID_MOVE;
  if (!canAfford(G.players[player].resources, "settlement")) return INVALID_MOVE;
  if (!validSettlementSpots(G, player, false).includes(vertexId)) return INVALID_MOVE;
  pay(G.players[player].resources, BUILD_COSTS.settlement);
  G.buildings[vertexId] = { player, city: false };
  // A new settlement can cut an opponent's longest road.
  updateLongestRoad(G);
  log(G, `${name(G, player)} built a settlement.`);
};

export const buildCity: Move<GameState> = ({ G, playerID }, vertexId: string) => {
  ensureCkState(G);
  const player = playerID!;
  if (!requireRolled(G)) return INVALID_MOVE;
  if (!canAfford(G.players[player].resources, "city")) return INVALID_MOVE;
  if (!validCitySpots(G, player).includes(vertexId)) return INVALID_MOVE;
  pay(G.players[player].resources, BUILD_COSTS.city);
  G.buildings[vertexId] = { player, city: true };
  log(G, `${name(G, player)} upgraded to a city.`);
};

export const buildKnight: Move<GameState> = ({ G, playerID }, vertexId: string) => {
  ensureCkState(G);
  const player = playerID!;
  if (G.variant !== "cities-knights") return INVALID_MOVE;
  if (!requireRolled(G)) return INVALID_MOVE;
  if (!canAfford(G.players[player].resources, "knight")) return INVALID_MOVE;
  if (!validKnightSpots(G, player).includes(vertexId)) return INVALID_MOVE;
  pay(G.players[player].resources, BUILD_COSTS.knight);
  G.knights[vertexId] = player;
  G.activeKnights[vertexId] = false;
  G.knightLevels![vertexId] = 1;
  log(G, `${name(G, player)} trained an inactive scout.`);
};

export const activateKnight: Move<GameState> = ({ G, playerID }, vertexId?: string) => {
  ensureCkState(G);
  const player = playerID!;
  if (G.variant !== "cities-knights") return INVALID_MOVE;
  if (!requireRolled(G)) return INVALID_MOVE;
  const id = vertexId ?? Object.entries(G.knights).find(([k, owner]) => owner === player && !G.activeKnights[k])?.[0];
  if (!id || G.knights[id] !== player || G.activeKnights[id]) return INVALID_MOVE;
  if (G.players[player].resources.grain < 1) return INVALID_MOVE;
  G.players[player].resources.grain -= 1;
  G.activeKnights[id] = true;
  log(G, `${playerName(G, player)} activated a knight.`);
};

export const deactivateKnight: Move<GameState> = ({ G, playerID }, vertexId?: string) => {
  ensureCkState(G);
  const player = playerID!;
  if (G.variant !== "cities-knights") return INVALID_MOVE;
  const id = vertexId ?? Object.entries(G.knights).find(([k, owner]) => owner === player && G.activeKnights[k])?.[0];
  if (!id || G.knights[id] !== player || !G.activeKnights[id]) return INVALID_MOVE;
  G.activeKnights[id] = false;
  log(G, `${playerName(G, player)} stood a knight down.`);
};

export const upgradeKnight: Move<GameState> = ({ G, playerID }, vertexId?: string) => {
  ensureCkState(G);
  const player = playerID!;
  if (G.variant !== "cities-knights") return INVALID_MOVE;
  if (!requireRolled(G)) return INVALID_MOVE;
  const id = vertexId ?? Object.entries(G.knights).find(
    ([k, owner]) => owner === player && (G.knightLevels[k] ?? 1) < KNIGHT_MAX_LEVEL,
  )?.[0];
  if (!id || G.knights[id] !== player) return INVALID_MOVE;
  if ((G.knightLevels[id] ?? 1) >= KNIGHT_MAX_LEVEL) return INVALID_MOVE;
  if (!canPayCost(G.players[player].resources, KNIGHT_UPGRADE_COST)) return INVALID_MOVE;
  pay(G.players[player].resources, KNIGHT_UPGRADE_COST);
  G.knightLevels[id] = (G.knightLevels[id] ?? 1) + 1;
  log(G, `${playerName(G, player)} upgraded a knight to strength ${G.knightLevels[id]}.`);
};

export function resolveBarbarian(G: GameState): void {
  ensureCkState(G);
  const activeByPlayer: Record<string, number> = {};
  for (const [id, owner] of Object.entries(G.knights ?? {})) if (G.activeKnights?.[id]) activeByPlayer[owner] = (activeByPlayer[owner] ?? 0) + (G.knightLevels?.[id] ?? 1);
  const defense = Object.values(activeByPlayer).reduce((a, b) => a + b, 0);
  const cities = Object.values(G.buildings).filter((b) => b.city).length;
  if (defense >= cities) {
    const best = Math.max(0, ...Object.values(activeByPlayer));
    for (const [player, strength] of Object.entries(activeByPlayer)) if (strength === best && best > 0) G.players[player].victoryBonus = (G.players[player].victoryBonus ?? 0) + 1;
    log(G, "Raiders were repelled. Strong defenders gained renown.");
  } else {
    for (const [player, state] of Object.entries(G.players)) {
      const hasCity = Object.values(G.buildings).some((b) => b.player === player && b.city);
      if (hasCity && !(activeByPlayer[player] > 0)) {
        const city = Object.entries(G.buildings).find(([, b]) => b.player === player && b.city)?.[0];
        if (city) G.buildings[city].city = false;
        state.victoryBonus = Math.max(0, (state.victoryBonus ?? 0) - 1);
      }
    }
    log(G, "Raiders broke through. Unprotected cities were reduced.");
  }
  for (const id of Object.keys(G.activeKnights ?? {})) G.activeKnights![id] = false;
  G.barbarianPosition = 0;
}

export const improveCity: Move<GameState> = ({ G, playerID }, track: ProgressTrackKey) => {
  ensureCkState(G);
  const player = playerID!;
  if (G.variant !== "cities-knights") return INVALID_MOVE;
  if (!requireRolled(G)) return INVALID_MOVE;
  if (!TRACKS.includes(track)) return INVALID_MOVE;
  if (!Object.values(G.buildings).some((b) => b.player === player && b.city)) return INVALID_MOVE;
  const current = G.players[player].improvements[track];
  if (current >= 3) return INVALID_MOVE;
  const commodity = TRACK_COMMODITY[track];
  const cost = current + 1;
  if (!payCommodity(G, player, commodity, cost)) return INVALID_MOVE;
  G.players[player].improvements[track] += 1;
  log(G, `${playerName(G, player)} improved ${track} to level ${current + 1}.`);
};

/**
 * Play a progress card. `choice` carries any picks the card needs
 * (resources / commodities / a target rival) so effects fully resolve.
 */
export const playProgressCard: Move<GameState> = (
  { G, playerID, random },
  card: ProgressCardType,
  choice?: {
    resources?: ResourceKey[];
    commodities?: CommodityKey[];
    target?: string;
  },
) => {
  ensureCkState(G);
  const player = playerID!;
  if (G.variant !== "cities-knights") return INVALID_MOVE;
  if (!requireRolled(G)) return INVALID_MOVE;
  const hand = G.players[player].progressCards;
  const index = hand.indexOf(card);
  if (index < 0) return INVALID_MOVE;

  const res = G.players[player].resources;
  const com = G.players[player].commodities;
  const pick = choice ?? {};
  const gainResources = (keys: ResourceKey[], n: number) => {
    const chosen = keys.slice(0, n);
    if (chosen.length < n || chosen.some((k) => !RESOURCES.includes(k))) return false;
    for (const k of chosen) res[k] += 1;
    return true;
  };
  const gainCommodities = (keys: CommodityKey[], n: number) => {
    const chosen = keys.slice(0, n);
    if (chosen.length < n || chosen.some((k) => !COMMODITY_KEYS.includes(k))) return false;
    for (const k of chosen) com[k] += 1;
    return true;
  };

  // Validate choice-dependent cards BEFORE removing the card from hand.
  switch (card) {
    case "caravan":
      if (!gainResources(pick.resources ?? [], 2)) return INVALID_MOVE;
      break;
    case "invention":
      if (!gainResources(pick.resources ?? [], 1)) return INVALID_MOVE;
      com.paper += 1;
      break;
    case "marketDay":
      if (!gainCommodities(pick.commodities ?? [], 1)) return INVALID_MOVE;
      com.cloth += 1;
      break;
    case "scholar":
      if (!gainCommodities(pick.commodities ?? [], 2)) return INVALID_MOVE;
      break;
    case "harvest":
      res.grain += 1;
      res.wool += 1;
      break;
    case "oreRush":
      res.ore += 2;
      break;
    case "roadworks":
      G.freeRoads = Math.max(G.freeRoads, 2);
      break;
    case "merchant":
      G.tradeRate = 2;
      break;
    case "warlord":
      for (const [k, owner] of Object.entries(G.knights)) {
        if (owner === player) G.activeKnights[k] = true;
      }
      break;
    case "diplomat":
      G.mustMoveBandit = true;
      break;
    case "intrigue": {
      const target = pick.target;
      if (!target || target === player || !G.players[target]) return INVALID_MOVE;
      const pool = RESOURCES.flatMap((r) => Array(G.players[target].resources[r]).fill(r));
      if (pool.length > 0) {
        const stolen = pool[Math.floor(random.Number() * pool.length)];
        G.players[target].resources[stolen] -= 1;
        res[stolen] += 1;
      }
      break;
    }
    case "levy":
      for (const [id, p] of Object.entries(G.players)) {
        if (id === player) continue;
        const pool = RESOURCES.flatMap((r) => Array(p.resources[r]).fill(r));
        if (pool.length === 0) continue;
        const taken = pool[Math.floor(random.Number() * pool.length)];
        p.resources[taken] -= 1;
        res[taken] += 1;
      }
      break;
    default:
      return INVALID_MOVE;
  }

  hand.splice(index, 1);
  G.progressDiscards.push(card);
  log(G, `${name(G, player)} played ${PROGRESS_CARD_LABELS[card]}.`);
};

/**
 * Maritime (bank) trade. Give and receive may each be a resource OR — in
 * Cities & Knights — a commodity. The rate is PER PLAYER: it depends on which
 * harbors this player's own buildings touch (and, for commodities, whether
 * they hold Merchant Guild). See `maritimeRate` for the full rule.
 */
export const bankTrade: Move<GameState> = ({ G, playerID }, give: TradeCard, receive: TradeCard) => {
  ensureCkState(G);
  const player = playerID!;
  if (!requireRolled(G)) return INVALID_MOVE;
  if (give === receive) return INVALID_MOVE;
  // Commodities only exist in Cities & Knights.
  const usesCommodity = isCommodity(give) || isCommodity(receive);
  if (usesCommodity && G.variant !== "cities-knights") return INVALID_MOVE;

  const rate = maritimeRate(G, player, give);
  const p = G.players[player];
  const giveStore = isCommodity(give) ? p.commodities! : p.resources;
  const recvStore = isCommodity(receive) ? p.commodities! : p.resources;
  if ((giveStore[give] ?? 0) < rate) return INVALID_MOVE;

  giveStore[give] -= rate;
  recvStore[receive] = (recvStore[receive] ?? 0) + 1;
  log(G, `${name(G, player)} traded ${rate} ${give} for 1 ${receive}.`);
};

// ---------------------------------------------------------------------------
// Development cards
// ---------------------------------------------------------------------------

export const buyDevCard: Move<GameState> = ({ G, playerID, ctx }) => {
  const player = playerID!;
  if (!requireRolled(G)) return INVALID_MOVE;
  if (!canBuyDevCard(G, player)) return INVALID_MOVE;
  pay(G.players[player].resources, DEV_CARD_COST);
  const type = G.devDeck.pop()!;
  G.players[player].devCards.push({ type, turnBought: ctx.turn });
  log(G, `${name(G, player)} bought a journey card.`);
};

/** Remove one playable card of `type` from the hand, or fail. */
function consumeCard(
  G: GameState,
  player: string,
  type: "knight" | "roadBuilding" | "yearOfPlenty" | "monopoly",
  turn: number,
): boolean {
  const index = playableDevCardIndex(G, player, type, turn);
  if (index === -1) return false;
  G.players[player].devCards.splice(index, 1);
  G.playedDevCardThisTurn = true;
  return true;
}

export const playKnight: Move<GameState> = ({ G, playerID, ctx }) => {
  const player = playerID!;
  if (!requireRolled(G)) return INVALID_MOVE;
  if (!consumeCard(G, player, "knight", ctx.turn)) return INVALID_MOVE;
  G.players[player].knightsPlayed += 1;
  G.mustMoveBandit = true;
  updateLargestArmy(G);
  log(G, `${name(G, player)} played a Knight.`);
};

export const playRoadBuilding: Move<GameState> = ({ G, playerID, ctx }) => {
  const player = playerID!;
  if (!requireRolled(G)) return INVALID_MOVE;
  const roadsLeft = PIECE_LIMITS.road - pieceCounts(G, player).roads;
  if (roadsLeft <= 0) return INVALID_MOVE;
  if (!consumeCard(G, player, "roadBuilding", ctx.turn)) return INVALID_MOVE;
  G.freeRoads = Math.min(2, roadsLeft);
  log(G, `${name(G, player)} played Road Building — ${G.freeRoads} free roads.`);
};

export const playYearOfPlenty: Move<GameState> = (
  { G, playerID, ctx },
  first: ResourceKey,
  second: ResourceKey,
) => {
  const player = playerID!;
  if (!requireRolled(G)) return INVALID_MOVE;
  if (!RESOURCES.includes(first) || !RESOURCES.includes(second)) return INVALID_MOVE;
  if (!consumeCard(G, player, "yearOfPlenty", ctx.turn)) return INVALID_MOVE;
  G.players[player].resources[first] += 1;
  G.players[player].resources[second] += 1;
  log(G, `${name(G, player)} played Year of Plenty.`);
};

export const playMonopoly: Move<GameState> = (
  { G, playerID, ctx },
  resource: ResourceKey,
) => {
  const player = playerID!;
  if (!requireRolled(G)) return INVALID_MOVE;
  if (!RESOURCES.includes(resource)) return INVALID_MOVE;
  if (!consumeCard(G, player, "monopoly", ctx.turn)) return INVALID_MOVE;
  let taken = 0;
  for (const [id, state] of Object.entries(G.players)) {
    if (id === player) continue;
    taken += state.resources[resource];
    state.resources[resource] = 0;
  }
  G.players[player].resources[resource] += taken;
  log(G, `${name(G, player)} played Monopoly and took ${taken} ${resource}.`);
};

/** Direct trade between the current player and a chosen rival. */
/**
 * Settle an accepted offer by moving resources. Assumes both sides can pay;
 * callers validate first. Kept internal so accept paths share one code path.
 */
function settleTrade(G: GameState, offer: import("@/types/game").TradeOffer): void {
  const proposer = G.players[offer.from].resources;
  const responder = G.players[offer.to].resources;
  proposer[offer.give] -= offer.giveAmount;
  responder[offer.give] += offer.giveAmount;
  responder[offer.receive] -= offer.receiveAmount;
  proposer[offer.receive] += offer.receiveAmount;
}

/**
 * Propose a player-to-player trade. Only the proposer's own ability to pay is
 * checked here — the proposer must NOT be able to gate on the target's hand.
 * If the target is a bot, the offer is evaluated and resolved immediately;
 * otherwise it is parked in `G.pendingTrade` for a private human response.
 */
export const proposeTrade: Move<GameState> = (
  { G, playerID, random },
  targetPlayer: string,
  give: ResourceKey,
  giveAmount: number,
  receive: ResourceKey,
  receiveAmount: number,
) => {
  ensureCkState(G);
  const player = playerID!;
  if (!requireRolled(G)) return INVALID_MOVE;
  if (G.pendingTrade) return INVALID_MOVE;
  if (targetPlayer === player || !G.players[targetPlayer]) return INVALID_MOVE;
  if (!RESOURCES.includes(give) || !RESOURCES.includes(receive)) return INVALID_MOVE;
  if (give === receive) return INVALID_MOVE;
  if (!Number.isInteger(giveAmount) || !Number.isInteger(receiveAmount)) return INVALID_MOVE;
  if (giveAmount < 1 || receiveAmount < 1) return INVALID_MOVE;
  if (G.players[player].resources[give] < giveAmount) return INVALID_MOVE;

  const offer = { from: player, to: targetPlayer, give, giveAmount, receive, receiveAmount };
  const targetIsBot = (G.playerModes ?? [])[Number(targetPlayer)] === "bot";

  if (targetIsBot) {
    const evalResult = evaluateTradeOffer(G, offer, () => random.Number());
    const canPay = G.players[targetPlayer].resources[receive] >= receiveAmount;
    const accepted = canPay && evalResult.accept;
    if (accepted) settleTrade(G, offer);
    G.lastTradeResult = {
      offer,
      accepted,
      reason: canPay ? evalResult.reason : "Not enough resources to pay.",
      respondedByBot: true,
    };
    log(
      G,
      `${name(G, targetPlayer)} ${accepted ? "accepted" : "refused"} a trade from ${name(G, player)}.`,
    );
    return;
  }

  G.pendingTrade = offer;
  G.lastTradeResult = null;
  log(G, `${name(G, player)} proposed a trade to ${name(G, targetPlayer)}.`);
};

/** The target of a pending human trade accepts or refuses it. */
export const respondTrade: Move<GameState> = ({ G, playerID }, accept: boolean) => {
  ensureCkState(G);
  const offer = G.pendingTrade;
  if (!offer) return INVALID_MOVE;
  // Pass-and-play uses a single seat-less client (playerID null); the UI gates
  // who answers. Online: only the addressed player (or proposer) may respond.
  if (playerID != null && playerID !== offer.to && playerID !== offer.from) {
    return INVALID_MOVE;
  }
  if (playerID === offer.from && accept) return INVALID_MOVE;

  const canPay = G.players[offer.to].resources[offer.receive] >= offer.receiveAmount &&
    G.players[offer.from].resources[offer.give] >= offer.giveAmount;
  const accepted = accept && canPay;
  if (accepted) settleTrade(G, offer);
  G.pendingTrade = null;
  G.lastTradeResult = {
    offer,
    accepted,
    reason: accept && !canPay ? "Resources changed — trade void." : undefined,
  };
  log(G, `${name(G, offer.to)} ${accepted ? "accepted" : "declined"} the trade.`);
};

/** Proposer cancels an outstanding offer. */
export const cancelTrade: Move<GameState> = ({ G, playerID }) => {
  ensureCkState(G);
  if (!G.pendingTrade) return INVALID_MOVE;
  if (playerID != null && G.pendingTrade.from !== playerID) return INVALID_MOVE;
  G.pendingTrade = null;
};

/** Dismiss the last trade result banner (both parties). */
export const clearTradeResult: Move<GameState> = ({ G }) => {
  G.lastTradeResult = null;
};

export const endTurn: Move<GameState> = ({ G, events, playerID }) => {
  ensureCkState(G);
  if (!requireRolled(G)) return INVALID_MOVE;
  G.freeRoads = 0;
  log(G, `${name(G, playerID!)} ended their turn.`);
  events.endTurn();
};

export { totalResources, canPayCost };
