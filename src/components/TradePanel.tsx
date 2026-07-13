"use client";

import { useState } from "react";
import type { CommodityKey, GameVariant, ResourceKey } from "@/types/game";
import type { Theme } from "@/types/theme";
import type { HarborType, TradeCard } from "@/game/harbors";
import {
  BANK_TRADE_RATE,
  COMMODITY_KEYS_ORDERED,
  COMMODITY_LABELS,
  RESOURCE_KEYS_ORDERED,
} from "@/game/constants";
import { ResourceIcon, CommodityIcon } from "./AssetIcon";
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
  /** Player's commodities (Cities & Knights only). */
  commodities?: Record<CommodityKey, number>;
  variant?: GameVariant;
  /** How many of a given card the bank takes for 1 — PER PLAYER (harbors). */
  rateFor?: (give: TradeCard) => number;
  /** Harbor types this player can use, for the rate summary. */
  ownedHarbors?: HarborType[];
  /** Whether the player has Merchant Guild (2:1 on commodities). */
  merchantGuild?: boolean;
  rivals?: RivalInfo[];
  onTrade: (give: TradeCard, receive: TradeCard) => void;
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

const COMMODITY_SET = new Set<string>(COMMODITY_KEYS_ORDERED);
const isCommodityCard = (c: TradeCard): c is CommodityKey => COMMODITY_SET.has(c);

