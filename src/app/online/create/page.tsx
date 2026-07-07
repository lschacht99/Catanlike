"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Board } from "@/types/game";
import type { Theme } from "@/types/theme";
import { generateBoard } from "@/game/generator";
import { allThemes } from "@/game/themes";
import { createMatch, joinMatch } from "@/lib/online";
import { loadProfile } from "@/lib/profile";
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

export default function CreateOnlineGamePage() {
  const router = useRouter();
  const [numPlayers, setNumPlayers] = useState(4);
  const [themeId, setThemeId] = useState("classic");
  const [themes, setThemes] = useState<Theme[]>([]);
  const [name, setName] = useState("");
  const [board, setBoard] = useState<Board | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setThemes(allThemes());
    setBoard(generateBoard());
    setName(loadProfile().name);
  }, []);

  const theme = themes.find((t) => t.id === themeId) ?? themes[0];

  async function create() {
    if (!board) return;
    setBusy(true);
    setError(null);
    try {
      const matchID = await createMatch(numPlayers, board, themeId);
      await joinMatch(matchID, name.trim() || "Nomad", themeId);
      router.push(`/online/room?m=${matchID}`);
    } catch {
      setError(
        "Could not reach the game server. Make sure it is running (npm run server).",
      );
      setBusy(false);
    }
  }

  return (
    <Shell>
      <TopBar title="Create Game" />

      <Card className="mb-4">
        <SectionLabel>Your name</SectionLabel>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nomad"
          className="w-full rounded-xl border border-line bg-parchment px-3 py-2.5 text-sm text-ink outline-none focus:border-ink/40"
        />
      </Card>

      <Card className="mb-4">
        <SectionLabel>Players</SectionLabel>
        <div className="grid grid-cols-3 gap-2">
          {[2, 3, 4].map((n) => (
            <Chip key={n} selected={numPlayers === n} onClick={() => setNumPlayers(n)}>
              {n}
            </Chip>
          ))}
        </div>
      </Card>

      <Card className="mb-4">
        <SectionLabel>Board theme</SectionLabel>
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
          <SectionLabel>Board</SectionLabel>
          {board && (
            <span className="text-xs font-semibold text-ink-soft">
              balance {board.score}
            </span>
          )}
        </div>
        <div className="overflow-hidden rounded-xl border border-line">
          {board && theme ? (
            <HexBoard board={board} theme={theme} className="aspect-[4/3] w-full" />
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center text-ink-faint">
              Generating…
            </div>
          )}
        </div>
        <SecondaryButton onClick={() => setBoard(generateBoard())} className="mt-3">
          Regenerate
        </SecondaryButton>
      </Card>

      {error && (
        <p className="mb-3 rounded-xl border border-rust/40 bg-rust/10 px-3 py-2 text-sm text-rust">
          {error}
        </p>
      )}

      <PrimaryButton disabled={!board || busy} onClick={create}>
        {busy ? "Creating…" : "Create Game"}
      </PrimaryButton>
    </Shell>
  );
}
