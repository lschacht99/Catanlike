"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Board, BotDifficulty, GameVariant, PlayerMode, PlayerSetup } from "@/types/game";
import type { Theme } from "@/types/theme";
import { PLAYER_COLORS } from "@/game/constants";
import { generateBoard } from "@/game/generator";
import { createDuelBoard } from "@/game/board-generator/presets";
import { allThemes } from "@/game/themes";
import { saveGameConfig } from "@/lib/storage";
import { BOT_DIFFICULTY_LABELS, PLAYER_MODE_LABELS, joinCodeForSeat } from "@/game/player-control";
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

function NewGamePageInner() {
  const router = useRouter();
  const search = useSearchParams();
  const [numPlayers, setNumPlayers] = useState(3);
  const [themeId, setThemeId] = useState("hamsa");
  const [themes, setThemes] = useState<Theme[]>([]);
  const [names, setNames] = useState<string[]>(DEFAULT_NAMES);
  const [board, setBoard] = useState<Board | null>(null);
  const [playerSetups, setPlayerSetups] = useState<PlayerSetup[]>([
    { mode: "human" },
    { mode: "human" },
    { mode: "bot", botDifficulty: "normal" },
    { mode: "bot", botDifficulty: "normal" },
  ]);
  const variant = (search.get("variant") === "cities-knights" ? "cities-knights" : "base") as GameVariant;
  const localMultiplayer = search.get("multiplayer") === "local";

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

  function setMode(index: number, mode: PlayerMode) {
    setPlayerSetups((current) => {
      const next = [...current];
      next[index] = {
        mode,
        botDifficulty: mode === "bot" ? next[index]?.botDifficulty ?? "normal" : undefined,
        joinCode: mode === "remote" ? next[index]?.joinCode ?? joinCodeForSeat("LOCAL", index) : undefined,
      };
      return next;
    });
  }

  function setDifficulty(index: number, botDifficulty: BotDifficulty) {
    setPlayerSetups((current) => {
      const next = [...current];
      next[index] = { ...next[index], mode: "bot", botDifficulty };
      return next;
    });
  }

  function start() {
    if (!board) return;
    // Each seat carries its own mode (human on this device, remote human, or
    // bot with a difficulty); pass-and-play privacy screens hide human hands.
    const seats = playerSetups.slice(0, numPlayers).map((setup, index) => ({
      mode: setup.mode,
      botDifficulty: setup.mode === "bot" ? setup.botDifficulty ?? "normal" : undefined,
      joinCode: setup.mode === "remote" ? setup.joinCode ?? joinCodeForSeat("LOCAL", index) : undefined,
    }));
    saveGameConfig({
      numPlayers,
      themeId,
      board,
      variant,
      playerNames: names.slice(0, numPlayers).map((n, i) => n.trim() || DEFAULT_NAMES[i]),
      playerModes: seats.map((setup) => setup.mode),
      playerSetups: seats,
    });
    router.push("/game");
  }

  return (
    <Shell>
      <TopBar title={variant === "cities-knights" ? "Cities & Knights" : localMultiplayer ? "Local Multiplayer" : "New Journey"} />

      {localMultiplayer && <Card className="mb-4 text-sm leading-6 text-ink-soft"><b className="text-ink">Local multiplayer:</b> pass-and-play privacy screens hide each hand between turns. Online multiplayer requires running the included server and is not faked on GitHub Pages.</Card>}

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
          {Array.from({ length: numPlayers }).map((_, i) => {
            const mode = playerSetups[i]?.mode ?? "human";
            return (
              <div key={i} className="rounded-xl border border-line bg-parchment/40 p-2">
                <div className="flex items-center gap-2">
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
                    className="min-w-0 flex-1 rounded-xl border border-line bg-parchment px-3 py-2 text-sm text-ink outline-none focus:border-ink/40"
                  />
                  <select
                    value={mode}
                    onChange={(e) => setMode(i, e.target.value as PlayerMode)}
                    aria-label={`Seat ${i + 1} player type`}
                    className="w-24 shrink-0 rounded-xl border border-line bg-parchment px-2 py-2 text-xs text-ink outline-none sm:w-28"
                  >
                    <option value="human">Human</option>
                    <option value="remote">Remote</option>
                    <option value="bot">Bot</option>
                  </select>
                </div>
                <div className="mt-2 rounded-lg border border-line bg-parchment/60 px-3 py-2 text-xs text-ink-soft">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <b className="text-ink">{PLAYER_MODE_LABELS[mode]}</b>
                    {mode === "bot" && (
                      <label className="flex items-center gap-2">
                        Difficulty
                        <select
                          value={playerSetups[i]?.botDifficulty ?? "normal"}
                          onChange={(e) => setDifficulty(i, e.target.value as BotDifficulty)}
                          aria-label={`Seat ${i + 1} bot difficulty`}
                          className="rounded-lg border border-line bg-parchment px-2 py-1 text-xs text-ink outline-none"
                        >
                          {Object.entries(BOT_DIFFICULTY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                      </label>
                    )}
                  </div>
                  {mode === "remote" && (
                    <p className="mt-1 font-semibold text-ink">Join code reserved: {playerSetups[i]?.joinCode ?? joinCodeForSeat("LOCAL", i)}</p>
                  )}
                </div>
              </div>
            );
          })}
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


export default function NewGamePage() {
  return <Suspense fallback={<Shell><TopBar title="New Journey" /></Shell>}><NewGamePageInner /></Suspense>;
}
