"use client";

import type { TradeOffer, TradeResult } from "@/types/game";
import type { Theme } from "@/types/theme";
import { ResourceIcon } from "./AssetIcon";

/**
 * The trade target's private accept/refuse view. It shows only the offer terms
 * and the proposer's name — never the proposer's hand. From the responder's
 * side, they GIVE `receive` and GET `give`.
 */
export function TradeReview({
  offer,
  theme,
  proposerName,
  responderName,
  canPay,
  onAccept,
  onRefuse,
}: {
  offer: TradeOffer;
  theme: Theme;
  proposerName: string;
  responderName: string;
  canPay: boolean;
  onAccept: () => void;
  onRefuse: () => void;
}) {
  const giveStyle = theme.resources[offer.receive];
  const getStyle = theme.resources[offer.give];
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/95 p-6">
      <div className="w-full max-w-sm rounded-3xl border border-white/12 bg-slate-900 p-6 text-white shadow-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/45">Trade offer</p>
        <h2 className="mt-1 text-lg font-black">
          {proposerName} wants to trade with {responderName}
        </h2>

        <div className="mt-5 space-y-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <p className="text-[11px] uppercase tracking-wide text-white/45">You give</p>
            <p className="mt-1 text-xl font-black">
              {offer.receiveAmount} <ResourceIcon resource={offer.receive} className="h-6 w-6" /> {giveStyle.label}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <p className="text-[11px] uppercase tracking-wide text-white/45">You receive</p>
            <p className="mt-1 text-xl font-black">
              {offer.giveAmount} <ResourceIcon resource={offer.give} className="h-6 w-6" /> {getStyle.label}
            </p>
          </div>
        </div>

        {!canPay && (
          <p className="mt-3 rounded-xl bg-red-500/15 px-3 py-2 text-xs text-red-300">
            You don&rsquo;t have {offer.receiveAmount} {giveStyle.label.toLowerCase()} to give.
          </p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            onClick={onRefuse}
            className="rounded-xl bg-white/10 py-3 text-sm font-bold text-white"
          >
            Refuse
          </button>
          <button
            onClick={onAccept}
            disabled={!canPay}
            className="rounded-xl bg-emerald-500 py-3 text-sm font-black text-slate-900 disabled:opacity-40"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}

/** Public result banner shown to both players after a trade is resolved. */
export function TradeResultBanner({
  result,
  proposerName,
  responderName,
  onDismiss,
}: {
  result: TradeResult;
  theme: Theme;
  proposerName: string;
  responderName: string;
  onDismiss: () => void;
}) {
  const { offer, accepted, reason } = result;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/90 p-6">
      <div className="w-full max-w-sm rounded-3xl border border-white/12 bg-slate-900 p-6 text-center text-white shadow-2xl">
        <p className="text-4xl">{accepted ? "🤝" : "🚫"}</p>
        <h2 className="mt-2 text-xl font-black">{accepted ? "Trade accepted" : "Trade refused"}</h2>
        <p className="mt-2 text-sm text-white/65">
          {proposerName} → {responderName}: {offer.giveAmount} <ResourceIcon resource={offer.give} className="h-5 w-5" /> for {offer.receiveAmount}{" "}
          <ResourceIcon resource={offer.receive} className="h-5 w-5" />
        </p>
        {reason && <p className="mt-1 text-xs text-white/45">{reason}</p>}
        <button
          onClick={onDismiss}
          className="mt-5 w-full rounded-full bg-yellow-500 py-3 text-sm font-black uppercase tracking-[0.2em] text-slate-900"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
