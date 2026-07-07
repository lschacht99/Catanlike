"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Client } from "boardgame.io/react";
import type { BoardProps } from "boardgame.io/react";
import type { GameConfig, GameState } from "@/types/game";
import { createHexIslesGame } from "@/game/game";
import { getTheme } from "@/game/themes";
import { loadGameConfig } from "@/lib/storage";
import GameBoard from "@/components/GameBoard";

export default function GamePage() {
  // undefined = still loading from localStorage, null = no game configured.
  const [config, setConfig] = useState<GameConfig | null | undefined>(undefined);

  useEffect(() => {
    setConfig(loadGameConfig());
  }, []);

  const HexIslesClient = useMemo(() => {
    if (!config) return null;
    const theme = getTheme(config.themeId);
    const Board = (props: BoardProps<GameState>) => (
      <GameBoard {...props} theme={theme} />
    );
    return Client<GameState>({
      game: createHexIslesGame(config.board, config.numPlayers, config.playerNames),
      board: Board,
      numPlayers: config.numPlayers,
      debug: false,
    });
  }, [config]);

  if (config === undefined) {
    return (
      <main className="flex min-h-dvh items-center justify-center text-ink-soft">
        Loading…
      </main>
    );
  }

  if (config === null || !HexIslesClient) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-4xl">🪬</p>
        <p className="text-ink-soft">No journey is set up yet.</p>
        <Link
          href="/new"
          className="rounded-full bg-ink px-8 py-3.5 text-sm font-bold uppercase tracking-[0.2em] text-cream shadow-card"
        >
          Start a journey
        </Link>
      </main>
    );
  }

  return <HexIslesClient />;
}
