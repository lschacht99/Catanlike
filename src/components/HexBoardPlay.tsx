"use client";

import type { Board, Building } from "@/types/game";
import type { Theme } from "@/types/theme";
import { PLAYER_COLORS, TOKEN_PIPS } from "@/game/constants";
import { buildGeometry, hexCorners } from "@/game/geometry";
import { assetUrl } from "@/game/assets/assetUrl";

export interface HexBoardPlayProps {
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
  const pad = 8;
  const { minX,minY,maxX,maxY } = geo.bounds;
  const hv = new Set(highlightVertices);
  const he = new Set(highlightEdges);
  const ht = new Set(highlightTiles);

  return <div className={`relative ${className}`}>
    <svg viewBox={`${minX-pad} ${minY-pad} ${maxX-minX+pad*2} ${maxY-minY+pad*2}`} className="h-full w-full select-none" style={{background:theme.board.sea}}>
      <defs><filter id="pieceShadow"><feDropShadow dx="0" dy="1.3" stdDeviation="1" floodOpacity=".36"/></filter></defs>
      {board.tiles.map((tile)=>{
        const corners=hexCorners(tile.q,tile.r);
        const points=corners.map((p)=>`${p.x},${p.y}`).join(" ");
        const cx=corners.reduce((sum,p)=>sum+p.x,0)/6;
        const cy=corners.reduce((sum,p)=>sum+p.y,0)/6;
        const style=tile.resource==="desert"?theme.desert:theme.resources[tile.resource];
        const art=style.image??(style.tileArt?assetUrl(style.tileArt):"");
        const hot=tile.token===6||tile.token===8;
        const clipId=`hex-clip-${tile.id}`;
        return <g key={tile.id} onClick={()=>ht.has(tile.id)&&onTileTap?.(tile.id)} className={ht.has(tile.id)?"cursor-pointer":undefined}>
          <defs><clipPath id={clipId}><polygon points={points}/></clipPath></defs>
          <polygon points={points} fill={style.color} stroke={ht.has(tile.id)?"#f59e0b":"#ead8bb"} strokeWidth={ht.has(tile.id)?1.1:.65}/>
          {art&&<image href={art} x={cx-10} y={cy-10.2} width="20" height="20.4" preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clipId})`}/>} 
          <polygon points={points} fill="none" stroke="rgba(79,54,31,.35)" strokeWidth=".35"/>
          {tile.token!==null&&<g><circle cx={cx} cy={cy+1.8} r="3.4" fill="#fff7e7" stroke="#8b6a3d" strokeWidth=".3"/><text x={cx} y={cy+3.2} textAnchor="middle" fontSize="3.8" fontWeight="800" fill={hot?"#a85c3d":"#17324d"}>{tile.token}</text><g fill={hot?"#a85c3d":"#17324d"}>{Array.from({length:TOKEN_PIPS[tile.token]??0}).map((_,i,arr)=><circle key={i} cx={cx+(i-(arr.length-1)/2)*.9} cy={cy+4.4} r=".28"/>)}</g></g>}
          {banditTile===tile.id&&<Bandit2D x={cx} y={cy-2.4} hamsa={theme.id==="hamsa"}/>} 
        </g>;
      })}

      {Object.entries(roads).map(([edgeId,player])=>{
        const edge=geo.edges[edgeId]; if(!edge)return null;
        const a=geo.vertices[edge.a],b=geo.vertices[edge.b];
        const x1=a.x+(b.x-a.x)*.18,y1=a.y+(b.y-a.y)*.18,x2=a.x+(b.x-a.x)*.82,y2=a.y+(b.y-a.y)*.82;
        return <g key={edgeId}><line x1={x1} y1={y1+.45} x2={x2} y2={y2+.45} stroke="rgba(45,32,20,.45)" strokeWidth="2.6" strokeLinecap="round"/><line x1={x1} y1={y1} x2={x2} y2={y2} stroke={PLAYER_COLORS[Number(player)]} strokeWidth="2.1" strokeLinecap="round"/><line x1={x1} y1={y1-.35} x2={x2} y2={y2-.35} stroke="#F6F2E7" strokeOpacity=".32" strokeWidth=".35" strokeLinecap="round"/></g>;
      })}

      {onEdgeTap&&[...he].map((edgeId)=>{const edge=geo.edges[edgeId];if(!edge)return null;const a=geo.vertices[edge.a],b=geo.vertices[edge.b];return <g key={`ghost:${edgeId}`} onClick={()=>onEdgeTap(edgeId)}><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth="6"/><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#f59e0b" strokeWidth="1.7" strokeDasharray="1.4 1" strokeLinecap="round"/></g>;})}

      {Object.entries(buildings).map(([vertexId,building])=>{const v=geo.vertices[vertexId];if(!v)return null;const color=PLAYER_COLORS[Number(building.player)];const clickable=hv.has(vertexId)&&!!onVertexTap;return <Building2D key={vertexId} x={v.x} y={v.y} city={building.city} color={color} style={theme.visuals?.pieces.architecture??"classic"} clickable={clickable} onClick={()=>clickable&&onVertexTap?.(vertexId)}/>;})}

      {Object.entries(knights).map(([vertexId,player])=>{const v=geo.vertices[vertexId];if(!v)return null;return <Knight2D key={`knight:${vertexId}`} x={v.x} y={v.y} color={PLAYER_COLORS[Number(player)]} level={knightLevels[vertexId]??1} active={activeKnights[vertexId]??false} onClick={()=>hv.has(vertexId)&&onVertexTap?.(vertexId)}/>;})}

      {onVertexTap&&[...hv].filter((id)=>!buildings[id]&&!knights[id]).map((vertexId)=>{const v=geo.vertices[vertexId];if(!v)return null;return <g key={`marker:${vertexId}`} onClick={()=>onVertexTap(vertexId)}><circle cx={v.x} cy={v.y} r="3.4" fill="transparent"/><circle cx={v.x} cy={v.y} r="1.8" fill="rgba(245,158,11,.55)" stroke="#f59e0b" strokeWidth=".5"/></g>;})}
    </svg>
  </div>;
}

function Building2D({x,y,city,color,style,clickable,onClick}:{x:number;y:number;city:boolean;color:string;style:string;clickable:boolean;onClick:()=>void}) {
  const fill=style==="medina"?"#F6F2E7":style==="limestone"?"#d8c8a5":color;
  const stroke=clickable?"#f59e0b":"#0f172a";
  return <g onClick={onClick} filter="url(#pieceShadow)">
    <ellipse cx={x} cy={y+2.1} rx={city?3.2:2.3} ry=".7" fill="rgba(38,27,18,.36)"/>
    {city?<><path d={`M${x-2.8} ${y+1.9}V${y-1.4}H${x+1.2}V${y-3.2}H${x+2.8}V${y+1.9}Z`} fill={fill} stroke={stroke} strokeWidth={clickable?.7:.4}/><path d={`M${x-2.6} ${y-.5}H${x+2.6}`} stroke={color} strokeWidth=".65"/><rect x={x-.5} y={y-.5} width="1" height="2.4" fill="#8a542f"/></>:<><path d={`M${x-1.9} ${y+1.6}V${y-.7}L${x} ${y-2.1}L${x+1.9} ${y-.7}V${y+1.6}Z`} fill={fill} stroke={stroke} strokeWidth={clickable?.7:.4}/><path d={`M${x-1.5} ${y-.2}H${x+1.5}`} stroke={color} strokeWidth=".55"/></>}
  </g>;
}

function Knight2D({x,y,color,level,active,onClick}:{x:number;y:number;color:string;level:number;active:boolean;onClick:()=>void}) {
  const rank=Math.max(1,Math.min(3,level));
  const s=.82+rank*.12;
  return <g transform={`translate(${x+2.2} ${y-2.1}) scale(${s})`} onClick={onClick} filter="url(#pieceShadow)">
    <circle r="1.65" fill={active?"#F6F2E7":"#756f66"} stroke={active?"#c9a24a":"#30343a"} strokeWidth={active?.45:.32}/>
    <path d="M-1.1 .4Q0 1.4 1.1 .4V-1Q0-1.7-1.1-1Z" fill={active?color:"#555b5d"} stroke="#111" strokeWidth=".18"/>
    {Array.from({length:rank}).map((_,i)=><circle key={i} cx={-.55+i*.55} cy=".55" r=".17" fill="#F6F2E7"/>)}
    {active&&<path d="M0-2.2V-1.55M-.55-1.95L0-1.55l.55-.4" fill="none" stroke="#c9a24a" strokeWidth=".3"/>}
  </g>;
}

function Bandit2D({x,y,hamsa}:{x:number;y:number;hamsa:boolean}) {
  return <g transform={`translate(${x} ${y})`} filter="url(#pieceShadow)"><path d="M-1.2 2.2L-.8-.7Q0-2 0.8-.7l1.2 2.9Z" fill={hamsa?"#5e4639":"#1b2431"} stroke="#111" strokeWidth=".3"/><circle cy="-1.5" r=".9" fill={hamsa?"#8a6a55":"#111826"}/><path d="M-1.1-2Q0-2.8 1.1-2" fill="none" stroke="#111" strokeWidth=".55"/></g>;
}
