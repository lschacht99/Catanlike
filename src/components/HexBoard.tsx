"use client";

import { useId, useMemo, useRef, useState } from "react";
import type { Board, Building } from "@/types/game";
import type { Theme } from "@/types/theme";
import { numberTokenAsset, pieceAsset, knightAsset } from "@/game/assets";
import { buildGeometry, hexCenter, hexCorners } from "@/game/geometry";
import TileArt, { shade } from "./TileArt";

interface HexBoardProps {
  board: Board;
  theme: Theme;
  buildings?: Record<string, Building>;
  roads?: Record<string, string>;
  knights?: Record<string, string>;
  activeKnights?: Record<string, boolean>;
  knightLevels?: Record<string, number>;
  banditTile?: number | null;
  /** Valid tap targets, rendered as pulsing markers. */
  highlightVertices?: string[];
  highlightEdges?: string[];
  highlightTiles?: number[];
  onVertexTap?: (id: string) => void;
  onEdgeTap?: (id: string) => void;
  onTileTap?: (id: number) => void;
  /** Gentle perspective tilt so the extruded tiles read as 3D. */
  tilt?: boolean;
  className?: string;
}

/** How far the extruded tile sides drop below the top face (SVG units). */
const TILE_DEPTH = 1.3;

const EMPTY_BUILDINGS: Record<string, Building> = {};
const EMPTY_ROADS: Record<string, string> = {};

export default function HexBoard({
  board,
  theme,
  buildings = EMPTY_BUILDINGS,
  roads = EMPTY_ROADS,
  knights = {},
  activeKnights = {},
  knightLevels = {},
  banditTile = null,
  highlightVertices = [],
  highlightEdges = [],
  highlightTiles = [],
  onVertexTap,
  onEdgeTap,
  onTileTap,
  tilt = false,
  className = "",
}: HexBoardProps) {
  const geometry = useMemo(() => buildGeometry(board.tiles), [board.tiles]);
  const svgRef = useRef<SVGSVGElement>(null);
  /** Unique prefix so clip-path ids don't clash between boards on a page. */
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");

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
        style={{
          background: theme.board.sea,
          ...(tilt
            ? { transform: "perspective(750px) rotateX(12deg) scale(1.06)" }
            : {}),
        }}
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
            const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
            const artHref =
              style.image ?? (style.tileArt ? `${basePath}${style.tileArt}` : undefined);
            const targetable = highlightTileSet.has(tile.id);
            const sidePoints = corners
              .map((p) => `${p.x},${p.y + TILE_DEPTH}`)
              .join(" ");
            return (
              <g
                key={tile.id}
                onClick={tap(onTileTap ? () => onTileTap(tile.id) : undefined)}
                className={onTileTap && targetable ? "cursor-pointer" : undefined}
              >
                {/* Extruded side: the same hex dropped down, darkened. */}
                <polygon points={sidePoints} fill={shade(style.color, 0.55)} />
                <polygon points={points} fill={style.color} />
                {artHref ? (
                  <>
                    <clipPath id={`${uid}t${tile.id}`}>
                      <polygon points={points} />
                    </clipPath>
                    <image
                      href={artHref}
                      x={cx - 8.7}
                      y={cy - 10}
                      width={17.4}
                      height={20}
                      preserveAspectRatio="xMidYMid slice"
                      clipPath={`url(#${uid}t${tile.id})`}
                      className="pointer-events-none"
                    />
                  </>
                ) : (
                  <TileArt resource={tile.resource} color={style.color} cx={cx} cy={cy} />
                )}
                <polygon
                  points={points}
                  fill="none"
                  stroke={targetable ? "#b45a37" : "#faf5e9"}
                  strokeWidth={targetable ? 1 : 0.7}
                  className={targetable ? "animate-pulse" : undefined}
                />
                {tile.token !== null && <image className="pointer-events-none" href={numberTokenAsset(tile.token)} x={cx - 3.5} y={cy - 1.7} width="7" height="7" />}
              </g>
            );
          })}

          {/* Bandit: a single element so it glides between tiles. */}
          {banditTile !== null &&
            (() => {
              const tile = board.tiles.find((t) => t.id === banditTile);
              if (!tile) return null;
              const c = hexCenter(tile.q, tile.r);
              return (
                <g
                  className="pointer-events-none"
                  style={{
                    transform: `translate(${c.x}px, ${c.y}px)`,
                    transition: "transform 0.6s cubic-bezier(0.34, 1.3, 0.64, 1)",
                  }}
                >
                  <g key={banditTile} className="bandit-hop">
                    <image href={pieceAsset(theme, "bandit")} x="-4.2" y="-5.5" width="8.4" height="8.4" />
                  </g>
                </g>
              );
            })()}

          {/* Roads */}
          {Object.entries(roads).map(([edgeId, player]) => {
            const edge = geometry.edges[edgeId];
            if (!edge) return null;
            const a = geometry.vertices[edge.a];
            const b = geometry.vertices[edge.b];
            const mx = (a.x + b.x) / 2;
            const my = (a.y + b.y) / 2;
            const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
            return <image key={edgeId} href={pieceAsset(theme, "road", player)} x={mx - 4.5} y={my - 2.25} width="9" height="4.5" transform={`rotate(${angle} ${mx} ${my})`} className="pointer-events-none piece-pop" />;
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
                    stroke="#b45a37"
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
            const clickable = highlightVertexSet.has(vertexId) && onVertexTap;
            const size = building.city ? 8.8 : 7.1;
            return (
              <image
                key={`${vertexId}-${building.city ? "c" : "s"}`}
                href={pieceAsset(theme, building.city ? "city" : "settlement", building.player)}
                x={v.x - size / 2}
                y={v.y - size * 0.68}
                width={size}
                height={size}
                onClick={tap(clickable ? () => onVertexTap(vertexId) : undefined)}
                className={clickable ? "cursor-pointer animate-pulse piece-pop" : "piece-pop"}
              />
            );
          })}

          {Object.entries(knights).map(([vertexId, player]) => {
            const v = geometry.vertices[vertexId];
            if (!v) return null;
            return <image key={`knight-${vertexId}`} href={knightAsset(theme, player, knightLevels[vertexId] ?? 1, activeKnights[vertexId] ?? false)} x={v.x + 0.6} y={v.y - 5.6} width="6.3" height="6.3" className="pointer-events-none piece-pop" />;
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
                      fill="rgba(180,90,55,0.45)"
                      stroke="#b45a37"
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
          className="h-9 w-9 rounded-full border border-line bg-cream/90 text-lg font-bold text-ink shadow-card backdrop-blur"
          onClick={() => setView((v) => ({ ...v, scale: clampScale(v.scale * 1.3) }))}
        >
          +
        </button>
        <button
          aria-label="Zoom out"
          className="h-9 w-9 rounded-full border border-line bg-cream/90 text-lg font-bold text-ink shadow-card backdrop-blur"
          onClick={() => setView((v) => ({ ...v, scale: clampScale(v.scale / 1.3) }))}
        >
          −
        </button>
        <button
          aria-label="Reset view"
          className="h-9 w-9 rounded-full border border-line bg-cream/90 text-xs font-bold text-ink shadow-card backdrop-blur"
          onClick={() => setView({ scale: 1, tx: 0, ty: 0 })}
        >
          ⟳
        </button>
      </div>
    </div>
  );
}
