"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BottomNav, HamsaLogo, Shell } from "@/components/ui";
import SafeImage from "@/components/SafeImage";
import { describeSavedGame, loadGame, type SavedGame } from "@/lib/savegame";

interface Entry {
  href: string;
  title: string;
  subtitle: string;
  image: string;
  emoji: string;
}

const ENTRIES: Entry[] = [
  { href: "/new", title: "Standard Game", subtitle: "Classic hex trading", image: "/assets/mode-standard.svg", emoji: "⬡" },
  { href: "/new?variant=ck", title: "Cities & Knights", subtitle: "Commodities, knights & raiders", image: "/assets/mode-ck.svg", emoji: "🛡️" },
  { href: "/multiplayer", title: "Multiplayer", subtitle: "Pass & play or online", image: "/assets/mode-multiplayer.svg", emoji: "👥" },
  { href: "/collection", title: "Custom Map / Theme", subtitle: "Themes & saved boards", image: "/assets/mode-custom.svg", emoji: "🎨" },
  { href: "/rules", title: "Rules / How to Play", subtitle: "Quick, mobile-readable", image: "/assets/mode-rules.svg", emoji: "📖" },
];

export default function HomePage() {
  const [save, setSave] = useState<SavedGame | null>(null);

  useEffect(() => {
    const result = loadGame();
    setSave(result.status === "ok" ? result.save : null);
  }, []);

  return (
    <>
      <Shell withNav>
        <div className="mb-3 flex items-center justify-between">
          <HamsaLogo size={34} />
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
        </div>

        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl border border-line shadow-card">
          <SafeImage src="/assets/hero.svg" alt="A nomad seaside settlement" aspectRatio="16 / 8" eager fallbackEmoji="🏜️" />
          <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/45 to-transparent p-4">
            <h1 className="font-display text-3xl font-black leading-none text-cream">HAMSA NOMADS</h1>
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.3em] text-cream/85">Build · Trade · Explore</p>
          </div>
        </div>

        {/* Resume (only when a save exists) */}
        {save && (
          <Link
            href="/game?resume=1"
            className="mt-4 flex items-center gap-3 rounded-2xl border-2 border-rust/50 bg-cream p-3 shadow-card active:scale-[0.99]"
          >
            <SafeImage src="/assets/mode-resume.svg" alt="" aspectRatio="1 / 1" className="h-14 w-14 shrink-0 rounded-xl" fallbackEmoji="⏱️" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black uppercase tracking-wide text-rust">Resume Game</p>
              <p className="truncate text-xs text-ink-soft">{describeSavedGame(save)}</p>
            </div>
            <span className="text-2xl text-rust">▸</span>
          </Link>
        )}

        {/* Entry points */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          {ENTRIES.map((e) => (
            <Link
              key={e.href}
              href={e.href}
              className="group overflow-hidden rounded-2xl border border-line bg-cream shadow-card transition active:scale-[0.98]"
            >
              <SafeImage src={e.image} alt="" aspectRatio="16 / 10" fallbackEmoji={e.emoji} />
              <div className="p-3">
                <p className="text-sm font-black leading-tight text-ink">{e.title}</p>
                <p className="mt-0.5 text-[11px] leading-tight text-ink-soft">{e.subtitle}</p>
              </div>
            </Link>
          ))}
        </div>

        <p className="mt-6 text-center text-[10px] leading-relaxed text-ink-faint">
          An original game inspired by classic hex resource-trading mechanics.
          Not affiliated with any commercial board game.
        </p>
      </Shell>
      <BottomNav active="/" />
    </>
  );
}
