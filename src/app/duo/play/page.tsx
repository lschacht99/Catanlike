"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { firebaseConfigured } from "@/lib/duo/firebase";
import { isValidRoomCode, type DuoSeat } from "@/lib/duo/protocol";
import { recallSeat } from "@/lib/duo/seat";

// The duo client pulls in Firebase + the 3D board — client-only, code-split.
const DuoGame = dynamic(() => import("@/components/DuoGame"), {
  ssr: false,
  loading: () => (
    <main className="flex min-h-dvh items-center justify-center bg-slate-950 text-slate-300">Loading game…</main>
  ),
});

function DuoPlayInner() {
  const params = useSearchParams();
  const roomId = params.get("room") ?? "";
  const [seat, setSeat] = useState<DuoSeat | null | undefined>(undefined);

  useEffect(() => {
    if (!isValidRoomCode(roomId)) {
      setSeat(null);
      return;
    }
    setSeat(recallSeat(roomId)?.seat ?? null);
  }, [roomId]);

  if (!firebaseConfigured() || !isValidRoomCode(roomId) || seat === null) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-slate-950 p-6 text-center text-slate-200">
        <p className="text-sm">
          {!firebaseConfigured()
            ? "Online play isn't configured on this deployment (see README_EASY_ONLINE.md)."
            : "This device hasn't joined that room yet."}
        </p>
        <Link
          href={isValidRoomCode(roomId) ? `/duo/?join=${roomId}` : "/duo/"}
          className="rounded-full bg-yellow-500 px-6 py-3 font-black text-slate-900"
        >
          Go to the lobby
        </Link>
      </main>
    );
  }

  if (seat === undefined) {
    return <main className="flex min-h-dvh items-center justify-center bg-slate-950 text-slate-300">Loading…</main>;
  }

  return <DuoGame roomId={roomId} seat={seat} />;
}

export default function DuoPlayPage() {
  return (
    <Suspense
      fallback={<main className="flex min-h-dvh items-center justify-center bg-slate-950 text-slate-300">Loading…</main>}
    >
      <DuoPlayInner />
    </Suspense>
  );
}
