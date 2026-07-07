"use client";

import { useState } from "react";
import type { ResourceCounts, ResourceKey } from "@/types/game";
import type { Theme } from "@/types/theme";
import { BANK_TRADE_RATE, RESOURCE_KEYS_ORDERED } from "@/game/constants";
import Sheet from "./Sheet";

interface TradePanelProps {
  theme: Theme;
  resources: ResourceCounts;
  onTrade: (give: ResourceKey, receive: ResourceKey) => void;
  onClose: () => void;
}

export default function TradePanel({ theme, resources, onTrade, onClose }: TradePanelProps) {
  const [give, setGive] = useState<ResourceKey | null>(null);
  const [receive, setReceive] = useState<ResourceKey | null>(null);
  const canConfirm = give !== null && receive !== null && give !== receive;

  function Row({
    title,
    selected,
    onSelect,
    disabledFor,
  }: {
    title: string;
    selected: ResourceKey | null;
    onSelect: (r: ResourceKey) => void;
    disabledFor: (r: ResourceKey) => boolean;
  }) {
    return (
      <div>
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-ink-soft">
          {title}
        </p>
        <div className="grid grid-cols-5 gap-1.5">
          {RESOURCE_KEYS_ORDERED.map((key) => {
            const style = theme.resources[key];
            const active = selected === key;
            return (
              <button
                key={key}
                disabled={disabledFor(key)}
                onClick={() => onSelect(key)}
                className={`flex min-h-[56px] flex-col items-center justify-center rounded-xl border py-1 shadow-card transition disabled:opacity-30 ${
                  active ? "border-ink bg-ink/10" : "border-line bg-cream"
                }`}
              >
                <span className="text-lg">{style.icon}</span>
                <span className="text-[9px] font-semibold uppercase tracking-wide text-ink-soft">
                  {style.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <Sheet title="Trade · Market Gate" onClose={onClose}>
      <div className="space-y-4">
        <Row
          title={`You give ${BANK_TRADE_RATE}`}
          selected={give}
          onSelect={setGive}
          disabledFor={(r) => resources[r] < BANK_TRADE_RATE}
        />
        <div className="flex justify-center text-ink-soft">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 4v9m0 0-2.5-2.5M6 13l2.5-2.5M14 16V7m0 0 2.5 2.5M14 7l-2.5 2.5" />
          </svg>
        </div>
        <Row
          title="You get 1"
          selected={receive}
          onSelect={setReceive}
          disabledFor={(r) => r === give}
        />
        <button
          disabled={!canConfirm}
          onClick={() => {
            if (give && receive) onTrade(give, receive);
            onClose();
          }}
          className="w-full rounded-full bg-ink py-3.5 text-sm font-bold uppercase tracking-[0.2em] text-cream disabled:opacity-40"
        >
          Propose Trade
        </button>
        <p className="text-center text-[10px] text-ink-faint">
          Player-to-player trades arrive in a future caravan.
        </p>
      </div>
    </Sheet>
  );
}
