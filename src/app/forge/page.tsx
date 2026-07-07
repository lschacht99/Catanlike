"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Board } from "@/types/game";
import type { Theme } from "@/types/theme";
import { generateBoard, randomBoard, scoreBoard } from "@/game/generator";
import { allThemes } from "@/game/themes";
import { saveBoard } from "@/lib/storage";
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
    <Shell>
      <TopBar title="Map Forge" />

      <Card className="mb-4">
        <SectionLabel>Theme preview</SectionLabel>
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

      <Card className="mb-4">
        <SectionLabel>Balance</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { id: "fair", label: "⚖️ Fair", hint: "best of 500 boards" },
              { id: "wild", label: "🎲 Wild", hint: "fully random" },
            ] as const
          ).map((m) => (
            <Chip
              key={m.id}
              selected={balance === m.id}
              onClick={() => {
                setBalance(m.id);
                regenerate(m.id);
              }}
            >
              {m.label}
              <span className={`block text-[10px] font-normal ${balance === m.id ? "text-cream/70" : "text-ink-faint"}`}>
                {m.hint}
              </span>
            </Chip>
          ))}
        </div>
      </Card>

      <Card className="mb-5">
        <div className="mb-2 flex items-center justify-between">
          <SectionLabel>Board</SectionLabel>
          {board && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                board.score >= 80 ? "bg-olive/15 text-olive" : "bg-rust/15 text-rust"
              }`}
            >
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
      </Card>

      <div className="grid grid-cols-2 gap-2">
        <SecondaryButton onClick={() => regenerate()}>Regenerate</SecondaryButton>
        <PrimaryButton onClick={save} disabled={!board}>
          {savedFlash ? "✓ Saved!" : "Save board"}
        </PrimaryButton>
      </div>
      <Link
        href="/collection"
        className="mt-4 text-center text-sm text-ink-soft underline"
      >
        View saved boards
      </Link>
    </Shell>
  );
}
