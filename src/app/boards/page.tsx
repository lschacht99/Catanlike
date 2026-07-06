"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Theme } from "@/types/theme";
import { allThemes } from "@/game/themes";
import {
  deleteSavedBoard,
  loadSavedBoards,
  saveGameConfig,
  type SavedBoard,
} from "@/lib/storage";
import HexBoard from "@/components/HexBoard";

export default function BoardsPage() {
  const router = useRouter();
  const [boards, setBoards] = useState<SavedBoard[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [themeId, setThemeId] = useState("classic");
  const [numPlayers, setNumPlayers] = useState(4);

  useEffect(() => {
    setBoards(loadSavedBoards());
    setThemes(allThemes());
  }, []);

  const theme = themes.find((t) => t.id === themeId) ?? themes[0];

  function play(entry: SavedBoard) {
    saveGameConfig({ numPlayers, themeId, board: entry.board });
    router.push("/game");
  }

  function remove(id: string) {
    deleteSavedBoard(id);
    setBoards(loadSavedBoards());
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 py-6">
      <header className="mb-4 flex items-center gap-3">
        <Link href="/" className="rounded-lg bg-white/10 px-3 py-1.5 text-sm">←</Link>
        <h1 className="text-xl font-bold">Saved Boards</h1>
      </header>

      {boards.length > 0 && (
        <section className="mb-4 flex items-center gap-2">
          <select
            value={themeId}
            onChange={(e) => setThemeId(e.target.value)}
            className="flex-1 rounded-xl border border-white/15 bg-slate-900 px-3 py-2.5 text-sm"
          >
            {themes.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <select
            value={numPlayers}
            onChange={(e) => setNumPlayers(Number(e.target.value))}
            className="rounded-xl border border-white/15 bg-slate-900 px-3 py-2.5 text-sm"
          >
            <option value={3}>3 players</option>
            <option value={4}>4 players</option>
          </select>
        </section>
      )}

      {boards.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <p className="text-4xl">🗺️</p>
          <p className="text-white/60">No saved boards yet.</p>
          <Link
            href="/forge"
            className="rounded-2xl bg-yellow-500 px-6 py-3 font-bold text-slate-900"
          >
            Open Map Forge
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {boards.map((entry) => (
            <li key={entry.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
              {theme && (
                <HexBoard board={entry.board} theme={theme} className="aspect-[4/3] w-full" />
              )}
              <div className="flex items-center justify-between gap-2 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{entry.name}</p>
                  <p className="text-xs text-white/50">balance {entry.board.score}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => remove(entry.id)}
                    className="rounded-xl bg-white/10 px-3 py-2 text-sm"
                    aria-label="Delete board"
                  >
                    🗑️
                  </button>
                  <button
                    onClick={() => play(entry)}
                    className="rounded-xl bg-yellow-500 px-4 py-2 text-sm font-bold text-slate-900"
                  >
                    Play
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
