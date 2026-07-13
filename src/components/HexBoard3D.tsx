"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Sky } from "@react-three/drei";
import * as THREE from "three";
import type { Group, Texture } from "three";
import type { Board, Building, TileResource } from "@/types/game";
import type { ResourceTheme, Theme } from "@/types/theme";
import { PLAYER_COLORS, RESOURCE_KEYS_ORDERED } from "@/game/constants";
import { buildGeometry, HEX_SIZE } from "@/game/geometry";
import { deriveHarbors } from "@/game/harbors";
import { assetUrl } from "@/game/assets/assetUrl";
import { FALLBACK_VISUALS } from "@/game/assets/assetManifest";
import { tokenTexture } from "./board3d/tokenTexture";
import { WaterSurface } from "./board3d/WaterSurface";
import HarborPiece from "./board3d/pieces/HarborPiece";
import TerrainDecor from "./board3d/pieces/TerrainDecor";
import { BanditPiece, CityPiece, KnightPiece, RoadPiece, SettlementPiece } from "./board3d/pieces/GamePieces";

function resolveArtUrl(style: ResourceTheme): string | null {
  if (style.image) return style.image;
  return style.tileArt ? assetUrl(style.tileArt) : null;
}

const textureCache = new Map<string, Texture>();
const texturePending = new Set<string>();

