import { INVALID_MOVE } from "boardgame.io/core";
import type { Move } from "boardgame.io";
import type { GameState, ResourceCounts, ResourceKey } from "@/types/game";
import {
  BANK_TRADE_RATE,
  BUILD_COSTS,
  DEV_CARD_COST,
  PIECE_LIMITS,
  totalResources,
} from "./constants";
import {
  banditVictims,
  canAfford,
  canBankTrade,
  canBuyDevCard,
  canPayCost,
  getGeometry,
  pieceCounts,
  playableDevCardIndex,
  validBanditTiles,
  validCitySpots,
  validRoadSpots,
  validSettlementSpots,
} from "./rules";
import { updateLargestArmy, updateLongestRoad } from "./scoring";

const RESOURCES: ResourceKey[] = ["wood", "brick", "grain", "wool", "ore"];

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
  return G.names[Number(id)] ?? `Player ${Number(id) + 1}`;
}

/** Give every building on tiles numbered `roll` its production. */
function distribute(G: GameState, roll: number): void {
  const geo = getGeometry(G.board);
  const producing = new Map(
    G.board.tiles
      .filter(
        (t) =>
          t.token === roll && t.id !== G.banditTile && t.resource !== "desert",
      )
      .map((t) => [t.id, t.resource as ResourceKey]),
  );
  if (producing.size === 0) return;
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

// ---------------------------------------------------------------------------
// Setup phase moves
// ---------------------------------------------------------------------------

export const placeSettlement: Move<GameState> = ({ G, playerID }, vertexId: string) => {
  const player = playerID!;
  if (G.pendingSetupSettlement !== null) return INVALID_MOVE;
  if (!validSettlementSpots(G, player, true).includes(vertexId)) return INVALID_MOVE;

  G.buildings[vertexId] = { player, city: false };
  G.pendingSetupSettlement = vertexId;

  // The second settlement grants one resource from each adjacent tile.
  if (G.setupStep >= G.numPlayers) {
    const geo = getGeometry(G.board);
    for (const tileId of geo.vertices[vertexId].tiles) {
      const tile = G.board.tiles[tileId];
      if (tile.resource !== "desert") {
        G.players[player].resources[tile.resource] += 1;
      }
    }
  }
  log(G, `${name(G, player)} placed a settlement.`);
};

export const placeRoad: Move<GameState> = ({ G, events, playerID }, edgeId: string) => {
  const player = playerID!;
  if (G.pendingSetupSettlement === null) return INVALID_MOVE;
  if (!validRoadSpots(G, player, true).includes(edgeId)) return INVALID_MOVE;

  G.roads[edgeId] = player;
  G.pendingSetupSettlement = null;
  G.setupStep += 1;
  log(G, `${name(G, player)} placed a road.`);
  events.endTurn();
};

// ---------------------------------------------------------------------------
// Play phase moves
// ---------------------------------------------------------------------------

export const rollDice: Move<GameState> = ({ G, playerID, random }) => {
  if (G.hasRolled) return INVALID_MOVE;
  const dice = random.D6(2) as [number, number];
  const sum = dice[0] + dice[1];
  G.hasRolled = true;
  G.lastRoll = dice;
  G.lastGains = {};
  log(G, `${name(G, playerID!)} rolled ${sum}.`);
  if (sum === 7) {
    G.mustMoveBandit = true;
  } else {
    distribute(G, sum);
  }
};

export const moveBandit: Move<GameState> = (
  { G, playerID, random },
  tileId: number,
  victimId?: string,
) => {
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
  const victim =
    victimId !== undefined && victims.includes(victimId)
      ? victimId
      : victims[Math.floor(random.Number() * victims.length)];
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
  const player = playerID!;
  if (!requireRolled(G)) return INVALID_MOVE;
  if (!canAfford(G.players[player].resources, "city")) return INVALID_MOVE;
  if (!validCitySpots(G, player).includes(vertexId)) return INVALID_MOVE;
  pay(G.players[player].resources, BUILD_COSTS.city);
  G.buildings[vertexId] = { player, city: true };
  log(G, `${name(G, player)} upgraded to a city.`);
};

export const bankTrade: Move<GameState> = (
  { G, playerID },
  give: ResourceKey,
  receive: ResourceKey,
) => {
  const player = playerID!;
  if (!requireRolled(G)) return INVALID_MOVE;
  const hand = G.players[player].resources;
  if (!canBankTrade(hand, give, receive)) return INVALID_MOVE;
  hand[give] -= BANK_TRADE_RATE;
  hand[receive] += 1;
  log(G, `${name(G, player)} traded ${BANK_TRADE_RATE} ${give} for 1 ${receive}.`);
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

export const endTurn: Move<GameState> = ({ G, events, playerID }) => {
  if (!requireRolled(G)) return INVALID_MOVE;
  G.freeRoads = 0;
  log(G, `${name(G, playerID!)} ended their turn.`);
  events.endTurn();
};

export { totalResources, canPayCost };
