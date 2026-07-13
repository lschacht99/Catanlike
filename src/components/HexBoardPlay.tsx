"use client";

import type { Board, Building } from "@/types/game";
import type { Theme } from "@/types/theme";
import { buildGeometry, hexCorners } from "@/game/geometry";
import { deriveHarbors } from "@/game/harbors";
import { gameAsset, knightAsset, numberTokenAsset, pieceAsset } from "@/game/assets";

interface HexBoardPlayProps {
  board: Board;
  theme: Theme;
  buildings?: Record<string, Building>;
  roads?: Record<string, string>;
  knights?: Record<string, string>;
  activeKnights?: Record<string, boolean>;
  knightLevels?: Record<string, number>;
  banditTile?: number | null;
  highlightVertices?: string[];
  highlightEdges?: string[];
  highlightTiles?: number[];
  onVertexTap?: (id: string) => void;
  onEdgeTap?: (id: string) => void;
  onTileTap?: (id: number) => void;
  className?: string;
}

export default function HexBoardPlay({
  board,
  theme,
  buildings = {},
  roads = {},
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
  className = "",
}: HexBoardPlayProps) {
  const geo = buildGeometry(board.tiles);
  const pad = 9;
  const { minX, minY, maxX, maxY } = geo.bounds;
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const hv = new Set(highlightVertices);
  const he = new Set(highlightEdges);
  const ht = new Set(highlightTiles);

  return (
    <div className={`relative ${className}`}>
      <svg viewBox={`${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`} className="h-full w-full select-none" style={{ background: theme.board.sea }}>
        <filter id="pieceShadow"><feDropShadow dx="0" dy="1.1" stdDeviation="0.75" floodOpacity="0.36" /></filter>

        {board.tiles.map((tile) => {
          const corners = hexCorners(tile.q, tile.r);
          const points = corners.map((p) => `${p.x},${p.y}`).join(" ");
          const cx = corners.reduce((s, p) => s + p.x, 0) / 6;
          const cy = corners.reduce((s, p) => s + p.y, 0) / 6;
          const style = tile.resource === "desert" ? theme.desert : theme.resources[tile.resource];
          const art = style.image ?? (style.tileArt ? base + style.tileArt : "");
          return (
            <g key={tile.id} onClick={() => onTileTap?.(tile.id)} className={ht.has(tile.id) ? "cursor-pointer" : undefined}>
              <polygon points={points} fill={style.color} stroke={ht.has(tile.id) ? "#c88b32" : "#ead8bb"} strokeWidth={ht.has(tile.id) ? 1 : 0.65} />
              {art ? <image href={art} x={cx - 10} y={cy - 10} width="20" height="20" preserveAspectRatio="xMidYMid meet" /> : null}
              <polygon points={points} fill="none" stroke="rgba(79,54,31,0.35)" strokeWidth="0.35" />
              {tile.token !== null && <image href={numberTokenAsset(tile.token)} x={cx - 3.5} y={cy - 1.7} width="7" height="7" filter="url(#pieceShadow)" />}
              {banditTile === tile.id && <image href={pieceAsset(theme, "bandit")} x={cx - 4.2} y={cy - 6} width="8.4" height="8.4" filter="url(#pieceShadow)" />}
            </g>
          );
        })}

        {deriveHarbors(board).map((harbor) => {
          const nx = Math.cos(harbor.angle);
          const ny = Math.sin(harbor.angle);
          const x = harbor.mx + nx * 3.2;
          const y = harbor.my + ny * 3.2;
          const icon = harbor.type === "generic"
            ? gameAsset("05_UI_ICONS/status_harbors/harbor_any_3_to_1.png")
            : gameAsset(`05_UI_ICONS/status_harbors/harbor_${harbor.type}_2_to_1.png`);
          return <image key={harbor.edge} href={icon} x={x - 2.7} y={y - 2.7} width="5.4" height="5.4" filter="url(#pieceShadow)" />;
        })}

        {Object.entries(roads).map(([edgeId, player]) => {
          const edge = geo.edges[edgeId];
          if (!edge) return null;
          const a = geo.vertices[edge.a];
          const b = geo.vertices[edge.b];
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2;
          const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
          return <image key={edgeId} href={pieceAsset(theme, "road", player)} x={mx - 4.5} y={my - 2.25} width="9" height="4.5" transform={`rotate(${angle} ${mx} ${my})`} filter="url(#pieceShadow)" />;
        })}

        {onEdgeTap && [...he].map((edgeId) => {
          const edge = geo.edges[edgeId];
          if (!edge) return null;
          const a = geo.vertices[edge.a];
          const b = geo.vertices[edge.b];
          return <g key={edgeId} onClick={() => onEdgeTap(edgeId)}><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth="6"/><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#f59e0b" strokeWidth="1.7" strokeDasharray="1.4 1" strokeLinecap="round" /></g>;
        })}

        {Object.entries(buildings).map(([vertexId, building]) => {
          const v = geo.vertices[vertexId];
          if (!v) return null;
          const clickable = hv.has(vertexId) && !!onVertexTap;
          const size = building.city ? 8.8 : 7.1;
          return (
            <g key={vertexId} onClick={() => clickable && onVertexTap?.(vertexId)} className={clickable ? "cursor-pointer" : undefined}>
              {clickable && <circle cx={v.x} cy={v.y} r="4.2" fill="rgba(245,158,11,0.22)" stroke="#f59e0b" strokeWidth="0.6" />}
              <image href={pieceAsset(theme, building.city ? "city" : "settlement", building.player)} x={v.x - size / 2} y={v.y - size * 0.68} width={size} height={size} filter="url(#pieceShadow)" />
            </g>
          );
        })}

        {Object.entries(knights).map(([vertexId, player]) => {
          const v = geo.vertices[vertexId];
          if (!v) return null;
          const size = 6.3;
          return <image key={`knight-${vertexId}`} href={knightAsset(theme, player, knightLevels[vertexId] ?? 1, activeKnights[vertexId] ?? false)} x={v.x + 0.6} y={v.y - 5.6} width={size} height={size} filter="url(#pieceShadow)" />;
        })}

        {onVertexTap && [...hv].filter((id) => !buildings[id]).map((vertexId) => {
          const v = geo.vertices[vertexId];
          if (!v) return null;
          return <g key={vertexId} onClick={() => onVertexTap(vertexId)}><circle cx={v.x} cy={v.y} r="3.4" fill="transparent"/><circle cx={v.x} cy={v.y} r="1.8" fill="rgba(245,158,11,0.55)" stroke="#f59e0b" strokeWidth="0.5" /></g>;
        })}
      </svg>
    </div>
  );
}
