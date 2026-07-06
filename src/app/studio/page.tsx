"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { GameVariant, PlayerMode } from "@/types/game";
import type { Theme } from "@/types/theme";
import { PLAYER_NAMES } from "@/game/constants";
import { generateBoard } from "@/game/generator";
import { allThemes } from "@/game/themes";
import { saveGameConfig } from "@/lib/storage";

export default function StudioPage() {
  const router = useRouter();
  const [themes, setThemes] = useState<Theme[]>([]);
  const [themeId, setThemeId] = useState("classic");
  const [numPlayers, setNumPlayers] = useState(4);
  const [variant, setVariant] = useState<GameVariant>("base");
  const [playerModes, setPlayerModes] = useState<PlayerMode[]>(["human", "human", "bot", "bot"]);
  const [playerNames, setPlayerNames] = useState<string[]>(["Leah", "Moshe", "Amber", "Green"]);

  useEffect(() => {
    setThemes(allThemes());
  }, []);

  useEffect(() => {
    setPlayerNames((names) => Array.from({ length: numPlayers }, (_, i) => names[i] || PLAYER_NAMES[i] || `Player ${i + 1}`));
    setPlayerModes((modes) => Array.from({ length: numPlayers }, (_, i) => modes[i] || (numPlayers === 4 && i > 0 ? "bot" : "human")));
  }, [numPlayers]);

  const theme = useMemo(() => themes.find((t) => t.id === themeId) ?? themes[0], [themeId, themes]);

  function updateName(index: number, value: string) {
    setPlayerNames((names) => names.map((name, i) => (i === index ? value : name)));
  }

  function updateMode(index: number, value: PlayerMode) {
    setPlayerModes((modes) => modes.map((mode, i) => (i === index ? value : mode)));
  }

  function startGame(custom?: { themeId?: string; names?: string[]; modes?: PlayerMode[]; variant?: GameVariant; numPlayers?: number }) {
    const finalNumPlayers = custom?.numPlayers ?? numPlayers;
    const names = Array.from({ length: finalNumPlayers }, (_, i) => custom?.names?.[i] || playerNames[i] || PLAYER_NAMES[i] || `Player ${i + 1}`);
    const modes = Array.from({ length: finalNumPlayers }, (_, i) => custom?.modes?.[i] || playerModes[i] || "human");
    saveGameConfig({
      numPlayers: finalNumPlayers,
      themeId: custom?.themeId ?? themeId,
      board: generateBoard(450),
      playerModes: modes,
      playerNames: names,
      variant: custom?.variant ?? variant,
    });
    router.push("/game");
  }

  function pickSolo() {
    setNumPlayers(4);
    setPlayerModes(["human", "bot", "bot", "bot"]);
    setPlayerNames(["You", "Red CPU", "Blue CPU", "Green CPU"]);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 py-6">
      <header className="mb-4 flex items-center gap-3">
        <Link href="/" className="rounded-lg bg-white/10 px-3 py-1.5 text-sm">←</Link>
        <div>
          <h1 className="text-xl font-bold">Game Studio</h1>
          <p className="text-xs text-white/55">Choose names, variants, themes, and custom presets.</p>
        </div>
      </header>

      <section className="mb-4 grid grid-cols-2 gap-2">
        <button onClick={pickSolo} className="rounded-2xl border border-yellow-400/30 bg-yellow-400/10 px-3 py-3 text-left">
          <span className="block text-sm font-bold text-yellow-300">Solo vs 3 CPU</span>
          <span className="block text-[11px] text-white/55">One real player, full board</span>
        </button>
        <button onClick={() => { setNumPlayers(4); setPlayerModes(["human", "human", "bot", "bot"]); }} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-left">
          <span className="block text-sm font-bold">2 humans + 2 CPU</span>
          <span className="block text-[11px] text-white/55">Best local quick mode</span>
        </button>
        <button onClick={() => { setNumPlayers(4); setPlayerModes(["human", "human", "human", "human"]); }} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-left">
          <span className="block text-sm font-bold">4 local players</span>
          <span className="block text-[11px] text-white/55">Classic pass-and-play</span>
        </button>
        <button onClick={() => { setNumPlayers(2); setPlayerModes(["human", "human"]); }} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-left">
          <span className="block text-sm font-bold">2 players</span>
          <span className="block text-[11px] text-white/55">Fast duel map</span>
        </button>
        <button onClick={() => startGame({ themeId: "hamsa", names: ["Leah", "Moshe", "Scout", "Guide"], modes: ["human", "human", "bot", "bot"], numPlayers: 4, variant: "cities-knights" })} className="col-span-2 rounded-2xl border border-yellow-400/30 bg-yellow-400/10 px-3 py-3 text-left">
          <span className="block text-sm font-bold text-yellow-300">Leah & Moshe Journey</span>
          <span className="block text-[11px] text-white/55">Cute Hamsa preset for you two</span>
        </button>
      </section>

      <section className="mb-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">Variant</p>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setVariant("base")} className={`rounded-2xl border px-3 py-3 text-left ${variant === "base" ? "border-yellow-400 bg-yellow-400/20 text-yellow-300" : "border-white/10 bg-white/5"}`}>
            <span className="block text-sm font-bold">Base</span>
            <span className="block text-[11px] text-white/55">Classic trading match</span>
          </button>
          <button onClick={() => setVariant("cities-knights")} className={`rounded-2xl border px-3 py-3 text-left ${variant === "cities-knights" ? "border-yellow-400 bg-yellow-400/20 text-yellow-300" : "border-white/10 bg-white/5"}`}>
            <span className="block text-sm font-bold">Cities & Knights</span>
            <span className="block text-[11px] text-white/55">Adds buildable knight units</span>
          </button>
        </div>
      </section>

      <section className="mb-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">Theme</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {themes.map((t) => (
            <button key={t.id} onClick={() => setThemeId(t.id)} className={`shrink-0 rounded-xl border px-4 py-2 text-sm font-semibold ${themeId === t.id ? "border-yellow-400 bg-yellow-400/20 text-yellow-300" : "border-white/15 bg-white/5"}`}>
              {t.name}
            </button>
          ))}
        </div>
        {theme && <p className="mt-2 text-xs text-white/55">Current pick: {theme.name}</p>}
      </section>

      <section className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Player names</p>
          <span className="text-[11px] text-white/50">You can rename every seat</span>
        </div>
        <div className="space-y-2">
          {Array.from({ length: numPlayers }).map((_, index) => (
            <div key={index} className="grid grid-cols-[1fr_auto] gap-2 rounded-2xl border border-white/10 bg-white/5 p-2">
              <input value={playerNames[index] ?? ""} onChange={(e) => updateName(index, e.target.value)} placeholder={PLAYER_NAMES[index]} className="rounded-xl bg-black/25 px-3 py-2 text-sm outline-none placeholder:text-white/30" />
              <select value={playerModes[index] ?? "human"} onChange={(e) => updateMode(index, e.target.value as PlayerMode)} className="rounded-xl bg-black/25 px-3 py-2 text-sm outline-none">
                <option value="human">Human</option>
                <option value="bot">CPU</option>
              </select>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
        <p className="font-semibold text-white">Want a map inspired by a photo?</p>
        <p className="mt-1 text-xs text-white/55">Use Image Forge to upload a Japan, Jerusalem, or travel photo and spin a matching board palette from it.</p>
        <Link href="/image-forge" className="mt-3 inline-block rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold">Open Image Forge</Link>
      </section>

      <button onClick={() => startGame()} className="rounded-2xl bg-yellow-500 py-3.5 font-bold text-slate-900">Start game</button>
    </main>
  );
}