export default function TradePanel({
  theme,
  resources,
  commodities,
  variant = "base",
  rateFor,
  ownedHarbors = [],
  merchantGuild = false,
  rivals = [],
  onTrade,
  onPlayerTrade,
  onClose,
}: TradePanelProps) {
  const [mode, setMode] = useState<TradeMode>("bank");
  const [give, setGive] = useState<TradeCard | null>(null);
  const [receive, setReceive] = useState<TradeCard | null>(null);
  const [targetPlayer, setTargetPlayer] = useState<string | null>(null);
  const [giveAmount, setGiveAmount] = useState(1);
  const [receiveAmount, setReceiveAmount] = useState(1);

  const ck = variant === "cities-knights";
  const showPlayerTab = !!onPlayerTrade && rivals.length > 0;
  // Only the PUBLIC card count is ever shown — never the rival's actual hand.
  const targetCardCount = targetPlayer
    ? rivals.find((r) => r.id === targetPlayer)?.cardCount ?? 0
    : 0;

  // How many of `card` the player holds (resources and, in C&K, commodities).
  const held = (card: TradeCard): number =>
    isCommodityCard(card) ? commodities?.[card] ?? 0 : resources[card as ResourceKey];
  const rate = (card: TradeCard): number =>
    rateFor ? rateFor(card) : BANK_TRADE_RATE;
  const label = (card: TradeCard): string =>
    isCommodityCard(card) ? COMMODITY_LABELS[card] : theme.resources[card as ResourceKey].label;
  const icon = (card: TradeCard): React.ReactNode =>
    isCommodityCard(card) ? <CommodityIcon commodity={card} className="h-6 w-6" /> : <ResourceIcon resource={card as ResourceKey} className="h-6 w-6" />;

  const giveRate = give ? rate(give) : BANK_TRADE_RATE;
  const canBankConfirm =
    give !== null && receive !== null && give !== receive && held(give) >= giveRate;

  // The proposer can only gate on their OWN ability to pay — never the target's.
  const canPlayerConfirm =
    !!onPlayerTrade &&
    !!targetPlayer &&
    give !== null &&
    receive !== null &&
    give !== receive &&
    !isCommodityCard(give) &&
    !isCommodityCard(receive) &&
    resources[give as ResourceKey] >= giveAmount &&
    giveAmount >= 1 &&
    receiveAmount >= 1;

  // Human-readable summary of this player's own maritime rates.
  const rateSummary: string[] = ["4:1 default"];
  if (ownedHarbors.includes("generic")) rateSummary.push("3:1 harbor");
  const resHarbors = ownedHarbors.filter((h): h is ResourceKey => h !== "generic");
  for (const h of resHarbors) rateSummary.push(`2:1 ${label(h)}`);
  if (ck && merchantGuild) rateSummary.push("2:1 commodities (Merchant Guild)");

  /** A selectable grid of cards with per-card rate chips (bank tab). */
  function GiveGrid({ cards }: { cards: TradeCard[] }) {
    return (
      <div className="grid grid-cols-5 gap-1.5">
        {cards.map((card) => {
          const r = rate(card);
          const affordable = held(card) >= r;
          const active = give === card;
          return (
            <button
              key={card}
              onClick={() => { setGive(card); if (receive === card) setReceive(null); }}
              className={`relative flex min-h-[60px] flex-col items-center justify-center rounded-xl border py-1 shadow-card transition ${
                active ? "border-ink bg-ink/10" : affordable ? "border-line bg-cream" : "border-line bg-cream opacity-45"
              }`}
            >
              <span className="text-lg">{icon(card)}</span>
              <span className="text-[9px] font-semibold uppercase tracking-wide text-ink-soft">{label(card)}</span>
              <span className={`mt-0.5 rounded-full px-1.5 text-[9px] font-black ${affordable ? "bg-ink text-cream" : "bg-line text-ink-soft"}`}>
                {r}:1
              </span>
              <span className="absolute right-1 top-1 text-[9px] font-bold text-ink-faint">{held(card)}</span>
            </button>
          );
        })}
      </div>
    );
  }

  /** A selectable grid of cards you can receive (any single card). */
  function ReceiveGrid({ cards }: { cards: TradeCard[] }) {
    return (
      <div className="grid grid-cols-5 gap-1.5">
        {cards.map((card) => {
          const disabled = card === give;
          const active = receive === card;
          return (
            <button
              key={card}
              disabled={disabled}
              onClick={() => setReceive(card)}
              className={`flex min-h-[56px] flex-col items-center justify-center rounded-xl border py-1 shadow-card transition disabled:opacity-30 ${
                active ? "border-ink bg-ink/10" : "border-line bg-cream"
              }`}
            >
              <span className="text-lg">{icon(card)}</span>
              <span className="text-[9px] font-semibold uppercase tracking-wide text-ink-soft">{label(card)}</span>
            </button>
          );
        })}
      </div>
    );
  }

  /** Resources-only grid for the player-to-player tab (offers are resources). */
  function Row({
    title,
    selected,
    onSelect,
    disabledFor,
  }: {
    title: string;
    selected: TradeCard | null;
    onSelect: (r: ResourceKey) => void;
    disabledFor: (r: ResourceKey) => boolean;
  }) {
    return (
      <div>
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-ink-soft">{title}</p>
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
                <ResourceIcon resource={key} className="h-7 w-7" />
                <span className="text-[9px] font-semibold uppercase tracking-wide text-ink-soft">{style.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  function Stepper({ value, onChange, max, label: lab }: { value: number; onChange: (v: number) => void; max: number; label: string }) {
    return (
      <div className="flex items-center gap-2">
        <button onClick={() => onChange(Math.max(1, value - 1))} aria-label={`Decrease ${lab}`} className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-cream text-lg font-bold text-ink">−</button>
        <span className="w-8 text-center text-lg font-bold text-ink">{value}</span>
        <button onClick={() => onChange(Math.min(max, value + 1))} aria-label={`Increase ${lab}`} className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-cream text-lg font-bold text-ink">+</button>
      </div>
    );
  }

  const giveCards: TradeCard[] = ck ? [...RESOURCE_KEYS_ORDERED, ...COMMODITY_KEYS_ORDERED] : [...RESOURCE_KEYS_ORDERED];

  return (
    <Sheet title="Trade" onClose={onClose}>
      {showPlayerTab && (
        <div className="mb-4 grid grid-cols-2 gap-2 rounded-full border border-line bg-cream p-1">
          {([{ id: "bank", label: "Market Gate" }, { id: "player", label: "With Players" }] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setMode(t.id)}
              className={`rounded-full py-2 text-xs font-bold uppercase tracking-[0.15em] ${mode === t.id ? "bg-ink text-cream" : "text-ink-soft"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {mode === "bank" ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-parchment/50 px-3 py-2 text-[11px] leading-4 text-ink-soft">
            <b className="text-ink">Your rates:</b> {rateSummary.join(" · ")}
            {ck && <span className="mt-0.5 block text-ink-faint">2:1 resource harbors take that resource only — never commodities.</span>}
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-ink-soft">You give (rate shown per card)</p>
            <GiveGrid cards={giveCards} />
          </div>
          <div className="flex justify-center text-ink-soft">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 4v9m0 0-2.5-2.5M6 13l2.5-2.5M14 16V7m0 0 2.5 2.5M14 7l-2.5 2.5" />
            </svg>
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-ink-soft">You get 1</p>
            <ReceiveGrid cards={giveCards} />
          </div>
          {give && !canBankConfirm && held(give) < giveRate && (
            <p className="text-center text-[11px] text-ink-faint">
              Need {giveRate} {label(give)} to trade — you have {held(give)}.
            </p>
          )}
          <button
            disabled={!canBankConfirm}
            onClick={() => { if (give && receive) onTrade(give, receive); }}
            className="w-full rounded-full bg-ink py-3.5 text-sm font-bold uppercase tracking-[0.2em] text-cream disabled:opacity-40"
          >
            Trade {giveRate} : 1
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-ink-soft">Trade with</p>
            <div className="flex flex-wrap gap-2">
              {rivals.map((rival) => (
                <button
                  key={rival.id}
                  onClick={() => setTargetPlayer(rival.id)}
                  className={`rounded-full border px-3 py-2 text-sm font-semibold ${targetPlayer === rival.id ? "border-ink bg-ink text-cream" : "border-line bg-cream text-ink"}`}
                >
                  {rival.name}
                  {rival.isBot ? " 🤖" : ""}
                  <span className="ml-1 text-[10px] opacity-70">· {rival.cardCount} cards</span>
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[10px] text-ink-faint">You can see how many cards a rival holds, never which ones.</p>
          </div>
          <Row title="You give" selected={give} onSelect={(r) => { setGive(r); setGiveAmount(1); }} disabledFor={(r) => resources[r] < 1} />
          {give && !isCommodityCard(give) && (
            <div className="flex items-center justify-between rounded-2xl border border-line bg-cream px-3 py-2">
              <span className="text-xs font-semibold text-ink-soft">Amount ({resources[give as ResourceKey]} in hand)</span>
              <Stepper value={giveAmount} onChange={setGiveAmount} max={Math.min(MAX_OFFER, resources[give as ResourceKey])} label="give amount" />
            </div>
          )}
          <Row title="You request" selected={receive} onSelect={(r) => { setReceive(r); setReceiveAmount(1); }} disabledFor={(r) => r === give} />
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
              if (targetPlayer && give && receive && onPlayerTrade && !isCommodityCard(give) && !isCommodityCard(receive)) {
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
