"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BottomNav,
  Card,
  HamsaLogo,
  SectionLabel,
  Shell,
  TopBar,
} from "@/components/ui";
import {
  AVATARS,
  loadProfile,
  loadResults,
  saveProfile,
  type Profile,
} from "@/lib/profile";

function Toggle({
  on,
  onChange,
  label,
  icon,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
  icon: string;
}) {
  return (
    <button
      onClick={() => onChange(!on)}
      className="flex w-full items-center gap-3 py-3"
      role="switch"
      aria-checked={on}
    >
      <span className="text-base">{icon}</span>
      <span className="flex-1 text-left text-sm font-semibold text-ink">{label}</span>
      <span
        className={`flex h-6 w-11 items-center rounded-full p-0.5 transition ${
          on ? "justify-end bg-olive" : "justify-start bg-line"
        }`}
      >
        <span className="h-5 w-5 rounded-full bg-cream shadow-card" />
      </span>
    </button>
  );
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [games, setGames] = useState(0);
  const [wins, setWins] = useState(0);

  useEffect(() => {
    const p = loadProfile();
    setProfile(p);
    const results = loadResults();
    setGames(results.length);
    setWins(results.filter((r) => r.winner === p.name).length);
  }, []);

  function update(patch: Partial<Profile>) {
    if (!profile) return;
    const next = { ...profile, ...patch };
    setProfile(next);
    saveProfile(next);
  }

  if (!profile) {
    return (
      <Shell className="items-center justify-center">
        <p className="text-ink-soft">Loading…</p>
      </Shell>
    );
  }

  return (
    <>
      <Shell withNav>
        <TopBar title="Your Profile" right={<HamsaLogo size={26} />} />

        <Card className="mb-4 text-center">
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-gold bg-parchment text-4xl">
            {profile.avatar}
          </span>
          <input
            value={profile.name}
            onChange={(e) => update({ name: e.target.value })}
            aria-label="Your name"
            className="mt-3 w-full rounded-xl border border-line bg-parchment px-3 py-2 text-center font-display text-xl font-bold text-ink outline-none focus:border-ink/40"
          />
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.25em] text-ink-soft">
            The Explorer
          </p>
          <div className="mt-4 grid grid-cols-2 divide-x divide-line rounded-2xl border border-line bg-parchment py-3">
            <div>
              <p className="text-lg font-bold text-ink">{games}</p>
              <p className="text-[9px] font-bold uppercase tracking-wider text-ink-soft">
                Games played
              </p>
            </div>
            <div>
              <p className="text-lg font-bold text-ink">{wins}</p>
              <p className="text-[9px] font-bold uppercase tracking-wider text-ink-soft">Wins</p>
            </div>
          </div>
        </Card>

        <Card className="mb-4">
          <SectionLabel>Choose avatar</SectionLabel>
          <div className="grid grid-cols-8 gap-1.5">
            {AVATARS.map((a) => (
              <button
                key={a}
                onClick={() => update({ avatar: a })}
                aria-label={`Avatar ${a}`}
                className={`flex aspect-square items-center justify-center rounded-full border text-xl ${
                  profile.avatar === a ? "border-rust bg-rust/10" : "border-line bg-parchment"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </Card>

        <Card className="mb-4 divide-y divide-line !py-1">
          <Toggle icon="🔊" label="Sound" on={profile.sound} onChange={(v) => update({ sound: v })} />
          <Toggle icon="🎵" label="Music" on={profile.music} onChange={(v) => update({ music: v })} />
          <Toggle
            icon="🔔"
            label="Notifications"
            on={profile.notifications}
            onChange={(v) => update({ notifications: v })}
          />
        </Card>

        <Card className="divide-y divide-line !py-1">
          <Link href="/how-to-play" className="flex items-center gap-3 py-3 text-sm font-semibold text-ink">
            <span>❓</span>
            <span className="flex-1">Help & how to play</span>
            <span className="text-ink-faint">›</span>
          </Link>
          <Link href="/forge" className="flex items-center gap-3 py-3 text-sm font-semibold text-ink">
            <span>🗺️</span>
            <span className="flex-1">Map Forge</span>
            <span className="text-ink-faint">›</span>
          </Link>
          <div className="flex items-center gap-3 py-3 text-sm text-ink-soft">
            <span>ℹ️</span>
            <span className="flex-1">
              Hamsa Nomads — an original game inspired by classic hex trading mechanics.
            </span>
          </div>
        </Card>
      </Shell>
      <BottomNav active="/profile" />
    </>
  );
}
