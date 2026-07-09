"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import type { GameVariant } from "@/types/game";
import { generateBoard } from "@/game/generator";
import { firebaseConfigured } from "@/lib/duo/firebase";
import { createRoom, joinRoom } from "@/lib/duo/room";
import { isValidRoomCode } from "@/lib/duo/protocol";
import { registerServiceWorker } from "@/lib/duo/push";
import { rememberSeat } from "@/lib/duo/seat";
import { Card, PrimaryButton, SectionLabel, Shell, TopBar } from "@/components/ui";

/**
 * "Easy online" lobby: create a private room (6-digit code + optional PIN)
 * or join one — no accounts, works across any networks. Built for exactly
 * two humans on two phones.
 */
function DuoLobbyInner() {
  const router = useRouter();
  const search = useSearchParams();
  const [tab, setTab] = useState<"create" | "join">(search.get("join") ? "join" : "create");
  const [hostName, setHostName] = useState("Moshe");
  const [guestName, setGuestName] = useState("Leah");
  const [variant, setVariant] = useState<GameVariant>("base");
  const [pin, setPin] = useState("");
  const [joinCode, setJoinCode] = useState(search.get("join") ?? "");
  const [joinPin, setJoinPin] = useState(search.get("pin") ?? "");
  const [joinName, setJoinName] = useState("Leah");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ roomId: string; pin: string } | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [installHint, setInstallHint] = useState(false);

  const configured = firebaseConfigured();

  // Pre-register the service worker so "Add to Home Screen" is installable.
  useEffect(() => {
    registerServiceWorker();
  }, []);

  const inviteLink = useMemo(() => {
    if (!created || typeof window === "undefined") return "";
    const url = new URL(window.location.href);
    url.searchParams.set("join", created.roomId);
    if (created.pin) url.searchParams.set("pin", created.pin);
    return url.toString();
  }, [created]);

  useEffect(() => {
    if (!inviteLink) return;
    QRCode.toDataURL(inviteLink, { margin: 1, width: 220 }).then(setQr).catch(() => setQr(null));
  }, [inviteLink]);

  async function onCreate() {
    setBusy(true);
    setError(null);
    try {
      const board = generateBoard(400, Math.random);
      const { roomId } = await createRoom({ board, variant, hostName, guestName, pin: pin.trim() });
      rememberSeat(roomId, "0", hostName);
      setCreated({ roomId, pin: pin.trim() });
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setBusy(false);
    }
  }

  async function onJoin() {
    setBusy(true);
    setError(null);
    try {
      if (!isValidRoomCode(joinCode.trim())) {
        setError("Room codes are 6 digits, e.g. 042137.");
        return;
      }
      const result = await joinRoom(joinCode.trim(), joinPin.trim(), joinName.trim() || undefined);
      if (!result.ok) {
        setError(result.reason === "wrong-pin" ? "Wrong room PIN." : "Room not found — check the code.");
        return;
      }
      rememberSeat(joinCode.trim(), "1", joinName.trim() || "Player 2");
      router.push(`/duo/play/?room=${joinCode.trim()}`);
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setBusy(false);
    }
  }

  if (!configured) {
    return (
      <Shell>
        <TopBar title="Play Online (Easy)" />
        <Card>
          <SectionLabel>Setup needed</SectionLabel>
          <p className="mt-2 text-sm text-ink-soft">
            This deployment has no Firebase configuration yet. Follow the step-by-step guide in{" "}
            <b>README_EASY_ONLINE.md</b> (create a free Firebase project, copy its web config into the
            environment variables, deploy to Vercel) and this screen becomes the two-phone lobby.
          </p>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell>
      <TopBar title="Play Online (Easy)" />

      <div className="mb-4 grid grid-cols-2 gap-2 rounded-full border border-line bg-cream p-1">
        {(["create", "join"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setError(null); }}
            className={`rounded-full py-2 text-xs font-bold uppercase tracking-[0.15em] ${tab === t ? "bg-ink text-cream" : "text-ink-soft"}`}
          >
            {t === "create" ? "Create room" : "Join room"}
          </button>
        ))}
      </div>

      {error && <p className="mb-3 rounded-xl border border-rust/40 bg-rust/10 p-2 text-xs text-rust">{error}</p>}

      {tab === "create" && !created && (
        <Card>
          <SectionLabel>New private room</SectionLabel>
          <div className="mt-2 space-y-2">
            <label className="block text-xs font-semibold text-ink-soft">
              Your name
              <input value={hostName} onChange={(e) => setHostName(e.target.value)} className="mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2 text-sm text-ink" />
            </label>
            <label className="block text-xs font-semibold text-ink-soft">
              Opponent’s name
              <input value={guestName} onChange={(e) => setGuestName(e.target.value)} className="mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2 text-sm text-ink" />
            </label>
            <label className="block text-xs font-semibold text-ink-soft">
              Optional room PIN (extra privacy)
              <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" placeholder="e.g. 1234" className="mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2 text-sm text-ink" />
            </label>
            <div className="flex gap-2">
              {(["base", "cities-knights"] as const).map((v) => (
                <button key={v} onClick={() => setVariant(v)} className={`flex-1 rounded-xl border px-2 py-2 text-xs font-bold ${variant === v ? "border-ink bg-ink text-cream" : "border-line bg-cream text-ink"}`}>
                  {v === "base" ? "Standard" : "Cities & Knights"}
                </button>
              ))}
            </div>
            <PrimaryButton onClick={onCreate} disabled={busy}>
              {busy ? "Creating…" : "Create room"}
            </PrimaryButton>
          </div>
        </Card>
      )}

      {tab === "create" && created && (
        <Card>
          <SectionLabel>Room ready — invite your opponent</SectionLabel>
          <p className="mt-3 text-center text-4xl font-black tracking-[0.3em] text-ink">{created.roomId}</p>
          {created.pin && <p className="mt-1 text-center text-sm text-ink-soft">PIN: <b>{created.pin}</b></p>}
          {qr && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={qr} alt={`QR code to join room ${created.roomId}`} className="mx-auto mt-3 rounded-xl border border-line" />
          )}
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => navigator.clipboard?.writeText(inviteLink)}
              className="flex-1 rounded-xl border border-line bg-cream py-2 text-xs font-bold text-ink"
            >
              Copy invite link
            </button>
            {typeof navigator !== "undefined" && "share" in navigator && (
              <button
                onClick={() => navigator.share({ title: "Hamsa Nomads", text: `Join my game! Room ${created.roomId}`, url: inviteLink }).catch(() => {})}
                className="flex-1 rounded-xl border border-line bg-cream py-2 text-xs font-bold text-ink"
              >
                Share…
              </button>
            )}
          </div>
          <PrimaryButton onClick={() => router.push(`/duo/play/?room=${created.roomId}`)} className="mt-3">
            Enter the game
          </PrimaryButton>
        </Card>
      )}

      {tab === "join" && (
        <Card>
          <SectionLabel>Join with a code</SectionLabel>
          <div className="mt-2 space-y-2">
            <label className="block text-xs font-semibold text-ink-soft">
              Room code
              <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="6 digits" className="mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2 text-center text-lg font-black tracking-[0.3em] text-ink" />
            </label>
            <label className="block text-xs font-semibold text-ink-soft">
              Room PIN (if the host set one)
              <input value={joinPin} onChange={(e) => setJoinPin(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" className="mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2 text-sm text-ink" />
            </label>
            <label className="block text-xs font-semibold text-ink-soft">
              Your name
              <input value={joinName} onChange={(e) => setJoinName(e.target.value)} className="mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2 text-sm text-ink" />
            </label>
            <PrimaryButton onClick={onJoin} disabled={busy}>
              {busy ? "Joining…" : "Join room"}
            </PrimaryButton>
          </div>
        </Card>
      )}

      <Card className="mt-4">
        <SectionLabel>iPhone: get “your turn” notifications</SectionLabel>
        <button onClick={() => setInstallHint((v) => !v)} className="mt-2 text-left text-xs font-bold text-rust underline">
          {installHint ? "Hide instructions" : "Show instructions"}
        </button>
        {installHint && (
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-ink-soft">
            <li>Open this site’s Vercel URL in <b>Safari</b>.</li>
            <li>Tap <b>Share</b> → <b>Add to Home Screen</b>.</li>
            <li>Open the app <b>from the Home Screen icon</b> (required for push on iOS).</li>
            <li>In your game room, tap <b>Enable turn notifications</b> and allow.</li>
          </ol>
        )}
      </Card>

      <p className="mt-4 text-center text-xs text-ink-faint">
        Free prototype stack: Vercel + Firebase Realtime Database. Setup guide:{" "}
        <Link href="https://github.com/lschacht99/Catanlike/blob/main/README_EASY_ONLINE.md" className="underline">README_EASY_ONLINE.md</Link>
      </p>
    </Shell>
  );
}

export default function DuoLobbyPage() {
  return (
    <Suspense fallback={<main className="flex min-h-dvh items-center justify-center text-ink-soft">Loading…</main>}>
      <DuoLobbyInner />
    </Suspense>
  );
}
