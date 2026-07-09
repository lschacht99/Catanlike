"use client";

import { useEffect, useState } from "react";
import { faceGrid } from "./dice-faces";

/**
 * Animated pip dice. Purely presentational — it takes the already-rolled result
 * and plays a short shuffle-then-settle so the roll feels physical. The game
 * engine decides the numbers; this never influences them.
 */
function Die({ value, spinDelay }: { value: number; spinDelay: number }) {
  return (
    <div className="die3d" style={{ animationDelay: `${spinDelay}ms` }} aria-hidden>
      {faceGrid(value).map((on, i) => (
        <span key={i} className={on ? "pip on" : "pip"} />
      ))}
    </div>
  );
}

export default function DiceRoll({
  roll,
  eventDie = null,
}: {
  roll: [number, number];
  eventDie?: number | null;
}) {
  const [faces, setFaces] = useState<[number, number]>(roll);
  const key = `${roll[0]}-${roll[1]}`;

  useEffect(() => {
    let ticks = 0;
    setFaces([1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)]);
    const id = window.setInterval(() => {
      ticks += 1;
      if (ticks >= 7) {
        window.clearInterval(id);
        setFaces(roll);
      } else {
        setFaces([1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)]);
      }
    }, 70);
    return () => window.clearInterval(id);
    // Re-shuffle whenever a new roll arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const total = roll[0] + roll[1];

  return (
    <div className="dice-roll" key={key}>
      <div className="dice-row">
        <Die value={faces[0]} spinDelay={0} />
        <Die value={faces[1]} spinDelay={90} />
        {eventDie != null && (
          <div className="event-die" title="Event die" aria-hidden>
            {eventDie <= 3 ? "⚔️" : "📜"}
          </div>
        )}
      </div>
      <p className="mt-3 text-sm font-black text-yellow-300">Rolled {total}</p>
    </div>
  );
}
