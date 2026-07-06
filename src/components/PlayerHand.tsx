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
            className="flex flex-col items-center rounded-xl border border-white/10 px-1 py-1.5"
            style={{ background: `${style.color}26` }}
          >
            <span className="text-lg leading-none">{style.icon}</span>
            <span className="mt-1 text-[10px] leading-tight text-white/70">
              {style.label}
            </span>
            <span className="text-base font-bold text-white">{resources[key]}</span>
          </div>
        );
      })}
    </div>
  );
}
