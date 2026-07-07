"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { clearSeat, getMatch, loadSeat, lobbyClient, GAME_NAME, type MatchInfo } from "@/lib/online";
import { Card, PrimaryButton, SectionLabel, Shell, TopBar } from "@/components/ui";
import { PLAYER_COLORS } from "@/game/constants";

export default function WaitingRoomPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const matchID = params.id;
  const [match, setMatch] = useState<MatchInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setMatch(await getMatch(matchID));
      setError(null);
    } catch {
      setError("Lost contact with the game server.");
    }
  }, [matchID]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 2000);
    return () => clearInterval(timer);
  }, [refresh]);

  const seats = match?.players ?? [];
  const joined = seats.filter((p) => p.name !== undefined);
  const full = seats.length > 0 && joined.length === seats.length;

  useEffect(() => {
    if (full) router.push(`/online/play/${matchID}`);
  }, [full, matchID, router]);

  async function leave() {
    const seat = loadSeat(matchID);
    if (seat) {
      try {
        await lobbyClient().leaveMatch(GAME_NAME, matchID, {
          playerID: seat.playerID,
          credentials: seat.credentials,
        });
      } catch {
        // Leaving best-effort; still clear locally.
      }
      clearSeat(matchID);
    }
    router.push("/");
  }

  async function copyCode() {
    await navigator.clipboard.writeText(matchID);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Shell>
      <TopBar title="Waiting Room" />

      <Card className="mb-4 text-center">
        <SectionLabel>Game code</SectionLabel>
        <button
          onClick={copyCode}
          className="mx-auto block break-all rounded-xl border border-dashed border-ink/30 bg-parchment px-4 py-3 font-mono text-lg tracking-widest text-ink"
        >
          {matchID}
        </button>
        <p className="mt-2 text-xs text-ink-soft">
          {copied ? "Copied!" : "Tap to copy — share this code with friends"}
        </p>
      </Card>

      <Card className="mb-5">
        <SectionLabel>
          Players ({joined.length}/{seats.length || "…"})
        </SectionLabel>
        <ul className="divide-y divide-line">
          {seats.map((p) => (
            <li key={p.id} className="flex items-center gap-3 py-3">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-cream"
                style={{ background: PLAYER_COLORS[p.id] }}
              >
                {p.name ? p.name[0].toUpperCase() : "?"}
              </span>
              <span className="flex-1 text-sm font-semibold text-ink">
                {p.name ?? "Waiting for player…"}
              </span>
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  p.name ? "bg-olive" : "bg-line"
                }`}
              />
              <span className="text-xs text-ink-soft">{p.name ? "Ready" : ""}</span>
            </li>
          ))}
        </ul>
      </Card>

      {error && (
        <p className="mb-3 rounded-xl border border-rust/40 bg-rust/10 px-3 py-2 text-sm text-rust">
          {error}
        </p>
      )}

      <PrimaryButton disabled={!full} onClick={() => router.push(`/online/play/${matchID}`)}>
        {full ? "Start Game" : "Waiting for players…"}
      </PrimaryButton>
      <button onClick={leave} className="mt-3 w-full text-center text-sm text-ink-soft underline">
        Leave room
      </button>
    </Shell>
  );
}
