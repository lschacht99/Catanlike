"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Board } from "@/types/game";
import type { Theme } from "@/types/theme";
import { generateBoard, randomBoard, scoreBoard } from "@/game/generator";
import { allThemes } from "@/game/themes";
import { saveBoard } from "@/lib/storage";
import HexBoard from "@/components/HexBoard";

type BalanceMode = "fair" | "wild";

export default function ForgePage() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [themeId, setThemeId] = useState("classic");
  const [balance, setBalance] = useState<BalanceMode>("fair");
  const [board, setBoard] = useState<Board | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    setThemes(allThemes());
    setBoard(generateBoard());
  }, []);

  const theme = themes.find((t) => t.id === themeId) ?? themes[0];

  function regenerate(mode: BalanceMode = balance) {
    if (mode === "fair") {
      setBoard(generateBoard(500));
    } else {
      const b = randomBoard();
      b.score = scoreBoard(b);
      setBoard(b);
    }
  }

  function save() {
    if (!board) return;
    saveBoard({
      id: `board-${Date.now()}`,
      name: `Board ${new Date().toLocaleDateString()} (${board.score})`,
      createdAt: Date.now(),
      board,
    });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 py-6">
      <header className="mb-4 flex items-center gap-3">
        <Link href="/" className="rounded-lg bg-white/10 px-3 py-1.5 text-sm">←</Link>
        <h1 className="text-xl font-bold">Map Forge</h1>
      </header>

      <section className="mb-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">Theme preview</p>
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

      <section className="mb-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">Balance</p>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { id: "fair", label: "⚖️ Fair", hint: "best of 500 boards" },
              { id: "wild", label: "🎲 Wild", hint: "fully random" },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              onClick={() => {
                setBalance(m.id);
                regenerate(m.id);
              }}
              className={`rounded-xl border py-2.5 text-sm font-bold ${
                balance === m.id
                  ? "border-yellow-400 bg-yellow-400/20 text-yellow-300"
                  : "border-white/15 bg-white/5"
              }`}
            >
              {m.label}
              <span className="block text-[10px] font-normal text-white/50">{m.hint}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="mb-4 flex-1">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Board</p>
          {board && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                board.score >= 80 ? "bg-emerald-500/20 text-emerald-300" : "bg-orange-500/20 text-orange-300"
              }`}
            >
              balance {board.score}
            </span>
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
      </section>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => regenerate()}
          className="rounded-2xl bg-white/10 py-3.5 font-bold"
        >
          🔀 Regenerate
        </button>
        <button
          onClick={save}
          disabled={!board}
          className="rounded-2xl bg-yellow-500 py-3.5 font-bold text-slate-900 disabled:opacity-40"
        >
          {savedFlash ? "✓ Saved!" : "💾 Save board"}
        </button>
      </div>
      <Link href="/boards" className="mt-3 text-center text-sm text-white/50 underline">
        View saved boards
      </Link>
    </main>
  );
}
