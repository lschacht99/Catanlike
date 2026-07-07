"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Board } from "@/types/game";
import type { Theme } from "@/types/theme";
import { PLAYER_COLORS } from "@/game/constants";
import { generateBoard } from "@/game/generator";
import { createDuelBoard } from "@/game/board-generator/presets";
import { allThemes } from "@/game/themes";
import { saveGameConfig } from "@/lib/storage";
import HexBoard from "@/components/HexBoard";
import {
  Card,
  Chip,
  PrimaryButton,
  SecondaryButton,
  SectionLabel,
  Shell,
  TopBar,
} from "@/components/ui";

const DEFAULT_NAMES = ["Player 1", "Player 2", "Player 3", "Player 4"];

export default function NewGamePage() {
  const router = useRouter();
  const [numPlayers, setNumPlayers] = useState(3);
  const [themeId, setThemeId] = useState("classic");
  const [themes, setThemes] = useState<Theme[]>([]);
  const [names, setNames] = useState<string[]>(DEFAULT_NAMES);
  const [board, setBoard] = useState<Board | null>(null);

  useEffect(() => {
    setThemes(allThemes());
    setBoard(generateBoard());
  }, []);

  function pickPlayers(n: number) {
    setNumPlayers(n);
    // Two nomads duel on the compact 7-hex board; more get the classic 19.
    setBoard(n === 2 ? createDuelBoard() : generateBoard());
  }

  const theme = themes.find((t) => t.id === themeId) ?? themes[0];

  function start() {
    if (!board) return;
    saveGameConfig({
      numPlayers,
      themeId,
      board,
      playerNames: names.slice(0, numPlayers).map((n, i) => n.trim() || DEFAULT_NAMES[i]),
    });
    router.push("/game");
  }

  return (
    <Shell>
      <TopBar title="New Journey" />

      <Card className="mb-4">
        <SectionLabel>Players</SectionLabel>
        <div className="grid grid-cols-3 gap-2">
          {[2, 3, 4].map((n) => (
            <Chip key={n} selected={numPlayers === n} onClick={() => pickPlayers(n)}>
              {n} players
            </Chip>
          ))}
        </div>
        <div className="mt-3 space-y-2">
          {Array.from({ length: numPlayers }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <span
                className="h-4 w-4 shrink-0 rounded-full border border-ink/20"
                style={{ background: PLAYER_COLORS[i] }}
              />
              <input
                value={names[i]}
                onChange={(e) => {
                  const next = [...names];
                  next[i] = e.target.value;
                  setNames(next);
                }}
                placeholder={DEFAULT_NAMES[i]}
                className="w-full rounded-xl border border-line bg-parchment px-3 py-2 text-sm text-ink outline-none focus:border-ink/40"
              />
            </div>
          ))}
        </div>
      </Card>

      <Card className="mb-4">
        <SectionLabel>Theme</SectionLabel>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {themes.map((t) => (
            <Chip
              key={t.id}
              selected={themeId === t.id}
              onClick={() => setThemeId(t.id)}
              className="shrink-0"
            >
              {t.name}
            </Chip>
          ))}
        </div>
      </Card>

      <Card className="mb-5">
        <div className="mb-2 flex items-center justify-between">
          <SectionLabel>Board · {numPlayers === 2 ? "Duel 7 hexes" : "Classic 19 hexes"}</SectionLabel>
          {board && (
            <span className="text-xs font-semibold text-ink-soft">
              balance {board.score}
            </span>
          )}
        </div>
        <div className="overflow-hidden rounded-xl border border-line">
          {board && theme ? (
            <HexBoard board={board} theme={theme} className="aspect-square w-full" />
          ) : (
            <div className="flex aspect-square items-center justify-center text-ink-faint">
              Generating…
            </div>
          )}
        </div>
        <SecondaryButton onClick={() => setBoard(numPlayers === 2 ? createDuelBoard() : generateBoard())} className="mt-3">
          Regenerate
        </SecondaryButton>
      </Card>

      <PrimaryButton disabled={!board} onClick={start}>
        Start Journey
      </PrimaryButton>
    </Shell>
  );
}
