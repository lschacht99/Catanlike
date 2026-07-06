"use client";

import type { ResourceCounts, ResourceKey } from "@/types/game";
import type { Theme } from "@/types/theme";
import {
  BUILD_COSTS,
  PIECE_LIMITS,
  type BuildableKind,
} from "@/game/constants";
import { canAfford } from "@/game/rules";

interface BuildMenuProps {
  theme: Theme;
  resources: ResourceCounts;
  pieces: { roads: number; settlements: number; cities: number };
  /** Kinds that currently have at least one legal placement. */
  placeable: Record<BuildableKind, boolean>;
  activeMode: BuildableKind | null;
  onPick: (kind: BuildableKind | null) => void;
}

function CostChips({ kind, theme }: { kind: BuildableKind; theme: Theme }) {
  return (
    <span className="flex flex-wrap justify-center gap-x-1 text-[10px] text-white/70">
      {(Object.entries(BUILD_COSTS[kind]) as [ResourceKey, number][]).map(
        ([key, amount]) => (
          <span key={key}>
            {amount > 1 ? `${amount}×` : ""}
            {theme.resources[key].icon}
          </span>
        ),
      )}
    </span>
  );
}

export default function BuildMenu({
  theme,
  resources,
  pieces,
  placeable,
  activeMode,
  onPick,
}: BuildMenuProps) {
  const items: { kind: BuildableKind; label: string; used: number; max: number }[] = [
    { kind: "road", label: theme.terms.road, used: pieces.roads, max: PIECE_LIMITS.road },
    { kind: "settlement", label: theme.terms.settlement, used: pieces.settlements, max: PIECE_LIMITS.settlement },
    { kind: "city", label: theme.terms.city, used: pieces.cities, max: PIECE_LIMITS.city },
  ];
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {items.map(({ kind, label, used, max }) => {
        const affordable = canAfford(resources, kind);
        const enabled = affordable && placeable[kind];
        const active = activeMode === kind;
        return (
          <button
            key={kind}
            disabled={!enabled && !active}
            onClick={() => onPick(active ? null : kind)}
            className={`flex min-h-[64px] flex-col items-center justify-center rounded-xl border px-1 py-2 text-sm font-semibold transition
              ${active ? "border-yellow-400 bg-yellow-400/20 text-yellow-300" : "border-white/15 bg-white/5 text-white"}
              disabled:opacity-35`}
          >
            <span>{label}</span>
            <CostChips kind={kind} theme={theme} />
            <span className="text-[10px] text-white/50">
              {max - used} left
            </span>
          </button>
        );
      })}
    </div>
  );
}
