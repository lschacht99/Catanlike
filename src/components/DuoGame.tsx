"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Client } from "boardgame.io/react";
import type { BoardProps } from "boardgame.io/react";
import type { GameState } from "@/types/game";
import { createDuoGame } from "@/game/game";
import { getTheme } from "@/game/themes";
import GameBoardPlay from "./GameBoardPlay";
import {
  BOT_LOCK_TTL_MS,
  HOST_SEAT,
  canonicalPlayerSetups,
  devicePlayerSetups,
  humanSeats,
  isBotSlot,
  isNewerSnapshot,
  roomSeats,
  seatName,
  serializeSnapshot,
  reviveSnapshot,
  shouldNotifyTurn,
  turnId,
  turnNotificationText,
  type DuoRoom,
  type DuoSeat,
  type DuoSnapshot,
} from "@/lib/duo/protocol";
import {
  claimBotTurnLock,
  claimTurnNotification,
  clearBotTurnLock,
  fetchRoom,
  isPresent,
  publishSnapshot,
  savePushSubscription,
  startPresence,
  watchRoom,
} from "@/lib/duo/room";
import { runBotTurn } from "@/lib/duo/botRunner";
import {
  disableTurnNotifications,
  enableTurnNotifications,
  sendTurnPush,
} from "@/lib/duo/push";

type SyncStatus = "connecting" | "online" | "syncing" | "reconnecting";

interface DuoGameProps {
  roomId: string;
  seat: DuoSeat;
}

/** Short "beep" via WebAudio — no audio asset to load. */
function playTurnChime(): void {
  try {
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audio = new AudioCtx();
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.frequency.value = 740;
    gain.gain.setValueAtTime(0.12, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.5);
    osc.connect(gain).connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + 0.5);
  } catch {
    // Audio blocked before first interaction — vibration/banner still fire.
  }
}

/**
 * The Firebase-synced online game (2–4 seats, humans and bots). Each phone
 * runs a local boardgame.io client rebuilt from the latest shared snapshot;
 * a move made HERE is published with a revision compare-and-swap (rejected
 * if out of turn or stale), and a snapshot arriving from ANOTHER phone
 * remounts the local client. On a bot's turn every connected human races
 * for the botTurnLock (host preferred); the winner replays the shared bot
 * engine on a headless client and publishes the result through the same
 * pipeline as a human move — see the "bot turns" effect below. Refresh /
 * reconnect just re-reads the latest snapshot.
 */
