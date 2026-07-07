// @ts-nocheck
"use client";

import type { Board, Building } from "@/types/game";
import type { Theme } from "@/types/theme";
import { PLAYER_COLORS, TOKEN_PIPS } from "@/game/constants";
import { buildGeometry, hexCorners } from "@/game/geometry";

export default function HexBoardPlay({ board, theme, buildings = {}, roads = {}, knights = {}, banditTile = null, highlightVertices = [], highlightEdges = [], highlightTiles = [], onVertexTap, onEdgeTap, onTileTap, className = "" }: { board: Board; theme: Theme; buildings?: Record<string, Building>; roads?: Record<string, string>; knights?: Record<string, string>; banditTile?: number | null; highlightVertices?: string[]; highlightEdges?: string[]; highlightTiles?: number[]; onVertexTap?: (id: string) => void; onEdgeTap?: (id: string) => void; onTileTap?: (id: number) => void; className?: string }) {
  const geo = buildGeometry(board.tiles);
  const pad = 8;
  const { minX, minY, maxX, maxY } = geo.bounds;
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const hv = new Set(highlightVertices);
  const he = new Set(highlightEdges);
  const ht = new Set(highlightTiles);

  return (
    <div className={`relative ${className}`}>
      <svg viewBox={`${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`} className="h-full w-full select-none" style={{ background: theme.board.sea }}>
        <filter id="pieceShadow"><feDropShadow dx="0" dy="1.3" stdDeviation="1" floodOpacity="0.36" /></filter>
        {board.tiles.map((tile) => {
          const corners = hexCorners(tile.q, tile.r);
          const points = corners.map((p) => `${p.x},${p.y}`).join(" ");
          const cx = corners.reduce((s, p) => s + p.x, 0) / 6;
          const cy = corners.reduce((s, p) => s + p.y, 0) / 6;
          const style = tile.resource === "desert" ? theme.desert : theme.resources[tile.resource];
          const art = style.tileArt ? base + style.tileArt : "";
          const hot = tile.token === 6 || tile.token === 8;
          return (
            <g key={tile.id} onClick={() => onTileTap?.(tile.id)} className={ht.has(tile.id) ? "cursor-pointer" : undefined}>
              <polygon points={points} fill={style.color} stroke={ht.has(tile.id) ? "#a85c3d" : "#ead8bb"} strokeWidth={ht.has(tile.id) ? 1 : 0.65} />
              {art ? <image href={art} x={cx - 9.8} y={cy - 10.2} width="19.6" height="20.4" /> : <text x={cx} y={cy - 4.2} textAnchor="middle" fontSize="4">{style.icon}</text>}
              <polygon points={points} fill="none" stroke="rgba(79,54,31,0.35)" strokeWidth="0.35" />
              {tile.token !== null && <g><circle cx={cx} cy={cy + 1.8} r="3.4" fill="#fff7e7" stroke="#8b6a3d" strokeWidth="0.3"/><text x={cx} y={cy + 3.2} textAnchor="middle" fontSize="3.8" fontWeight="800" fill={hot ? "#a85c3d" : "#17324d"}>{tile.token}</text><g fill={hot ? "#a85c3d" : "#17324d"}>{Array.from({ length: TOKEN_PIPS[tile.token] ?? 0 }).map((_, i, arr) => <circle key={i} cx={cx + (i - (arr.length - 1) / 2) * 0.9} cy={cy + 4.4} r="0.28" />)}</g></g>}
              {banditTile === tile.id && <text x={cx} y={cy - 2.2} textAnchor="middle" fontSize="5.3">{theme.bandit.icon}</text>}
            </g>
          );
        })}
        {Object.entries(roads).map(([edgeId, player]) => {
          const edge = geo.edges[edgeId]; if (!edge) return null;
          const a = geo.vertices[edge.a]; const b = geo.vertices[edge.b];
          const x1 = a.x + (b.x - a.x) * 0.18; const y1 = a.y + (b.y - a.y) * 0.18;
          const x2 = a.x + (b.x - a.x) * 0.82; const y2 = a.y + (b.y - a.y) * 0.82;
          return <g key={edgeId}><line x1={x1} y1={y1 + 0.45} x2={x2} y2={y2 + 0.45} stroke="rgba(45,32,20,0.45)" strokeWidth="2.6" strokeLinecap="round"/><line x1={x1} y1={y1} x2={x2} y2={y2} stroke={PLAYER_COLORS[Number(player)]} strokeWidth="2.1" strokeLinecap="round"/></g>;
        })}
        {onEdgeTap && [...he].map((edgeId) => { const edge = geo.edges[edgeId]; if (!edge) return null; const a = geo.vertices[edge.a]; const b = geo.vertices[edge.b]; return <g key={edgeId} onClick={() => onEdgeTap(edgeId)}><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth="6"/><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#f59e0b" strokeWidth="1.7" strokeDasharray="1.4 1" strokeLinecap="round" /></g>; })}
        {Object.entries(buildings).map(([vertexId, building]) => { const v = geo.vertices[vertexId]; if (!v) return null; const color = PLAYER_COLORS[Number(building.player)]; const clickable = hv.has(vertexId) && onVertexTap; const basePoly = building.city ? `${v.x - 2.6},${v.y + 1.9} ${v.x - 2.6},${v.y - 1.1} ${v.x - 1.3},${v.y - 2.4} ${v.x},${v.y - 1.1} ${v.x + 2.6},${v.y - 1.1} ${v.x + 2.6},${v.y + 1.9}` : `${v.x - 1.8},${v.y + 1.6} ${v.x - 1.8},${v.y - 0.6} ${v.x},${v.y - 2} ${v.x + 1.8},${v.y - 0.6} ${v.x + 1.8},${v.y + 1.6}`; return <g key={vertexId} onClick={() => clickable && onVertexTap(vertexId)} filter="url(#pieceShadow)"><ellipse cx={v.x} cy={v.y + 2.1} rx={building.city ? 3.2 : 2.3} ry="0.7" fill="rgba(38,27,18,0.36)"/><polygon points={basePoly} fill={color} stroke={clickable ? "#f59e0b" : "#0f172a"} strokeWidth={clickable ? 0.7 : 0.4}/>{knights[vertexId] && <circle cx={v.x + 2.2} cy={v.y - 2.1} r="1.2" fill="#f8d66d" stroke="#7c5a06" strokeWidth="0.25"/>}</g>; })}
        {onVertexTap && [...hv].filter((id) => !buildings[id]).map((vertexId) => { const v = geo.vertices[vertexId]; if (!v) return null; return <g key={vertexId} onClick={() => onVertexTap(vertexId)}><circle cx={v.x} cy={v.y} r="3.4" fill="transparent"/><circle cx={v.x} cy={v.y} r="1.8" fill="rgba(245,158,11,0.55)" stroke="#f59e0b" strokeWidth="0.5" /></g>; })}
      </svg>
    </div>
  );
}
