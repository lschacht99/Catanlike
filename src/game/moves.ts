import { INVALID_MOVE } from "boardgame.io/core";
import type { Move } from "boardgame.io";
import type { GameState, ResourceCounts, ResourceKey } from "@/types/game";
import {
  BANK_TRADE_RATE,
  BUILD_COSTS,
  PLAYER_NAMES,
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

function pay(resources: ResourceCounts, cost: Partial<ResourceCounts>): void {
  for (const [key, amount] of Object.entries(cost) as [ResourceKey, number][]) {
    resources[key] -= amount;
  }
}

function log(G: GameState, message: string): void {
  G.log.push(message);
  if (G.log.length > 40) G.log.shift();
}

function playerName(G: GameState, id: string): string {
  return G.playerNames[Number(id)] ?? PLAYER_NAMES[Number(id)] ?? `Player ${Number(id) + 1}`;
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
      G.players[building.player].resources[resource] += building.city ? 2 : 1;
    }
  }
}

export const placeSettlement: Move<GameState> = ({ G, playerID }, vertexId: string) => {
  const player = playerID!;
  if (G.pendingSetupSettlement !== null) return INVALID_MOVE;
  if (!validSettlementSpots(G, player, true).includes(vertexId)) return INVALID_MOVE;

  G.buildings[vertexId] = { player, city: false };
  G.pendingSetupSettlement = vertexId;

  if (G.setupStep >= G.numPlayers) {
    const geo = getGeometry(G.board);
    for (const tileId of geo.vertices[vertexId].tiles) {
      const tile = G.board.tiles[tileId];
      if (tile.resource !== "desert") {
        G.players[player].resources[tile.resource] += 1;
      }
    }
  }
  log(G, `${playerName(G, player)} placed a settlement.`);
};

export const placeRoad: Move<GameState> = ({ G, events, playerID }, edgeId: string) => {
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
  if (G.hasRolled) return INVALID_MOVE;
  const dice = random.D6(2) as [number, number];
  const sum = dice[0] + dice[1];
  G.hasRolled = true;
  G.lastRoll = dice;
  log(G, `${playerName(G, playerID!)} rolled ${sum}.`);
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
    log(G, `${playerName(G, player)} moved the bandit.`);
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
  log(G, `${playerName(G, player)} moved the bandit and stole from ${playerName(G, victim)}.`);
};

function requireRolled(G: GameState): boolean {
  return G.hasRolled && !G.mustMoveBandit;
}

export const buildRoad: Move<GameState> = ({ G, playerID }, edgeId: string) => {
  const player = playerID!;
  if (!requireRolled(G)) return INVALID_MOVE;
  if (!canAfford(G.players[player].resources, "road")) return INVALID_MOVE;
  if (!validRoadSpots(G, player, false).includes(edgeId)) return INVALID_MOVE;
  pay(G.players[player].resources, BUILD_COSTS.road);
  G.roads[edgeId] = player;
  log(G, `${playerName(G, player)} built a road.`);
};

export const buildSettlement: Move<GameState> = ({ G, playerID }, vertexId: string) => {
  const player = playerID!;
  if (!requireRolled(G)) return INVALID_MOVE;
  if (!canAfford(G.players[player].resources, "settlement")) return INVALID_MOVE;
  if (!validSettlementSpots(G, player, false).includes(vertexId)) return INVALID_MOVE;
  pay(G.players[player].resources, BUILD_COSTS.settlement);
  G.buildings[vertexId] = { player, city: false };
  log(G, `${playerName(G, player)} built a settlement.`);
};

export const buildCity: Move<GameState> = ({ G, playerID }, vertexId: string) => {
  const player = playerID!;
  if (!requireRolled(G)) return INVALID_MOVE;
  if (!canAfford(G.players[player].resources, "city")) return INVALID_MOVE;
  if (!validCitySpots(G, player).includes(vertexId)) return INVALID_MOVE;
  pay(G.players[player].resources, BUILD_COSTS.city);
  G.buildings[vertexId] = { player, city: true };
  log(G, `${playerName(G, player)} upgraded to a city.`);
};

export const buildKnight: Move<GameState> = ({ G, playerID }, vertexId: string) => {
  const player = playerID!;
  if (G.variant !== "cities-knights") return INVALID_MOVE;
  if (!requireRolled(G)) return INVALID_MOVE;
  if (!canAfford(G.players[player].resources, "knight")) return INVALID_MOVE;
  if (!validKnightSpots(G, player).includes(vertexId)) return INVALID_MOVE;
  pay(G.players[player].resources, BUILD_COSTS.knight);
  G.knights[vertexId] = player;
  log(G, `${playerName(G, player)} trained a knight.`);
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
  log(G, `${playerName(G, player)} traded ${BANK_TRADE_RATE} ${give} for 1 ${receive}.`);
};

export const endTurn: Move<GameState> = ({ G, events, playerID }) => {
  if (!requireRolled(G)) return INVALID_MOVE;
  log(G, `${playerName(G, playerID!)} ended their turn.`);
  events.endTurn();
};

export { totalResources };
