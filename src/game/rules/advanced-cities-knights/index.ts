export interface AdvancedRulesState {
  enabled: boolean;
  invasionTrack: number;
  knights: Record<string, { player: string; vertexId: string; active: boolean; strength: 1 | 2 | 3 }>;
  cityImprovements: Record<string, { craft: number; trade: number; lore: number }>;
  progressDeck: string[];
}

export const ADVANCED_RULESET_ID = "guardians-and-guilds";

export function createAdvancedRulesState(enabled = false): AdvancedRulesState {
  return { enabled, invasionTrack: 0, knights: {}, cityImprovements: {}, progressDeck: [] };
}

export function advanceInvasion(state: AdvancedRulesState): void {
  if (state.enabled) state.invasionTrack = Math.min(12, state.invasionTrack + 1);
}

export function activateKnight(state: AdvancedRulesState, knightId: string): boolean {
  const knight = state.knights[knightId];
  if (!state.enabled || !knight || knight.active) return false;
  knight.active = true;
  return true;
}
