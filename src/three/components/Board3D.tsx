"use client";

import { useMemo } from "react";
import type { Board } from "@/types/game";
import type { Theme } from "@/types/theme";
import { TOKEN_PIPS } from "@/game/constants";

interface Props { board: Board; theme: Theme; lastRoll?: [number, number] | null }

const colorFor = (theme: Theme, resource: string) => resource === "desert" ? theme.desert.color : theme.resources[resource as keyof typeof theme.resources].color;
const heightFor = (resource: string) => resource === "ore" ? 34 : resource === "wood" ? 22 : resource === "brick" ? 16 : resource === "desert" ? 10 : 12;
const pos = (q: number, r: number) => ({ x: (q + r / 2) * 82, y: r * 72 });

export default function Board3D({ board, theme, lastRoll }: Props) {
  const tiles = useMemo(() => board.tiles.map((tile) => ({ ...tile, ...pos(tile.q, tile.r) })), [board]);
  return <div className="board3d" aria-label="3D stylized hex island board">
    <div className="sea3d" />
    <div className="island3d">
      {tiles.map((tile) => <div key={tile.id} className={`hex3d ${lastRoll && tile.token === lastRoll[0] + lastRoll[1] ? "producing" : ""}`} style={{ "--x": `${tile.x}px`, "--y": `${tile.y}px`, "--h": `${heightFor(tile.resource)}px`, "--c": colorFor(theme, tile.resource) } as React.CSSProperties}>
        <div className="hex-top"><span>{tile.resource === "desert" ? theme.bandit.icon : theme.resources[tile.resource].icon}</span>{tile.token && <b className={TOKEN_PIPS[tile.token] >= 5 ? "hot" : ""}>{tile.token}</b>}</div>
        {tile.resource === "wood" && <i className="trees">♟ ♟</i>}
        {tile.resource === "wool" && <i className="sheep">🐑</i>}
        {tile.resource === "grain" && <i className="crops">〃〃〃</i>}
        {tile.resource === "ore" && <i className="rocks">▲▲</i>}
        {tile.resource === "brick" && <i className="clay">▰▰</i>}
      </div>)}
      <div className="settlement3d p0">⌂</div><div className="settlement3d p1">⌂</div><div className="city3d">▣</div><div className="road3d r1" /><div className="road3d r2" />
    </div>
  </div>;
}
