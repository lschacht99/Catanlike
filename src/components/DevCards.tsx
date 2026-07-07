"use client";

import { useState } from "react";
import type { DevCardType, GameState, ResourceKey } from "@/types/game";
import type { Theme } from "@/types/theme";
import { RESOURCE_KEYS_ORDERED } from "@/game/constants";
import { playableDevCardIndex } from "@/game/rules";
import Sheet from "./Sheet";

export const DEV_CARD_INFO: Record<DevCardType, { label: string; icon: string; desc: string }> = {
  knight: { label: "Knight", icon: "🛡️", desc: "Move the bandit and steal a card." },
  victory: { label: "Victory Point", icon: "⭐", desc: "1 hidden victory point." },
  roadBuilding: { label: "Road Building", icon: "🛤️", desc: "Build 2 roads for free." },
  yearOfPlenty: { label: "Year of Plenty", icon: "🎁", desc: "Take any 2 resources." },
  monopoly: { label: "Monopoly", icon: "🪙", desc: "Take all of one resource from everyone." },
};

interface DevCardsSheetProps {
  G: GameState;
  player: string;
  theme: Theme;
  turn: number;
  /** Whether the viewer may play a card right now (their turn, rolled, no bandit pending). */
  canPlay: boolean;
  onPlayKnight: () => void;
  onPlayRoadBuilding: () => void;
  onPlayYearOfPlenty: (a: ResourceKey, b: ResourceKey) => void;
  onPlayMonopoly: (r: ResourceKey) => void;
  onClose: () => void;
}

function ResourcePicker({
  theme,
  count,
  onConfirm,
  onCancel,
}: {
  theme: Theme;
  count: 1 | 2;
  onConfirm: (picks: ResourceKey[]) => void;
  onCancel: () => void;
}) {
  const [picks, setPicks] = useState<ResourceKey[]>([]);
  return (
    <div className="rounded-2xl border border-line bg-parchment p-3">
      <p className="mb-2 text-xs font-semibold text-ink-soft">
        Choose {count === 1 ? "a resource" : `${count} resources`} ({picks.length}/{count})
      </p>
      <div className="grid grid-cols-5 gap-1.5">
        {RESOURCE_KEYS_ORDERED.map((key) => (
          <button
            key={key}
            onClick={() => setPicks((p) => (p.length < count ? [...p, key] : p))}
            className="flex flex-col items-center rounded-xl border border-line bg-cream py-2"
          >
            <span className="text-lg">{theme.resources[key].icon}</span>
            <span className="text-[9px] text-ink-soft">
              {picks.filter((p) => p === key).length || ""}
            </span>
          </button>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button onClick={onCancel} className="rounded-full border border-line bg-cream py-2 text-xs font-bold uppercase tracking-widest text-ink">
          Cancel
        </button>
        <button
          disabled={picks.length !== count}
          onClick={() => onConfirm(picks)}
          className="rounded-full bg-ink py-2 text-xs font-bold uppercase tracking-widest text-cream disabled:opacity-40"
        >
          Confirm
        </button>
      </div>
    </div>
  );
}

export default function DevCardsSheet({
  G,
  player,
  theme,
  turn,
  canPlay,
  onPlayKnight,
  onPlayRoadBuilding,
  onPlayYearOfPlenty,
  onPlayMonopoly,
  onClose,
}: DevCardsSheetProps) {
  const [picking, setPicking] = useState<"yearOfPlenty" | "monopoly" | null>(null);
  const hand = G.players[player].devCards;

  const grouped = new Map<DevCardType, number>();
  for (const card of hand) grouped.set(card.type, (grouped.get(card.type) ?? 0) + 1);

  function playability(type: DevCardType): { playable: boolean; hint: string } {
    if (type === "victory") return { playable: false, hint: "Counts at game end" };
    if (!canPlay) return { playable: false, hint: "Not now" };
    if (G.playedDevCardThisTurn) return { playable: false, hint: "1 card per turn" };
    const idx = playableDevCardIndex(G, player, type, turn);
    return idx >= 0
      ? { playable: true, hint: "" }
      : { playable: false, hint: "Bought this turn" };
  }

  return (
    <Sheet title="Journey Cards" onClose={onClose}>
      {hand.length === 0 ? (
        <p className="rounded-2xl border border-line bg-cream p-6 text-center text-sm text-ink-soft">
          No cards yet — buy one from the Build menu.
        </p>
      ) : (
        <div className="space-y-2.5">
          {[...grouped.entries()].map(([type, count]) => {
            const info = DEV_CARD_INFO[type];
            const { playable, hint } = playability(type);
            return (
              <div
                key={type}
                className="flex items-center gap-3 rounded-2xl border border-line bg-cream p-3 shadow-card"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-parchment text-xl">
                  {info.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold uppercase tracking-wider text-ink">
                    {info.label} {count > 1 && <span className="text-rust">×{count}</span>}
                  </p>
                  <p className="text-[11px] text-ink-soft">
                    {type === "knight"
                      ? `Move the ${theme.bandit.label.toLowerCase()} and steal a card.`
                      : info.desc}
                  </p>
                </div>
                {playable ? (
                  <button
                    onClick={() => {
                      if (type === "knight") {
                        onPlayKnight();
                        onClose();
                      } else if (type === "roadBuilding") {
                        onPlayRoadBuilding();
                        onClose();
                      } else {
                        setPicking(type as "yearOfPlenty" | "monopoly");
                      }
                    }}
                    className="rounded-full bg-ink px-4 py-2 text-xs font-bold uppercase tracking-widest text-cream"
                  >
                    Play
                  </button>
                ) : (
                  <span className="max-w-[72px] text-right text-[10px] leading-tight text-ink-faint">
                    {hint}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {picking && (
        <div className="mt-3">
          <ResourcePicker
            theme={theme}
            count={picking === "yearOfPlenty" ? 2 : 1}
            onCancel={() => setPicking(null)}
            onConfirm={(picks) => {
              if (picking === "yearOfPlenty") onPlayYearOfPlenty(picks[0], picks[1]);
              else onPlayMonopoly(picks[0]);
              setPicking(null);
              onClose();
            }}
          />
        </div>
      )}
    </Sheet>
  );
}
