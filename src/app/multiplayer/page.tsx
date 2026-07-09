"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, SectionLabel, Shell, TopBar } from "@/components/ui";
import SafeImage from "@/components/SafeImage";
import { describeSavedGame, loadGame, type SavedGame } from "@/lib/savegame";

/** Online play needs the boardgame.io server, which a static GitHub Pages
 *  deploy cannot host. We say so honestly instead of faking it. */
const ONLINE_ENABLED = !!process.env.NEXT_PUBLIC_GAME_SERVER;

export default function MultiplayerPage() {
  const [save, setSave] = useState<SavedGame | null>(null);

  useEffect(() => {
    const r = loadGame();
    setSave(r.status === "ok" ? r.save : null);
  }, []);

  return (
    <Shell>
      <TopBar title="Multiplayer" />

      <div className="overflow-hidden rounded-3xl border border-line shadow-card">
        <SafeImage src="/assets/mode-multiplayer.svg" alt="" aspectRatio="16 / 7" fallbackEmoji="👥" />
      </div>

      <div className="mt-5 space-y-3">
        <SectionLabel>Play on this device</SectionLabel>
        <Link href="/new" className="block">
          <Card className="flex items-center gap-3 active:scale-[0.99]">
            <span className="text-2xl">🤝</span>
            <div className="flex-1">
              <p className="text-sm font-black text-ink">Local pass &amp; play</p>
              <p className="text-xs text-ink-soft">2–4 players share one phone. Private hands with a pass-device screen between turns.</p>
            </div>
            <span className="text-ink-soft">▸</span>
          </Card>
        </Link>

        <Link href="/studio" className="block">
          <Card className="flex items-center gap-3 active:scale-[0.99]">
            <span className="text-2xl">🤖</span>
            <div className="flex-1">
              <p className="text-sm font-black text-ink">Play with bots</p>
              <p className="text-xs text-ink-soft">Mix human and CPU players. Bots evaluate trades and can refuse.</p>
            </div>
            <span className="text-ink-soft">▸</span>
          </Card>
        </Link>

        {save && (
          <Link href="/game?resume=1" className="block">
            <Card className="flex items-center gap-3 border-rust/40 active:scale-[0.99]">
              <span className="text-2xl">⏱️</span>
              <div className="flex-1">
                <p className="text-sm font-black text-rust">Resume game</p>
                <p className="truncate text-xs text-ink-soft">{describeSavedGame(save)}</p>
              </div>
              <span className="text-rust">▸</span>
            </Card>
          </Link>
        )}
      </div>

      <div className="mt-6 space-y-3">
        <SectionLabel>Play online</SectionLabel>
        <Link href="/duo" className="block">
          <Card className="flex items-center justify-between">
            <div>
              <p className="text-sm font-black text-ink">2-Player Easy Online 💑</p>
              <p className="text-xs text-ink-soft">Room code + QR, any network, turn notifications. No accounts.</p>
            </div>
            <span className="text-rust">▸</span>
          </Card>
        </Link>
        {ONLINE_ENABLED ? (
          <div className="grid grid-cols-2 gap-3">
            <Link href="/online/create" className="rounded-2xl border border-line bg-cream p-4 text-center shadow-card active:scale-[0.98]">
              <span className="text-2xl">🌐</span>
              <p className="mt-1 text-sm font-black text-ink">Create room</p>
            </Link>
            <Link href="/online/join" className="rounded-2xl border border-line bg-cream p-4 text-center shadow-card active:scale-[0.98]">
              <span className="text-2xl">🔑</span>
              <p className="mt-1 text-sm font-black text-ink">Join room</p>
            </Link>
          </div>
        ) : (
          <Card className="text-sm text-ink-soft">
            <p className="font-black text-ink">Online multiplayer requires server setup</p>
            <p className="mt-1">
              Real-time online play runs through a small game server that a static
              site can&rsquo;t host. Run <code className="rounded bg-parchment px-1">npm run server</code> and set{" "}
              <code className="rounded bg-parchment px-1">NEXT_PUBLIC_GAME_SERVER</code>, then the Create/Join options appear here.
            </p>
            <p className="mt-2 text-xs text-ink-faint">
              The lobby screens are already built (Create · Join · Waiting Room · live sync) and just need a reachable server.
            </p>
          </Card>
        )}
      </div>
    </Shell>
  );
}
