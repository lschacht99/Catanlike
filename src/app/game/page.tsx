"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Client } from "boardgame.io/react";
import type { BoardProps } from "boardgame.io/react";
import type { GameConfig, GameState } from "@/types/game";
import { createHexIslesGame } from "@/game/game";
import { getTheme } from "@/game/themes";
import { loadGameConfig } from "@/lib/storage";
import GameBoardPlay from "@/components/GameBoardPlay";

export default function GamePage() {
  const [config, setConfig] = useState<GameConfig | null | undefined>(undefined);

  useEffect(() => {
    setConfig(loadGameConfig());
  }, []);

  const HexIslesClient = useMemo(() => {
    if (!config) return null;
    const theme = getTheme(config.themeId);
    const playerModes = config.playerModes ?? Array.from({ length: config.numPlayers }, () => "human" as const);
    const variant = config.variant ?? "base";
    const Board = (props: BoardProps<GameState>) => (
      <GameBoardPlay {...props} theme={theme} playerModes={playerModes} variant={variant} />
    );
    return Client<GameState>({
      game: createHexIslesGame(config.board, config.numPlayers, {
        playerNames: config.playerNames,
        variant,
      }),
      board: Board,
      numPlayers: config.numPlayers,
      debug: false,
    });
  }, [config]);

  if (config === undefined) {
    return (
      <main className="flex min-h-dvh items-center justify-center text-white/50">
        Loading…
      </main>
    );
  }

  if (config === null || !HexIslesClient) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-4xl">⬡</p>
        <p className="text-white/70">No game is set up yet.</p>
        <Link
          href="/studio"
          className="rounded-2xl bg-yellow-500 px-6 py-3 font-bold text-slate-900"
        >
          Create a game
        </Link>
      </main>
    );
  }

  return <HexIslesClient />;
}
