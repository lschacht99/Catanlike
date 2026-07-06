"use client";

import { useState } from "react";
import type { ResourceCounts, ResourceKey } from "@/types/game";
import type { Theme } from "@/types/theme";
import { BANK_TRADE_RATE, RESOURCE_KEYS_ORDERED } from "@/game/constants";

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
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-white/60">{title}</p>
        <div className="grid grid-cols-5 gap-1.5">
          {RESOURCE_KEYS_ORDERED.map((key) => {
            const style = theme.resources[key];
            const active = selected === key;
            return (
              <button
                key={key}
                disabled={disabledFor(key)}
                onClick={() => onSelect(key)}
                className={`flex min-h-[52px] flex-col items-center justify-center rounded-xl border py-1 text-xs
                  ${active ? "border-yellow-400 bg-yellow-400/20" : "border-white/15 bg-white/5"}
                  disabled:opacity-30`}
              >
                <span className="text-lg">{style.icon}</span>
                <span className="text-[10px] text-white/70">{style.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl bg-slate-900 p-4 pb-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-white">
            Bank trade {BANK_TRADE_RATE} : 1
          </h2>
          <button onClick={onClose} className="rounded-lg px-3 py-1 text-white/60">
            ✕
          </button>
        </div>
        <div className="space-y-4">
          <Row
            title={`Give ${BANK_TRADE_RATE}`}
            selected={give}
            onSelect={setGive}
            disabledFor={(r) => resources[r] < BANK_TRADE_RATE}
          />
          <Row
            title="Receive 1"
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
            className="w-full rounded-xl bg-yellow-500 py-3 font-bold text-slate-900 disabled:opacity-30"
          >
            Trade
          </button>
        </div>
      </div>
    </div>
  );
}
