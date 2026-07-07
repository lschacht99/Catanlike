"use client";

import { useEffect, useState } from "react";
import { BottomNav, Card, SectionLabel, Shell, TopBar } from "@/components/ui";
import { loadProfile, loadResults, type GameResult } from "@/lib/profile";

export default function StatsPage() {
  const [results, setResults] = useState<GameResult[]>([]);
  const [myName, setMyName] = useState("Nomad");

  useEffect(() => {
    setResults(loadResults());
    setMyName(loadProfile().name);
  }, []);

  const games = results.length;
  const wins = results.filter((r) => r.winner === myName).length;
  const winRate = games > 0 ? Math.round((wins / games) * 100) : 0;
  const bestRoad = Math.max(0, ...results.map((r) => r.longestRoad));
  const bestArmy = Math.max(0, ...results.map((r) => r.largestArmy));
  const totalPoints = results.reduce((s, r) => s + r.points, 0);

  const tiles = [
    { label: "Games played", value: games },
    { label: "Wins", value: wins },
    { label: "Win rate", value: `${winRate}%` },
    { label: "Longest route", value: bestRoad },
    { label: "Largest army", value: bestArmy },
    { label: "Legacy points", value: totalPoints },
  ];

  return (
    <>
      <Shell withNav>
        <TopBar title="Stats" />

        <Card className="mb-4">
          <SectionLabel>Overview — {myName}</SectionLabel>
          <div className="grid grid-cols-3 gap-y-4">
            {tiles.map((t) => (
              <div key={t.label} className="text-center">
                <p className="font-display text-2xl font-bold text-ink">{t.value}</p>
                <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-ink-soft">
                  {t.label}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <SectionLabel>Recent journeys</SectionLabel>
        {results.length === 0 ? (
          <Card className="py-10 text-center text-sm text-ink-soft">
            No finished games yet.
            <br />
            Results are recorded on this device when a game ends.
          </Card>
        ) : (
          <div className="space-y-2.5">
            {results.slice(0, 20).map((r) => (
              <Card key={r.date} className="flex items-center gap-3 !p-3">
                <span className="text-xl">🏆</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink">
                    {r.winner} won with {r.points} points
                  </p>
                  <p className="truncate text-[11px] text-ink-soft">
                    {r.players.join(" · ")} — {new Date(r.date).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right text-[10px] text-ink-soft">
                  <p>🛤️ {r.longestRoad}</p>
                  <p>🛡️ {r.largestArmy}</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Shell>
      <BottomNav active="/stats" />
    </>
  );
}
