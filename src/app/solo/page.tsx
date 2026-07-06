"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { generateBoard } from "@/game/generator";
import { saveGameConfig } from "@/lib/storage";

export default function SoloPage() {
  const router = useRouter();

  useEffect(() => {
    saveGameConfig({
      numPlayers: 4,
      themeId: "hamsa",
      board: generateBoard(450),
      playerModes: ["human", "bot", "bot", "bot"],
      playerNames: ["You", "North CPU", "Desert CPU", "Sea CPU"],
      variant: "cities-knights",
    });
    router.replace("/game");
  }, [router]);

  return (
    <main className="game-shell flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-4xl">🎲</p>
      <h1 className="text-xl font-black">Starting solo mode…</h1>
      <p className="text-sm text-white/55">One human player against three CPU seats.</p>
      <Link href="/studio" className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold">Customize instead</Link>
    </main>
  );
}
