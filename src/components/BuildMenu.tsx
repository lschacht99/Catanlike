"use client";

import type { GameState, ResourceKey } from "@/types/game";
import type { Theme } from "@/types/theme";
import {
  BUILD_COSTS,
  DEV_CARD_COST,
  PIECE_LIMITS,
  type BuildableKind,
} from "@/game/constants";
import { canAfford, canBuyDevCard, pieceCounts } from "@/game/rules";
import Sheet from "./Sheet";

interface BuildSheetProps {
  G: GameState;
  player: string;
  theme: Theme;
  /** Kinds that currently have at least one legal placement. */
  placeable: Record<BuildableKind, boolean>;
  onPick: (kind: BuildableKind) => void;
  onBuyDevCard: () => void;
  onClose: () => void;
}

function Costs({ cost, theme }: { cost: Partial<Record<ResourceKey, number>>; theme: Theme }) {
  return (
    <span className="flex flex-wrap gap-x-1.5 gap-y-0.5">
      {(Object.entries(cost) as [ResourceKey, number][]).map(([key, amount]) => (
        <span key={key} className="text-xs text-ink-soft">
          {theme.resources[key].icon}
          {amount > 1 ? `×${amount}` : ""}
        </span>
      ))}
    </span>
  );
}

function Row({
  icon,
  label,
  sub,
  costs,
  disabled,
  onClick,
}: {
  icon: string;
  label: string;
  sub: string;
  costs: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-line bg-cream p-3 text-left shadow-card transition active:scale-[0.99] disabled:opacity-40"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-parchment text-xl">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold uppercase tracking-wider text-ink">{label}</span>
        {costs}
        <span className="block text-[11px] text-ink-faint">{sub}</span>
      </span>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-ink-soft">
        <path d="m6 3 5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

export default function BuildSheet({
  G,
  player,
  theme,
  placeable,
  onPick,
  onBuyDevCard,
  onClose,
}: BuildSheetProps) {
  const resources = G.players[player].resources;
  const pieces = pieceCounts(G, player);
  const freeRoad = G.freeRoads > 0;

  return (
    <Sheet title="Build" onClose={onClose}>
      <div className="space-y-2.5">
        <Row
          icon="🛤️"
          label={theme.terms.road}
          sub={`${PIECE_LIMITS.road - pieces.roads} left${freeRoad ? ` · ${G.freeRoads} FREE` : ""}`}
          costs={freeRoad ? <span className="text-xs font-bold text-olive">Free (Road Building)</span> : <Costs cost={BUILD_COSTS.road} theme={theme} />}
          disabled={(!freeRoad && !canAfford(resources, "road")) || !placeable.road}
          onClick={() => onPick("road")}
        />
        <Row
          icon="🏠"
          label={theme.terms.settlement}
          sub={`${PIECE_LIMITS.settlement - pieces.settlements} left`}
          costs={<Costs cost={BUILD_COSTS.settlement} theme={theme} />}
          disabled={!canAfford(resources, "settlement") || !placeable.settlement}
          onClick={() => onPick("settlement")}
        />
        <Row
          icon="🏛️"
          label={theme.terms.city}
          sub={`${PIECE_LIMITS.city - pieces.cities} left`}
          costs={<Costs cost={BUILD_COSTS.city} theme={theme} />}
          disabled={!canAfford(resources, "city") || !placeable.city}
          onClick={() => onPick("city")}
        />
        <Row
          icon="🃏"
          label="Journey Card"
          sub={`${G.devDeck.length} left in the deck`}
          costs={<Costs cost={DEV_CARD_COST} theme={theme} />}
          disabled={!canBuyDevCard(G, player)}
          onClick={onBuyDevCard}
        />
      </div>
    </Sheet>
  );
}