export default function DuoGame({ roomId, seat }: DuoGameProps) {
  const theme = getTheme("hamsa");
  const [room, setRoom] = useState<DuoRoom | null | undefined>(undefined);
  const [base, setBase] = useState<{ snapshot: DuoSnapshot; revision: number } | null>(null);
  const [status, setStatus] = useState<SyncStatus>("connecting");
  const [banner, setBanner] = useState<string | null>(null);
  const [pushState, setPushState] = useState<"off" | "on" | "busy">("off");
  const [pushError, setPushError] = useState<string | null>(null);

  const appliedRevision = useRef(-1);
  const roomRef = useRef<DuoRoom | null>(null);
  const lastCtxRef = useRef<DuoSnapshot["ctx"] | null>(null);
  const publishChain = useRef<Promise<void>>(Promise.resolve());
  const lastBannerTurn = useRef("");

  // --- live room subscription + presence -----------------------------------
  useEffect(() => {
    let unsubscribed = false;
    const stop = watchRoom(roomId, (next) => {
      if (unsubscribed) return;
      setRoom(next);
      roomRef.current = next;
      if (!next) return;
      setStatus("online");
      setPushState(next.players[seat]?.pushSubscription ? "on" : "off");
      if (isNewerSnapshot(appliedRevision.current, next.revision)) {
        appliedRevision.current = next.revision;
        const snapshot = reviveSnapshot(next.snapshot);
        lastCtxRef.current = snapshot.ctx;
        setBase({ snapshot, revision: next.revision });
      }
    });
    const stopPresence = startPresence(roomId, seat);
    const onOffline = () => setStatus("reconnecting");
    window.addEventListener("offline", onOffline);
    return () => {
      unsubscribed = true;
      stop();
      stopPresence();
      window.removeEventListener("offline", onOffline);
    };
  }, [roomId, seat]);

  // --- in-app fallback: banner + vibration + chime when it becomes my turn --
  const myName = room ? seatName(room, seat) : "You";
  useEffect(() => {
    if (!base) return;
    const { ctx } = base.snapshot;
    const key = `${ctx.turn}:${ctx.currentPlayer}`;
    if (ctx.currentPlayer === seat && lastBannerTurn.current && lastBannerTurn.current !== key) {
      setBanner("Your turn!");
      if ("vibrate" in navigator) navigator.vibrate?.([120, 60, 120]);
      playTurnChime();
      const timer = window.setTimeout(() => setBanner(null), 4000);
      return () => window.clearTimeout(timer);
    }
    lastBannerTurn.current = key;
  }, [base, seat]);
  useEffect(() => {
    if (base) lastBannerTurn.current = `${base.snapshot.ctx.turn}:${base.snapshot.ctx.currentPlayer}`;
  }, [base]);

  // Turn passed to a waiting human → maybe send ONE push (deduped, never to
  // a bot seat). Shared by the human publish path and the bot runner.
  const notifyTurnChange = useCallback(
    async (previousActivePlayer: string, nextCtx: DuoSnapshot["ctx"]) => {
      const currentRoom = roomRef.current;
      const decision = shouldNotifyTurn({
        roomId,
        previousActivePlayer,
        nextCtx,
        lastNotifiedTurnId: currentRoom?.lastNotifiedTurnId,
        players: currentRoom?.players,
      });
      if (!decision.notify || !currentRoom) return;
      const claimed = await claimTurnNotification(roomId, decision.turnId);
      const subscription = currentRoom.players[decision.waitingSeat]?.pushSubscription;
      if (claimed && subscription) {
        const text = turnNotificationText(seatName(currentRoom, decision.waitingSeat));
        await sendTurnPush({
          subscriptionJson: subscription,
          title: text.title,
          body: text.body,
          url: `${window.location.origin}${window.location.pathname}?room=${roomId}`,
        });
      }
    },
    [roomId],
  );

  // Out of turn / stale / raced — hard re-sync from the source of truth.
  const resync = useCallback(async () => {
    setStatus("reconnecting");
    const fresh = await fetchRoom(roomId);
    if (fresh) {
      appliedRevision.current = fresh.revision;
      const snap = reviveSnapshot(fresh.snapshot);
      lastCtxRef.current = snap.ctx;
      setBase({ snapshot: snap, revision: fresh.revision });
      setStatus("online");
    }
  }, [roomId]);

  // --- publish a locally produced state -------------------------------------
  const onLocalState = useCallback(
    (G: GameState, ctx: BoardProps<GameState>["ctx"]) => {
      publishChain.current = publishChain.current.then(async () => {
        const previous = lastCtxRef.current;
        const players = roomRef.current?.players ?? {};
        const snapshot = serializeSnapshot(G, ctx, canonicalPlayerSetups(players));
        setStatus("syncing");
        const result = await publishSnapshot({
          roomId,
          seat,
          baseRevision: appliedRevision.current,
          snapshot,
        });
        if (result.ok) {
          appliedRevision.current = result.revision;
          lastCtxRef.current = snapshot.ctx;
          setStatus("online");
          await notifyTurnChange(previous?.currentPlayer ?? seat, snapshot.ctx);
        } else {
          await resync();
        }
      });
    },
    [roomId, seat, notifyTurnChange, resync],
  );

  // --- bot turns: claim the room-wide lock, replay the shared bot engine ----
  // Every human device watches for a bot's turn. The host tries first (with
  // a natural 600–1200ms "thinking" pause); other humans hang back a few
  // seconds as fallback; a second timer takes over a STALE lock whose
  // claimer disappeared mid-run. The RTDB transaction guarantees exactly one
  // winner per turnId, and the revision CAS makes any duplicate a no-op.
  const botAttempt = useRef("");
  useEffect(() => {
    if (!base) return;
    const snapCtx = base.snapshot.ctx;
    const players = roomRef.current?.players ?? {};
    if (!isBotSlot(players[snapCtx.currentPlayer as DuoSeat])) return;
    const tid = turnId(roomId, snapCtx);
    const revisionAtStart = base.revision;
    let cancelled = false;

    const attempt = async (takeover: boolean) => {
      if (cancelled || appliedRevision.current !== revisionAtStart) return;
      if (!takeover && botAttempt.current === tid) return;
      const claimed = await claimBotTurnLock(roomId, {
        turnId: tid,
        playerId: snapCtx.currentPlayer,
        claimedBy: seat,
      });
      if (!claimed || cancelled) return;
      botAttempt.current = tid;
      setStatus("syncing");
      try {
        const result = runBotTurn({
          snapshot: base.snapshot,
          botSeat: snapCtx.currentPlayer,
          variant: base.snapshot.G.variant ?? "base",
        });
        if (!result || cancelled) return;
        const wire = serializeSnapshot(result.G, result.ctx, canonicalPlayerSetups(roomRef.current?.players ?? {}));
        const pub = await publishSnapshot({ roomId, seat, baseRevision: revisionAtStart, snapshot: wire });
        if (cancelled) return;
        if (pub.ok) {
          appliedRevision.current = pub.revision;
          lastCtxRef.current = wire.ctx;
          setBase({ snapshot: reviveSnapshot(wire), revision: pub.revision });
          setStatus("online");
          await notifyTurnChange(snapCtx.currentPlayer, wire.ctx);
        } else {
          await resync();
        }
      } finally {
        await clearBotTurnLock(roomId, tid);
      }
    };

    const headStart = seat === HOST_SEAT ? 600 + Math.random() * 600 : 3600 + Math.random() * 900;
    const t1 = window.setTimeout(() => void attempt(false), headStart);
    const t2 = window.setTimeout(() => void attempt(true), headStart + BOT_LOCK_TTL_MS + 1500);
    return () => {
      cancelled = true;
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, roomId, seat]);

  // --- local boardgame.io client rebuilt per applied remote revision --------
  const DuoClient = useMemo(() => {
    if (!base) return null;
    const { G, ctx } = base.snapshot;
    // This device drives ONLY its own seat (plus the bots, if it's the host);
    // every other seat renders as remote. Seat types never change after the
    // room is created, so reading them from the ref is safe here.
    const setups = devicePlayerSetups(roomRef.current?.players ?? {}, seat);
    const localG: GameState = {
      ...G,
      playerSetups: setups.length === G.numPlayers ? setups : G.playerSetups,
    };
    const playerModes = (localG.playerSetups ?? []).map((s) => s.mode);
    const botSeats = roomSeats(roomRef.current?.players ?? {}).filter((s) => isBotSlot(roomRef.current?.players?.[s]));
    const startPhase = ctx.phase === "setup" ? ("setup" as const) : ("play" as const);
    const Board = (props: BoardProps<GameState>) => (
      <DuoBoard {...props} onLocalState={onLocalState} theme={theme} playerModes={playerModes} variant={G.variant ?? "base"} remoteBotSeats={botSeats} />
    );
    return Client<GameState>({
      game: createDuoGame(localG, startPhase, ctx.playOrderPos ?? Number(ctx.currentPlayer)),
      board: Board,
      numPlayers: G.numPlayers,
      debug: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, seat, onLocalState]);

  // --- notifications toggle --------------------------------------------------
  async function togglePush() {
    setPushError(null);
    setPushState("busy");
    try {
      if (pushState === "on") {
        await savePushSubscription(roomId, seat, null);
        await disableTurnNotifications();
        setPushState("off");
      } else {
        const result = await enableTurnNotifications();
        if (result.ok) {
          await savePushSubscription(roomId, seat, result.subscriptionJson);
          setPushState("on");
        } else {
          setPushError(result.reason);
          setPushState("off");
        }
      }
    } catch (error) {
      setPushError(String((error as Error).message ?? error));
      setPushState("off");
    }
  }

  if (room === undefined) {
    return <main className="flex min-h-dvh items-center justify-center bg-slate-950 text-slate-300">Connecting to room {roomId}…</main>;
  }
  if (room === null) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-slate-950 p-6 text-center text-slate-200">
        <p className="text-lg font-bold">Room {roomId} was not found.</p>
        <Link href="/duo/" className="rounded-full bg-yellow-500 px-6 py-3 font-black text-slate-900">Back to lobby</Link>
      </main>
    );
  }

  // Other HUMAN seats: who still has to join, who's online right now.
  const otherHumans = humanSeats(room.players).filter((s) => s !== seat);
  const pendingHumans = otherHumans.filter((s) => !room.players[s]?.joined);
  const onlineHumans = otherHumans.filter((s) => room.players[s]?.joined && isPresent(room.presence?.[s]));
  const opponentStatus =
    otherHumans.length === 0
      ? "You vs bots"
      : pendingHumans.length > 0
        ? `Waiting for ${pendingHumans.map((s) => seatName(room, s)).join(", ")}…`
        : otherHumans.length === 1
          ? isPresent(room.presence?.[otherHumans[0]])
            ? `${seatName(room, otherHumans[0])} online`
            : `${seatName(room, otherHumans[0])} away`
          : `${onlineHumans.length}/${otherHumans.length} opponents online`;
  const active = base?.snapshot.ctx.currentPlayer;
  const activeIsBot = active !== undefined && room.players[active as DuoSeat]?.type === "bot";
  const whoseTurn =
    active === seat ? "Your turn" : `${active ? seatName(room, active as DuoSeat) : "…"}’s turn${activeIsBot ? " 🤖" : ""}`;
  const lastMove = base?.snapshot.G.log?.[base.snapshot.G.log.length - 1] ?? "";

  return (
    <div className="relative">
      {/* Status strip: connection, opponent, whose turn, last move. */}
      <div className="fixed inset-x-0 top-0 z-[60] flex items-center gap-2 bg-slate-950/95 px-3 py-1.5 text-[11px] text-slate-300 backdrop-blur">
        <span className={`h-2 w-2 shrink-0 rounded-full ${status === "online" ? "bg-emerald-400" : status === "syncing" ? "bg-yellow-400" : "bg-red-400"}`} />
        <span className="font-bold uppercase tracking-wide">{status}</span>
        <span className="text-slate-500">·</span>
        <span className="truncate">{opponentStatus}</span>
        <span className="text-slate-500">·</span>
        <span className="font-bold text-yellow-300">{whoseTurn}</span>
        {lastMove && <span className="ml-auto hidden truncate text-slate-400 sm:block">{lastMove}</span>}
        <button
          onClick={togglePush}
          disabled={pushState === "busy"}
          className={`ml-auto shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black sm:ml-2 ${pushState === "on" ? "bg-emerald-500 text-slate-950" : "bg-white/15 text-white"}`}
        >
          {pushState === "on" ? "🔔 On" : pushState === "busy" ? "…" : "🔕 Enable turn notifications"}
        </button>
      </div>

      {pushError && (
        <div className="fixed inset-x-2 top-9 z-[60] rounded-xl border border-red-400/40 bg-red-950/95 p-2 text-[11px] text-red-100" onClick={() => setPushError(null)}>
          {pushError}
        </div>
      )}

      {/* In-app fallback banner when it becomes my turn and the app is open. */}
      {banner && (
        <div className="pointer-events-none fixed inset-x-0 top-10 z-[60] flex justify-center">
          <div className="rounded-full bg-yellow-500 px-5 py-2 text-sm font-black text-slate-900 shadow-2xl">
            🎲 {banner} ({myName})
          </div>
        </div>
      )}

      {/* Waiting room until every human seat is claimed (bots never wait). */}
      {pendingHumans.length > 0 && (
        <div className="fixed inset-x-0 bottom-24 z-[60] mx-4 rounded-2xl border border-white/15 bg-slate-900/95 p-3 text-center text-xs text-slate-200">
          Share room code <b className="tracking-[0.3em] text-yellow-300">{roomId}</b>
          {room.pin ? <> (PIN <b>{room.pin}</b>)</> : null} — waiting for{" "}
          {pendingHumans.map((s) => seatName(room, s)).join(", ")} to join.
        </div>
      )}

      <div className="pt-7">{DuoClient ? <DuoClient playerID={seat} /> : null}</div>
    </div>
  );
}

/**
 * Board wrapper that reports LOCALLY-caused state changes. A remote snapshot
 * remounts the whole client (new component instance), so the first render's
 * state is never re-published — only real local moves are.
 */
function DuoBoard(
  props: BoardProps<GameState> & {
    onLocalState: (G: GameState, ctx: BoardProps<GameState>["ctx"]) => void;
    theme: ReturnType<typeof getTheme>;
    playerModes: ("human" | "remote" | "bot")[];
    variant: "base" | "cities-knights";
    remoteBotSeats: string[];
  },
) {
  const { onLocalState, G, ctx } = props;
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    onLocalState(G, ctx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [G, ctx]);
  return (
    <GameBoardPlay
      {...props}
      theme={props.theme}
      playerModes={props.playerModes}
      variant={props.variant}
      remoteBotSeats={props.remoteBotSeats}
      handoffGate={false}
    />
  );
}
