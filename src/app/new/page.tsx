"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Board } from "@/types/game";
import type { Theme } from "@/types/theme";
import { generateBoard } from "@/game/generator";
import { createDuelBoard } from "@/game/board-generator/presets";
import { allThemes, getTheme } from "@/game/themes";
import { saveGameConfig } from "@/lib/storage";
import HexBoard from "@/components/HexBoard";

export default function NewGamePage() {
  const router = useRouter();
  const [numPlayers, setNumPlayers] = useState(2);
  const [themeId, setThemeId] = useState("classic");
  const [themes, setThemes] = useState<Theme[]>([]);
  const [board, setBoard] = useState<Board | null>(null);

  useEffect(() => {
    setThemes(allThemes());
    setBoard(createDuelBoard());
  }, []);

  const theme = getThemeFrom(themes, themeId);

  function start() {
    if (!board) return;
    saveGameConfig({ numPlayers, themeId, board });
    router.push("/game");
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 py-6">
      <header className="mb-4 flex items-center gap-3">
        <Link href="/" className="rounded-lg bg-white/10 px-3 py-1.5 text-sm">←</Link>
        <h1 className="text-xl font-bold">New Game</h1>
      </header>

      <section className="mb-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">Players</p>
        <div className="grid grid-cols-2 gap-2">
          {[2, 3, 4].map((n) => (
            <button
              key={n}
              onClick={() => { setNumPlayers(n); setBoard(n === 2 ? createDuelBoard() : generateBoard()); }}
              className={`rounded-xl border py-3 font-bold ${
                numPlayers === n
                  ? "border-yellow-400 bg-yellow-400/20 text-yellow-300"
                  : "border-white/15 bg-white/5"
              }`}
            >
              {n} players
            </button>
          ))}
        </div>
      </section>

      <section className="mb-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">Theme</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => setThemeId(t.id)}
              className={`shrink-0 rounded-xl border px-4 py-2 text-sm font-semibold ${
                themeId === t.id
                  ? "border-yellow-400 bg-yellow-400/20 text-yellow-300"
                  : "border-white/15 bg-white/5"
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      </section>

      <section className="mb-4 min-h-0 flex-1">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Board</p>
          {board && (
            <span className="text-xs text-white/50">balance {board.score}</span>
          )}
        </div>
        <div className="overflow-hidden rounded-2xl border border-white/10">
          {board && theme ? (
            <HexBoard board={board} theme={theme} className="aspect-square w-full" />
          ) : (
            <div className="flex aspect-square items-center justify-center text-white/40">
              Generating…
            </div>
          )}
        </div>
        <button
          onClick={() => setBoard(numPlayers === 2 ? createDuelBoard() : generateBoard())}
          className="mt-2 w-full rounded-xl bg-white/10 py-2.5 text-sm font-semibold"
        >
          🔀 Regenerate board
        </button>
      </section>

      <button
        disabled={!board}
        onClick={start}
        className="rounded-2xl bg-yellow-500 py-4 text-lg font-black text-slate-900 disabled:opacity-40"
      >
        Start game
      </button>
    </main>
  );
}

function getThemeFrom(themes: Theme[], id: string): Theme | null {
  if (themes.length === 0) return null;
  return themes.find((t) => t.id === id) ?? getTheme(id);
}
