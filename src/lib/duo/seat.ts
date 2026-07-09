"use client";

import type { DuoSeat } from "./protocol";

/**
 * Which seat THIS device claimed in a room, persisted so a refresh (or the
 * PWA relaunching from a push notification) drops the player straight back
 * into their own seat.
 */
const key = (roomId: string) => `hamsa:duo:seat:${roomId}`;

export function rememberSeat(roomId: string, seat: DuoSeat, name: string): void {
  try {
    window.localStorage.setItem(key(roomId), JSON.stringify({ seat, name }));
  } catch {
    // storage disabled — the play page will ask again
  }
}

export function recallSeat(roomId: string): { seat: DuoSeat; name: string } | null {
  try {
    const raw = window.localStorage.getItem(key(roomId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { seat?: string; name?: string };
    if (parsed.seat !== "0" && parsed.seat !== "1") return null;
    return { seat: parsed.seat, name: parsed.name ?? "" };
  } catch {
    return null;
  }
}
