"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Client } from "boardgame.io/react";
import type { BoardProps } from "boardgame.io/react";
import type { GameConfig, GameState } from "@/types/game";
import { normalizePlayerSetups } from "@/game/player-control";
import { createHexIslesGame } from "@/game/game";
import { getTheme } from "@/game/themes";
import { loadGameConfig } from "@/lib/storage";
import { loadGame, type SavedGame } from "@/lib/savegame";
import GameBoardPlay from "@/components/GameBoardPlay";

type Setup =
  | { kind: "new"; config: GameConfig }
  | { kind: "resume"; save: SavedGame }
  | null;

function GamePageInner() {
  const params = useSearchParams();
  const resume = params.get("resume") === "1";
  const [setup, setSetup] = useState<Setup | undefined>(undefined);

  useEffect(() => {
    if (resume) {
      const result = loadGame();
      if (result.status === "ok") {
        setSetup({ kind: "resume", save: result.save });
        return;
      }
    }
    const config = loadGameConfig();
    setSetup(config ? { kind: "new", config } : null);
  }, [resume]);

  const HexIslesClient = useMemo(() => {
    if (!setup) return null;

    if (setup.kind === "resume") {
      const { save } = setup;
      const theme = getTheme(save.themeId);
      const modes = save.playerModes;
      const Board = (props: BoardProps<GameState>) => (
        <GameBoardPlay {...props} theme={theme} playerModes={modes} variant={save.variant} />
      );
      return Client<GameState>({
        game: createResumeGame(save.state, save.playOrderPos),
        board: Board,
        numPlayers: save.numPlayers,
        debug: false,
      });
    }

    const { config } = setup;
    const theme = getTheme(config.themeId);
    const playerSetups = normalizePlayerSetups(config.numPlayers, config.playerSetups, config.playerModes);
    const playerModes = playerSetups.map((setup) => setup.mode);
    const variant = config.variant ?? "base";
    const difficulties = config.difficulties;
    const Board = (props: BoardProps<GameState>) => (
      <GameBoardPlay {...props} theme={theme} playerModes={playerModes} variant={variant} />
    );
    return Client<GameState>({
      game: createHexIslesGame(config.board, config.numPlayers, config.playerNames, variant, playerSetups),
      board: Board,
      numPlayers: config.numPlayers,
      debug: false,
    });
  }, [setup]);

  if (setup === undefined) {
    return (
      <main className="flex min-h-dvh items-center justify-center text-ink-soft">
        Loading…
      </main>
    );
  }

  if (setup === null || !HexIslesClient) {
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

export default function GamePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center text-ink-soft">
          Loading…
        </main>
      }
    >
      <GamePageInner />
    </Suspense>
  );
}
