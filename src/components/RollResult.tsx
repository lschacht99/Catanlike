"use client";

import type { GameState, ResourceKey } from "@/types/game";
import type { Theme } from "@/types/theme";
import { PLAYER_COLORS } from "@/game/constants";

const PIPS: Record<number, [number, number][]> = {
  1: [[8, 8]],
  2: [[4.5, 4.5], [11.5, 11.5]],
  3: [[4.5, 4.5], [8, 8], [11.5, 11.5]],
  4: [[4.5, 4.5], [11.5, 4.5], [4.5, 11.5], [11.5, 11.5]],
  5: [[4.5, 4.5], [11.5, 4.5], [8, 8], [4.5, 11.5], [11.5, 11.5]],
  6: [[4.5, 4], [11.5, 4], [4.5, 8], [11.5, 8], [4.5, 12], [11.5, 12]],
};

function Die({ value }: { value: number }) {
  return (
    <svg width="44" height="44" viewBox="0 0 16 16">
      <rect x="0.8" y="0.8" width="14.4" height="14.4" rx="3" fill="#faf5e9" stroke="#1e3a5f" strokeWidth="1" />
      {PIPS[value]?.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.25" fill="#1e3a5f" />
      ))}
    </svg>
  );
}

interface RollResultProps {
  G: GameState;
  theme: Theme;
  displayName: (id: string) => string;
  onContinue: () => void;
}

export default function RollResult({ G, theme, displayName, onContinue }: RollResultProps) {
  if (!G.lastRoll) return null;
  const [a, b] = G.lastRoll;
  const sum = a + b;
  const gains = Object.entries(G.lastGains);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-6" onClick={onContinue}>
      <div
        className="w-full max-w-sm rounded-3xl border border-line bg-sand p-5 text-center shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-ink-soft">
          Roll Result
        </p>
        <div className="mt-3 flex items-center justify-center gap-3">
          <Die value={a} />
          <Die value={b} />
        </div>
        <p className="mt-2 font-display text-5xl font-bold text-rust">{sum}</p>

        <div className="mt-4 rounded-2xl border border-line bg-cream p-3 text-left">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.25em] text-ink-soft">
            Production
          </p>
          {sum === 7 ? (
            <p className="text-sm text-ink">
              {theme.bandit.icon} The {theme.bandit.label.toLowerCase()} rides — no
              production. Move it to a new tile.
            </p>
          ) : gains.length === 0 ? (
            <p className="text-sm text-ink-soft">No one harvests this time.</p>
          ) : (
            <ul className="space-y-1.5">
              {gains.map(([player, res]) => (
                <li key={player} className="flex items-center gap-2 text-sm">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ background: PLAYER_COLORS[Number(player)] }}
                  />
                  <span className="flex-1 font-semibold text-ink">{displayName(player)}</span>
                  <span className="text-ink">
                    {(Object.entries(res) as [ResourceKey, number][]).map(([key, n]) => (
                      <span key={key} className="ml-1.5">
                        +{n} {theme.resources[key].icon}
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          onClick={onContinue}
          className="mt-4 w-full rounded-full bg-ink py-3 text-sm font-bold uppercase tracking-[0.2em] text-cream"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
