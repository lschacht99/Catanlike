"use client";

import type { ResourceCounts } from "@/types/game";
import type { Theme } from "@/types/theme";
import { RESOURCE_KEYS_ORDERED } from "@/game/constants";
import GameIcon from "./GameIcon";

export default function PlayerHand({
  resources,
  theme,
}: {
  resources: ResourceCounts;
  theme: Theme;
}) {
  return (
    <div className="grid grid-cols-5 gap-1" aria-label="Resource hand">
      {RESOURCE_KEYS_ORDERED.map((key) => {
        const style = theme.resources[key];
        const amount = resources[key] ?? 0;
        return (
          <div
            key={key}
            aria-label={`${style.label}: ${amount}`}
            className="min-w-0 rounded-xl border border-line/80 bg-cream/95 px-1.5 py-1 shadow-card"
          >
            <div className="flex items-center justify-center gap-1 leading-none">
              <GameIcon name={key} size={18} className="shrink-0 text-ink" />
              <span className="text-sm font-black tabular-nums text-ink">{amount}</span>
            </div>
            <span className="mt-0.5 block truncate text-center text-[8px] font-bold uppercase leading-none tracking-wide text-ink-soft">
              {style.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
