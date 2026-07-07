"use client";

import type { TileResource } from "@/types/game";

/** Darken/lighten a #rrggbb color. */
export function shade(hex: string, factor: number): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return "rgba(0,0,0,0.35)";
  const n = parseInt(hex.slice(1), 16);
  const channel = (shift: number) =>
    Math.min(255, Math.max(0, Math.round(((n >> shift) & 255) * factor)));
  return `rgb(${channel(16)},${channel(8)},${channel(0)})`;
}

function Tree({ x, y, s, color }: { x: number; y: number; s: number; color: string }) {
  return (
    <g>
      <rect x={x - 0.3 * s} y={y + 0.8 * s} width={0.6 * s} height={1.1 * s} fill="#7a5230" />
      <path d={`M${x} ${y - 2.3 * s} L${x + 1.5 * s} ${y + 0.2 * s} H${x - 1.5 * s} Z`} fill={color} />
      <path d={`M${x} ${y - 1.2 * s} L${x + 1.9 * s} ${y + 1.1 * s} H${x - 1.9 * s} Z`} fill={color} />
    </g>
  );
}

function Sheep({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g>
      <ellipse cx={x} cy={y} rx={1.5 * s} ry={1 * s} fill="#faf6ec" stroke="#c9bfa8" strokeWidth={0.15} />
      <circle cx={x + 1.3 * s} cy={y - 0.4 * s} r={0.5 * s} fill="#4a4038" />
      <rect x={x - 0.9 * s} y={y + 0.8 * s} width={0.25 * s} height={0.6 * s} fill="#4a4038" />
      <rect x={x + 0.5 * s} y={y + 0.8 * s} width={0.25 * s} height={0.6 * s} fill="#4a4038" />
    </g>
  );
}

/**
 * Procedural vector artwork for a hex tile, drawn in the theme's color
 * family. Keyed by CANONICAL resource — themes recolor it, rules never
 * see it. Art is centered on (cx, cy) for a pointy-top hex of size 10 and
 * stays clear of the number token (which sits slightly below center).
 */
export default function TileArt({
  resource,
  color,
  cx,
  cy,
}: {
  resource: TileResource;
  color: string;
  cx: number;
  cy: number;
}) {
  const dark = shade(color, 0.62);
  const darker = shade(color, 0.45);
  const light = shade(color, 1.25);

  switch (resource) {
    case "wood":
      return (
        <g className="pointer-events-none">
          <Tree x={cx - 3.6} y={cy - 2.2} s={1.15} color={dark} />
          <Tree x={cx + 0.2} y={cy - 3.6} s={1.35} color={darker} />
          <Tree x={cx + 3.8} y={cy - 1.9} s={1.05} color={dark} />
        </g>
      );

    case "brick": {
      const rows = [-5.4, -4.1, -2.8];
      return (
        <g className="pointer-events-none">
          {rows.map((dy, r) => (
            <g key={r}>
              {[-1, 0, 1].map((i) => (
                <rect
                  key={i}
                  x={cx + i * 2.5 - 1.1 + (r % 2 ? 1.25 : 0)}
                  y={cy + dy}
                  width={2.2}
                  height={1.1}
                  rx={0.15}
                  fill={r % 2 ? dark : darker}
                  stroke={light}
                  strokeWidth={0.12}
                />
              ))}
            </g>
          ))}
        </g>
      );
    }

    case "grain":
      return (
        <g className="pointer-events-none" stroke={darker} strokeLinecap="round">
          {[-4.2, -2.1, 0, 2.1, 4.2].map((dx, i) => {
            const x = cx + dx;
            const top = cy - 5.6 + (i % 2) * 0.7;
            return (
              <g key={i}>
                <line x1={x} y1={cy - 1.4} x2={x} y2={top} strokeWidth={0.35} />
                {[0, 1, 2].map((k) => (
                  <g key={k}>
                    <line x1={x} y1={top + k * 0.8} x2={x - 0.7} y2={top + k * 0.8 - 0.6} strokeWidth={0.3} />
                    <line x1={x} y1={top + k * 0.8} x2={x + 0.7} y2={top + k * 0.8 - 0.6} strokeWidth={0.3} />
                  </g>
                ))}
              </g>
            );
          })}
        </g>
      );

    case "wool":
      return (
        <g className="pointer-events-none">
          {[-4.5, -1.5, 1.5, 4.5].map((dx, i) => (
            <path
              key={i}
              d={`M${cx + dx - 0.5} ${cy - 1.2} q0.5 -1 1 0`}
              stroke={dark}
              strokeWidth={0.25}
              fill="none"
            />
          ))}
          <Sheep x={cx - 2.4} y={cy - 3.4} s={1.1} />
          <Sheep x={cx + 2.6} y={cy - 2.6} s={0.9} />
        </g>
      );

    case "ore":
      return (
        <g className="pointer-events-none">
          <path
            d={`M${cx - 5.6} ${cy - 1} L${cx - 2} ${cy - 6} L${cx + 1.4} ${cy - 1} Z`}
            fill={dark}
          />
          <path d={`M${cx - 2} ${cy - 6} L${cx - 0.9} ${cy - 4.4} L${cx - 2.9} ${cy - 4.4} Z`} fill="#f5f1e6" />
          <path
            d={`M${cx + 0.4} ${cy - 1} L${cx + 3.4} ${cy - 4.8} L${cx + 6} ${cy - 1} Z`}
            fill={darker}
          />
          <path d={`M${cx + 3.4} ${cy - 4.8} L${cx + 4.2} ${cy - 3.6} L${cx + 2.7} ${cy - 3.6} Z`} fill="#f5f1e6" />
        </g>
      );

    case "desert":
      return (
        <g className="pointer-events-none">
          <path
            d={`M${cx - 6} ${cy - 2.2} q3 -2.4 6 0 q3 2.4 6 0`}
            stroke={dark}
            strokeWidth={0.4}
            fill="none"
          />
          <path
            d={`M${cx - 5} ${cy - 4.2} q2.5 -2 5 0`}
            stroke={dark}
            strokeWidth={0.35}
            fill="none"
          />
          <circle cx={cx + 3.8} cy={cy - 5} r={1} fill={shade(color, 0.8)} stroke={dark} strokeWidth={0.2} />
          <ellipse cx={cx - 3.4} cy={cy - 1.2} rx={0.9} ry={0.5} fill={dark} />
        </g>
      );

    default:
      return null;
  }
}
