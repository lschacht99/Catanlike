// @ts-nocheck
import { INVALID_MOVE } from "boardgame.io/core";
import type { Move } from "boardgame.io";
import type { GameState, ProgressCardType, ProgressTrackKey, ResourceCounts, ResourceKey } from "@/types/game";
import {
  BANK_TRADE_RATE,
  BUILD_COSTS,
  DEV_CARD_COST,
  emptyCommodities,
  emptyImprovements,
  PIECE_LIMITS,
  PROGRESS_DECK,
  totalResources,
} from "./constants";
import {
  banditVictims,
  canAfford,
  canBankTrade,
  canBuyDevCard,
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

function ensureExpandedState(G: GameState): void {
  G.knights ??= {};
  G.activeKnights ??= {};
  G.barbarianPosition ??= 0;
  G.lastEventDie ??= null;
  G.progressDeck ??= [...PROGRESS_DECK];
  G.progressDiscards ??= [];
  G.lastGains ??= {};
  G.freeRoads ??= 0;
  G.playedDevCardThisTurn ??= false;
  for (const p of Object.values(G.players)) {
    p.commodities ??= emptyCommodities();
    p.improvements ??= emptyImprovements();
    p.progressCards ??= [];
    p.victoryBonus ??= 0;
    p.devCards ??= [];
    p.knightsPlayed ??= 0;
  }
}

function pay(resources: ResourceCounts, cost: Partial<ResourceCounts>): void {
  for (const [key, amount] of Object.entries(cost) as [ResourceKey, number][]) {
    resources[key] -= amount;
  }
}

function log(G: GameState, message: string): void {
  G.log.push(message);
  if (G.log.length > 40) G.log.shift();
}

function name(G: GameState, id: string): string {
  return (G.playerNames ?? G.names)[Number(id)] ?? `Player ${Number(id) + 1}`;
}

function requireRolled(G: GameState): boolean {
  return G.hasRolled && !G.mustMoveBandit;
}

function drawProgressCard(G: GameState, player: string, random?: { Number: () => number }): void {
  ensureExpandedState(G);
  if (G.progressDeck.length === 0) {
    G.progressDeck = G.progressDiscards.length ? [...G.progressDiscards] : [...PROGRESS_DECK];
    G.progressDiscards = [];
  }
  if (!G.progressDeck.length) return;
  const index = random ? Math.floor(random.Number() * G.progressDeck.length) : 0;
  const [card] = G.progressDeck.splice(index, 1);
  G.players[player].progressCards.push(card);
  log(G, `${name(G, player)} drew ${PROGRESS_CARD_LABELS[card]}.`);
}

function distribute(G: GameState, roll: number): void {
  ensureExpandedState(G);
  const geo = getGeometry(G.board);
  const producing = new Map(
    G.board.tiles
      .filter((t) => t.token === roll && t.id !== G.banditTile && t.resource !== "desert")
      .map((t) => [t.id, t.resource as ResourceKey]),
  );
  G.lastGains = {};
  for (const vertex of Object.values(geo.vertices)) {
    const building = G.buildings[vertex.id];
    if (!building) continue;
    for (const tileId of vertex.tiles) {
      const resource = producing.get(tileId);
      if (!resource) continue;
      const amount = building.city ? 2 : 1;
      G.players[building.player].resources[resource] += amount;
      const gains = (G.lastGains[building.player] ??= {});
      gains[resource] = (gains[resource] ?? 0) + amount;
    }
  }
}

export const placeSettlement: Move<GameState> = ({ G, playerID }, vertexId: string) => {
  ensureExpandedState(G);
  const player = playerID!;
  if (G.pendingSetupSettlement !== null) return INVALID_MOVE;
  if (!validSettlementSpots(G, player, true).includes(vertexId)) return INVALID_MOVE;
  G.buildings[vertexId] = { player, city: false };
  G.pendingSetupSettlement = vertexId;
  if (G.setupStep >= G.numPlayers) {
    const geo = getGeometry(G.board);
    for (const tileId of geo.vertices[vertexId].tiles) {
      const tile = G.board.tiles[tileId];
      if (tile.resource !== "desert") G.players[player].resources[tile.resource] += 1;
    }
  }
  log(G, `${name(G, player)} placed a settlement.`);
};

export const placeRoad: Move<GameState> = ({ G, events, playerID }, edgeId: string) => {
  ensureExpandedState(G);
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
  ensureExpandedState(G);
  if (G.hasRolled) return INVALID_MOVE;
  const dice = random.D6(2) as [number, number];
  const sum = dice[0] + dice[1];
  G.hasRolled = true;
  G.lastRoll = dice;
  G.lastGains = {};
  log(G, `${name(G, playerID!)} rolled ${sum}.`);

  if (G.variant === "cities-knights") {
    const event = random.D6();
    if (event <= 3) {
      G.lastEventDie = "barbarian";
      G.barbarianPosition = Math.min(7, (G.barbarianPosition ?? 0) + 1);
      log(G, `Raiders advanced to ${G.barbarianPosition}/7.`);
      if (G.barbarianPosition >= 7) {
        for (const id of Object.keys(G.activeKnights ?? {})) G.activeKnights[id] = false;
        G.barbarianPosition = 0;
        log(G, "Raiders arrived. Active scouts return to camp.");
      }
    } else {
      const track = TRACKS[event - 4];
      G.lastEventDie = track;
      if ((G.players[playerID!].improvements?.[track] ?? 0) > 0) drawProgressCard(G, playerID!, random);
    }
  }
};

export const moveBandit: Move<GameState> = ({ G, playerID, random }, tileId: number, victimId?: string) => {
  ensureExpandedState(G);
  const player = playerID!;
  if (!G.mustMoveBandit) return INVALID_MOVE;
  if (!validBanditTiles(G).includes(tileId)) return INVALID_MOVE;
  G.banditTile = tileId;
  G.mustMoveBandit = false;
  const victims = banditVictims(G, tileId, player);
  if (!victims.length) {
    log(G, `${name(G, player)} moved the bandit.`);
    return;
  }
  const victim = victimId !== undefined && victims.includes(victimId) ? victimId : victims[Math.floor(random.Number() * victims.length)];
  const hand = G.players[victim].resources;
  const pool: ResourceKey[] = RESOURCES.flatMap((r) => Array(hand[r]).fill(r));
  const stolen = pool[Math.floor(random.Number() * pool.length)];
  if (!stolen) return;
  hand[stolen] -= 1;
  G.players[player].resources[stolen] += 1;
  log(G, `${name(G, player)} moved the bandit and stole from ${name(G, victim)}.`);
};

export const buildRoad: Move<GameState> = ({ G, playerID }, edgeId: string) => {
  ensureExpandedState(G);
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
  ensureExpandedState(G);
  const player = playerID!;
  if (!requireRolled(G)) return INVALID_MOVE;
  if (!canAfford(G.players[player].resources, "settlement")) return INVALID_MOVE;
  if (!validSettlementSpots(G, player, false).includes(vertexId)) return INVALID_MOVE;
  pay(G.players[player].resources, BUILD_COSTS.settlement);
  G.buildings[vertexId] = { player, city: false };
  updateLongestRoad(G);
  log(G, `${name(G, player)} built a settlement.`);
};

export const buildCity: Move<GameState> = ({ G, playerID }, vertexId: string) => {
  ensureExpandedState(G);
  const player = playerID!;
  if (!requireRolled(G)) return INVALID_MOVE;
  if (!canAfford(G.players[player].resources, "city")) return INVALID_MOVE;
  if (!validCitySpots(G, player).includes(vertexId)) return INVALID_MOVE;
  pay(G.players[player].resources, BUILD_COSTS.city);
  G.buildings[vertexId] = { player, city: true };
  log(G, `${name(G, player)} upgraded to a city.`);
};

export const buildKnight: Move<GameState> = ({ G, playerID }, vertexId: string) => {
  ensureExpandedState(G);
  const player = playerID!;
  if (G.variant !== "cities-knights") return INVALID_MOVE;
  if (!requireRolled(G)) return INVALID_MOVE;
  if (!canAfford(G.players[player].resources, "knight")) return INVALID_MOVE;
  if (!validKnightSpots(G, player).includes(vertexId)) return INVALID_MOVE;
  pay(G.players[player].resources, BUILD_COSTS.knight);
  G.knights[vertexId] = player;
  G.activeKnights[vertexId] = false;
  log(G, `${name(G, player)} trained an inactive scout.`);
};

export const activateKnight: Move<GameState> = ({ G, playerID }, vertexId?: string) => {
  ensureExpandedState(G);
  const player = playerID!;
  if (G.variant !== "cities-knights") return INVALID_MOVE;
  if (!requireRolled(G)) return INVALID_MOVE;
  const id = vertexId ?? Object.entries(G.knights).find(([k, owner]) => owner === player && !G.activeKnights[k])?.[0];
  if (!id || G.knights[id] !== player || G.activeKnights[id]) return INVALID_MOVE;
  if (G.players[player].resources.grain < 1) return INVALID_MOVE;
  G.players[player].resources.grain -= 1;
  G.activeKnights[id] = true;
  log(G, `${name(G, player)} activated a scout.`);
};

export const improveCity: Move<GameState> = ({ G, playerID }, track: ProgressTrackKey) => {
  ensureExpandedState(G);
  const player = playerID!;
  if (G.variant !== "cities-knights") return INVALID_MOVE;
  if (!requireRolled(G)) return INVALID_MOVE;
  if (!TRACKS.includes(track)) return INVALID_MOVE;
  if (!Object.values(G.buildings).some((b) => b.player === player && b.city)) return INVALID_MOVE;
  const current = G.players[player].improvements[track] ?? 0;
  if (current >= 3) return INVALID_MOVE;
  const commodity = TRACK_COMMODITY[track];
  const cost = current + 1;
  if ((G.players[player].commodities?.[commodity] ?? 0) < cost) return INVALID_MOVE;
  G.players[player].commodities[commodity] -= cost;
  G.players[player].improvements[track] = current + 1;
  log(G, `${name(G, player)} improved ${track} to level ${current + 1}.`);
};

export const playProgressCard: Move<GameState> = ({ G, playerID }, card: ProgressCardType) => {
  ensureExpandedState(G);
  const player = playerID!;
  if (G.variant !== "cities-knights") return INVALID_MOVE;
  if (!requireRolled(G)) return INVALID_MOVE;
  const hand = G.players[player].progressCards ?? [];
  const index = hand.indexOf(card);
  if (index < 0) return INVALID_MOVE;
  hand.splice(index, 1);
  G.progressDiscards.push(card);
  if (card === "roadworks") { G.players[player].resources.wood += 1; G.players[player].resources.brick += 1; }
  else if (card === "harvest") { G.players[player].resources.grain += 1; G.players[player].resources.wool += 1; }
  else if (card === "oreRush") G.players[player].resources.ore += 2;
  else if (card === "merchant") { G.players[player].commodities.coin += 1; G.players[player].commodities.cloth += 1; }
  else if (card === "diplomat") { G.players[player].resources.wood += 1; G.players[player].resources.brick += 1; }
  else if (card === "invention") { G.players[player].resources.grain += 1; G.players[player].commodities.book += 1; }
  log(G, `${name(G, player)} played ${PROGRESS_CARD_LABELS[card]}.`);
};

export const bankTrade: Move<GameState> = ({ G, playerID }, give: ResourceKey, receive: ResourceKey) => {
  ensureExpandedState(G);
  const player = playerID!;
  if (!requireRolled(G)) return INVALID_MOVE;
  const hand = G.players[player].resources;
  if (!canBankTrade(hand, give, receive)) return INVALID_MOVE;
  hand[give] -= BANK_TRADE_RATE;
  hand[receive] += 1;
  log(G, `${name(G, player)} traded ${BANK_TRADE_RATE} ${give} for 1 ${receive}.`);
};

export const playerTrade: Move<GameState> = ({ G, playerID }, targetPlayer: string, give: ResourceKey, giveAmount: number, receive: ResourceKey, receiveAmount: number) => {
  ensureExpandedState(G);
  const player = playerID!;
  if (!requireRolled(G)) return INVALID_MOVE;
  if (!G.players[targetPlayer] || targetPlayer === player || give === receive) return INVALID_MOVE;
  if (giveAmount < 1 || receiveAmount < 1 || giveAmount > 9 || receiveAmount > 9) return INVALID_MOVE;
  const currentHand = G.players[player].resources;
  const targetHand = G.players[targetPlayer].resources;
  if (currentHand[give] < giveAmount || targetHand[receive] < receiveAmount) return INVALID_MOVE;
  currentHand[give] -= giveAmount;
  targetHand[give] += giveAmount;
  targetHand[receive] -= receiveAmount;
  currentHand[receive] += receiveAmount;
  log(G, `${name(G, player)} traded with ${name(G, targetPlayer)}.`);
};

export const buyDevCard: Move<GameState> = ({ G, playerID, ctx }) => {
  ensureExpandedState(G);
  const player = playerID!;
  if (!requireRolled(G)) return INVALID_MOVE;
  if (!canBuyDevCard(G, player)) return INVALID_MOVE;
  pay(G.players[player].resources, DEV_CARD_COST);
  const type = G.devDeck.pop();
  if (!type) return INVALID_MOVE;
  G.players[player].devCards.push({ type, turnBought: ctx.turn });
  log(G, `${name(G, player)} bought a journey card.`);
};

function consumeCard(G: GameState, player: string, type: "knight" | "roadBuilding" | "yearOfPlenty" | "monopoly", turn: number): boolean {
  const index = playableDevCardIndex(G, player, type, turn);
  if (index === -1) return false;
  G.players[player].devCards.splice(index, 1);
  G.playedDevCardThisTurn = true;
  return true;
}

export const playKnight: Move<GameState> = ({ G, playerID, ctx }) => {
  ensureExpandedState(G);
  const player = playerID!;
  if (!requireRolled(G)) return INVALID_MOVE;
  if (!consumeCard(G, player, "knight", ctx.turn)) return INVALID_MOVE;
  G.players[player].knightsPlayed += 1;
  G.mustMoveBandit = true;
  updateLargestArmy(G);
  log(G, `${name(G, player)} played a Knight.`);
};

export const playRoadBuilding: Move<GameState> = ({ G, playerID, ctx }) => {
  ensureExpandedState(G);
  const player = playerID!;
  if (!requireRolled(G)) return INVALID_MOVE;
  const roadsLeft = PIECE_LIMITS.road - pieceCounts(G, player).roads;
  if (roadsLeft <= 0) return INVALID_MOVE;
  if (!consumeCard(G, player, "roadBuilding", ctx.turn)) return INVALID_MOVE;
  G.freeRoads = Math.min(2, roadsLeft);
  log(G, `${name(G, player)} played Road Building.`);
};

export const playYearOfPlenty: Move<GameState> = ({ G, playerID, ctx }, first: ResourceKey, second: ResourceKey) => {
  ensureExpandedState(G);
  const player = playerID!;
  if (!requireRolled(G)) return INVALID_MOVE;
  if (!RESOURCES.includes(first) || !RESOURCES.includes(second)) return INVALID_MOVE;
  if (!consumeCard(G, player, "yearOfPlenty", ctx.turn)) return INVALID_MOVE;
  G.players[player].resources[first] += 1;
  G.players[player].resources[second] += 1;
  log(G, `${name(G, player)} played Year of Plenty.`);
};

export const playMonopoly: Move<GameState> = ({ G, playerID, ctx }, resource: ResourceKey) => {
  ensureExpandedState(G);
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
export const playerTrade: Move<GameState> = (
  { G, playerID },
  targetPlayer: string,
  give: ResourceKey,
  giveAmount: number,
  receive: ResourceKey,
  receiveAmount: number,
) => {
  ensureCkState(G);
  const player = playerID!;
  if (!requireRolled(G)) return INVALID_MOVE;
  if (targetPlayer === player || !G.players[targetPlayer]) return INVALID_MOVE;
  if (!RESOURCES.includes(give) || !RESOURCES.includes(receive)) return INVALID_MOVE;
  if (give === receive) return INVALID_MOVE;
  if (!Number.isInteger(giveAmount) || !Number.isInteger(receiveAmount)) return INVALID_MOVE;
  if (giveAmount < 1 || receiveAmount < 1) return INVALID_MOVE;
  const mine = G.players[player].resources;
  const theirs = G.players[targetPlayer].resources;
  if (mine[give] < giveAmount || theirs[receive] < receiveAmount) return INVALID_MOVE;
  mine[give] -= giveAmount;
  theirs[give] += giveAmount;
  theirs[receive] -= receiveAmount;
  mine[receive] += receiveAmount;
  log(
    G,
    `${name(G, player)} traded ${giveAmount} ${give} to ${name(G, targetPlayer)} for ${receiveAmount} ${receive}.`,
  );
};

export const endTurn: Move<GameState> = ({ G, events, playerID }) => {
  ensureExpandedState(G);
  if (!requireRolled(G)) return INVALID_MOVE;
  G.freeRoads = 0;
  log(G, `${name(G, playerID!)} ended their turn.`);
  events.endTurn();
};

export { totalResources };
