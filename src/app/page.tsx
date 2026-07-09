"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { deleteSnapshot, loadSnapshot } from "@/lib/save-game";
import { saveGameConfig } from "@/lib/storage";
import { BottomNav, HamsaLogo, PrimaryLink, Shell } from "@/components/ui";
import { asset } from "@/components/SafeImage";

const cards = [
  { href: "/new?variant=base", title: "New Standard Game", img: "/assets/home/standard.svg", text: "Classic build, trade, and race to 10." },
  { href: "/new?variant=cities-knights", title: "New Cities & Knights Game", img: "/assets/home/cities-knights.svg", text: "Commodities, city tracks, scouts, and raiders." },
  { href: "/new?multiplayer=local", title: "Multiplayer", img: "/assets/home/multiplayer.svg", text: "Local pass-and-play. Online needs server setup." },
  { href: "/forge", title: "Custom Map / Theme", img: "/assets/home/custom.svg", text: "Tune the board and visual style." },
  { href: "/how-to-play", title: "Rules / How to Play", img: "/assets/home/rules.svg", text: "Short mobile-friendly rules." },
];

// Swap to the fallback once, then detach the handler so a missing fallback
// asset can't re-trigger onError and spin into a 404 loop.
function fallback(e: React.SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  img.onerror = null;
  img.src = asset("/assets/home/fallback.svg");
}

export default function HomePage() {
  const [hasSave, setHasSave] = useState(false);
  useEffect(() => setHasSave(!!loadSnapshot()), []);
  function resume() { const snap = loadSnapshot(); if (snap) saveGameConfig(snap.config); }
  return (
    <>
      <Shell withNav className="justify-start">
        <div className="flex items-center justify-between"><Link href="/profile" aria-label="Settings" className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-cream text-ink shadow-card">⚙</Link><HamsaLogo size={34} /></div>
        <section className="mt-5 overflow-hidden rounded-[2rem] border border-line bg-cream shadow-card">
          <img src={asset("/assets/home/hero.svg")} onError={fallback} alt="Illustrated hex board" className="aspect-[16/9] w-full bg-parchment object-cover" loading="eager" />
          <div className="p-5 text-center"><HamsaLogo size={54} className="mx-auto" /><h1 className="mt-2 font-display text-4xl font-bold text-ink">HAMSA Nomads</h1><p className="mt-2 text-sm text-ink-soft">An original hex resource-trading game. Build, trade, explore.</p></div>
        </section>
        <div className="mt-4 grid gap-3">
          {hasSave && <Link onClick={resume} href="/game" className="rounded-2xl bg-ink px-4 py-4 text-center font-black uppercase tracking-[0.12em] text-cream">Resume Game</Link>}
          <PrimaryLink href="/new">Quick New Game</PrimaryLink>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {cards.map((c) => <Link key={c.title} href={c.href} className="grid grid-cols-[88px_1fr] gap-3 rounded-2xl border border-line bg-cream p-2 shadow-card"><img src={asset(c.img)} onError={fallback} alt="" className="aspect-square rounded-xl bg-parchment object-cover" loading="lazy" /><span><b className="block text-sm text-ink">{c.title}</b><small className="mt-1 block text-xs leading-5 text-ink-soft">{c.text}</small></span></Link>)}
          </div>
          {hasSave && <button onClick={() => { deleteSnapshot(); setHasSave(false); }} className="rounded-full border border-line bg-cream py-3 text-sm font-bold text-rust">Delete Saved Game</button>}
        </div>
        <p className="mt-5 text-center text-[10px] leading-relaxed text-ink-faint">Online multiplayer is available only with the included boardgame.io server; static GitHub Pages supports local play.</p>
      </Shell><BottomNav active="/" />
    </>
  );
}
