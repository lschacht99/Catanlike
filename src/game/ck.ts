import type {
  GameState,
  ProgressCardType,
  ProgressTrackKey,
} from "@/types/game";
import {
  BARBARIAN_TRACK_LENGTH,
  PROGRESS_HAND_LIMIT,
  PROGRESS_CARD_TRACK,
  progressDeckFor,
} from "./constants";

/** [0,1) random source, injected so everything here stays testable. */
export type Rng = () => number;

const TRACKS: ProgressTrackKey[] = ["trade", "politics", "science"];

/** Per-track draw piles, lazily seeded (also patches legacy saves). */
export function progressDecks(G: GameState): Record<ProgressTrackKey, ProgressCardType[]> {
  if (!G.progressDecks) {
    G.progressDecks = {
      trade: progressDeckFor("trade"),
      politics: progressDeckFor("politics"),
      science: progressDeckFor("science"),
    };
  }
  return G.progressDecks;
}

/** Combat strength of one player's ACTIVE knights (levels count). */
export function knightStrength(G: GameState, player: string): number {
  const active = G.activeKnights ?? {};
  const levels = G.knightLevels ?? {};
  let strength = 0;
  for (const [vertexId, owner] of Object.entries(G.knights ?? {})) {
    if (owner === player && active[vertexId]) strength += levels[vertexId] ?? 1;
  }
  return strength;
}

export function cityCount(G: GameState, player: string): number {
  return Object.values(G.buildings).filter((b) => b.player === player && b.city).length;
}

/**
 * Map an event die face (1-6) to its effect: 1-3 advance the raiders,
 * 4/5/6 fire a trade / politics / science progress event.
 */
export function eventFromDie(face: number): "barbarian" | ProgressTrackKey {
  if (face <= 3) return "barbarian";
  return TRACKS[face - 4];
}

/**
 * Draw a progress card of `track` for `player`. Random pick from the pile
 * (so no shuffle bookkeeping); reshuffles that track's discards when empty.
 * Hands are capped at PROGRESS_HAND_LIMIT — the oldest card is discarded.
 * Returns the drawn card, or null when none are available.
 */
export function drawProgressCard(
  G: GameState,
  player: string,
  track: ProgressTrackKey,
  rng: Rng,
): ProgressCardType | null {
  const decks = progressDecks(G);
  let pile = decks[track];
  if (pile.length === 0) {
    const discards = G.progressDiscards ?? [];
    const back = discards.filter((c) => PROGRESS_CARD_TRACK[c] === track);
    if (back.length === 0) return null;
    G.progressDiscards = discards.filter((c) => PROGRESS_CARD_TRACK[c] !== track);
    decks[track] = back;
    pile = back;
  }
  const card = pile.splice(Math.floor(rng() * pile.length), 1)[0];
  const hand = (G.players[player].progressCards ??= []);
  hand.push(card);
  if (hand.length > PROGRESS_HAND_LIMIT) {
    const dropped = hand.shift()!;
    (G.progressDiscards ??= []).push(dropped);
  }
  return card;
}

/**
 * A track event: every player rolls a d6 and draws from that track when the
 * roll is at most their improvement level + 1 (documented simplification of
 * the tabletop red-die rule — higher improvements draw more often).
 */
export function runProgressEvent(
  G: GameState,
  track: ProgressTrackKey,
  rng: Rng,
): string[] {
  const events: string[] = [];
  for (const [id, player] of Object.entries(G.players)) {
    const level = player.improvements?.[track] ?? 0;
    if (level < 1) continue;
    const roll = 1 + Math.floor(rng() * 6);
    if (roll <= level + 1) {
      const card = drawProgressCard(G, id, track, rng);
      if (card) events.push(`${G.names[Number(id)]} drew a ${track} card.`);
    }
  }
  return events;
}

export interface BarbarianOutcome {
  defended: boolean;
  strength: number;
  cities: number;
  /** Players who gained a victory bonus point. */
  rewarded: string[];
  /** Players who lost a city. */
  pillaged: string[];
  log: string[];
}

/**
 * Resolve the raider attack: total active knight strength vs total cities.
 * Defended → the sole strongest defender gains 1 victory bonus point; ties
 * draw a politics card each. Overrun → owners of cities with the weakest
 * defense lose one city (downgraded to a settlement). Either way the track
 * resets and every knight deactivates.
 */
export function resolveBarbarianAttack(G: GameState, rng: Rng): BarbarianOutcome {
  const players = Object.keys(G.players);
  const strengths = new Map(players.map((p) => [p, knightStrength(G, p)]));
  const totalStrength = [...strengths.values()].reduce((a, b) => a + b, 0);
  const totalCities = players.reduce((a, p) => a + cityCount(G, p), 0);
  const defended = totalStrength >= totalCities || totalCities === 0;
  const outcome: BarbarianOutcome = {
    defended,
    strength: totalStrength,
    cities: totalCities,
    rewarded: [],
    pillaged: [],
    log: [],
  };

  if (defended) {
    const max = Math.max(0, ...strengths.values());
    const top = players.filter((p) => (strengths.get(p) ?? 0) === max && max > 0);
    if (top.length === 1) {
      const hero = top[0];
      G.players[hero].victoryBonus = (G.players[hero].victoryBonus ?? 0) + 1;
      outcome.rewarded.push(hero);
      outcome.log.push(`${G.names[Number(hero)]} repelled the raiders (+1 point).`);
    } else if (top.length > 1) {
      for (const hero of top) {
        drawProgressCard(G, hero, "politics", rng);
        outcome.rewarded.push(hero);
      }
      outcome.log.push("The strongest defenders each drew a politics card.");
    } else {
      outcome.log.push("The raiders found nothing worth taking.");
    }
  } else {
    const owners = players.filter((p) => cityCount(G, p) > 0);
    const weakest = Math.min(...owners.map((p) => strengths.get(p) ?? 0));
    for (const victim of owners) {
      if ((strengths.get(victim) ?? 0) !== weakest) continue;
      const cityVertex = Object.entries(G.buildings).find(
        ([, b]) => b.player === victim && b.city,
      )?.[0];
      if (cityVertex) {
        G.buildings[cityVertex] = { player: victim, city: false };
        outcome.pillaged.push(victim);
        outcome.log.push(`Raiders pillaged one of ${G.names[Number(victim)]}'s cities.`);
      }
    }
  }

  G.barbarianPosition = 0;
  for (const id of Object.keys(G.activeKnights ?? {})) {
    G.activeKnights![id] = false;
  }
  if (outcome.log.length === 0) outcome.log.push("The raiders retreated.");
  return outcome;
}

/**
 * Advance the raider track by one step; resolves the attack when the ship
 * arrives. Returns log lines for the game feed.
 */
export function advanceBarbarians(G: GameState, rng: Rng): string[] {
  G.barbarianPosition = (G.barbarianPosition ?? 0) + 1;
  if (G.barbarianPosition < BARBARIAN_TRACK_LENGTH) {
    return [`Raiders advance (${G.barbarianPosition}/${BARBARIAN_TRACK_LENGTH}).`];
  }
  return resolveBarbarianAttack(G, rng).log;
}
