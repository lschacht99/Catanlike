"use client";

interface Props { value: [number, number] | null; rolling?: boolean }
export default function Dice3D({ value, rolling = false }: Props) {
  const dice = value ?? [1, 1];
  return <div className={`diceTray ${rolling ? "rolling" : ""}`} aria-live="polite">
    {dice.map((die, i) => <div key={i} className={`die face-${die}`}><span>{die}</span></div>)}
  </div>;
}
