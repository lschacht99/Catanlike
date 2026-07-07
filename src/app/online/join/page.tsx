"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMatch, joinMatch } from "@/lib/online";
import { loadProfile } from "@/lib/profile";
import {
  Card,
  PrimaryButton,
  SectionLabel,
  Shell,
  TopBar,
} from "@/components/ui";

export default function JoinGamePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(loadProfile().name);
  }, []);

  async function join() {
    const matchID = code.trim();
    if (!matchID) return;
    setBusy(true);
    setError(null);
    try {
      const match = await getMatch(matchID);
      const themeId = match.setupData?.themeId ?? "classic";
      await joinMatch(matchID, name.trim() || "Nomad", themeId);
      router.push(`/online/room?m=${matchID}`);
    } catch {
      setError("Game not found — check the code, or the room may be full.");
      setBusy(false);
    }
  }

  return (
    <Shell>
      <TopBar title="Join Game" />

      <Card className="mb-4">
        <SectionLabel>Game code</SectionLabel>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Paste the code from your host"
          autoCapitalize="off"
          autoCorrect="off"
          className="w-full rounded-xl border border-line bg-parchment px-3 py-3 text-center font-mono text-base tracking-widest text-ink outline-none focus:border-ink/40"
        />
      </Card>

      <Card className="mb-5">
        <SectionLabel>Your name</SectionLabel>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nomad"
          className="w-full rounded-xl border border-line bg-parchment px-3 py-2.5 text-sm text-ink outline-none focus:border-ink/40"
        />
      </Card>

      {error && (
        <p className="mb-3 rounded-xl border border-rust/40 bg-rust/10 px-3 py-2 text-sm text-rust">
          {error}
        </p>
      )}

      <PrimaryButton disabled={!code.trim() || busy} onClick={join}>
        {busy ? "Joining…" : "Join Game"}
      </PrimaryButton>
    </Shell>
  );
}
