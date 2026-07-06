"use client";

import { useMemo, useRef, useState } from "react";
import type { Board, Building } from "@/types/game";
import type { Theme } from "@/types/theme";
import { PLAYER_COLORS, TOKEN_PIPS } from "@/game/constants";
import { buildGeometry, hexCorners } from "@/game/geometry";

interface HexBoardProps {
  board: Board;
  theme: Theme;
  buildings?: Record<string, Building>;
  roads?: Record<string, string>;
  banditTile?: number | null;
  /** Valid tap targets, rendered as pulsing markers. */
  highlightVertices?: string[];
  highlightEdges?: string[];
  highlightTiles?: number[];
  onVertexTap?: (id: string) => void;
  onEdgeTap?: (id: string) => void;
  onTileTap?: (id: number) => void;
  className?: string;
}

const EMPTY_BUILDINGS: Record<string, Building> = {};
const EMPTY_ROADS: Record<string, string> = {};

export default function HexBoard({
  board,
  theme,
  buildings = EMPTY_BUILDINGS,
  roads = EMPTY_ROADS,
  banditTile = null,
  highlightVertices = [],
  highlightEdges = [],
  highlightTiles = [],
  onVertexTap,
  onEdgeTap,
  onTileTap,
  className = "",
}: HexBoardProps) {
  const geometry = useMemo(() => buildGeometry(board.tiles), [board.tiles]);
  const svgRef = useRef<SVGSVGElement>(null);

  // --- pan & zoom (single-finger drag, two-finger pinch, wheel) ---
  const [view, setView] = useState({ scale: 1, tx: 0, ty: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchDist = useRef(0);
  const dragged = useRef(false);

  const pad = 8;
  const { minX, minY, maxX, maxY } = geometry.bounds;
  const vbW = maxX - minX + pad * 2;
  const vbH = maxY - minY + pad * 2;

  /** Convert a screen-pixel delta into viewBox units. */
  function toSvgDelta(dx: number, dy: number): { x: number; y: number } {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const unit = Math.max(vbW / rect.width, vbH / rect.height);
    return { x: dx * unit, y: dy * unit };
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchDist.current = Math.hypot(a.x - b.x, a.y - b.y);
    }
    if (pointers.current.size === 1) dragged.current = false;
  }

  function onPointerMove(e: React.PointerEvent) {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const next = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, next);

    if (pointers.current.size === 1) {
      const d = toSvgDelta(next.x - prev.x, next.y - prev.y);
      if (Math.hypot(next.x - prev.x, next.y - prev.y) > 3) dragged.current = true;
      setView((v) => ({ ...v, tx: v.tx + d.x, ty: v.ty + d.y }));
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDist.current > 0) {
        const factor = dist / pinchDist.current;
        setView((v) => ({ ...v, scale: clampScale(v.scale * factor) }));
      }
      pinchDist.current = dist;
      dragged.current = true;
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    pinchDist.current = 0;
  }

  function onWheel(e: React.WheelEvent) {
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    setView((v) => ({ ...v, scale: clampScale(v.scale * factor) }));
  }

  function clampScale(s: number): number {
    return Math.min(4, Math.max(0.6, s));
  }

  /** Wrap tap handlers so drags don't count as taps. */
  function tap(handler: (() => void) | undefined) {
    if (!handler) return undefined;
    return () => {
      if (!dragged.current) handler();
    };
  }

  const highlightVertexSet = new Set(highlightVertices);
  const highlightEdgeSet = new Set(highlightEdges);
  const highlightTileSet = new Set(highlightTiles);

  return (
    <div className={`relative ${className}`}>
      <svg
        ref={svgRef}
        viewBox={`${minX - pad} ${minY - pad} ${vbW} ${vbH}`}
        className="h-full w-full touch-none select-none"
        style={{ background: theme.board.sea }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        <g
          transform={`translate(${view.tx} ${view.ty}) translate(${(minX + maxX) / 2} ${(minY + maxY) / 2}) scale(${view.scale}) translate(${-(minX + maxX) / 2} ${-(minY + maxY) / 2})`}
        >
          {/* Tiles */}
          {board.tiles.map((tile) => {
            const corners = hexCorners(tile.q, tile.r);
            const points = corners.map((p) => `${p.x},${p.y}`).join(" ");
            const cx = corners.reduce((s, p) => s + p.x, 0) / 6;
            const cy = corners.reduce((s, p) => s + p.y, 0) / 6;
            const style =
              tile.resource === "desert" ? theme.desert : theme.resources[tile.resource];
            const hot = tile.token === 6 || tile.token === 8;
            const targetable = highlightTileSet.has(tile.id);
            return (
              <g
                key={tile.id}
                onClick={tap(onTileTap ? () => onTileTap(tile.id) : undefined)}
                className={onTileTap && targetable ? "cursor-pointer" : undefined}
              >
                <polygon
                  points={points}
                  fill={style.color}
                  stroke={targetable ? "#facc15" : "#0f172a"}
                  strokeWidth={targetable ? 0.9 : 0.5}
                  className={targetable ? "animate-pulse" : undefined}
                />
                <text
                  x={cx}
                  y={cy - 4.2}
                  textAnchor="middle"
                  fontSize="4"
                  className="pointer-events-none"
                >
                  {style.icon}
                </text>
                {tile.token !== null && (
                  <g className="pointer-events-none">
                    <circle cx={cx} cy={cy + 1.8} r="3.4" fill="#f5f0e6" stroke="#44403c" strokeWidth="0.3" />
                    <text
                      x={cx}
                      y={cy + 3.2}
                      textAnchor="middle"
                      fontSize="3.8"
                      fontWeight="700"
                      fill={hot ? "#dc2626" : "#1c1917"}
                    >
                      {tile.token}
                    </text>
                    <g fill={hot ? "#dc2626" : "#1c1917"}>
                      {Array.from({ length: TOKEN_PIPS[tile.token] ?? 0 }).map((_, i, arr) => (
                        <circle
                          key={i}
                          cx={cx + (i - (arr.length - 1) / 2) * 0.9}
                          cy={cy + 4.4}
                          r="0.3"
                        />
                      ))}
                    </g>
                  </g>
                )}
                {banditTile === tile.id && (
                  <text
                    x={cx}
                    y={cy + 0.6}
                    textAnchor="middle"
                    fontSize="5.5"
                    className="pointer-events-none"
                  >
                    {theme.bandit.icon}
                  </text>
                )}
              </g>
            );
          })}

          {/* Roads */}
          {Object.entries(roads).map(([edgeId, player]) => {
            const edge = geometry.edges[edgeId];
            if (!edge) return null;
            const a = geometry.vertices[edge.a];
            const b = geometry.vertices[edge.b];
            return (
              <line
                key={edgeId}
                x1={a.x + (b.x - a.x) * 0.18}
                y1={a.y + (b.y - a.y) * 0.18}
                x2={a.x + (b.x - a.x) * 0.82}
                y2={a.y + (b.y - a.y) * 0.82}
                stroke={PLAYER_COLORS[Number(player)]}
                strokeWidth="1.8"
                strokeLinecap="round"
                className="pointer-events-none"
              />
            );
          })}

          {/* Edge tap targets */}
          {onEdgeTap &&
            [...highlightEdgeSet].map((edgeId) => {
              const edge = geometry.edges[edgeId];
              if (!edge) return null;
              const a = geometry.vertices[edge.a];
              const b = geometry.vertices[edge.b];
              return (
                <g key={edgeId} onClick={tap(() => onEdgeTap(edgeId))} className="cursor-pointer">
                  <line
                    x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                    stroke="transparent" strokeWidth="6"
                  />
                  <line
                    x1={a.x + (b.x - a.x) * 0.2}
                    y1={a.y + (b.y - a.y) * 0.2}
                    x2={a.x + (b.x - a.x) * 0.8}
                    y2={a.y + (b.y - a.y) * 0.8}
                    stroke="#facc15"
                    strokeWidth="1.6"
                    strokeDasharray="1.5 1"
                    strokeLinecap="round"
                    className="animate-pulse pointer-events-none"
                  />
                </g>
              );
            })}

          {/* Buildings */}
          {Object.entries(buildings).map(([vertexId, building]) => {
            const v = geometry.vertices[vertexId];
            if (!v) return null;
            const color = PLAYER_COLORS[Number(building.player)];
            const clickable = highlightVertexSet.has(vertexId) && onVertexTap;
            const shape = building.city
              ? `${v.x - 2.6},${v.y + 1.9} ${v.x - 2.6},${v.y - 1.1} ${v.x - 1.3},${v.y - 2.4} ${v.x},${v.y - 1.1} ${v.x + 2.6},${v.y - 1.1} ${v.x + 2.6},${v.y + 1.9}`
              : `${v.x - 1.8},${v.y + 1.6} ${v.x - 1.8},${v.y - 0.6} ${v.x},${v.y - 2} ${v.x + 1.8},${v.y - 0.6} ${v.x + 1.8},${v.y + 1.6}`;
            return (
              <polygon
                key={vertexId}
                points={shape}
                fill={color}
                stroke={clickable ? "#facc15" : "#0f172a"}
                strokeWidth={clickable ? 0.7 : 0.4}
                onClick={tap(clickable ? () => onVertexTap(vertexId) : undefined)}
                className={clickable ? "cursor-pointer animate-pulse" : undefined}
              />
            );
          })}

          {/* Vertex tap targets (empty spots) */}
          {onVertexTap &&
            [...highlightVertexSet]
              .filter((id) => !buildings[id])
              .map((vertexId) => {
                const v = geometry.vertices[vertexId];
                if (!v) return null;
                return (
                  <g key={vertexId} onClick={tap(() => onVertexTap(vertexId))} className="cursor-pointer">
                    <circle cx={v.x} cy={v.y} r="3.4" fill="transparent" />
                    <circle
                      cx={v.x} cy={v.y} r="1.8"
                      fill="rgba(250,204,21,0.55)"
                      stroke="#facc15"
                      strokeWidth="0.5"
                      className="animate-pulse pointer-events-none"
                    />
                  </g>
                );
              })}
        </g>
      </svg>

      {/* Zoom controls */}
      <div className="absolute bottom-2 right-2 flex flex-col gap-1">
        <button
          aria-label="Zoom in"
          className="h-9 w-9 rounded-lg bg-black/50 text-lg font-bold text-white backdrop-blur"
          onClick={() => setView((v) => ({ ...v, scale: clampScale(v.scale * 1.3) }))}
        >
          +
        </button>
        <button
          aria-label="Zoom out"
          className="h-9 w-9 rounded-lg bg-black/50 text-lg font-bold text-white backdrop-blur"
          onClick={() => setView((v) => ({ ...v, scale: clampScale(v.scale / 1.3) }))}
        >
          −
        </button>
        <button
          aria-label="Reset view"
          className="h-9 w-9 rounded-lg bg-black/50 text-xs font-bold text-white backdrop-blur"
          onClick={() => setView({ scale: 1, tx: 0, ty: 0 })}
        >
          ⟳
        </button>
      </div>
    </div>
  );
}
