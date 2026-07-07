"use client";

import type { ResourceCounts } from "@/types/game";
import type { Theme } from "@/types/theme";
import { RESOURCE_KEYS_ORDERED } from "@/game/constants";

export default function PlayerHand({
  resources,
  theme,
}: {
  resources: ResourceCounts;
  theme: Theme;
}) {
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {RESOURCE_KEYS_ORDERED.map((key) => {
        const style = theme.resources[key];
        return (
          <div
            key={key}
            className="flex flex-col items-center rounded-xl border border-line bg-cream px-1 py-1.5 shadow-card"
          >
            <span className="text-lg leading-none">{style.icon}</span>
            <span className="mt-0.5 max-w-full truncate text-[9px] font-semibold uppercase tracking-wide text-ink-soft">
              {style.label}
            </span>
            <span className="text-base font-bold text-ink">{resources[key]}</span>
          </div>
        );
      })}
    </div>
  );
}
