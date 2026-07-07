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
import {
  BANK_TRADE_RATE,
  BARBARIAN_TRACK_LENGTH,
  BUILD_COSTS,
  COMMODITY_FROM_RESOURCE,
  emptyCommodities,
  emptyImprovements,
  PLAYER_NAMES,
  PROGRESS_CARD_LABELS,
  PROGRESS_DECK,
  TRACK_COMMODITY,
  totalResources,
} from "./constants";
import {
  banditVictims,
  canAfford,
  canBankTrade,
  getGeometry,
  validBanditTiles,
  validCitySpots,
  validKnightSpots,
  validRoadSpots,
  validSettlementSpots,
} from "./rules";

const RESOURCES: ResourceKey[] = ["wood", "brick", "grain", "wool", "ore"];
const TRACKS: ProgressTrackKey[] = ["trade", "politics", "science"];

function ensureCkState(G: GameState): void {
  G.activeKnights ??= {};
  G.barbarianPosition ??= 0;
  G.lastEventDie ??= null;
  G.progressDeck ??= [...PROGRESS_DECK];
  G.progressDiscards ??= [];
  for (const p of Object.values(G.players)) {
    p.commodities ??= emptyCommodities();
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

function playerName(G: GameState, id: string): string {
  return G.playerNames[Number(id)] ?? PLAYER_NAMES[Number(id)] ?? `Player ${Number(id) + 1}`;
}

function drawProgressCard(G: GameState, player: string, random?: { Number: () => number }): ProgressCardType | null {
  ensureCkState(G);
  if (G.progressDeck.length === 0) {
    G.progressDeck = G.progressDiscards.length > 0 ? [...G.progressDiscards] : [...PROGRESS_DECK];
    G.progressDiscards = [];
  }
  if (G.progressDeck.length === 0) return null;
  const index = random ? Math.floor(random.Number() * G.progressDeck.length) : 0;
  const [card] = G.progressDeck.splice(index, 1);
  G.players[player].progressCards.push(card);
  log(G, `${playerName(G, player)} drew ${PROGRESS_CARD_LABELS[card]}.`);
  return card;
}

function cityCount(G: GameState): number {
  return Object.values(G.buildings).filter((b) => b.city).length;
}

function activeStrength(G: GameState, player: string): number {
  ensureCkState(G);
  return Object.entries(G.knights).filter(([id, owner]) => owner === player && G.activeKnights[id]).length;
}

function resolveBarbarians(G: GameState, random?: { Number: () => number }): void {
  ensureCkState(G);
  const cities = cityCount(G);
  const totalStrength = Object.keys(G.players).reduce((sum, id) => sum + activeStrength(G, id), 0);

  if (cities === 0) {
    log(G, "The raiders arrived, but no cities were exposed.");
  } else if (totalStrength >= cities) {
    const defenders = Object.keys(G.players).sort((a, b) => activeStrength(G, b) - activeStrength(G, a));
    const best = defenders[0];
    drawProgressCard(G, best, random);
    log(G, `The island was defended. ${playerName(G, best)} led the defense.`);
  } else {
    const cityOwners = Object.entries(G.buildings).filter(([, b]) => b.city).map(([, b]) => b.player);
    const weakest = [...new Set(cityOwners)].sort((a, b) => activeStrength(G, a) - activeStrength(G, b))[0];
    const city = Object.entries(G.buildings).find(([, b]) => b.player === weakest && b.city);
    if (city) {
      G.buildings[city[0]] = { player: weakest, city: false };
      log(G, `${playerName(G, weakest)} lost a city to the raiders.`);
    }
  }

  for (const id of Object.keys(G.activeKnights)) G.activeKnights[id] = false;
  G.barbarianPosition = 0;
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
      const commodity = COMMODITY_FROM_RESOURCE[resource];
      if (G.variant === "cities-knights" && building.city && commodity) {
        G.players[building.player].resources[resource] += 1;
        G.players[building.player].commodities[commodity] += 1;
      } else {
        G.players[building.player].resources[resource] += building.city ? 2 : 1;
      }
    }
  }
}

export const placeSettlement: Move<GameState> = ({ G, playerID }, vertexId: string) => {
  ensureCkState(G);
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
  log(G, `${playerName(G, player)} placed a settlement.`);
};

export const placeRoad: Move<GameState> = ({ G, events, playerID }, edgeId: string) => {
  ensureCkState(G);
  const player = playerID!;
  if (G.pendingSetupSettlement === null) return INVALID_MOVE;
  if (!validRoadSpots(G, player, true).includes(edgeId)) return INVALID_MOVE;
  G.roads[edgeId] = player;
  G.pendingSetupSettlement = null;
  G.setupStep += 1;
  log(G, `${playerName(G, player)} placed a road.`);
  events.endTurn();
};

export const rollDice: Move<GameState> = ({ G, playerID, random }) => {
  ensureCkState(G);
  if (G.hasRolled) return INVALID_MOVE;
  const dice = random.D6(2) as [number, number];
  const sum = dice[0] + dice[1];
  G.hasRolled = true;
  G.lastRoll = dice;
  log(G, `${playerName(G, playerID!)} rolled ${sum}.`);

  if (G.variant === "cities-knights") {
    const event = random.D6();
    if (event <= 3) {
      G.lastEventDie = "barbarian";
      G.barbarianPosition += 1;
      log(G, `Raiders advanced to ${G.barbarianPosition}/${BARBARIAN_TRACK_LENGTH}.`);
      if (G.barbarianPosition >= BARBARIAN_TRACK_LENGTH) resolveBarbarians(G, random);
    } else {
      const track = TRACKS[event - 4];
      G.lastEventDie = track;
      const level = G.players[playerID!].improvements[track];
      if (level > 0 && random.D6() <= level + 1) drawProgressCard(G, playerID!, random);
    }
  }

  if (sum === 7) G.mustMoveBandit = true;
  else distribute(G, sum);
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
    log(G, `${playerName(G, player)} moved the bandit.`);
    return;
  }
  const victim = victimId !== undefined && victims.includes(victimId) ? victimId : victims[Math.floor(random.Number() * victims.length)];
  const hand = G.players[victim].resources;
  const pool: ResourceKey[] = RESOURCES.flatMap((r) => Array(hand[r]).fill(r));
  const stolen = pool[Math.floor(random.Number() * pool.length)];
  hand[stolen] -= 1;
  G.players[player].resources[stolen] += 1;
  log(G, `${playerName(G, player)} moved the bandit and stole from ${playerName(G, victim)}.`);
};

