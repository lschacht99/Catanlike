"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Board } from "@/types/game";
import { generateBoard } from "@/game/generator";
import { getTheme } from "@/game/themes";
import HexBoard from "@/components/HexBoard";

export default function CpuPage() {
  const [board, setBoard] = useState<Board | null>(null);
  const playerModes = ["human", "human", "bot", "bot"];
  const theme = getTheme("classic");

  useEffect(() => {
    setBoard(generateBoard());
  }, []);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 py-5">
      <header className="mb-4 flex items-center gap-3">
        <Link href="/" className="rounded-lg bg-white/10 px-3 py-1.5 text-sm">←</Link>
        <h1 className="text-xl font-black">Setup</h1>
      </header>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
        {playerModes.join(" / ")}
      </div>
      <div className="mt-4 overflow-hidden rounded-3xl border border-white/10">
        {board ? <HexBoard board={board} theme={theme} className="aspect-square w-full" /> : null}
      </div>
    </main>
  );
}
