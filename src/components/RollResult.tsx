"use client";

import type { GameState, ResourceKey } from "@/types/game";
import type { Theme } from "@/types/theme";
import { PLAYER_COLORS } from "@/game/constants";

const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[28, 28], [50, 50], [72, 72]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[28, 25], [72, 25], [28, 50], [72, 50], [28, 75], [72, 75]],
};

const SIZE = 52;
const HALF = SIZE / 2;

/** Where each pip-face sits on the cube. */
const FACE_PLACEMENT: Record<number, string> = {
  1: `translateZ(${HALF}px)`,
  6: `rotateY(180deg) translateZ(${HALF}px)`,
  2: `rotateX(90deg) translateZ(${HALF}px)`,
  5: `rotateX(-90deg) translateZ(${HALF}px)`,
  3: `rotateY(90deg) translateZ(${HALF}px)`,
  4: `rotateY(-90deg) translateZ(${HALF}px)`,
};

/** Cube rotation that brings face `value` to the front. */
const SHOW_FACE: Record<number, string> = {
  1: "rotateX(0deg) rotateY(0deg)",
  6: "rotateY(180deg)",
  2: "rotateX(-90deg)",
  5: "rotateX(90deg)",
  3: "rotateY(-90deg)",
  4: "rotateY(90deg)",
};

function Face({ value }: { value: number }) {
  return (
    <div
      className="absolute inset-0 rounded-[11px]"
      style={{
        transform: FACE_PLACEMENT[value],
        background: "linear-gradient(145deg, #fffdf6 0%, #f6efdd 55%, #eadfc4 100%)",
        boxShadow:
          "inset 0 0 0 1px rgba(120,100,60,0.28), inset 0 3px 5px rgba(255,255,255,0.8), inset 0 -4px 6px rgba(120,100,60,0.22)",
      }}
    >
      {PIPS[value].map(([x, y], i) => (
        <span
          key={i}
          className="absolute h-[8px] w-[8px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            background: "radial-gradient(circle at 35% 30%, #3c5a82 0%, #1e3a5f 55%, #142944 100%)",
            boxShadow: "inset 0 1px 1.5px rgba(0,0,0,0.45)",
          }}
        />
      ))}
    </div>
  );
}

/** A CSS-3D ivory die that drops in, tumbles, and settles on `value`. */
export function Die3D({ value, delay = 0 }: { value: number; delay?: number }) {
  return (
    <div
      className="relative pb-2"
      style={{ perspective: 520 }}
      aria-label={`Die showing ${value}`}
    >
      {/* ground shadow */}
      <span
        className="dice-shadow absolute -bottom-0.5 left-1/2 h-2.5 w-12 -translate-x-1/2 rounded-full bg-ink/25 blur-[3px]"
        style={{ animationDelay: `${delay}ms` }}
      />
      <div
        className="dice-tumble"
        style={{ width: SIZE, height: SIZE, animationDelay: `${delay}ms` }}
      >
        <div
          className="relative"
          style={{
            width: SIZE,
            height: SIZE,
            transformStyle: "preserve-3d",
            transform: SHOW_FACE[value],
          }}
        >
          {[1, 2, 3, 4, 5, 6].map((v) => (
            <Face key={v} value={v} />
          ))}
        </div>
      </div>
    </div>
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
        <div className="mt-4 flex items-center justify-center gap-5">
          <Die3D value={a} />
          <Die3D value={b} delay={120} />
        </div>
        <p className="mt-3 font-display text-5xl font-bold text-rust">{sum}</p>

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