function requireRolled(G: GameState): boolean {
  return G.hasRolled && !G.mustMoveBandit;
}

export const buildRoad: Move<GameState> = ({ G, playerID }, edgeId: string) => {
  ensureCkState(G);
  const player = playerID!;
  if (!requireRolled(G)) return INVALID_MOVE;
  if (!canAfford(G.players[player].resources, "road")) return INVALID_MOVE;
  if (!validRoadSpots(G, player, false).includes(edgeId)) return INVALID_MOVE;
  pay(G.players[player].resources, BUILD_COSTS.road);
  G.roads[edgeId] = player;
  log(G, `${playerName(G, player)} built a road.`);
};

export const buildSettlement: Move<GameState> = ({ G, playerID }, vertexId: string) => {
  ensureCkState(G);
  const player = playerID!;
  if (!requireRolled(G)) return INVALID_MOVE;
  if (!canAfford(G.players[player].resources, "settlement")) return INVALID_MOVE;
  if (!validSettlementSpots(G, player, false).includes(vertexId)) return INVALID_MOVE;
  pay(G.players[player].resources, BUILD_COSTS.settlement);
  G.buildings[vertexId] = { player, city: false };
  log(G, `${playerName(G, player)} built a settlement.`);
};

export const buildCity: Move<GameState> = ({ G, playerID }, vertexId: string) => {
  ensureCkState(G);
  const player = playerID!;
  if (!requireRolled(G)) return INVALID_MOVE;
  if (!canAfford(G.players[player].resources, "city")) return INVALID_MOVE;
  if (!validCitySpots(G, player).includes(vertexId)) return INVALID_MOVE;
  pay(G.players[player].resources, BUILD_COSTS.city);
  G.buildings[vertexId] = { player, city: true };
  log(G, `${playerName(G, player)} upgraded to a city.`);
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
  log(G, `${playerName(G, player)} trained an inactive knight.`);
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

export const playProgressCard: Move<GameState> = ({ G, playerID }, card: ProgressCardType) => {
  ensureCkState(G);
  const player = playerID!;
  if (G.variant !== "cities-knights") return INVALID_MOVE;
  if (!requireRolled(G)) return INVALID_MOVE;
  const hand = G.players[player].progressCards;
  const index = hand.indexOf(card);
  if (index < 0) return INVALID_MOVE;
  hand.splice(index, 1);
  G.progressDiscards.push(card);

  if (card === "roadworks") {
    G.players[player].resources.wood += 1;
    G.players[player].resources.brick += 1;
  } else if (card === "harvest") {
    G.players[player].resources.grain += 1;
    G.players[player].resources.wool += 1;
  } else if (card === "oreRush") {
    G.players[player].resources.ore += 2;
  } else if (card === "merchant") {
    G.players[player].commodities.coin += 1;
    G.players[player].commodities.cloth += 1;
  } else if (card === "diplomat") {
    G.players[player].resources.wood += 1;
    G.players[player].resources.brick += 1;
  } else if (card === "invention") {
    G.players[player].resources.grain += 1;
    G.players[player].commodities.book += 1;
  }
  log(G, `${playerName(G, player)} played ${PROGRESS_CARD_LABELS[card]}.`);
};

export const bankTrade: Move<GameState> = ({ G, playerID }, give: ResourceKey, receive: ResourceKey) => {
  ensureCkState(G);
  const player = playerID!;
  if (!requireRolled(G)) return INVALID_MOVE;
  const hand = G.players[player].resources;
  if (!canBankTrade(hand, give, receive)) return INVALID_MOVE;
  hand[give] -= BANK_TRADE_RATE;
  hand[receive] += 1;
  log(G, `${playerName(G, player)} traded ${BANK_TRADE_RATE} ${give} for 1 ${receive}.`);
};

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
  if (!G.players[targetPlayer] || targetPlayer === player) return INVALID_MOVE;
  if (give === receive) return INVALID_MOVE;
  if (giveAmount < 1 || receiveAmount < 1 || giveAmount > 9 || receiveAmount > 9) return INVALID_MOVE;
  const currentHand = G.players[player].resources;
  const targetHand = G.players[targetPlayer].resources;
  if (currentHand[give] < giveAmount) return INVALID_MOVE;
  if (targetHand[receive] < receiveAmount) return INVALID_MOVE;
  currentHand[give] -= giveAmount;
  targetHand[give] += giveAmount;
  targetHand[receive] -= receiveAmount;
  currentHand[receive] += receiveAmount;
  log(G, `${playerName(G, player)} traded with ${playerName(G, targetPlayer)}.`);
};

export const endTurn: Move<GameState> = ({ G, events, playerID }) => {
  ensureCkState(G);
  if (!requireRolled(G)) return INVALID_MOVE;
  log(G, `${playerName(G, playerID!)} ended their turn.`);
  events.endTurn();
};

export { totalResources };
