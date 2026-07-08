"use client";

import { useState } from "react";
import type { CommodityKey, ProgressCardType, ResourceKey } from "@/types/game";
import type { Theme } from "@/types/theme";
import {
  COMMODITY_KEYS_ORDERED,
  PROGRESS_CARD_DESCRIPTIONS,
  PROGRESS_CARD_LABELS,
  RESOURCE_KEYS_ORDERED,
} from "@/game/constants";

export interface CardChoice {
  resources?: ResourceKey[];
  commodities?: CommodityKey[];
  target?: string;
}

/** How many of each pick a card needs (undefined = no interactive choice). */
const NEEDS: Partial<Record<ProgressCardType, { resources?: number; commodities?: number; target?: boolean }>> = {
  caravan: { resources: 2 },
  invention: { resources: 1 },
  marketDay: { commodities: 1 },
  scholar: { commodities: 2 },
  intrigue: { target: true },
};

export function cardNeedsChoice(card: ProgressCardType): boolean {
  return card in NEEDS;
}

const COMMODITY_ICON: Record<CommodityKey, string> = { coin: "🪙", cloth: "🧵", book: "📖" };

/**
 * Modal that collects the picks a progress card needs, then plays it.
 * Cards without choices are played immediately by the caller instead.
 */
export default function ProgressCardPlay({
  card,
  theme,
  rivals,
  onPlay,
  onCancel,
}: {
  card: ProgressCardType;
  theme: Theme;
  rivals: { id: string; name: string }[];
  onPlay: (choice: CardChoice) => void;
  onCancel: () => void;
}) {
  const need = NEEDS[card] ?? {};
  const [resources, setResources] = useState<ResourceKey[]>([]);
  const [commodities, setCommodities] = useState<CommodityKey[]>([]);
  const [target, setTarget] = useState<string | null>(null);

  const ready =
    (!need.resources || resources.length === need.resources) &&
    (!need.commodities || commodities.length === need.commodities) &&
    (!need.target || target !== null);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/90 p-6">
      <div className="w-full max-w-sm rounded-3xl border border-white/12 bg-slate-900 p-5 text-white shadow-2xl">
        <h2 className="text-lg font-black">{PROGRESS_CARD_LABELS[card]}</h2>
        <p className="mt-1 text-sm text-white/60">{PROGRESS_CARD_DESCRIPTIONS[card]}</p>

        {need.resources && (
          <div className="mt-4">
            <p className="mb-1.5 text-[11px] uppercase tracking-wide text-white/45">
              Choose {need.resources} resource{need.resources > 1 ? "s" : ""} ({resources.length}/{need.resources})
            </p>
            <div className="grid grid-cols-5 gap-1.5">
              {RESOURCE_KEYS_ORDERED.map((r) => (
                <button
                  key={r}
                  onClick={() =>
                    setResources((cur) =>
                      cur.length < need.resources! ? [...cur, r] : cur,
                    )
                  }
                  className="flex flex-col items-center rounded-xl border border-white/12 bg-white/5 py-2 text-lg"
                >
                  {theme.resources[r].icon}
                  <span className="text-[9px] text-white/50">
                    {resources.filter((x) => x === r).length || ""}
                  </span>
                </button>
              ))}
            </div>
            {resources.length > 0 && (
              <button onClick={() => setResources([])} className="mt-1 text-[11px] text-white/45 underline">
                clear
              </button>
            )}
          </div>
        )}

        {need.commodities && (
          <div className="mt-4">
            <p className="mb-1.5 text-[11px] uppercase tracking-wide text-white/45">
              Choose {need.commodities} commodit{need.commodities > 1 ? "ies" : "y"} ({commodities.length}/{need.commodities})
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {COMMODITY_KEYS_ORDERED.map((c) => (
                <button
                  key={c}
                  onClick={() =>
                    setCommodities((cur) =>
                      cur.length < need.commodities! ? [...cur, c] : cur,
                    )
                  }
                  className="flex flex-col items-center rounded-xl border border-white/12 bg-white/5 py-2 text-lg"
                >
                  {COMMODITY_ICON[c]}
                  <span className="text-[9px] capitalize text-white/50">
                    {c} {commodities.filter((x) => x === c).length || ""}
                  </span>
                </button>
              ))}
            </div>
            {commodities.length > 0 && (
              <button onClick={() => setCommodities([])} className="mt-1 text-[11px] text-white/45 underline">
                clear
              </button>
            )}
          </div>
        )}

        {need.target && (
          <div className="mt-4">
            <p className="mb-1.5 text-[11px] uppercase tracking-wide text-white/45">Target rival</p>
            <div className="flex flex-wrap gap-2">
              {rivals.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setTarget(r.id)}
                  className={`rounded-full border px-3 py-1.5 text-sm ${
                    target === r.id ? "border-yellow-400 bg-yellow-400/20" : "border-white/12 bg-white/5"
                  }`}
                >
                  {r.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button onClick={onCancel} className="rounded-xl bg-white/10 py-3 text-sm font-bold">
            Cancel
          </button>
          <button
            disabled={!ready}
            onClick={() =>
              onPlay({
                resources: need.resources ? resources : undefined,
                commodities: need.commodities ? commodities : undefined,
                target: need.target ? target ?? undefined : undefined,
              })
            }
            className="rounded-xl bg-yellow-500 py-3 text-sm font-black text-slate-900 disabled:opacity-40"
          >
            Play card
          </button>
        </div>
      </div>
    </div>
  );
}
