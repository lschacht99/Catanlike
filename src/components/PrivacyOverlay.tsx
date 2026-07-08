"use client";

/**
 * Full-screen "pass the device" curtain shown between human turns and before
 * a trade target reviews an offer. It hides the previous player's private
 * hand/cards until the named player confirms they are the one holding the
 * device. Board state underneath is public, so the curtain is opaque.
 */
export default function PrivacyOverlay({
  playerName,
  color = "#c9a227",
  title = "Pass the device",
  subtitle,
  actionLabel,
  onReady,
}: {
  playerName: string;
  color?: string;
  title?: string;
  subtitle?: string;
  actionLabel?: string;
  onReady: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-6 bg-slate-950 px-8 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full border-2" style={{ borderColor: color }}>
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="2" width="14" height="20" rx="2.5" />
          <path d="M11 18h2" />
        </svg>
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.35em] text-white/45">{title}</p>
        <h2 className="mt-2 text-2xl font-black text-white">
          Hand it to <span style={{ color }}>{playerName}</span>
        </h2>
        {subtitle && <p className="mx-auto mt-2 max-w-xs text-sm text-white/60">{subtitle}</p>}
      </div>
      <button
        onClick={onReady}
        className="rounded-full px-8 py-4 text-sm font-black uppercase tracking-[0.2em] text-slate-900"
        style={{ backgroundColor: color }}
      >
        {actionLabel ?? `I'm ${playerName} — Show my turn`}
      </button>
      <p className="max-w-xs text-[11px] text-white/35">
        Private resources and cards stay hidden until you tap.
      </p>
    </div>
  );
}
