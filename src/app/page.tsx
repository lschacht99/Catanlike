import Link from "next/link";
import {
  BottomNav,
  HamsaLogo,
  PrimaryLink,
  SecondaryLink,
  Shell,
} from "@/components/ui";

export default function HomePage() {
  return (
    <>
      <Shell withNav className="justify-center">
        <div className="flex items-center justify-between">
          <Link
            href="/profile"
            aria-label="Settings"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-cream text-ink shadow-card"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="10" cy="10" r="2.6" />
              <path d="M10 2.5v2m0 11v2M2.5 10h2m11 0h2M4.8 4.8l1.4 1.4m7.6 7.6 1.4 1.4m0-10.4-1.4 1.4M6.2 13.8l-1.4 1.4" strokeLinecap="round" />
            </svg>
          </Link>
          <HamsaLogo size={34} />
        </div>

        <div className="mt-6 text-center">
          <HamsaLogo size={72} className="mx-auto" />
          <h1 className="mt-4 font-display text-[44px] font-bold leading-none tracking-wide text-ink">
            HAMSA
          </h1>
          <p className="mt-1 text-lg font-semibold uppercase tracking-[0.5em] text-rust">
            Nomads
          </p>
          <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.35em] text-ink-soft">
            Build · Trade · Explore
          </p>
        </div>

        <div className="mx-auto my-7 h-px w-24 bg-rust/40" />

        <div className="text-center">
          <h2 className="font-display text-2xl text-ink">
            A journey <span className="italic text-rust">you build</span>
          </h2>
          <p className="mx-auto mt-2 max-w-[260px] text-sm leading-relaxed text-ink-soft">
            Settle new lands, trade resources, and build your nomadic legacy.
          </p>
        </div>

        <div className="mt-8 space-y-3">
          <PrimaryLink href="/new">Play</PrimaryLink>
          <div className="grid grid-cols-2 gap-3">
            <SecondaryLink href="/online/create">Create Game</SecondaryLink>
            <SecondaryLink href="/online/join">Join Game</SecondaryLink>
          </div>
          <SecondaryLink href="/how-to-play">How to Play</SecondaryLink>
        </div>

        <p className="mt-8 text-center text-[10px] leading-relaxed text-ink-faint">
          An original game inspired by classic hex resource-trading mechanics.
          Not affiliated with any commercial board game.
        </p>
      </Shell>
      <BottomNav active="/" />
    </>
  );
}
