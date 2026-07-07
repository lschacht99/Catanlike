"use client";

import { useState } from "react";
import type { PlayerMode, PlayerState, ResourceCounts, ResourceKey } from "@/types/game";
import type { Theme } from "@/types/theme";
import { BANK_TRADE_RATE, RESOURCE_KEYS_ORDERED } from "@/game/constants";
import Sheet from "./Sheet";

interface TradePanelProps {
  theme: Theme;
  resources: ResourceCounts;
  onTrade: (give: ResourceKey, receive: ResourceKey) => void;
  onClose: () => void;
  players?: Record<string, PlayerState>;
  currentPlayer?: string;
  playerNames?: string[];
  playerModes?: PlayerMode[];
  onPlayerTrade?: (
    targetPlayer: string,
    give: ResourceKey,
    giveAmount: number,
    receive: ResourceKey,
    receiveAmount: number,
  ) => void;
}

export default function TradePanel({
  theme,
  resources,
  onTrade,
  onClose,
  players = {},
  currentPlayer = "0",
  playerNames = [],
  playerModes = [],
  onPlayerTrade,
}: TradePanelProps) {
  const [mode, setMode] = useState<"bank" | "player">("bank");
  const [give, setGive] = useState<ResourceKey | null>(null);
  const [receive, setReceive] = useState<ResourceKey | null>(null);
  const [targetPlayer, setTargetPlayer] = useState<string | null>(null);
  const [giveAmount, setGiveAmount] = useState(1);
  const [receiveAmount, setReceiveAmount] = useState(1);

  const rivals = Object.keys(players).filter((id) => id !== currentPlayer);
  const showPlayerTab = !!onPlayerTrade && rivals.length > 0;
  const targetHand = targetPlayer ? players[targetPlayer]?.resources : undefined;
  const targetCardCount = targetHand ? Object.values(targetHand).reduce((a, b) => a + b, 0) : 0;

  const canBankConfirm =
    give !== null && receive !== null && give !== receive && resources[give] >= BANK_TRADE_RATE;

  const canPlayerConfirm =
    !!onPlayerTrade &&
    !!targetPlayer &&
    give !== null &&
    receive !== null &&
    give !== receive &&
    resources[give] >= giveAmount &&
    giveAmount >= 1 &&
    receiveAmount >= 1;

  function rivalName(id: string): string {
    const base = playerNames[Number(id)] ?? `Player ${Number(id) + 1}`;
    return playerModes[Number(id)] === "bot" ? `${base} CPU` : base;
  }

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

  function Stepper({
    value,
    onChange,
    max,
    label,
  }: {
    value: number;
    onChange: (v: number) => void;
    max: number;
    label: string;
  }) {
    const safeMax = Math.max(1, max);
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(1, value - 1))}
          aria-label={`Decrease ${label}`}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-cream text-lg font-bold text-ink"
        >
          −
        </button>
        <span className="w-8 text-center text-lg font-bold text-ink">{value}</span>
        <button
          onClick={() => onChange(Math.min(safeMax, value + 1))}
          aria-label={`Increase ${label}`}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-cream text-lg font-bold text-ink"
        >
          +
        </button>
      </div>
    );
  }

  return (
    <Sheet title="Trade" onClose={onClose}>
      {showPlayerTab && (
        <div className="mb-4 grid grid-cols-2 gap-2 rounded-full border border-line bg-cream p-1">
          {(
            [
              { id: "bank", label: "Market Gate" },
              { id: "player", label: "With Players" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMode(tab.id)}
              className={`rounded-full py-2 text-xs font-bold uppercase tracking-[0.15em] ${
                mode === tab.id ? "bg-ink text-cream" : "text-ink-soft"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {mode === "bank" ? (
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
            disabled={!canBankConfirm}
            onClick={() => {
              if (give && receive) onTrade(give, receive);
            }}
            className="w-full rounded-full bg-ink py-3.5 text-sm font-bold uppercase tracking-[0.2em] text-cream disabled:opacity-40"
          >
            Trade {BANK_TRADE_RATE} : 1
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-ink-soft">
              Trade with
            </p>
            <div className="flex flex-wrap gap-2">
              {rivals.map((id) => (
                <button
                  key={id}
                  onClick={() => setTargetPlayer(id)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                    targetPlayer === id
                      ? "border-ink bg-ink text-cream"
                      : "border-line bg-cream text-ink"
                  }`}
                >
                  {rivalName(id)}
                </button>
              ))}
            </div>
          </div>
          <Row
            title="You give"
            selected={give}
            onSelect={(r) => {
              setGive(r);
              setGiveAmount(1);
            }}
            disabledFor={(r) => resources[r] < 1}
          />
          {give && (
            <div className="flex items-center justify-between rounded-2xl border border-line bg-cream px-3 py-2">
              <span className="text-xs font-semibold text-ink-soft">
                Amount ({resources[give]} in hand)
              </span>
              <Stepper
                value={giveAmount}
                onChange={setGiveAmount}
                max={resources[give]}
                label="give amount"
              />
            </div>
          )}
          <Row
            title="You receive"
            selected={receive}
            onSelect={(r) => {
              setReceive(r);
              setReceiveAmount(1);
            }}
            disabledFor={(r) => r === give}
          />
          {receive && targetPlayer && (
            <div className="rounded-2xl border border-line bg-cream px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-soft">Request amount</span>
                <Stepper value={receiveAmount} onChange={setReceiveAmount} max={9} label="receive amount" />
              </div>
              <p className="mt-1 text-[11px] leading-4 text-ink-faint">Private: exact rival resources are hidden. Public cards: {targetCardCount}.</p>
            </div>
          )}
          <button
            disabled={!canPlayerConfirm}
            onClick={() => {
              if (targetPlayer && give && receive && onPlayerTrade) {
                onPlayerTrade(targetPlayer, give, giveAmount, receive, receiveAmount);
              }
            }}
            className="w-full rounded-full bg-ink py-3.5 text-sm font-bold uppercase tracking-[0.2em] text-cream disabled:opacity-40"
          >
            Propose Trade
          </button>
        </div>
      )}
    </Sheet>
  );
}
