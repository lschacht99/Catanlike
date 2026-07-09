"use client";

import { useState } from "react";
import type { CommodityKey, ResourceKey } from "@/types/game";
import type { Theme } from "@/types/theme";
import { BANK_TRADE_RATE, COMMODITY_ICONS, COMMODITY_LABELS, COMMODITY_KEYS_ORDERED, RESOURCE_KEYS_ORDERED } from "@/game/constants";
import type { MaritimeTradeOption, TradeCardKey } from "@/game/maritime";
import Sheet from "./Sheet";

/** Only PUBLIC information about a rival is passed in — never their hand. */
export interface RivalInfo {
  id: string;
  name: string;
  isBot: boolean;
  /** Total number of resource cards (public), not the breakdown. */
  cardCount: number;
}

interface TradePanelProps {
  theme: Theme;
  resources: Record<ResourceKey, number>;
  commodities?: Record<CommodityKey, number>;
  bankOptions?: MaritimeTradeOption[];
  /** Bank rate for this turn (legacy fallback). */
  bankRate?: number;
  rivals?: RivalInfo[];
  onTrade: (give: TradeCardKey, receive: TradeCardKey) => void;
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
/** Cap offer sizes; the engine validates real payability on accept. */
const MAX_OFFER = 4;

export default function TradePanel({
  theme,
  resources,
  bankRate = BANK_TRADE_RATE,
  commodities = { paper: 0, coin: 0, cloth: 0 },
  bankOptions,
  rivals = [],
  onTrade,
  onPlayerTrade,
  onClose,
}: TradePanelProps) {
  const [mode, setMode] = useState<TradeMode>("bank");
  const [give, setGive] = useState<TradeCardKey | null>(null);
  const [receive, setReceive] = useState<TradeCardKey | null>(null);
  const [targetPlayer, setTargetPlayer] = useState<string | null>(null);
  const [giveAmount, setGiveAmount] = useState(1);
  const [receiveAmount, setReceiveAmount] = useState(1);

  const showPlayerTab = !!onPlayerTrade && rivals.length > 0;
  // Only the PUBLIC card count is ever shown — never the rival's actual hand.
  const targetCardCount = targetPlayer
    ? rivals.find((r) => r.id === targetPlayer)?.cardCount ?? 0
    : 0;

  const optionFor = (from: TradeCardKey | null, to: TradeCardKey | null) =>
    from && to ? bankOptions?.find((o) => o.give === from && o.receive === to) ?? null : null;
  const selectedOption = optionFor(give, receive);
  const countFor = (card: TradeCardKey) =>
    (RESOURCE_KEYS_ORDERED as TradeCardKey[]).includes(card) ? resources[card as ResourceKey] : commodities[card as CommodityKey];
  const labelFor = (card: TradeCardKey) =>
    (RESOURCE_KEYS_ORDERED as TradeCardKey[]).includes(card) ? theme.resources[card as ResourceKey].label : COMMODITY_LABELS[card as CommodityKey];
  const iconFor = (card: TradeCardKey) =>
    (RESOURCE_KEYS_ORDERED as TradeCardKey[]).includes(card) ? theme.resources[card as ResourceKey].icon : COMMODITY_ICONS[card as CommodityKey];
  const canBankConfirm =
    give !== null && receive !== null && give !== receive && (selectedOption ? countFor(give) >= selectedOption.rate : resources[give as ResourceKey] >= bankRate);
  // The proposer can only gate on their OWN ability to pay — never the target's.
  const canPlayerConfirm =
    !!onPlayerTrade &&
    !!targetPlayer &&
    give !== null &&
    receive !== null &&
    give !== receive &&
    (RESOURCE_KEYS_ORDERED as TradeCardKey[]).includes(give) && resources[give as ResourceKey] >= giveAmount &&
    giveAmount >= 1 &&
    receiveAmount >= 1;

  function Row({
    title,
    selected,
    onSelect,
    disabledFor,
  }: {
    title: string;
    selected: TradeCardKey | null;
    onSelect: (r: TradeCardKey) => void;
    disabledFor: (r: TradeCardKey) => boolean;
  }) {
    return (
      <div>
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-ink-soft">
          {title}
        </p>
        <div className="grid grid-cols-4 gap-1.5">
          {[...RESOURCE_KEYS_ORDERED, ...COMMODITY_KEYS_ORDERED].map((key) => {
            const style = { icon: iconFor(key), label: labelFor(key) };
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
          onClick={() => onChange(Math.min(max, value + 1))}
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
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setMode(t.id)}
              className={`rounded-full py-2 text-xs font-bold uppercase tracking-[0.15em] ${
                mode === t.id ? "bg-ink text-cream" : "text-ink-soft"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {mode === "bank" ? (
        <div className="space-y-4">
          <Row
            title={`You give ${selectedOption?.rate ?? bankRate}`}
            selected={give}
            onSelect={setGive}
            disabledFor={(r) => { const option = bankOptions?.find((o) => o.give === r); return option ? countFor(r) < option.rate : countFor(r) < bankRate; }}
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
            disabledFor={(r) => r === give || (bankOptions ? !optionFor(give, r) : false)}
          />
          <button
            disabled={!canBankConfirm}
            onClick={() => {
              if (give && receive) onTrade(give, receive);
            }}
            className="w-full rounded-full bg-ink py-3.5 text-sm font-bold uppercase tracking-[0.2em] text-cream disabled:opacity-40"
          >
            Trade {selectedOption?.rate ?? bankRate} : 1
          </button>
          <p className="text-[11px] leading-4 text-ink-faint">{selectedOption?.reason ?? "Default market trade: 4 identical resources for 1 resource."}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-ink-soft">
              Trade with
            </p>
            <div className="flex flex-wrap gap-2">
              {rivals.map((rival) => (
                <button
                  key={rival.id}
                  onClick={() => setTargetPlayer(rival.id)}
                  className={`rounded-full border px-3 py-2 text-sm font-semibold ${
                    targetPlayer === rival.id
                      ? "border-ink bg-ink text-cream"
                      : "border-line bg-cream text-ink"
                  }`}
                >
                  {rival.name}
                  {rival.isBot ? " 🤖" : ""}
                  <span className="ml-1 text-[10px] opacity-70">· {rival.cardCount} cards</span>
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[10px] text-ink-faint">
              You can see how many cards a rival holds, never which ones.
            </p>
          </div>
          <Row
            title="You give"
            selected={give}
            onSelect={(r) => {
              setGive(r);
              setGiveAmount(1);
            }}
            disabledFor={(r) => !(RESOURCE_KEYS_ORDERED as TradeCardKey[]).includes(r) || resources[r as ResourceKey] < 1}
          />
          {give && (
            <div className="flex items-center justify-between rounded-2xl border border-line bg-cream px-3 py-2">
              <span className="text-xs font-semibold text-ink-soft">
                Amount ({resources[give as ResourceKey]} in hand)
              </span>
              <Stepper
                value={giveAmount}
                onChange={setGiveAmount}
                max={Math.min(MAX_OFFER, resources[give as ResourceKey])}
                label="give amount"
              />
            </div>
          )}
          <Row
            title="You request"
            selected={receive}
            onSelect={(r) => {
              setReceive(r);
              setReceiveAmount(1);
            }}
            disabledFor={(r) => r === give || !(RESOURCE_KEYS_ORDERED as TradeCardKey[]).includes(r)}
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
                onPlayerTrade(targetPlayer, give as ResourceKey, giveAmount, receive as ResourceKey, receiveAmount);
              }
            }}
            className="w-full rounded-full bg-ink py-3.5 text-sm font-bold uppercase tracking-[0.2em] text-cream disabled:opacity-40"
          >
            Send Offer
          </button>
        </div>
      )}
    </Sheet>
  );
}