function useTileTextures(urls: string[]): Record<string, Texture> {
  const [, redraw] = useState(0);
  useEffect(() => {
    let cancelled = false;
    for (const url of urls) {
      if (textureCache.has(url) || texturePending.has(url)) continue;
      texturePending.add(url);
      new THREE.TextureLoader().load(
        url,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.anisotropy = 4;
          textureCache.set(url, texture);
          texturePending.delete(url);
          if (!cancelled) redraw((n) => n + 1);
        },
        undefined,
        () => texturePending.delete(url),
      );
    }
    return () => { cancelled = true; };
  // URL contents, not array identity, control loading.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urls.join("|")]);

  const loaded: Record<string, Texture> = {};
  for (const url of urls) {
    const texture = textureCache.get(url);
    if (texture) loaded[url] = texture;
  }
  return loaded;
}

const HEX_CAP_GEOMETRY = (() => {
  const halfWidth = Math.sqrt(3) / 2;
  const positions: number[] = [0, 0, 0];
  const uvs: number[] = [.5, .5];
  for (let i = 0; i <= 6; i++) {
    const angle = (Math.PI / 180) * (60 * (i % 6) - 90);
    const x = Math.cos(angle);
    const z = Math.sin(angle);
    positions.push(x, 0, z);
    uvs.push(x / (2 * halfWidth) + .5, .5 - z / 2);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  const indices: number[] = [];
  for (let i = 1; i <= 6; i++) indices.push(0, i, i + 1);
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
})();

const SCALE = .1;
const HEX_R = HEX_SIZE * SCALE;
const SEA_Y = .02;
const SUN: [number, number, number] = [7, 8, 5];
const TERRAIN_HEIGHT: Record<TileResource, number> = { ore:.58, wood:.44, brick:.42, wool:.34, grain:.30, desert:.26 };
const tileHeight = (resource: TileResource) => TERRAIN_HEIGHT[resource] ?? .30;

export interface HexBoard3DProps {
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

export default function HexBoard3D({
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
}: HexBoard3DProps) {
  const visuals = theme.visuals ?? FALLBACK_VISUALS;
  const boardKey = board.tiles.map((tile) => `${tile.id}:${tile.resource}:${tile.token ?? ""}`).join("|");
  // Online snapshots replace the array identity; boardKey tracks actual board content.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const geo = useMemo(() => buildGeometry(board.tiles), [boardKey]);

  const artUrls = useMemo(() => {
    const urls = new Set<string>();
    for (const key of RESOURCE_KEYS_ORDERED) {
      const url = resolveArtUrl(theme.resources[key]);
      if (url) urls.add(url);
    }
    const desert = resolveArtUrl(theme.desert);
    if (desert) urls.add(desert);
    return [...urls];
  }, [theme]);
  const artTextures = useTileTextures(artUrls);

  const { cx, cz } = useMemo(() => {
    const { minX, minY, maxX, maxY } = geo.bounds;
    return { cx:(minX+maxX)/2, cz:(minY+maxY)/2 };
  }, [geo.bounds]);
  const world = useMemo(() => (x:number,y:number):[number,number] => [(x-cx)*SCALE,(y-cz)*SCALE], [cx,cz]);
  const islandR = useMemo(() => {
    const { minX,minY,maxX,maxY } = geo.bounds;
    return Math.max(maxX-minX,maxY-minY)/2*SCALE + HEX_R*.55;
  }, [geo.bounds]);

  const vertexY = useMemo(() => {
    const heights: Record<string,number> = {};
    const tilesById = new Map(board.tiles.map((tile) => [tile.id,tile]));
    for (const vertex of Object.values(geo.vertices)) {
      let height = SEA_Y;
      for (const tileId of vertex.tiles) {
        const tile = tilesById.get(tileId);
        if (tile) height = Math.max(height,tileHeight(tile.resource));
      }
      heights[vertex.id] = height;
    }
    return heights;
  // boardKey tracks tile content across serialized online snapshots.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.vertices,boardKey]);

  const harbors = useMemo(() => deriveHarbors(board).map((harbor) => {
    const [mx,mz] = world(harbor.mx,harbor.my);
    if (harbor.type === "generic") return {
      key:`${harbor.mx}:${harbor.my}:generic`, mx,mz,label:"3:1",sub:"ANY",resource:undefined,accent:"#c9a24a",
      tip:"3:1 harbor — trade any 3 identical cards for 1 card of your choice.",
    };
    const style = theme.resources[harbor.type];
    return {
      key:`${harbor.mx}:${harbor.my}:${harbor.type}`, mx,mz,label:"2:1",sub:style.label.toUpperCase(),resource:harbor.type,accent:style.color,
      tip:`2:1 ${style.label} harbor — trade 2 ${style.label} cards for 1 card of your choice.`,
    };
  // deriveHarbors depends on immutable board content represented by boardKey.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [boardKey,world,theme]);

  const hv = new Set(highlightVertices);
  const he = new Set(highlightEdges);
  const ht = new Set(highlightTiles);
  const [harborTip,setHarborTip] = useState<string|null>(null);
  const dragRef = useRef(false);
  const downRef = useRef<{x:number;y:number}|null>(null);
  const onDown = (event:React.PointerEvent) => { downRef.current={x:event.clientX,y:event.clientY}; dragRef.current=false; };
  const onMove = (event:React.PointerEvent) => {
    if (!downRef.current) return;
    const dx=event.clientX-downRef.current.x, dy=event.clientY-downRef.current.y;
    if (dx*dx+dy*dy>64) dragRef.current=true;
  };
  const tap = (run:()=>void) => (event:ThreeEvent<MouseEvent>) => { event.stopPropagation(); if (!dragRef.current) run(); };

  return <div className={`relative ${className}`}>
    <Canvas
      shadows
      dpr={[1,1.7]}
      gl={{antialias:true,alpha:true,powerPreference:"high-performance"}}
      camera={{position:[0,6.6,7.2],fov:42}}
      onPointerDown={onDown}
      onPointerMove={onMove}
      style={{touchAction:"none"}}
    >
      <fog attach="fog" args={[visuals.water.sky,16,30]}/>
      <Sky distance={450000} sunPosition={SUN} turbidity={4} rayleigh={1.2} mieCoefficient={.006} mieDirectionalG={.8}/>
      <hemisphereLight args={["#eef6f8","#6b6350",.72]}/>
      <ambientLight intensity={.28}/>
      <directionalLight position={SUN} intensity={1.5} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-camera-left={-7} shadow-camera-right={7} shadow-camera-top={7} shadow-camera-bottom={-7} shadow-camera-near={1} shadow-camera-far={30} shadow-bias={-.0004}/>
      <OrbitControls makeDefault enablePan={false} enableDamping dampingFactor={.12} minDistance={5} maxDistance={13} minPolarAngle={.5} maxPolarAngle={1.15} target={[0,0,0]}/>

      <WaterSurface y={SEA_Y-.06} deepColor={visuals.water.deep} highlightColor={visuals.water.shallow}/>
      <mesh position={[0,-.14,0]} receiveShadow castShadow><cylinderGeometry args={[islandR,islandR+.12,.34,48]}/><meshStandardMaterial color={visuals.water.sand} roughness={.98} metalness={.01}/></mesh>
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,SEA_Y+.006,0]}><ringGeometry args={[islandR-.04,islandR+.18,64]}/><meshBasicMaterial color={visuals.water.foam} transparent opacity={.54} toneMapped={false}/></mesh>
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,SEA_Y+.009,0]}><ringGeometry args={[islandR+.13,islandR+.23,64]}/><meshBasicMaterial color={visuals.water.foam} transparent opacity={.20} toneMapped={false}/></mesh>

      {harbors.map((harbor) => <HarborPiece key={harbor.key} mx={harbor.mx} mz={harbor.mz} seaY={SEA_Y} label={harbor.label} sub={harbor.sub} resource={harbor.resource} accent={harbor.accent} theme={theme} onHover={(over)=>setHarborTip(over?harbor.tip:null)}/>) }

      {board.tiles.map((tile) => {
        const [x,z] = world(...hexCenter(tile.q,tile.r));
        const height = tileHeight(tile.resource);
        const style = tile.resource === "desert" ? theme.desert : theme.resources[tile.resource];
        const highlighted = ht.has(tile.id);
        const artUrl = resolveArtUrl(style);
        const art = artUrl ? artTextures[artUrl] : undefined;
        return <group key={tile.id} position={[x,0,z]}>
          <mesh position={[0,height/2,0]} castShadow receiveShadow onClick={onTileTap&&highlighted?tap(()=>onTileTap(tile.id)):undefined}>
            <cylinderGeometry args={[HEX_R*.965,HEX_R*.985,height,6]}/>
            <meshStandardMaterial color={style.color} roughness={.93} metalness={.02} emissive={highlighted?"#f59e0b":"#000"} emissiveIntensity={highlighted?.38:0}/>
          </mesh>
          {art&&<mesh position={[0,height+.006,0]} scale={[HEX_R*.96,1,HEX_R*.96]} geometry={HEX_CAP_GEOMETRY} receiveShadow onClick={onTileTap&&highlighted?tap(()=>onTileTap(tile.id)):undefined}>
            <meshStandardMaterial map={art} roughness={.9} metalness={.01} side={THREE.DoubleSide} emissive={highlighted?"#f59e0b":"#000"} emissiveIntensity={highlighted?.28:0}/>
          </mesh>}
          {tile.token!==null&&<mesh position={[0,height+.016,0]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[HEX_R*.35,40]}/><meshBasicMaterial map={tokenTexture(tile.token)} transparent toneMapped={false}/></mesh>}
          <TerrainDecor resource={tile.resource} seed={tile.id} top={height} theme={theme}/>
          {banditTile===tile.id&&<BanditPiece x={0} z={0} y={height} theme={theme}/>} 
        </group>;
      })}

      {Object.entries(roads).map(([edgeId,player]) => {
        const edge=geo.edges[edgeId]; if(!edge)return null;
        const a=geo.vertices[edge.a], b=geo.vertices[edge.b];
        const [ax,az]=world(a.x,a.y), [bx,bz]=world(b.x,b.y);
        return <RoadPiece key={edgeId} ax={ax} az={az} bx={bx} bz={bz} y={Math.min(vertexY[a.id],vertexY[b.id])+.02} color={PLAYER_COLORS[Number(player)]}/>;
      })}

      {onEdgeTap&&[...he].map((edgeId)=>{
        const edge=geo.edges[edgeId]; if(!edge)return null;
        const a=geo.vertices[edge.a], b=geo.vertices[edge.b];
        const [ax,az]=world(a.x,a.y), [bx,bz]=world(b.x,b.y);
        return <RoadPiece key={`ghost:${edgeId}`} ax={ax} az={az} bx={bx} bz={bz} y={Math.min(vertexY[a.id],vertexY[b.id])+.02} color="#f59e0b" ghost onClick={tap(()=>onEdgeTap(edgeId))}/>;
      })}

      {Object.entries(buildings).map(([vertexId,building])=>{
        const vertex=geo.vertices[vertexId]; if(!vertex)return null;
        const [x,z]=world(vertex.x,vertex.y);
        const props={x,z,y:vertexY[vertexId],color:PLAYER_COLORS[Number(building.player)],theme,onClick:hv.has(vertexId)&&onVertexTap?tap(()=>onVertexTap(vertexId)):undefined};
        return building.city?<CityPiece key={vertexId} {...props}/>:<SettlementPiece key={vertexId} {...props}/>;
      })}

      {Object.entries(knights).map(([vertexId,player])=>{
        const vertex=geo.vertices[vertexId]; if(!vertex)return null;
        const [x,z]=world(vertex.x,vertex.y);
        return <KnightPiece key={`knight:${vertexId}`} x={x} z={z} y={vertexY[vertexId]} color={PLAYER_COLORS[Number(player)]} level={knightLevels[vertexId]??1} active={activeKnights[vertexId]??false} theme={theme} onClick={hv.has(vertexId)&&onVertexTap?tap(()=>onVertexTap(vertexId)):undefined}/>;
      })}

      {onVertexTap&&[...hv].filter((id)=>!buildings[id]&&!knights[id]).map((vertexId)=>{
        const vertex=geo.vertices[vertexId]; if(!vertex)return null;
        const [x,z]=world(vertex.x,vertex.y);
        return <VertexMarker key={`marker:${vertexId}`} x={x} z={z} y={vertexY[vertexId]} onClick={tap(()=>onVertexTap(vertexId))}/>;
      })}
    </Canvas>
    {harborTip&&<div className="pointer-events-none absolute inset-x-2 bottom-2 z-10 rounded-xl border border-white/20 bg-slate-950/90 p-2 text-center text-[11px] leading-4 text-slate-100 shadow-xl">{harborTip}</div>}
  </div>;
}

function hexCenter(q:number,r:number):[number,number] {
  return [HEX_SIZE*Math.sqrt(3)*(q+r/2),HEX_SIZE*1.5*r];
}

function VertexMarker({x,z,y,onClick}:{x:number;z:number;y:number;onClick?:(event:ThreeEvent<MouseEvent>)=>void}) {
  const ring=useRef<Group>(null);
  useFrame((state)=>{
    if(!ring.current)return;
    const t=state.clock.elapsedTime*2.4+x+z;
    ring.current.position.y=.02+Math.sin(t)*.02;
    const scale=1+Math.sin(t)*.12;
    ring.current.scale.set(scale,scale,scale);
  });
  return <group position={[x,y+.04,z]} onClick={onClick}>
    <mesh><sphereGeometry args={[.30,10,10]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>
    <group ref={ring}><mesh rotation={[-Math.PI/2,0,0]}><torusGeometry args={[.13,.04,10,24]}/><meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={.7} roughness={.4}/></mesh></group>
  </group>;
}
