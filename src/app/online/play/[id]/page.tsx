"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Client } from "boardgame.io/react";
import { SocketIO } from "boardgame.io/multiplayer";
import type { BoardProps } from "boardgame.io/react";
import type { GameState } from "@/types/game";
import { HamsaNomadsGame } from "@/game/game";
import { getTheme } from "@/game/themes";
import { loadSeat, serverUrl, type MatchSeat } from "@/lib/online";
import GameBoard from "@/components/GameBoard";
import { PrimaryLink, Shell } from "@/components/ui";

export default function OnlinePlayPage() {
  const params = useParams<{ id: string }>();
  const matchID = params.id;
  const [seat, setSeat] = useState<MatchSeat | null | undefined>(undefined);

  useEffect(() => {
    setSeat(loadSeat(matchID));
  }, [matchID]);

  const OnlineClient = useMemo(() => {
    if (!seat) return null;
    const theme = getTheme(seat.themeId);
    const Board = (props: BoardProps<GameState>) => (
      <GameBoard {...props} theme={theme} />
    );
    return Client<GameState>({
      game: HamsaNomadsGame,
      board: Board,
      multiplayer: SocketIO({ server: serverUrl() }),
      debug: false,
    });
  }, [seat]);

  if (seat === undefined) {
    return (
      <Shell className="items-center justify-center">
        <p className="text-ink-soft">Loading…</p>
      </Shell>
    );
  }

  if (seat === null || !OnlineClient) {
    return (
      <Shell className="items-center justify-center gap-4 text-center">
        <p className="text-3xl">🪬</p>
        <p className="text-ink-soft">
          You have no seat in this game on this device.
        </p>
        <PrimaryLink href="/online/join">Join with a code</PrimaryLink>
      </Shell>
    );
  }

  return (
    <OnlineClient
      matchID={seat.matchID}
      playerID={seat.playerID}
      credentials={seat.credentials}
    />
  );
}
