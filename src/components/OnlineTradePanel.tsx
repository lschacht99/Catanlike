"use client";

import type { TradeOffer } from "@/types/game";
import type { Theme } from "@/types/theme";
import type { OnlineTradeRole } from "@/game/onlineTrade";

/**
 * Duo-online trade UI: a bottom sheet OVER the board, never a full-screen
 * curtain and never a route — the board (and its 3D canvas) stays mounted
 * and visible underneath the whole time. Each device renders a different
 * panel for the SAME shared offer depending on its own seat's role:
 *   - proposer: board + "waiting for a response" + Cancel.
 *   - responder: the offer + Accept/Refuse (no "pass the device" text —
 *     each phone is already the right player's own device).
 *   - bystander (3-4 player games): renders nothing; their board is
 *     untouched while the other two negotiate.
 */
export default function OnlineTradePanel({
  offer,
  theme,
  role,
  proposerName,
  responderName,
  canResponderPay,
  expired,
  busy = false,
  failed = false,
  onAccept,
  onRefuse,
  onCancel,
}: {
  offer: TradeOffer;
  theme: Theme;
  role: OnlineTradeRole;
  proposerName: string;
  responderName: string;
  canResponderPay: boolean;
  expired: boolean;
  /** An accept/refuse/cancel tap is in flight — buttons disable immediately. */
  busy?: boolean;
  /** It's been stuck in-flight too long — a genuine failure, offer to retry. */
  failed?: boolean;
  onAccept: () => void;
  onRefuse: () => void;
  onCancel: () => void;
}) {
  if (role === "bystander") return null;

  const giveStyle = theme.resources[offer.give];
  const receiveStyle = theme.resources[offer.receive];

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[75] flex justify-center px-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
      <div className="pointer-events-auto w-full max-w-md rounded-t-3xl border border-white/12 border-b-0 bg-slate-900/97 p-4 shadow-2xl backdrop-blur">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />

        {expired ? (
          <div className="text-center">
            <p className="text-2xl">⏳</p>
            <h2 className="mt-1 text-base font-black text-white">Trade expired</h2>
            <p className="mt-1 text-xs text-white/55">Resources changed before it was answered — nothing was exchanged.</p>
          </div>
        ) : role === "proposer" ? (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/45">Waiting for {responderName}</p>
            <p className="mt-2 text-sm text-white/75">
              You offered {offer.giveAmount} {giveStyle.icon} {giveStyle.label} for {offer.receiveAmount} {receiveStyle.icon}{" "}
              {receiveStyle.label}.
            </p>
            <p className="mt-1 text-xs text-white/45">Keep playing — you can build, roll, or trade with the bank while you wait.</p>
            {failed && (
              <p className="mt-2 rounded-xl bg-red-500/15 px-3 py-2 text-xs text-red-300">
                That&rsquo;s taking longer than expected — check your connection and try again.
              </p>
            )}
            <button
              onClick={onCancel}
              disabled={busy && !failed}
              className="mt-3 w-full rounded-xl bg-white/10 py-3 text-sm font-bold text-white disabled:opacity-40"
            >
              {busy && !failed ? "Cancelling…" : failed ? "Retry cancel" : "Cancel offer"}
            </button>
          </div>
        ) : (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/45">Trade offer from {proposerName}</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-[11px] uppercase tracking-wide text-white/45">You give</p>
                <p className="mt-1 text-lg font-black text-white">
                  {offer.receiveAmount} {receiveStyle.icon} {receiveStyle.label}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-[11px] uppercase tracking-wide text-white/45">You receive</p>
                <p className="mt-1 text-lg font-black text-white">
                  {offer.giveAmount} {giveStyle.icon} {giveStyle.label}
                </p>
              </div>
            </div>
            {!canResponderPay && (
              <p className="mt-2 rounded-xl bg-red-500/15 px-3 py-2 text-xs text-red-300">
                You don&rsquo;t have {offer.receiveAmount} {receiveStyle.label.toLowerCase()} to give.
              </p>
            )}
            {failed && (
              <p className="mt-2 rounded-xl bg-red-500/15 px-3 py-2 text-xs text-red-300">
                That&rsquo;s taking longer than expected — check your connection and try again.
              </p>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={onRefuse}
                disabled={busy && !failed}
                className="rounded-xl bg-white/10 py-3 text-sm font-bold text-white disabled:opacity-40"
              >
                {busy && !failed ? "…" : failed ? "Retry refuse" : "Refuse"}
              </button>
              <button
                onClick={onAccept}
                disabled={!canResponderPay || (busy && !failed)}
                className="rounded-xl bg-emerald-500 py-3 text-sm font-black text-slate-900 disabled:opacity-40"
              >
                {busy && !failed ? "…" : failed ? "Retry accept" : "Accept"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
