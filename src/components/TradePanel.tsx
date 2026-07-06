"use client";

import { useState } from "react";
import type { PlayerMode, ResourceCounts, ResourceKey } from "@/types/game";
import type { Theme } from "@/types/theme";
import { BANK_TRADE_RATE, RESOURCE_KEYS_ORDERED } from "@/game/constants";

interface TradePanelProps {
  theme: Theme;
  resources: ResourceCounts;
  players?: Record<string, { resources: ResourceCounts }>;
  currentPlayer?: string;
  playerNames?: string[];
  playerModes?: PlayerMode[];
  onTrade: (give: ResourceKey, receive: ResourceKey) => void;
  onPlayerTrade?: (
    targetPlayer: string,
    give: ResourceKey,
    giveAmount: number,
    receive: ResourceKey,
    receiveAmount: number,
  ) => void;
  onClose: () => void;
}

type TradeMode = "bank" | "player";

export default function TradePanel({
  theme,
  resources,
  players = {},
  currentPlayer = "0",
  playerNames = [],
  playerModes = [],
  onTrade,
  onPlayerTrade,
  onClose,
}: TradePanelProps) {
  const [mode, setMode] = useState<TradeMode>("bank");
  const [give, setGive] = useState<ResourceKey | null>(null);
  const [receive, setReceive] = useState<ResourceKey | null>(null);
  const [targetPlayer, setTargetPlayer] = useState<string | null>(null);
  const [giveAmount, setGiveAmount] = useState(1);
  const [receiveAmount, setReceiveAmount] = useState(1);

  const rivals = Object.keys(players).filter((id) => id !== currentPlayer);
  const targetHand = targetPlayer ? players[targetPlayer]?.resources : undefined;
  const canBankConfirm = give !== null && receive !== null && give !== receive && resources[give] >= BANK_TRADE_RATE;
  const canPlayerConfirm =
    !!onPlayerTrade &&
    !!targetPlayer &&
    !!targetHand &&
    give !== null &&
    receive !== null &&
    give !== receive &&
    giveAmount > 0 &&
    receiveAmount > 0 &&
    resources[give] >= giveAmount &&
    targetHand[receive] >= receiveAmount;

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
                className={`flex min-h-[52px] flex-col items-center justify-center rounded-xl border py-1 text-xs ${active ? "border-yellow-400 bg-yellow-400/20" : "border-white/15 bg-white/5"} disabled:opacity-30`}
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
      <div className="max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-slate-900 p-4 pb-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-white">Trade</h2>
          <button onClick={onClose} className="rounded-lg px-3 py-1 text-white/60">✕</button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <button onClick={() => setMode("bank")} className={`rounded-xl border px-3 py-2 text-sm font-bold ${mode === "bank" ? "border-yellow-400 bg-yellow-400/20 text-yellow-300" : "border-white/15 bg-white/5"}`}>
            Bank {BANK_TRADE_RATE}:1
          </button>
          <button onClick={() => setMode("player")} className={`rounded-xl border px-3 py-2 text-sm font-bold ${mode === "player" ? "border-yellow-400 bg-yellow-400/20 text-yellow-300" : "border-white/15 bg-white/5"}`}>
            Player trade
          </button>
        </div>

        {mode === "bank" ? (
          <div className="space-y-4">
            <Row title={`Give ${BANK_TRADE_RATE}`} selected={give} onSelect={setGive} disabledFor={(r) => resources[r] < BANK_TRADE_RATE} />
            <Row title="Receive 1" selected={receive} onSelect={setReceive} disabledFor={(r) => r === give} />
            <button disabled={!canBankConfirm} onClick={() => { if (give && receive) onTrade(give, receive); onClose(); }} className="w-full rounded-xl bg-yellow-500 py-3 font-bold text-slate-900 disabled:opacity-30">
              Trade with bank
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-white/60">Trade with</p>
              <div className="grid grid-cols-3 gap-1.5">
                {rivals.map((id) => (
                  <button key={id} onClick={() => setTargetPlayer(id)} className={`rounded-xl border px-2 py-2 text-xs font-bold ${targetPlayer === id ? "border-yellow-400 bg-yellow-400/20 text-yellow-300" : "border-white/15 bg-white/5"}`}>
                    {playerNames[Number(id)] ?? `Player ${Number(id) + 1}`}
                    <span className="block text-[10px] font-normal text-white/50">{playerModes[Number(id)] === "bot" ? "CPU auto" : "Human"}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="rounded-xl bg-white/5 p-2 text-xs text-white/60">
                You give amount
                <input type="number" min={1} max={9} value={giveAmount} onChange={(e) => setGiveAmount(Number(e.target.value))} className="mt-1 w-full rounded-lg bg-black/25 px-2 py-2 text-white outline-none" />
              </label>
              <label className="rounded-xl bg-white/5 p-2 text-xs text-white/60">
                You receive amount
                <input type="number" min={1} max={9} value={receiveAmount} onChange={(e) => setReceiveAmount(Number(e.target.value))} className="mt-1 w-full rounded-lg bg-black/25 px-2 py-2 text-white outline-none" />
              </label>
            </div>

            <Row title="You give" selected={give} onSelect={setGive} disabledFor={(r) => resources[r] < giveAmount} />
            <Row title="You receive" selected={receive} onSelect={setReceive} disabledFor={(r) => !targetHand || r === give || targetHand[r] < receiveAmount} />

            <p className="rounded-xl bg-white/5 px-3 py-2 text-xs text-white/55">
              CPU trades are accepted automatically when the CPU owns the requested resource. Human trades are local pass-and-play confirmation.
            </p>
            <button
              disabled={!canPlayerConfirm}
              onClick={() => {
                if (targetPlayer && give && receive && onPlayerTrade) onPlayerTrade(targetPlayer, give, giveAmount, receive, receiveAmount);
                onClose();
              }}
              className="w-full rounded-xl bg-yellow-500 py-3 font-bold text-slate-900 disabled:opacity-30"
            >
              Confirm player trade
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
